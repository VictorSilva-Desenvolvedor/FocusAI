-- A chamada da Vapi passa a saber a qual lead pertence.
--
-- `registrar_qualificacao` e `registrar_agendamento` (`0010`, `0011`) pediam
-- `p_lead_id` como parâmetro, na expectativa de que `call.metadata.leadId` —
-- carimbado na criação da chamada, em "Ligar VAPI" — voltasse no
-- `end-of-call-report`. Ele não volta: conferido contra 140 execuções reais
-- dos três fluxos com captação ligada, o campo `metadata` simplesmente não
-- existe no `call` que a Vapi entrega nesse evento. É limitação documentada da
-- plataforma, não bug do roteador.
--
-- A correção segue o mesmo desenho de `registrar_captacao` (`0006`): um id
-- externo entra, a função resolve o estado interno sozinha. Ali é
-- `respondente_id` → lead, via `captacoes`. Aqui é `chamada_id` → lead, via
-- `chamadas_iniciadas` — a única informação que **os dois lados** da chamada
-- concordam ter, porque `call.id` é o retorno da própria criação.

create table public.chamadas_iniciadas (
  chamada_id text primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  tentativa int not null default 1,
  iniciada_em timestamptz not null default now()
);

create index chamadas_iniciadas_por_lead_idx on public.chamadas_iniciadas (lead_id);

alter table public.chamadas_iniciadas enable row level security;

create policy "o time interno lê as chamadas iniciadas"
  on public.chamadas_iniciadas for select to authenticated
  using (public.eh_time_interno());

/*
 * Chamada por "Ligar VAPI" assim que a Vapi responde com o `id` da ligação —
 * antes de existir qualquer evento de webhook para ela. `on conflict do
 * nothing` porque um retry de rede no próprio n8n não pode duplicar a linha.
 */
create function public.registrar_chamada_iniciada(
  p_chamada_id text,
  p_lead_id uuid,
  p_tentativa int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(trim(p_chamada_id), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Chamada sem id não correlaciona com nada.');
  end if;

  insert into public.chamadas_iniciadas (chamada_id, lead_id, tentativa)
  values (trim(p_chamada_id), p_lead_id, coalesce(p_tentativa, 1))
  on conflict (chamada_id) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.registrar_chamada_iniciada(text, uuid, int)
  from public, anon, authenticated;
grant execute on function public.registrar_chamada_iniciada(text, uuid, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- `registrar_qualificacao` e `registrar_agendamento` passam a resolver o lead
-- ---------------------------------------------------------------------------

/*
 * Mesma assinatura de `0010`, menos `p_lead_id`: quem chama não tem mais
 * como fornecê-lo de forma confiável, e forçar o parâmetro só convidava a
 * mandar `null` e a função aceitar calada.
 */
drop function public.registrar_qualificacao(
  uuid, text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
);

create function public.registrar_qualificacao(
  p_chamada_id text,
  p_resultado public.resultado_ligacao,
  p_resumo text default null,
  p_transcricao text default null,
  p_gravacao_url text default null,
  p_motivo_encerramento text default null,
  p_duracao_segundos numeric default null,
  p_iniciada_em timestamptz default null,
  p_encerrada_em timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead_id uuid;
  v_lead public.leads;
  v_tentativa int;
  v_status public.status_lead;
begin
  select lead_id into v_lead_id from public.chamadas_iniciadas where chamada_id = p_chamada_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Chamada não corresponde a nenhum lead conhecido.');
  end if;

  select * into v_lead from public.leads where id = v_lead_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- API-R13 — evento repetido é resultado normal, não erro. Devolver `ok` faz o
  -- chamador parar de retentar; devolver falha o faria insistir para sempre.
  if exists (select 1 from public.ligacoes where chamada_id = p_chamada_id) then
    return jsonb_build_object('ok', true, 'repetido', true, 'lead_id', v_lead_id);
  end if;

  -- INV-13 — lead já vendido não tem a qualificação reescrita. O que respondeu
  -- perante a OAB foi o que estava lá no momento da venda.
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead já vendido: a qualificação não é reescrita.');
  end if;

  v_tentativa := public.tentativas_do_lead(v_lead_id) + 1;

  insert into public.ligacoes (
    lead_id, chamada_id, tentativa, resultado, resumo, transcricao,
    gravacao_url, motivo_encerramento, duracao_segundos, iniciada_em, encerrada_em
  ) values (
    v_lead_id, p_chamada_id, v_tentativa, p_resultado, p_resumo, p_transcricao,
    p_gravacao_url, p_motivo_encerramento, p_duracao_segundos, p_iniciada_em, p_encerrada_em
  );

  -- QUA-R04 — esgotadas as três tentativas sem falar com a pessoa, o lead sai
  -- da fila. `expirado` e não `desqualificado`: ninguém avaliou o caso dele, só
  -- não se conseguiu contato.
  v_status := case
    when p_resultado = 'qualificado' then 'qualificado'
    when p_resultado = 'desqualificado' then 'desqualificado'
    when p_resultado = 'nao_atendeu' and v_tentativa >= 3 then 'expirado'
    when p_resultado = 'nao_atendeu' then 'nao_atendeu'
    else 'em_qualificacao'
  end;

  update public.leads
     set status = v_status,
         resumo_qualificacao = coalesce(nullif(trim(p_resumo), ''), resumo_qualificacao),
         tem_gravacao = tem_gravacao or p_gravacao_url is not null,
         motivo_desqualificacao = case
           when p_resultado = 'desqualificado'
             then coalesce(nullif(trim(p_motivo_encerramento), ''), motivo_desqualificacao)
           else motivo_desqualificacao
         end,
         ultima_atividade = now()
   where id = v_lead_id;

  return jsonb_build_object(
    'ok', true, 'repetido', false, 'lead_id', v_lead_id,
    'tentativa', v_tentativa, 'status', v_status
  );
end;
$$;

revoke execute on function public.registrar_qualificacao(
  text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.registrar_qualificacao(
  text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
) to service_role;

/* Mesma razão: `p_lead_id` sai, resolvido a partir de `chamadas_iniciadas`. */
drop function public.registrar_agendamento(uuid, text, timestamptz);

create function public.registrar_agendamento(
  p_chamada_id text,
  p_reuniao_em timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead_id uuid;
  v_lead public.leads;
  v_pendentes text[];
  v_custo int;
  v_preco numeric(10, 2);
begin
  select lead_id into v_lead_id from public.chamadas_iniciadas where chamada_id = p_chamada_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Chamada não corresponde a nenhum lead conhecido.');
  end if;

  select * into v_lead from public.leads where id = v_lead_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- INV-10 — lead vendido não volta ao catálogo, nem por reagendamento.
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead já vendido não volta ao catálogo.');
  end if;

  if p_reuniao_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'Sem horário não há agendamento.');
  end if;

  if p_reuniao_em <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'A reunião foi marcada para um horário que já passou.');
  end if;

  v_pendentes := public.filtros_pendentes(v_lead_id);
  if array_length(v_pendentes, 1) > 0 then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Não publica no catálogo — falta confirmar: ' || array_to_string(v_pendentes, '; ') || '.',
      'pendentes', to_jsonb(v_pendentes)
    );
  end if;

  -- CRE-R03 / TES-R07 — preço de tabela congelado agora: 30 créditos, R$ 40.
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
   where id = v_lead_id;

  insert into public.ligacoes (lead_id, chamada_id, tentativa, resultado, resumo)
  values (
    v_lead_id,
    p_chamada_id || '::agendamento',
    public.tentativas_do_lead(v_lead_id) + 1,
    'qualificado',
    'Reunião marcada para ' || to_char(p_reuniao_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  )
  on conflict (chamada_id) do nothing;

  return jsonb_build_object(
    'ok', true, 'lead_id', v_lead_id,
    'reuniao_em', p_reuniao_em, 'custo_creditos', v_custo, 'preco_avulso', v_preco
  );
end;
$$;

revoke execute on function public.registrar_agendamento(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.registrar_agendamento(text, timestamptz)
  to service_role;
