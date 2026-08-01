import type {
  AlertaOperacional,
  ChipTrabalhoHoje,
  EtapaCadeia,
  NichoCarteira,
  Usuario,
} from '@/types';

/**
 * Dados de maquete. Nenhuma chamada de rede ainda — quando o backend entrar,
 * este arquivo some e as consultas passam a viver em src/services/api.ts.
 */

/** Datas relativas a hoje, para o "último acesso" não envelhecer na maquete. */
const diasAtras = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const USUARIOS_SEED: Usuario[] = [
  {
    id: 'u-adm',
    nome: 'Victor Paulo',
    email: 'victor@agencia.com.br',
    role: 'adm',
    departamento: 'Tecnologia',
    permissoes: [
      'modulo:campanhas',
      'modulo:conformidade',
      'modulo:plataformas',
      'verba:aprovar_realocacao',
      'auditoria:repasse_midia',
      'cobranca:receber_aviso_inadimplencia',
      'assistente:financeiro',
    ],
    white_label_id: null,
    avatar_iniciais: 'VP',
    status: 'ativo',
    criado_em: diasAtras(420),
    criado_por: null,
    ultimo_acesso: horasAtras(1),
  },
  {
    id: 'u-gerente',
    nome: 'Marina Alencar',
    email: 'marina@agencia.com.br',
    role: 'gerente',
    departamento: 'Operações',
    permissoes: ['modulo:plataformas', 'verba:aprovar_realocacao'],
    white_label_id: null,
    avatar_iniciais: 'MA',
    status: 'ativo',
    criado_em: diasAtras(390),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(4),
  },
  {
    id: 'u-gestor',
    nome: 'Bruno Tavares',
    email: 'bruno@agencia.com.br',
    role: 'gestor_trafego',
    departamento: 'Tráfego',
    permissoes: ['modulo:campanhas', 'modulo:plataformas'],
    white_label_id: null,
    avatar_iniciais: 'BT',
    status: 'ativo',
    criado_em: diasAtras(310),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(2),
  },
  {
    id: 'u-gestor-2',
    nome: 'Helena Braga',
    email: 'helena@agencia.com.br',
    role: 'gestor_trafego',
    departamento: 'Tráfego',
    permissoes: ['modulo:campanhas', 'modulo:plataformas'],
    white_label_id: null,
    avatar_iniciais: 'HB',
    status: 'ativo',
    criado_em: diasAtras(88),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(1),
  },
  {
    id: 'u-conformidade',
    nome: 'Rafaela Costa',
    email: 'rafaela@agencia.com.br',
    role: 'analista_conformidade',
    departamento: 'Conformidade',
    permissoes: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
    white_label_id: null,
    avatar_iniciais: 'RC',
    status: 'ativo',
    criado_em: diasAtras(275),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(6),
  },
  {
    id: 'u-conformidade-2',
    nome: 'Otávio Lins',
    email: 'otavio@agencia.com.br',
    role: 'analista_conformidade',
    // Fora do departamento Conformidade de propósito: a permissão de liberar
    // com ressalva está marcada mas não tem efeito (CNF-R21). A tela avisa.
    departamento: 'Operações',
    permissoes: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
    white_label_id: null,
    avatar_iniciais: 'OL',
    status: 'ativo',
    criado_em: diasAtras(42),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(3),
  },
  {
    id: 'u-criativo',
    nome: 'Lia Fontes',
    email: 'lia@agencia.com.br',
    role: 'criativo',
    departamento: 'Criação',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'LF',
    status: 'ativo',
    criado_em: diasAtras(198),
    criado_por: 'u-gestor',
    ultimo_acesso: horasAtras(3),
  },
  {
    id: 'u-criativo-2',
    nome: 'Caio Werneck',
    email: 'caio@agencia.com.br',
    role: 'criativo',
    departamento: 'Criação',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'CW',
    status: 'convite_pendente',
    criado_em: diasAtras(4),
    criado_por: 'u-gestor',
    ultimo_acesso: null,
  },
  {
    id: 'u-closer',
    nome: 'Diego Martins',
    email: 'diego@agencia.com.br',
    role: 'closer',
    departamento: 'Comercial',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'DM',
    status: 'ativo',
    criado_em: diasAtras(240),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(9),
  },
  {
    id: 'u-sdr',
    nome: 'Tainá Moreira',
    email: 'taina@agencia.com.br',
    role: 'sdr',
    departamento: 'Comercial',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'TM',
    status: 'ativo',
    criado_em: diasAtras(120),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(5),
  },
  {
    id: 'u-cs',
    nome: 'Júlia Andrade',
    email: 'julia@agencia.com.br',
    role: 'cs',
    departamento: 'Customer Success',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'JA',
    status: 'ativo',
    criado_em: diasAtras(165),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(2),
  },
  {
    id: 'u-financeiro',
    nome: 'Paula Reis',
    email: 'paula@agencia.com.br',
    role: 'financeiro',
    departamento: 'Financeiro',
    permissoes: ['cobranca:receber_pendentes', 'cobranca:receber_aviso_inadimplencia'],
    white_label_id: null,
    avatar_iniciais: 'PR',
    status: 'ativo',
    criado_em: diasAtras(300),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(7),
  },
  {
    id: 'u-parceiro',
    nome: 'Sérgio Bastos',
    email: 'sergio@indicaparceiros.com.br',
    role: 'parceiro',
    departamento: null,
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'SB',
    status: 'ativo',
    criado_em: diasAtras(75),
    criado_por: 'u-adm',
    ultimo_acesso: diasAtras(11),
  },
  {
    id: 'u-inativo',
    nome: 'Renata Vilela',
    email: 'renata@agencia.com.br',
    role: 'closer',
    departamento: 'Comercial',
    permissoes: [],
    white_label_id: null,
    avatar_iniciais: 'RV',
    status: 'inativo',
    criado_em: diasAtras(380),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(64),
  },
];

/** As quatro máquinas encadeadas do negócio. */
export const CADEIA: EtapaCadeia[] = [
  {
    id: 'captar',
    titulo: 'Captar o cliente',
    descricao: 'Negociações ativas no funil',
    valor: '284',
    unidade: 'negociações',
    detalhe: '41 com proposta enviada aguardando assinatura',
    variacao: 12.4,
    rota: '/crm',
    modulo: 'crm',
  },
  {
    id: 'aprovar',
    titulo: 'Aprovar a conformidade',
    descricao: 'Fila de parecer publicitário',
    valor: '17',
    unidade: 'na fila',
    detalhe: '3 fora do SLA de 24h · 5 aguardando ajuste do criativo',
    variacao: -8.1,
    rota: '/conformidade',
    modulo: 'conformidade',
  },
  {
    id: 'distribuir',
    titulo: 'Distribuir a verba',
    descricao: 'Ciclo AGO/2026',
    valor: '38 / 44',
    unidade: 'contas com verba aplicada',
    detalhe: '4 aguardando aprovação · 2 em rascunho',
    variacao: null,
    rota: '/campanhas',
    modulo: 'campanhas',
  },
  {
    id: 'cobrar',
    titulo: 'Cobrar o entregue',
    descricao: 'Fee + repasse de mídia',
    valor: 'R$ 412,8 mil',
    unidade: 'emitido',
    detalhe: '9,2% inadimplente · limite declarado 8%',
    variacao: 5.6,
    rota: '/financeiro',
    modulo: 'financeiro',
  },
];

/**
 * "Meu Trabalho Hoje" — barra de contadores calculada ao vivo na tela.
 * Nada disso existe gravado no banco.
 */
export const TRABALHO_HOJE: ChipTrabalhoHoje[] = [
  {
    id: 'propostas',
    rotulo: 'Propostas pendentes',
    valor: 41,
    criterio: 'Status proposta_enviada',
    tom: 'atencao',
  },
  {
    id: 'criativos',
    rotulo: 'Criativos reprovados',
    valor: 12,
    criterio: 'Último parecer com decisão "Exigir ajuste" ou "Reprovado"',
    tom: 'critico',
  },
  {
    id: 'sem-interacao',
    rotulo: 'Sem interação',
    valor: 23,
    criterio: '14 dias ou mais sem atividade (exceto encerrados)',
    tom: 'atencao',
  },
  {
    id: 'diagnosticos',
    rotulo: 'Diagnósticos hoje',
    valor: 7,
    criterio: 'Diagnóstico criado hoje ou entrada em diagnostico_realizado',
    tom: 'positivo',
  },
  {
    id: 'meta',
    rotulo: 'Meta do dia',
    valor: 8,
    meta: 10,
    criterio: 'Reuniões concluídas hoje',
    tom: 'neutro',
  },
];

/*
 * O funil por status não vive mais aqui: sai do NegociacoesContext, que é o
 * mesmo store do quadro do CRM. Dois números divergentes para a mesma pergunta
 * fazem gestão parar de confiar nos dois.
 */

/** Régua de cobrança (FIN-R32 / FIN-R34). */
export const REGUA_COBRANCA = [
  { marco: 'D-1', descricao: 'Vence amanhã', enviados: 96, canal: 'WhatsApp' },
  { marco: 'D+3', descricao: 'Venceu há 3 dias', enviados: 34, canal: 'WhatsApp' },
  { marco: 'D+10', descricao: 'Venceu há 10 dias', enviados: 18, canal: 'WhatsApp' },
  { marco: 'D+15', descricao: 'Alerta interno', enviados: 7, canal: 'Notificação' },
];

/** Situação das rotinas automáticas. */
export const ROTINAS = [
  { horario: 'a cada 1 min', nome: 'Fila de lembretes', estado: 'ok' as const },
  { horario: 'a cada 2 min', nome: 'Repasse de mídia às plataformas', estado: 'ok' as const },
  { horario: 'a cada 10 min', nome: 'Cache de métricas de campanha', estado: 'atencao' as const },
  { horario: 'a cada 15 min', nome: 'Contas estourando a verba do dia', estado: 'ok' as const },
  { horario: '06h00', nome: 'Sincronização do gasto de ontem', estado: 'ok' as const },
  { horario: '12h00', nome: 'Inadimplência D+15', estado: 'ok' as const },
];

/**
 * Carteira por nicho. O conselho regulador define qual régua de conformidade o
 * criativo enfrenta — não é rótulo decorativo.
 */
export const CARTEIRA_POR_NICHO: NichoCarteira[] = [
  { nicho: 'Previdenciário', conselho: 'OAB', contas: 14, verbaMes: 128_400, cpl: 18.4 },
  { nicho: 'Trabalhista', conselho: 'OAB', contas: 9, verbaMes: 76_200, cpl: 24.1 },
  { nicho: 'Família e Sucessões', conselho: 'OAB', contas: 7, verbaMes: 54_800, cpl: 31.7 },
  { nicho: 'Tributário', conselho: 'OAB', contas: 4, verbaMes: 61_500, cpl: 96.3 },
  { nicho: 'Contabilidade', conselho: 'CFC', contas: 5, verbaMes: 38_900, cpl: 27.5 },
  { nicho: 'Odontologia', conselho: 'CFO', contas: 3, verbaMes: 29_600, cpl: 42.8 },
  { nicho: 'Psicologia', conselho: 'CFP', contas: 2, verbaMes: 14_300, cpl: 36.2 },
];

export const ALERTAS: AlertaOperacional[] = [
  {
    id: 'a1',
    severidade: 'critico',
    titulo: '2 baixas manuais em faturas com repasse de mídia',
    descricao:
      'O repasse à plataforma não foi disparado — o gatilho é exclusivamente a confirmação bancária. As contas seguem sem saldo e as campanhas param no meio do ciclo.',
    regra: 'FIN-R25',
    modulo: 'financeiro',
  },
  {
    id: 'a2',
    severidade: 'critico',
    titulo: '1 criativo no ar com promessa de resultado',
    descricao:
      'Anúncio de cliente OAB veiculando "garantimos seu benefício". Captação indevida de clientela expõe o cliente a processo ético — derrubar antes de qualquer outra coisa.',
    regra: 'CNF-R04',
    modulo: 'conformidade',
  },
  {
    id: 'a3',
    severidade: 'alto',
    titulo: '3 pareceres fora do SLA de 24 horas',
    descricao:
      'O cronômetro corre desde o envio do criativo e só para quando o parecer é registrado.',
    regra: 'CNF-R01',
    modulo: 'conformidade',
  },
  {
    id: 'a4',
    severidade: 'alto',
    titulo: '1 conta gastando acima da verba contratada',
    descricao:
      'A soma distribuída não fecha com o contratado. Excesso de gasto é prejuízo direto da agência, não do cliente.',
    regra: 'VRB-R01',
    modulo: 'campanhas',
  },
  {
    id: 'a5',
    severidade: 'medio',
    titulo: '14 clientes em aberto sem WhatsApp cadastrado',
    descricao:
      'São cobranças que nunca serão avisadas — a régua inteira falha em silêncio, e sem os três avisos o alerta interno D+15 também não dispara.',
    regra: 'FIN-R36',
    modulo: 'financeiro',
  },
];
