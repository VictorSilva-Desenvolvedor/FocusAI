import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ADVOGADOS_SEED } from '@/src/lib/advogadosSeed';
import { cidadesDoTexto, type AdvogadoFormData } from '@/src/lib/advogados';
import type {
  Advogado,
  AdvogadoStatus,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
} from '@/types';

const CHAVE = 'focus.advogados.v1';

interface AdvogadosValue {
  advogados: Advogado[];
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
  restaurarSeed: () => void;
}

const AdvogadosContext = createContext<AdvogadosValue | null>(null);

function carregar(): Advogado[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return ADVOGADOS_SEED;
    const dados = JSON.parse(bruto);
    // Um payload corrompido não pode derrubar o app inteiro na inicialização.
    if (!Array.isArray(dados) || dados.length === 0) return ADVOGADOS_SEED;
    return dados as Advogado[];
  } catch {
    return ADVOGADOS_SEED;
  }
}

function persistir(lista: Advogado[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Modo privativo ou cota estourada — segue em memória.
  }
}

export function AdvogadosProvider({ children }: { children: ReactNode }) {
  const [advogados, setAdvogados] = useState<Advogado[]>(carregar);

  const aplicar = useCallback((proximo: (atual: Advogado[]) => Advogado[]) => {
    setAdvogados((atual) => {
      const novo = proximo(atual);
      persistir(novo);
      return novo;
    });
  }, []);

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

  const restaurarSeed = useCallback(() => aplicar(() => ADVOGADOS_SEED), [aplicar]);

  const value = useMemo<AdvogadosValue>(
    () => ({
      advogados,
      criar,
      mover,
      definirPrioridade,
      conferirOab,
      vincularUsuario,
      debitarCreditos,
      creditar,
      restaurarSeed,
    }),
    [
      advogados,
      criar,
      mover,
      definirPrioridade,
      conferirOab,
      vincularUsuario,
      debitarCreditos,
      creditar,
      restaurarSeed,
    ],
  );

  return <AdvogadosContext value={value}>{children}</AdvogadosContext>;
}

export function useAdvogados(): AdvogadosValue {
  const ctx = use(AdvogadosContext);
  if (!ctx) throw new Error('useAdvogados precisa estar dentro de <AdvogadosProvider>');
  return ctx;
}
