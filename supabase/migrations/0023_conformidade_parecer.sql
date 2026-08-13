-- Conformidade vira dado real: envio de criativo para fila e emissão de
-- parecer, à luz do Provimento 205 da OAB.
--
-- Não existia backend nenhum para este módulo — a tela lia `PARECERES_SEED`,
-- fictício por inteiro. `INV-16` diz que nenhum criativo sobe sem parecer;
-- esta migration é o que faz esse parecer existir de verdade.

create type public.plataforma_anuncio as enum ('meta', 'google');

create type public.decisao_conformidade as enum (
  'aprovado', 'aprovado_com_ressalva', 'exigir_ajuste', 'pendencia_documental', 'reprovado'
);

create table public.pareceres (
  id uuid primary key default gen_random_uuid(),
  criativo text not null,
  tese public.tese not null,
  plataforma public.plataforma_anuncio not null,
  decisao public.decisao_conformidade,
  -- INV-13 — o carimbo de quando a peça foi avaliada. Imutável depois de gravado.
  emitido_em timestamptz,
  emitido_por uuid references public.perfis (id),
  -- CNF-R01 — o cronômetro do SLA corre a partir daqui, até o parecer ser emitido.
  enviado_em timestamptz not null default now(),
  enviado_por uuid not null references public.perfis (id),
  observacao text,

  -- Ou nada foi decidido ainda, ou os três campos do parecer chegaram juntos —
  -- nunca um pedaço do carimbo sem o resto.
  constraint parecer_emitido_e_completo
    check (
      (decisao is null and emitido_em is null and emitido_por is null)
      or (decisao is not null and emitido_em is not null and emitido_por is not null)
    )
);

-- A fila quente: pendentes, mais antigos primeiro, para o SLA aparecer estourado.
create index pareceres_pendentes_idx on public.pareceres (enviado_em) where decisao is null;
create index pareceres_por_remetente_idx on public.pareceres (enviado_por);

-- ---------------------------------------------------------------------------
-- INV-13 — parecer emitido não muda
-- ---------------------------------------------------------------------------

/*
 * É o carimbo que prova quando a peça foi avaliada. Um `update` que reescreva
 * a decisão apaga essa prova em silêncio — a linha continua existindo e
 * parecendo íntegra.
 */
create function public.travar_parecer_emitido()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.decisao is not null and (
    new.decisao is distinct from old.decisao
    or new.emitido_em is distinct from old.emitido_em
    or new.emitido_por is distinct from old.emitido_por
  ) then
    raise exception 'INV-13: parecer já emitido não pode ser alterado (parecer %)', old.id;
  end if;
  return new;
end;
$$;

create trigger pareceres_imutaveis_apos_decisao
  before update on public.pareceres
  for each row execute function public.travar_parecer_emitido();

-- ---------------------------------------------------------------------------
-- CNF-R21 — emitir parecer, com o gate extra de "aprovado com ressalva"
-- ---------------------------------------------------------------------------

/*
 * Só administrador e analista de conformidade emitem parecer — é o mesmo par
 * que tem acesso pleno ao módulo em `navigation.ts`.
 *
 * "Aprovado com ressalva" assume risco regulatório, e isso é atribuição de
 * função, não privilégio de papel: exige estar no departamento Conformidade
 * *e* ter a permissão nomeada `conformidade:liberar_com_ressalva`. Nem
 * administrador escapa dessa segunda checagem.
 */
create function public.emitir_parecer(
  p_parecer_id uuid,
  p_decisao public.decisao_conformidade,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_parecer public.pareceres;
  v_departamento text;
  v_permissoes text[];
begin
  if public.papel_atual() not in ('adm', 'analista_conformidade') then
    return jsonb_build_object('ok', false, 'motivo', 'Só administrador ou analista de conformidade emite parecer.');
  end if;

  select * into v_parecer from public.pareceres where id = p_parecer_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Parecer não encontrado.');
  end if;

  if v_parecer.decisao is not null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Este parecer já foi emitido — o registro é imutável (INV-13).'
    );
  end if;

  if p_decisao = 'aprovado_com_ressalva' then
    select departamento, permissoes into v_departamento, v_permissoes
      from public.perfis where id = auth.uid();

    if lower(coalesce(v_departamento, '')) <> 'conformidade'
       or not ('conformidade:liberar_com_ressalva' = any (coalesce(v_permissoes, '{}'))) then
      return jsonb_build_object(
        'ok', false,
        'motivo', 'Aprovar com ressalva exige estar no departamento Conformidade e ter a permissão específica (CNF-R21).'
      );
    end if;
  end if;

  update public.pareceres
     set decisao = p_decisao,
         emitido_em = now(),
         emitido_por = auth.uid(),
         observacao = p_observacao
   where id = p_parecer_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.emitir_parecer(uuid, public.decisao_conformidade, text) from public, anon, authenticated;
grant execute on function public.emitir_parecer(uuid, public.decisao_conformidade, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Política de acesso
-- ---------------------------------------------------------------------------

alter table public.pareceres enable row level security;

/*
 * INV-05 do lado do banco — papel novo não herda acesso. As duas políticas de
 * leitura abaixo espelham `papeis`/`papeisRestritos` do módulo `conformidade`
 * em `navigation.ts`: quem decide lê tudo, quem só produz criativo lê o que
 * mandou.
 */
create policy "quem decide lê todos os pareceres"
  on public.pareceres for select to authenticated
  using (
    public.papel_atual() in ('adm', 'analista_conformidade')
    or 'modulo:conformidade' = any (
      select unnest(permissoes) from public.perfis where id = auth.uid()
    )
  );

create policy "quem envia lê o que enviou"
  on public.pareceres for select to authenticated
  using (enviado_por = auth.uid());

/*
 * Só insert — nada de update/delete direto por política. A única porta para
 * decisão é `emitir_parecer`, que carrega o gate de CNF-R21; uma política de
 * update ampla aqui reabriria exatamente o atalho que a função fecha.
 */
create policy "quem produz criativo envia para parecer"
  on public.pareceres for insert to authenticated
  with check (
    public.papel_atual() in ('adm', 'gestor_trafego', 'criativo')
    and enviado_por = auth.uid()
  );
