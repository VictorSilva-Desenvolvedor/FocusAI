-- Campanhas vira dado real: uma linha por campanha, mantida por quem opera
-- tráfego. `integracoes.ts` já documenta que Meta Ads e Google Ads são
-- integração PENDENTE — "o custo por lead qualificado é digitado à mão". Esta
-- migration não finge integração que não existe: só troca o mockup por uma
-- tabela de verdade para o mesmo dado digitado à mão.

create type public.situacao_campanha as enum ('ativa', 'pausada', 'aprendizado', 'encerrada');

create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tese public.tese not null,
  plataforma public.plataforma_anuncio not null,
  situacao public.situacao_campanha not null default 'ativa',
  -- Em reais.
  verba_diaria numeric(10, 2) not null default 0,
  gasto_mes numeric(10, 2) not null default 0,
  leads_mes int not null default 0,
  leads_qualificados_mes int not null default 0,
  -- INV-16 — nenhum criativo sobe sem parecer aprovado.
  criativos_no_ar int not null default 0,
  criativos_sem_parecer int not null default 0,
  criado_por uuid not null references public.perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.perfis (id),

  constraint qualificados_nao_passa_do_total
    check (leads_qualificados_mes <= leads_mes),
  constraint sem_parecer_nao_passa_do_no_ar
    check (criativos_sem_parecer <= criativos_no_ar)
);

create index campanhas_por_tese_idx on public.campanhas (tese);

-- ---------------------------------------------------------------------------
-- Política de acesso
-- ---------------------------------------------------------------------------

alter table public.campanhas enable row level security;

/*
 * Espelha `papeis`/`papeisRestritos` de `campanhas` em `navigation.ts`: quem
 * opera tráfego lê e escreve, o time de criativo só lê — precisa ver o que
 * está no ar para saber o que produzir, mas não mexe em verba nem situação.
 */
create policy "quem opera tráfego lê e escreve campanhas"
  on public.campanhas for all to authenticated
  using (public.papel_atual() in ('adm', 'gerente', 'gestor_trafego'))
  with check (public.papel_atual() in ('adm', 'gerente', 'gestor_trafego'));

create policy "o time de criativo lê as campanhas"
  on public.campanhas for select to authenticated
  using (
    public.papel_atual() = 'criativo'
    or 'modulo:campanhas' = any (
      select unnest(permissoes) from public.perfis where id = auth.uid()
    )
  );
