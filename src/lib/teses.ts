import type { Tese, TeseId } from '@/types';

/**
 * `TES-R07` — as três teses custam o mesmo: 30 créditos, ou R$ 40 avulso.
 *
 * O preço mora aqui, e não numa constante global, porque a estrutura precisa
 * continuar suportando preço por tese: se um dia o custo de aquisição de uma
 * delas subir, é este número que muda, sozinho. Hoje eles são iguais de
 * propósito — o advogado escolhe o caso pelo caso, não pela etiqueta, e tabela
 * diferente por tese empurraria a carteira para a tese mais barata em vez da
 * mais adequada.
 *
 * O par avulso × crédito é a decisão comercial: 30 créditos valem R$ 30
 * (`CRE-R07`), então quem recarrega paga R$ 10 a menos por lead do que quem
 * compra avulso. É essa diferença que dá razão para a recarga existir.
 */
const CUSTO_EM_CREDITOS = 30;
const PRECO_AVULSO = 40;

/**
 * As três teses trabalhadas.
 *
 * Cada uma tem público, oferta e roteiro próprios — não é categoria de
 * catálogo. O que está aqui determina quais perguntas a IA faz, quem é
 * elegível e quanto o lead custa.
 *
 * Os filtros de elegibilidade não são preferência comercial: são requisitos
 * legais. Publicar um lead que não os atende é vender ao advogado um caso que
 * ele vai recusar na primeira leitura — e cada recusa dessas custa a confiança
 * no catálogo inteiro, não só aquele lead.
 */
export const TESES: Tese[] = [
  {
    id: 'polo_passivo',
    nome: 'Consultoria em polo passivo',
    area: 'Processual — réu ou autor em ação em curso',
    publico:
      'Pessoas que estão sendo processadas ou que processaram alguém, sem advogado atuante ou com advogado que não responde.',
    oferta:
      'Consulta paga, de valor simbólico, com panorama completo do processo: como ele está, o que esperar e um plano de próximos passos.',
    /*
     * A taxa simbólica faz três coisas ao mesmo tempo: filtra quem tem
     * intenção real de resolver, já gera receita na primeira interação, e abre
     * porta para um caso maior se o advogado identificar oportunidade. Por isso
     * o valor fica no registro da tese, e não escondido no roteiro de vendas.
     */
    consultaPaga: { min: 100, max: 200 },
    filtros: [
      {
        id: 'parte_no_processo',
        rotulo: 'É parte no processo (réu ou autor)',
        motivo:
          'Quem não é parte não tem processo a analisar — a consulta não tem objeto.',
        regra: 'TES-R04',
      },
      {
        id: 'sem_advogado_atuante',
        rotulo: 'Está sem advogado atuante, ou com advogado que não responde',
        motivo:
          'Abordar quem já tem advogado atuando é captação sobre cliente alheio. O filtro é ético antes de ser comercial.',
        regra: 'TES-R04',
      },
    ],
    urgencia: null,
    cuidados: [
      'Pergunta aberta primeiro ("me conta o que está acontecendo"): a narrativa revela se é réu ou autor e se há advogado atuando, sem virar interrogatório.',
      'Qualificar o mínimo necessário e agendar rápido — quem está sendo processado quer resposta, não formulário.',
    ],
    custoCreditos: CUSTO_EM_CREDITOS,
    precoAvulso: PRECO_AVULSO,
  },
  {
    id: 'vinculo_empregaticio',
    nome: 'Reconhecimento de vínculo empregatício',
    area: 'Trabalhista',
    publico:
      'Trabalhadores que atuaram sem carteira assinada, ou como PJ/MEI onde havia de fato relação de emprego.',
    oferta:
      'Consulta gratuita em que o advogado analisa se o caso preenche os requisitos legais e orienta os próximos passos.',
    consultaPaga: null,
    filtros: [
      {
        id: 'minimo_tres_meses',
        rotulo: 'Ao menos 3 meses trabalhados',
        motivo:
          'Abaixo disso o conjunto de provas raramente sustenta o reconhecimento, e o caso morre na primeira análise.',
        regra: 'TES-R01',
      },
      {
        id: 'saida_ate_dois_anos',
        rotulo: 'Saiu do emprego há no máximo 2 anos',
        motivo:
          'Passado o prazo prescricional bienal, o direito não é mais exigível na Justiça. Vender esse lead é vender um caso morto.',
        regra: 'TES-R02',
      },
    ],
    /*
     * TES-R02 — a urgência sai da lei, não do roteiro. Prazo prescricional é
     * fato verificável; urgência fabricada é pressão sobre quem já está numa
     * situação ruim, e é o que separa qualificação de assédio comercial.
     */
    urgencia: 'Prazo de até 2 anos após a saída do emprego para buscar o direito na Justiça.',
    cuidados: [
      'A urgência citada é sempre o prazo real de 2 anos. Nada de prazo inventado ou "última semana".',
      'PJ ou MEI "disfarçado" conta como sem carteira — a pergunta é sobre como o trabalho acontecia, não sobre o contrato assinado.',
    ],
    custoCreditos: CUSTO_EM_CREDITOS,
    precoAvulso: PRECO_AVULSO,
  },
  {
    id: 'juros_abusivos',
    nome: 'Juros abusivos — revisão de contrato bancário',
    area: 'Consumidor e bancário',
    publico:
      'Principalmente pessoas de 55 anos ou mais, com consignado, cartão de crédito, cheque especial ou financiamento com juros desproporcionais.',
    oferta:
      'Consulta gratuita em que o advogado revisa o contrato e orienta sobre a possibilidade de revisão judicial.',
    consultaPaga: null,
    filtros: [
      {
        id: 'tem_contrato',
        rotulo: 'Tem contrato de crédito ativo (consignado, cartão, cheque especial ou financiamento)',
        motivo: 'Sem contrato não há o que revisar.',
        regra: 'TES-R06',
      },
      {
        id: 'confirmou_agendamento',
        rotulo: 'Confirmou que é o advogado quem liga na hora marcada',
        motivo:
          'Público mais visado por golpe. Deixar explícito quem liga e quando é o que separa a consulta de mais uma ligação suspeita.',
        regra: 'TES-R05',
      },
    ],
    urgencia: null,
    /*
     * TES-R03 — nunca solicitar dado bancário sensível. A regra se sustenta na
     * ausência do campo: não existe onde gravar senha, cartão ou número de
     * contrato (`INV-17`). Pedir isso a este público reproduz exatamente o
     * roteiro do golpe que ele teme — e o dado não serve à qualificação.
     */
    cuidados: [
      'Nunca pedir senha, número de cartão ou dado bancário. Não há campo no sistema para gravar isso (INV-17).',
      'Ritmo de conversa mais devagar e linguagem sem jargão jurídico.',
      'Detalhar o processo além do usual: é o público mais leigo e mais exposto a golpe.',
      'Deixar claro, sempre, que é o advogado quem liga na hora marcada.',
    ],
    custoCreditos: CUSTO_EM_CREDITOS,
    precoAvulso: PRECO_AVULSO,
  },
];

export const TESE_POR_ID = Object.fromEntries(TESES.map((t) => [t.id, t])) as Record<TeseId, Tese>;

export const TESE_IDS = TESES.map((t) => t.id);

/**
 * Avalia as respostas da qualificação contra os filtros da tese.
 *
 * Função pura de propósito: é a regra que decide se um lead vira produto, e
 * precisa ser verificável sem montar tela nenhuma (`LED-R01`).
 */
export function avaliarElegibilidade(
  teseId: TeseId,
  respostas: Record<string, boolean>,
): { elegivel: boolean; pendentes: string[] } {
  const tese = TESE_POR_ID[teseId];
  if (!tese) return { elegivel: false, pendentes: ['Tese não encontrada.'] };

  const pendentes = tese.filtros.filter((f) => respostas[f.id] !== true).map((f) => f.rotulo);
  return { elegivel: pendentes.length === 0, pendentes };
}

/** Quantos filtros a tese exige. Usado para desenhar o progresso na tela. */
export function totalDeFiltros(teseId: TeseId): number {
  return TESE_POR_ID[teseId]?.filtros.length ?? 0;
}
