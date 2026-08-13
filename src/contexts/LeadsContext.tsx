import { createContext, use, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { type LeadFormData } from '@/src/lib/leads';
import {
  atualizarElegibilidade,
  avaliarLead,
  comprarLead,
  criarLeadManual,
  devolverLead,
  excluirLead,
  liberarReserva as liberarReservaNoBanco,
  listarLeads,
  moverLead,
  reservarLead,
  type Resultado,
} from '@/src/servicos/leads';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { Lead, LeadStatus } from '@/types';

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
 * **Criar, mover e responder filtro** também gravam no banco agora: `criar`
 * chama `criar_lead_manual` (mesma escrita que a captação automática faz);
 * `mover` e `responderFiltro` escrevem direto na tabela, sob a política "quem
 * opera o catálogo escreve" — `leads_carimbo_imutavel` já recusa no banco o
 * que `motivoParaRecusarMovimento` recusa na tela, então não é escrita nova
 * sem validação, é a mesma escrita que a política já permitia, finalmente
 * usada.
 *
 * O que **continua local**: só `agendar`. `LED-R09` — `direcionadoPara` (a
 * entrega exclusiva) não tem coluna no banco ainda; é uma dívida documentada
 * em `CLAUDE.md`, não um esquecimento desta rodada.
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
  /** Cadastro manual — grava em `leads` e `leads_contato` numa transação só. */
  criar: (dados: LeadFormData) => Promise<{ ok: true; lead: Lead } | { ok: false; motivo: string }>;
  mover: (id: string, status: LeadStatus, motivo?: string) => Promise<Resultado>;
  /**
   * `LED-R09` — agendamento manual. `direcionadoPara` é o advogado da entrega
   * exclusiva, ou nulo para publicar no catálogo aberto (o comportamento de
   * sempre). Ainda local — `direcionadoPara` não tem coluna no banco.
   */
  agendar: (id: string, reuniaoEm: string, direcionadoPara?: string | null) => void;
  responderFiltro: (id: string, filtroId: string, valor: boolean) => Promise<void>;
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

  /** Cadastro manual. `criar_lead_manual` grava lead e contato numa transação só (`API-R08`). */
  const criar = useCallback(
    async (dados: LeadFormData) => {
      const r = await criarLeadManual(dados);
      if (!r.ok) return r;

      const atualizados = await recarregar();
      const lead = atualizados.find((l) => l.id === r.leadId);
      if (!lead) return { ok: false as const, motivo: 'Lead criado, mas não encontrado depois de recarregar.' };
      return { ok: true as const, lead };
    },
    [recarregar],
  );

  const mover = useCallback(
    async (id: string, status: LeadStatus, motivo?: string) => {
      const r = await moverLead(id, status, status === 'desqualificado' ? (motivo ?? null) : null);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
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

  /**
   * Otimista: marca a resposta na hora (é uma caixinha de seleção, precisa
   * responder ao clique) e grava em seguida. Falhando, `recarregar` traz a
   * verdade do banco de volta — mais barato que manter duas versões da linha.
   */
  const responderFiltro = useCallback(
    async (id: string, filtroId: string, valor: boolean) => {
      const atual = vivos.current.find((l) => l.id === id);
      if (!atual) return;
      const elegibilidade = { ...atual.elegibilidade, [filtroId]: valor };

      aplicar((lista) =>
        lista.map((l) => (l.id === id ? { ...l, elegibilidade, ultimaAtividade: new Date().toISOString() } : l)),
      );

      const r = await atualizarElegibilidade(id, elegibilidade);
      if (!r.ok) await recarregar();
    },
    [aplicar, recarregar],
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
