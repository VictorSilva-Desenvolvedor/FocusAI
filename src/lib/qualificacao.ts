import type { Lead, Ligacao, ResultadoLigacao, TeseId } from '@/types';
import type { Tom } from '@/src/lib/estilo';

/**
 * A SDR de voz. É ela que transforma um formulário preenchido em produto:
 * liga, conduz o roteiro da tese, apura os filtros de elegibilidade e agenda.
 */
export const NOME_DA_IA = 'Helena';

/**
 * `QUA-R04` — três tentativas antes de desistir. A quarta ligação já é
 * insistência. Esgotadas sem falar com a pessoa, o lead vira `expirado` — não
 * `desqualificado`, porque ninguém avaliou o caso, só não se conseguiu
 * contato. Aplicada em `registrar_qualificacao`
 * (`supabase/migrations/0010_qualificacao_por_voz.sql`); o número aqui é só
 * leitura, o valor que vale é o hardcoded na função.
 */
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

/**
 * `QUA-R04` promete `expirado` na terceira tentativa sem atender, mas a
 * automação que chama `registrar_qualificacao` não está aplicando essa
 * transição na prática — o lead fica em `novo`/`em_qualificacao` mesmo depois
 * de várias tentativas sem sucesso (ver Pendências conhecidas). Por isso
 * "sem informação nova" não se lê pelo `status` do lead — se lê pela ligação
 * mais recente.
 *
 * `listarLigacoes()` já devolve mais recente primeiro, então a primeira
 * ocorrência por lead nesta lista é a última tentativa.
 */
export function leadsComUltimaNaoAtendida(ligacoes: Ligacao[]): Set<string> {
  const vistos = new Set<string>();
  const naoAtendidos = new Set<string>();
  for (const l of ligacoes) {
    if (vistos.has(l.leadId)) continue;
    vistos.add(l.leadId);
    if (l.resultado === 'nao_atendeu') naoAtendidos.add(l.leadId);
  }
  return naoAtendidos;
}

/**
 * "4 min 12 s". Zero vira travessão: não atendeu não tem duração.
 *
 * Arredonda antes de separar minuto de segundo — a duração real da Vapi vem
 * com casas decimais (432.761), e sem isso o resto da divisão por 60 herda a
 * imprecisão de ponto flutuante e mostra algo como "12.760999999999999 s".
 */
export function formatarDuracao(segundos: number): string {
  if (segundos <= 0) return '—';
  const total = Math.round(segundos);
  const min = Math.floor(total / 60);
  const seg = total % 60;
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
