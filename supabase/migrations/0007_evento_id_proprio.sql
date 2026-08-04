-- O `event_id` da conversão passa a ser gerado por nós, não pelo Tally.
--
-- `CMP-R01` exige que o evento do navegador e o do servidor carreguem o mesmo
-- identificador — é o que faz a Meta deduplicar em vez de contar duas vezes. O
-- desenho anterior usava o `respondentId` do Tally, que o servidor recebe pelo
-- webhook e o navegador receberia pelo redirecionamento, como variável na URL.
--
-- O levantamento dos formulários mostrou o custo desse caminho: a variável é
-- inserida à mão, formulário por formulário, e some se alguém reescrever a URL
-- de redirecionamento. Um id que a landing gera resolve os dois lados sem
-- depender de configuração: vai ao servidor pelo campo oculto `evento_id`, e ao
-- navegador da página de obrigado pelo armazenamento do próprio domínio.
--
-- `respondente_id` continua sendo a chave da captação. É ele que o Tally
-- reenvia, e é por ele que `API-R13` — webhook idempotente — se sustenta.

alter table public.captacoes add column evento_id text;

comment on column public.captacoes.evento_id is
  'Id que a landing gerou e o pixel do navegador já usou. Nulo quando a pessoa '
  'chegou ao formulário por fora da landing — aí o respondente serve de id.';

/*
 * Um id só, dos dois lados. Quando a captação não passou pela landing não há
 * evento no navegador para deduplicar, e o respondente serve perfeitamente.
 */
create or replace function public.enfileirar_evento_meta(
  p_lead_id uuid,
  p_evento public.evento_meta,
  p_ocorrido_em timestamptz,
  p_valor numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captacao public.captacoes;
begin
  select * into v_captacao
    from public.captacoes
   where lead_id = p_lead_id
   order by identidade_em desc nulls last, criado_em desc
   limit 1;

  if not found then
    return;
  end if;

  insert into public.eventos_meta (lead_id, evento, event_id, ocorrido_em, valor)
  values (
    p_lead_id,
    p_evento,
    case
      when p_evento = 'Lead' then coalesce(v_captacao.evento_id, v_captacao.respondente_id)
      else p_lead_id::text || '-' || p_evento::text
    end,
    p_ocorrido_em,
    p_valor
  )
  on conflict (lead_id, evento) do nothing;
end;
$$;

revoke execute on function public.enfileirar_evento_meta(uuid, public.evento_meta, timestamptz, numeric)
  from public, anon, authenticated;

/*
 * `create or replace` não serve aqui: a lista de argumentos muda, e o que sai
 * disso é uma sobrecarga — as duas versões passam a existir, e qual delas o
 * PostgREST chama depende do corpo que o n8n mandar. Um parâmetro esquecido no
 * fluxo escolheria silenciosamente a versão antiga, que ignora o `evento_id`.
 */
drop function public.registrar_identidade_captacao(text, text, text, text, text, text, text, text);

create function public.registrar_identidade_captacao(
  p_respondente_id text,
  p_formulario_id text default null,
  p_fbp text default null,
  p_fbc text default null,
  p_fbclid text default null,
  p_pagina text default null,
  p_ip text default null,
  p_agente_usuario text default null,
  p_evento_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(trim(p_respondente_id), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Captação sem respondente não casa com nada.');
  end if;

  insert into public.captacoes (
    respondente_id, formulario_id, fbp, fbc, fbclid, pagina, ip, agente_usuario,
    evento_id, identidade_em
  )
  values (
    trim(p_respondente_id), p_formulario_id,
    nullif(trim(coalesce(p_fbp, '')), ''), nullif(trim(coalesce(p_fbc, '')), ''),
    nullif(trim(coalesce(p_fbclid, '')), ''), nullif(trim(coalesce(p_pagina, '')), ''),
    public.inet_ou_nulo(p_ip),
    nullif(trim(coalesce(p_agente_usuario, '')), ''),
    nullif(trim(coalesce(p_evento_id, '')), ''),
    now()
  )
  on conflict (respondente_id) do update
     set formulario_id = coalesce(captacoes.formulario_id, excluded.formulario_id),
         fbp = coalesce(captacoes.fbp, excluded.fbp),
         fbc = coalesce(captacoes.fbc, excluded.fbc),
         fbclid = coalesce(captacoes.fbclid, excluded.fbclid),
         pagina = coalesce(captacoes.pagina, excluded.pagina),
         ip = coalesce(captacoes.ip, excluded.ip),
         agente_usuario = coalesce(captacoes.agente_usuario, excluded.agente_usuario),
         evento_id = coalesce(captacoes.evento_id, excluded.evento_id),
         identidade_em = coalesce(captacoes.identidade_em, excluded.identidade_em);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.registrar_identidade_captacao(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_identidade_captacao(text, text, text, text, text, text, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- A UF sai do DDD quando o formulário não pergunta
-- ---------------------------------------------------------------------------

/*
 * Nenhum dos formulários no ar pergunta cidade ou estado: coletam nome e
 * telefone, e o resto é a IA de voz que levanta na qualificação. Mas a UF não é
 * detalhe cosmético — a política do catálogo casa `leads.uf` com a UF do
 * advogado, e lead com UF vazia não aparece para comprador nenhum. Ficaria
 * invisível, sem erro em lugar nenhum.
 *
 * O DDD é a única informação de região que existe no momento da captação, e é
 * suficiente para a UF. Cidade continua vazia até a qualificação: o DDD cobre
 * região, não município, e chutar cidade é pior que não ter — o advogado
 * filtraria por uma cidade que ninguém apurou.
 */
create function public.uf_do_ddd(telefone text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case substr(public.telefone_meta(telefone), 3, 2)
    when '11' then 'SP' when '12' then 'SP' when '13' then 'SP' when '14' then 'SP'
    when '15' then 'SP' when '16' then 'SP' when '17' then 'SP' when '18' then 'SP'
    when '19' then 'SP'
    when '21' then 'RJ' when '22' then 'RJ' when '24' then 'RJ'
    when '27' then 'ES' when '28' then 'ES'
    when '31' then 'MG' when '32' then 'MG' when '33' then 'MG' when '34' then 'MG'
    when '35' then 'MG' when '37' then 'MG' when '38' then 'MG'
    when '41' then 'PR' when '42' then 'PR' when '43' then 'PR' when '44' then 'PR'
    when '45' then 'PR' when '46' then 'PR'
    when '47' then 'SC' when '48' then 'SC' when '49' then 'SC'
    when '51' then 'RS' when '53' then 'RS' when '54' then 'RS' when '55' then 'RS'
    when '61' then 'DF'
    when '62' then 'GO' when '64' then 'GO'
    when '63' then 'TO'
    when '65' then 'MT' when '66' then 'MT'
    when '67' then 'MS'
    when '68' then 'AC'
    when '69' then 'RO'
    when '71' then 'BA' when '73' then 'BA' when '74' then 'BA' when '75' then 'BA'
    when '77' then 'BA'
    when '79' then 'SE'
    when '81' then 'PE' when '87' then 'PE'
    when '82' then 'AL'
    when '83' then 'PB'
    when '84' then 'RN'
    when '85' then 'CE' when '88' then 'CE'
    when '86' then 'PI' when '89' then 'PI'
    when '91' then 'PA' when '93' then 'PA' when '94' then 'PA'
    when '92' then 'AM' when '97' then 'AM'
    when '95' then 'RR'
    when '96' then 'AP'
    when '98' then 'MA' when '99' then 'MA'
    else null
  end;
$$;

revoke execute on function public.uf_do_ddd(text) from public, anon, authenticated;

/*
 * UF e cidade deixam de ser obrigatórias na captação, porque o formulário não
 * as coleta. A UF cai para o DDD; a cidade fica vazia e é a qualificação que
 * preenche.
 *
 * Mesma razão do drop acima: a lista de argumentos muda, e sobrecarga aqui
 * significaria dois caminhos de captação convivendo.
 */
drop function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text);

create function public.registrar_captacao(
  p_respondente_id text,
  p_nome text,
  p_telefone text,
  p_tese public.tese,
  p_uf text default null,
  p_cidade text default null,
  p_formulario_id text default null,
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
      trim(p_nome), p_tese, v_uf, trim(coalesce(p_cidade, '')),
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

revoke execute on function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text)
  to service_role;
