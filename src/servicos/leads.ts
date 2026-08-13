import { supabase } from '@/src/lib/supabase';
import type { LeadFormData } from '@/src/lib/leads';
import type { Lead, LeadStatus, OrigemLead, TeseId } from '@/types';

/**
 * A camada de leitura e escrita de lead.
 *
 * `API-R06` — a regra de leitura mora aqui, não espalhada pelas telas. Quem
 * consulta a tabela direto de uma view nova não aplica nada disto, e o sintoma
 * é uma tela entregando telefone de graça. Vale a mesma lógica que já governa
 * `src/lib/`: a regra é do módulo, não da view.
 */

/** O corte padrão do PostgREST é 1.000 linhas e o truncamento é silencioso. */
const POR_PAGINA = 200;

/**
 * A linha como o banco devolve: `snake_case`, com o contato aninhado.
 *
 * O contato vem de `leads_contato`, tabela com política própria — para lead não
 * comprado a política não casa linha nenhuma e o campo chega vazio. Não é
 * filtro do cliente: o dado não sai do banco (`INV-11`).
 */
interface LinhaLead {
  id: string;
  nome: string;
  tese: TeseId;
  uf: string;
  cidade: string;
  status: LeadStatus;
  origem: OrigemLead;
  resumo_qualificacao: string;
  elegibilidade: Record<string, boolean>;
  reuniao_em: string | null;
  custo_creditos: number;
  preco_avulso: number;
  comprado_por: string | null;
  comprado_em: string | null;
  reservado_por: string | null;
  reservado_ate: string | null;
  tem_gravacao: boolean;
  criado_em: string;
  ultima_atividade: string;
  motivo_desqualificacao: string | null;
  devolucao_motivo: string | null;
  devolucao_em: string | null;
  telefone_mascarado: string | null;
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
  avaliacao_em: string | null;
  leads_contato: { telefone: string } | { telefone: string }[] | null;
}

/*
 * Literal único, não concatenação: o cliente infere o formato do retorno a
 * partir do texto do `select`, e texto montado com `+` chega como `string`
 * genérica — a inferência morre e a consulta volta sem tipo nenhum.
 */
const CAMPOS =
  'id, nome, tese, uf, cidade, status, origem, resumo_qualificacao, elegibilidade, reuniao_em, custo_creditos, preco_avulso, comprado_por, comprado_em, reservado_por, reservado_ate, tem_gravacao, criado_em, ultima_atividade, motivo_desqualificacao, devolucao_motivo, devolucao_em, telefone_mascarado, avaliacao_nota, avaliacao_comentario, avaliacao_em, leads_contato(telefone)' as const;

/**
 * O banco fala `snake_case` e o domínio fala `camelCase`. A tradução mora num
 * lugar só, por entidade — espalhada pelas telas, cada uma inventa a sua e o
 * primeiro campo renomeado quebra metade delas em silêncio.
 */
function paraDominio(linha: LinhaLead): Lead {
  const contato = Array.isArray(linha.leads_contato)
    ? linha.leads_contato[0]
    : linha.leads_contato;

  return {
    id: linha.id,
    nome: linha.nome,
    /*
     * Vazio quando a política não liberou o contato — e é o caso normal, não
     * erro. `contatoVisivel()` continua sendo o portão da renderização; agora
     * ele é a segunda camada, não a única. A máscara não é derivada aqui
     * porque o número não chegou: ela vem calculada do banco.
     */
    telefone: contato?.telefone ?? '',
    tese: linha.tese,
    uf: linha.uf,
    cidade: linha.cidade,
    status: linha.status,
    origem: linha.origem,
    resumoQualificacao: linha.resumo_qualificacao,
    elegibilidade: linha.elegibilidade ?? {},
    reuniaoEm: linha.reuniao_em,
    custoCreditos: linha.custo_creditos,
    precoAvulso: Number(linha.preco_avulso),
    // LED-R09 — entrega exclusiva ainda não tem coluna no banco; agendamento
    // manual grava isto só localmente, como `agendar` já faz com a reunião.
    direcionadoPara: null,
    compradoPor: linha.comprado_por,
    compradoEm: linha.comprado_em,
    reservadoPor: linha.reservado_por,
    reservadoAte: linha.reservado_ate,
    temGravacao: linha.tem_gravacao,
    criadoEm: linha.criado_em,
    ultimaAtividade: linha.ultima_atividade,
    motivoDesqualificacao: linha.motivo_desqualificacao,
    devolucao:
      linha.devolucao_motivo && linha.devolucao_em
        ? { motivo: linha.devolucao_motivo, em: linha.devolucao_em }
        : null,
    avaliacao:
      linha.avaliacao_nota !== null && linha.avaliacao_em !== null
        ? {
            nota: linha.avaliacao_nota,
            comentario: linha.avaliacao_comentario,
            em: linha.avaliacao_em,
          }
        : null,
  };
}

/**
 * A máscara que o banco calculou, para o lead cujo contato não veio.
 *
 * Existe porque `mascararContato()` deriva a máscara do número real, e o número
 * real não chega mais ao navegador para lead não comprado. Sem isto o catálogo
 * mostraria `•••••` para todo mundo — a regra intacta e a informação de região
 * perdida em silêncio.
 */
export function mascaraDoBanco(linha: { telefone_mascarado: string | null }): string {
  return linha.telefone_mascarado ?? '•••••';
}

/**
 * `API-R07` — lista grande exige paginação explícita. O corte padrão é 1.000
 * linhas e o truncamento não vem como erro, vem como menos dado: filtro perde
 * opção e comparativo zera sem ninguém notar. Por isso a função pagina
 * sozinha, por dentro, até esgotar a tabela — quem chama recebe a lista
 * inteira, nunca um recorte silencioso.
 */
export async function listarLeads(): Promise<Lead[]> {
  const tudo: Lead[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('leads')
      .select(CAMPOS)
      .order('ultima_atividade', { ascending: false })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar leads: ${error.message}`);
    const linhas = data as unknown as LinhaLead[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}

// ---------------------------------------------------------------------------
// Escrita — tudo o que é transacional passa por função no banco
// ---------------------------------------------------------------------------

/**
 * `API-R08` — comprar carimba o comprador e lança o movimento numa transação
 * só. Em passos separados, o intervalo entre eles é a janela em que dois
 * advogados compram o mesmo lead, ou em que o carimbo grava e o débito não.
 *
 * O comprador não é parâmetro: a função o deriva da sessão. Passá-lo daqui
 * faria de comprar em nome de terceiro uma chamada bem formada.
 */
export type Resultado = { ok: true } | { ok: false; motivo: string };

/** As funções transacionais devolvem sempre `{ok}` ou `{ok, motivo}`. */
type FuncaoDeLead =
  | 'comprar_lead'
  | 'devolver_lead'
  | 'reservar_lead'
  | 'encerrar_reuniao'
  | 'avaliar_lead'
  | 'excluir_lead'
  | 'criar_lead_manual';

async function chamar(
  nome: FuncaoDeLead,
  args: Record<string, unknown>,
): Promise<Resultado> {
  // Cada função tem assinatura própria nos tipos gerados; o helper é comum às
  // cinco, então os argumentos são conferidos por quem chama, não aqui.
  const { data, error } = await supabase.rpc(nome, args as never);
  /*
   * Erro de transporte e recusa de regra são coisas diferentes, e a tela trata
   * as duas igual: as funções devolvem a recusa como `{ok:false, motivo}`, com
   * texto pronto para o usuário. Só falha de rede chega por `error`.
   */
  if (error) return { ok: false, motivo: error.message };
  return data as Resultado;
}

export const comprarLead = (leadId: string) => chamar('comprar_lead', { p_lead_id: leadId });

export const devolverLead = (leadId: string, motivo: string) =>
  chamar('devolver_lead', { p_lead_id: leadId, p_motivo: motivo });

export const reservarLead = (leadId: string) => chamar('reservar_lead', { p_lead_id: leadId });

export const encerrarReuniao = (leadId: string, compareceu: boolean) =>
  chamar('encerrar_reuniao', { p_lead_id: leadId, p_compareceu: compareceu });

export const avaliarLead = (leadId: string, nota: number, comentario: string | null) =>
  chamar('avaliar_lead', { p_lead_id: leadId, p_nota: nota, p_comentario: comentario });

export async function liberarReserva(leadId: string): Promise<void> {
  await supabase.rpc('liberar_reserva', { p_lead_id: leadId });
}

/**
 * Só para administrador, e só para lead que nunca virou produto — a função no
 * banco recusa lead vendido ou com ligação registrada (`INV-13`).
 */
export const excluirLead = (leadId: string) => chamar('excluir_lead', { p_lead_id: leadId });

/**
 * Cadastro manual — mesma escrita que a captação automática faz
 * (`criar_lead_manual`, espelha `registrar_captacao`), disparada por quem
 * opera o catálogo em vez de pelo webhook do formulário. Devolve o id porque,
 * diferente das funções acima, aqui não há lead prévio para reler por ele —
 * é este id que a tela usa para achar a linha nova depois de recarregar.
 */
export async function criarLeadManual(
  dados: LeadFormData,
): Promise<{ ok: true; leadId: string } | { ok: false; motivo: string }> {
  const { data, error } = await supabase.rpc('criar_lead_manual', {
    p_nome: dados.nome.trim(),
    p_telefone: dados.telefone.trim(),
    p_tese: dados.tese as TeseId,
    p_uf: dados.uf.trim(),
    p_cidade: dados.cidade.trim(),
    p_resumo: dados.resumoQualificacao.trim(),
    p_origem: dados.origem,
  });

  if (error) return { ok: false, motivo: error.message };
  const r = data as { ok: boolean; motivo?: string; lead_id?: string };
  if (!r.ok) return { ok: false, motivo: r.motivo ?? 'Não foi possível cadastrar o lead.' };
  return { ok: true, leadId: r.lead_id! };
}

/**
 * Mover no quadro. `leads_carimbo_imutavel` (`0001_fundacao.sql`) já recusa
 * no banco o que `motivoParaRecusarMovimento` recusa na tela — reescrever o
 * comprador ou tirar um lead vendido do catálogo — então a escrita direta,
 * sob a política "quem opera o catálogo escreve", não abre buraco novo.
 */
export async function moverLead(
  leadId: string,
  status: LeadStatus,
  motivoDesqualificacao: string | null,
): Promise<Resultado> {
  const { error } = await supabase
    .from('leads')
    .update({
      status,
      motivo_desqualificacao: motivoDesqualificacao,
      ultima_atividade: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}

/** Resposta a um filtro de elegibilidade da tese — grava o objeto inteiro, já mesclado. */
export async function atualizarElegibilidade(
  leadId: string,
  elegibilidade: Record<string, boolean>,
): Promise<Resultado> {
  const { error } = await supabase
    .from('leads')
    .update({ elegibilidade, ultima_atividade: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return { ok: false, motivo: error.message };
  return { ok: true };
}
