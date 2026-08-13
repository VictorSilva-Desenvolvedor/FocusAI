import { ESTILO_ETIQUETA, ESTILO_PONTO, type Tom } from '@/src/lib/estilo';
import { avaliarElegibilidade as avaliarContraATese } from '@/src/lib/teses';
import type { Advogado, Lead, LeadStatus, Profile, TeseId } from '@/types';

// ---------------------------------------------------------------------------
// O quadro
// ---------------------------------------------------------------------------

/**
 * As colunas do quadro, na ordem. O produto nasce em `novo`, ganha valor em
 * `agendado` — é o agendamento que transforma lead em produto — e se encerra em
 * `atendido`.
 *
 * Desqualificado, não atendeu, faltou e expirado ficam fora: são desfechos, não
 * etapas, e uma coluna-cemitério no fim do quadro só acumula cartão que ninguém
 * olha.
 */
export const COLUNAS: LeadStatus[] = [
  'novo',
  'em_qualificacao',
  'qualificado',
  'agendado',
  'vendido',
  'atendido',
];

/** Desfechos: saem do quadro e só aparecem por filtro. */
export const DESFECHOS: LeadStatus[] = ['desqualificado', 'nao_atendeu', 'no_show', 'expirado'];

/**
 * Cabeça de coluna. Os dois passos do meio usam tons da marca em intensidade
 * crescente — a progressão é o que faz o quadro ser lido da esquerda para a
 * direita; os demais usam o tom do significado (EST-R10).
 */
export const COR_COLUNA: Partial<Record<LeadStatus, string>> = {
  novo: ESTILO_PONTO.neutro,
  em_qualificacao: ESTILO_PONTO.info,
  qualificado: 'bg-roxo-400',
  agendado: 'bg-roxo-600',
  vendido: ESTILO_PONTO.sucesso,
  atendido: ESTILO_PONTO.atencao,
};

export const TOM_TESE: Record<TeseId, Tom> = {
  polo_passivo: 'marca',
  vinculo_empregaticio: 'info',
  juros_abusivos: 'atencao',
  // As quatro sem Tese em TESES (ver types.ts) ficam no tom neutro — não têm
  // cor de marca própria enquanto não forem publicáveis.
  auxilio_doenca: 'neutro',
  salario_maternidade: 'neutro',
  bpc_loas: 'neutro',
  auxilio_acidente: 'neutro',
};

export const ESTILO_TESE: Record<TeseId, string> = {
  polo_passivo: ESTILO_ETIQUETA.marca,
  vinculo_empregaticio: ESTILO_ETIQUETA.info,
  juros_abusivos: ESTILO_ETIQUETA.atencao,
  auxilio_doenca: ESTILO_ETIQUETA.neutro,
  salario_maternidade: ESTILO_ETIQUETA.neutro,
  bpc_loas: ESTILO_ETIQUETA.neutro,
  auxilio_acidente: ESTILO_ETIQUETA.neutro,
};

// ---------------------------------------------------------------------------
// LED-R05 — o contato é mascarado até a compra
// ---------------------------------------------------------------------------

/**
 * `INV-11` — o telefone **é** o produto. Mostrá-lo antes da compra entrega de
 * graça a única coisa que o advogado está pagando para receber, e expõe dado
 * pessoal de alguém que não autorizou aquele advogado específico.
 *
 * A máscara preserva DDD e os dois últimos dígitos: é o bastante para o
 * advogado conferir a região e reconhecer o número depois de comprar, e pouco
 * demais para discar.
 */
export function mascararContato(telefone: string): string {
  const d = telefone.replace(/\D/g, '');
  if (d.length < 4) return '•••••';
  return `(${d.slice(0, 2)}) ••••-••${d.slice(-2)}`;
}

/**
 * A única porta pela qual o telefone sai do registro para a tela. Toda
 * renderização passa por aqui em vez de ler `lead.telefone` direto — assim
 * existe **um** lugar onde a decisão mora, e o próximo componente que listar
 * lead não precisa lembrar da regra.
 */
export function contatoVisivel(lead: Lead, perfil: Profile): string {
  if (lead.compradoPor && lead.compradoPor === perfil.advogado_id) return lead.telefone;
  // O time interno enxerga o contato: é ele que opera a qualificação e o
  // suporte. A fronteira que INV-11 protege é a do comprador, não a da equipe.
  if (perfil.role !== 'advogado') return lead.telefone;
  return mascararContato(lead.telefone);
}

// ---------------------------------------------------------------------------
// LED-R01 a LED-R03 — transições que o quadro recusa
// ---------------------------------------------------------------------------

/**
 * Arrastar não é livre.
 *
 * 1. Não se publica no catálogo sem tese e sem os filtros de elegibilidade
 *    satisfeitos. Publicar lead inelegível é vender produto que o advogado vai
 *    recusar — e cada recusa dessas custa a confiança no catálogo inteiro.
 * 2. Não se vende sem reunião agendada: o que o advogado compra é a reunião,
 *    não o contato. Sem hora marcada ele recebeu uma lista de telefone.
 * 3. Lead vendido não volta. É o invariante mais duro do sistema (`INV-10`):
 *    dois advogados com o mesmo contato viram concorrência pelo mesmo cliente,
 *    exatamente a questão que o Provimento 205 levanta sobre intermediação.
 */
export function motivoParaRecusarMovimento(lead: Lead, destino: LeadStatus): string | null {
  if (lead.status === destino) return null;

  if (lead.compradoPor && destino !== 'atendido' && !DESFECHOS.includes(destino)) {
    return 'Lead já vendido não volta ao catálogo (INV-10). Dois advogados com o mesmo contato disputam o mesmo cliente.';
  }

  if (destino === 'agendado') {
    const { elegivel, pendentes } = elegibilidadeDoLead(lead);
    if (!elegivel) {
      return `Não publica no catálogo — falta confirmar: ${pendentes.join('; ').toLowerCase()}.`;
    }
  }

  if (destino === 'vendido' && !lead.reuniaoEm) {
    return 'Sem reunião agendada não há produto — o que o advogado compra é a hora marcada, não o telefone.';
  }

  if (destino === 'atendido' && !lead.compradoPor) {
    return 'Só é atendido o lead que algum advogado comprou.';
  }

  return null;
}

/**
 * LED-R01 — a elegibilidade é da tese, não do lead. Aqui só se cruza o que a
 * qualificação apurou com o que a tese exige; a régua vive em `teses.ts`.
 */
export function elegibilidadeDoLead(lead: Lead): { elegivel: boolean; pendentes: string[] } {
  return avaliarContraATese(lead.tese, lead.elegibilidade);
}

// ---------------------------------------------------------------------------
// LED-R04 — reserva é trava com prazo
// ---------------------------------------------------------------------------

/**
 * Quinze minutos: tempo de um checkout, não de uma decisão. Prazo generoso
 * transforma reserva em bloqueio gratuito do estoque — o advogado segura o
 * melhor lead do dia e decide amanhã, e o produto vence na mão dele.
 */
export const MINUTOS_DE_RESERVA = 15;

/**
 * Trava vencida não existe. A checagem é sempre calculada a partir do relógio,
 * nunca de um campo booleano gravado: um `reservado: true` que ninguém limpou
 * é a trava órfã que prende o lead para sempre (`API-R08`).
 */
export function reservaAtiva(lead: Lead): boolean {
  if (!lead.reservadoPor || !lead.reservadoAte) return false;
  return Date.parse(lead.reservadoAte) > Date.now();
}

export function reservadoPorOutro(lead: Lead, perfil: Profile): boolean {
  return reservaAtiva(lead) && lead.reservadoPor !== perfil.advogado_id;
}

/** No catálogo: agendado, sem comprador e sem trava de outra pessoa. */
export function estaNoCatalogo(lead: Lead): boolean {
  return lead.status === 'agendado' && !lead.compradoPor;
}

// ---------------------------------------------------------------------------
// O produto é perecível
// ---------------------------------------------------------------------------

export const HORAS_PARA_VENCER = 48;

/**
 * Passada a hora marcada, o lead não vale mais nada: o custo de aquisição já
 * foi pago e não há mais o que vender. Este é o número que mede desperdício.
 */
export function horasAteReuniao(lead: Lead): number | null {
  if (!lead.reuniaoEm) return null;
  return (Date.parse(lead.reuniaoEm) - Date.now()) / 3_600_000;
}

export function venceEmBreve(lead: Lead): boolean {
  if (!estaNoCatalogo(lead)) return false;
  const horas = horasAteReuniao(lead);
  return horas !== null && horas > 0 && horas <= HORAS_PARA_VENCER;
}

// ---------------------------------------------------------------------------
// LED-R06 — visibilidade
// ---------------------------------------------------------------------------

/**
 * O advogado enxerga o catálogo das teses e regiões em que atua, mais tudo o
 * que ele mesmo comprou. Nunca a carteira de outro advogado.
 *
 * Isto é filtro de tela, não controle de acesso: quando o backend entrar, quem
 * segura o isolamento é a política de acesso da tabela (`API-R02`). Filtrar no
 * cliente é ergonomia — quem monta a consulta é o cliente, e nada impede pedir
 * mais do que se deve.
 */
export function visiveisPara(leads: Lead[], perfil: Profile, advogado: Advogado | null): Lead[] {
  if (perfil.role !== 'advogado') return leads;
  if (!advogado) return [];

  return leads.filter((lead) => {
    if (lead.compradoPor === advogado.id) return true;
    if (!estaNoCatalogo(lead)) return false;
    // LED-R09 — entrega exclusiva estreita o catálogo para um só advogado.
    if (lead.direcionadoPara && lead.direcionadoPara !== advogado.id) return false;
    if (!advogado.teses.includes(lead.tese)) return false;
    if (lead.uf !== advogado.uf) return false;
    // Lista de cidades vazia significa o estado inteiro.
    if (advogado.cidades.length > 0 && !advogado.cidades.includes(lead.cidade)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// LED-R09 — agendamento manual e entrega exclusiva
// ---------------------------------------------------------------------------

/**
 * O que a tela usa para **não desenhar** o botão de agendar manualmente —
 * mesmo espírito de `motivoParaNaoComprar` (`CRE-R04`).
 *
 * Espelha as duas recusas que `registrar_agendamento` já aplica no banco
 * (`supabase/migrations/0011_agendamento_da_reuniao.sql`): sem isso a tela
 * publicaria no catálogo um lead que a automação teria recusado, e a operadora
 * só descobriria a divergência quando o advogado tentasse comprar.
 */
export function motivoParaNaoAgendarManualmente(lead: Lead, reuniaoEm: string): string | null {
  if (lead.compradoPor) return 'Lead já vendido não é reagendado por aqui.';
  if (!reuniaoEm) return 'Informe a data e a hora da reunião.';
  if (Date.parse(reuniaoEm) <= Date.now()) {
    return 'A reunião não pode ser marcada para um horário que já passou.';
  }
  const { elegivel, pendentes } = elegibilidadeDoLead(lead);
  if (!elegivel) {
    return `Não publica no catálogo — falta confirmar: ${pendentes.join('; ').toLowerCase()}.`;
  }
  return null;
}

/**
 * Quem pode receber este lead com exclusividade: mesma tese e mesma região que
 * `visiveisPara` já exige do catálogo aberto. Entrega exclusiva restringe quem
 * vê — não é um atalho para entregar fora da elegibilidade normal.
 */
export function advogadosElegiveisParaEntrega(lead: Lead, advogados: Advogado[]): Advogado[] {
  return advogados.filter(
    (a) =>
      a.teses.includes(lead.tese) &&
      a.uf === lead.uf &&
      (a.cidades.length === 0 || a.cidades.includes(lead.cidade)),
  );
}

// ---------------------------------------------------------------------------
// Compra
// ---------------------------------------------------------------------------

/**
 * Tudo o que impede a compra, num lugar só. A tela usa isto para **não
 * desenhar** o botão (`CRE-R04`): botão que existe e falha no clique ensina o
 * usuário a tentar de novo, e cada tentativa é uma corrida a mais pelo mesmo
 * lead.
 */
export function motivoParaNaoComprar(
  lead: Lead,
  advogado: Advogado | null,
): string | null {
  if (!advogado) return 'Só advogado com acesso liberado compra lead.';
  if (lead.compradoPor) return 'Este lead já foi vendido.';
  if (lead.status !== 'agendado') return 'Só lead com reunião agendada está à venda.';
  if (!lead.reuniaoEm) return 'Sem reunião agendada não há produto.';
  if (Date.parse(lead.reuniaoEm) <= Date.now()) return 'A hora da reunião já passou.';

  if (reservaAtiva(lead) && lead.reservadoPor !== advogado.id) {
    return 'Outro advogado está finalizando a compra deste lead.';
  }
  if (!advogado.teses.includes(lead.tese)) {
    return 'Este lead é de uma tese fora da sua atuação.';
  }
  if (advogado.modeloPagamento === 'creditos' && advogado.saldoCreditos < lead.custoCreditos) {
    return `Saldo insuficiente: são ${lead.custoCreditos} créditos e você tem ${advogado.saldoCreditos}.`;
  }
  return null;
}

export function podeComprar(lead: Lead, advogado: Advogado | null): boolean {
  return motivoParaNaoComprar(lead, advogado) === null;
}

// ---------------------------------------------------------------------------
// LED-R07 — o desfecho da reunião
// ---------------------------------------------------------------------------

/**
 * Quem encerra a reunião é quem esteve nela: o advogado que comprou.
 *
 * Sem este passo o produto não tem fim — o lead ficava em `vendido` para
 * sempre, e a operação não tinha como distinguir a consulta que aconteceu da
 * que o cliente não apareceu. É essa diferença que mede a qualidade do que a
 * IA agendou, e é ela que separa devolução legítima de arrependimento.
 *
 * Só depois da hora marcada, de propósito: marcar "atendida" antes é registrar
 * como acontecido algo que ainda não aconteceu, e o registro do que aconteceu
 * com o cliente é justamente o que responde perante a OAB (`INV-13`).
 */
export function motivoParaNaoEncerrarReuniao(
  lead: Lead,
  advogado: Advogado | null,
): string | null {
  if (!advogado || lead.compradoPor !== advogado.id) {
    return 'Só quem comprou o lead encerra a reunião.';
  }
  if (lead.devolucao) return 'Lead devolvido não tem reunião a encerrar.';
  if (lead.status === 'atendido' || lead.status === 'no_show') {
    return 'Esta reunião já foi encerrada.';
  }
  if (!lead.reuniaoEm) return 'Não há reunião marcada.';
  if (Date.parse(lead.reuniaoEm) > Date.now()) {
    return 'A reunião ainda não aconteceu — o desfecho é registrado depois da hora marcada.';
  }
  return null;
}

export function podeEncerrarReuniao(lead: Lead, advogado: Advogado | null): boolean {
  return motivoParaNaoEncerrarReuniao(lead, advogado) === null;
}

// ---------------------------------------------------------------------------
// LED-R08 — a avaliação do lead
// ---------------------------------------------------------------------------

export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;

/**
 * Avalia quem comprou, e só depois da consulta.
 *
 * Nota dada antes do encontro mede expectativa, não produto — e expectativa é
 * exatamente o que a Focus já sabe, porque foi ela que escreveu o resumo. O
 * dado que falta é o do outro lado: se o cliente que a IA qualificou era mesmo
 * o caso descrito.
 *
 * Lead devolvido fica de fora porque já tem o próprio registro: o motivo da
 * devolução diz mais do que uma nota diria.
 */
export function motivoParaNaoAvaliar(lead: Lead, advogado: Advogado | null): string | null {
  if (!advogado || lead.compradoPor !== advogado.id) {
    return 'Só quem comprou o lead avalia.';
  }
  if (lead.devolucao) return 'Lead devolvido já tem o motivo registrado.';
  if (lead.status !== 'atendido' && lead.status !== 'no_show') {
    return 'A avaliação abre depois que a reunião é encerrada.';
  }
  return null;
}

export function podeAvaliar(lead: Lead, advogado: Advogado | null): boolean {
  return motivoParaNaoAvaliar(lead, advogado) === null;
}

/** Média das notas dadas. Nulo quando ninguém avaliou ainda. */
export function mediaDasNotas(leads: Lead[]): number | null {
  const notas = leads.map((l) => l.avaliacao?.nota).filter((n): n is number => typeof n === 'number');
  if (notas.length === 0) return null;
  return notas.reduce((s, n) => s + n, 0) / notas.length;
}

// ---------------------------------------------------------------------------
// Cadastro manual
// ---------------------------------------------------------------------------

export interface LeadFormData {
  nome: string;
  telefone: string;
  tese: TeseId | '';
  uf: string;
  cidade: string;
  resumoQualificacao: string;
}

export type ErrosLead = Partial<Record<keyof LeadFormData, string>>;

export function validarLead(dados: LeadFormData, leads: Lead[], editandoId?: string): ErrosLead {
  const erros: ErrosLead = {};

  const nome = dados.nome.trim();
  if (!nome) {
    erros.nome = 'Informe o nome do cliente.';
  } else if (nome.split(/\s+/).length < 2) {
    erros.nome = 'Informe nome e sobrenome.';
  }

  const digitos = dados.telefone.replace(/\D/g, '');
  if (!digitos) {
    erros.telefone = 'Informe o telefone — é ele que o advogado compra.';
  } else if (digitos.length < 10 || digitos.length > 11) {
    erros.telefone = 'Informe DDD + número (10 ou 11 dígitos).';
  } else {
    // O mesmo contato entrando duas vezes vira dois produtos do mesmo cliente,
    // e aí INV-10 é violado sem ninguém perceber: são dois registros.
    const duplicado = leads.some(
      (l) =>
        l.id !== editandoId &&
        l.telefone.replace(/\D/g, '') === digitos &&
        !DESFECHOS.includes(l.status),
    );
    if (duplicado) {
      erros.telefone = 'Já existe um lead ativo com este telefone — seriam dois produtos do mesmo cliente.';
    }
  }

  if (!dados.tese) erros.tese = 'Escolha a tese — é ela que define a régua de qualificação.';
  if (!dados.uf) erros.uf = 'Informe a UF.';
  if (!dados.cidade.trim()) erros.cidade = 'Informe a cidade — o advogado filtra por região.';

  const resumo = dados.resumoQualificacao.trim();
  if (!resumo) {
    erros.resumoQualificacao = 'Escreva o resumo — é o que o advogado lê para decidir a compra.';
  } else if (resumo.length < 30) {
    erros.resumoQualificacao = 'Resumo curto demais para sustentar uma decisão de compra.';
  }

  return erros;
}

export function temErro(erros: ErrosLead): boolean {
  return Object.keys(erros).length > 0;
}

export function formatarTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
