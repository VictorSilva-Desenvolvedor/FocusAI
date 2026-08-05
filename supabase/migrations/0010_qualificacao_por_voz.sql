-- A ligação da SDR de voz vira registro no banco.
--
-- Reconstruída por introspecção do projeto de teste (`wqyzgdnxatrkjqdkhcum`):
-- este arquivo nunca existiu no repositório — foi aplicado direto, numa sessão
-- anterior, e ficou só no banco. `pg_get_functiondef` preserva o corpo original
-- das funções, comentários incluídos; a tabela foi reconstruída a partir de
-- `information_schema` e `pg_constraint`, que não guardam comentário de coluna.
--
-- `ligacoes` é o registro de cada tentativa de contato — append-only, porque é
-- o que responde perante a OAB como o cliente foi conduzido (`INV-13`).
-- Deduplicação por `chamada_id`: a VAPI reenvia o mesmo relatório quando não
-- recebe 2xx, e sem a trava uma ligação viraria duas tentativas e o lead seria
-- descartado por excesso (`QUA-R02`).

create type public.resultado_ligacao as enum (
  'qualificado', 'desqualificado', 'nao_atendeu', 'reagendar', 'em_andamento'
);

create table public.ligacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  chamada_id text not null,
  tentativa int not null check (tentativa > 0),
  resultado public.resultado_ligacao not null,
  resumo text,
  transcricao text,
  gravacao_url text,
  motivo_encerramento text,
  duracao_segundos numeric,
  iniciada_em timestamptz,
  encerrada_em timestamptz,
  registrada_em timestamptz not null default now(),

  -- API-R13 — o mesmo relatório de fim de chamada não vira duas tentativas.
  constraint ligacoes_chamada_id_key unique (chamada_id)
);

create index ligacoes_por_lead_idx on public.ligacoes (lead_id, registrada_em desc);

/*
 * INV-13 — o registro da qualificação não é alterado nem removido. É prova do
 * momento da ligação, não se reconstitui depois.
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

/*
 * Quantas vezes já se tentou aquele lead. `registrar_qualificacao` soma 1 ao
 * resultado desta função para saber se a tentativa que está gravando é a
 * terceira — o gatilho de expiração por falta de contato (QUA-R02).
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
grant execute on function public.tentativas_do_lead(uuid) to service_role;

/*
 * `QUA-R01` — evento da ferramenta de voz é gatilho, não fonte da verdade: o
 * que grava aqui é o relatório de fim de chamada, consultado pelo n8n depois do
 * aviso, não o aviso em si.
 *
 * O corpo abaixo é o texto original recuperado do banco de teste — comentários
 * inclusive.
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
   * QUA-R04 — esgotadas as três tentativas sem falar com a pessoa, o lead sai
   * da fila. `expirado` e não `desqualificado`: ninguém avaliou o caso dele, só
   * não se conseguiu contato.
   *
   * (Recuperada como `QUA-R02` no banco de teste — corrigido ao versionar: esse
   * número já é a dedup por par [chamada, tipo de evento], em
   * `src/lib/qualificacao.ts`. Duas regras não dividem um ID.)
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

revoke execute on function public.registrar_qualificacao(
  uuid, text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.registrar_qualificacao(
  uuid, text, public.resultado_ligacao, text, text, text, text, numeric, timestamptz, timestamptz
) to service_role;

-- ---------------------------------------------------------------------------
-- Política de acesso
-- ---------------------------------------------------------------------------

alter table public.ligacoes enable row level security;

create policy "o time interno lê as ligações"
  on public.ligacoes for select to authenticated
  using (public.eh_time_interno());
