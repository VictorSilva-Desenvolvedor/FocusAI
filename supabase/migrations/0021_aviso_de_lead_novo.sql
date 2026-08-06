-- A primeira preferência real de notificação — não uma central genérica de
-- "alertas", que não teria nenhum canal de envio para configurar ainda
-- (`API-R10`: o aviso de WhatsApp de lead novo segue sem integração, e a
-- etapa pulada já aparece em Integrações). Este é o único aviso que o painel
-- do advogado já promete ao vivo, em três lugares (`PainelDoAdvogado.tsx`:
-- "você recebe aviso quando entra lead novo") sem ter onde a pessoa
-- desligue isso — então é o único que vale como preferência de verdade hoje.
--
-- Coluna simples, não jsonb: um único flag não justifica um blob de
-- preferências genérico (segunda preferência real que aparecer decide se
-- vira tabela própria — abstração depois do segundo caso, não antes do
-- primeiro).

alter table public.perfis
  add column avisar_lead_novo boolean not null default true;

/*
 * `ACC-R03` de novo: a política "só adm e gerente escrevem perfil" bloqueia
 * `update` direto nesta coluna para quem não é adm/gerente — que é
 * exatamente quem mais usa este toggle (`advogado`). Função própria,
 * restrita à própria linha, no mesmo desenho de `atualizar_proprio_perfil`.
 */
create function public.definir_aviso_lead_novo(p_ativo boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'Sessão sem perfil.');
  end if;

  update public.perfis set avisar_lead_novo = p_ativo where id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.definir_aviso_lead_novo(boolean) from public, anon, authenticated;
grant execute on function public.definir_aviso_lead_novo(boolean) to authenticated;
