import { supabase } from '@/src/lib/supabase';
import type { DecisaoConformidade, Parecer, PlataformaAnuncio, TeseId } from '@/types';

/**
 * A camada de leitura e escrita do parecer de conformidade.
 *
 * `API-R06` — a regra de leitura mora aqui, não espalhada pela tela. Envio de
 * criativo é insert simples, sob política de acesso (`0023_conformidade_parecer.sql`);
 * emissão de parecer é `API-R08` — validada, então passa por função no banco.
 */

const POR_PAGINA = 200;

interface LinhaParecer {
  id: string;
  criativo: string;
  tese: TeseId;
  plataforma: PlataformaAnuncio;
  decisao: DecisaoConformidade | null;
  emitido_em: string | null;
  emitido_por: string | null;
  enviado_em: string;
  enviado_por: string;
  observacao: string | null;
}

const CAMPOS =
  'id, criativo, tese, plataforma, decisao, emitido_em, emitido_por, enviado_em, enviado_por, observacao' as const;

function paraDominio(linha: LinhaParecer): Parecer {
  return {
    id: linha.id,
    criativo: linha.criativo,
    tese: linha.tese,
    plataforma: linha.plataforma,
    decisao: linha.decisao,
    emitidoEm: linha.emitido_em,
    emitidoPor: linha.emitido_por,
    enviadoEm: linha.enviado_em,
    enviadoPor: linha.enviado_por,
    observacao: linha.observacao,
  };
}

/** `API-R07` — pagina sozinha, por dentro, até esgotar a tabela. */
export async function listarPareceres(): Promise<Parecer[]> {
  const tudo: Parecer[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('pareceres')
      .select(CAMPOS)
      .order('enviado_em', { ascending: false })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar os pareceres: ${error.message}`);
    const linhas = data as unknown as LinhaParecer[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}

export type Resultado = { ok: true } | { ok: false; motivo: string };

/**
 * Envio simples — quem produz o criativo manda para a fila. A política de
 * acesso já recusa papel fora da lista e carimba `enviado_por` com a própria
 * sessão; não há transação nem validação cruzada aqui, então não precisa de
 * função no banco (`API-R08` é para o que precisa).
 */
export async function enviarCriativo(
  criativo: string,
  tese: TeseId,
  plataforma: PlataformaAnuncio,
): Promise<Resultado> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, motivo: 'Sessão expirada — entre de novo.' };

  const { error: erroInsert } = await supabase.from('pareceres').insert({
    criativo,
    tese,
    plataforma,
    enviado_por: data.user.id,
  });

  if (erroInsert) return { ok: false, motivo: erroInsert.message };
  return { ok: true };
}

/**
 * `CNF-R21` — o gate de "aprovado com ressalva" mora inteiro na função
 * `emitir_parecer`, junto com a trava de imutabilidade (`INV-13`). Esta camada
 * só chama e traduz o retorno.
 */
export async function emitirParecer(
  parecerId: string,
  decisao: DecisaoConformidade,
  observacao: string | null,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc('emitir_parecer', {
    p_parecer_id: parecerId,
    p_decisao: decisao,
    p_observacao: observacao ?? undefined,
  });

  if (error) {
    console.error('[conformidade]', error.message);
    return { ok: false, motivo: 'Falha de conexão. Tente novamente.' };
  }
  return data as Resultado;
}
