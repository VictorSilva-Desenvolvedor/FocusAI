import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { NEGOCIACOES_SEED } from '@/src/lib/negociacoesSeed';
import { parseVerba, type NegociacaoFormData } from '@/src/lib/negociacoes';
import type { ConselhoRegulador, Negociacao, NegociacaoStatus, PrioridadeLead } from '@/types';

const CHAVE = 'crm.negociacoes.v1';

interface NegociacoesValue {
  negociacoes: Negociacao[];
  criar: (dados: NegociacaoFormData, autorId: string) => Negociacao;
  mover: (id: string, status: NegociacaoStatus, motivoPerda?: string) => void;
  definirPrioridade: (id: string, p: PrioridadeLead | null) => void;
  restaurarSeed: () => void;
}

const NegociacoesContext = createContext<NegociacoesValue | null>(null);

function carregar(): Negociacao[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return NEGOCIACOES_SEED;
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados) || dados.length === 0) return NEGOCIACOES_SEED;
    return dados as Negociacao[];
  } catch {
    return NEGOCIACOES_SEED;
  }
}

function persistir(lista: Negociacao[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Modo privativo ou cota estourada — segue em memória.
  }
}

export function NegociacoesProvider({ children }: { children: ReactNode }) {
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>(carregar);

  const aplicar = useCallback((proximo: (atual: Negociacao[]) => Negociacao[]) => {
    setNegociacoes((atual) => {
      const novo = proximo(atual);
      persistir(novo);
      return novo;
    });
  }, []);

  const criar = useCallback(
    (dados: NegociacaoFormData, autorId: string): Negociacao => {
      const agora = new Date().toISOString();
      const nova: Negociacao = {
        id: `neg-${crypto.randomUUID().slice(0, 8)}`,
        cliente: dados.cliente.trim(),
        whatsapp: dados.whatsapp.trim(),
        conselho: (dados.conselho || null) as ConselhoRegulador | null,
        nicho: dados.nicho,
        verbaMensal: parseVerba(dados.verbaMensal),
        status: 'em_andamento',
        prioridadeManual: null,
        origem: dados.origem,
        responsavelId: dados.responsavelId,
        criadoPor: autorId,
        criadaEm: agora,
        ultimaAtividade: agora,
        motivoPerda: null,
      };
      aplicar((atual) => [nova, ...atual]);
      return nova;
    },
    [aplicar],
  );

  const mover = useCallback(
    (id: string, status: NegociacaoStatus, motivoPerda?: string) => {
      // CRM-R04 — mudança de etapa conta como atividade e tira do congelamento.
      aplicar((atual) =>
        atual.map((n) =>
          n.id === id
            ? {
                ...n,
                status,
                ultimaAtividade: new Date().toISOString(),
                motivoPerda: status === 'perdido' ? (motivoPerda ?? n.motivoPerda) : null,
              }
            : n,
        ),
      );
    },
    [aplicar],
  );

  const definirPrioridade = useCallback(
    (id: string, p: PrioridadeLead | null) => {
      aplicar((atual) => atual.map((n) => (n.id === id ? { ...n, prioridadeManual: p } : n)));
    },
    [aplicar],
  );

  const restaurarSeed = useCallback(() => aplicar(() => NEGOCIACOES_SEED), [aplicar]);

  const value = useMemo<NegociacoesValue>(
    () => ({ negociacoes, criar, mover, definirPrioridade, restaurarSeed }),
    [negociacoes, criar, mover, definirPrioridade, restaurarSeed],
  );

  return <NegociacoesContext value={value}>{children}</NegociacoesContext>;
}

export function useNegociacoes(): NegociacoesValue {
  const ctx = use(NegociacoesContext);
  if (!ctx) throw new Error('useNegociacoes precisa estar dentro de <NegociacoesProvider>');
  return ctx;
}
