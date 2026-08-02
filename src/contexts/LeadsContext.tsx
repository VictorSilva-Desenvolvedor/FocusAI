import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { LEADS_SEED } from '@/src/lib/leadsSeed';
import { MINUTOS_DE_RESERVA, reservaAtiva, type LeadFormData } from '@/src/lib/leads';
import { TESE_POR_ID } from '@/src/lib/teses';
import type { Lead, LeadStatus, TeseId } from '@/types';

const CHAVE = 'focus.leads.v1';

/** O que a compra devolve. `false` significa que outra pessoa chegou antes. */
export type ResultadoCompra =
  | { ok: true; lead: Lead }
  | { ok: false; motivo: string };

interface LeadsValue {
  leads: Lead[];
  criar: (dados: LeadFormData) => Lead;
  mover: (id: string, status: LeadStatus, motivo?: string) => void;
  agendar: (id: string, reuniaoEm: string) => void;
  responderFiltro: (id: string, filtroId: string, valor: boolean) => void;
  reservar: (id: string, advogadoId: string) => boolean;
  liberarReserva: (id: string) => void;
  /**
   * CRE-R02 — carimbar o comprador e sair do catálogo é um passo só. Quem
   * chama é responsável por debitar o crédito na mesma ação; a checagem de
   * corrida mora aqui porque é aqui que o registro é escrito.
   */
  comprar: (id: string, advogadoId: string) => ResultadoCompra;
  devolver: (id: string, motivo: string) => void;
  restaurarSeed: () => void;
}

const LeadsContext = createContext<LeadsValue | null>(null);

function carregar(): Lead[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return LEADS_SEED;
    const dados = JSON.parse(bruto);
    // Um payload corrompido não pode derrubar o app inteiro na inicialização.
    if (!Array.isArray(dados) || dados.length === 0) return LEADS_SEED;
    return dados as Lead[];
  } catch {
    return LEADS_SEED;
  }
}

function persistir(lista: Lead[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Modo privativo ou cota estourada — segue em memória.
  }
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(carregar);
  /*
   * A lista viva, fora do ciclo de render.
   *
   * `comprar` e `reservar` precisam responder **na hora** se a operação valeu:
   * é dessa resposta que saem o toast, o débito do crédito e o movimento no
   * extrato. Enquanto a transformação vivia dentro do atualizador do
   * `setState`, essa resposta dependia de o React executar o atualizador na
   * mesma volta — o que ele faz por otimização, não por contrato. Bastou a
   * gaveta reservar o lead ao abrir para que a fila deixasse de estar vazia no
   * clique seguinte: a compra passava a gravar corretamente e a **relatar**
   * que o lead não existia, debitando nada e fechando a tela.
   *
   * Com a referência, a decisão e a escrita acontecem no mesmo instante e o
   * render é consequência. Quando o backend entrar, quem garante isso é a
   * função no banco, que valida e grava junto ou não grava nada (`API-R08`).
   */
  const vivos = useRef(leads);

  const aplicar = useCallback((proximo: (atual: Lead[]) => Lead[]) => {
    const novo = proximo(vivos.current);
    vivos.current = novo;
    persistir(novo);
    setLeads(novo);
  }, []);

  const criar = useCallback(
    (dados: LeadFormData): Lead => {
      const agora = new Date().toISOString();
      const tese = TESE_POR_ID[dados.tese as TeseId];
      const novo: Lead = {
        id: `lead-${crypto.randomUUID().slice(0, 8)}`,
        nome: dados.nome.trim(),
        telefone: dados.telefone.trim(),
        tese: dados.tese as TeseId,
        uf: dados.uf,
        cidade: dados.cidade.trim(),
        status: 'novo',
        origem: 'meta_ads',
        resumoQualificacao: dados.resumoQualificacao.trim(),
        elegibilidade: {},
        reuniaoEm: null,
        // CRE-R03 — o preço entra congelado. Mexer na tabela da tese depois não
        // reescreve o que já está anunciado nem o que já foi vendido.
        custoCreditos: tese?.custoCreditos ?? 0,
        precoAvulso: tese?.precoAvulso ?? 0,
        compradoPor: null,
        compradoEm: null,
        reservadoPor: null,
        reservadoAte: null,
        temGravacao: false,
        criadoEm: agora,
        ultimaAtividade: agora,
        motivoDesqualificacao: null,
        devolucao: null,
      };
      aplicar((atual) => [novo, ...atual]);
      return novo;
    },
    [aplicar],
  );

  const mover = useCallback(
    (id: string, status: LeadStatus, motivo?: string) => {
      aplicar((atual) =>
        atual.map((l) =>
          l.id === id
            ? {
                ...l,
                status,
                ultimaAtividade: new Date().toISOString(),
                motivoDesqualificacao:
                  status === 'desqualificado' ? (motivo ?? l.motivoDesqualificacao) : null,
              }
            : l,
        ),
      );
    },
    [aplicar],
  );

  const agendar = useCallback(
    (id: string, reuniaoEm: string) => {
      aplicar((atual) =>
        atual.map((l) =>
          l.id === id
            ? { ...l, reuniaoEm, status: 'agendado', ultimaAtividade: new Date().toISOString() }
            : l,
        ),
      );
    },
    [aplicar],
  );

  const responderFiltro = useCallback(
    (id: string, filtroId: string, valor: boolean) => {
      aplicar((atual) =>
        atual.map((l) =>
          l.id === id
            ? {
                ...l,
                elegibilidade: { ...l.elegibilidade, [filtroId]: valor },
                ultimaAtividade: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    [aplicar],
  );

  const reservar = useCallback(
    (id: string, advogadoId: string): boolean => {
      let conseguiu = false;
      aplicar((atual) =>
        atual.map((l) => {
          if (l.id !== id) return l;
          // LED-R04 — quem já tem a trava viva mantém; ninguém mais entra.
          if (reservaAtiva(l) && l.reservadoPor !== advogadoId) return l;
          if (l.compradoPor) return l;
          conseguiu = true;
          return {
            ...l,
            reservadoPor: advogadoId,
            reservadoAte: new Date(Date.now() + MINUTOS_DE_RESERVA * 60_000).toISOString(),
          };
        }),
      );
      return conseguiu;
    },
    [aplicar],
  );

  const liberarReserva = useCallback(
    (id: string) => {
      aplicar((atual) =>
        atual.map((l) => (l.id === id ? { ...l, reservadoPor: null, reservadoAte: null } : l)),
      );
    },
    [aplicar],
  );

  const comprar = useCallback(
    (id: string, advogadoId: string): ResultadoCompra => {
      let resultado: ResultadoCompra = { ok: false, motivo: 'Lead não encontrado.' };

      aplicar((atual) =>
        atual.map((l) => {
          if (l.id !== id) return l;

          // INV-10 — a última checagem antes de escrever. Entre abrir a tela e
          // clicar, outro advogado pode ter comprado; sem esta linha o segundo
          // clique sobrescreveria o primeiro comprador em silêncio.
          if (l.compradoPor) {
            resultado = { ok: false, motivo: 'Outro advogado comprou este lead primeiro.' };
            return l;
          }
          if (reservaAtiva(l) && l.reservadoPor !== advogadoId) {
            resultado = { ok: false, motivo: 'Outro advogado está finalizando a compra.' };
            return l;
          }

          const agora = new Date().toISOString();
          const vendido: Lead = {
            ...l,
            status: 'vendido',
            compradoPor: advogadoId,
            // INV-13 — carimbo imutável. É o que responde, perante a OAB,
            // quando e para quem aquele cliente foi direcionado.
            compradoEm: agora,
            reservadoPor: null,
            reservadoAte: null,
            ultimaAtividade: agora,
          };
          resultado = { ok: true, lead: vendido };
          return vendido;
        }),
      );

      return resultado;
    },
    [aplicar],
  );

  const devolver = useCallback(
    (id: string, motivo: string) => {
      aplicar((atual) =>
        atual.map((l) =>
          l.id === id
            ? {
                ...l,
                // CRE-R05 — o crédito volta, o lead não. O contato já foi
                // exposto àquele advogado; recolocar no catálogo criaria o
                // segundo comprador que INV-10 proíbe.
                status: 'expirado',
                devolucao: { motivo, em: new Date().toISOString() },
                ultimaAtividade: new Date().toISOString(),
              }
            : l,
        ),
      );
    },
    [aplicar],
  );

  const restaurarSeed = useCallback(() => aplicar(() => LEADS_SEED), [aplicar]);

  const value = useMemo<LeadsValue>(
    () => ({
      leads,
      criar,
      mover,
      agendar,
      responderFiltro,
      reservar,
      liberarReserva,
      comprar,
      devolver,
      restaurarSeed,
    }),
    [leads, criar, mover, agendar, responderFiltro, reservar, liberarReserva, comprar, devolver, restaurarSeed],
  );

  return <LeadsContext value={value}>{children}</LeadsContext>;
}

export function useLeads(): LeadsValue {
  const ctx = use(LeadsContext);
  if (!ctx) throw new Error('useLeads precisa estar dentro de <LeadsProvider>');
  return ctx;
}
