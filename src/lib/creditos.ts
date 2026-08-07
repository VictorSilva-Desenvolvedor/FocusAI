import { TESES } from '@/src/lib/teses';
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
 * `CRE-R07` — o crédito vale um real, sempre — inclusive dentro de um pacote
 * com bônus.
 *
 * A paridade com o real é o que faz a tabela ser legível sem calculadora: o
 * advogado lê "40 créditos" e sabe que são R$ 40. Crédito com valor de face
 * próprio — 1 crédito por R$ 7, por exemplo — esconde o preço do lead atrás de
 * uma conversão, e o efeito conhecido disso é o comprador achando que pagou
 * menos do que pagou até conferir o extrato.
 *
 * O incentivo de volume não mexe nesse valor de face: em vez de vender o
 * crédito mais barato — o que faria o mesmo crédito valer coisas diferentes
 * dependendo de onde foi comprado —, o pacote maior credita mais créditos do
 * que o advogado pagou. `bonusDoPacote` é essa diferença.
 */
export const VALOR_DO_CREDITO = 1;

/**
 * A partir de quanto o modelo de créditos vale a pena começar: o menor pacote
 * com bônus, não o avulso. Abaixo disso o advogado ainda está decidindo se
 * quer o compromisso de saldo — é o avulso que atende esse caso, sem mínimo
 * nenhum (`CRE-R07`).
 */
export const RECARGA_MINIMA = 350;

/**
 * Pacotes à venda. O bônus por volume é o incentivo do modelo de créditos:
 * previsibilidade de receita para a Focus, e mais crédito pelo mesmo real para
 * o advogado.
 *
 * O bônus é crédito extra creditado no saldo, nunca desconto no preço do lead:
 * o lead custa sempre o mesmo em créditos (`TES-R07`), e o que o volume compra
 * é saldo maior que o valor pago. Descontar o lead faria o mesmo produto ter
 * dois preços no extrato, e aí `INV-15` — consumido fecha com comprado — deixa
 * de ser conferível.
 */
export const PACOTES: PacoteCredito[] = [
  { id: 'pac-inicial', nome: 'Inicial', creditos: 400, valor: 350, destaque: false },
  { id: 'pac-escritorio', nome: 'Escritório', creditos: 1_000, valor: 800, destaque: true },
  { id: 'pac-volume', nome: 'Volume', creditos: 2_000, valor: 1_500, destaque: false },
];

/** Bônus do pacote sobre o valor pago, em pontos percentuais. */
export function bonusDoPacote(pacote: PacoteCredito): number {
  return Math.round(((pacote.creditos - pacote.valor) / pacote.valor) * 100);
}

/** Quanto cada lead sai, na prática, dentro deste pacote — o que o bônus paga. */
export function custoEfetivoPorLead(pacote: PacoteCredito): number {
  const leads = leadsDoPacote(pacote);
  return leads > 0 ? pacote.valor / leads : 0;
}

/**
 * Quantos leads um saldo em créditos ainda compra.
 *
 * Conta pela tese **mais cara**, e não pela média: o número aparece na tela ao
 * lado do saldo e do preço, e prometer seis leads onde o saldo compra cinco em
 * metade das teses é promessa que o extrato desmente na primeira semana. Com as
 * três teses no mesmo preço o resultado é exato — a conta continua aqui porque
 * a estrutura permite preço por tese, e é ela que segura a promessa quando um
 * preço divergir.
 */
export function leadsQueCabem(creditos: number): number {
  const maisCaro = Math.max(...TESES.map((t) => t.custoCreditos));
  if (maisCaro <= 0) return 0;
  return Math.floor(creditos / maisCaro);
}

/** Quantos leads o pacote garante. */
export function leadsDoPacote(pacote: PacoteCredito): number {
  return leadsQueCabem(pacote.creditos);
}

/**
 * O topo e o piso da tabela de preço por tese, para a tela que resume os dois
 * modelos sem cravar "R$ 40" no texto — as três custam o mesmo hoje (`TES-R07`),
 * mas a tela lê a faixa em vez de assumir isso.
 */
export function faixaDePrecoDasTeses(): {
  creditoMax: number;
  avulsoMax: number;
  precoUnico: boolean;
} {
  const creditos = TESES.map((t) => t.custoCreditos);
  const avulsos = TESES.map((t) => t.precoAvulso);
  return {
    creditoMax: Math.max(...creditos),
    avulsoMax: Math.max(...avulsos),
    precoUnico: new Set(avulsos).size === 1 && new Set(creditos).size === 1,
  };
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
