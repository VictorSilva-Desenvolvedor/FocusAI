import { supabase } from '@/src/lib/supabase';
import { cidadesDoTexto, type AdvogadoFormData } from '@/src/lib/advogados';
import type {
  Advogado,
  AdvogadoStatus,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
  TeseId,
} from '@/types';

const POR_PAGINA = 200;

interface LinhaAdvogado {
  id: string;
  nome: string;
  oab: string;
  oab_conferida_em: string | null;
  email: string;
  whatsapp: string;
  uf: string;
  teses: TeseId[];
  cidades: string[];
  porte: PorteEscritorio;
  status: AdvogadoStatus;
  modelo_pagamento: ModeloPagamento | null;
  potencial_mensal: number;
  usuario_id: string | null;
  prioridade_manual: PrioridadeAdvogado | null;
  responsavel_id: string | null;
  criado_por: string | null;
  criado_em: string;
  ultima_atividade: string;
  motivo_perda: string | null;
  saldo_creditos: number;
}

/*
 * Literal único, não concatenação: o cliente infere o formato do retorno a
 * partir do texto do `select`, e texto montado com `+` chega como `string`
 * genérica — a inferência morre e a consulta volta sem tipo nenhum.
 */
const CAMPOS =
  'id, nome, oab, oab_conferida_em, email, whatsapp, uf, teses, cidades, porte, status, modelo_pagamento, potencial_mensal, usuario_id, prioridade_manual, responsavel_id, criado_por, criado_em, ultima_atividade, motivo_perda, saldo_creditos' as const;

function paraDominio(linha: LinhaAdvogado): Advogado {
  return {
    id: linha.id,
    nome: linha.nome,
    oab: linha.oab,
    oabConferidaEm: linha.oab_conferida_em,
    email: linha.email,
    whatsapp: linha.whatsapp,
    uf: linha.uf,
    teses: linha.teses ?? [],
    cidades: linha.cidades ?? [],
    porte: linha.porte,
    status: linha.status,
    modeloPagamento: linha.modelo_pagamento,
    potencialMensal: linha.potencial_mensal,
    /*
     * `INV-15` — este número não é coluna. Vem da view, que soma o extrato.
     * Uma coluna `saldo` editável ao lado dos movimentos torna a conferência
     * impossível: os dois divergem e não há como saber qual está certo. Aqui a
     * deriva é estruturalmente impossível, porque não existe o segundo número.
     */
    saldoCreditos: linha.saldo_creditos,
    usuarioId: linha.usuario_id,
    prioridadeManual: linha.prioridade_manual,
    responsavelId: linha.responsavel_id ?? '',
    criadoPor: linha.criado_por ?? '',
    criadoEm: linha.criado_em,
    ultimaAtividade: linha.ultima_atividade,
    motivoPerda: linha.motivo_perda,
  };
}

/**
 * A leitura sai de `advogados_com_saldo`, nunca da tabela crua — é a view que
 * carrega o saldo. Consultar `advogados` direto devolve o cadastro sem ele, e o
 * sintoma é um painel mostrando zero crédito para quem tem cento e quarenta.
 *
 * A view é `security_invoker`, então a política de acesso da tabela vale
 * normalmente: o advogado enxerga só o próprio cadastro.
 *
 * `API-R07` — pagina sozinha, por dentro, até esgotar a tabela: o corte
 * padrão do PostgREST é silencioso, e quem chama precisa da carteira
 * inteira, nunca de um recorte que parece completo e não é.
 */
export async function listarAdvogados(): Promise<Advogado[]> {
  const tudo: Advogado[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('advogados_com_saldo')
      .select(CAMPOS)
      .order('ultima_atividade', { ascending: false })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar advogados: ${error.message}`);
    const linhas = data as LinhaAdvogado[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}

/** O cadastro do advogado logado. Nulo para o time interno. */
export async function advogadoDaSessao(advogadoId: string | null): Promise<Advogado | null> {
  if (!advogadoId) return null;

  const { data, error } = await supabase
    .from('advogados_com_saldo')
    .select(CAMPOS)
    .eq('id', advogadoId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o cadastro: ${error.message}`);
  return data ? paraDominio(data as LinhaAdvogado) : null;
}

// ---------------------------------------------------------------------------
// Escrita — `API-R02`: a validação mora na função, não na tela que chama
// ---------------------------------------------------------------------------

export type Resultado = { ok: true } | { ok: false; motivo: string };

type FuncaoDeAdvogado =
  | 'criar_advogado'
  | 'mover_advogado'
  | 'conferir_oab_advogado'
  | 'vincular_usuario_advogado';

async function chamar(nome: FuncaoDeAdvogado, args: Record<string, unknown>): Promise<Resultado> {
  const { data, error } = await supabase.rpc(nome, args as never);
  // Erro de transporte e recusa de regra são coisas diferentes: as funções
  // devolvem a recusa como `{ok:false, motivo}`, com texto pronto para a tela.
  if (error) return { ok: false, motivo: error.message };
  return data as Resultado;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Único que devolve `id`: os outros três operam sobre uma ficha que o
 * chamador já identifica, este cria uma — e o id é gerado no banco, não tem
 * como o chamador adivinhar para reler a lista depois.
 */
export async function criarAdvogado(
  dados: AdvogadoFormData,
): Promise<{ ok: true; id: string } | { ok: false; motivo: string }> {
  const { data, error } = await supabase.rpc('criar_advogado', {
    p_nome: dados.nome,
    p_oab: dados.oab,
    p_email: dados.email,
    p_whatsapp: dados.whatsapp,
    p_uf: dados.uf,
    p_teses: dados.teses,
    // LED-R06 — vazio significa o estado inteiro, não "nenhuma".
    p_cidades: cidadesDoTexto(dados.cidades),
    p_porte: dados.porte as PorteEscritorio,
    p_potencial_mensal: Number(dados.potencialMensal),
    /*
     * `responsavel_id` no banco é uuid; `UsuariosContext` ainda é maquete, e o
     * `perfil.id` de quem está logado como time interno é o slug da seed
     * (`u-cs`), não o uuid de `perfis` — a mesma divergência que `sessao.ts`
     * já documenta para `advogado_id`. Mandar o slug faria o Postgres recusar
     * a chamada inteira com erro de tipo; omitido, o advogado nasce sem
     * responsável em vez de nascer sem se cadastrar.
     */
    p_responsavel_id: UUID_RE.test(dados.responsavelId) ? dados.responsavelId : undefined,
  });

  if (error) return { ok: false, motivo: error.message };
  const resultado = data as { ok: boolean; motivo?: string; id?: string };
  if (!resultado.ok) return { ok: false, motivo: resultado.motivo ?? 'Não foi possível criar o cadastro.' };
  return { ok: true, id: resultado.id! };
}

export const moverAdvogado = (id: string, status: AdvogadoStatus, motivoPerda?: string) =>
  chamar('mover_advogado', { p_advogado_id: id, p_status: status, p_motivo_perda: motivoPerda });

export const conferirOabAdvogado = (id: string) =>
  chamar('conferir_oab_advogado', { p_advogado_id: id });

export const vincularUsuarioAdvogado = (id: string, usuarioId: string) =>
  chamar('vincular_usuario_advogado', { p_advogado_id: id, p_usuario_id: usuarioId });
