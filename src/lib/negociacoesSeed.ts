import type { Negociacao } from '@/types';

const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/**
 * Carteira de exemplo. A distribuição é intencional: muita coisa parada no
 * topo, poucas contas ativas, e três negociações passando de 12 dias sem
 * interação para o congelamento aparecer no quadro.
 */
export const NEGOCIACOES_SEED: Negociacao[] = [
  // --- em_andamento --------------------------------------------------------
  n('Silva & Associados', 'OAB', 'Previdenciário', 12_000, 'em_andamento', 'u-closer', 3, 16, 'Indicação'),
  n('Dra. Marques Odontologia', 'CFO', 'Odontologia', 8_000, 'em_andamento', 'u-sdr', 1, 9, 'Mídia paga'),
  n('Peixoto Advocacia', 'OAB', 'Trabalhista', 6_500, 'em_andamento', 'u-closer', 0, 4, 'Inbound / site'),
  n('Clínica Bem Viver', 'CFM', 'Medicina', 19_000, 'em_andamento', 'u-sdr', 2, 21, 'Prospecção ativa'),
  n('Nunes Contabilidade', 'CFC', 'Contabilidade', 4_200, 'em_andamento', 'u-closer', 6, 6, 'Parceiro'),
  n('Barros & Lima', null, '', 9_000, 'em_andamento', 'u-sdr', 18, 30, 'Evento'),
  n('Psicóloga Marina Reis', 'CFP', 'Psicologia', 3_100, 'em_andamento', 'u-sdr', 0, 2, 'Mídia paga'),

  // --- diagnostico_realizado ----------------------------------------------
  n('Escritório Andrade', 'OAB', 'Trabalhista', 22_000, 'diagnostico_realizado', 'u-closer', 2, 24, 'Indicação'),
  n('Tributário Vieira', 'OAB', 'Tributário', 31_000, 'diagnostico_realizado', 'u-closer', 5, 33, 'Prospecção ativa'),
  n('Odonto Sorriso Real', 'CFO', 'Odontologia', 7_400, 'diagnostico_realizado', 'u-sdr', 13, 27, 'Mídia paga'),
  n('Castro Advogados', 'OAB', 'Família e Sucessões', 11_500, 'diagnostico_realizado', 'u-closer', 1, 12, 'Inbound / site'),

  // --- proposta_enviada ----------------------------------------------------
  n('Mendonça Previdência', 'OAB', 'Previdenciário', 26_000, 'proposta_enviada', 'u-closer', 9, 41, 'Indicação'),
  n('Contabilidade Nova Era', 'CFC', 'Contabilidade', 15_800, 'proposta_enviada', 'u-closer', 4, 29, 'Parceiro'),
  n('Freitas Criminalista', 'OAB', 'Criminal', 13_200, 'proposta_enviada', 'u-sdr', 16, 38, 'Prospecção ativa'),
  n('Clínica Odonto Vida', 'CFO', 'Odontologia', 6_900, 'proposta_enviada', 'u-sdr', 2, 18, 'Mídia paga'),

  // --- contrato_assinado ---------------------------------------------------
  n('Rocha & Teixeira', 'OAB', 'Consumidor', 18_000, 'contrato_assinado', 'u-closer', 3, 52, 'Indicação'),
  n('Dr. Salgado Ortopedia', 'CFM', 'Medicina', 24_500, 'contrato_assinado', 'u-closer', 1, 47, 'Evento'),

  // --- em_conformidade -----------------------------------------------------
  n('Albuquerque Trabalhista', 'OAB', 'Trabalhista', 20_000, 'em_conformidade', 'u-cs', 2, 61, 'Indicação'),
  n('Contabiliza Fácil', 'CFC', 'Contabilidade', 9_600, 'em_conformidade', 'u-cs', 4, 55, 'Inbound / site'),

  // --- conta_ativa ---------------------------------------------------------
  n('Prev Fácil Advogados', 'OAB', 'Previdenciário', 34_000, 'conta_ativa', 'u-cs', 1, 190, 'Indicação'),
  n('Sorriso & Cia', 'CFO', 'Odontologia', 12_800, 'conta_ativa', 'u-cs', 3, 145, 'Mídia paga'),
  n('Gomes Tributário', 'OAB', 'Tributário', 28_400, 'conta_ativa', 'u-cs', 2, 120, 'Prospecção ativa'),

  // --- desfechos -----------------------------------------------------------
  {
    ...n('Vasconcelos Advocacia', 'OAB', 'Criminal', 7_000, 'perdido', 'u-closer', 22, 60, 'Mídia paga'),
    motivoPerda: 'Fechou com agência concorrente por preço.',
  },
  n('Dra. Helena Dermato', 'CFM', 'Medicina', 16_000, 'em_pausa', 'u-sdr', 30, 88, 'Indicação'),
  {
    ...n('Ferreira & Souza', 'OAB', 'Consumidor', 10_500, 'reprovado', 'u-cs', 5, 70, 'Parceiro'),
  },
];

function n(
  cliente: string,
  conselho: Negociacao['conselho'],
  nicho: string,
  verbaMensal: number,
  status: Negociacao['status'],
  responsavelId: string,
  diasSemInteracao: number,
  diasDeVida: number,
  origem: string,
): Negociacao {
  return {
    id: `neg-${cliente.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
    cliente,
    whatsapp: `(62) 9${String(8000 + (cliente.length * 137) % 1999)}-${String(1000 + (cliente.length * 311) % 8999)}`,
    conselho,
    nicho,
    verbaMensal,
    status,
    prioridadeManual: null,
    origem,
    responsavelId,
    criadoPor: 'u-gerente',
    criadaEm: dias(diasDeVida),
    ultimaAtividade: dias(diasSemInteracao),
    motivoPerda: null,
  };
}
