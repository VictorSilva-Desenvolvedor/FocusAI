import { supabase } from '@/src/lib/supabase';

/**
 * O único aviso pessoal que o produto já promete hoje: o painel do advogado
 * diz "você recebe aviso quando entra lead novo" em três lugares
 * (`PainelDoAdvogado.tsx`), sem ter onde desligar. Não é central de alertas —
 * é essa preferência, e só ela, até uma segunda existir de verdade.
 */

export async function lerAvisoLeadNovo(perfilId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('perfis')
    .select('avisar_lead_novo')
    .eq('id', perfilId)
    .single();

  if (error) throw new Error(`Falha ao carregar a preferência: ${error.message}`);
  return data.avisar_lead_novo;
}

export async function definirAvisoLeadNovo(
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const { data, error } = await supabase.rpc('definir_aviso_lead_novo', { p_ativo: ativo });
  if (error) {
    console.error('[notificacoes]', error.message);
    return { ok: false, motivo: 'Falha de conexão. Tente novamente.' };
  }
  return data as { ok: true } | { ok: false; motivo: string };
}
