import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { MOVIMENTOS_SEED } from '@/src/lib/creditosSeed';
import type { MovimentoCredito, TipoMovimento } from '@/types';

const CHAVE = 'focus.creditos.v1';

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
  registrar: (dados: NovoMovimento) => MovimentoCredito;
  doAdvogado: (advogadoId: string) => MovimentoCredito[];
  restaurarSeed: () => void;
}

const CreditosContext = createContext<CreditosValue | null>(null);

function carregar(): MovimentoCredito[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return MOVIMENTOS_SEED;
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return MOVIMENTOS_SEED;
    return dados as MovimentoCredito[];
  } catch {
    return MOVIMENTOS_SEED;
  }
}

function persistir(lista: MovimentoCredito[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Modo privativo ou cota estourada — segue em memória.
  }
}

export function CreditosProvider({ children }: { children: ReactNode }) {
  const [movimentos, setMovimentos] = useState<MovimentoCredito[]>(carregar);

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
    setMovimentos((atual) => {
      const novoExtrato = [novo, ...atual];
      persistir(novoExtrato);
      return novoExtrato;
    });
    return novo;
  }, []);

  const doAdvogado = useCallback(
    (advogadoId: string) => movimentos.filter((m) => m.advogadoId === advogadoId),
    [movimentos],
  );

  const restaurarSeed = useCallback(() => {
    setMovimentos(MOVIMENTOS_SEED);
    persistir(MOVIMENTOS_SEED);
  }, []);

  const value = useMemo<CreditosValue>(
    () => ({ movimentos, registrar, doAdvogado, restaurarSeed }),
    [movimentos, registrar, doAdvogado, restaurarSeed],
  );

  return <CreditosContext value={value}>{children}</CreditosContext>;
}

export function useCreditos(): CreditosValue {
  const ctx = use(CreditosContext);
  if (!ctx) throw new Error('useCreditos precisa estar dentro de <CreditosProvider>');
  return ctx;
}
