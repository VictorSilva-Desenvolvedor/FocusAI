import { ESTILO_ETIQUETA, ESTILO_PONTO } from '@/src/lib/estilo';
import type {
  ConselhoRegulador,
  Negociacao,
  NegociacaoStatus,
  PrioridadeLead,
  Profile,
} from '@/types';

// ---------------------------------------------------------------------------
// O funil
// ---------------------------------------------------------------------------

/**
 * As colunas do quadro, na ordem. Perdido, pausado e reprovado ficam fora —
 * são desfechos, não etapas, e uma coluna-cemitério no fim do quadro só serve
 * para acumular cartão que ninguém olha.
 */
export const COLUNAS: NegociacaoStatus[] = [
  'em_andamento',
  'diagnostico_realizado',
  'proposta_enviada',
  'contrato_assinado',
  'em_conformidade',
  'conta_ativa',
];

/** Desfechos: saem do quadro e só aparecem por filtro. */
export const DESFECHOS: NegociacaoStatus[] = ['reprovado', 'perdido', 'em_pausa', 'ganho'];

/**
 * Cabeça de coluna do quadro. Os dois passos comerciais no meio usam tons da
 * marca em intensidade crescente — a progressão é o que faz o quadro ser lido
 * da esquerda para a direita; os demais usam o tom do significado (EST-R10).
 */
export const COR_COLUNA: Partial<Record<NegociacaoStatus, string>> = {
  em_andamento: ESTILO_PONTO.neutro,
  diagnostico_realizado: ESTILO_PONTO.info,
  proposta_enviada: 'bg-roxo-400',
  contrato_assinado: 'bg-roxo-600',
  em_conformidade: ESTILO_PONTO.atencao,
  conta_ativa: ESTILO_PONTO.sucesso,
};

// ---------------------------------------------------------------------------
// CRM-R20 — transições que o quadro recusa
// ---------------------------------------------------------------------------

/**
 * Arrastar não é livre. Duas travas, e as duas existem porque o erro que elas
 * evitam custa dinheiro ou expõe o cliente:
 *
 * 1. Sem conselho regulador definido não se assina contrato — é o conselho que
 *    determina qual régua de conformidade o criativo vai enfrentar. Descobrir
 *    isso depois de assinar significa reprecificar ou devolver o cliente.
 * 2. Conta não é ativada sem passar por conformidade. Pular a etapa é subir
 *    anúncio sem parecer, que é exatamente o que o módulo existe para impedir.
 */
export function motivoParaRecusarMovimento(
  negociacao: Negociacao,
  destino: NegociacaoStatus,
): string | null {
  if (negociacao.status === destino) return null;

  const precisaConselho: NegociacaoStatus[] = ['contrato_assinado', 'em_conformidade', 'conta_ativa'];
  if (precisaConselho.includes(destino) && !negociacao.conselho) {
    return 'Defina o conselho regulador antes de avançar — é ele que determina a régua de conformidade do criativo.';
  }

  if (destino === 'conta_ativa' && negociacao.status !== 'em_conformidade') {
    return 'Conta só é ativada depois do parecer de conformidade. Não dá para pular a etapa.';
  }

  return null;
}

// ---------------------------------------------------------------------------
// CRM-R17 — prioridade automática
// ---------------------------------------------------------------------------

const VERBA_ALTA = 15_000;
const DIAS_SEM_INTERACAO_P1 = 14;
export const DIAS_PARA_CONGELAR = 12;

export function diasSemInteracao(n: Negociacao): number {
  return Math.floor((Date.now() - Date.parse(n.ultimaAtividade)) / 86_400_000);
}

/** CRM-R05 — congelamento é visual. Não muda status nem responsável. */
export function estaCongelada(n: Negociacao): boolean {
  if (DESFECHOS.includes(n.status) || n.status === 'conta_ativa') return false;
  return diasSemInteracao(n) > DIAS_PARA_CONGELAR;
}

export function prioridade(n: Negociacao): PrioridadeLead {
  if (n.prioridadeManual) return n.prioridadeManual;

  const parado = diasSemInteracao(n) >= DIAS_SEM_INTERACAO_P1;
  const quenteEAlta =
    (n.status === 'proposta_enviada' || n.status === 'contrato_assinado') &&
    n.verbaMensal >= VERBA_ALTA;
  if (parado || quenteEAlta) return 'P1';

  const novaEPequena =
    n.status === 'em_andamento' &&
    Math.floor((Date.now() - Date.parse(n.criadaEm)) / 86_400_000) <= 7 &&
    n.verbaMensal < VERBA_ALTA;
  if (novaEPequena) return 'P3';

  return 'P2';
}

export const ESTILO_PRIORIDADE: Record<PrioridadeLead, string> = {
  P1: ESTILO_ETIQUETA.erro,
  P2: ESTILO_ETIQUETA.neutro,
  P3: ESTILO_ETIQUETA.info,
};

/** CRM-R18 — próxima ação sugerida por status. */
export const PROXIMA_ACAO: Record<NegociacaoStatus, string> = {
  em_andamento: 'Agendar diagnóstico',
  diagnostico_realizado: 'Montar e enviar proposta',
  proposta_enviada: 'Cobrar assinatura',
  contrato_assinado: 'Enviar criativos para parecer',
  em_conformidade: 'Acompanhar parecer',
  conta_ativa: 'Acompanhar primeiro ciclo',
  reprovado: 'Ajustar criativo e reenviar',
  perdido: '—',
  em_pausa: 'Retomar contato',
  ganho: '—',
};

// ---------------------------------------------------------------------------
// Nichos por conselho
// ---------------------------------------------------------------------------

export const NICHOS_POR_CONSELHO: Record<ConselhoRegulador, string[]> = {
  OAB: [
    'Previdenciário',
    'Trabalhista',
    'Família e Sucessões',
    'Tributário',
    'Criminal',
    'Consumidor',
  ],
  CFC: ['Contabilidade'],
  CFM: ['Medicina'],
  CFO: ['Odontologia'],
  CFP: ['Psicologia'],
  nenhum: ['Outro'],
};

export const CONSELHOS = Object.keys(NICHOS_POR_CONSELHO) as ConselhoRegulador[];

// ---------------------------------------------------------------------------
// Visibilidade
// ---------------------------------------------------------------------------

/**
 * Closer, SDR e parceiro veem apenas a própria carteira. Os demais papéis com
 * acesso ao CRM veem tudo.
 */
const SO_A_PROPRIA_CARTEIRA = new Set(['closer', 'sdr', 'parceiro']);

export function visiveisPara(negociacoes: Negociacao[], perfil: Profile): Negociacao[] {
  if (!SO_A_PROPRIA_CARTEIRA.has(perfil.role)) return negociacoes;
  return negociacoes.filter((n) => n.responsavelId === perfil.id);
}

export function veApenasPropria(perfil: Profile): boolean {
  return SO_A_PROPRIA_CARTEIRA.has(perfil.role);
}

// ---------------------------------------------------------------------------
// Validação do cadastro
// ---------------------------------------------------------------------------

export interface NegociacaoFormData {
  cliente: string;
  whatsapp: string;
  conselho: ConselhoRegulador | '';
  nicho: string;
  verbaMensal: string;
  origem: string;
  responsavelId: string;
}

export type ErrosNegociacao = Partial<Record<keyof NegociacaoFormData, string>>;

export const ORIGENS = [
  'Indicação',
  'Mídia paga',
  'Prospecção ativa',
  'Evento',
  'Inbound / site',
  'Parceiro',
] as const;

export function validarNegociacao(
  dados: NegociacaoFormData,
  negociacoes: Negociacao[],
  editandoId?: string,
): ErrosNegociacao {
  const erros: ErrosNegociacao = {};

  const cliente = dados.cliente.trim();
  if (!cliente) {
    erros.cliente = 'Informe o nome do escritório ou profissional.';
  } else if (cliente.length < 3) {
    erros.cliente = 'Nome muito curto.';
  } else {
    const duplicado = negociacoes.some(
      (n) =>
        n.id !== editandoId &&
        n.cliente.trim().toLowerCase() === cliente.toLowerCase() &&
        !DESFECHOS.includes(n.status),
    );
    if (duplicado) {
      erros.cliente = 'Já existe uma negociação ativa com este cliente.';
    }
  }

  const digitos = dados.whatsapp.replace(/\D/g, '');
  if (!digitos) {
    erros.whatsapp = 'Informe o WhatsApp — sem ele a régua de cobrança falha em silêncio depois.';
  } else if (digitos.length < 10 || digitos.length > 11) {
    erros.whatsapp = 'Informe DDD + número (10 ou 11 dígitos).';
  }

  if (!dados.conselho) {
    erros.conselho = 'Escolha o conselho — ele define a régua de conformidade.';
  }
  if (!dados.nicho) {
    erros.nicho = 'Escolha o nicho de atuação.';
  }

  const verba = Number(dados.verbaMensal.replace(/\./g, '').replace(',', '.'));
  if (!dados.verbaMensal.trim()) {
    erros.verbaMensal = 'Informe a verba mensal prevista.';
  } else if (!Number.isFinite(verba) || verba <= 0) {
    erros.verbaMensal = 'Valor inválido.';
  }

  if (!dados.origem) erros.origem = 'Informe a origem do lead.';
  if (!dados.responsavelId) erros.responsavelId = 'Escolha o responsável.';

  return erros;
}

export function temErro(erros: ErrosNegociacao): boolean {
  return Object.keys(erros).length > 0;
}

/** Aceita "12.000", "12000", "12.000,50". */
export function parseVerba(valor: string): number {
  return Number(valor.replace(/\./g, '').replace(',', '.'));
}

export function formatarWhatsapp(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
