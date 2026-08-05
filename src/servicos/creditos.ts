import { supabase } from '@/src/lib/supabase';
import type { MovimentoCredito, TipoMovimento } from '@/types';

const POR_PAGINA = 200;

interface LinhaMovimento {
  id: string;
  advogado_id: string;
  tipo: TipoMovimento;
  creditos: number;
  valor: number;
  lead_id: string | null;
  descricao: string;
  em: string;
}

const CAMPOS = 'id, advogado_id, tipo, creditos, valor, lead_id, descricao, em';

function paraDominio(linha: LinhaMovimento): MovimentoCredito {
  return {
    id: linha.id,
    advogadoId: linha.advogado_id,
    tipo: linha.tipo,
    creditos: linha.creditos,
    valor: Number(linha.valor),
    leadId: linha.lead_id,
    descricao: linha.descricao,
    em: linha.em,
  };
}

/**
 * O extrato.
 *
 * Não existe função de inserção aqui, e é de propósito. `INV-14` — crédito só
 * entra com confirmação de pagamento, e o gatilho é o webhook do provedor, que
 * roda fora do navegador. Consumo e devolução são lançados dentro das funções
 * transacionais de compra e devolução, junto com a escrita no lead.
 *
 * Se algum dia a operação precisar destravar alguém com urgência, o caminho é o
 * ajuste manual — que é um tipo de movimento próprio, exige motivo e aparece no
 * extrato como tal. Não é atalho no gatilho.
 */
export async function listarMovimentos(pagina = 0): Promise<MovimentoCredito[]> {
  const de = pagina * POR_PAGINA;
  const { data, error } = await supabase
    .from('movimentos_creditos')
    .select(CAMPOS)
    .order('em', { ascending: false })
    .range(de, de + POR_PAGINA - 1);

  if (error) throw new Error(`Falha ao carregar o extrato: ${error.message}`);
  return (data as LinhaMovimento[]).map(paraDominio);
}

export type Resultado = { ok: true } | { ok: false; motivo: string };

/**
 * `CRE-R06` — a porta legítima para mexer no saldo à mão. `tipo` não é
 * parâmetro: esta função só lança `'ajuste'`, nunca se disfarça de compra ou
 * consumo. A validação — permissão, motivo, saldo que não fica negativo —
 * mora na função (`0013_ajuste_manual_de_credito.sql`), não aqui.
 */
export async function ajustarCreditos(
  advogadoId: string,
  creditos: number,
  motivo: string,
): Promise<Resultado> {
  const { data, error } = await supabase.rpc('ajustar_creditos_advogado', {
    p_advogado_id: advogadoId,
    p_creditos: creditos,
    p_motivo: motivo,
  });
  if (error) return { ok: false, motivo: error.message };
  return data as Resultado;
}

/**
 * O extrato de um advogado.
 *
 * O filtro por `advogado_id` é ergonomia, não controle de acesso: quem monta a
 * consulta é o cliente, e nada o impede de pedir a de outro. Quem segura o
 * isolamento é a política da tabela (`API-R02`) — pedir o extrato alheio
 * devolve lista vazia, não erro.
 */
export async function extratoDoAdvogado(advogadoId: string): Promise<MovimentoCredito[]> {
  const { data, error } = await supabase
    .from('movimentos_creditos')
    .select(CAMPOS)
    .eq('advogado_id', advogadoId)
    .order('em', { ascending: false })
    .range(0, POR_PAGINA - 1);

  if (error) throw new Error(`Falha ao carregar o extrato: ${error.message}`);
  return (data as LinhaMovimento[]).map(paraDominio);
}
