import type {
  Advogado,
  Lead,
  MovimentoCredito,
  PacoteCredito,
  Profile,
  TipoMovimento,
} from '@/types';
import type { Tom } from '@/src/lib/estilo';

/**
 * Pacotes à venda. O desconto por volume é o incentivo do modelo de créditos:
 * dá previsibilidade de receita para a Focus e preço melhor para o advogado.
 */
export const PACOTES: PacoteCredito[] = [
  { id: 'pac-10', nome: 'Inicial', creditos: 10, valor: 1_000, destaque: false },
  { id: 'pac-25', nome: 'Recorrente', creditos: 25, valor: 2_250, destaque: false },
  { id: 'pac-50', nome: 'Escritório', creditos: 50, valor: 4_000, destaque: true },
  { id: 'pac-100', nome: 'Volume', creditos: 100, valor: 7_000, destaque: false },
];

/** Preço unitário do crédito no pacote. É o que expõe o desconto por volume. */
export function precoPorCredito(pacote: PacoteCredito): number {
  return pacote.valor / pacote.creditos;
}

/** Desconto do pacote em relação ao menor, em pontos percentuais. */
export function descontoDoPacote(pacote: PacoteCredito): number {
  const base = precoPorCredito(PACOTES[0]);
  return Math.round((1 - precoPorCredito(pacote) / base) * 100);
}

// ---------------------------------------------------------------------------
// CRE-R01 — só confirmação de pagamento credita
// ---------------------------------------------------------------------------

/**
 * `INV-14` — o gatilho do crédito é a confirmação bancária, não a baixa manual.
 *
 * A tentação aparece sempre da mesma forma: "o advogado já pagou, o comprovante
 * está aqui, libera que depois concilia". Uma vez aberta a porta, crédito passa
 * a entrar por decisão de pessoa, e o extrato deixa de fechar com o extrato do
 * banco — que é justamente o que `INV-15` exige poder verificar.
 *
 * Se a operação precisar destravar alguém com urgência, o caminho é o ajuste
 * manual, que é um tipo de movimento próprio, aparece no extrato como tal e
 * exige motivo.
 */
export function podeCreditar(origem: 'confirmacao_bancaria' | 'baixa_manual'): boolean {
  return origem === 'confirmacao_bancaria';
}

// ---------------------------------------------------------------------------
// CRE-R06 — o ajuste manual é a porta legítima, e ela é estreita
// ---------------------------------------------------------------------------

/** Mínimo de texto para o motivo valer como explicação, e não como "ok". */
const MINIMO_DO_MOTIVO = 10;

/**
 * O ajuste manual existe porque a alternativa é pior.
 *
 * Sem ele, a pressão de destravar um advogado com urgência cai sobre o gatilho
 * do crédito — "confirma aí, o comprovante está aqui" — e aí `INV-14` morre em
 * silêncio, porque compra passa a entrar por decisão de pessoa e o extrato
 * deixa de fechar com o do banco. O ajuste absorve essa pressão sem contaminar
 * a compra: é **tipo de movimento próprio**, aparece no extrato como tal, exige
 * motivo escrito e não se disfarça de pagamento confirmado.
 *
 * Por isso ele não some com a exigência de motivo nem quando quem lança é
 * administrador: um saldo que ninguém sabe explicar é exatamente o que torna a
 * conferência de `INV-15` impossível depois.
 */
export function motivoParaNaoAjustar(
  ator: Profile,
  advogado: Advogado,
  creditos: number,
  motivo: string,
): string | null {
  if (!ator.permissoes.includes('credito:conciliar_pagamento')) {
    return 'Ajuste de crédito exige a permissão "Conciliar pagamento de crédito".';
  }
  if (!Number.isInteger(creditos) || creditos === 0) {
    return 'Informe quantos créditos entram (positivo) ou saem (negativo).';
  }
  // CRE-R04 — saldo nunca fica negativo. Ajuste que estoura o saldo não é
  // correção: é dívida disfarçada de crédito.
  if (advogado.saldoCreditos + creditos < 0) {
    return `Saldo insuficiente: ele tem ${advogado.saldoCreditos} créditos.`;
  }
  if (motivo.trim().length < MINIMO_DO_MOTIVO) {
    return 'Escreva o motivo do ajuste — é ele que explica o saldo depois.';
  }
  return null;
}

export function podeAjustar(
  ator: Profile,
  advogado: Advogado,
  creditos: number,
  motivo: string,
): boolean {
  return motivoParaNaoAjustar(ator, advogado, creditos, motivo) === null;
}

// ---------------------------------------------------------------------------
// Saldo e extrato
// ---------------------------------------------------------------------------

/**
 * O saldo é a soma dos movimentos, nunca um número guardado à parte.
 *
 * `INV-15` — consumido tem que fechar com comprado. Um campo `saldo` editável
 * independente do extrato torna a conferência impossível: os dois divergem e
 * não há como saber qual está certo.
 */
export function saldoDoExtrato(movimentos: MovimentoCredito[], advogadoId: string): number {
  return movimentos
    .filter((m) => m.advogadoId === advogadoId)
    .reduce((soma, m) => soma + m.creditos, 0);
}

/** Divergência entre o saldo gravado e o extrato. Zero é o esperado. */
export function divergenciaDeSaldo(
  advogado: Advogado,
  movimentos: MovimentoCredito[],
): number {
  return advogado.saldoCreditos - saldoDoExtrato(movimentos, advogado.id);
}

export const TOM_MOVIMENTO: Record<TipoMovimento, Tom> = {
  compra: 'sucesso',
  consumo: 'marca',
  devolucao: 'atencao',
  ajuste: 'neutro',
};

// ---------------------------------------------------------------------------
// CRE-R05 — devolução
// ---------------------------------------------------------------------------

export const MOTIVOS_DEVOLUCAO = [
  'Telefone inexistente ou incorreto',
  'Cliente não reconhece o agendamento',
  'Caso fora dos filtros da tese',
  'Cliente já tinha advogado atuante',
  'Reunião cancelada pelo cliente antes do horário',
] as const;

/**
 * Devolver repõe o crédito e **não** recoloca o lead no catálogo (`LED-R03`).
 *
 * O contato já foi entregue àquele advogado. Revender o mesmo contato criaria o
 * segundo comprador que `INV-10` proíbe — e a devolução, que existe para
 * proteger o advogado de um lead ruim, viraria a porta de saída do invariante
 * mais duro do sistema.
 */
export function motivoParaNaoDevolver(lead: Lead): string | null {
  if (!lead.compradoPor) return 'Só se devolve lead que foi comprado.';
  if (lead.devolucao) return 'Este lead já foi devolvido.';
  if (lead.status === 'atendido') {
    return 'A consulta já foi realizada — o produto foi entregue.';
  }
  return null;
}

export function podeDevolver(lead: Lead): boolean {
  return motivoParaNaoDevolver(lead) === null;
}

// ---------------------------------------------------------------------------
// Receita
// ---------------------------------------------------------------------------

/**
 * O que a Focus reconheceu no período. Consumo de crédito não é receita nova —
 * a receita entrou na compra do pacote; contar as duas é contar duas vezes.
 */
export function receitaDoPeriodo(movimentos: MovimentoCredito[], desde: Date): number {
  return movimentos
    .filter((m) => m.tipo === 'compra' && Date.parse(m.em) >= desde.getTime())
    .reduce((soma, m) => soma + m.valor, 0);
}

/** Venda avulsa entra como receita direta, sem passar por crédito. */
export function receitaAvulsaDoPeriodo(leads: Lead[], desde: Date): number {
  return leads
    .filter((l) => l.compradoEm && Date.parse(l.compradoEm) >= desde.getTime())
    .reduce((soma, l) => soma + l.precoAvulso, 0);
}
