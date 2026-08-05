-- O ajuste manual de crédito passa a gravar no banco.
--
-- `CreditosContext.registrar` era a última escrita em memória do módulo de
-- créditos — compra, consumo e devolução já lançam dentro de `comprar_lead` e
-- `devolver_lead`. A política de INSERT em `movimentos_creditos` para ajuste
-- (`0001_fundacao.sql`) já existia e nunca tinha sido usada por ninguém: ela
-- cobre quem pode gravar, não se o motivo foi preenchido nem se o saldo fica
-- negativo. Por isso função, e não INSERT direto pelo cliente — as mesmas
-- regras de `motivoParaNaoAjustar` (`src/lib/creditos.ts`) precisam valer
-- mesmo que a tela seja contornada.

/*
 * `CRE-R04` — saldo nunca fica negativo. `CRE-R06` — ajuste exige motivo e não
 * se disfarça de pagamento: por isso `tipo` é sempre `'ajuste'`, nunca
 * parâmetro — uma chamada não decide lançar como se fosse `'compra'`.
 */
create function public.ajustar_creditos_advogado(
  p_advogado_id uuid,
  p_creditos int,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_saldo int;
begin
  if not (
    public.papel_atual() in ('adm', 'financeiro')
    and exists (
      select 1 from public.perfis
       where id = auth.uid() and 'credito:conciliar_pagamento' = any (permissoes)
    )
  ) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Ajuste de crédito exige a permissão "Conciliar pagamento de crédito".'
    );
  end if;

  if coalesce(p_creditos, 0) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Informe quantos créditos entram (positivo) ou saem (negativo).');
  end if;

  if length(trim(coalesce(p_motivo, ''))) < 10 then
    return jsonb_build_object('ok', false, 'motivo', 'Escreva o motivo do ajuste — é ele que explica o saldo depois.');
  end if;

  select saldo_creditos into v_saldo
    from public.advogados_com_saldo
   where id = p_advogado_id;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Advogado não encontrado.');
  end if;

  if v_saldo + p_creditos < 0 then
    return jsonb_build_object('ok', false, 'motivo', format('Saldo insuficiente: ele tem %s créditos.', v_saldo));
  end if;

  -- Valor zero de propósito: ajuste não é dinheiro entrando. Contar como
  -- receita aqui somaria duas vezes o que já entrou na compra do pacote.
  insert into public.movimentos_creditos (advogado_id, tipo, creditos, valor, descricao)
  values (p_advogado_id, 'ajuste', p_creditos, 0, trim(p_motivo));

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.ajustar_creditos_advogado(uuid, int, text)
  from public, anon, authenticated;
grant execute on function public.ajustar_creditos_advogado(uuid, int, text)
  to authenticated;
