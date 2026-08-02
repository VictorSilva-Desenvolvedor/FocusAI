-- Acompanha `LED-R07` e `LED-R08`, e resolve o que o portão de contato quebrou.
--
-- ---------------------------------------------------------------------------
-- A máscara precisa ser calculada no banco
-- ---------------------------------------------------------------------------
--
-- Na maquete `mascararContato()` derivava `(62) ••••-••08` do telefone real,
-- que estava no objeto do lead. A máscara preserva DDD e os dois últimos
-- dígitos de propósito: é o bastante para o advogado conferir a região antes de
-- comprar e reconhecer o número depois, e pouco demais para discar.
--
-- Com o contato atrás da política de `leads_contato`, o navegador não recebe o
-- número — e a função de máscara passaria a receber string vazia, devolvendo
-- `•••••` para todo mundo. A regra continuaria intacta e a informação útil
-- desapareceria em silêncio: ninguém veria erro, só um catálogo que parou de
-- dizer de onde é o cliente.
--
-- Então a máscara vira coluna de `leads`, calculada a partir do contato e
-- mantida em sincronia por gatilho. O que sai do banco para quem não comprou é
-- exatamente o que a maquete já tinha decidido mostrar — nem um dígito a mais.

create function public.mascarar_contato(telefone text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select case
    when length(regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) < 4 then '•••••'
    else format(
      '(%s) ••••-••%s',
      substr(regexp_replace(telefone, '\D', '', 'g'), 1, 2),
      right(regexp_replace(telefone, '\D', '', 'g'), 2)
    )
  end;
$$;

revoke execute on function public.mascarar_contato(text) from public, anon, authenticated;

alter table public.leads add column telefone_mascarado text;

create function public.sincronizar_mascara()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  update public.leads
     set telefone_mascarado = public.mascarar_contato(new.telefone)
   where id = new.lead_id;
  return new;
end;
$$;

revoke execute on function public.sincronizar_mascara() from public, anon, authenticated;

create trigger contato_atualiza_mascara
  after insert or update of telefone on public.leads_contato
  for each row execute function public.sincronizar_mascara();

update public.leads l
   set telefone_mascarado = public.mascarar_contato(c.telefone)
  from public.leads_contato c
 where c.lead_id = l.id;

-- ---------------------------------------------------------------------------
-- LED-R08 — a avaliação do lead pelo comprador
-- ---------------------------------------------------------------------------

/*
 * É o único retorno que a Focus tem sobre a própria qualificação: sem ele a
 * régua da IA só é avaliada pelo que se vê de dentro — taxa, duração, gravação
 * — e nunca pelo que aconteceu na consulta.
 *
 * Quem avalia é quem pagou. A nota é do produto entregue, não do cliente final,
 * e por isso mora no lead, ao lado do carimbo do comprador.
 */
alter table public.leads
  add column avaliacao_nota smallint,
  add column avaliacao_comentario text,
  add column avaliacao_em timestamptz;

alter table public.leads
  add constraint avaliacao_completa
    check ((avaliacao_nota is null) = (avaliacao_em is null)),
  add constraint avaliacao_de_um_a_cinco
    check (avaliacao_nota is null or avaliacao_nota between 1 and 5),
  -- Só se avalia o que se comprou.
  add constraint avaliacao_exige_compra
    check (avaliacao_em is null or comprado_por is not null);

/*
 * LED-R07 — o desfecho da reunião, e LED-R08 — a nota.
 *
 * Os dois são escrita do advogado sobre um lead da própria carteira, e nenhuma
 * política de UPDATE existe para o papel externo (de propósito: `INV-13`
 * protege o carimbo). A função é o caminho, e ela verifica que o lead é de quem
 * chama antes de gravar.
 *
 * A nota pode ser refeita; o carimbo passa a ser o da última. O desfecho, não:
 * é registro do que aconteceu com o cliente, e é o que responde perante a OAB.
 */
create function public.encerrar_reuniao(p_lead_id uuid, p_compareceu boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado uuid := public.advogado_atual();
  v_lead public.leads;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;
  if v_advogado is null or v_lead.comprado_por is distinct from v_advogado then
    return jsonb_build_object('ok', false, 'motivo', 'Só quem comprou o lead encerra a reunião.');
  end if;
  if v_lead.devolucao_em is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead devolvido não tem reunião a encerrar.');
  end if;
  if v_lead.status in ('atendido', 'no_show') then
    return jsonb_build_object('ok', false, 'motivo', 'Esta reunião já foi encerrada.');
  end if;
  if v_lead.reuniao_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'Não há reunião marcada.');
  end if;
  -- Marcar "atendida" antes da hora é registrar como acontecido algo que ainda
  -- não aconteceu, num registro que existe para provar o que aconteceu.
  if v_lead.reuniao_em > now() then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'A reunião ainda não aconteceu — o desfecho é registrado depois da hora marcada.'
    );
  end if;

  update public.leads
     set status = case when p_compareceu then 'atendido'::public.status_lead
                       else 'no_show'::public.status_lead end,
         ultima_atividade = now()
   where id = p_lead_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.encerrar_reuniao(uuid, boolean) from public, anon, authenticated;
grant execute on function public.encerrar_reuniao(uuid, boolean) to authenticated;

create function public.avaliar_lead(p_lead_id uuid, p_nota smallint, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado uuid := public.advogado_atual();
  v_lead public.leads;
begin
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    return jsonb_build_object('ok', false, 'motivo', 'A nota vai de 1 a 5.');
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;
  if v_advogado is null or v_lead.comprado_por is distinct from v_advogado then
    return jsonb_build_object('ok', false, 'motivo', 'Só quem comprou o lead avalia.');
  end if;
  if v_lead.status <> 'atendido' then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'A avaliação é do que foi entregue — encerre a reunião como atendida primeiro.'
    );
  end if;

  update public.leads
     set avaliacao_nota = p_nota,
         avaliacao_comentario = nullif(trim(coalesce(p_comentario, '')), ''),
         avaliacao_em = now(),
         ultima_atividade = now()
   where id = p_lead_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.avaliar_lead(uuid, smallint, text) from public, anon, authenticated;
grant execute on function public.avaliar_lead(uuid, smallint, text) to authenticated;
