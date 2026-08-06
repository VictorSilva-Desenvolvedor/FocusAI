-- ---------------------------------------------------------------------------
-- 0009 — tira `closer` e `sdr` do vocabulário de papéis
--
-- Antes de rodar, já decidido nesta versão: os dois papéis viram `cs`, que é
-- quem passou a conduzir o funil do advogado; e as contas de teste que
-- sobrarem no Supabase Auth (closer@focus.ai, sdr@focus.ai) são apagadas à
-- parte, depois desta migration — `npm run contas:teste` não as recria mais,
-- mas também não remove o que já existe.
--
-- Postgres não remove valor de enum: o caminho é recriar o tipo e reapontar
-- tudo que depende dele. E depende mais coisa do que a política de
-- `advogados`: a política solta na primeira versão desta migration não
-- bastava — `papel_atual()` lê `perfis.papel` e retorna `papel_usuario`,
-- `atualizar_usuario` recebe `papel_usuario` de parâmetro, a constraint
-- `vinculo_coerente_com_papel` compara contra um literal `::papel_usuario`, e
-- mais três políticas (`leads`, `leads_contato`, `movimentos_creditos`,
-- `perfis`) chamam `papel_atual()` — todas travam o `drop type` se ficarem
-- para trás. `select distinct pg_describe_object(classid, objid, objsubid)
-- from pg_depend where refobjid = 'public.papel_usuario'::regtype` é como se
-- confere a lista antes de repetir isto para outro tipo.
-- ---------------------------------------------------------------------------

begin;

-- 1. Ninguém pode continuar com um papel que vai deixar de existir.
update public.perfis set papel = 'cs' where papel in ('closer', 'sdr');

-- 2. Solta, na ordem certa, tudo que referencia o tipo: constraint e
--    políticas primeiro (senão elas impedem o drop das funções), funções
--    depois (senão elas impedem o rename do tipo).
alter table public.perfis drop constraint vinculo_coerente_com_papel;

drop policy "quem opera o funil escreve" on public.advogados;
drop policy "quem opera o catálogo escreve" on public.leads;
drop policy "quem opera o catálogo escreve o contato" on public.leads_contato;
drop policy "ajuste manual é do financeiro" on public.movimentos_creditos;
drop policy "só adm e gerente escrevem perfil" on public.perfis;

drop function public.papel_atual();
drop function public.atualizar_usuario(uuid, text, text, public.papel_usuario, text, text[]);

-- 3. Tipo novo, sem os dois valores. O antigo vira `papel_usuario_antigo`
--    para que a coluna continue válida enquanto a conversão acontece.
alter type public.papel_usuario rename to papel_usuario_antigo;

create type public.papel_usuario as enum (
  'adm', 'gerente', 'gestor_trafego', 'criativo', 'analista_conformidade',
  'operador_ia', 'cs', 'financeiro', 'advogado'
);

-- 4. Conversão via texto: é o único caminho entre dois enums distintos.
alter table public.perfis
  alter column papel type public.papel_usuario
  using papel::text::public.papel_usuario;

drop type public.papel_usuario_antigo;

-- 5. Reconstrói tudo contra o tipo novo, igual ao que existia — a única
--    mudança de conteúdo é `closer`/`sdr` fora dos dois arrays que os
--    citavam (a política de `advogados`; as outras nunca os citaram).
alter table public.perfis add constraint vinculo_coerente_com_papel
  check ((papel = 'advogado'::public.papel_usuario) = (advogado_id is not null));

create function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select papel from public.perfis where id = auth.uid() and status = 'ativo';
$$;

revoke all on function public.papel_atual() from public, anon, authenticated;
grant execute on function public.papel_atual() to authenticated;

-- INV-05 continua valendo — papel novo não herda escrita aqui, precisa ser
-- acrescentado a estas listas conscientemente.
create policy "quem opera o funil escreve"
  on public.advogados for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'cs'))
  with check (public.papel_atual() in ('adm', 'gerente', 'cs'));

create policy "quem opera o catálogo escreve"
  on public.leads for all to authenticated
  using (public.papel_atual() = any (array['adm', 'gerente', 'operador_ia', 'cs']::public.papel_usuario[]))
  with check (public.papel_atual() = any (array['adm', 'gerente', 'operador_ia', 'cs']::public.papel_usuario[]));

create policy "quem opera o catálogo escreve o contato"
  on public.leads_contato for all to authenticated
  using (public.papel_atual() = any (array['adm', 'gerente', 'operador_ia', 'cs']::public.papel_usuario[]))
  with check (public.papel_atual() = any (array['adm', 'gerente', 'operador_ia', 'cs']::public.papel_usuario[]));

create policy "ajuste manual é do financeiro"
  on public.movimentos_creditos for insert to authenticated
  with check (
    tipo = 'ajuste'::tipo_movimento
    and public.papel_atual() = any (array['adm', 'financeiro']::public.papel_usuario[])
    and 'credito:conciliar_pagamento' in (
      select unnest(perfis.permissoes) from public.perfis where perfis.id = auth.uid()
    )
  );

create policy "só adm e gerente escrevem perfil"
  on public.perfis for all to authenticated
  using (public.papel_atual() = any (array['adm', 'gerente']::public.papel_usuario[]))
  with check (public.papel_atual() = any (array['adm', 'gerente']::public.papel_usuario[]));

create function public.atualizar_usuario(
  p_id uuid, p_nome text, p_email text, p_papel public.papel_usuario,
  p_departamento text default null, p_permissoes text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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

revoke all on function public.atualizar_usuario(uuid, text, text, public.papel_usuario, text, text[]) from public, anon, authenticated;
grant execute on function public.atualizar_usuario(uuid, text, text, public.papel_usuario, text, text[]) to authenticated;

commit;

-- Confirmação depois de aplicar:
--   select unnest(enum_range(null::public.papel_usuario));
--   select papel, count(*) from public.perfis group by papel order by papel;
