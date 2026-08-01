/**
 * Tipos de domínio do CRM.
 *
 * Negócio: agência de tráfego pago para profissionais de captação regulada —
 * advogados (OAB), contadores (CFC), médicos (CFM), dentistas (CFO) e
 * psicólogos (CFP). O que a agência vende é lead qualificado; o que a limita é
 * que **a publicidade desses profissionais é regulada**, e anúncio fora da
 * norma expõe o cliente a processo ético no conselho dele.
 *
 * Isso define o sistema inteiro. São quatro máquinas encadeadas:
 *   1. Captar o cliente        → CRM, proposta, contrato
 *   2. Aprovar a conformidade  → parecer sobre criativo e página de destino
 *   3. Distribuir a verba      → orçamento entre contas, campanhas e plataformas
 *   4. Entregar e cobrar       → fee da agência + repasse de mídia, cobrança
 *
 * A entidade que atravessa tudo é a **Conta de Anúncio**: é ela que a plataforma
 * reconhece, é nela que a verba entra, é sobre ela que a fatura de mídia chega e
 * é dela que sai a cobrança.
 */

// ---------------------------------------------------------------------------
// Acessos
// ---------------------------------------------------------------------------

/** Os 12 papéis. Um único valor por usuário. */
export type UserRole =
  | 'adm'
  | 'gerente'
  | 'gestor_trafego'
  | 'analista_conformidade'
  | 'criativo'
  | 'closer'
  | 'sdr'
  | 'cs'
  | 'financeiro'
  | 'parceiro'
  | 'cliente'
  | 'white_label_admin';

export const ROLE_LABEL: Record<UserRole, string> = {
  adm: 'ADM / Administrador',
  gerente: 'Gerente de Operações',
  gestor_trafego: 'Gestor de Tráfego',
  analista_conformidade: 'Analista de Conformidade',
  criativo: 'Criativo (design e copy)',
  closer: 'Closer',
  sdr: 'SDR',
  cs: 'Customer Success',
  financeiro: 'Financeiro',
  parceiro: 'Parceiro / Indicador',
  cliente: 'Cliente (Portal)',
  white_label_admin: 'White Label — Administrador',
};

/** Permissões nomeadas: marcações extras, independentes do papel. */
export type NamedPermission =
  | 'modulo:campanhas'
  | 'modulo:conformidade'
  | 'modulo:plataformas'
  | 'verba:aprovar_realocacao'
  | 'conformidade:liberar_com_ressalva'
  | 'cobranca:receber_pendentes'
  | 'cobranca:receber_aviso_inadimplencia'
  | 'auditoria:repasse_midia'
  | 'assistente:financeiro';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  /** Texto livre. Poucas regras usam, mas as que usam são pesadas (CNF-R21). */
  departamento: string | null;
  permissoes: NamedPermission[];
  /** Agência white label dona do registro. Nulo = carteira própria. */
  white_label_id: string | null;
  avatar_iniciais: string;
}

/**
 * ACC-R21 — usuário nunca é excluído, é desativado. O histórico de quem
 * aprovou verba, emitiu parecer e deu baixa em fatura precisa continuar
 * apontando para alguém.
 */
export type UserStatus = 'ativo' | 'convite_pendente' | 'inativo';

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ativo: 'Ativo',
  convite_pendente: 'Convite pendente',
  inativo: 'Inativo',
};

export interface Usuario extends Profile {
  status: UserStatus;
  /** ISO. Imutável. */
  criado_em: string;
  /** Id de quem criou. Nulo apenas para as contas semeadas. */
  criado_por: string | null;
  /** ISO ou nulo se nunca entrou. */
  ultimo_acesso: string | null;
}

/** Campos que o formulário de usuário controla. */
export interface UsuarioFormData {
  nome: string;
  email: string;
  role: UserRole;
  departamento: string;
  permissoes: NamedPermission[];
}

// ---------------------------------------------------------------------------
// Navegação / módulos
// ---------------------------------------------------------------------------

export type ModuleId =
  | 'dashboard'
  | 'crm'
  | 'campanhas'
  | 'conformidade'
  | 'financeiro'
  | 'tarefas'
  | 'plataformas'
  | 'academy'
  | 'config'
  | 'portal-cliente';

/** ✅ acesso · 🔎 leitura restrita · ⛔ bloqueado */
export type AccessLevel = 'full' | 'restricted' | 'blocked';

// ---------------------------------------------------------------------------
// CRM — o funil de aquisição da própria agência
// ---------------------------------------------------------------------------

/**
 * Os 10 status da negociação. É a máquina de estados do negócio — não é
 * configurável, diferente da etapa (stage) do funil, que é livre.
 */
export type NegociacaoStatus =
  | 'em_andamento'
  | 'diagnostico_realizado'
  | 'proposta_enviada'
  | 'contrato_assinado'
  | 'em_conformidade'
  | 'conta_ativa'
  | 'reprovado'
  | 'ganho'
  | 'perdido'
  | 'em_pausa';

export const NEGOCIACAO_STATUS_LABEL: Record<NegociacaoStatus, string> = {
  em_andamento: 'Em andamento',
  diagnostico_realizado: 'Diagnóstico realizado',
  proposta_enviada: 'Proposta enviada',
  contrato_assinado: 'Contrato assinado',
  em_conformidade: 'Em conformidade',
  conta_ativa: 'Conta ativa',
  reprovado: 'Reprovado',
  ganho: 'Ganho',
  perdido: 'Perdido',
  em_pausa: 'Em pausa',
};

/**
 * Conselho profissional que regula a publicidade do cliente. Determina qual
 * régua de conformidade o criativo enfrenta antes de subir.
 */
export type ConselhoRegulador = 'OAB' | 'CFC' | 'CFM' | 'CFO' | 'CFP' | 'nenhum';

/** Faixa de verba mensal. Atenção: A é a MAIOR, C a menor. */
export type FaixaVerba = 'A' | 'B' | 'C';

/** Prioridade automática do Kanban (CRM-R17). */
export type PrioridadeLead = 'P1' | 'P2' | 'P3';

/**
 * A negociação: o registro de venda da própria agência, do primeiro contato ao
 * contrato assinado e à conta no ar.
 *
 * CRM-R01 — o título é sempre o nome do cliente. Não existe título
 * independente: Kanban, tabela e tarefas exibiam nome desatualizado quando o
 * cliente era corrigido.
 */
export interface Negociacao {
  id: string;
  /** Escritório, clínica ou profissional. É o título do registro. */
  cliente: string;
  whatsapp: string;
  /** Define a régua de conformidade. Nulo enquanto não qualificado. */
  conselho: ConselhoRegulador | null;
  nicho: string;
  /** Verba de mídia mensal prevista, em reais. */
  verbaMensal: number;
  status: NegociacaoStatus;
  /** Sobrescreve a prioridade automática quando o gestor decide. */
  prioridadeManual: PrioridadeLead | null;
  origem: string;
  responsavelId: string;
  criadoPor: string;
  /** ISO. Imutável. */
  criadaEm: string;
  /** ISO. CRM-R04 — toda ação relevante atualiza este marcador. */
  ultimaAtividade: string;
  /** CRM-R10 — obrigatório ao marcar como perdido. */
  motivoPerda: string | null;
}

// ---------------------------------------------------------------------------
// Conformidade publicitária
// ---------------------------------------------------------------------------

/** As cinco decisões do parecer. */
export type DecisaoConformidade =
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'exigir_ajuste'
  | 'pendencia_documental'
  | 'reprovado';

// ---------------------------------------------------------------------------
// Campanhas e verba
// ---------------------------------------------------------------------------

export type PlataformaAnuncio = 'meta' | 'google' | 'tiktok' | 'linkedin';

export const PLATAFORMA_LABEL: Record<PlataformaAnuncio, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads',
};

/** Situação da conta de anúncio dentro do ciclo. */
export type SituacaoConta =
  | 'ativa'
  | 'ativa_sem_verba'
  | 'primeiro_ciclo'
  | 'pausada'
  | 'reativacao'
  | 'encerrada';

export type DistribuicaoVerbaStatus =
  | 'rascunho'
  | 'aguardando_aprovacao'
  | 'aplicada'
  | 'conciliada';

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

/** Situação de pagamento da fatura da agência. */
export type StatusFatura =
  | 'em_aberto'
  | 'pago'
  | 'vencido'
  | 'cancelado'
  | 'parcelado'
  | 'quitado';

// ---------------------------------------------------------------------------
// Painel de entrada
// ---------------------------------------------------------------------------

/** Um estágio da cadeia: captar → aprovar → distribuir → cobrar. */
export interface EtapaCadeia {
  id: 'captar' | 'aprovar' | 'distribuir' | 'cobrar';
  titulo: string;
  descricao: string;
  valor: string;
  unidade: string;
  detalhe: string;
  variacao: number | null;
  rota: string;
  /** Módulo dono do número — define quem enxerga o card. */
  modulo: ModuleId;
}

/** Chip da barra "Meu Trabalho Hoje" — calculado ao vivo, não existe no banco. */
export interface ChipTrabalhoHoje {
  id: string;
  rotulo: string;
  valor: number;
  meta?: number;
  criterio: string;
  tom: 'neutro' | 'atencao' | 'critico' | 'positivo';
}

export type SeveridadeAlerta = 'critico' | 'alto' | 'medio' | 'info';

export interface AlertaOperacional {
  id: string;
  severidade: SeveridadeAlerta;
  titulo: string;
  descricao: string;
  regra: string | null;
  modulo: ModuleId;
}

/** Recorte da carteira por nicho de atuação do cliente. */
export interface NichoCarteira {
  nicho: string;
  conselho: ConselhoRegulador;
  contas: number;
  verbaMes: number;
  cpl: number;
}
