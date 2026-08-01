import type { MovimentoCredito } from '@/types';

const dias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

/**
 * Extrato de exemplo. Dado fictício, e continua fictício.
 *
 * Os saldos batem de propósito com `ADVOGADOS_SEED`: a soma dos movimentos de
 * cada advogado é o saldo gravado na ficha dele. É assim que `INV-15` fica
 * verificável na maquete — `divergenciaDeSaldo` tem que devolver zero para
 * todos, e a tela de créditos mostra o resultado.
 */
export const MOVIMENTOS_SEED: MovimentoCredito[] = [
  // --- Prev Fácil Advogados: 150 comprados, 22 consumidos → 128 ------------
  m('adv-prev-facil-advogados', 'compra', 100, 7_000, null, 'Pacote Volume', 60),
  m('adv-prev-facil-advogados', 'compra', 50, 4_000, null, 'Pacote Escritório', 24),
  m('adv-prev-facil-advogados', 'consumo', -3, 0, 'lead-antonia-barros-nogueira', 'Polo passivo · Goiânia', 10),
  m('adv-prev-facil-advogados', 'consumo', -2, 0, 'lead-marcos-vinicius-tavares', 'Vínculo · Guarulhos', 6),
  m('adv-prev-facil-advogados', 'consumo', -3, 0, 'lead-gilberto-nascimento-cruz', 'Polo passivo · Trindade', 28),
  m('adv-prev-facil-advogados', 'consumo', -3, 0, 'lead-helio-monteiro-dias', 'Polo passivo · Goiânia', 16),
  m('adv-prev-facil-advogados', 'devolucao', 3, 0, 'lead-helio-monteiro-dias', 'Processo já transitado em julgado', 14),
  m('adv-prev-facil-advogados', 'consumo', -14, 0, null, 'Consumo acumulado de ciclos anteriores', 45),

  // --- Gomes & Cia: 75 comprados, 34 consumidos → 41 -----------------------
  m('adv-gomes-cia', 'compra', 50, 4_000, null, 'Pacote Escritório', 48),
  m('adv-gomes-cia', 'compra', 25, 2_250, null, 'Pacote Recorrente', 12),
  m('adv-gomes-cia', 'consumo', -4, 0, 'lead-reinaldo-souza-prado', 'Juros abusivos · São Paulo', 7),
  m('adv-gomes-cia', 'consumo', -4, 0, 'lead-vera-lucia-andrade', 'Juros abusivos · São Bernardo', 20),
  m('adv-gomes-cia', 'consumo', -4, 0, 'lead-rosana-lima-ferreira', 'Juros abusivos · Sorocaba', 15),
  m('adv-gomes-cia', 'consumo', -22, 0, null, 'Consumo acumulado de ciclos anteriores', 40),

  /*
   * Teixeira Bancário está no modelo avulso: nunca comprou pacote, então o
   * extrato de crédito dele é vazio e o saldo é zero. É o caso que prova
   * CRE-R04 na tela — sem saldo, o botão de comprar não é desenhado.
   */
];

function m(
  advogadoId: string,
  tipo: MovimentoCredito['tipo'],
  creditos: number,
  valor: number,
  leadId: string | null,
  descricao: string,
  diasAtras: number,
): MovimentoCredito {
  return {
    id: `mov-${advogadoId.slice(4, 12)}-${diasAtras}-${Math.abs(creditos)}`,
    advogadoId,
    tipo,
    creditos,
    valor,
    leadId,
    descricao,
    em: dias(diasAtras),
  };
}
