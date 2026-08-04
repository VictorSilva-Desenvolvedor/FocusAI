-- De qual tese é cada formulário de captação.
--
-- O fluxo de automação recebe o webhook de cinco formulários diferentes e
-- precisa saber a tese de cada um. Escrito lá dentro, isso seria um `if` por
-- formulário: regra de negócio fora do repositório, sem histórico e sem ID pelo
-- qual procurar (`API-R16`). Aqui é uma linha de tabela — versionada, revisável,
-- e alterável sem abrir a ferramenta de automação.
--
-- É também onde a divergência entre o que está no ar e o que o produto vende
-- fica visível: `FOCUS-AI.md` descreve **três** teses, e há formulários
-- captando fora delas. Sem tese mapeada, a captação é recusada com motivo — o
-- lead não entra no catálogo por engano, classificado como algo que não é.

create table public.formularios_captacao (
  -- O `formId` do provedor do formulário.
  form_id text primary key,
  tese public.tese not null,
  descricao text not null default '',
  criado_em timestamptz not null default now()
);

alter table public.formularios_captacao enable row level security;

create policy "o time interno lê os formulários"
  on public.formularios_captacao for select to authenticated
  using (public.eh_time_interno());

/*
 * Os três formulários que correspondem às teses do produto. Os outros dois em
 * operação — auxílio por incapacidade e salário-maternidade — são
 * previdenciários e não existem no enum `tese`; ficam de fora até a decisão de
 * produto de ampliar as teses ou de tirá-los do ar.
 */
insert into public.formularios_captacao (form_id, tese, descricao) values
  ('PdWNOe', 'polo_passivo',          'Processo em fase decisiva / conta bloqueada'),
  ('RGlNYd', 'vinculo_empregaticio',  'Trabalhou sem carteira, hora extra'),
  ('PdL5OB', 'juros_abusivos',        'Juros abusivos ao banco')
on conflict (form_id) do nothing;

/*
 * A tese passa a ser opcional na captação: quando não vem, sai do formulário.
 *
 * Mesma razão dos drops anteriores — a lista de argumentos muda, e `create or
 * replace` produziria uma sobrecarga em vez de substituir. Duas versões
 * convivendo significaria que um parâmetro esquecido no fluxo escolhe
 * silenciosamente a versão errada.
 */
drop function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text);

create function public.registrar_captacao(
  p_respondente_id text,
  p_nome text,
  p_telefone text,
  p_formulario_id text default null,
  p_tese public.tese default null,
  p_uf text default null,
  p_cidade text default null,
  p_elegibilidade jsonb default '{}'::jsonb,
  p_resumo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captacao public.captacoes;
  v_lead_id uuid;
  v_telefone text := trim(coalesce(p_telefone, ''));
  v_uf text;
  v_tese public.tese := p_tese;
begin
  if coalesce(trim(p_respondente_id), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Captação sem respondente não casa com nada.');
  end if;
  if v_telefone = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Sem telefone não há lead: é o produto.');
  end if;
  if coalesce(trim(p_nome), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o nome do cliente.');
  end if;

  if v_tese is null then
    select tese into v_tese
      from public.formularios_captacao
     where form_id = trim(coalesce(p_formulario_id, ''));
  end if;

  if v_tese is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', format(
        'Formulário %s não tem tese mapeada — cadastre em formularios_captacao antes de captar por ele.',
        coalesce(nullif(trim(coalesce(p_formulario_id, '')), ''), '(sem id)')
      )
    );
  end if;

  v_uf := coalesce(nullif(upper(trim(coalesce(p_uf, ''))), ''), public.uf_do_ddd(v_telefone));

  if v_uf is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Telefone sem DDD reconhecido e sem UF informada — o lead não apareceria para advogado nenhum.'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('captacao:' || trim(p_respondente_id)));

  select * into v_captacao
    from public.captacoes
   where respondente_id = trim(p_respondente_id)
     for update;

  if found and v_captacao.lead_id is not null then
    return jsonb_build_object('ok', true, 'lead_id', v_captacao.lead_id, 'repetido', true);
  end if;

  -- INV-10 — o mesmo contato, ainda ativo, é o mesmo lead.
  select l.id into v_lead_id
    from public.leads_contato c
    join public.leads l on l.id = c.lead_id
   where public.telefone_meta(c.telefone) = public.telefone_meta(v_telefone)
     and l.status not in ('desqualificado', 'nao_atendeu', 'no_show', 'expirado')
   order by l.criado_em desc
   limit 1;

  if v_lead_id is null then
    insert into public.leads (nome, tese, uf, cidade, status, origem, resumo_qualificacao, elegibilidade)
    values (
      trim(p_nome), v_tese, v_uf, trim(coalesce(p_cidade, '')),
      'novo', 'meta_ads', coalesce(p_resumo, ''), coalesce(p_elegibilidade, '{}'::jsonb)
    )
    returning id into v_lead_id;

    insert into public.leads_contato (lead_id, telefone) values (v_lead_id, v_telefone);
  end if;

  insert into public.captacoes (respondente_id, formulario_id, lead_id)
  values (trim(p_respondente_id), p_formulario_id, v_lead_id)
  on conflict (respondente_id) do update
     set lead_id = excluded.lead_id,
         formulario_id = coalesce(captacoes.formulario_id, excluded.formulario_id);

  -- `CMP-R01` — o mesmo `event_id` que o pixel do navegador já usou.
  perform public.enfileirar_evento_meta(v_lead_id, 'Lead', now(), null);

  return jsonb_build_object('ok', true, 'lead_id', v_lead_id, 'repetido', false);
end;
$$;

revoke execute on function public.registrar_captacao(text, text, text, text, public.tese, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.registrar_captacao(text, text, text, text, public.tese, text, text, jsonb, text)
  to service_role;
