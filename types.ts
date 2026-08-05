/**
 * Tipos de domínio da Focus AI.
 *
 * Negócio: a Focus AI não vende serviço de marketing jurídico — vende o produto
 * final pronto. Ela roda o tráfego, uma IA de voz qualifica o cliente final e
 * agenda a consulta; o **lead qualificado com reunião marcada** vira um produto
 * que advogados compram num aplicativo, por unidade ou consumindo crédito.
 *
 * São quatro máquinas encadeadas:
 *   1. Captar o lead        → anúncio e formulário, por tese
 *   2. Qualificar com a IA  → filtros de elegibilidade da tese
 *   3. Agendar a reunião    → é o agendamento que transforma o lead em produto
 *   4. Entregar ao advogado → compra, revelação do contato, consulta
 *
 * A entidade que atravessa tudo é o **Lead**: é ele que a campanha produz, que a
 * IA qualifica, que carrega a reunião, que consome crédito ao ser comprado e que
 * responde, perante a OAB, como aquele cliente chegou àquele advogado.
 *
 * Cuidado de vocabulário, porque as duas pontas usam a mesma palavra no dia a
 * dia: **lead** é sempre o cliente final (a pessoa com o problema jurídico).
 * **Advogado** é sempre o comprador. O advogado também entra por um funil de
 * captação, mas ali ele é `Advogado`, nunca `Lead`.
 */

// ---------------------------------------------------------------------------
// Acessos
// ---------------------------------------------------------------------------

/**
 * Os 9 papéis. Um único valor por usuário.
 *
 * `advogado` é o único papel externo: é o cliente pagante, e enxerga o produto
 * pelo mesmo shell da operação, em modo restrito.
 *
 * Não há papel de vendas humana: quem qualifica o cliente final é a SDR de voz,
 * e o relacionamento com o advogado — do cadastro no funil ao acompanhamento do
 * consumo — é de Customer Success. Os papéis `closer` e `sdr` existiram e foram
 * removidos; não os reintroduza sem que a operação tenha essas funções de fato,
 * porque papel sem gente atrás vira carteira sem responsável.
 */
export type UserRole =
  | 'adm'
  | 'gerente'
  | 'gestor_trafego'
  | 'criativo'
  | 'analista_conformidade'
  | 'operador_ia'
  | 'cs'
  | 'financeiro'
  | 'advogado';

export const ROLE_LABEL: Record<UserRole, string> = {
  adm: 'ADM / Administrador',
  gerente: 'Gerente de Operações',
  gestor_trafego: 'Gestor de Tráfego',
  criativo: 'Criativo (design e copy)',
  analista_conformidade: 'Analista de Conformidade',
  operador_ia: 'Operador da SDR de IA',
  cs: 'Customer Success',
  financeiro: 'Financeiro',
  advogado: 'Advogado (painel)',
};

/** Permissões nomeadas: marcações extras, independentes do papel. */
export type NamedPermission =
  | 'modulo:campanhas'
  | 'modulo:conformidade'
  | 'modulo:qualificacao'
  | 'modulo:integracoes'
  | 'tese:definir_preco'
  | 'advogado:liberar_acesso'
  | 'lead:aprovar_devolucao'
  | 'conformidade:liberar_com_ressalva'
  | 'credito:conciliar_pagamento'
  | 'assistente:financeiro';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  /** Texto livre. Poucas regras usam, mas as que usam são pesadas (CNF-R21). */
  departamento: string | null;
  permissoes: NamedPermission[];
  /**
   * Preenchido só para o papel `advogado`. É a chave de isolamento do sistema:
   * um advogado nunca pode ver a carteira de leads de outro (LED-R06).
   */
  advogado_id: string | null;
  avatar_iniciais: string;
}

/**
 * ACC-R21 — usuário nunca é excluído, é desativado. O histórico de quem emitiu
 * parecer, liberou acesso e comprou lead precisa continuar apontando para
 * alguém — inclusive porque é ele que responde como o cliente foi direcionado.
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
  | 'leads'
  | 'advogados'
  | 'teses'
  | 'qualificacao'
  | 'campanhas'
  | 'conformidade'
  | 'precos'
  | 'creditos'
  | 'integracoes'
  | 'config';

/** ✅ acesso · 🔎 leitura restrita · ⛔ bloqueado */
export type AccessLevel = 'full' | 'restricted' | 'blocked';

// ---------------------------------------------------------------------------
// Teses — as linhas de produto
// ---------------------------------------------------------------------------

/**
 * Cada tese tem público, oferta e roteiro de qualificação próprios. Não é
 * rótulo de categoria: é o que determina quais perguntas a IA faz, quem é
 * elegível e quanto o lead custa em crédito.
 */
export type TeseId = 'polo_passivo' | 'vinculo_empregaticio' | 'juros_abusivos';

export const TESE_LABEL: Record<TeseId, string> = {
  polo_passivo: 'Consultoria em polo passivo',
  vinculo_empregaticio: 'Reconhecimento de vínculo',
  juros_abusivos: 'Juros abusivos',
};

/** Rótulo curto, para caber em etiqueta de cartão e coluna de tabela. */
export const TESE_CURTA: Record<TeseId, string> = {
  polo_passivo: 'Polo passivo',
  vinculo_empregaticio: 'Vínculo',
  juros_abusivos: 'Juros abusivos',
};

/** Um filtro de elegibilidade da tese, avaliado durante a qualificação. */
export interface FiltroElegibilidade {
  id: string;
  /** O que a IA precisa apurar. */
  rotulo: string;
  /** Por que o filtro existe — vira texto de tela, não fica só no comentário. */
  motivo: string;
  /** ID da regra que sustenta o filtro (`TES-R01`…). */
  regra: string;
}

export interface Tese {
  id: TeseId;
  nome: string;
  /** Área do direito. Serve ao advogado, que escolhe onde atua. */
  area: string;
  publico: string;
  oferta: string;
  /**
   * Consulta paga com valor simbólico, quando existe. Nulo = consulta gratuita.
   * A taxa filtra curiosos e já gera receita na primeira interação.
   */
  consultaPaga: { min: number; max: number } | null;
  filtros: FiltroElegibilidade[];
  /**
   * Urgência real do caso — prazo prescricional, por exemplo. Sai da lei, não
   * do roteiro de vendas: urgência fabricada é o que transforma qualificação em
   * pressão indevida sobre quem já está vulnerável.
   */
  urgencia: string | null;
  /** Cuidados de abordagem: ritmo, linguagem e o que nunca perguntar. */
  cuidados: string[];
  /** Preço vigente. CRE-R03 — congela no lead no momento da publicação. */
  custoCreditos: number;
  precoAvulso: number;
}

// ---------------------------------------------------------------------------
// Lead — o produto
// ---------------------------------------------------------------------------

/**
 * Os 10 status do lead. É a máquina de estados do produto e não é
 * configurável.
 *
 * `reservado` não está aqui de propósito: reserva é trava temporária sobre um
 * lead `agendado`, com prazo de expiração, e não um estado do produto
 * (`LED-R04`). Modelar como status faria uma trava vencida virar lead perdido.
 */
export type LeadStatus =
  | 'novo'
  | 'em_qualificacao'
  | 'qualificado'
  | 'agendado'
  | 'vendido'
  | 'atendido'
  | 'desqualificado'
  | 'nao_atendeu'
  | 'no_show'
  | 'expirado';

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: 'Novo',
  em_qualificacao: 'Em qualificação',
  qualificado: 'Qualificado',
  agendado: 'Agendado',
  vendido: 'Vendido',
  atendido: 'Atendido',
  desqualificado: 'Desqualificado',
  nao_atendeu: 'Não atendeu',
  no_show: 'Faltou à reunião',
  expirado: 'Expirado',
};

/** Como o lead chegou. Hoje só há uma origem de verdade; o tipo antecipa mais. */
export type OrigemLead = 'meta_ads' | 'google_ads' | 'indicacao' | 'organico';

export const ORIGEM_LEAD_LABEL: Record<OrigemLead, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  indicacao: 'Indicação',
  organico: 'Orgânico',
};

/**
 * `LED-R08` — o que o advogado achou do lead depois de atender.
 *
 * É o único retorno que a Focus tem sobre a própria qualificação: sem ele, a
 * régua da IA só é avaliada pelo que se vê de dentro (taxa, duração, gravação),
 * e nunca pelo que aconteceu na consulta. A nota é do produto entregue, não do
 * cliente final — quem responde é quem pagou por ele.
 */
export interface AvaliacaoLead {
  /** De 1 a 5. */
  nota: number;
  /** Texto livre, opcional. */
  comentario: string | null;
  /** ISO. Imutável — a nota pode ser refeita, o carimbo da última fica. */
  em: string;
}

/**
 * O lead qualificado.
 *
 * `INV-11` — o telefone é o produto. Ele existe no registro, mas a tela só o
 * revela depois da compra; toda listagem de catálogo passa por
 * `mascararContato` antes de renderizar.
 *
 * `INV-17` — não há campo para senha, cartão, número de contrato ou qualquer
 * dado bancário do cliente final. A ausência do campo é o que sustenta a regra:
 * o que não se pode gravar não vaza.
 */
export interface Lead {
  id: string;
  /** Nome do cliente final. */
  nome: string;
  /** LED-R05 — só é revelado depois da compra. */
  telefone: string;
  tese: TeseId;
  uf: string;
  cidade: string;
  status: LeadStatus;
  origem: OrigemLead;
  /** Resumo da qualificação feita pela IA. É o que o advogado lê para decidir. */
  resumoQualificacao: string;
  /** Respostas aos filtros de elegibilidade da tese, por id do filtro. */
  elegibilidade: Record<string, boolean>;
  /** ISO. Nulo enquanto a reunião não for marcada. */
  reuniaoEm: string | null;
  /**
   * CRE-R03 — preço congelado na publicação. Mexer na tabela da tese depois não
   * pode reescrever o que já foi vendido nem o que já está anunciado.
   */
  custoCreditos: number;
  precoAvulso: number;
  /** LED-R03 — no máximo um comprador, para sempre. Nulo = ainda no catálogo. */
  compradoPor: string | null;
  /** ISO. Imutável — é o carimbo que prova quando e para quem o lead saiu. */
  compradoEm: string | null;
  /** LED-R04 — trava de checkout. Id do advogado e o instante em que vence. */
  reservadoPor: string | null;
  reservadoAte: string | null;
  /** QUA-R03 — sem isso não há como provar como o cliente foi direcionado. */
  temGravacao: boolean;
  criadoEm: string;
  ultimaAtividade: string;
  /** Obrigatório ao desqualificar. */
  motivoDesqualificacao: string | null;
  /** CRE-R05 — devolução registrada. O lead não volta ao catálogo mesmo assim. */
  devolucao: { motivo: string; em: string } | null;
  /** LED-R08 — nota do comprador, depois da consulta. Nulo enquanto não avaliou. */
  avaliacao: AvaliacaoLead | null;
}

// ---------------------------------------------------------------------------
// Advogado — o comprador, e o funil que o traz
// ---------------------------------------------------------------------------

/**
 * Os status do funil de aquisição do advogado, na ordem do fluxo real: ele vê
 * o anúncio, preenche formulário, passa por qualificação, recebe acesso,
 * escolhe o modelo de pagamento e faz a primeira compra.
 */
export type AdvogadoStatus =
  | 'novo'
  | 'em_qualificacao'
  | 'qualificado'
  | 'acesso_liberado'
  | 'modelo_definido'
  | 'ativo'
  | 'recusado'
  | 'perdido'
  | 'em_pausa';

export const ADVOGADO_STATUS_LABEL: Record<AdvogadoStatus, string> = {
  novo: 'Novo',
  em_qualificacao: 'Em qualificação',
  qualificado: 'Qualificado',
  acesso_liberado: 'Acesso liberado',
  modelo_definido: 'Modelo definido',
  ativo: 'Ativo',
  recusado: 'Recusado',
  perdido: 'Perdido',
  em_pausa: 'Em pausa',
};

/** Os dois modelos de pagamento. */
export type ModeloPagamento = 'avulso' | 'creditos';

export const MODELO_PAGAMENTO_LABEL: Record<ModeloPagamento, string> = {
  avulso: 'Por lead (avulso)',
  creditos: 'Pacote de créditos',
};

/** Porte do escritório. A Focus filtra por ele para manter a base coerente. */
export type PorteEscritorio = 'solo' | 'pequeno' | 'medio' | 'grande';

export const PORTE_LABEL: Record<PorteEscritorio, string> = {
  solo: 'Advogado solo',
  pequeno: 'Escritório pequeno',
  medio: 'Escritório médio',
  grande: 'Escritório grande',
};

/** Prioridade automática do quadro (ADV-R04). */
export type PrioridadeAdvogado = 'P1' | 'P2' | 'P3';

/**
 * O advogado: o registro que vai do anúncio à primeira compra e continua sendo
 * a ficha do cliente depois disso.
 *
 * `ADV-R01` — o título é sempre o nome do escritório ou do profissional. Não
 * existe título independente: quadro, tabela e notificações exibiam nome
 * desatualizado quando o cadastro era corrigido.
 */
export interface Advogado {
  id: string;
  /** Escritório ou nome do profissional. É o título do registro. */
  nome: string;
  /** Inscrição na OAB. INV-12 — sem ela conferida não se libera acesso. */
  oab: string;
  /** Nulo enquanto a inscrição não foi conferida por alguém do time. */
  oabConferidaEm: string | null;
  email: string;
  whatsapp: string;
  uf: string;
  /** Teses em que atua. LED-R06 — define o que ele enxerga no catálogo. */
  teses: TeseId[];
  /** Regiões que acompanha. Vazio = o estado inteiro. */
  cidades: string[];
  porte: PorteEscritorio;
  status: AdvogadoStatus;
  modeloPagamento: ModeloPagamento | null;
  /** Leads/mês que ele diz conseguir absorver. Dirige a prioridade (ADV-R04). */
  potencialMensal: number;
  /** CRE-R04 — nunca negativo. */
  saldoCreditos: number;
  /** Conta de acesso, criada só na liberação (INV-12). */
  usuarioId: string | null;
  /** Sobrescreve a prioridade automática quando o gestor decide. */
  prioridadeManual: PrioridadeAdvogado | null;
  responsavelId: string;
  criadoPor: string;
  /** ISO. Imutável. */
  criadoEm: string;
  /** ISO. ADV-R06 — toda ação relevante atualiza este marcador. */
  ultimaAtividade: string;
  /** ADV-R05 — obrigatório ao marcar como perdido. */
  motivoPerda: string | null;
}

// ---------------------------------------------------------------------------
// Créditos
// ---------------------------------------------------------------------------

/**
 * Movimento do extrato de crédito. O saldo do advogado é a soma disto — nunca
 * um número editável à mão, senão `INV-15` (consumido fecha com comprado) não
 * tem como ser verificado.
 */
export type TipoMovimento = 'compra' | 'consumo' | 'devolucao' | 'ajuste';

export const TIPO_MOVIMENTO_LABEL: Record<TipoMovimento, string> = {
  compra: 'Compra de pacote',
  consumo: 'Lead adquirido',
  devolucao: 'Devolução de lead',
  ajuste: 'Ajuste manual',
};

export interface MovimentoCredito {
  id: string;
  advogadoId: string;
  tipo: TipoMovimento;
  /** Positivo entra, negativo sai. */
  creditos: number;
  /** Em reais. Zero quando o movimento não envolve dinheiro. */
  valor: number;
  /** Preenchido em consumo e devolução. */
  leadId: string | null;
  descricao: string;
  /** ISO. Imutável. */
  em: string;
}

/** Pacote de créditos à venda. Desconto por volume é o incentivo do modelo B. */
export interface PacoteCredito {
  id: string;
  nome: string;
  creditos: number;
  valor: number;
  destaque: boolean;
}

// ---------------------------------------------------------------------------
// Conformidade publicitária
// ---------------------------------------------------------------------------

/**
 * As cinco decisões do parecer.
 *
 * `INV-16` — a Focus AI anuncia captando clientela para advogado, então o
 * Provimento 205 incide sobre o anúncio dela, não sobre o do cliente.
 */
export type DecisaoConformidade =
  | 'aprovado'
  | 'aprovado_com_ressalva'
  | 'exigir_ajuste'
  | 'pendencia_documental'
  | 'reprovado';

export const DECISAO_LABEL: Record<DecisaoConformidade, string> = {
  aprovado: 'Aprovado',
  aprovado_com_ressalva: 'Aprovado com ressalva',
  exigir_ajuste: 'Exigir ajuste',
  pendencia_documental: 'Pendência documental',
  reprovado: 'Reprovado',
};

export interface Parecer {
  id: string;
  /** Nome do criativo avaliado. */
  criativo: string;
  tese: TeseId;
  plataforma: PlataformaAnuncio;
  decisao: DecisaoConformidade | null;
  /** ISO. INV-13 — imutável. É o carimbo que prova quando a peça foi avaliada. */
  emitidoEm: string | null;
  emitidoPor: string | null;
  /** ISO. O cronômetro do SLA corre a partir daqui (CNF-R01). */
  enviadoEm: string;
  observacao: string | null;
}

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

export type PlataformaAnuncio = 'meta' | 'google';

export const PLATAFORMA_LABEL: Record<PlataformaAnuncio, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
};

export type SituacaoCampanha = 'ativa' | 'pausada' | 'aprendizado' | 'encerrada';

export const SITUACAO_CAMPANHA_LABEL: Record<SituacaoCampanha, string> = {
  ativa: 'Ativa',
  pausada: 'Pausada',
  aprendizado: 'Em aprendizado',
  encerrada: 'Encerrada',
};

/**
 * Uma campanha por tese e plataforma. O número que importa não é o custo por
 * lead bruto: é o **custo por lead qualificado**, porque lead que a IA
 * desqualifica não vira produto e não gera receita nenhuma.
 */
export interface Campanha {
  id: string;
  nome: string;
  tese: TeseId;
  plataforma: PlataformaAnuncio;
  situacao: SituacaoCampanha;
  /** Verba diária, em reais. */
  verbaDiaria: number;
  gastoMes: number;
  leadsMes: number;
  leadsQualificadosMes: number;
  /** Criativos no ar. INV-16 — nenhum sobe sem parecer aprovado. */
  criativosNoAr: number;
  criativosSemParecer: number;
}

// ---------------------------------------------------------------------------
// Qualificação por IA
// ---------------------------------------------------------------------------

export type ResultadoLigacao =
  | 'qualificado'
  | 'desqualificado'
  | 'nao_atendeu'
  | 'reagendar'
  | 'em_andamento';

export const RESULTADO_LIGACAO_LABEL: Record<ResultadoLigacao, string> = {
  qualificado: 'Qualificado',
  desqualificado: 'Desqualificado',
  nao_atendeu: 'Não atendeu',
  reagendar: 'Reagendar',
  em_andamento: 'Em andamento',
};

/** Uma tentativa de ligação da SDR de voz. */
export interface Ligacao {
  id: string;
  leadId: string;
  /** Nome do lead, desnormalizado para a fila não precisar cruzar. */
  leadNome: string;
  tese: TeseId;
  tentativa: number;
  resultado: ResultadoLigacao;
  /** Segundos. Zero quando não atendeu. */
  duracao: number;
  /** QUA-R03 — sem gravação não há prova de como o cliente foi direcionado. */
  temGravacao: boolean;
  em: string;
}

/**
 * Uma ligação com o detalhe completo — o que a ficha do lead mostra, não a
 * fila. Fica separada de `Ligacao` de propósito: a fila lista muitas linhas de
 * uma vez e não precisa carregar transcrição de cada uma, só a ficha do lead
 * aberto precisa do detalhe inteiro.
 */
export interface LigacaoDetalhada extends Ligacao {
  resumo: string | null;
  /** INV-13 — a prova de como a ligação foi conduzida. */
  transcricao: string | null;
  gravacaoUrl: string | null;
  motivoEncerramento: string | null;
}

// ---------------------------------------------------------------------------
// Integrações
// ---------------------------------------------------------------------------

/**
 * A frente que a integração serve: um dos quatro elos da cadeia, ou a
 * plataforma que sustenta os quatro (sessão, banco, publicação).
 */
export type FrenteIntegracao = EloDaCadeia | 'plataforma';

export const FRENTE_INTEGRACAO_LABEL: Record<FrenteIntegracao, string> = {
  plataforma: 'Plataforma',
  captar: 'Captar',
  qualificar: 'Qualificar',
  agendar: 'Agendar',
  entregar: 'Entregar',
};

/**
 * Integração que **já opera**: tem código neste repositório e um caminho de
 * verificação que qualquer um roda.
 *
 * Não há telemetria de último evento aqui de propósito. Carimbo de horário que
 * ninguém mede é dado inventado, e integração é justamente a tela onde dado
 * inventado engana quem precisa decidir se pode confiar na etapa.
 */
export interface IntegracaoAtiva {
  id: string;
  nome: string;
  /** O que ela faz pelo sistema, em uma frase. */
  papel: string;
  /** Onde o código dela vive. */
  onde: string;
  /** Como se confere que continua de pé. */
  verificacao: string;
  /** IDs das regras que ela carrega. */
  regras: string[];
}

/**
 * O que destrava a integração — a pergunta prática de quem lê a lista.
 *
 * `servico_externo` espera decisão de fora do repositório: contratar, criar
 * conta, pegar chave. `codigo_proprio` é trabalho que já pode começar hoje.
 * Misturar os dois numa lista só faz o que depende de nós parecer bloqueado
 * por terceiro, que é a leitura mais cara possível de uma lista de pendência.
 */
export type DependenciaIntegracao = 'servico_externo' | 'codigo_proprio';

export const DEPENDENCIA_INTEGRACAO_LABEL: Record<DependenciaIntegracao, string> = {
  servico_externo: 'Serviço externo',
  codigo_proprio: 'Código nosso',
};

/**
 * Integração que o sistema **ainda não tem**.
 *
 * `API-R10` — configuração ausente não pode virar silêncio. A lista existe para
 * que etapa que não acontece apareça em algum lugar, em vez de sumir sem erro.
 */
export interface IntegracaoPendente {
  id: string;
  nome: string;
  frente: FrenteIntegracao;
  dependencia: DependenciaIntegracao;
  /** O que ela vai fazer quando existir. */
  papel: string;
  /** O que não acontece enquanto ela não existir. */
  semEla: string;
  /** IDs das regras que ela vai carregar desde o primeiro commit. */
  regras: string[];
}

// ---------------------------------------------------------------------------
// Painel de entrada
// ---------------------------------------------------------------------------

/**
 * As quatro máquinas encadeadas do produto.
 *
 * Vocabulário compartilhado: o painel usa para os cards da cadeia, e as
 * integrações usam para dizer qual elo cada uma serve.
 */
export type EloDaCadeia = 'captar' | 'qualificar' | 'agendar' | 'entregar';

/** Um estágio da cadeia: captar → qualificar → agendar → entregar. */
export interface EtapaCadeia {
  id: EloDaCadeia;
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

/** Recorte do catálogo por tese, para o painel. */
export interface EstoquePorTese {
  tese: TeseId;
  /** Agendados e ainda sem comprador. */
  disponiveis: number;
  vendidosMes: number;
  /** Custo médio por lead qualificado, em reais. */
  custoPorQualificado: number;
  receitaMes: number;
}
