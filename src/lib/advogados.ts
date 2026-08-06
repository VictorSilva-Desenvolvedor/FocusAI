import { VALOR_DO_CREDITO } from '@/src/lib/creditos';
import { ESTILO_ETIQUETA } from '@/src/lib/estilo';
import type {
  Advogado,
  AdvogadoStatus,
  Lead,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
  Profile,
  TeseId,
  UsuarioFormData,
} from '@/types';

// ---------------------------------------------------------------------------
// O funil
// ---------------------------------------------------------------------------

/**
 * As etapas do funil, na ordem do fluxo real do advogado: vê o anúncio,
 * preenche o formulário, passa por qualificação, recebe acesso, escolhe o
 * modelo de pagamento e faz a primeira compra.
 *
 * Recusado, perdido e pausado ficam fora — são desfechos, não etapas, e listar
 * os dois juntos por padrão faz o funil parecer maior do que é.
 */
export const COLUNAS: AdvogadoStatus[] = [
  'novo',
  'em_qualificacao',
  'qualificado',
  'acesso_liberado',
  'modelo_definido',
  'ativo',
];

/** Desfechos: saem da lista e só aparecem por filtro. */
export const DESFECHOS: AdvogadoStatus[] = ['recusado', 'perdido', 'em_pausa'];

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
  ator: Profile,
): string | null {
  if (advogado.status === destino) return null;

  const depoisDaLiberacao: AdvogadoStatus[] = ['acesso_liberado', 'modelo_definido', 'ativo'];

  /*
   * ADV-R09 — liberar acesso não é mover cartão: é criar a conta que passa a
   * enxergar telefone de cliente final. Por isso é a permissão nomeada que
   * decide, e não o papel — a mesma permissão que a tela de usuários já
   * descreve como "cria a conta do advogado depois da inscrição conferida".
   * O ator é obrigatório na assinatura de propósito: parâmetro opcional aqui
   * viraria uma chamada esquecida que libera acesso sem ninguém autorizado.
   */
  if (destino === 'acesso_liberado' && !ator.permissoes.includes('advogado:liberar_acesso')) {
    return 'Liberar acesso exige a permissão "Liberar acesso de advogado" — é ela que cria a conta que passa a ver dado de cliente final.';
  }

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
// ADV-R09 — a conta nasce da liberação
// ---------------------------------------------------------------------------

/**
 * Os dados da conta de acesso do advogado, derivados da própria ficha.
 *
 * `INV-12` — advogado não se cadastra sozinho, e também não é cadastrado pelo
 * painel de usuários: a conta é **consequência** da liberação, depois da
 * inscrição conferida. Derivar de `Advogado` em vez de pedir os campos de novo
 * é o que garante que a conta e a ficha falem da mesma pessoa; dois cadastros
 * digitados em telas diferentes divergem no primeiro e-mail corrigido só de um
 * lado, e aí ninguém sabe qual dos dois responde pelo acesso.
 */
export function contaDoAdvogado(advogado: Advogado): UsuarioFormData {
  return {
    nome: advogado.nome,
    email: advogado.email,
    role: 'advogado',
    departamento: '',
    // INV-05 — papel externo não herda permissão nomeada nenhuma. O que ele vê
    // sai da matriz de acesso, e é sempre o próprio recorte.
    permissoes: [],
  };
}

// ---------------------------------------------------------------------------
// ADV-R04 — prioridade automática
// ---------------------------------------------------------------------------

const POTENCIAL_ALTO = 20;
export const DIAS_SEM_INTERACAO_P1 = 14;
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
// ADV-R10 — ranking por consumo
// ---------------------------------------------------------------------------

/** Janelas do ranking. Nulo = todo o histórico. */
export const JANELAS_DO_RANKING = [
  { dias: 30, rotulo: 'Últimos 30 dias' },
  { dias: 90, rotulo: 'Últimos 90 dias' },
  { dias: null, rotulo: 'Todo o histórico' },
] as const;

export interface LinhaDoRanking {
  advogado: Advogado;
  /** Nulo quando não comprou nada no período — não é última posição, é ausência. */
  posicao: number | null;
  leads: number;
  creditos: number;
  /** Valor do que consumiu, a preço de tabela. Não é receita — ver abaixo. */
  entregue: number;
  devolvidos: number;
  /** Média das notas que ele deu aos leads comprados (LED-R08). */
  nota: number | null;
  ultimaCompra: string | null;
}

/**
 * Quem consome o produto, em ordem.
 *
 * O funil responde "quem entra"; este ranking responde "quem sustenta a
 * operação depois que entrou" — e as duas leituras divergem sempre: o cadastro
 * de maior potencial declarado costuma não ser o que mais compra. Sem esta
 * lista, um advogado ativo que parou de comprar só aparece quando cancela.
 *
 * `entregue` é o valor do consumo a preço de tabela, e **não é receita**: no
 * modelo de crédito o dinheiro entrou na recarga, e somar as duas coisas conta
 * a mesma venda duas vezes. Receita reconhecida continua sendo o que
 * `receitaDoPeriodo` calcula, na tela de Créditos.
 *
 * Empate divide a posição em vez de desempatar por critério inventado: dois
 * advogados com o mesmo consumo são o mesmo lugar, e o número que apareceria
 * como desempate seria ruído para quem lê a tela.
 */
export function rankearPorConsumo(
  advogados: Advogado[],
  leads: Lead[],
  desde: Date | null,
): LinhaDoRanking[] {
  const corte = desde?.getTime() ?? null;

  const linhas = advogados.map((advogado) => {
    const comprados = leads.filter(
      (l) =>
        l.compradoPor === advogado.id &&
        l.compradoEm !== null &&
        (corte === null || Date.parse(l.compradoEm) >= corte),
    );

    const notas = comprados
      .map((l) => l.avaliacao?.nota)
      .filter((n): n is number => typeof n === 'number');

    return {
      advogado,
      posicao: null as number | null,
      leads: comprados.length,
      creditos: comprados.reduce((s, l) => s + l.custoCreditos, 0),
      entregue: comprados.reduce(
        (s, l) =>
          s +
          (advogado.modeloPagamento === 'avulso'
            ? l.precoAvulso
            : l.custoCreditos * VALOR_DO_CREDITO),
        0,
      ),
      devolvidos: comprados.filter((l) => l.devolucao !== null).length,
      nota: notas.length > 0 ? notas.reduce((s, n) => s + n, 0) / notas.length : null,
      ultimaCompra:
        comprados
          .map((l) => l.compradoEm!)
          .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
    };
  });

  linhas.sort((a, b) => {
    if (b.leads !== a.leads) return b.leads - a.leads;
    if (b.entregue !== a.entregue) return b.entregue - a.entregue;
    return a.advogado.nome.localeCompare(b.advogado.nome, 'pt-BR');
  });

  let posicao = 0;
  linhas.forEach((linha, indice) => {
    if (linha.leads === 0) return;
    const anterior = linhas[indice - 1];
    // Competição: empate compartilha a posição e a seguinte pula (1, 1, 3).
    const empatou = anterior && anterior.leads === linha.leads && anterior.entregue === linha.entregue;
    posicao = empatou ? (anterior.posicao ?? indice + 1) : indice + 1;
    linha.posicao = posicao;
  });

  return linhas;
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
  /** Texto livre separado por vírgula. Vazio = o estado inteiro (`LED-R06`). */
  cidades: string;
  porte: PorteEscritorio | '';
  potencialMensal: string;
  modeloPagamento: ModeloPagamento | '';
  responsavelId: string;
}

/**
 * LED-R06 — as regiões que o advogado acompanha, a partir do que ele digitou.
 *
 * Campo vazio é resposta válida e significa **o estado inteiro**, não "nenhuma
 * cidade": tratar vazio como lista restritiva faria o catálogo abrir zerado
 * para todo advogado que não quis restringir região, e o sintoma seria uma
 * tela vazia sem erro nenhum.
 */
export function cidadesDoTexto(texto: string): string[] {
  return [...new Set(texto.split(',').map((c) => c.trim()).filter(Boolean))];
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
