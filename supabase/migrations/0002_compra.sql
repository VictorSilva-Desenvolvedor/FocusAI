-- API-R08 — comprar, devolver e reservar viram operação transacional.
--
-- Na maquete a compra eram três escritas em sequência: carimbar o comprador,
-- debitar o saldo, lançar o movimento. Em `localStorage` isso é síncrono e não
-- tem corrida. Contra um banco, cada intervalo entre elas é uma janela: dois
-- advogados carimbam o mesmo lead, ou o carimbo grava e o débito não.
--
-- Aqui é uma chamada só. A validação acontece antes de qualquer escrita, e a
-- linha do lead é travada com `for update` — o segundo comprador espera, e
-- quando entra já encontra `comprado_por` preenchido.

-- ---------------------------------------------------------------------------
-- LED-R04 — reserva é trava com prazo
-- ---------------------------------------------------------------------------

/*
 * Quinze minutos: tempo de um checkout, não de uma decisão. Prazo generoso
 * transforma reserva em bloqueio gratuito do estoque.
 *
 * A trava vencida não é limpa por rotina nenhuma: toda leitura compara com
 * `now()`. Um booleano `reservado` que ninguém limpasse seria a trava órfã que
 * prende o lead para sempre — a pendência que a maquete anotou e que morre aqui.
 */
create function public.reservar_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado uuid := public.advogado_atual();
  v_lead public.leads;
begin
  if v_advogado is null then
    return jsonb_build_object('ok', false, 'motivo', 'Só advogado com acesso liberado reserva lead.');
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Este lead já foi vendido.');
  end if;
  -- Quem já tem a trava viva mantém; ninguém mais entra.
  if v_lead.reservado_ate > now() and v_lead.reservado_por is distinct from v_advogado then
    return jsonb_build_object('ok', false, 'motivo', 'Outro advogado está finalizando a compra.');
  end if;

  update public.leads
     set reservado_por = v_advogado,
         reservado_ate = now() + interval '15 minutes'
   where id = p_lead_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.reservar_lead(uuid) from public, anon, authenticated;
grant execute on function public.reservar_lead(uuid) to authenticated;

create function public.liberar_reserva(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.leads
     set reservado_por = null, reservado_ate = null
   where id = p_lead_id
     and reservado_por = public.advogado_atual();
end;
$$;

revoke execute on function public.liberar_reserva(uuid) from public, anon, authenticated;
grant execute on function public.liberar_reserva(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A compra
-- ---------------------------------------------------------------------------

/*
 * API-R03 — esta função roda com privilégio elevado e ignora toda política de
 * acesso. A responsabilidade de não vender o lead de um advogado para outro é
 * dela sozinha, em código: é por isso que ela deriva o comprador de
 * `advogado_atual()` e NUNCA o recebe por parâmetro. Um `p_advogado_id` aqui
 * seria um campo que o cliente escolhe — e comprar em nome de terceiro passaria
 * a ser uma chamada bem formada.
 *
 * As recusas são as mesmas de `motivoParaNaoComprar()` em src/lib/leads.ts. A
 * duplicação é deliberada: a versão do cliente existe para não desenhar o botão
 * (CRE-R04), esta existe para o caso de a chamada chegar assim mesmo.
 */
create function public.comprar_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

  -- A trava do lead é o que fecha a corrida. Quem chegar em segundo fica aqui
  -- até o primeiro terminar, e então encontra `comprado_por` preenchido.
  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- INV-10 — a última checagem antes de escrever.
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

  -- INV-15 — o saldo é a soma do extrato, lida sob a trava do advogado. Ler um
  -- campo `saldo` aqui deixaria duas compras simultâneas passarem com o mesmo
  -- crédito, cada uma enxergando o saldo antes do débito da outra.
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
         -- INV-13 — carimbo imutável, protegido pelo gatilho.
         comprado_em = v_agora,
         reservado_por = null,
         reservado_ate = null,
         ultima_atividade = v_agora
   where id = p_lead_id;

  if v_advogado.modelo_pagamento = 'creditos' then
    insert into public.movimentos_creditos (advogado_id, tipo, creditos, lead_id, descricao)
    values (v_advogado.id, 'consumo', -v_lead.custo_creditos, p_lead_id,
            format('%s · %s', v_lead.tese, v_lead.cidade));
  else
    -- Venda avulsa não passa por crédito: entra como receita direta.
    insert into public.movimentos_creditos (advogado_id, tipo, creditos, valor, lead_id, descricao)
    values (v_advogado.id, 'consumo', 0, v_lead.preco_avulso, p_lead_id,
            format('Avulso · %s · %s', v_lead.tese, v_lead.cidade));
  end if;

  update public.advogados set ultima_atividade = v_agora where id = v_advogado.id;

  return jsonb_build_object('ok', true, 'lead_id', p_lead_id);
end;
$$;

revoke execute on function public.comprar_lead(uuid) from public, anon, authenticated;
grant execute on function public.comprar_lead(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- CRE-R05 — devolução
-- ---------------------------------------------------------------------------

/*
 * Devolver repõe o crédito e NÃO recoloca o lead no catálogo.
 *
 * O contato já foi entregue àquele advogado. Revender o mesmo contato criaria o
 * segundo comprador que INV-10 proíbe — e a devolução, que existe para proteger
 * o advogado de um lead ruim, viraria a porta de saída do invariante mais duro
 * do sistema. Por isso o status vai para `expirado`, nunca de volta a
 * `agendado` (o gatilho `leads_carimbo_imutavel` recusaria).
 */
create function public.devolver_lead(p_lead_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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
  -- O time interno também devolve, a pedido do advogado.
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

  insert into public.movimentos_creditos (advogado_id, tipo, creditos, lead_id, descricao)
  values (v_lead.comprado_por, 'devolucao', v_lead.custo_creditos, p_lead_id, p_motivo);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.devolver_lead(uuid, text) from public, anon, authenticated;
grant execute on function public.devolver_lead(uuid, text) to authenticated;
