-- O funil de advogados passa a gravar no banco.
--
-- `AdvogadosContext` lê `advogados_com_saldo` desde a migração para o banco,
-- mas `criar`, `mover`, `conferirOab` e `vincularUsuario` continuavam em
-- memória — o próprio arquivo se documentava como "MIGRAÇÃO PARCIAL". O
-- sintoma: CS movia uma ficha, conferia a OAB, cadastrava um advogado, e um
-- F5 desfazia tudo, porque não havia para onde a escrita ter ido.
--
-- `API-R02` — a validação que hoje mora só em `motivoParaRecusarMovimento`
-- (`src/lib/advogados.ts`) é ergonomia de tela, não controle de acesso: nada
-- impede uma chamada direta à tabela pulando a regra. Este arquivo porta essa
-- validação para dentro da função, que é quem de fato decide.
--
-- O que fica de fora, de propósito: `liberar_acesso_advogado` — comentada em
-- `0001_fundacao.sql` desde a fundação — criaria a conta de acesso (login) no
-- Supabase Auth quando o status vira `acesso_liberado`. Isso pede a Admin API
-- (privilégio de servidor, não alcança daqui) e depende do serviço de convite
-- por e-mail, que ainda não existe (ver "Convite não sai de verdade" no
-- `CLAUDE.md`). `vincular_usuario_advogado`, abaixo, só grava o elo com uma
-- conta que **já existe** — a criação da conta em si continua sendo o fluxo
-- atual de `UsuariosContext.criarParaAdvogado`, inalterado.

-- ---------------------------------------------------------------------------
-- ADV-R09-lite — a inscrição da OAB
-- ---------------------------------------------------------------------------

/*
 * INV-12 — a conferência não é reescrita. Ela responde quando o time atestou
 * que aquele comprador era mesmo advogado; sobrescrever apagaria essa resposta
 * em silêncio, com a linha continuando a parecer íntegra.
 */
create function public.conferir_oab_advogado(p_advogado_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado public.advogados;
begin
  if not public.eh_time_interno() then
    return jsonb_build_object('ok', false, 'motivo', 'Conferir inscrição é ação do time interno.');
  end if;

  select * into v_advogado from public.advogados where id = p_advogado_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Advogado não encontrado.');
  end if;

  if v_advogado.oab_conferida_em is not null then
    return jsonb_build_object('ok', true, 'ja_conferida', true);
  end if;

  update public.advogados
     set oab_conferida_em = now(),
         oab_conferida_por = auth.uid(),
         ultima_atividade = now()
   where id = p_advogado_id;

  return jsonb_build_object('ok', true, 'ja_conferida', false);
end;
$$;

revoke execute on function public.conferir_oab_advogado(uuid) from public, anon, authenticated;
grant execute on function public.conferir_oab_advogado(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- ADV-R01 a ADV-R05 — as transições que o funil recusa
-- ---------------------------------------------------------------------------

/*
 * O mesmo texto de `motivoParaRecusarMovimento`, porto para onde a decisão
 * não pode ser contornada. Cinco travas, na mesma ordem:
 *
 *  1. `acesso_liberado` exige a permissão nomeada `advogado:liberar_acesso` —
 *     é ela que cria a conta que passa a ver dado de cliente final.
 *  2. Etapas depois da liberação exigem inscrição conferida (`INV-12`).
 *  3. `acesso_liberado` exige status `qualificado`: não se pula a
 *     qualificação. Cadastro livre é o modelo que a Focus recusa.
 *  4. Etapas depois da liberação exigem ao menos uma tese: sem ela o painel
 *     abre vazio e o aviso de lead novo nunca dispara.
 *  5. `ativo` exige modelo de pagamento definido — sem ele não há como cobrar
 *     o primeiro lead.
 *
 * `ADV-R05` — perdido e recusado exigem motivo escrito, conferido aqui e não
 * só no diálogo: é o registro de por que aquele advogado saiu do funil.
 */
create function public.mover_advogado(
  p_advogado_id uuid,
  p_status public.status_advogado,
  p_motivo_perda text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado public.advogados;
  v_depois_da_liberacao constant public.status_advogado[] :=
    array['acesso_liberado', 'modelo_definido', 'ativo'];
begin
  if not public.eh_time_interno() then
    return jsonb_build_object('ok', false, 'motivo', 'Mover advogado é ação do time interno.');
  end if;

  select * into v_advogado from public.advogados where id = p_advogado_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Advogado não encontrado.');
  end if;

  if v_advogado.status = p_status then
    return jsonb_build_object('ok', true, 'inalterado', true);
  end if;

  if p_status = 'acesso_liberado'
     and not exists (
       select 1 from public.perfis
        where id = auth.uid() and 'advogado:liberar_acesso' = any (permissoes)
     )
  then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Liberar acesso exige a permissão "Liberar acesso de advogado" — é ela que cria a conta que passa a ver dado de cliente final.'
    );
  end if;

  if p_status = any (v_depois_da_liberacao) and v_advogado.oab_conferida_em is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Confira a inscrição na OAB antes de liberar acesso — sem isso, quem entra passa a ver dado pessoal de cliente final (INV-12).'
    );
  end if;

  if p_status = 'acesso_liberado' and v_advogado.status <> 'qualificado' then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Acesso só é liberado depois da qualificação. Cadastro livre é justamente o que o modelo recusa.'
    );
  end if;

  if p_status = any (v_depois_da_liberacao) and coalesce(array_length(v_advogado.teses, 1), 0) = 0 then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Defina em quais teses o advogado atua — sem isso o painel abre vazio e a notificação de lead novo nunca dispara.'
    );
  end if;

  if p_status = 'ativo' and v_advogado.modelo_pagamento is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Escolha o modelo de pagamento antes de ativar: sem ele não há como cobrar o primeiro lead.'
    );
  end if;

  if p_status in ('perdido', 'recusado') and coalesce(trim(p_motivo_perda), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Marcar como perdido ou recusado exige motivo escrito (ADV-R05).');
  end if;

  update public.advogados
     set status = p_status,
         motivo_perda = case
           when p_status in ('perdido', 'recusado') then p_motivo_perda
           else null
         end,
         ultima_atividade = now()
   where id = p_advogado_id;

  return jsonb_build_object('ok', true, 'inalterado', false);
end;
$$;

revoke execute on function public.mover_advogado(uuid, public.status_advogado, text)
  from public, anon, authenticated;
grant execute on function public.mover_advogado(uuid, public.status_advogado, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- ADV-R09 — o elo com a conta de acesso
-- ---------------------------------------------------------------------------

/*
 * Só grava o elo com uma conta que já existe — quem cria a conta continua
 * sendo `UsuariosContext.criarParaAdvogado` (ver cabeçalho do arquivo). O elo
 * não é reescrito: a conta que passou a enxergar a carteira é a que responde
 * por ela depois, e trocar o apontamento em silêncio partiria o histórico.
 */
create function public.vincular_usuario_advogado(p_advogado_id uuid, p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_advogado public.advogados;
begin
  if not public.eh_time_interno() then
    return jsonb_build_object('ok', false, 'motivo', 'Vincular usuário é ação do time interno.');
  end if;

  select * into v_advogado from public.advogados where id = p_advogado_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Advogado não encontrado.');
  end if;

  if v_advogado.usuario_id is not null then
    return jsonb_build_object('ok', true, 'ja_vinculado', true);
  end if;

  update public.advogados
     set usuario_id = p_usuario_id,
         ultima_atividade = now()
   where id = p_advogado_id;

  return jsonb_build_object('ok', true, 'ja_vinculado', false);
end;
$$;

revoke execute on function public.vincular_usuario_advogado(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.vincular_usuario_advogado(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- O cadastro
-- ---------------------------------------------------------------------------

/*
 * Mesma regra de `validarAdvogado` (`src/lib/advogados.ts`): inscrição
 * repetida entre advogados **ativos no funil** é a mesma pessoa entrando duas
 * vezes — as duas fichas passariam a acumular metade do histórico cada uma.
 * Desfecho (recusado/perdido/em_pausa) não bloqueia: quem voltou depois de sair
 * é caso novo, não duplicata.
 *
 * Nasce sempre em `novo`, sem inscrição conferida (`INV-12`) e sem conta
 * vinculada — os dois só existem como consequência de ações depois.
 */
create function public.criar_advogado(
  p_nome text,
  p_oab text,
  p_email text,
  p_whatsapp text,
  p_uf text,
  p_teses public.tese[],
  p_cidades text[],
  p_porte public.porte_escritorio,
  p_potencial_mensal int,
  p_responsavel_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oab text := upper(trim(coalesce(p_oab, '')));
  v_id uuid;
begin
  if not public.eh_time_interno() then
    return jsonb_build_object('ok', false, 'motivo', 'Cadastrar advogado é ação do time interno.');
  end if;

  if coalesce(trim(p_nome), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o nome do escritório ou do profissional.');
  end if;
  if v_oab = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe a inscrição na OAB.');
  end if;

  if exists (
    select 1 from public.advogados
     where upper(oab) = v_oab
       and status not in ('recusado', 'perdido', 'em_pausa')
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'Já existe um cadastro ativo com esta inscrição.');
  end if;

  insert into public.advogados (
    nome, oab, email, whatsapp, uf, teses, cidades, porte,
    potencial_mensal, responsavel_id, criado_por, status
  ) values (
    trim(p_nome), v_oab, lower(trim(coalesce(p_email, ''))), trim(coalesce(p_whatsapp, '')),
    upper(trim(coalesce(p_uf, ''))), coalesce(p_teses, '{}'), coalesce(p_cidades, '{}'), p_porte,
    coalesce(p_potencial_mensal, 0), p_responsavel_id, auth.uid(), 'novo'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function public.criar_advogado(
  text, text, text, text, text, public.tese[], text[], public.porte_escritorio, int, uuid
) from public, anon, authenticated;
grant execute on function public.criar_advogado(
  text, text, text, text, text, public.tese[], text[], public.porte_escritorio, int, uuid
) to authenticated;
