import type {
  AlertaOperacional,
  ChipTrabalhoHoje,
  EstoquePorTese,
  EtapaCadeia,
  Usuario,
} from '@/types';

/**
 * Dados de maquete. Nenhuma chamada de rede ainda — quando o backend entrar,
 * este arquivo some e as consultas passam a viver na camada de serviço
 * (`API-R06`: a regra de leitura é do módulo, não da view).
 *
 * Todo dado aqui é fictício e continua fictício.
 */

/** Datas relativas a hoje, para o "último acesso" não envelhecer na maquete. */
const diasAtras = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/**
 * O e-mail destas contas **é** o e-mail de login.
 *
 * Quem autentica é o Supabase, e `perfilLocal()` de `src/lib/sessao.ts` casa o
 * perfil que volta de lá com a linha daqui pelo e-mail. Mudar um endereço sem
 * mudar a conta correspondente no banco faz o login cair no seed do mesmo papel
 * — funciona por acidente, com o nome errado na barra superior.
 *
 * As contas sem par no banco (`u-criativo-2`, `u-conformidade-2`,
 * `u-operador-ia-2`, `u-inativo`) existem para as telas terem o que exercer:
 * convite pendente, permissão sem efeito por departamento (`CNF-R21`), conta
 * desativada. Ninguém entra por elas.
 */
export const USUARIOS_SEED: Usuario[] = [
  {
    id: 'u-adm',
    nome: 'Victor Paulo',
    email: 'victorpaulodev@focus.ai',
    role: 'adm',
    departamento: 'Tecnologia',
    permissoes: [
      'modulo:campanhas',
      'modulo:conformidade',
      'modulo:qualificacao',
      'modulo:integracoes',
      'tese:definir_preco',
      'advogado:liberar_acesso',
      'lead:aprovar_devolucao',
      'credito:conciliar_pagamento',
      'assistente:financeiro',
    ],
    advogado_id: null,
    avatar_iniciais: 'VP',
    status: 'ativo',
    criado_em: diasAtras(420),
    criado_por: null,
    ultimo_acesso: horasAtras(1),
  },
  {
    id: 'u-gerente',
    nome: 'Marina Alencar',
    email: 'gerente@focus.ai',
    role: 'gerente',
    departamento: 'Operações',
    permissoes: [
      'modulo:integracoes',
      'tese:definir_preco',
      'advogado:liberar_acesso',
      'lead:aprovar_devolucao',
    ],
    advogado_id: null,
    avatar_iniciais: 'MA',
    status: 'ativo',
    criado_em: diasAtras(390),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(4),
  },
  {
    id: 'u-gestor',
    nome: 'Bruno Tavares',
    email: 'gestortrafego@focus.ai',
    role: 'gestor_trafego',
    departamento: 'Tráfego',
    permissoes: ['modulo:campanhas', 'modulo:integracoes'],
    advogado_id: null,
    avatar_iniciais: 'BT',
    status: 'ativo',
    criado_em: diasAtras(310),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(2),
  },
  {
    id: 'u-criativo',
    nome: 'Lia Fontes',
    email: 'criativo@focus.ai',
    role: 'criativo',
    departamento: 'Criação',
    permissoes: [],
    advogado_id: null,
    avatar_iniciais: 'LF',
    status: 'ativo',
    criado_em: diasAtras(198),
    criado_por: 'u-gestor',
    ultimo_acesso: horasAtras(3),
  },
  {
    id: 'u-criativo-2',
    nome: 'Caio Werneck',
    email: 'caio@focus.ai',
    role: 'criativo',
    departamento: 'Criação',
    permissoes: [],
    advogado_id: null,
    avatar_iniciais: 'CW',
    status: 'convite_pendente',
    criado_em: diasAtras(4),
    criado_por: 'u-gestor',
    ultimo_acesso: null,
  },
  {
    id: 'u-conformidade',
    nome: 'Rafaela Costa',
    email: 'analistaconformidade@focus.ai',
    role: 'analista_conformidade',
    departamento: 'Conformidade',
    permissoes: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
    advogado_id: null,
    avatar_iniciais: 'RC',
    status: 'ativo',
    criado_em: diasAtras(275),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(6),
  },
  {
    id: 'u-conformidade-2',
    nome: 'Otávio Lins',
    email: 'otavio@focus.ai',
    role: 'analista_conformidade',
    // Fora do departamento Conformidade de propósito: a permissão de liberar
    // com ressalva está marcada mas não tem efeito (CNF-R21). A tela avisa.
    departamento: 'Operações',
    permissoes: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
    advogado_id: null,
    avatar_iniciais: 'OL',
    status: 'ativo',
    criado_em: diasAtras(42),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(3),
  },
  {
    id: 'u-operador-ia',
    nome: 'Tiago Bezerra',
    email: 'operadoria@focus.ai',
    role: 'operador_ia',
    departamento: 'Qualificação',
    permissoes: ['modulo:qualificacao'],
    advogado_id: null,
    avatar_iniciais: 'TB',
    status: 'ativo',
    criado_em: diasAtras(150),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(1),
  },
  {
    id: 'u-operador-ia-2',
    nome: 'Rita Camargo',
    email: 'rita@focus.ai',
    role: 'operador_ia',
    departamento: 'Qualificação',
    permissoes: ['modulo:qualificacao'],
    advogado_id: null,
    avatar_iniciais: 'RC',
    status: 'ativo',
    criado_em: diasAtras(64),
    criado_por: 'u-gerente',
    ultimo_acesso: horasAtras(8),
  },
  {
    id: 'u-cs',
    nome: 'Júlia Andrade',
    email: 'cs@focus.ai',
    role: 'cs',
    departamento: 'Customer Success',
    // É CS que conduz o funil do advogado desde que os papéis de vendas humana
    // saíram: liberar acesso é dela, e continua sendo permissão nomeada.
    permissoes: ['advogado:liberar_acesso', 'lead:aprovar_devolucao'],
    advogado_id: null,
    avatar_iniciais: 'JA',
    status: 'ativo',
    criado_em: diasAtras(165),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(2),
  },
  {
    id: 'u-financeiro',
    nome: 'Paula Reis',
    email: 'financeiro@focus.ai',
    role: 'financeiro',
    departamento: 'Financeiro',
    permissoes: ['credito:conciliar_pagamento', 'lead:aprovar_devolucao'],
    advogado_id: null,
    avatar_iniciais: 'PR',
    status: 'ativo',
    criado_em: diasAtras(300),
    criado_por: 'u-adm',
    ultimo_acesso: horasAtras(7),
  },

  /*
   * Contas de advogado. Não nascem do painel de usuários (INV-12): cada uma
   * corresponde a um registro do funil que teve a inscrição conferida e o
   * acesso liberado. `advogado_id` é a chave de isolamento — é ela que impede
   * um advogado de enxergar a carteira do outro (LED-R06).
   */
  {
    id: 'u-advogado',
    nome: 'Prev Fácil Advogados',
    email: 'advogado@focus.ai',
    role: 'advogado',
    departamento: null,
    permissoes: [],
    advogado_id: 'adv-prev-facil-advogados',
    avatar_iniciais: 'PA',
    status: 'ativo',
    criado_em: diasAtras(185),
    criado_por: 'u-cs',
    ultimo_acesso: horasAtras(3),
  },
  {
    id: 'u-advogado-2',
    nome: 'Gomes & Cia',
    email: 'advogado2@focus.ai',
    role: 'advogado',
    departamento: null,
    permissoes: [],
    advogado_id: 'adv-gomes-cia',
    avatar_iniciais: 'GC',
    status: 'ativo',
    criado_em: diasAtras(140),
    criado_por: 'u-cs',
    ultimo_acesso: diasAtras(1),
  },
  {
    // Saldo zerado de propósito: é o caso que prova CRE-R04 — sem saldo o botão
    // de comprar não existe, em vez de existir e falhar no clique.
    id: 'u-advogado-3',
    nome: 'Teixeira Bancário',
    email: 'advogado3@focus.ai',
    role: 'advogado',
    departamento: null,
    permissoes: [],
    advogado_id: 'adv-teixeira-bancario',
    avatar_iniciais: 'TB',
    status: 'ativo',
    criado_em: diasAtras(116),
    criado_por: 'u-cs',
    ultimo_acesso: horasAtras(20),
  },
  {
    id: 'u-inativo',
    nome: 'Renata Vilela',
    email: 'renata@focus.ai',
    role: 'cs',
    departamento: 'Customer Success',
    permissoes: [],
    advogado_id: null,
    avatar_iniciais: 'RV',
    status: 'inativo',
    criado_em: diasAtras(380),
    criado_por: 'u-gerente',
    ultimo_acesso: diasAtras(64),
  },
];

/**
 * As quatro máquinas encadeadas do negócio.
 *
 * Os números de captar, agendar e entregar são recalculados na tela a partir do
 * store real de leads — o que está aqui é a moldura e o texto. Painel dizendo
 * um número enquanto o catálogo mostra outro é o tipo de divergência que faz
 * gestão parar de confiar nos dois.
 */
export const CADEIA: EtapaCadeia[] = [
  {
    id: 'captar',
    titulo: 'Captar o lead',
    descricao: 'Anúncio e formulário, por tese',
    valor: '—',
    unidade: 'leads em 30 dias',
    detalhe: 'Meta Ads em três teses',
    variacao: 14.2,
    rota: '/campanhas',
    modulo: 'campanhas',
  },
  {
    id: 'qualificar',
    titulo: 'Qualificar com a IA',
    descricao: 'Fila da SDR de voz',
    valor: '—',
    unidade: 'na fila',
    detalhe: 'Filtros de elegibilidade por tese',
    variacao: -6.4,
    rota: '/qualificacao',
    modulo: 'qualificacao',
  },
  {
    id: 'agendar',
    titulo: 'Agendar a reunião',
    descricao: 'É o agendamento que vira produto',
    valor: '—',
    unidade: 'no catálogo',
    detalhe: 'Disponíveis para compra agora',
    variacao: null,
    rota: '/leads',
    modulo: 'leads',
  },
  {
    id: 'entregar',
    titulo: 'Entregar ao advogado',
    descricao: 'Compra, contato liberado, consulta',
    valor: '—',
    unidade: 'vendidos em 30 dias',
    detalhe: 'Crédito consumido e venda avulsa',
    variacao: 22.8,
    rota: '/creditos',
    modulo: 'creditos',
  },
];

/**
 * "Meu Trabalho Hoje" — barra de contadores calculada ao vivo na tela.
 * Nada disso existe gravado no banco.
 */
export const TRABALHO_HOJE: ChipTrabalhoHoje[] = [
  {
    id: 'fila-ia',
    rotulo: 'Na fila da IA',
    valor: 0,
    criterio: 'Leads em novo ou em_qualificacao',
    tom: 'neutro',
  },
  {
    id: 'catalogo',
    rotulo: 'No catálogo',
    valor: 0,
    criterio: 'Agendados, sem comprador e com reserva livre',
    tom: 'positivo',
  },
  {
    id: 'reuniao-amanha',
    rotulo: 'Reunião em 48h sem comprador',
    valor: 0,
    criterio: 'Agendado, reunião nas próximas 48h e ninguém comprou — o produto vence',
    tom: 'critico',
  },
  {
    id: 'sem-gravacao',
    rotulo: 'Vendidos sem gravação',
    valor: 0,
    criterio: 'QUA-R03 — sem gravação não há como provar como o cliente foi direcionado',
    tom: 'atencao',
  },
  {
    id: 'vendidos-mes',
    rotulo: 'Vendidos em 30 dias',
    valor: 0,
    criterio: 'Leads com comprador carimbado nos últimos 30 dias',
    tom: 'neutro',
  },
];

export const ALERTAS: AlertaOperacional[] = [
  {
    id: 'a1',
    severidade: 'critico',
    titulo: 'Validação jurídica do Provimento 205 ainda pendente',
    descricao:
      'Um intermediário que dá a múltiplos advogados acesso a dados de possíveis clientes levanta questão de captação de clientela. A revisão por especialista em ética profissional não impede construir — impede lançar comercialmente.',
    regra: 'INV-16',
    modulo: 'conformidade',
  },
  {
    id: 'a2',
    severidade: 'critico',
    titulo: '1 criativo no ar prometendo resultado',
    descricao:
      'Anúncio veiculando "garantimos seu benefício". Quem anuncia captando clientela para advogado responde pela peça — derrubar antes de qualquer outra coisa.',
    regra: 'CNF-R04',
    modulo: 'conformidade',
  },
  {
    id: 'a3',
    severidade: 'alto',
    titulo: 'Reuniões nas próximas 48h ainda sem comprador',
    descricao:
      'O produto é perecível: passada a hora marcada, o lead não vale mais nada e o custo de aquisição vira prejuízo direto.',
    regra: 'LED-R02',
    modulo: 'leads',
  },
  {
    id: 'a4',
    severidade: 'alto',
    titulo: 'Leads vendidos sem gravação da qualificação',
    descricao:
      'Sem a gravação não há como demonstrar, perante o conselho, como aquele cliente foi direcionado àquele advogado. A prova é do momento da ligação e não se produz depois.',
    regra: 'QUA-R03',
    modulo: 'qualificacao',
  },
  {
    id: 'a5',
    severidade: 'medio',
    titulo: 'Advogados ativos sem tese ou região definidas',
    descricao:
      'O painel deles abre vazio e o aviso de lead novo nunca dispara. Pagam pelo acesso e não recebem produto — a conta cancela sozinha no mês seguinte.',
    regra: 'ADV-R03',
    modulo: 'advogados',
  },
  {
    id: 'a6',
    severidade: 'medio',
    titulo: 'Advogados ativos com saldo zerado',
    descricao:
      'Continuam recebendo aviso de lead novo e não conseguem comprar nenhum. É frustração de quem já pagou pelo acesso.',
    regra: 'CRE-R04',
    modulo: 'creditos',
  },
];

/**
 * Recorte do catálogo por tese, para o painel.
 *
 * O número que importa não é o custo por lead bruto e sim o **custo por lead
 * qualificado**: lead que a IA desqualifica não vira produto e não gera receita
 * nenhuma, mas custou anúncio igual.
 */
export const ESTOQUE_POR_TESE: EstoquePorTese[] = [
  {
    tese: 'polo_passivo',
    disponiveis: 0,
    vendidosMes: 84,
    custoPorQualificado: 24.1,
    receitaMes: 3_360,
  },
  {
    tese: 'vinculo_empregaticio',
    disponiveis: 0,
    vendidosMes: 62,
    custoPorQualificado: 19.6,
    receitaMes: 2_480,
  },
  {
    tese: 'juros_abusivos',
    disponiveis: 0,
    vendidosMes: 71,
    custoPorQualificado: 27.4,
    receitaMes: 2_840,
  },
];
