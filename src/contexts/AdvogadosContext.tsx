import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import type { AdvogadoFormData } from '@/src/lib/advogados';
import {
  conferirOabAdvogado,
  criarAdvogado,
  listarAdvogados,
  moverAdvogado,
  vincularUsuarioAdvogado,
} from '@/src/servicos/advogados';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { Advogado, AdvogadoStatus, PrioridadeAdvogado } from '@/types';

export type ResultadoAdvogado = { ok: true } | { ok: false; motivo: string };

/*
 * Leitura e escrita no banco. A leitura sai de `advogados_com_saldo`, nunca da
 * tabela crua: é a view que soma o extrato (`INV-15`). Consultar `advogados`
 * direto devolveria o cadastro sem saldo, e o sintoma seria zero crédito para
 * quem tem cento e quarenta.
 *
 * `criar`, `mover`, `conferirOab` e `vincularUsuario` validam no banco
 * (`0012_escrita_real_de_advogados.sql`), não aqui — `API-R02`: a tela decide
 * cedo, para dar o aviso na hora, mas quem decide de verdade é a função.
 * Depois de qualquer escrita a verdade vem do banco, nunca de adivinhar o que
 * ele fez (`API-R14`): por isso cada operação recarrega a lista ao terminar.
 *
 * `debitarCreditos` e `creditar` continuam locais e **não têm substituta
 * direta**: no banco não existe "mexer no saldo", porque saldo não é coluna. O
 * que existe é lançar movimento — e isso acontece dentro de `comprar_lead` e
 * `devolver_lead`, na mesma transação da escrita no lead.
 */

interface AdvogadosValue {
  advogados: Advogado[];
  /** Verdadeiro enquanto a primeira carga não voltou do banco. */
  carregando: boolean;
  /** Mensagem da falha de carregamento, ou nulo. */
  erro: string | null;
  criar: (dados: AdvogadoFormData) => Promise<ResultadoAdvogado>;
  mover: (id: string, status: AdvogadoStatus, motivoPerda?: string) => Promise<ResultadoAdvogado>;
  definirPrioridade: (id: string, p: PrioridadeAdvogado | null) => void;
  /** INV-12 — carimba a conferência da inscrição. É pré-requisito do acesso. */
  conferirOab: (id: string) => Promise<ResultadoAdvogado>;
  /**
   * ADV-R09 — amarra a ficha à conta criada na liberação de acesso. Sem este
   * elo, o advogado existe no funil e não existe no aplicativo: o painel dele
   * abre sem carteira e ninguém descobre por que.
   */
  vincularUsuario: (id: string, usuarioId: string) => Promise<ResultadoAdvogado>;
  /** CRE-R02 — o débito de crédito e a venda do lead acontecem juntos. */
  debitarCreditos: (id: string, creditos: number) => void;
  creditar: (id: string, creditos: number) => void;
  /** Busca de novo no banco e devolve a lista. */
  recarregar: () => Promise<Advogado[]>;
}

const AdvogadosContext = createContext<AdvogadosValue | null>(null);

export function AdvogadosProvider({ children }: { children: ReactNode }) {
  const {
    dados: advogados,
    carregando,
    erro,
    recarregar,
    definir: aplicar,
  } = useDadosDaSessao(listarAdvogados, 'advogados');

  const criar = useCallback(
    async (dados: AdvogadoFormData): Promise<ResultadoAdvogado> => {
      const r = await criarAdvogado(dados);
      if (!r.ok) return r;
      await recarregar();
      return { ok: true };
    },
    [recarregar],
  );

  const mover = useCallback(
    async (id: string, status: AdvogadoStatus, motivoPerda?: string): Promise<ResultadoAdvogado> => {
      const r = await moverAdvogado(id, status, motivoPerda);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  /*
   * Sem função no banco ainda: nada chama isto hoje (não há tela para o gestor
   * sobrescrever P1/P2/P3 à mão). Fica local até existir o primeiro chamador —
   * daí sim vale desenhar a validação junto.
   */
  const definirPrioridade = useCallback(
    (id: string, p: PrioridadeAdvogado | null) => {
      aplicar((atual) => atual.map((a) => (a.id === id ? { ...a, prioridadeManual: p } : a)));
    },
    [aplicar],
  );

  const conferirOab = useCallback(
    async (id: string): Promise<ResultadoAdvogado> => {
      const r = await conferirOabAdvogado(id);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const vincularUsuario = useCallback(
    async (id: string, usuarioId: string): Promise<ResultadoAdvogado> => {
      const r = await vincularUsuarioAdvogado(id, usuarioId);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const debitarCreditos = useCallback(
    (id: string, creditos: number) => {
      // CRE-R04 — o saldo nunca fica negativo. A checagem de saldo é de quem
      // chama; aqui o piso existe como última linha, não como validação.
      aplicar((atual) =>
        atual.map((a) =>
          a.id === id
            ? {
                ...a,
                saldoCreditos: Math.max(0, a.saldoCreditos - creditos),
                ultimaAtividade: new Date().toISOString(),
              }
            : a,
        ),
      );
    },
    [aplicar],
  );

  const creditar = useCallback(
    (id: string, creditos: number) => {
      aplicar((atual) =>
        atual.map((a) =>
          a.id === id
            ? {
                ...a,
                saldoCreditos: a.saldoCreditos + creditos,
                ultimaAtividade: new Date().toISOString(),
              }
            : a,
        ),
      );
    },
    [aplicar],
  );

  const value = useMemo<AdvogadosValue>(
    () => ({
      advogados,
      carregando,
      erro,
      criar,
      mover,
      definirPrioridade,
      conferirOab,
      vincularUsuario,
      debitarCreditos,
      creditar,
      recarregar,
    }),
    [
      advogados,
      carregando,
      erro,
      criar,
      mover,
      definirPrioridade,
      conferirOab,
      vincularUsuario,
      debitarCreditos,
      creditar,
      recarregar,
    ],
  );

  return <AdvogadosContext value={value}>{children}</AdvogadosContext>;
}

export function useAdvogados(): AdvogadosValue {
  const ctx = use(AdvogadosContext);
  if (!ctx) throw new Error('useAdvogados precisa estar dentro de <AdvogadosProvider>');
  return ctx;
}
