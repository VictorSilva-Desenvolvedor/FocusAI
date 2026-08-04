-- ---------------------------------------------------------------------------
-- 0010 — o retorno da SDR de voz
--
-- Fecha o segundo elo da cadeia. A Helena liga, conduz o roteiro e encerra — e
-- até aqui o resultado morria no webhook: o `end-of-call-report` da VAPI chega
-- em `/webhook/agentecall` com resumo, transcrição, gravação e motivo de
-- encerramento, e não havia onde gravá-lo. Sem isso nenhum lead passa de `novo`,
-- e o catálogo, que só mostra `agendado`, nunca tem o que vender.
-- ---------------------------------------------------------------------------

create type public.resultado_ligacao as enum (
  'qualificado', 'desqualificado', 'nao_atendeu', 'reagendar', 'em_andamento'
);

-- ---------------------------------------------------------------------------
-- O registro de cada tentativa
-- ---------------------------------------------------------------------------

/*
 * `INV-13` — o registro da qualificação é imutável: é ele que responde, perante
 * a OAB, como aquele cliente foi conduzido até a reunião. Por isso a tabela é
 * append-only, com o mesmo gatilho que protege o extrato.
 *
 * `chamada_id` é único por causa de `API-R13`: a VAPI reenvia o mesmo
 * `end-of-call-report` quando não recebe 2xx, e sem a unicidade uma ligação
 * viraria duas tentativas — o lead seria descartado por excesso (`QUA-R02`)
 * por causa de uma retentativa de rede.
 */
create table public.ligacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  chamada_id text not null unique,
  tentativa int not null check (tentativa > 0),
  resultado public.resultado_ligacao not null,
  resumo text,
  transcricao text,
  -- `API-R15` — hoje é a URL do provedor. Balde privado próprio é a próxima
  -- etapa; guardar a de terceiro sem prazo definido é dívida anotada, não
  -- solução: quando ela expirar, `INV-13` fica sem a prova que promete.
  gravacao_url text,
  motivo_encerramento text,
  duracao_segundos numeric(10, 2),
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  registrada_em timestamptz not null default now()
);

create index ligacoes_por_lead_idx on public.ligacoes (lead_id, registrada_em desc);

/*
 * Gatilho próprio, e não o `extrato_e_imutavel()` do crédito, por causa da
 * mensagem: reaproveitar o outro faz o banco recusar a escrita dizendo
 * "movimento de crédito não é alterado" sobre uma tabela de ligações, e quem
 * ler isso vai procurar o defeito no extrato.
 */
create function public.ligacao_e_imutavel()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'INV-13: o registro da qualificação não é alterado nem removido — ele responde como o cliente foi conduzido';
end;
$$;

create trigger ligacoes_imutaveis
  before update or delete on public.ligacoes
  for each row execute function public.ligacao_e_imutavel();

alter table public.ligacoes enable row level security;

/*
 * `INV-05` do lado do banco — nenhuma política nomeia `advogado`, e é
 * deliberado. A transcrição é a conversa inteira com o cliente final, com tudo
 * o que ele contou antes de decidir. O que o advogado compra é a reunião e o
 * resumo, não o registro bruto.
 */
create policy "o time interno lê as ligações"
  on public.ligacoes for select to authenticated
  using (public.eh_time_interno());

-- ---------------------------------------------------------------------------
-- QUA-R02 — três tentativas, e só
-- ---------------------------------------------------------------------------

/*
 * A quarta ligação já é insistência sobre alguém que não pediu para ser
 * procurado de novo. O limite mora aqui, e não no fluxo de automação, porque é
 * regra de negócio: `tentativa: 1` fixo no corpo da chamada — como está hoje no
 * n8n — faz o limite nunca valer, e ninguém percebe.
 */
create function public.tentativas_do_lead(p_lead_id uuid)
returns int
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(count(*), 0)::int from public.ligacoes where lead_id = p_lead_id;
$$;

revoke execute on function public.tentativas_do_lead(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A escrita
-- ---------------------------------------------------------------------------

/*
 * Contrato de entrada — o que o `end-of-call-report` da VAPI carrega, já
 * normalizado pelo roteador do n8n.
 *
 * `API-R08` — a ligação e o novo estado do lead entram na mesma transação. Em
 * passos separados, falha no segundo deixa tentativa registrada e lead parado:
 * a próxima execução conta a tentativa e não vê o motivo dela.
 *
 * `API-R14` — o evento é gatilho, não fonte da verdade. Quem decide o status é
 * esta função, a partir do resultado e da contagem que já está no banco; o
 * corpo do webhook não manda em `leads.status`.
 *
 * O agendamento NÃO entra aqui. A Helena marca no Google Calendar durante a
 * ligação, e o horário só chegaria neste relatório se o assistente da VAPI
 * fosse configurado para devolvê-lo. Enquanto isso não existir, `qualificado` é
 * o teto: o lead fica pronto e fora do catálogo, porque o que o advogado compra
 * é a hora marcada, não o telefone.
 */
create function public.registrar_qualificacao(
  p_lead_id uuid,
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
  v_lead public.leads;
  v_tentativa int;
  v_status public.status_lead;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- API-R13 — evento repetido é resultado normal, não erro. Devolver `ok` faz o
  -- chamador parar de retentar; devolver falha o faria insistir para sempre.
  if exists (select 1 from public.ligacoes where chamada_id = p_chamada_id) then
    return jsonb_build_object('ok', true, 'repetido', true, 'lead_id', p_lead_id);
  end if;

  -- INV-13 — lead já vendido não tem a qualificação reescrita. O que respondeu
  -- perante a OAB foi o que estava lá no momento da venda.
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead já vendido: a qualificação não é reescrita.');
  end if;

  v_tentativa := public.tentativas_do_lead(p_lead_id) + 1;

  insert into public.ligacoes (
    lead_id, chamada_id, tentativa, resultado, resumo, transcricao,
    gravacao_url, motivo_encerramento, duracao_segundos, iniciada_em, encerrada_em
  ) values (
    p_lead_id, p_chamada_id, v_tentativa, p_resultado, p_resumo, p_transcricao,
    p_gravacao_url, p_motivo_encerramento, p_duracao_segundos, p_iniciada_em, p_encerrada_em
  );

  /*
   * QUA-R02 — esgotadas as três tentativas sem falar com a pessoa, o lead sai
   * da fila. `expirado` e não `desqualificado`: ninguém avaliou o caso dele, só
   * não se conseguiu contato.
   */
  v_status := case
    when p_resultado = 'qualificado' then 'qualificado'
    when p_resultado = 'desqualificado' then 'desqualificado'
    when p_resultado = 'nao_atendeu' and v_tentativa >= 3 then 'expirado'
    when p_resultado = 'nao_atendeu' then 'nao_atendeu'
    else 'em_qualificacao'
  end;

  update public.leads
     set status = v_status,
         -- O resumo da chamada só sobrescreve o anterior quando existe: uma
         -- tentativa que não atendeu não apaga o que a anterior apurou.
         resumo_qualificacao = coalesce(nullif(trim(p_resumo), ''), resumo_qualificacao),
         tem_gravacao = tem_gravacao or p_gravacao_url is not null,
         motivo_desqualificacao = case
           when p_resultado = 'desqualificado'
             then coalesce(nullif(trim(p_motivo_encerramento), ''), motivo_desqualificacao)
           else motivo_desqualificacao
         end,
         ultima_atividade = now()
   where id = p_lead_id;

  return jsonb_build_object(
    'ok', true, 'repetido', false, 'lead_id', p_lead_id,
    'tentativa', v_tentativa, 'status', v_status
  );
end;
$$;

/*
 * API-R04 — revoga dos três. A plataforma concede execução a `anon` e
 * `authenticated` por privilégio padrão, então revogar só de PUBLIC não faz
 * nada. Quem chama é a automação, com a chave de serviço, fora do navegador.
 */
revoke execute on function public.registrar_qualificacao(
  uuid, text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
) from public, anon, authenticated;
