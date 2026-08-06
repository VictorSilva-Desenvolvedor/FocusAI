import { createContext, use, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { type LeadFormData } from '@/src/lib/leads';
import {
  avaliarLead,
  comprarLead,
  devolverLead,
  excluirLead,
  liberarReserva as liberarReservaNoBanco,
  listarLeads,
  reservarLead,
} from '@/src/servicos/leads';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import { TESE_POR_ID } from '@/src/lib/teses';
import type { Lead, LeadStatus, TeseId } from '@/types';

/*
 * MIGRAÇÃO — leitura e as operações transacionais no banco.
 *
 * A lista vem de `src/servicos/leads.ts`, com a política de acesso do Postgres
 * decidindo o que sai (`API-R02`) e o contato mascarado antes de chegar aqui
 * (`INV-11`).
 *
 * **Comprar, devolver, reservar, liberar e avaliar** passaram a chamar as
 * funções do banco. Elas gravam em conjunto e validam antes (`API-R08`): a
 * compra carimba o comprador e lança o movimento no extrato numa transação só,
 * e é ela que fecha a janela em que dois advogados compram o mesmo lead. O
 * comprador não é mais parâmetro — a função o deriva da sessão, porque passá-lo
 * do cliente faria de comprar em nome de terceiro uma chamada bem formada.
 *
 * O que **continua local**: `criar`, `mover`, `agendar` e `responderFiltro` —
 * as operações do quadro interno. Não há função no banco para elas ainda, e
 * escrita direta na tabela contornaria a validação que as outras têm. Alteração
 * feita por elas vale para a sessão e some no recarregar.
 *
 * Consequência operacional que vale saber: `npm run smoke` agora consome lead
 * de verdade. Hoje só a seed fictícia; quando a captação entregar lead real, o
 * smoke precisa apontar para outro projeto antes de rodar.
 */

/** O que a compra devolve. `false` significa que outra pessoa chegou antes. */
export type ResultadoCompra =
  | { ok: true; lead: Lead }
  | { ok: false; motivo: string };

interface LeadsValue {
  leads: Lead[];
  /** Verdadeiro enquanto a primeira carga não voltou do banco. */
  carregando: boolean;
  /** Mensagem da falha de carregamento, ou nulo. Lista vazia por erro não é lista vazia. */
  erro: string | null;
  criar: (dados: LeadFormData) => Lead;
  mover: (id: string, status: LeadStatus, motivo?: string) => void;
  /**
   * `LED-R09` — agendamento manual. `direcionadoPara` é o advogado da entrega
   * exclusiva, ou nulo para publicar no catálogo aberto (o comportamento de
   * sempre).
   */
  agendar: (id: string, reuniaoEm: string, direcionadoPara?: string | null) => void;
  responderFiltro: (id: string, filtroId: string, valor: boolean) => void;
  reservar: (id: string) => Promise<boolean>;
  liberarReserva: (id: string) => Promise<void>;
  /**
   * `CRE-R02` / `API-R08` — carimbar o comprador, debitar o crédito e lançar o
   * movimento é uma transação só, no banco. Quem chama não debita nada por
   * fora: fazê-lo duplicaria o lançamento.
   *
   * O advogado não é parâmetro — a função o deriva da sessão.
   */
  comprar: (id: string) => Promise<ResultadoCompra>;
  devolver: (id: string, motivo: string) => Promise<ResultadoCompra>;
  /** LED-R08 — nota do comprador depois da consulta. Refazer sobrescreve. */
  avaliar: (id: string, nota: number, comentario: string) => Promise<ResultadoCompra>;
  /**
   * Só administrador, e só lead que nunca virou produto — a função no banco
   * recusa lead vendido ou com ligação registrada (`INV-13`).
   */
  excluir: (id: string) => Promise<{ ok: true } | { ok: false; motivo: string }>;
  /** Busca de novo no banco e devolve a lista. */
  recarregar: () => Promise<Lead[]>;
}

const LeadsContext = createContext<LeadsValue | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { dados: leads, carregando, erro, recarregar, definir } = useDadosDaSessao(
    listarLeads,
    'leads',
  );
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
  // A referência precisa acompanhar o que voltou do banco, senão `comprar` e
  // `reservar` decidem sobre a lista da carga anterior.
  vivos.current = leads;

  const aplicar = useCallback(
    (proximo: (atual: Lead[]) => Lead[]) => {
      const novo = proximo(vivos.current);
      vivos.current = novo;
      definir(() => novo);
    },
    [definir],
  );

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
        direcionadoPara: null,
        compradoPor: null,
        compradoEm: null,
        reservadoPor: null,
        reservadoAte: null,
        temGravacao: false,
        criadoEm: agora,
        ultimaAtividade: agora,
        motivoDesqualificacao: null,
        devolucao: null,
        avaliacao: null,
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
    (id: string, reuniaoEm: string, direcionadoPara: string | null = null) => {
      aplicar((atual) =>
        atual.map((l) =>
          l.id === id
            ? {
                ...l,
                reuniaoEm,
                status: 'agendado',
                direcionadoPara,
                ultimaAtividade: new Date().toISOString(),
              }
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

  /**
   * Depois de qualquer escrita, a verdade vem do banco — nunca de adivinhar o
   * que ele fez.
   *
   * `API-R14` já diz isso para evento externo, e vale igual aqui: as funções
   * transacionais recusam por regra (lead já vendido, reserva de outro, saldo
   * insuficiente) e a recusa pode chegar depois de a tela ter decidido o
   * contrário. Reler é mais barato que manter duas versões da mesma linha.
   */
  const aplicarNoBanco = useCallback(
    async (executar: () => Promise<{ ok: boolean; motivo?: string }>, id: string) => {
      const r = await executar();
      if (!r.ok) return { ok: false as const, motivo: r.motivo ?? 'Operação recusada.' };

      const atualizados = await recarregar();
      const lead = atualizados.find((l) => l.id === id);
      if (!lead) return { ok: false as const, motivo: 'Lead não encontrado depois da operação.' };
      return { ok: true as const, lead };
    },
    [recarregar],
  );

  /** `LED-R04` — a trava de checkout, com prazo, decidida no banco. */
  const reservar = useCallback(
    async (id: string): Promise<boolean> => {
      const r = await reservarLead(id);
      if (r.ok) await recarregar();
      return r.ok;
    },
    [recarregar],
  );

  const liberarReserva = useCallback(
    async (id: string) => {
      await liberarReservaNoBanco(id);
      await recarregar();
    },
    [recarregar],
  );

  /**
   * Substituída por `comprarLead(id)` de `src/servicos/leads.ts`.
   *
   * A RPC não recebe o comprador: ela o deriva da sessão. Passá-lo do cliente
   * faria de comprar em nome de terceiro uma chamada bem formada. E lá o
   * carimbo e o débito acontecem na mesma transação (`API-R08`) — as três
   * chamadas que a view faz hoje viram uma só.
   */
  const comprar = useCallback(
    (id: string) => aplicarNoBanco(() => comprarLead(id), id),
    [aplicarNoBanco],
  );

  /**
   * `CRE-R05` — o crédito volta, o lead não. A reposição do crédito acontece
   * dentro da função do banco, junto da marcação da devolução: quem chama não
   * credita por fora.
   */
  const devolver = useCallback(
    (id: string, motivo: string) => aplicarNoBanco(() => devolverLead(id, motivo), id),
    [aplicarNoBanco],
  );

  const avaliar = useCallback(
    (id: string, nota: number, comentario: string) =>
      aplicarNoBanco(() => avaliarLead(id, nota, comentario.trim() || null), id),
    [aplicarNoBanco],
  );

  const excluir = useCallback(
    async (id: string) => {
      const r = await excluirLead(id);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const value = useMemo<LeadsValue>(
    () => ({
      leads,
      carregando,
      erro,
      criar,
      mover,
      agendar,
      responderFiltro,
      reservar,
      liberarReserva,
      comprar,
      devolver,
      avaliar,
      excluir,
      recarregar,
    }),
    [
      leads,
      carregando,
      erro,
      criar,
      mover,
      agendar,
      responderFiltro,
      reservar,
      liberarReserva,
      comprar,
      devolver,
      avaliar,
      excluir,
      recarregar,
    ],
  );

  return <LeadsContext value={value}>{children}</LeadsContext>;
}

export function useLeads(): LeadsValue {
  const ctx = use(LeadsContext);
  if (!ctx) throw new Error('useLeads precisa estar dentro de <LeadsProvider>');
  return ctx;
}
