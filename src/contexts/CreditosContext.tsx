import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { listarMovimentos } from '@/src/servicos/creditos';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { MovimentoCredito, TipoMovimento } from '@/types';

/*
 * MIGRAÇÃO PARCIAL — leitura no banco, escrita ainda em memória.
 *
 * Veio junto com `LeadsContext` e `AdvogadosContext` porque o extrato aponta
 * para os dois por id: movimento semeado sobre advogado real mostraria consumo
 * que nunca houve, e o saldo da tela divergiria do saldo do banco.
 *
 * `registrar` continua local e não ganha substituta: no banco **não existe
 * inserção direta no extrato**, de propósito (`INV-14`). Crédito entra pelo
 * webhook do provedor de pagamento; consumo e devolução são lançados dentro de
 * `comprar_lead` e `devolver_lead`. A única escrita permitida a um humano é o
 * ajuste manual, que exige a permissão `credito:conciliar_pagamento` e motivo.
 */

interface NovoMovimento {
  advogadoId: string;
  tipo: TipoMovimento;
  creditos: number;
  valor?: number;
  leadId?: string | null;
  descricao: string;
}

interface CreditosValue {
  movimentos: MovimentoCredito[];
  /** Verdadeiro enquanto a primeira carga não voltou do banco. */
  carregando: boolean;
  /** Mensagem da falha de carregamento, ou nulo. */
  erro: string | null;
  registrar: (dados: NovoMovimento) => MovimentoCredito;
  doAdvogado: (advogadoId: string) => MovimentoCredito[];
  /** Busca de novo no banco e devolve o extrato. */
  recarregar: () => Promise<MovimentoCredito[]>;
}

const CreditosContext = createContext<CreditosValue | null>(null);

export function CreditosProvider({ children }: { children: ReactNode }) {
  const {
    dados: movimentos,
    carregando,
    erro,
    recarregar,
    definir: setMovimentos,
  } = useDadosDaSessao(listarMovimentos, 'creditos');

  const registrar = useCallback((dados: NovoMovimento): MovimentoCredito => {
    const novo: MovimentoCredito = {
      id: `mov-${crypto.randomUUID().slice(0, 8)}`,
      advogadoId: dados.advogadoId,
      tipo: dados.tipo,
      creditos: dados.creditos,
      valor: dados.valor ?? 0,
      leadId: dados.leadId ?? null,
      descricao: dados.descricao,
      // INV-13 — o instante do movimento é carimbo, não campo editável.
      em: new Date().toISOString(),
    };
    setMovimentos((atual) => [novo, ...atual]);
    return novo;
  }, []);

  const doAdvogado = useCallback(
    (advogadoId: string) => movimentos.filter((m) => m.advogadoId === advogadoId),
    [movimentos],
  );

  const value = useMemo<CreditosValue>(
    () => ({ movimentos, carregando, erro, registrar, doAdvogado, recarregar }),
    [movimentos, carregando, erro, registrar, doAdvogado, recarregar],
  );

  return <CreditosContext value={value}>{children}</CreditosContext>;
}

export function useCreditos(): CreditosValue {
  const ctx = use(CreditosContext);
  if (!ctx) throw new Error('useCreditos precisa estar dentro de <CreditosProvider>');
  return ctx;
}
