-- A tela de perfil que `atualizar_usuario` já previa (ACC-R03), e que até
-- aqui não existia: "ninguém edita a própria conta por aqui, use a tela de
-- perfil" apontava para um caminho que ainda não tinha função nenhuma.
--
-- `atualizar_proprio_perfil` só toca o nome (e as iniciais que saem dele) de
-- quem chama — nunca papel, nunca permissão, nunca departamento. É o que
-- sustenta ACC-R03: se esta função aceitasse papel, qualquer um se
-- autopromoveria pela própria tela de perfil. Senha segue caminho à parte,
-- direto por `supabase.auth.updateUser` (mesma chamada que já existe em
-- `redefinirSenha`, em `src/servicos/perfil.ts`) — não precisa de função no
-- banco porque não toca `perfis`.

create function public.atualizar_proprio_perfil(p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ator public.perfis;
begin
  select * into v_ator from public.perfis where id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Sessão sem perfil.');
  end if;

  if coalesce(trim(p_nome), '') = '' or array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1) < 2 then
    return jsonb_build_object('ok', false, 'motivo', 'Informe nome e sobrenome — as iniciais do avatar saem daqui.');
  end if;

  update public.perfis
     set nome = trim(p_nome),
         avatar_iniciais = public.iniciais_do_nome(trim(p_nome))
   where id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.atualizar_proprio_perfil(text) from public, anon, authenticated;
grant execute on function public.atualizar_proprio_perfil(text) to authenticated;
