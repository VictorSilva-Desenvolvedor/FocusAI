import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { cidadesDoTexto, type AdvogadoFormData } from '@/src/lib/advogados';
import { listarAdvogados } from '@/src/servicos/advogados';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type {
  Advogado,
  AdvogadoStatus,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
} from '@/types';

/*
 * MIGRAÇÃO PARCIAL — leitura no banco, escrita ainda em memória.
 *
 * Veio junto com `LeadsContext` por necessidade, não por conveniência: o lead
 * aponta para o comprador por `uuid`, e a seed local usa slug (`adv-a1b2`). Com
 * um lado no banco e o outro no navegador, o elo quebra em silêncio — a carteira
 * do advogado abre vazia e nenhum erro aparece.
 *
 * A leitura sai de `advogados_com_saldo`, nunca da tabela crua: é a view que
 * soma o extrato (`INV-15`). Consultar `advogados` direto devolveria o cadastro
 * sem saldo, e o sintoma seria zero crédito para quem tem cento e quarenta.
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
  criar: (dados: AdvogadoFormData, autorId: string) => Advogado;
  mover: (id: string, status: AdvogadoStatus, motivoPerda?: string) => void;
  definirPrioridade: (id: string, p: PrioridadeAdvogado | null) => void;
  /** INV-12 — carimba a conferência da inscrição. É pré-requisito do acesso. */
  conferirOab: (id: string) => void;
  /**
   * ADV-R09 — amarra a ficha à conta criada na liberação de acesso. Sem este
   * elo, o advogado existe no funil e não existe no aplicativo: o painel dele
   * abre sem carteira e ninguém descobre por que.
   */
  vincularUsuario: (id: string, usuarioId: string) => void;
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
    (dados: AdvogadoFormData, autorId: string): Advogado => {
      const agora = new Date().toISOString();
      const novo: Advogado = {
        id: `adv-${crypto.randomUUID().slice(0, 8)}`,
        nome: dados.nome.trim(),
        oab: dados.oab.trim().toUpperCase(),
        // INV-12 — nasce sempre por conferir. Conferência é ato de alguém do
        // time, nunca consequência de o formulário ter sido preenchido.
        oabConferidaEm: null,
        email: dados.email.trim().toLowerCase(),
        whatsapp: dados.whatsapp.trim(),
        uf: dados.uf,
        teses: [...dados.teses],
        // LED-R06 — lista vazia significa o estado inteiro, não "nenhuma".
        cidades: cidadesDoTexto(dados.cidades),
        porte: dados.porte as PorteEscritorio,
        status: 'novo',
        modeloPagamento: (dados.modeloPagamento || null) as ModeloPagamento | null,
        potencialMensal: Number(dados.potencialMensal),
        saldoCreditos: 0,
        usuarioId: null,
        prioridadeManual: null,
        responsavelId: dados.responsavelId,
        criadoPor: autorId,
        criadoEm: agora,
        ultimaAtividade: agora,
        motivoPerda: null,
      };
      aplicar((atual) => [novo, ...atual]);
      return novo;
    },
    [aplicar],
  );

  const mover = useCallback(
    (id: string, status: AdvogadoStatus, motivoPerda?: string) => {
      // ADV-R06 — mudança de etapa conta como atividade e tira do congelamento.
      aplicar((atual) =>
        atual.map((a) =>
          a.id === id
            ? {
                ...a,
                status,
                ultimaAtividade: new Date().toISOString(),
                motivoPerda:
                  status === 'perdido' || status === 'recusado'
                    ? (motivoPerda ?? a.motivoPerda)
                    : null,
              }
            : a,
        ),
      );
    },
    [aplicar],
  );

  const definirPrioridade = useCallback(
    (id: string, p: PrioridadeAdvogado | null) => {
      aplicar((atual) => atual.map((a) => (a.id === id ? { ...a, prioridadeManual: p } : a)));
    },
    [aplicar],
  );

  const conferirOab = useCallback(
    (id: string) => {
      const agora = new Date().toISOString();
      aplicar((atual) =>
        atual.map((a) =>
          // INV-13 — a data da conferência não é reescrita. Ela responde
          // quando o time atestou que aquele comprador era mesmo advogado.
          a.id === id && !a.oabConferidaEm
            ? { ...a, oabConferidaEm: agora, ultimaAtividade: agora }
            : a,
        ),
      );
    },
    [aplicar],
  );

  const vincularUsuario = useCallback(
    (id: string, usuarioId: string) => {
      const agora = new Date().toISOString();
      // O vínculo não é reescrito: a conta que passou a enxergar a carteira é a
      // que responde por ela depois. Trocar apontamento em silêncio deixaria
      // dois acessos com histórico pela metade.
      aplicar((atual) =>
        atual.map((a) =>
          a.id === id && !a.usuarioId ? { ...a, usuarioId, ultimaAtividade: agora } : a,
        ),
      );
    },
    [aplicar],
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
