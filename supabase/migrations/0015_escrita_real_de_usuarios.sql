-- Atualizar e desativar/reativar usuário passam a gravar no banco.
--
-- `criar` e `criarParaAdvogado` ficam de fora desta migration: precisam
-- criar a linha em `auth.users` antes da linha em `perfis`, e isso exige a
-- Admin API, que só roda com privilégio de servidor — não alcança daqui. Vai
-- para a função de borda `criar-usuario` (`supabase/functions/`).
--
-- `atualizar_usuario` e `alterar_status_usuario` só tocam uma linha que já
-- existe em `perfis`, então cabem aqui — mesmo desenho de
-- `0012_escrita_real_de_advogados.sql`: a validação de `ACC-R02`/`ACC-R03`
-- (hoje só em `src/lib/usuarios.ts`) é portada para dentro da função.

/*
 * ACC-R02/ACC-R03 — só gerencia quem poderia ter criado, e ninguém edita a
 * própria conta por aqui (a tela de perfil é outro caminho, que não expõe
 * papel nem permissão). Conta de advogado não é editável por aqui: é gerida
 * no funil, onde a inscrição da OAB é conferida (`INV-12`).
 */
create function public.atualizar_usuario(
  p_id uuid,
  p_nome text,
  p_email text,
  p_papel public.papel_usuario,
  p_departamento text default null,
  p_permissoes text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ator public.perfis;
  v_alvo public.perfis;
  v_permitidos public.papel_usuario[];
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  select * into v_ator from public.perfis where id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Sessão sem perfil.');
  end if;

  if p_id = auth.uid() then
    return jsonb_build_object('ok', false, 'motivo', 'Ninguém edita a própria conta por aqui (ACC-R03). Use a tela de perfil.');
  end if;

  select * into v_alvo from public.perfis where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Usuário não encontrado.');
  end if;
  if v_alvo.papel = 'advogado' then
    return jsonb_build_object('ok', false, 'motivo', 'Conta de advogado é gerenciada no funil de Advogados (INV-12).');
  end if;

  -- ACC-R02 — a mesma tabela de hierarquia de src/lib/usuarios.ts (PODE_CRIAR).
  v_permitidos := case v_ator.papel
    when 'adm' then array['gerente','gestor_trafego','criativo','analista_conformidade','operador_ia','cs','financeiro','adm']::public.papel_usuario[]
    when 'gerente' then array['gestor_trafego','criativo','analista_conformidade','operador_ia','cs','financeiro']::public.papel_usuario[]
    when 'gestor_trafego' then array['criativo']::public.papel_usuario[]
    else array[]::public.papel_usuario[]
  end;

  if not (v_alvo.papel = any(v_permitidos)) then
    return jsonb_build_object('ok', false, 'motivo', format('Seu papel não gerencia contas de %s.', v_alvo.papel));
  end if;
  if p_papel <> 'advogado' and not (p_papel = any(v_permitidos)) then
    return jsonb_build_object('ok', false, 'motivo', format('Seu papel não pode atribuir contas de %s.', p_papel));
  end if;
  if p_papel = 'advogado' then
    return jsonb_build_object('ok', false, 'motivo', 'Conta de advogado só nasce da liberação de acesso no funil (INV-12).');
  end if;

  if coalesce(trim(p_nome), '') = '' or array_length(regexp_split_to_array(trim(p_nome), '\s+'), 1) < 2 then
    return jsonb_build_object('ok', false, 'motivo', 'Informe nome e sobrenome — as iniciais do avatar saem daqui.');
  end if;
  if v_email = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o e-mail.');
  end if;

  -- Dedup inclui inativos de propósito: reaproveitar e-mail de conta
  -- desativada mistura o histórico dos dois.
  if exists (select 1 from public.perfis where lower(email) = v_email and id <> p_id) then
    return jsonb_build_object('ok', false, 'motivo', 'Já existe uma conta com este e-mail, ativa ou desativada.');
  end if;

  if p_papel in ('adm','gerente','gestor_trafego','criativo','analista_conformidade','operador_ia','cs','financeiro')
     and coalesce(trim(p_departamento), '') = ''
  then
    return jsonb_build_object('ok', false, 'motivo', 'Departamento é obrigatório para papéis internos.');
  end if;

  update public.perfis
     set nome = trim(p_nome),
         email = v_email,
         papel = p_papel,
         departamento = nullif(trim(coalesce(p_departamento, '')), ''),
         permissoes = coalesce(p_permissoes, '{}'),
         avatar_iniciais = public.iniciais_do_nome(trim(p_nome))
   where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.atualizar_usuario(uuid, text, text, public.papel_usuario, text, text[])
  from public, anon, authenticated;
grant execute on function public.atualizar_usuario(uuid, text, text, public.papel_usuario, text, text[])
  to authenticated;

/*
 * Duas primeiras iniciais do nome, ignorando conectivos — mesma regra de
 * `iniciais()` em src/lib/usuarios.ts. Função própria porque tanto
 * `atualizar_usuario` quanto a função de borda de criação precisam dela.
 */
create function public.iniciais_do_nome(p_nome text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when array_length(partes, 1) is null then '?'
    when array_length(partes, 1) = 1 then upper(left(partes[1], 2))
    else upper(left(partes[1], 1) || left(partes[array_length(partes, 1)], 1))
  end
  from (
    select array_remove(
      array(
        select p from unnest(regexp_split_to_array(trim(p_nome), '\s+')) as p
         where lower(p) not in ('de', 'da', 'do', 'das', 'dos', 'e')
      ),
      null
    ) as partes
  ) t;
$$;

revoke execute on function public.iniciais_do_nome(text) from public, anon, authenticated;
grant execute on function public.iniciais_do_nome(text) to authenticated, service_role;

/*
 * ACC-R02/ACC-R03 outra vez, e o piso que impede o sistema de ficar sem
 * ninguém capaz de criar conta: não desativa (nem rebaixaria, se esta função
 * mexesse em papel) o último administrador ativo. Lote é tudo ou nada — ids
 * inválidos recusam a operação inteira, não pulam em silêncio.
 */
create function public.alterar_status_usuarios(p_ids uuid[], p_status public.status_usuario)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ator public.perfis;
  v_permitidos public.papel_usuario[];
  v_invalido record;
  v_admins_restantes int;
begin
  select * into v_ator from public.perfis where id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Sessão sem perfil.');
  end if;

  if auth.uid() = any(p_ids) then
    return jsonb_build_object('ok', false, 'motivo', 'Ninguém altera o status da própria conta por aqui (ACC-R03).');
  end if;

  v_permitidos := case v_ator.papel
    when 'adm' then array['gerente','gestor_trafego','criativo','analista_conformidade','operador_ia','cs','financeiro','adm']::public.papel_usuario[]
    when 'gerente' then array['gestor_trafego','criativo','analista_conformidade','operador_ia','cs','financeiro']::public.papel_usuario[]
    when 'gestor_trafego' then array['criativo']::public.papel_usuario[]
    else array[]::public.papel_usuario[]
  end;

  select id, papel into v_invalido
    from public.perfis
   where id = any(p_ids) and not (papel = any(v_permitidos))
   limit 1;
  if found then
    return jsonb_build_object('ok', false, 'motivo', format('Seu papel não gerencia contas de %s.', v_invalido.papel));
  end if;

  if p_status <> 'ativo' then
    select count(*) into v_admins_restantes
      from public.perfis
     where papel = 'adm' and status = 'ativo' and id <> all(p_ids);

    if v_admins_restantes = 0 then
      return jsonb_build_object('ok', false, 'motivo', 'Não dá para desativar o último administrador ativo.');
    end if;
  end if;

  update public.perfis set status = p_status where id = any(p_ids);

  return jsonb_build_object('ok', true, 'alterados', array_length(p_ids, 1));
end;
$$;

revoke execute on function public.alterar_status_usuarios(uuid[], public.status_usuario)
  from public, anon, authenticated;
grant execute on function public.alterar_status_usuarios(uuid[], public.status_usuario)
  to authenticated;
