import type { Parecer, PlataformaAnuncio, TeseId } from '@/types';

/** CNF-R01 — o cronômetro corre do envio até o parecer registrado. */
export const SLA_HORAS = 24;

export function horasNaFila(parecer: Parecer): number {
  const fim = parecer.emitidoEm ? Date.parse(parecer.emitidoEm) : Date.now();
  return (fim - Date.parse(parecer.enviadoEm)) / 3_600_000;
}

// ---------------------------------------------------------------------------
// Envio de criativo para a fila
// ---------------------------------------------------------------------------

export interface CriativoFormData {
  criativo: string;
  tese: TeseId | '';
  plataforma: PlataformaAnuncio | '';
}

export type ErrosCriativo = Partial<Record<keyof CriativoFormData, string>>;

export function validarCriativo(dados: CriativoFormData): ErrosCriativo {
  const erros: ErrosCriativo = {};

  if (!dados.criativo.trim()) {
    erros.criativo = 'Descreva o criativo — é o que aparece na fila de parecer.';
  }
  if (!dados.tese) erros.tese = 'Escolha a tese anunciada na peça.';
  if (!dados.plataforma) erros.plataforma = 'Escolha a plataforma do anúncio.';

  return erros;
}

export function temErroCriativo(erros: ErrosCriativo): boolean {
  return Object.keys(erros).length > 0;
}
