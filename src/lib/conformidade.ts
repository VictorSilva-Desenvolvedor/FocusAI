import type { Parecer } from '@/types';

/** CNF-R01 — o cronômetro corre do envio até o parecer registrado. */
export const SLA_HORAS = 24;

export function horasNaFila(parecer: Parecer): number {
  const fim = parecer.emitidoEm ? Date.parse(parecer.emitidoEm) : Date.now();
  return (fim - Date.parse(parecer.enviadoEm)) / 3_600_000;
}
