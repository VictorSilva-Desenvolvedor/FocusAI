import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import type { CampanhaFormData } from '@/src/lib/campanhas';
import { atualizarCampanha, criarCampanha, listarCampanhas, type Resultado } from '@/src/servicos/campanhas';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { Campanha } from '@/types';

interface CampanhasValue {
  campanhas: Campanha[];
  carregando: boolean;
  erro: string | null;
  criar: (dados: CampanhaFormData) => Promise<Resultado>;
  atualizar: (id: string, dados: CampanhaFormData) => Promise<Resultado>;
  recarregar: () => Promise<Campanha[]>;
}

const CampanhasContext = createContext<CampanhasValue | null>(null);

export function CampanhasProvider({ children }: { children: ReactNode }) {
  const { dados: campanhas, carregando, erro, recarregar } = useDadosDaSessao(
    listarCampanhas,
    'campanhas',
  );

  const criar = useCallback(
    async (dados: CampanhaFormData): Promise<Resultado> => {
      const r = await criarCampanha(dados);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const atualizar = useCallback(
    async (id: string, dados: CampanhaFormData): Promise<Resultado> => {
      const r = await atualizarCampanha(id, dados);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const value = useMemo<CampanhasValue>(
    () => ({ campanhas, carregando, erro, criar, atualizar, recarregar }),
    [campanhas, carregando, erro, criar, atualizar, recarregar],
  );

  return <CampanhasContext value={value}>{children}</CampanhasContext>;
}

export function useCampanhas(): CampanhasValue {
  const ctx = use(CampanhasContext);
  if (!ctx) throw new Error('useCampanhas precisa estar dentro de <CampanhasProvider>');
  return ctx;
}
