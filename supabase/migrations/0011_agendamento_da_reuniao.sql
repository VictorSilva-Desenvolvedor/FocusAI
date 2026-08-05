-- O agendamento publica o lead no catálogo.
--
-- Reconstruída por introspecção do projeto de teste (`wqyzgdnxatrkjqdkhcum`),
-- pelo mesmo motivo de `0010_qualificacao_por_voz.sql`: existia só no banco.
--
-- `registrar_agendamento` é o único lugar que muda `status` para `agendado` —
-- e é `agendado` mais `comprado_por is null` que define o catálogo
-- (`leads_catalogo_idx`, em `0001_fundacao.sql`). Antes deste carimbo o lead
-- não é comprável; é por isso que `registrar_captacao` pode inserir com
-- `custo_creditos`/`preco_avulso` no default de 0 sem que isso, sozinho, venda
-- lead de graça — o preço real só passa a valer quando publica.
--
-- `TES-R07` — as três teses custam o mesmo: 30 créditos, ou R$ 40 avulso.
-- A versão recuperada por introspecção carregava a tabela antiga (3/300,
-- 2/250, 4/350 por tese): foi escrita antes da decisão que unificou o preço,
-- na maquete. Corrigido aqui antes de versionar — sem isso, o primeiro lead
-- publicado no banco de trabalho venderia pela tabela errada. Continua
-- hardcoded, e não numa tabela `teses` no banco: `registrar_captacao` não lê
-- preço nenhum (o valor só passa a existir na publicação), então hoje só este
-- ponto precisa saber o número. Se um dia o preço divergir por tese de novo,
-- é aqui — e em `src/lib/teses.ts` — que se muda.

/*
 * As mesmas perguntas de elegibilidade que `TesesView` mostra, uma tabela só
 * para as duas pontas não divergirem. `array_agg` em vez de `count`: a tela que
 * chama isto precisa dizer QUAL filtro falta, não só quantos.
 */
create function public.filtros_pendentes(p_lead_id uuid)
returns text[]
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(f.rotulo order by f.rotulo), '{}')
    from public.leads l
    join lateral (
      values
        ('polo_passivo'::public.tese, 'parte_no_processo', 'é parte no processo'),
        ('polo_passivo', 'sem_advogado_atuante', 'está sem advogado atuante'),
        ('vinculo_empregaticio', 'minimo_tres_meses', 'ao menos 3 meses trabalhados'),
        ('vinculo_empregaticio', 'saida_ate_dois_anos', 'saiu do emprego há no máximo 2 anos'),
        ('juros_abusivos', 'tem_contrato', 'tem contrato de crédito ativo'),
        ('juros_abusivos', 'confirmou_agendamento', 'confirmou que é o advogado quem liga')
    ) as f(tese, chave, rotulo) on f.tese = l.tese
   where l.id = p_lead_id
     and coalesce((l.elegibilidade ->> f.chave)::boolean, false) is not true;
$$;

revoke execute on function public.filtros_pendentes(uuid) from public, anon, authenticated;
grant execute on function public.filtros_pendentes(uuid) to service_role;

/*
 * Publica o lead no catálogo. O corpo abaixo é o texto original recuperado do
 * banco de teste — comentários inclusive, e a ressalva de preço do cabeçalho
 * deste arquivo se aplica ao bloco `values` logo adiante.
 */
create function public.registrar_agendamento(
  p_lead_id uuid,
  p_chamada_id text,
  p_reuniao_em timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads;
  v_pendentes text[];
  v_custo int;
  v_preco numeric(10, 2);
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- INV-10 — lead vendido não volta ao catálogo, nem por reagendamento. Dois
  -- advogados com o mesmo contato disputam o mesmo cliente.
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead já vendido não volta ao catálogo.');
  end if;

  if p_reuniao_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'Sem horário não há agendamento.');
  end if;

  /*
   * Reunião no passado é quase sempre fuso trocado, e o efeito é cruel: o lead
   * entra no catálogo já vencido, o advogado paga e descobre que a hora passou.
   * Recusar aqui devolve o erro a quem pode corrigi-lo.
   */
  if p_reuniao_em <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'A reunião foi marcada para um horário que já passou.');
  end if;

  v_pendentes := public.filtros_pendentes(p_lead_id);
  if array_length(v_pendentes, 1) > 0 then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Não publica no catálogo — falta confirmar: ' || array_to_string(v_pendentes, '; ') || '.',
      'pendentes', to_jsonb(v_pendentes)
    );
  end if;

  -- CRE-R03 — o preço de tabela da tese, congelado agora.
  -- TES-R07 — as três teses custam o mesmo hoje: 30 créditos, R$ 40 avulso.
  select custo_creditos, preco_avulso into v_custo, v_preco
    from (values
      ('polo_passivo'::public.tese, 30, 40::numeric),
      ('vinculo_empregaticio', 30, 40),
      ('juros_abusivos', 30, 40)
    ) as t(tese, custo_creditos, preco_avulso)
   where t.tese = v_lead.tese;

  update public.leads
     set reuniao_em = p_reuniao_em,
         status = 'agendado',
         custo_creditos = coalesce(v_custo, custo_creditos),
         preco_avulso = coalesce(v_preco, preco_avulso),
         ultima_atividade = now()
   where id = p_lead_id;

  /*
   * O agendamento é parte do registro que responde perante a OAB, então fica
   * junto das ligações. `chamada_id` com sufixo porque a mesma chamada produz o
   * agendamento e, depois, o relatório de fim — dois eventos distintos da mesma
   * ligação, e `API-R13` deduplica por par (identificador, tipo).
   */
  insert into public.ligacoes (lead_id, chamada_id, tentativa, resultado, resumo)
  values (
    p_lead_id,
    p_chamada_id || '::agendamento',
    public.tentativas_do_lead(p_lead_id) + 1,
    'qualificado',
    'Reunião marcada para ' || to_char(p_reuniao_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  )
  on conflict (chamada_id) do nothing;

  return jsonb_build_object(
    'ok', true, 'lead_id', p_lead_id,
    'reuniao_em', p_reuniao_em, 'custo_creditos', v_custo, 'preco_avulso', v_preco
  );
end;
$$;

revoke execute on function public.registrar_agendamento(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.registrar_agendamento(uuid, text, timestamptz)
  to service_role;
