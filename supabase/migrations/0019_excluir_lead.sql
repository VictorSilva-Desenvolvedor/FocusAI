-- Deixa o administrador excluir um lead — só o que nunca virou produto.
--
-- Não é a devolução (`devolver_lead`): devolução é de lead vendido, credita de
-- volta e o lead continua na base, fora do catálogo (`CRE-R05`). Exclusão é
-- para lixo — captação de teste, duplicata, dado errado — que nunca deveria
-- ter entrado. Por isso ela recusa qualquer lead que já foi comprado ou que já
-- teve ligação registrada: `INV-13` protege o registro de qualificação porque
-- é ele que responde, perante a OAB, como o cliente foi direcionado, e apagar
-- o lead apagaria o contexto desse registro junto. `ligacoes_imutaveis` já
-- bloqueia a exclusão em cascata se isso for tentado — a checagem aqui só
-- devolve o motivo de forma legível antes de chegar lá.

create function public.excluir_lead(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead public.leads;
begin
  if public.papel_atual() <> 'adm' then
    return jsonb_build_object('ok', false, 'motivo', 'Só administrador exclui lead.');
  end if;

  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  if v_lead.comprado_por is not null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Lead já vendido não pode ser excluído — é o registro de como o cliente foi direcionado (INV-13). Use devolver, se for o caso.'
    );
  end if;

  if exists (select 1 from public.ligacoes where lead_id = p_lead_id) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Lead com ligação registrada não pode ser excluído (INV-13).'
    );
  end if;

  delete from public.leads where id = p_lead_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.excluir_lead(uuid) from public, anon, authenticated;
grant execute on function public.excluir_lead(uuid) to authenticated;
