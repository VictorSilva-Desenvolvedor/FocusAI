import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { ajustarCreditos, listarMovimentos, type Resultado } from '@/src/servicos/creditos';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { MovimentoCredito } from '@/types';

/*
 * O extrato aponta para lead e advogado por id: movimento semeado sobre um dos
 * dois em modo maquete mostraria consumo que nunca houve, e o saldo da tela
 * divergiria do saldo do banco. Por isso leu do banco desde que `LeadsContext`
 * e `AdvogadosContext` leram.
 *
 * Compra, consumo e devolução são lançados dentro de `comprar_lead` e
 * `devolver_lead` (`INV-14`) — não há, nem deveria haver, inserção direta para
 * esses três. `ajustar` é a exceção deliberada: a porta manual do `CRE-R06`,
 * validada em `ajustar_creditos_advogado`.
 */

interface CreditosValue {
  movimentos: MovimentoCredito[];
  /** Verdadeiro enquanto a primeira carga não voltou do banco. */
  carregando: boolean;
  /** Mensagem da falha de carregamento, ou nulo. */
  erro: string | null;
  /** `CRE-R06` — ajuste manual. A validação mora na função, não aqui. */
  ajustar: (advogadoId: string, creditos: number, motivo: string) => Promise<Resultado>;
  doAdvogado: (advogadoId: string) => MovimentoCredito[];
  /** Busca de novo no banco e devolve o extrato. */
  recarregar: () => Promise<MovimentoCredito[]>;
}

const CreditosContext = createContext<CreditosValue | null>(null);

export function CreditosProvider({ children }: { children: ReactNode }) {
  const { dados: movimentos, carregando, erro, recarregar } = useDadosDaSessao(
    listarMovimentos,
    'creditos',
  );

  const ajustar = useCallback(
    async (advogadoId: string, creditos: number, motivo: string): Promise<Resultado> => {
      const r = await ajustarCreditos(advogadoId, creditos, motivo);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const doAdvogado = useCallback(
    (advogadoId: string) => movimentos.filter((m) => m.advogadoId === advogadoId),
    [movimentos],
  );

  const value = useMemo<CreditosValue>(
    () => ({ movimentos, carregando, erro, ajustar, doAdvogado, recarregar }),
    [movimentos, carregando, erro, ajustar, doAdvogado, recarregar],
  );

  return <CreditosContext value={value}>{children}</CreditosContext>;
}

export function useCreditos(): CreditosValue {
  const ctx = use(CreditosContext);
  if (!ctx) throw new Error('useCreditos precisa estar dentro de <CreditosProvider>');
  return ctx;
}
