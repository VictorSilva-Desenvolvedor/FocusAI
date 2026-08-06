import { identificador } from '@/src/lib/identificador';
import type { Lead, LeadStatus, OrigemLead, TeseId } from '@/types';

const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const horas = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const emHoras = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

/**
 * Preço por tese, congelado no lead na publicação (CRE-R03).
 *
 * Fica antes do bloco de dados de propósito: `LEADS_SEED` é avaliado na carga
 * do módulo e chama `l()`, que lê esta tabela. Declarada depois, ela ainda está
 * na zona morta temporal e o app quebra na inicialização.
 */
const PRECO: Record<TeseId, { creditos: number; avulso: number }> = {
  polo_passivo: { creditos: 30, avulso: 40 },
  vinculo_empregaticio: { creditos: 30, avulso: 40 },
  juros_abusivos: { creditos: 30, avulso: 40 },
};

/** Pela mesma razão de `PRECO`: `l()` lê isto durante a carga do módulo. */
const DDD: Record<string, string> = { SP: '11', GO: '62', MG: '31', RJ: '21' };

/**
 * Catálogo de exemplo. Dado fictício, e continua fictício — inclusive os
 * telefones, que são a única coisa que o advogado compra de verdade.
 *
 * A distribuição é intencional:
 *  - dois leads travados por elegibilidade, para a recusa de publicação aparecer;
 *  - três com reunião dentro de 48h ainda sem comprador, que é o desperdício
 *    que o painel precisa gritar;
 *  - um reservado por outro advogado, com trava ainda válida;
 *  - um vendido sem gravação, que é a pendência de QUA-R03;
 *  - um devolvido, que continua fora do catálogo (CRE-R05).
 */
export const LEADS_SEED: Lead[] = [
  // --- novo ----------------------------------------------------------------
  l('Antônio Pereira Rocha', 'polo_passivo', 'GO', 'Goiânia', 'novo', 2, {
    resumo: 'Formulário preenchido informando que recebeu citação. Ainda sem contato da IA.',
  }),
  l('Marlene Souza Dias', 'juros_abusivos', 'SP', 'Campinas', 'novo', 1, {
    resumo: 'Preencheu o formulário citando desconto alto no consignado. Aguardando primeira ligação.',
  }),
  l('Wesley Cardoso Lima', 'vinculo_empregaticio', 'MG', 'Belo Horizonte', 'novo', 0, {
    resumo: 'Formulário informando trabalho como PJ por período longo. Fila da IA.',
  }),
  l('Sandra Regina Alves', 'juros_abusivos', 'SP', 'São Paulo', 'novo', 0, {
    resumo: 'Entrou por anúncio de revisão de financiamento de veículo.',
  }),

  // --- em_qualificacao -----------------------------------------------------
  l('Roberto Nunes Filho', 'polo_passivo', 'GO', 'Anápolis', 'em_qualificacao', 1, {
    resumo: 'Primeira ligação em andamento. Confirmou ser réu em ação de cobrança.',
    elegibilidade: { parte_no_processo: true },
    gravacao: true,
  }),
  l('Cleusa Martins Barbosa', 'juros_abusivos', 'RJ', 'Niterói', 'em_qualificacao', 1, {
    resumo: 'Segunda tentativa. Tem consignado e cartão; ritmo de conversa mais devagar.',
    elegibilidade: { tem_contrato: true },
    gravacao: true,
  }),

  // --- qualificado ---------------------------------------------------------
  l('Jonas Ribeiro Teles', 'vinculo_empregaticio', 'SP', 'Guarulhos', 'qualificado', 2, {
    resumo:
      'Trabalhou 14 meses como MEI para uma transportadora, com jornada e subordinação. Saiu há 8 meses.',
    elegibilidade: { minimo_tres_meses: true, saida_ate_dois_anos: true },
    gravacao: true,
  }),
  // Trava de propósito: qualificado, mas sem confirmar o prazo de 2 anos —
  // arrastar para "agendado" tem que ser recusado por TES-R02.
  l('Eliane Prado Moura', 'vinculo_empregaticio', 'MG', 'Contagem', 'qualificado', 3, {
    resumo: 'Trabalhou 2 anos sem carteira. Não soube precisar quando saiu — precisa reconfirmar.',
    elegibilidade: { minimo_tres_meses: true },
    gravacao: true,
  }),
  // Trava de propósito: não confirmou que é o advogado quem liga (TES-R05).
  l('Osvaldo Fernandes Pinto', 'juros_abusivos', 'GO', 'Aparecida de Goiânia', 'qualificado', 1, {
    resumo: 'Tem consignado com desconto de quase metade do benefício. Desconfiado da ligação.',
    elegibilidade: { tem_contrato: true },
    gravacao: true,
  }),

  // --- agendado: o catálogo -------------------------------------------------
  l('Maria de Lourdes Campos', 'juros_abusivos', 'SP', 'São Paulo', 'agendado', 3, {
    resumo:
      'Aposentada, 68 anos, com consignado e cheque especial. Desconto mensal comprometendo mais de 40% do benefício. Confirmou o horário e sabe que é o advogado quem liga.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: 26,
    gravacao: true,
  }),
  l('Carlos Eduardo Ramos', 'polo_passivo', 'GO', 'Goiânia', 'agendado', 4, {
    resumo:
      'Réu em execução de título extrajudicial. Advogado anterior parou de responder há 4 meses. Quer entender o estágio do processo e o risco de penhora.',
    elegibilidade: { parte_no_processo: true, sem_advogado_atuante: true },
    reuniao: 30,
    gravacao: true,
  }),
  // Vence em breve, de propósito: reunião em menos de 48h e sem comprador.
  l('Terezinha Gomes da Silva', 'juros_abusivos', 'SP', 'Santo André', 'agendado', 5, {
    resumo:
      'Aposentada, 71 anos, quatro consignados ativos contratados por telefone. Quer saber se dá para revisar.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: 19,
    gravacao: true,
  }),
  l('Fábio Henrique Braga', 'vinculo_empregaticio', 'MG', 'Belo Horizonte', 'agendado', 2, {
    resumo:
      'Entregador por aplicativo com escala fixa e cobrança de meta durante 11 meses. Saiu há 5 meses e guardou prints das escalas.',
    elegibilidade: { minimo_tres_meses: true, saida_ate_dois_anos: true },
    reuniao: 44,
    gravacao: true,
  }),
  l('Neusa Aparecida Lopes', 'polo_passivo', 'SP', 'Osasco', 'agendado', 6, {
    resumo:
      'Autora em ação de indenização parada há mais de um ano. Nunca conseguiu falar com o advogado que protocolou.',
    elegibilidade: { parte_no_processo: true, sem_advogado_atuante: true },
    reuniao: 40,
    gravacao: true,
  }),
  // Reservado por outro advogado, trava ainda válida.
  l('Sebastião Ferreira Alves', 'juros_abusivos', 'SP', 'São Paulo', 'agendado', 2, {
    resumo:
      'Aposentado, 63 anos, financiamento de veículo com parcela desproporcional à renda declarada.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: 52,
    gravacao: true,
    reservadoPor: 'adv-gomes-cia',
    reservaMinutos: 9,
  }),
  l('Juliana Castro Mendes', 'vinculo_empregaticio', 'GO', 'Goiânia', 'agendado', 1, {
    resumo:
      'Trabalhou 7 meses em clínica como PJ, com escala definida pela empresa. Saiu há 3 meses.',
    elegibilidade: { minimo_tres_meses: true, saida_ate_dois_anos: true },
    reuniao: 22,
    gravacao: true,
  }),

  // --- vendido --------------------------------------------------------------
  l('Antonia Barros Nogueira', 'polo_passivo', 'GO', 'Goiânia', 'vendido', 12, {
    resumo: 'Ré em ação de cobrança bancária, sem advogado. Reunião confirmada e realizada.',
    elegibilidade: { parte_no_processo: true, sem_advogado_atuante: true },
    reuniao: -18,
    gravacao: true,
    compradoPor: 'adv-prev-facil-advogados',
    compradoHa: 10,
  }),
  l('Reinaldo Souza Prado', 'juros_abusivos', 'SP', 'São Paulo', 'vendido', 9, {
    resumo: 'Aposentado com três consignados. Comprado por venda avulsa.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: -6,
    gravacao: true,
    compradoPor: 'adv-gomes-cia',
    compradoHa: 7,
  }),
  // Pendência de propósito: vendido sem gravação da qualificação (QUA-R03).
  l('Marcos Vinícius Tavares', 'vinculo_empregaticio', 'SP', 'Guarulhos', 'vendido', 8, {
    resumo: 'Motorista sem carteira por 9 meses. Gravação não foi capturada pela ferramenta de voz.',
    elegibilidade: { minimo_tres_meses: true, saida_ate_dois_anos: true },
    reuniao: -12,
    gravacao: false,
    compradoPor: 'adv-prev-facil-advogados',
    compradoHa: 6,
  }),

  // --- atendido -------------------------------------------------------------
  l('Vera Lúcia Andrade', 'juros_abusivos', 'SP', 'São Bernardo do Campo', 'atendido', 22, {
    resumo: 'Consulta realizada. Advogado identificou caso de revisão de consignado.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: -240,
    gravacao: true,
    compradoPor: 'adv-gomes-cia',
    compradoHa: 20,
    nota: 5,
    comentarioDaNota: 'O caso era exatamente o descrito no resumo. Cliente chegou informado.',
  }),
  l('Gilberto Nascimento Cruz', 'polo_passivo', 'GO', 'Trindade', 'atendido', 30, {
    resumo: 'Consulta realizada. Panorama entregue e contrato de acompanhamento fechado.',
    elegibilidade: { parte_no_processo: true, sem_advogado_atuante: true },
    reuniao: -300,
    gravacao: true,
    compradoPor: 'adv-prev-facil-advogados',
    compradoHa: 28,
  }),

  // --- desfechos ------------------------------------------------------------
  {
    ...l('Paulo Sérgio Batista', 'vinculo_empregaticio', 'SP', 'São Paulo', 'desqualificado', 6, {
      resumo: 'Trabalhou 5 semanas apenas — abaixo do mínimo de 3 meses.',
      elegibilidade: { saida_ate_dois_anos: true },
      gravacao: true,
    }),
    motivoDesqualificacao: 'Menos de 3 meses de vínculo (TES-R01).',
  },
  {
    ...l('Ivone Ribeiro Santos', 'vinculo_empregaticio', 'MG', 'Uberlândia', 'desqualificado', 11, {
      resumo: 'Saiu do emprego há 4 anos — fora do prazo prescricional.',
      elegibilidade: { minimo_tres_meses: true },
      gravacao: true,
    }),
    motivoDesqualificacao: 'Saída há mais de 2 anos (TES-R02).',
  },
  l('Edson Carvalho Pinto', 'polo_passivo', 'RJ', 'Rio de Janeiro', 'nao_atendeu', 7, {
    resumo: 'Três tentativas de ligação sem atendimento.',
    gravacao: false,
  }),
  l('Rosana Lima Ferreira', 'juros_abusivos', 'SP', 'Sorocaba', 'no_show', 14, {
    resumo: 'Reunião marcada e não compareceu. Advogado registrou a falta.',
    elegibilidade: { tem_contrato: true, confirmou_agendamento: true },
    reuniao: -60,
    gravacao: true,
    compradoPor: 'adv-gomes-cia',
    compradoHa: 15,
    nota: 2,
    comentarioDaNota: 'Cliente confirmou por telefone e não apareceu.',
  }),
  // CRE-R05 — devolvido, crédito reposto, e mesmo assim fora do catálogo:
  // o contato já foi exposto, então INV-10 continua valendo.
  {
    ...l('Hélio Monteiro Dias', 'polo_passivo', 'GO', 'Goiânia', 'expirado', 18, {
      resumo: 'Processo já encerrado na consulta — não havia o que analisar.',
      elegibilidade: { parte_no_processo: true, sem_advogado_atuante: true },
      reuniao: -120,
      gravacao: true,
      compradoPor: 'adv-prev-facil-advogados',
      compradoHa: 16,
    }),
    devolucao: {
      motivo: 'Processo já transitado em julgado — sem objeto para a consultoria.',
      em: dias(14),
    },
  },
];

interface Extras {
  resumo: string;
  elegibilidade?: Record<string, boolean>;
  /** Horas até a reunião. Negativo = já aconteceu. */
  reuniao?: number;
  gravacao?: boolean;
  compradoPor?: string;
  compradoHa?: number;
  reservadoPor?: string;
  reservaMinutos?: number;
  origem?: OrigemLead;
  /** LED-R08 — nota que o comprador deu depois da consulta. */
  nota?: number;
  comentarioDaNota?: string;
}

/**
 * Espalha o nome inteiro, não só o comprimento dele. A versão anterior usava
 * `nome.length` como semente e dois clientes de nome do mesmo tamanho recebiam
 * o mesmo telefone — o que contradiz a própria validação de duplicidade e faz
 * a maquete mostrar dois produtos com o mesmo contato.
 */
function semente(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function l(
  nome: string,
  tese: TeseId,
  uf: string,
  cidade: string,
  status: LeadStatus,
  diasDeVida: number,
  extras: Extras,
): Lead {
  const h = semente(nome);
  const preco = PRECO[tese];

  return {
    id: `lead-${identificador(nome)}`,
    nome,
    telefone: `(${DDD[uf] ?? '61'}) 9${String(8000 + (h % 1999))}-${String(
      1000 + (Math.floor(h / 1999) % 8999),
    )}`,
    tese,
    uf,
    cidade,
    status,
    origem: extras.origem ?? 'meta_ads',
    resumoQualificacao: extras.resumo,
    elegibilidade: extras.elegibilidade ?? {},
    reuniaoEm: extras.reuniao !== undefined ? emHoras(extras.reuniao) : null,
    custoCreditos: preco.creditos,
    precoAvulso: preco.avulso,
    direcionadoPara: null,
    compradoPor: extras.compradoPor ?? null,
    compradoEm: extras.compradoHa !== undefined ? dias(extras.compradoHa) : null,
    reservadoPor: extras.reservadoPor ?? null,
    reservadoAte:
      extras.reservaMinutos !== undefined
        ? new Date(Date.now() + extras.reservaMinutos * 60_000).toISOString()
        : null,
    temGravacao: extras.gravacao ?? false,
    criadoEm: dias(diasDeVida),
    ultimaAtividade: horas(Math.max(1, Math.min(diasDeVida * 4, 240))),
    motivoDesqualificacao: null,
    devolucao: null,
    avaliacao:
      extras.nota !== undefined
        ? { nota: extras.nota, comentario: extras.comentarioDaNota ?? null, em: dias(1) }
        : null,
  };
}
