-- Fundação: perfis, advogados, leads, contato e extrato de crédito.
--
-- O que este arquivo decide, e que fica caro reverter depois:
--
--  1. O telefone do cliente final mora em tabela própria (`leads_contato`).
--     A política de acesso do Postgres é por LINHA, não por coluna: com o
--     telefone dentro de `leads`, ou a linha inteira é legível — e o contato
--     vaza para quem não comprou, bastando abrir o devtools — ou ninguém lê o
--     catálogo. Separar é o que faz `INV-11` ser garantido pelo banco em vez de
--     escondido na renderização.
--
--  2. O saldo do advogado NÃO é coluna. É a soma do extrato, exposta pela view
--     `advogados_com_saldo`. `INV-15` exige que consumido feche com comprado;
--     uma coluna editável ao lado do extrato torna a conferência impossível,
--     porque os dois divergem e não há como saber qual está certo.
--
--  3. Identificador é `uuid`. As seeds da maquete usam slug (`lead-a1b2`,
--     `u-advogado`) e são fictícias por princípio — não são migradas.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Vocabulário — os mesmos valores de types.ts, sem tradução
-- ---------------------------------------------------------------------------

create type public.papel_usuario as enum (
  'adm', 'gerente', 'gestor_trafego', 'criativo', 'analista_conformidade',
  'operador_ia', 'closer', 'sdr', 'cs', 'financeiro', 'advogado'
);

create type public.status_usuario as enum ('ativo', 'convite_pendente', 'inativo');

create type public.tese as enum (
  'polo_passivo', 'vinculo_empregaticio', 'juros_abusivos'
);

create type public.status_lead as enum (
  'novo', 'em_qualificacao', 'qualificado', 'agendado', 'vendido', 'atendido',
  'desqualificado', 'nao_atendeu', 'no_show', 'expirado'
);

create type public.origem_lead as enum (
  'meta_ads', 'google_ads', 'indicacao', 'organico'
);

create type public.status_advogado as enum (
  'novo', 'em_qualificacao', 'qualificado', 'acesso_liberado',
  'modelo_definido', 'ativo', 'recusado', 'perdido', 'em_pausa'
);

create type public.modelo_pagamento as enum ('avulso', 'creditos');
create type public.porte_escritorio as enum ('solo', 'pequeno', 'medio', 'grande');
create type public.prioridade_advogado as enum ('P1', 'P2', 'P3');
create type public.tipo_movimento as enum ('compra', 'consumo', 'devolucao', 'ajuste');

-- ---------------------------------------------------------------------------
-- Advogado — o comprador
-- ---------------------------------------------------------------------------

create table public.advogados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  oab text not null,
  -- INV-12 — nulo enquanto a inscrição não foi conferida por alguém do time.
  -- Sem isto preenchido, `liberar_acesso_advogado` recusa criar o login.
  oab_conferida_em timestamptz,
  oab_conferida_por uuid,
  email text not null,
  whatsapp text not null,
  uf text not null,
  teses public.tese[] not null default '{}',
  -- Vazio significa o estado inteiro.
  cidades text[] not null default '{}',
  porte public.porte_escritorio not null,
  status public.status_advogado not null default 'novo',
  modelo_pagamento public.modelo_pagamento,
  potencial_mensal int not null default 0,
  usuario_id uuid,
  prioridade_manual public.prioridade_advogado,
  responsavel_id uuid,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  ultima_atividade timestamptz not null default now(),
  -- ADV-R05 — obrigatório ao marcar como perdido.
  motivo_perda text,
  constraint perdido_exige_motivo
    check (status <> 'perdido' or motivo_perda is not null)
);

-- ---------------------------------------------------------------------------
-- Perfil — a conta de acesso
-- ---------------------------------------------------------------------------

create table public.perfis (
  -- INV-12 — a conta nasce de uma liberação, nunca de cadastro público. Quem
  -- cria a linha em `auth.users` é a função de borda de liberação de acesso.
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null,
  email text not null,
  papel public.papel_usuario not null,
  departamento text,
  permissoes text[] not null default '{}',
  -- LED-R06 — a chave de isolamento entre carteiras. Nulo para o time interno.
  advogado_id uuid references public.advogados (id),
  avatar_iniciais text not null,
  status public.status_usuario not null default 'convite_pendente',
  criado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id),
  ultimo_acesso timestamptz,
  -- Papel externo sem advogado vinculado não enxerga nada e não compra nada;
  -- papel interno com vínculo seria isolamento aplicado a quem não devia.
  constraint vinculo_coerente_com_papel
    check ((papel = 'advogado') = (advogado_id is not null))
);

alter table public.advogados
  add constraint advogados_usuario_id_fkey
  foreign key (usuario_id) references public.perfis (id);

alter table public.advogados
  add constraint advogados_responsavel_id_fkey
  foreign key (responsavel_id) references public.perfis (id);

-- ---------------------------------------------------------------------------
-- Lead — o produto
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tese public.tese not null,
  uf text not null,
  cidade text not null,
  status public.status_lead not null default 'novo',
  origem public.origem_lead not null default 'meta_ads',
  resumo_qualificacao text not null default '',
  -- Respostas aos filtros de elegibilidade da tese, por id do filtro.
  elegibilidade jsonb not null default '{}'::jsonb,
  reuniao_em timestamptz,
  -- CRE-R03 — preço congelado na publicação. Mexer na tabela da tese depois
  -- não reescreve o que já está anunciado nem o que já foi vendido.
  custo_creditos int not null default 0,
  preco_avulso numeric(10, 2) not null default 0,
  -- LED-R03 / INV-10 — no máximo um comprador, para sempre.
  comprado_por uuid references public.advogados (id),
  comprado_em timestamptz,
  -- LED-R04 — trava de checkout com prazo.
  reservado_por uuid references public.advogados (id),
  reservado_ate timestamptz,
  tem_gravacao boolean not null default false,
  criado_em timestamptz not null default now(),
  ultima_atividade timestamptz not null default now(),
  motivo_desqualificacao text,
  devolucao_motivo text,
  devolucao_em timestamptz,

  constraint vendido_tem_comprador
    check (status <> 'vendido' or comprado_por is not null),
  constraint comprador_tem_carimbo
    check ((comprado_por is null) = (comprado_em is null)),
  constraint devolucao_completa
    check ((devolucao_motivo is null) = (devolucao_em is null)),
  -- CRE-R05 — só se devolve o que foi comprado.
  constraint devolucao_exige_compra
    check (devolucao_em is null or comprado_por is not null)
);

-- O catálogo é a consulta quente: agendado e sem comprador.
create index leads_catalogo_idx
  on public.leads (tese, uf, reuniao_em)
  where status = 'agendado' and comprado_por is null;

create index leads_carteira_idx on public.leads (comprado_por)
  where comprado_por is not null;

-- ---------------------------------------------------------------------------
-- INV-11 — o contato, atrás de uma política própria
-- ---------------------------------------------------------------------------

/*
 * O telefone é o produto e é dado pessoal de alguém que não autorizou aquele
 * advogado específico. Aqui ele fica sozinho, com política própria, para que
 * "quem pode ler o catálogo" e "quem pode ler o contato" sejam duas perguntas
 * distintas — que é exatamente o que a maquete resolvia em `contatoVisivel()`,
 * mas na renderização, com o dado já dentro do navegador.
 *
 * INV-17 — não existe campo para senha, cartão ou número de contrato. A
 * ausência do campo é o que sustenta a regra: o que não se pode gravar não vaza.
 */
create table public.leads_contato (
  lead_id uuid primary key references public.leads (id) on delete cascade,
  telefone text not null,
  atualizado_em timestamptz not null default now()
);

/*
 * O mesmo contato entrando duas vezes vira dois produtos do mesmo cliente, e aí
 * INV-10 é violado sem ninguém perceber: são dois registros distintos.
 *
 * A unicidade não pode ser um índice simples sobre `telefone`: ela só vale
 * entre leads ATIVOS. Quem foi desqualificado ou não atendeu há seis meses pode
 * voltar por um anúncio novo, e um índice global recusaria esse cadastro — o
 * cliente que retorna é justamente o que não pode ser barrado. Como o status
 * mora em `leads`, a checagem precisa do gatilho.
 */
create function public.recusar_contato_duplicado()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
      from public.leads_contato c
      join public.leads l on l.id = c.lead_id
     where c.telefone = new.telefone
       and c.lead_id is distinct from new.lead_id
       and l.status not in ('desqualificado', 'nao_atendeu', 'no_show', 'expirado')
  ) then
    raise exception
      'INV-10: já existe um lead ativo com este telefone — seriam dois produtos do mesmo cliente';
  end if;
  return new;
end;
$$;

create trigger contato_sem_duplicata_ativa
  before insert or update on public.leads_contato
  for each row execute function public.recusar_contato_duplicado();

create index leads_contato_telefone_idx on public.leads_contato (telefone);

-- ---------------------------------------------------------------------------
-- Extrato de crédito
-- ---------------------------------------------------------------------------

create table public.movimentos_creditos (
  id uuid primary key default gen_random_uuid(),
  advogado_id uuid not null references public.advogados (id),
  tipo public.tipo_movimento not null,
  -- Positivo entra, negativo sai.
  creditos int not null,
  -- Em reais. Zero quando o movimento não envolve dinheiro.
  valor numeric(10, 2) not null default 0,
  lead_id uuid references public.leads (id),
  descricao text not null,
  -- INV-13 — o instante do movimento é carimbo, não campo editável.
  em timestamptz not null default now(),
  -- INV-14 — o que originou a entrada. Baixa manual não credita: quando a
  -- operação precisa destravar alguém, o caminho é o tipo `ajuste`, que aparece
  -- no extrato como tal e exige motivo.
  origem_confirmacao text,
  constraint ajuste_exige_motivo
    check (tipo <> 'ajuste' or length(coalesce(descricao, '')) > 0)
);

create index movimentos_por_advogado_idx
  on public.movimentos_creditos (advogado_id, em desc);

-- Um lead consome crédito uma vez e é devolvido no máximo uma vez.
create unique index movimento_por_lead_e_tipo_idx
  on public.movimentos_creditos (lead_id, tipo)
  where lead_id is not null and tipo in ('consumo', 'devolucao');

/*
 * INV-15 — o saldo é a soma do extrato, nunca um número guardado à parte.
 *
 * Na maquete `Advogado.saldoCreditos` era coluna e `divergenciaDeSaldo()`
 * existia para detectar a deriva entre os dois. Aqui a deriva é estruturalmente
 * impossível: não há o segundo número.
 */
create view public.advogados_com_saldo
with (security_invoker = true) as
  select
    a.*,
    coalesce(
      (select sum(m.creditos) from public.movimentos_creditos m
        where m.advogado_id = a.id),
      0
    )::int as saldo_creditos
  from public.advogados a;

-- ---------------------------------------------------------------------------
-- Quem é quem — auxiliares para a política de acesso
-- ---------------------------------------------------------------------------

/*
 * Uma política em `perfis` que consultasse `perfis` recursaria. Estas duas são
 * `security definer` justamente para escapar disso, e por isso não devolvem
 * nada além do mínimo que a política precisa saber.
 *
 * API-R04 — função nova revoga execução de PUBLIC, anon e authenticated, os
 * três: a plataforma concede execução direto aos dois últimos por privilégio
 * padrão, então revogar só de PUBLIC não tem efeito nenhum.
 */
create function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select papel from public.perfis where id = auth.uid() and status = 'ativo';
$$;

revoke execute on function public.papel_atual() from public, anon, authenticated;
grant execute on function public.papel_atual() to authenticated;

create function public.advogado_atual()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select advogado_id from public.perfis where id = auth.uid() and status = 'ativo';
$$;

revoke execute on function public.advogado_atual() from public, anon, authenticated;
grant execute on function public.advogado_atual() to authenticated;

/*
 * API-R05 — falha de identificação fecha, não abre.
 *
 * `papel_atual()` devolve NULL para sessão sem perfil, perfil inativo ou perfil
 * que não carregou. Toda política abaixo compara com igualdade, e comparação
 * com NULL é NULL — nunca verdadeira. O efeito é o correto por construção:
 * quem o banco não reconhece não lê nada, em vez de cair no papel mais
 * permissivo da lista.
 */
create function public.eh_time_interno()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.papel_atual() is not null and public.papel_atual() <> 'advogado';
$$;

revoke execute on function public.eh_time_interno() from public, anon, authenticated;
grant execute on function public.eh_time_interno() to authenticated;

-- ---------------------------------------------------------------------------
-- INV-13 — o carimbo da venda é imutável
-- ---------------------------------------------------------------------------

/*
 * É o registro que responde, perante a OAB, quando e para quem aquele cliente
 * foi direcionado. Um `update` que reescreva o comprador apaga essa resposta —
 * e apaga em silêncio, porque a linha continua existindo e parecendo íntegra.
 */
create function public.travar_carimbo_de_compra()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.comprado_por is not null and new.comprado_por is distinct from old.comprado_por then
    raise exception 'INV-13: o comprador de um lead não pode ser alterado (lead %)', old.id;
  end if;
  if old.comprado_em is not null and new.comprado_em is distinct from old.comprado_em then
    raise exception 'INV-13: o carimbo da compra não pode ser alterado (lead %)', old.id;
  end if;
  -- INV-10 — devolução repõe o crédito e não recoloca o lead no catálogo.
  if old.comprado_por is not null and new.status = 'agendado' then
    raise exception 'INV-10: lead vendido não volta ao catálogo (lead %)', old.id;
  end if;
  return new;
end;
$$;

create trigger leads_carimbo_imutavel
  before update on public.leads
  for each row execute function public.travar_carimbo_de_compra();

/*
 * O extrato é livro-caixa: só recebe lançamento novo. Alterar ou apagar um
 * movimento quebra `INV-15`, porque o saldo passa a divergir do que foi
 * efetivamente pago — e é justamente essa conferência que o invariante exige
 * poder fazer.
 */
create function public.extrato_e_imutavel()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'INV-15: movimento de crédito não é alterado nem removido — lance um ajuste';
end;
$$;

create trigger movimentos_imutaveis
  before update or delete on public.movimentos_creditos
  for each row execute function public.extrato_e_imutavel();

-- ---------------------------------------------------------------------------
-- Política de acesso
-- ---------------------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.advogados enable row level security;
alter table public.leads enable row level security;
alter table public.leads_contato enable row level security;
alter table public.movimentos_creditos enable row level security;

/*
 * INV-05 do lado do banco — papel novo não herda acesso.
 *
 * Nenhuma política abaixo é escrita como "todo mundo menos X". Todas nomeiam
 * quem entra. Papel criado depois fica de fora até ser adicionado
 * conscientemente, que é o mesmo desenho de `MODULOS` em navigation.ts.
 */

-- Perfis ---------------------------------------------------------------------

create policy "cada um lê o próprio perfil"
  on public.perfis for select to authenticated
  using (id = auth.uid());

create policy "o time interno lê os perfis"
  on public.perfis for select to authenticated
  using (public.eh_time_interno());

create policy "só adm e gerente escrevem perfil"
  on public.perfis for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente'))
  with check (public.papel_atual() in ('adm', 'gerente'));

-- Advogados ------------------------------------------------------------------

create policy "o advogado lê o próprio cadastro"
  on public.advogados for select to authenticated
  using (id = public.advogado_atual());

create policy "o funil é do time interno"
  on public.advogados for select to authenticated
  using (public.eh_time_interno());

create policy "quem opera o funil escreve"
  on public.advogados for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'closer', 'sdr', 'cs'))
  with check (public.papel_atual() in ('adm', 'gerente', 'closer', 'sdr', 'cs'));

-- Leads ----------------------------------------------------------------------

create policy "o time interno lê os leads"
  on public.leads for select to authenticated
  using (public.eh_time_interno());

/*
 * LED-R06 — o advogado enxerga o catálogo das teses e regiões em que atua, mais
 * tudo o que ele mesmo comprou. Nunca a carteira de outro.
 *
 * API-R02 — esta política é o controle de acesso de verdade. O filtro
 * equivalente em `visiveisPara()` continua existindo como ergonomia, mas quem
 * monta a consulta é o cliente, e nada o impede de pedir mais do que deve.
 */
create policy "o advogado lê a própria carteira e o catálogo dele"
  on public.leads for select to authenticated
  using (
    comprado_por = public.advogado_atual()
    or (
      status = 'agendado'
      and comprado_por is null
      and exists (
        select 1 from public.advogados a
        where a.id = public.advogado_atual()
          and leads.tese = any (a.teses)
          and leads.uf = a.uf
          and (cardinality(a.cidades) = 0 or leads.cidade = any (a.cidades))
      )
    )
  );

create policy "quem opera o catálogo escreve"
  on public.leads for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'operador_ia', 'cs'))
  with check (public.papel_atual() in ('adm', 'gerente', 'operador_ia', 'cs'));

-- Contato --------------------------------------------------------------------

/*
 * INV-11 — o telefone só aparece depois da compra.
 *
 * Não há política de escrita para o papel `advogado` aqui, nem de leitura antes
 * da compra. É a mesma fronteira de `contatoVisivel()`, mas avaliada antes de o
 * dado sair do banco.
 */
create policy "o comprador lê o contato do que comprou"
  on public.leads_contato for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = leads_contato.lead_id
        and l.comprado_por = public.advogado_atual()
    )
  );

create policy "o time interno lê o contato"
  on public.leads_contato for select to authenticated
  using (public.eh_time_interno());

create policy "quem opera o catálogo escreve o contato"
  on public.leads_contato for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'operador_ia', 'cs'))
  with check (public.papel_atual() in ('adm', 'gerente', 'operador_ia', 'cs'));

-- Créditos -------------------------------------------------------------------

create policy "o advogado lê o próprio extrato"
  on public.movimentos_creditos for select to authenticated
  using (advogado_id = public.advogado_atual());

create policy "o time interno lê o extrato"
  on public.movimentos_creditos for select to authenticated
  using (public.eh_time_interno());

/*
 * INV-14 — não há política de INSERT para ninguém, de propósito.
 *
 * Crédito entra pelo webhook do provedor de pagamento, que roda com privilégio
 * elevado, ou sai pela função `comprar_lead`. Se houvesse INSERT direto aqui,
 * bastaria uma tela nova chamar a tabela para creditar sem confirmação — que é
 * exatamente o atalho que o invariante fecha.
 */
create policy "ajuste manual é do financeiro"
  on public.movimentos_creditos for insert to authenticated
  with check (
    tipo = 'ajuste'
    and public.papel_atual() in ('adm', 'financeiro')
    and 'credito:conciliar_pagamento' = any (
      select unnest(permissoes) from public.perfis where id = auth.uid()
    )
  );
