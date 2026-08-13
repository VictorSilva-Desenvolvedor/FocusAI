import type { Campanha, PlataformaAnuncio, SituacaoCampanha, TeseId } from '@/types';

/**
 * O custo por lead qualificado é o número que decide. Lead que a IA
 * desqualifica custou anúncio igual e não virou produto nenhum — otimizar pelo
 * custo bruto leva a campanha a comprar volume que morre na qualificação.
 */
export function custoPorQualificado(c: Campanha): number {
  if (c.leadsQualificadosMes === 0) return 0;
  return c.gastoMes / c.leadsQualificadosMes;
}

export function custoBruto(c: Campanha): number {
  if (c.leadsMes === 0) return 0;
  return c.gastoMes / c.leadsMes;
}

// ---------------------------------------------------------------------------
// Cadastro e edição
// ---------------------------------------------------------------------------

export interface CampanhaFormData {
  nome: string;
  tese: TeseId | '';
  plataforma: PlataformaAnuncio | '';
  situacao: SituacaoCampanha;
  verbaDiaria: number;
  gastoMes: number;
  leadsMes: number;
  leadsQualificadosMes: number;
  criativosNoAr: number;
  criativosSemParecer: number;
}

export const CAMPANHA_FORM_VAZIO: CampanhaFormData = {
  nome: '',
  tese: '',
  plataforma: '',
  situacao: 'ativa',
  verbaDiaria: 0,
  gastoMes: 0,
  leadsMes: 0,
  leadsQualificadosMes: 0,
  criativosNoAr: 0,
  criativosSemParecer: 0,
};

export function campanhaParaFormulario(c: Campanha): CampanhaFormData {
  return {
    nome: c.nome,
    tese: c.tese,
    plataforma: c.plataforma,
    situacao: c.situacao,
    verbaDiaria: c.verbaDiaria,
    gastoMes: c.gastoMes,
    leadsMes: c.leadsMes,
    leadsQualificadosMes: c.leadsQualificadosMes,
    criativosNoAr: c.criativosNoAr,
    criativosSemParecer: c.criativosSemParecer,
  };
}

export type ErrosCampanha = Partial<Record<keyof CampanhaFormData, string>>;

export function validarCampanha(dados: CampanhaFormData): ErrosCampanha {
  const erros: ErrosCampanha = {};

  if (!dados.nome.trim()) erros.nome = 'Dê um nome à campanha — é o que aparece na lista.';
  if (!dados.tese) erros.tese = 'Escolha a tese anunciada.';
  if (!dados.plataforma) erros.plataforma = 'Escolha a plataforma.';

  if (dados.verbaDiaria < 0) erros.verbaDiaria = 'Verba diária não pode ser negativa.';
  if (dados.gastoMes < 0) erros.gastoMes = 'Gasto do mês não pode ser negativo.';
  if (dados.leadsMes < 0) erros.leadsMes = 'Leads do mês não pode ser negativo.';
  if (dados.leadsQualificadosMes < 0) {
    erros.leadsQualificadosMes = 'Qualificados não pode ser negativo.';
  } else if (dados.leadsQualificadosMes > dados.leadsMes) {
    erros.leadsQualificadosMes = 'Não pode ter mais qualificados do que leads no mês.';
  }
  if (dados.criativosNoAr < 0) erros.criativosNoAr = 'Criativos no ar não pode ser negativo.';
  if (dados.criativosSemParecer < 0) {
    erros.criativosSemParecer = 'Sem parecer não pode ser negativo.';
  } else if (dados.criativosSemParecer > dados.criativosNoAr) {
    erros.criativosSemParecer = 'Não pode ter mais sem parecer do que criativos no ar.';
  }

  return erros;
}

export function temErroCampanha(erros: ErrosCampanha): boolean {
  return Object.keys(erros).length > 0;
}
