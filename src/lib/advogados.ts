import { ESTILO_ETIQUETA, ESTILO_PONTO } from '@/src/lib/estilo';
import type {
  Advogado,
  AdvogadoStatus,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
  Profile,
  TeseId,
} from '@/types';

// ---------------------------------------------------------------------------
// O funil
// ---------------------------------------------------------------------------

/**
 * As colunas do quadro, na ordem do fluxo real do advogado: vê o anúncio,
 * preenche o formulário, passa por qualificação, recebe acesso, escolhe o
 * modelo de pagamento e faz a primeira compra.
 *
 * Recusado, perdido e pausado ficam fora — são desfechos, não etapas, e uma
 * coluna-cemitério no fim do quadro só serve para acumular cartão que ninguém
 * olha.
 */
export const COLUNAS: AdvogadoStatus[] = [
  'novo',
  'em_qualificacao',
  'qualificado',
  'acesso_liberado',
  'modelo_definido',
  'ativo',
];

/** Desfechos: saem do quadro e só aparecem por filtro. */
export const DESFECHOS: AdvogadoStatus[] = ['recusado', 'perdido', 'em_pausa'];

/**
 * Cabeça de coluna do quadro. Os dois passos do meio usam tons da marca em
 * intensidade crescente — a progressão é o que faz o quadro ser lido da
 * esquerda para a direita; os demais usam o tom do significado (EST-R10).
 */
export const COR_COLUNA: Partial<Record<AdvogadoStatus, string>> = {
  novo: ESTILO_PONTO.neutro,
  em_qualificacao: ESTILO_PONTO.info,
  qualificado: 'bg-roxo-400',
  acesso_liberado: 'bg-roxo-600',
  modelo_definido: ESTILO_PONTO.atencao,
  ativo: ESTILO_PONTO.sucesso,
};

// ---------------------------------------------------------------------------
// ADV-R01 a ADV-R03 — transições que o quadro recusa
// ---------------------------------------------------------------------------

/**
 * Arrastar não é livre. Três travas, e todas protegem a mesma coisa: quem
 * recebe login passa a enxergar dados de pessoas reais com problema jurídico.
 *
 * 1. Sem inscrição da OAB conferida não se libera acesso (`INV-12`). Liberar
 *    login a quem não é advogado entrega dado pessoal de cliente final a um
 *    terceiro qualquer — é exatamente o que o funil de qualificação existe
 *    para conter.
 * 2. Não se pula a qualificação. Cadastro livre é o modelo que a Focus recusa;
 *    é ele que garante filtrar área, região e porte antes de abrir a base.
 * 3. Sem tese e região definidas o painel abre vazio e a notificação de lead
 *    novo nunca dispara — o advogado paga por um produto que não recebe.
 */
export function motivoParaRecusarMovimento(
  advogado: Advogado,
  destino: AdvogadoStatus,
): string | null {
  if (advogado.status === destino) return null;

  const depoisDaLiberacao: AdvogadoStatus[] = ['acesso_liberado', 'modelo_definido', 'ativo'];

  if (depoisDaLiberacao.includes(destino) && !advogado.oabConferidaEm) {
    return 'Confira a inscrição na OAB antes de liberar acesso — sem isso, quem entra passa a ver dado pessoal de cliente final (INV-12).';
  }

  if (destino === 'acesso_liberado' && advogado.status !== 'qualificado') {
    return 'Acesso só é liberado depois da qualificação. Cadastro livre é justamente o que o modelo recusa.';
  }

  if (depoisDaLiberacao.includes(destino) && advogado.teses.length === 0) {
    return 'Defina em quais teses o advogado atua — sem isso o painel abre vazio e a notificação de lead novo nunca dispara.';
  }

  if (destino === 'ativo' && !advogado.modeloPagamento) {
    return 'Escolha o modelo de pagamento antes de ativar: sem ele não há como cobrar o primeiro lead.';
  }

  return null;
}

// ---------------------------------------------------------------------------
// ADV-R04 — prioridade automática
// ---------------------------------------------------------------------------

const POTENCIAL_ALTO = 20;
const DIAS_SEM_INTERACAO_P1 = 14;
export const DIAS_PARA_CONGELAR = 12;

export function diasSemInteracao(a: Advogado): number {
  return Math.floor((Date.now() - Date.parse(a.ultimaAtividade)) / 86_400_000);
}

/** ADV-R07 — congelamento é visual. Não muda status nem responsável. */
export function estaCongelado(a: Advogado): boolean {
  if (DESFECHOS.includes(a.status) || a.status === 'ativo') return false;
  return diasSemInteracao(a) > DIAS_PARA_CONGELAR;
}

export function prioridade(a: Advogado): PrioridadeAdvogado {
  if (a.prioridadeManual) return a.prioridadeManual;

  const parado = diasSemInteracao(a) >= DIAS_SEM_INTERACAO_P1;
  const quenteEGrande =
    (a.status === 'qualificado' || a.status === 'acesso_liberado') &&
    a.potencialMensal >= POTENCIAL_ALTO;
  if (parado || quenteEGrande) return 'P1';

  const novoEPequeno =
    a.status === 'novo' &&
    Math.floor((Date.now() - Date.parse(a.criadoEm)) / 86_400_000) <= 7 &&
    a.potencialMensal < POTENCIAL_ALTO;
  if (novoEPequeno) return 'P3';

  return 'P2';
}

export const ESTILO_PRIORIDADE: Record<PrioridadeAdvogado, string> = {
  P1: ESTILO_ETIQUETA.erro,
  P2: ESTILO_ETIQUETA.neutro,
  P3: ESTILO_ETIQUETA.info,
};

/** ADV-R08 — próxima ação sugerida por status. */
export const PROXIMA_ACAO: Record<AdvogadoStatus, string> = {
  novo: 'Agendar a qualificação',
  em_qualificacao: 'Conferir área, região e porte',
  qualificado: 'Conferir a inscrição na OAB',
  acesso_liberado: 'Acompanhar a escolha do modelo',
  modelo_definido: 'Cobrar a primeira compra',
  ativo: 'Acompanhar o consumo e o saldo',
  recusado: '—',
  perdido: '—',
  em_pausa: 'Retomar contato',
};

// ---------------------------------------------------------------------------
// Visibilidade
// ---------------------------------------------------------------------------

/** Closer e SDR veem apenas a própria carteira. Os demais veem tudo. */
const SO_A_PROPRIA_CARTEIRA = new Set(['closer', 'sdr']);

export function visiveisPara(advogados: Advogado[], perfil: Profile): Advogado[] {
  if (!SO_A_PROPRIA_CARTEIRA.has(perfil.role)) return advogados;
  return advogados.filter((a) => a.responsavelId === perfil.id);
}

export function veApenasPropria(perfil: Profile): boolean {
  return SO_A_PROPRIA_CARTEIRA.has(perfil.role);
}

// ---------------------------------------------------------------------------
// Validação do cadastro
// ---------------------------------------------------------------------------

export interface AdvogadoFormData {
  nome: string;
  oab: string;
  email: string;
  whatsapp: string;
  uf: string;
  teses: TeseId[];
  porte: PorteEscritorio | '';
  potencialMensal: string;
  modeloPagamento: ModeloPagamento | '';
  responsavelId: string;
}

export type ErrosAdvogado = Partial<Record<keyof AdvogadoFormData, string>>;

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Formato usual da inscrição: 6 dígitos + UF. Ex.: 123456/GO. */
const OAB_RE = /^\d{4,6}\/[A-Z]{2}$/;

export function validarAdvogado(
  dados: AdvogadoFormData,
  advogados: Advogado[],
  editandoId?: string,
): ErrosAdvogado {
  const erros: ErrosAdvogado = {};

  const nome = dados.nome.trim();
  if (!nome) {
    erros.nome = 'Informe o nome do escritório ou do profissional.';
  } else if (nome.length < 3) {
    erros.nome = 'Nome muito curto.';
  }

  const oab = dados.oab.trim().toUpperCase();
  if (!oab) {
    erros.oab = 'Informe a inscrição na OAB — é o que prova que o comprador é advogado.';
  } else if (!OAB_RE.test(oab)) {
    erros.oab = 'Use o formato 123456/UF.';
  } else {
    // Inscrição repetida é a mesma pessoa entrando duas vezes: as duas fichas
    // passam a acumular metade do histórico cada uma.
    const duplicado = advogados.some(
      (a) => a.id !== editandoId && a.oab.toUpperCase() === oab && !DESFECHOS.includes(a.status),
    );
    if (duplicado) erros.oab = 'Já existe um cadastro ativo com esta inscrição.';
  }

  const email = dados.email.trim().toLowerCase();
  if (!email) {
    erros.email = 'Informe o e-mail — é por ele que o acesso é enviado.';
  } else if (!EMAIL_RE.test(email)) {
    erros.email = 'E-mail inválido.';
  }

  const digitos = dados.whatsapp.replace(/\D/g, '');
  if (!digitos) {
    erros.whatsapp = 'Informe o WhatsApp — é por ele que sai o aviso de lead novo.';
  } else if (digitos.length < 10 || digitos.length > 11) {
    erros.whatsapp = 'Informe DDD + número (10 ou 11 dígitos).';
  }

  if (!dados.uf) erros.uf = 'Escolha a UF de atuação.';

  if (dados.teses.length === 0) {
    erros.teses = 'Escolha ao menos uma tese — é ela que define o que ele vê no catálogo.';
  }

  if (!dados.porte) erros.porte = 'Informe o porte do escritório.';

  const potencial = Number(dados.potencialMensal);
  if (!dados.potencialMensal.trim()) {
    erros.potencialMensal = 'Informe quantos leads por mês ele consegue absorver.';
  } else if (!Number.isInteger(potencial) || potencial <= 0) {
    erros.potencialMensal = 'Informe um número inteiro de leads.';
  }

  if (!dados.responsavelId) erros.responsavelId = 'Escolha o responsável.';

  return erros;
}

export function temErro(erros: ErrosAdvogado): boolean {
  return Object.keys(erros).length > 0;
}

export function formatarWhatsapp(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Formata enquanto digita: 123456/GO. */
export function formatarOab(valor: string): string {
  const limpo = valor.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const numero = limpo.replace(/[^0-9]/g, '').slice(0, 6);
  const uf = limpo.replace(/[^A-Z]/g, '').slice(0, 2);
  if (!uf) return numero;
  return `${numero}/${uf}`;
}
