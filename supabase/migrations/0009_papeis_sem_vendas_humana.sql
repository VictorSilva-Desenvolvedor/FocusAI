-- ---------------------------------------------------------------------------
-- 0009 — tira `closer` e `sdr` do vocabulário de papéis
--
-- NÃO APLICADA. Está versionada porque o app já não conhece os dois papéis, e
-- banco que aceita um valor que o app não sabe renderizar é conta que entra e
-- cai como bloqueada (ACC-R08) sem ninguém entender por quê. Antes de rodar:
--
--   1. Confira quem ainda está com esses papéis:
--        select id, email, papel from public.perfis
--        where papel in ('closer', 'sdr');
--   2. Decida o destino de cada um. O passo 1 abaixo move todo mundo para `cs`,
--      que é quem passou a conduzir o funil do advogado — mude se não for o caso.
--   3. Apague as contas de teste que sobraram no Supabase Auth
--      (closer@focus.ai e sdr@focus.ai). `npm run contas:teste` não as cria
--      mais, mas também não remove o que já existe.
--   4. Regenere `src/servicos/banco.types.ts`, que ainda lista os dois valores.
--
-- Postgres não remove valor de enum. O caminho é recriar o tipo e reapontar as
-- colunas — por isso a ordem importa e por isso isto não é um `alter type`.
-- ---------------------------------------------------------------------------

begin;

-- 1. Ninguém pode continuar com um papel que vai deixar de existir. Fazer isto
--    depois do rename quebraria: a coluna já estaria com o tipo novo.
update public.perfis set papel = 'cs' where papel in ('closer', 'sdr');

-- 2. A política nomeia os papéis um a um; ela some junto com o tipo antigo e é
--    recriada no passo 5. Recriar depois, e não antes, evita a janela em que a
--    tabela fica sem regra de escrita.
drop policy if exists "quem opera o funil escreve" on public.advogados;

-- 3. Tipo novo, sem os dois valores. O antigo vira `papel_usuario_antigo` para
--    que as colunas continuem válidas enquanto a conversão acontece.
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

-- 5. A mesma política, sem os papéis removidos. CS conduz o funil do advogado;
--    INV-05 continua valendo — papel novo não herda escrita aqui, precisa ser
--    acrescentado a esta lista conscientemente.
create policy "quem opera o funil escreve"
  on public.advogados for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'cs'))
  with check (public.papel_atual() in ('adm', 'gerente', 'cs'));

commit;

-- Confirmação depois de aplicar:
--   select unnest(enum_range(null::public.papel_usuario));
--   select papel, count(*) from public.perfis group by papel order by papel;
