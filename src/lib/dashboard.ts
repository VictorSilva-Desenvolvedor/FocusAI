import { SLA_HORAS, horasNaFila } from '@/src/lib/conformidade';
import type { AlertaOperacional, Advogado, ChipTrabalhoHoje, EtapaCadeia, Parecer } from '@/types';

/**
 * A moldura da cadeia do negócio. Os números (`valor`) são recalculados na
 * tela a partir do store real; o que mora aqui é só rótulo, rota e módulo
 * dono — texto que não muda de painel para painel.
 *
 * `variacao` fica sempre nulo de propósito: não existe hoje uma base
 * histórica gravada para calcular crescimento contra o período anterior.
 * Mostrar um percentual aqui sem tê-lo calculado de verdade é exatamente o
 * tipo de dado de maquete que `integracoes.ts` recusa — a seta de tendência
 * volta quando houver snapshot de verdade para comparar.
 */
export const CADEIA: EtapaCadeia[] = [
  {
    id: 'captar',
    titulo: 'Captar o lead',
    descricao: 'Anúncio e formulário, por tese',
    valor: '—',
    unidade: 'leads em 30 dias',
    detalhe: 'Meta Ads em três teses',
    variacao: null,
    rota: '/campanhas',
    modulo: 'campanhas',
  },
  {
    id: 'qualificar',
    titulo: 'Qualificar com a IA',
    descricao: 'Fila da SDR de voz',
    valor: '—',
    unidade: 'na fila',
    detalhe: 'Filtros de elegibilidade por tese',
    variacao: null,
    rota: '/qualificacao',
    modulo: 'qualificacao',
  },
  {
    id: 'agendar',
    titulo: 'Agendar a reunião',
    descricao: 'É o agendamento que vira produto',
    valor: '—',
    unidade: 'no catálogo',
    detalhe: 'Disponíveis para compra agora',
    variacao: null,
    rota: '/leads',
    modulo: 'leads',
  },
  {
    id: 'entregar',
    titulo: 'Entregar ao advogado',
    descricao: 'Compra, contato liberado, consulta',
    valor: '—',
    unidade: 'vendidos em 30 dias',
    detalhe: 'Crédito consumido e venda avulsa',
    variacao: null,
    rota: '/creditos',
    modulo: 'creditos',
  },
];

/** "Meu Trabalho Hoje" — moldura da barra de contadores, calculada ao vivo na tela. */
export const TRABALHO_HOJE: ChipTrabalhoHoje[] = [
  {
    id: 'fila-ia',
    rotulo: 'Na fila da IA',
    valor: 0,
    criterio: 'Leads em novo ou em_qualificacao',
    tom: 'neutro',
  },
  {
    id: 'catalogo',
    rotulo: 'No catálogo',
    valor: 0,
    criterio: 'Agendados, sem comprador e com reserva livre',
    tom: 'positivo',
  },
  {
    id: 'reuniao-amanha',
    rotulo: 'Reunião em 48h sem comprador',
    valor: 0,
    criterio: 'Agendado, reunião nas próximas 48h e ninguém comprou — o produto vence',
    tom: 'critico',
  },
  {
    id: 'sem-gravacao',
    rotulo: 'Vendidos sem gravação',
    valor: 0,
    criterio: 'QUA-R03 — sem gravação não há como provar como o cliente foi direcionado',
    tom: 'atencao',
  },
  {
    id: 'vendidos-mes',
    rotulo: 'Vendidos em 30 dias',
    valor: 0,
    criterio: 'Leads com comprador carimbado nos últimos 30 dias',
    tom: 'neutro',
  },
];

/**
 * "Precisa de decisão" — ao contrário da moldura acima, aqui não há linha
 * fixa nenhuma: cada alerta só existe quando a condição que ele descreve é
 * verdadeira agora. Uma lista estática que sempre mostra os mesmos seis itens,
 * a régua que este arquivo tinha antes, é o problema que `integracoes.ts` já
 * nomeou para as integrações — o painel dizendo algo que não é mais real.
 */
export function alertasOperacionais(dados: {
  advogados: Advogado[];
  pareceres: Parecer[];
  leadsVencendo: number;
  leadsSemGravacao: number;
}): AlertaOperacional[] {
  const { advogados, pareceres, leadsVencendo, leadsSemGravacao } = dados;
  const alertas: AlertaOperacional[] = [];

  // Pendência de arquitetura, não de dado — fica sempre visível até a revisão
  // jurídica acontecer. Não tem um único ID de regra que a resuma.
  alertas.push({
    id: 'validacao-juridica',
    severidade: 'critico',
    titulo: 'Validação jurídica do Provimento 205 ainda pendente',
    descricao:
      'Um intermediário que dá a múltiplos advogados acesso a dados de possíveis clientes levanta questão de captação de clientela. A revisão por especialista em ética profissional não impede construir — impede lançar comercialmente.',
    regra: null,
    modulo: 'conformidade',
  });

  const reprovados = pareceres.filter((p) => p.decisao === 'reprovado').length;
  if (reprovados > 0) {
    alertas.push({
      id: 'pareceres-reprovados',
      severidade: 'critico',
      titulo: `${reprovados} criativo${reprovados > 1 ? 's' : ''} reprovado${reprovados > 1 ? 's' : ''}`,
      descricao:
        'Quem anuncia captando clientela para advogado responde pela peça — confirmar que já saiu do ar.',
      regra: 'INV-16',
      modulo: 'conformidade',
    });
  }

  const foraDoSla = pareceres.filter((p) => p.decisao === null && horasNaFila(p) > SLA_HORAS).length;
  if (foraDoSla > 0) {
    alertas.push({
      id: 'pareceres-fora-do-sla',
      severidade: 'alto',
      titulo: `${foraDoSla} parecer${foraDoSla > 1 ? 'es' : ''} fora do SLA de ${SLA_HORAS}h`,
      descricao: 'O cronômetro corre desde o envio e só para quando o parecer é registrado.',
      regra: 'CNF-R01',
      modulo: 'conformidade',
    });
  }

  if (leadsVencendo > 0) {
    alertas.push({
      id: 'leads-vencendo',
      severidade: 'alto',
      titulo: `${leadsVencendo} reunião${leadsVencendo > 1 ? 'ões' : ''} nas próximas 48h sem comprador`,
      descricao:
        'O produto é perecível: passada a hora marcada, o lead não vale mais nada e o custo de aquisição vira prejuízo direto.',
      regra: null,
      modulo: 'leads',
    });
  }

  if (leadsSemGravacao > 0) {
    alertas.push({
      id: 'leads-sem-gravacao',
      severidade: 'alto',
      titulo: `${leadsSemGravacao} lead${leadsSemGravacao > 1 ? 's' : ''} vendido${leadsSemGravacao > 1 ? 's' : ''} sem gravação`,
      descricao:
        'Sem a gravação não há como demonstrar, perante o conselho, como aquele cliente foi direcionado àquele advogado.',
      regra: 'QUA-R03',
      modulo: 'qualificacao',
    });
  }

  const semTese = advogados.filter((a) => a.status === 'ativo' && a.teses.length === 0).length;
  if (semTese > 0) {
    alertas.push({
      id: 'advogados-sem-tese',
      severidade: 'medio',
      titulo: `${semTese} advogado${semTese > 1 ? 's' : ''} ativo${semTese > 1 ? 's' : ''} sem tese ou região definidas`,
      descricao:
        'O painel dele abre vazio e o aviso de lead novo nunca dispara. Paga pelo acesso e não recebe produto.',
      regra: 'ADV-R03',
      modulo: 'advogados',
    });
  }

  const semSaldo = advogados.filter((a) => a.status === 'ativo' && a.saldoCreditos === 0).length;
  if (semSaldo > 0) {
    alertas.push({
      id: 'advogados-sem-saldo',
      severidade: 'medio',
      titulo: `${semSaldo} advogado${semSaldo > 1 ? 's' : ''} ativo${semSaldo > 1 ? 's' : ''} com saldo zerado`,
      descricao: 'Continua recebendo aviso de lead novo e não consegue comprar nenhum.',
      regra: 'CRE-R04',
      modulo: 'creditos',
    });
  }

  return alertas;
}
