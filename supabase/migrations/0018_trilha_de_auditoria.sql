-- ---------------------------------------------------------------------------
-- 0018 — trilha de auditoria de mudança de papel e de movimento de crédito
--
-- Dois pedaços, porque a informação que falta é diferente em cada um:
--
--   papel de usuário    não existe registro nenhum de quem mudou o papel de
--                        quem, nem para quê. `auditoria` mais o gatilho em
--                        `perfis` fecham isso — dispara em qualquer caminho
--                        que altere `papel`, não só em `atualizar_usuario`.
--
--   movimento de crédito `movimentos_creditos` já é o extrato — é ele que
--                        soma o saldo (`INV-15`) — mas não guarda quem
--                        acionou compra, devolução ou ajuste, só o advogado
--                        dono do saldo. `ator_id` completa a linha que já
--                        existe; não é tabela nova.
--
-- Preço por tese fica de fora de propósito: `custoCreditos`/`precoAvulso`
-- (`src/lib/teses.ts`) são constante versionada, não coluna — quem mudou e
-- quando já está no `git log` do arquivo, que é a trilha de auditoria dele.
-- ---------------------------------------------------------------------------

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  tabela text not null,
  registro_id uuid not null,
  ator_id uuid references public.perfis(id),
  operacao text not null,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);

alter table public.auditoria enable row level security;

-- Só o time interno lê. Ninguém grava por fora do gatilho — não há política
-- de insert/update/delete para role nenhuma, então só o dono da tabela (o
-- gatilho, security definer) escreve.
create policy "o time interno lê a auditoria"
  on public.auditoria for select to authenticated
  using (public.eh_time_interno());

create function public.auditar_papel()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.papel is distinct from old.papel then
    insert into public.auditoria (tabela, registro_id, ator_id, operacao, antes, depois)
    values (
      'perfis', new.id, auth.uid(), 'papel',
      jsonb_build_object('papel', old.papel),
      jsonb_build_object('papel', new.papel)
    );
  end if;
  return new;
end;
$$;

create trigger perfis_audita_papel
  after update on public.perfis
  for each row execute function public.auditar_papel();

-- O extrato ganha quem acionou o movimento, sem virar tabela nova: compra,
-- devolução e ajuste já gravam uma linha aqui, só faltava o ator.
alter table public.movimentos_creditos add column ator_id uuid references public.perfis(id);

create or replace function public.comprar_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_advogado public.advogados;
  v_lead public.leads;
  v_saldo int;
  v_agora timestamptz := now();
begin
  select * into v_advogado
    from public.advogados
   where id = public.advogado_atual()
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Só advogado com acesso liberado compra lead.');
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Outro advogado comprou este lead primeiro.');
  end if;
  if v_lead.status <> 'agendado' then
    return jsonb_build_object('ok', false, 'motivo', 'Só lead com reunião agendada está à venda.');
  end if;
  if v_lead.reuniao_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'Sem reunião agendada não há produto.');
  end if;
  if v_lead.reuniao_em <= v_agora then
    return jsonb_build_object('ok', false, 'motivo', 'A hora da reunião já passou.');
  end if;
  if v_lead.reservado_ate > v_agora and v_lead.reservado_por is distinct from v_advogado.id then
    return jsonb_build_object('ok', false, 'motivo', 'Outro advogado está finalizando a compra deste lead.');
  end if;
  if not (v_lead.tese = any (v_advogado.teses)) then
    return jsonb_build_object('ok', false, 'motivo', 'Este lead é de uma tese fora da sua atuação.');
  end if;

  if v_advogado.modelo_pagamento = 'creditos' then
    select coalesce(sum(creditos), 0) into v_saldo
      from public.movimentos_creditos
     where advogado_id = v_advogado.id;

    if v_saldo < v_lead.custo_creditos then
      return jsonb_build_object(
        'ok', false,
        'motivo', format('Saldo insuficiente: são %s créditos e você tem %s.',
                         v_lead.custo_creditos, v_saldo)
      );
    end if;
  end if;

  update public.leads
     set status = 'vendido',
         comprado_por = v_advogado.id,
         comprado_em = v_agora,
         reservado_por = null,
         reservado_ate = null,
         ultima_atividade = v_agora
   where id = p_lead_id;

  if v_advogado.modelo_pagamento = 'creditos' then
    insert into public.movimentos_creditos (advogado_id, tipo, creditos, lead_id, descricao, ator_id)
    values (v_advogado.id, 'consumo', -v_lead.custo_creditos, p_lead_id,
            format('%s · %s', v_lead.tese, v_lead.cidade), auth.uid());
  else
    insert into public.movimentos_creditos (advogado_id, tipo, creditos, valor, lead_id, descricao, ator_id)
    values (v_advogado.id, 'consumo', 0, v_lead.preco_avulso, p_lead_id,
            format('Avulso · %s · %s', v_lead.tese, v_lead.cidade), auth.uid());
  end if;

  update public.advogados set ultima_atividade = v_agora where id = v_advogado.id;

  return jsonb_build_object('ok', true, 'lead_id', p_lead_id);
end;
$$;

create or replace function public.devolver_lead(p_lead_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_advogado uuid := public.advogado_atual();
  v_lead public.leads;
  v_agora timestamptz := now();
begin
  if coalesce(trim(p_motivo), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o motivo da devolução.');
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;
  if v_lead.comprado_por is null then
    return jsonb_build_object('ok', false, 'motivo', 'Só se devolve lead que foi comprado.');
  end if;
  if v_advogado is not null and v_lead.comprado_por <> v_advogado then
    return jsonb_build_object('ok', false, 'motivo', 'Este lead não é da sua carteira.');
  end if;
  if v_advogado is null and not public.eh_time_interno() then
    return jsonb_build_object('ok', false, 'motivo', 'Sem permissão para devolver.');
  end if;
  if v_lead.devolucao_em is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Este lead já foi devolvido.');
  end if;
  if v_lead.status = 'atendido' then
    return jsonb_build_object('ok', false, 'motivo', 'A consulta já foi realizada — o produto foi entregue.');
  end if;

  update public.leads
     set status = 'expirado',
         devolucao_motivo = p_motivo,
         devolucao_em = v_agora,
         ultima_atividade = v_agora
   where id = p_lead_id;

  insert into public.movimentos_creditos (advogado_id, tipo, creditos, lead_id, descricao, ator_id)
  values (v_lead.comprado_por, 'devolucao', v_lead.custo_creditos, p_lead_id, p_motivo, auth.uid());

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.ajustar_creditos_advogado(p_advogado_id uuid, p_creditos integer, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_saldo int;
begin
  if not (
    public.papel_atual() in ('adm', 'financeiro')
    and exists (
      select 1 from public.perfis
       where id = auth.uid() and 'credito:conciliar_pagamento' = any (permissoes)
    )
  ) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Ajuste de crédito exige a permissão "Conciliar pagamento de crédito".'
    );
  end if;

  if coalesce(p_creditos, 0) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Informe quantos créditos entram (positivo) ou saem (negativo).');
  end if;

  if length(trim(coalesce(p_motivo, ''))) < 10 then
    return jsonb_build_object('ok', false, 'motivo', 'Escreva o motivo do ajuste — é ele que explica o saldo depois.');
  end if;

  select saldo_creditos into v_saldo
    from public.advogados_com_saldo
   where id = p_advogado_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Advogado não encontrado.');
  end if;

  if v_saldo + p_creditos < 0 then
    return jsonb_build_object('ok', false, 'motivo', format('Saldo insuficiente: ele tem %s créditos.', v_saldo));
  end if;

  insert into public.movimentos_creditos (advogado_id, tipo, creditos, valor, descricao, ator_id)
  values (p_advogado_id, 'ajuste', p_creditos, 0, trim(p_motivo), auth.uid());

  return jsonb_build_object('ok', true);
end;
$$;
