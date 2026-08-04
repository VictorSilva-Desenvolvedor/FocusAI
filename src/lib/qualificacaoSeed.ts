import type { Campanha, Integracao, Ligacao, Parecer } from '@/types';

const horas = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/**
 * Fila de ligações de exemplo. Dado fictício, e continua fictício.
 *
 * Há dois casos plantados de propósito: uma ligação qualificada sem gravação
 * capturada — a pendência de `QUA-R03` — e um lead na terceira tentativa sem
 * atendimento, que é onde a régua para.
 */
export const LIGACOES_SEED: Ligacao[] = [
  g('lead-roberto-nunes-filho', 'Roberto Nunes Filho', 'polo_passivo', 1, 'em_andamento', 0, true, 0.2),
  g('lead-cleusa-martins-barbosa', 'Cleusa Martins Barbosa', 'juros_abusivos', 2, 'em_andamento', 0, true, 0.5),
  g('lead-jonas-ribeiro-teles', 'Jonas Ribeiro Teles', 'vinculo_empregaticio', 1, 'qualificado', 284, true, 3),
  g('lead-eliane-prado-moura', 'Eliane Prado Moura', 'vinculo_empregaticio', 2, 'reagendar', 96, true, 5),
  g('lead-osvaldo-fernandes-pinto', 'Osvaldo Fernandes Pinto', 'juros_abusivos', 1, 'reagendar', 143, true, 7),
  g('lead-maria-de-lourdes-campos', 'Maria de Lourdes Campos', 'juros_abusivos', 1, 'qualificado', 412, true, 20),
  g('lead-carlos-eduardo-ramos', 'Carlos Eduardo Ramos', 'polo_passivo', 2, 'qualificado', 356, true, 26),
  g('lead-terezinha-gomes-da-silva', 'Terezinha Gomes da Silva', 'juros_abusivos', 1, 'qualificado', 488, true, 30),
  g('lead-fabio-henrique-braga', 'Fábio Henrique Braga', 'vinculo_empregaticio', 1, 'qualificado', 301, true, 34),
  g('lead-neusa-aparecida-lopes', 'Neusa Aparecida Lopes', 'polo_passivo', 1, 'qualificado', 264, true, 40),
  g('lead-juliana-castro-mendes', 'Juliana Castro Mendes', 'vinculo_empregaticio', 1, 'qualificado', 233, true, 12),
  // QUA-R03 — qualificado, virou produto, e a gravação não foi capturada.
  g('lead-marcos-vinicius-tavares', 'Marcos Vinícius Tavares', 'vinculo_empregaticio', 1, 'qualificado', 276, false, 190),
  g('lead-paulo-sergio-batista', 'Paulo Sérgio Batista', 'vinculo_empregaticio', 1, 'desqualificado', 122, true, 140),
  g('lead-ivone-ribeiro-santos', 'Ivone Ribeiro Santos', 'vinculo_empregaticio', 1, 'desqualificado', 158, true, 260),
  g('lead-edson-carvalho-pinto', 'Edson Carvalho Pinto', 'polo_passivo', 3, 'nao_atendeu', 0, false, 160),
  g('lead-edson-carvalho-pinto', 'Edson Carvalho Pinto', 'polo_passivo', 2, 'nao_atendeu', 0, false, 168),
  g('lead-edson-carvalho-pinto', 'Edson Carvalho Pinto', 'polo_passivo', 1, 'nao_atendeu', 0, false, 176),
];

function g(
  leadId: string,
  leadNome: string,
  tese: Ligacao['tese'],
  tentativa: number,
  resultado: Ligacao['resultado'],
  duracao: number,
  temGravacao: boolean,
  horasAtras: number,
): Ligacao {
  return {
    id: `lig-${leadId.slice(5, 24)}-${tentativa}`,
    leadId,
    leadNome,
    tese,
    tentativa,
    resultado,
    duracao,
    temGravacao,
    em: horas(horasAtras),
  };
}

/**
 * Campanhas de exemplo. O número que decide é o custo por lead **qualificado**:
 * lead que a IA desqualifica custou anúncio igual e não virou produto nenhum.
 *
 * As verbas estão dimensionadas contra o teto de R$ 40, que é o preço avulso do
 * lead (`TES-R07`): campanha que gasta mais do que isso por qualificado paga
 * para entregar. Só a de busca no Google passa do teto, e é justamente por isso
 * que ela aparece pausada — é o caso que a tela existe para mostrar.
 */
export const CAMPANHAS_SEED: Campanha[] = [
  {
    id: 'cmp-pp-meta',
    nome: 'Polo passivo — processo parado',
    tese: 'polo_passivo',
    plataforma: 'meta',
    situacao: 'ativa',
    verbaDiaria: 165,
    gastoMes: 4_455,
    leadsMes: 312,
    leadsQualificadosMes: 185,
    criativosNoAr: 6,
    criativosSemParecer: 0,
  },
  {
    id: 'cmp-pp-meta-2',
    nome: 'Polo passivo — citação recebida',
    tese: 'polo_passivo',
    plataforma: 'meta',
    situacao: 'aprendizado',
    verbaDiaria: 60,
    gastoMes: 1_080,
    leadsMes: 74,
    leadsQualificadosMes: 31,
    criativosNoAr: 3,
    // INV-16 — criativo no ar sem parecer é o alerta crítico do painel.
    criativosSemParecer: 1,
    },
  {
    id: 'cmp-vinc-meta',
    nome: 'Vínculo — PJ disfarçado',
    tese: 'vinculo_empregaticio',
    plataforma: 'meta',
    situacao: 'ativa',
    verbaDiaria: 140,
    gastoMes: 3_780,
    leadsMes: 288,
    leadsQualificadosMes: 193,
    criativosNoAr: 5,
    criativosSemParecer: 0,
  },
  {
    id: 'cmp-juros-meta',
    nome: 'Juros abusivos — consignado 55+',
    tese: 'juros_abusivos',
    plataforma: 'meta',
    situacao: 'ativa',
    verbaDiaria: 210,
    gastoMes: 5_670,
    leadsMes: 341,
    leadsQualificadosMes: 207,
    criativosNoAr: 7,
    criativosSemParecer: 0,
  },
  {
    id: 'cmp-juros-google',
    nome: 'Juros abusivos — busca por revisão',
    tese: 'juros_abusivos',
    plataforma: 'google',
    situacao: 'pausada',
    verbaDiaria: 0,
    gastoMes: 960,
    leadsMes: 46,
    leadsQualificadosMes: 19,
    criativosNoAr: 0,
    criativosSemParecer: 0,
  },
];

/**
 * Fila de pareceres. `INV-16` — quem anuncia captando clientela para advogado
 * responde pela peça, então o Provimento 205 incide sobre o anúncio da Focus.
 */
export const PARECERES_SEED: Parecer[] = [
  {
    id: 'par-1',
    criativo: 'Vídeo 30s — "seu processo está parado?"',
    tese: 'polo_passivo',
    plataforma: 'meta',
    decisao: 'aprovado',
    emitidoEm: dias(3),
    emitidoPor: 'u-conformidade',
    enviadoEm: dias(4),
    observacao: 'Linguagem informativa, sem promessa de resultado.',
  },
  {
    id: 'par-2',
    criativo: 'Estático — "garantimos seu benefício"',
    tese: 'vinculo_empregaticio',
    plataforma: 'meta',
    decisao: 'reprovado',
    emitidoEm: dias(1),
    emitidoPor: 'u-conformidade',
    enviadoEm: dias(2),
    observacao:
      'Promessa de resultado é vedada. A peça está no ar e precisa ser derrubada antes de qualquer ajuste.',
  },
  {
    id: 'par-3',
    criativo: 'Carrossel — "revisão de consignado"',
    tese: 'juros_abusivos',
    plataforma: 'meta',
    decisao: 'aprovado_com_ressalva',
    emitidoEm: dias(6),
    emitidoPor: 'u-conformidade',
    enviadoEm: dias(7),
    observacao: 'Aprovado sem a menção a percentual de desconto na primeira arte.',
  },
  {
    id: 'par-4',
    criativo: 'Vídeo 15s — depoimento de cliente',
    tese: 'polo_passivo',
    plataforma: 'meta',
    decisao: null,
    emitidoEm: null,
    emitidoPor: null,
    enviadoEm: horas(31),
    observacao: null,
  },
  {
    id: 'par-5',
    criativo: 'Estático — "trabalhou sem carteira?"',
    tese: 'vinculo_empregaticio',
    plataforma: 'meta',
    decisao: null,
    emitidoEm: null,
    emitidoPor: null,
    enviadoEm: horas(9),
    observacao: null,
  },
  {
    id: 'par-6',
    criativo: 'Landing — formulário de juros abusivos',
    tese: 'juros_abusivos',
    plataforma: 'meta',
    decisao: 'exigir_ajuste',
    emitidoEm: dias(2),
    emitidoPor: 'u-conformidade',
    enviadoEm: dias(3),
    observacao:
      'A página pedia número do contrato bancário. Campo removido: o sistema não guarda dado bancário do cliente final (INV-17).',
  },
];

/** Integrações e a saúde de cada uma. */
export const INTEGRACOES_SEED: Integracao[] = [
  {
    id: 'int-voz',
    nome: 'Ferramenta de voz (SDR de IA)',
    papel: 'Liga, conduz o roteiro da tese e devolve o resultado da qualificação',
    estado: 'ok',
    ultimoEvento: horas(0.2),
    temReconciliacao: true,
    detalhe: 'Entrega única por evento — a rotina de reconciliação roda a cada 15 min.',
  },
  {
    id: 'int-meta',
    nome: 'Meta Ads',
    papel: 'Recebe o formulário preenchido e devolve gasto e desempenho por campanha',
    estado: 'ok',
    ultimoEvento: horas(0.5),
    temReconciliacao: true,
    detalhe: 'Sincronização do gasto do dia anterior às 06h.',
  },
  {
    id: 'int-agenda',
    nome: 'Agenda de reuniões',
    papel: 'Marca o horário da consulta e devolve confirmação e falta',
    estado: 'atencao',
    ultimoEvento: horas(4),
    temReconciliacao: false,
    detalhe:
      'Sem rotina de reconciliação: evento perdido é agendamento perdido, e ninguém fica sabendo (API-R12).',
  },
  {
    id: 'int-pagamento',
    nome: 'Pagamento de créditos',
    papel: 'Confirma o pagamento do pacote — é o único gatilho que credita (INV-14)',
    estado: 'ok',
    ultimoEvento: horas(6),
    temReconciliacao: true,
    detalhe: 'Webhook idempotente por (identificador, tipo de evento).',
  },
  {
    id: 'int-whatsapp',
    nome: 'WhatsApp',
    papel: 'Avisa o advogado quando entra lead novo na tese e região que ele segue',
    estado: 'nao_configurada',
    ultimoEvento: null,
    temReconciliacao: false,
    detalhe:
      'Chave ausente. A etapa está sendo pulada e o aviso não sai — a falha aparece aqui em vez de virar silêncio (API-R10).',
  },
];
