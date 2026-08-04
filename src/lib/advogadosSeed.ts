import { identificador } from '@/src/lib/identificador';
import type { Advogado, AdvogadoStatus, ModeloPagamento, PorteEscritorio, TeseId } from '@/types';

const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/**
 * Carteira de exemplo. Dado fictício, e continua fictício.
 *
 * A distribuição é intencional: muita gente parada no topo do funil, poucos
 * ativos de fato, dois passando de 12 dias sem interação para o congelamento
 * aparecer na lista, e três casos que travam de propósito na liberação de
 * acesso — um sem inscrição conferida, um sem tese e um sem modelo escolhido.
 */
export const ADVOGADOS_SEED: Advogado[] = [
  // --- novo ----------------------------------------------------------------
  a('Silva & Associados', '104238/GO', 'GO', ['polo_passivo'], 'pequeno', 12, 'novo', 'u-cs', 3, 16),
  a('Marques Advocacia', '087611/SP', 'SP', ['vinculo_empregaticio'], 'solo', 6, 'novo', 'u-gerente', 1, 9),
  a('Peixoto Sociedade de Advogados', '221904/MG', 'MG', ['juros_abusivos'], 'medio', 25, 'novo', 'u-cs', 0, 4),
  a('Dra. Helena Prado', '045172/DF', 'DF', ['polo_passivo', 'juros_abusivos'], 'solo', 8, 'novo', 'u-gerente', 2, 21),
  a('Nunes & Barbosa', '133870/PR', 'PR', ['vinculo_empregaticio'], 'pequeno', 10, 'novo', 'u-cs', 6, 6),
  a('Escritório Vasconcelos', '190455/BA', 'BA', ['polo_passivo'], 'medio', 22, 'novo', 'u-gerente', 18, 30),

  // --- em_qualificacao -----------------------------------------------------
  a('Andrade Trabalhista', '076329/SP', 'SP', ['vinculo_empregaticio'], 'medio', 30, 'em_qualificacao', 'u-cs', 2, 24),
  a('Vieira Consumidor', '158802/RJ', 'RJ', ['juros_abusivos'], 'grande', 45, 'em_qualificacao', 'u-cs', 5, 33),
  a('Sorriso Advocacia', '203117/CE', 'CE', ['polo_passivo'], 'solo', 5, 'em_qualificacao', 'u-gerente', 13, 27),
  // Inscrição já conferida, mas ainda em qualificação: isola ADV-R02 do
  // bloqueio de INV-12 — sem ele, os dois motivos de recusa se sobrepõem e
  // nunca dá para ver qual dos dois está agindo.
  a('Castro Advogados', '118460/RS', 'RS', ['polo_passivo', 'vinculo_empregaticio'], 'pequeno', 14, 'em_qualificacao', 'u-cs', 1, 12, { oabConferida: 6 }),

  // --- qualificado ---------------------------------------------------------
  a('Mendonça Previdência', '099274/GO', 'GO', ['polo_passivo'], 'medio', 28, 'qualificado', 'u-cs', 9, 41, { oabConferida: 12 }),
  a('Nova Era Advocacia', '167053/SC', 'SC', ['juros_abusivos'], 'pequeno', 16, 'qualificado', 'u-cs', 4, 29, { oabConferida: 8 }),
  // Trava de propósito: qualificado, potencial alto, mas inscrição não
  // conferida — arrastar para "acesso liberado" tem que ser recusado.
  a('Freitas & Freitas', '241988/PE', 'PE', ['vinculo_empregaticio'], 'grande', 40, 'qualificado', 'u-gerente', 16, 38),
  // Trava de propósito: inscrição conferida, mas nenhuma tese marcada.
  a('Ribeiro Sociedade Individual', '062715/ES', 'ES', [], 'solo', 7, 'qualificado', 'u-gerente', 2, 18, { oabConferida: 5 }),

  // --- acesso_liberado -----------------------------------------------------
  a('Rocha & Teixeira', '145600/MG', 'MG', ['polo_passivo', 'juros_abusivos'], 'medio', 24, 'acesso_liberado', 'u-cs', 3, 52, { oabConferida: 40 }),
  a('Salgado Advocacia', '178322/PA', 'PA', ['vinculo_empregaticio'], 'pequeno', 11, 'acesso_liberado', 'u-cs', 1, 47, { oabConferida: 35 }),

  // --- modelo_definido -----------------------------------------------------
  a('Albuquerque Trabalhista', '090184/SP', 'SP', ['vinculo_empregaticio'], 'grande', 50, 'modelo_definido', 'u-cs', 2, 61, { oabConferida: 55, modelo: 'creditos' }),
  a('Contabiliza Jurídico', '212045/GO', 'GO', ['juros_abusivos'], 'pequeno', 9, 'modelo_definido', 'u-cs', 4, 55, { oabConferida: 50, modelo: 'avulso' }),

  // --- ativo ---------------------------------------------------------------
  a('Prev Fácil Advogados', '033901/GO', 'GO', ['polo_passivo', 'vinculo_empregaticio'], 'grande', 60, 'ativo', 'u-cs', 1, 190, { oabConferida: 185, modelo: 'creditos', saldo: 390, usuario: 'u-advogado' }),
  a('Gomes & Cia', '124773/SP', 'SP', ['juros_abusivos'], 'medio', 32, 'ativo', 'u-cs', 3, 145, { oabConferida: 140, modelo: 'creditos', saldo: 120, usuario: 'u-advogado-2' }),
  // Saldo zerado com leads disponíveis na tese e na região dele: é o caso que
  // prova CRE-R04 na tela — o botão de comprar não é desenhado, em vez de ser
  // desenhado e falhar no clique.
  a('Teixeira Bancário', '186640/SP', 'SP', ['juros_abusivos', 'polo_passivo'], 'pequeno', 18, 'ativo', 'u-cs', 2, 120, { oabConferida: 116, modelo: 'creditos', saldo: 0, usuario: 'u-advogado-3' }),

  // --- desfechos -----------------------------------------------------------
  {
    ...a('Bastos Advocacia', '155208/MT', 'MT', ['polo_passivo'], 'solo', 4, 'perdido', 'u-cs', 22, 60),
    motivoPerda: 'Achou o preço por lead alto para o ticket médio da região.',
  },
  {
    ...a('Lima Consultoria Jurídica', '270311/AM', 'AM', ['juros_abusivos'], 'pequeno', 12, 'recusado', 'u-gerente', 30, 88),
    motivoPerda: 'Inscrição suspensa no momento da conferência.',
  },
  a('Dourado & Filhos', '141007/PB', 'PB', ['vinculo_empregaticio'], 'medio', 20, 'em_pausa', 'u-cs', 25, 75, { oabConferida: 70 }),
];

interface Extras {
  oabConferida?: number;
  modelo?: ModeloPagamento;
  saldo?: number;
  usuario?: string;
}

function a(
  nome: string,
  oab: string,
  uf: string,
  teses: TeseId[],
  porte: PorteEscritorio,
  potencialMensal: number,
  status: AdvogadoStatus,
  responsavelId: string,
  diasSemInteracao: number,
  diasDeVida: number,
  extras: Extras = {},
): Advogado {
  return {
    id: `adv-${identificador(nome, 24)}`,
    nome,
    oab,
    oabConferidaEm: extras.oabConferida !== undefined ? dias(extras.oabConferida) : null,
    email: `contato@${nome.toLowerCase().replace(/[^a-z0-9]+/g, '')}.adv.br`.slice(0, 48),
    whatsapp: `(62) 9${String(8000 + (nome.length * 137) % 1999)}-${String(1000 + (nome.length * 311) % 8999)}`,
    uf,
    teses,
    cidades: [],
    porte,
    status,
    modeloPagamento: extras.modelo ?? null,
    potencialMensal,
    saldoCreditos: extras.saldo ?? 0,
    usuarioId: extras.usuario ?? null,
    prioridadeManual: null,
    responsavelId,
    criadoPor: 'u-gerente',
    criadoEm: dias(diasDeVida),
    ultimaAtividade: dias(diasSemInteracao),
    motivoPerda: null,
  };
}
