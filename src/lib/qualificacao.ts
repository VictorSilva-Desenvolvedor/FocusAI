import type { Lead, Ligacao, ResultadoLigacao, TeseId } from '@/types';
import type { Tom } from '@/src/lib/estilo';

/**
 * A SDR de voz. É ela que transforma um formulário preenchido em produto:
 * liga, conduz o roteiro da tese, apura os filtros de elegibilidade e agenda.
 */
export const NOME_DA_IA = 'Helena';

/** Três tentativas antes de desistir. A quarta ligação já é insistência. */
export const MAX_TENTATIVAS = 3;

export const TOM_RESULTADO: Record<ResultadoLigacao, Tom> = {
  qualificado: 'sucesso',
  desqualificado: 'neutro',
  nao_atendeu: 'atencao',
  reagendar: 'info',
  em_andamento: 'marca',
};

/**
 * QUA-R03 — lead vendido sem gravação é pendência aberta.
 *
 * A gravação é o que demonstra, perante o conselho, como aquele cliente foi
 * direcionado àquele advogado: o que foi perguntado, o que foi oferecido e o
 * que ficou combinado. É prova do momento da ligação e não se produz depois —
 * quando alguém pergunta, ou existe ou não existe.
 */
export function vendidosSemGravacao(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.compradoPor && !l.temGravacao);
}

/**
 * Taxa de qualificação: dos leads que a IA conseguiu falar, quantos viraram
 * produto. Não atendidos ficam de fora do denominador de propósito — eles
 * medem a qualidade do telefone e do horário da ligação, não a do roteiro.
 */
export function taxaDeQualificacao(ligacoes: Ligacao[]): number {
  const falados = ligacoes.filter((l) => l.resultado !== 'nao_atendeu' && l.resultado !== 'em_andamento');
  if (falados.length === 0) return 0;
  const qualificados = falados.filter((l) => l.resultado === 'qualificado').length;
  return qualificados / falados.length;
}

export function taxaPorTese(ligacoes: Ligacao[], tese: TeseId): number {
  return taxaDeQualificacao(ligacoes.filter((l) => l.tese === tese));
}

/** "4 min 12 s". Zero vira travessão: não atendeu não tem duração. */
export function formatarDuracao(segundos: number): string {
  if (segundos <= 0) return '—';
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  if (min === 0) return `${seg} s`;
  return `${min} min ${String(seg).padStart(2, '0')} s`;
}

/**
 * QUA-R01 — evento da ferramenta de voz é gatilho, não fonte da verdade.
 *
 * O provedor avisa "ligação terminou"; o que aconteceu na ligação vem de
 * consultar o estado real logo depois. Tratar o corpo do evento como verdade
 * grava resultado de uma chamada que pode ter sido reprocessada ou cancelada.
 *
 * QUA-R02 — o mesmo evento chega repetido, então a deduplicação é por par
 * (identificador da chamada, tipo de evento). Sem isso, uma ligação vira duas
 * tentativas no histórico e o lead é descartado por excesso de tentativa.
 */
export function chaveDeDeduplicacao(chamadaId: string, tipoEvento: string): string {
  return `${chamadaId}::${tipoEvento}`;
}
