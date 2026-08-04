-- Atribuição da captação e a fila de conversões para a Meta.
--
-- O que este arquivo resolve, e por que fica no banco em vez de na ferramenta
-- de automação:
--
--  1. O plano gratuito do Tally não integra pixel. O que ele entrega de graça é
--     o evento `Tally.FormSubmitted` no navegador e o webhook no servidor — os
--     dois carregam o mesmo `respondentId`, e é esse id que casa as duas
--     pontas. Ele vira o `event_id` do evento `Lead` (`CMP-R01`): o navegador
--     dispara pelo pixel, o servidor dispara pela Conversions API, e a Meta
--     deduplica em vez de contar duas vezes.
--
--  2. O que interessa otimizar não é o formulário preenchido — é a reunião
--     agendada e o lead vendido, que acontecem dias depois, longe do navegador.
--     Só existe como reenviar isso se a identidade do clique (`_fbp`, `_fbc`)
--     for gravada no instante da captação: o cookie some, e `fbclid` não se
--     recupera depois (`CMP-R02`).
--
--  3. O nó do n8n é fiação, não regra. Se a montagem do payload — normalização
--     de telefone, hash, escolha de `action_source` — morasse dentro do fluxo,
--     seria lógica de negócio fora do repositório, sem revisão e sem ID pelo
--     qual procurar (`API-R16`). Por isso `eventos_meta_pendentes()` devolve o
--     evento **pronto para postar**: quem envia só transporta.

-- ---------------------------------------------------------------------------
-- A captação — de onde aquele lead veio
-- ---------------------------------------------------------------------------

/*
 * A linha nasce em duas etapas que chegam fora de ordem: o navegador entrega a
 * identidade do clique assim que o formulário é enviado, e o webhook do Tally
 * entrega os dados do lead um instante depois — às vezes antes. Por isso a
 * chave é o `respondentId` e não o lead: a captação existe antes de existir
 * lead.
 *
 * INV-17 — não há campo para e-mail nem para documento do cliente final aqui,
 * de propósito. O que casa o lead com o clique é `_fbp`/`_fbc`; telefone e nome
 * já estão no lead e saem hasheados. Guardar mais dado pessoal para melhorar
 * correspondência de anúncio é troca ruim: o que não se grava não vaza.
 */
create table public.captacoes (
  respondente_id text primary key,
  formulario_id text,
  lead_id uuid references public.leads (id) on delete cascade,
  -- Cookies do pixel, exatamente como o navegador os entregou.
  fbp text,
  fbc text,
  fbclid text,
  -- `event_source_url` da Conversions API: a página onde o formulário estava.
  pagina text,
  /*
   * Só são preenchidos quando a requisição veio do navegador do cliente, e do
   * cabeçalho dela — o navegador não é fonte confiável para o próprio endereço.
   *
   * Com o formulário hospedado no Tally, quem chama o servidor é o Tally: o
   * cabeçalho traz o endereço DELE. Gravado aqui, sairia para a Meta como o IP
   * de quem preencheu o formulário, e a correspondência do anúncio passaria a
   * apontar para um datacenter. Nesse caminho os dois ficam nulos, e é melhor
   * assim: campo ausente a Meta ignora, campo errado ela usa.
   */
  ip inet,
  agente_usuario text,
  criado_em timestamptz not null default now(),
  identidade_em timestamptz
);

create index captacoes_por_lead_idx on public.captacoes (lead_id)
  where lead_id is not null;

-- ---------------------------------------------------------------------------
-- A fila de eventos
-- ---------------------------------------------------------------------------

create type public.evento_meta as enum (
  'Lead', 'LeadQualificado', 'Schedule', 'Purchase'
);

/*
 * `CMP-R03` — um evento por lead e por tipo, garantido por índice único.
 *
 * A fila existe porque o envio é chamada a serviço de terceiro no meio de uma
 * transação de negócio: se `comprar_lead` dependesse da Meta responder, a Meta
 * fora do ar impediria a venda. Aqui o gatilho enfileira e a transação fecha;
 * quem envia é outro processo, e o que ele não conseguiu enviar continua
 * visível na tabela em vez de virar silêncio (`API-R10`).
 */
create table public.eventos_meta (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  evento public.evento_meta not null,
  -- O que a Meta usa para deduplicar. Para `Lead` é o `respondentId` do Tally,
  -- porque o navegador já disparou com ele.
  event_id text not null,
  ocorrido_em timestamptz not null,
  -- Só em `Purchase`. Em reais.
  valor numeric(10, 2),
  enfileirado_em timestamptz not null default now(),
  enviado_em timestamptz,
  tentativas int not null default 0,
  ultimo_erro text,
  -- `CMP-R04` — a Conversions API recusa evento com mais de sete dias. Passado
  -- o prazo o evento é abandonado com motivo registrado, em vez de ficar sendo
  -- retentado para sempre contra uma recusa que não muda.
  abandonado_em timestamptz,
  abandono_motivo text,
  constraint abandono_completo
    check ((abandonado_em is null) = (abandono_motivo is null))
);

create unique index eventos_meta_unico_por_lead_idx
  on public.eventos_meta (lead_id, evento);

create index eventos_meta_pendentes_idx on public.eventos_meta (ocorrido_em)
  where enviado_em is null and abandonado_em is null;

-- ---------------------------------------------------------------------------
-- Normalização e hash — o formato que a Meta exige
-- ---------------------------------------------------------------------------

/*
 * `CMP-R05` — dado pessoal sai daqui hasheado, sempre.
 *
 * A Meta corresponde por SHA-256 do valor normalizado. Normalização errada não
 * dá erro: dá correspondência baixa, que ninguém percebe olhando o painel. Daí
 * as duas funções separadas — o hash é trivial, a normalização é que erra.
 *
 * `sha256()` é do `pg_catalog` e não depende de extensão, que aqui importa:
 * `search_path` explícito (`API-R04`) não enxerga o schema `extensions`.
 */
create function public.hash_meta(valor text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select case
    when coalesce(trim(valor), '') = '' then null
    else encode(sha256(convert_to(lower(trim(valor)), 'utf8')), 'hex')
  end;
$$;

revoke execute on function public.hash_meta(text) from public, anon, authenticated;

/*
 * A Conversions API espera cada campo de correspondência como lista. Devolver
 * lista vazia quando o dado não existe é diferente de omitir o campo: a Meta
 * conta o campo como enviado e a qualidade de correspondência do painel cai
 * sem explicação. Nulo aqui é removido por `jsonb_strip_nulls` lá embaixo.
 */
create function public.hash_meta_lista(valor text)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when public.hash_meta(valor) is null then null
    else jsonb_build_array(public.hash_meta(valor))
  end;
$$;

revoke execute on function public.hash_meta_lista(text) from public, anon, authenticated;

/*
 * A Meta espera o telefone só com dígitos, incluindo o código do país. O
 * cadastro daqui é brasileiro e guarda o número como a pessoa digitou —
 * `(62) 99999-9999` sem o 55 na frente corresponde a ninguém.
 */
create function public.telefone_meta(telefone text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  with digitos as (
    select regexp_replace(coalesce(telefone, ''), '\D', '', 'g') as d
  )
  select case
    when length(d) between 10 and 11 then '55' || d
    when length(d) between 12 and 13 and left(d, 2) = '55' then d
    else nullif(d, '')
  end
  from digitos;
$$;

revoke execute on function public.telefone_meta(text) from public, anon, authenticated;

/*
 * A Meta normaliza cidade para `a-z` antes de hashear — sem acento, sem espaço,
 * sem pontuação. `goiânia` e `goiania` são hashes diferentes, e o que se perde
 * é a correspondência inteira daquele campo, em silêncio: nada falha, a
 * qualidade só fica mais baixa do que deveria.
 *
 * É o mesmo cuidado de `identificador()` em src/lib — decompor antes de
 * descartar, em vez de manter lista de caractere acentuado que alguém esquece
 * de completar. `NFKD` separa a letra do acento; o filtro seguinte tira o
 * acento e deixa a letra.
 *
 * Nome de pessoa NÃO passa por aqui: para `fn` a Meta aceita UTF-8 e espera o
 * nome como ele é.
 */
create function public.cidade_meta(cidade text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select nullif(regexp_replace(normalize(lower(coalesce(cidade, '')), nfkd), '[^a-z0-9]', '', 'g'), '');
$$;

revoke execute on function public.cidade_meta(text) from public, anon, authenticated;

/*
 * Atrás de proxy o `X-Forwarded-For` vem como lista, e às vezes vem torto —
 * porta junto, cabeçalho vazio, valor forjado. Convertido direto, um cabeçalho
 * malformado derruba a gravação inteira por causa do campo menos importante da
 * linha, e a atribuição daquela captação se perde.
 */
create function public.inet_ou_nulo(valor text)
returns inet
language plpgsql
immutable
set search_path = pg_temp
as $$
begin
  return nullif(trim(split_part(coalesce(valor, ''), ',', 1)), '')::inet;
exception when others then
  return null;
end;
$$;

revoke execute on function public.inet_ou_nulo(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enfileiramento
-- ---------------------------------------------------------------------------

/*
 * `CMP-R02` — só entra na fila lead que tem captação.
 *
 * Sem `_fbp`/`_fbc` não há a quem atribuir a conversão, e mandar assim mesmo é
 * pior que não mandar: a Meta recebe uma conversão que não casa com nenhum
 * clique e o custo por resultado do painel passa a mentir. É também o que
 * mantém lead semeado e lead cadastrado à mão fora da fila — nenhum dos dois
 * veio de anúncio.
 */
create function public.enfileirar_evento_meta(
  p_lead_id uuid,
  p_evento public.evento_meta,
  p_ocorrido_em timestamptz,
  p_valor numeric default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captacao public.captacoes;
begin
  select * into v_captacao
    from public.captacoes
   where lead_id = p_lead_id
   order by identidade_em desc nulls last, criado_em desc
   limit 1;

  if not found then
    return;
  end if;

  insert into public.eventos_meta (lead_id, evento, event_id, ocorrido_em, valor)
  values (
    p_lead_id,
    p_evento,
    case
      when p_evento = 'Lead' then v_captacao.respondente_id
      else p_lead_id::text || '-' || p_evento::text
    end,
    p_ocorrido_em,
    p_valor
  )
  on conflict (lead_id, evento) do nothing;
end;
$$;

revoke execute on function public.enfileirar_evento_meta(uuid, public.evento_meta, timestamptz, numeric)
  from public, anon, authenticated;

/*
 * As três etapas seguintes das máquinas — qualificar, agendar, entregar — são
 * as que valem otimizar. Elas acontecem longe do navegador, então o gatilho é
 * quem percebe: a mudança de estado do lead é o fato, e o evento é derivado
 * dela em vez de depender de alguém lembrar de disparar.
 *
 * `security definer` aqui não é preferência. Quem move o lead de estado é o
 * time interno, autenticado, e `eventos_meta` não tem política de escrita para
 * ninguém — enfileirar como o usuário da sessão seria recusado pela própria
 * política, e a recusa derrubaria o `update` do lead junto. O gatilho passaria
 * a impedir a operação que ele só deveria observar.
 */
create function public.enfileirar_eventos_do_lead()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'qualificado' and old.status is distinct from 'qualificado' then
    perform public.enfileirar_evento_meta(new.id, 'LeadQualificado', now(), null);
  end if;

  if new.status = 'agendado' and old.status is distinct from 'agendado'
     and new.reuniao_em is not null then
    perform public.enfileirar_evento_meta(new.id, 'Schedule', now(), null);
  end if;

  /*
   * O valor é o preço avulso mesmo quando a venda consumiu crédito: é o mesmo
   * produto e o mesmo preço de catálogo. Mandar zero para a venda por crédito
   * ensinaria o algoritmo que metade das entregas não vale nada.
   */
  if new.comprado_por is not null and old.comprado_por is null then
    perform public.enfileirar_evento_meta(
      new.id, 'Purchase', coalesce(new.comprado_em, now()), nullif(new.preco_avulso, 0)
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.enfileirar_eventos_do_lead() from public, anon, authenticated;

create trigger leads_enfileiram_eventos_meta
  after update on public.leads
  for each row execute function public.enfileirar_eventos_do_lead();

-- ---------------------------------------------------------------------------
-- Entrada: o navegador e o webhook do Tally
-- ---------------------------------------------------------------------------

/*
 * A identidade do clique, entregue pelo navegador no `Tally.FormSubmitted`.
 *
 * Chega antes do webhook na maioria das vezes, então a linha pode nascer aqui
 * sem lead. A primeira identidade vence: a segunda submissão do mesmo
 * respondente é a mesma sessão, e reescrever `_fbc` com o valor de uma aba
 * aberta depois trocaria o clique que originou a captação por outro.
 */
create function public.registrar_identidade_captacao(
  p_respondente_id text,
  p_formulario_id text default null,
  p_fbp text default null,
  p_fbc text default null,
  p_fbclid text default null,
  p_pagina text default null,
  p_ip text default null,
  p_agente_usuario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(trim(p_respondente_id), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Captação sem respondente não casa com nada.');
  end if;

  insert into public.captacoes (
    respondente_id, formulario_id, fbp, fbc, fbclid, pagina, ip, agente_usuario, identidade_em
  )
  values (
    trim(p_respondente_id), p_formulario_id,
    nullif(trim(coalesce(p_fbp, '')), ''), nullif(trim(coalesce(p_fbc, '')), ''),
    nullif(trim(coalesce(p_fbclid, '')), ''), nullif(trim(coalesce(p_pagina, '')), ''),
    public.inet_ou_nulo(p_ip),
    nullif(trim(coalesce(p_agente_usuario, '')), ''),
    now()
  )
  on conflict (respondente_id) do update
     set formulario_id = coalesce(captacoes.formulario_id, excluded.formulario_id),
         fbp = coalesce(captacoes.fbp, excluded.fbp),
         fbc = coalesce(captacoes.fbc, excluded.fbc),
         fbclid = coalesce(captacoes.fbclid, excluded.fbclid),
         pagina = coalesce(captacoes.pagina, excluded.pagina),
         ip = coalesce(captacoes.ip, excluded.ip),
         agente_usuario = coalesce(captacoes.agente_usuario, excluded.agente_usuario),
         identidade_em = coalesce(captacoes.identidade_em, excluded.identidade_em);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.registrar_identidade_captacao(text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.registrar_identidade_captacao(text, text, text, text, text, text, text, text)
  to service_role;

/*
 * O webhook do Tally, já mapeado campo a campo pelo fluxo.
 *
 * `API-R13` — webhook de entrada é idempotente. O Tally reenvia, e o reenvio
 * que criasse um segundo lead violaria `INV-10` na origem: dois produtos do
 * mesmo cliente, cada um vendível para um advogado diferente.
 *
 * `CMP-R06` — o mesmo contato preenchendo o formulário de novo enquanto ainda
 * tem lead ativo é o mesmo cliente, não um segundo produto. A captação nova se
 * liga ao lead que já existe; quem voltou meses depois, com o lead anterior já
 * encerrado, entra como lead novo — é justamente o cliente que não pode ser
 * barrado.
 */
create function public.registrar_captacao(
  p_respondente_id text,
  p_nome text,
  p_telefone text,
  p_tese public.tese,
  p_uf text,
  p_cidade text,
  p_formulario_id text default null,
  p_elegibilidade jsonb default '{}'::jsonb,
  p_resumo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_captacao public.captacoes;
  v_lead_id uuid;
  v_telefone text := trim(coalesce(p_telefone, ''));
begin
  if coalesce(trim(p_respondente_id), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Captação sem respondente não casa com nada.');
  end if;
  if v_telefone = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Sem telefone não há lead: é o produto.');
  end if;
  if coalesce(trim(p_nome), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o nome do cliente.');
  end if;

  /*
   * O Tally entrega o mesmo webhook mais de uma vez, e duas entregas
   * simultâneas do mesmo respondente não têm linha para travar — a captação
   * ainda não existe. Sem esta trava as duas passariam pela verificação de
   * idempotência ao mesmo tempo e cada uma criaria um lead; o segundo seria
   * recusado pelo gatilho de contato duplicado, mas como exceção, no meio de
   * uma transação de negócio.
   */
  perform pg_advisory_xact_lock(hashtext('captacao:' || trim(p_respondente_id)));

  select * into v_captacao
    from public.captacoes
   where respondente_id = trim(p_respondente_id)
     for update;

  if found and v_captacao.lead_id is not null then
    return jsonb_build_object('ok', true, 'lead_id', v_captacao.lead_id, 'repetido', true);
  end if;

  -- INV-10 — o mesmo contato, ainda ativo, é o mesmo lead.
  select l.id into v_lead_id
    from public.leads_contato c
    join public.leads l on l.id = c.lead_id
   where public.telefone_meta(c.telefone) = public.telefone_meta(v_telefone)
     and l.status not in ('desqualificado', 'nao_atendeu', 'no_show', 'expirado')
   order by l.criado_em desc
   limit 1;

  if v_lead_id is null then
    insert into public.leads (nome, tese, uf, cidade, status, origem, resumo_qualificacao, elegibilidade)
    values (
      trim(p_nome), p_tese, upper(trim(p_uf)), trim(p_cidade),
      'novo', 'meta_ads', coalesce(p_resumo, ''), coalesce(p_elegibilidade, '{}'::jsonb)
    )
    returning id into v_lead_id;

    insert into public.leads_contato (lead_id, telefone) values (v_lead_id, v_telefone);
  end if;

  insert into public.captacoes (respondente_id, formulario_id, lead_id)
  values (trim(p_respondente_id), p_formulario_id, v_lead_id)
  on conflict (respondente_id) do update
     set lead_id = excluded.lead_id,
         formulario_id = coalesce(captacoes.formulario_id, excluded.formulario_id);

  -- `CMP-R01` — o mesmo `event_id` que o pixel do navegador já usou.
  perform public.enfileirar_evento_meta(v_lead_id, 'Lead', now(), null);

  return jsonb_build_object('ok', true, 'lead_id', v_lead_id, 'repetido', false);
end;
$$;

revoke execute on function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.registrar_captacao(text, text, text, public.tese, text, text, text, jsonb, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Saída: o evento pronto para a Conversions API
-- ---------------------------------------------------------------------------

/*
 * `CMP-R04` — o que passou de sete dias não é reenviado.
 *
 * Roda antes de ler a fila, e não como efeito colateral da leitura: evento que
 * a Meta nunca mais vai aceitar precisa ficar marcado como abandonado, com o
 * motivo, em vez de simplesmente sumir da consulta. Fila que esvazia sozinha é
 * a mesma classe de silêncio que `API-R10` proíbe.
 */
create function public.abandonar_eventos_meta_vencidos()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int;
begin
  update public.eventos_meta
     set abandonado_em = now(),
         abandono_motivo = 'Fora da janela de sete dias da Conversions API.'
   where enviado_em is null
     and abandonado_em is null
     and ocorrido_em < now() - interval '7 days';

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.abandonar_eventos_meta_vencidos() from public, anon, authenticated;
grant execute on function public.abandonar_eventos_meta_vencidos() to service_role;

/*
 * Devolve o evento montado, pronto para virar o item de `data[]` da chamada.
 *
 * Quem envia não decide nada: não normaliza telefone, não escolhe
 * `action_source`, não sabe o que vai hasheado. Isso é o que permite o mesmo
 * fluxo do n8n e o `npm run meta:eventos` fazerem exatamente a mesma coisa —
 * e o que mantém a regra onde se procura por ela.
 *
 * `action_source` separa o que aconteceu no site do que aconteceu depois:
 * `website` no envio do formulário (com a página de origem), `system_generated`
 * nas etapas que o sistema registrou sozinho. Declarar tudo como `website`
 * inflaria a atribuição de página e a Meta reclama de evento sem URL.
 */
create function public.eventos_meta_pendentes(p_limite int default 50)
returns table (id uuid, evento text, lead_id uuid, payload jsonb)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.id,
    e.evento::text,
    e.lead_id,
    jsonb_strip_nulls(jsonb_build_object(
      'event_name', e.evento::text,
      'event_time', floor(extract(epoch from e.ocorrido_em))::bigint,
      'event_id', e.event_id,
      'action_source', case when e.evento = 'Lead' then 'website'::text else 'system_generated'::text end,
      'event_source_url', case when e.evento = 'Lead' then c.pagina end,
      'user_data', jsonb_strip_nulls(jsonb_build_object(
        'ph', public.hash_meta_lista(public.telefone_meta(ct.telefone)),
        'fn', public.hash_meta_lista(split_part(l.nome, ' ', 1)),
        'ct', public.hash_meta_lista(public.cidade_meta(l.cidade)),
        'st', public.hash_meta_lista(public.cidade_meta(l.uf)),
        'country', public.hash_meta_lista('br'),
        'fbp', c.fbp,
        'fbc', c.fbc,
        'client_ip_address', host(c.ip),
        'client_user_agent', c.agente_usuario
      )),
      'custom_data', jsonb_strip_nulls(jsonb_build_object(
        'value', e.valor,
        'currency', case when e.valor is not null then 'BRL'::text end,
        'content_category', l.tese::text
      ))
    )) as payload
  from public.eventos_meta e
  join public.leads l on l.id = e.lead_id
  left join public.leads_contato ct on ct.lead_id = e.lead_id
  left join lateral (
    select * from public.captacoes cap
     where cap.lead_id = e.lead_id
     order by cap.identidade_em desc nulls last, cap.criado_em desc
     limit 1
  ) c on true
  where e.enviado_em is null
    and e.abandonado_em is null
    and e.ocorrido_em >= now() - interval '7 days'
  order by e.ocorrido_em
  limit greatest(coalesce(p_limite, 50), 1);
$$;

revoke execute on function public.eventos_meta_pendentes(int) from public, anon, authenticated;
grant execute on function public.eventos_meta_pendentes(int) to service_role;

/*
 * O carimbo do envio. Erro não some: fica na linha, com a contagem de
 * tentativas, para que a tela de Integrações possa mostrar que a etapa falhou
 * (`API-R10`) e para que `API-R12` — reconciliação — tenha o que reconciliar.
 */
create function public.marcar_evento_meta(p_id uuid, p_erro text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_erro is null then
    update public.eventos_meta
       set enviado_em = now(), ultimo_erro = null, tentativas = tentativas + 1
     where id = p_id;
  else
    update public.eventos_meta
       set ultimo_erro = left(p_erro, 500), tentativas = tentativas + 1
     where id = p_id;
  end if;
end;
$$;

revoke execute on function public.marcar_evento_meta(uuid, text) from public, anon, authenticated;
grant execute on function public.marcar_evento_meta(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Política de acesso
-- ---------------------------------------------------------------------------

/*
 * INV-05 do lado do banco, de novo: as políticas nomeiam quem entra, e o papel
 * `advogado` não está em nenhuma. De onde veio o clique que produziu um lead é
 * informação de operação da Focus, não do comprador — e `ip` e `agente_usuario`
 * são dado pessoal de quem preencheu o formulário.
 *
 * Não há política de escrita para ninguém: quem grava é função com privilégio
 * elevado, chamada de fora do navegador (`API-R01`).
 */
alter table public.captacoes enable row level security;
alter table public.eventos_meta enable row level security;

create policy "o time interno lê as captações"
  on public.captacoes for select to authenticated
  using (public.eh_time_interno());

create policy "o time interno lê a fila de eventos"
  on public.eventos_meta for select to authenticated
  using (public.eh_time_interno());
