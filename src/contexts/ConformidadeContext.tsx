import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { emitirParecer, enviarCriativo, listarPareceres, type Resultado } from '@/src/servicos/conformidade';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { DecisaoConformidade, Parecer, PlataformaAnuncio, TeseId } from '@/types';

interface ConformidadeValue {
  pareceres: Parecer[];
  carregando: boolean;
  erro: string | null;
  /** Quem produz o criativo manda para a fila. */
  enviar: (criativo: string, tese: TeseId, plataforma: PlataformaAnuncio) => Promise<Resultado>;
  /** `CNF-R21` — a validação do gate mora na função do banco, não aqui. */
  emitir: (
    parecerId: string,
    decisao: DecisaoConformidade,
    observacao: string | null,
  ) => Promise<Resultado>;
  recarregar: () => Promise<Parecer[]>;
}

const ConformidadeContext = createContext<ConformidadeValue | null>(null);

export function ConformidadeProvider({ children }: { children: ReactNode }) {
  const { dados: pareceres, carregando, erro, recarregar } = useDadosDaSessao(
    listarPareceres,
    'pareceres',
  );

  const enviar = useCallback(
    async (criativo: string, tese: TeseId, plataforma: PlataformaAnuncio): Promise<Resultado> => {
      const r = await enviarCriativo(criativo, tese, plataforma);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const emitir = useCallback(
    async (
      parecerId: string,
      decisao: DecisaoConformidade,
      observacao: string | null,
    ): Promise<Resultado> => {
      const r = await emitirParecer(parecerId, decisao, observacao);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const value = useMemo<ConformidadeValue>(
    () => ({ pareceres, carregando, erro, enviar, emitir, recarregar }),
    [pareceres, carregando, erro, enviar, emitir, recarregar],
  );

  return <ConformidadeContext value={value}>{children}</ConformidadeContext>;
}

export function useConformidade(): ConformidadeValue {
  const ctx = use(ConformidadeContext);
  if (!ctx) throw new Error('useConformidade precisa estar dentro de <ConformidadeProvider>');
  return ctx;
}
