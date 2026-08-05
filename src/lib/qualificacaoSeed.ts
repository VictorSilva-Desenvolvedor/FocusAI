import type { Campanha, Parecer } from '@/types';

const horas = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

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
