import { supabase } from '@/src/lib/supabase';
import type { RegistroAuditoria } from '@/types';

/**
 * Leitura da trilha de auditoria. Só isso — a tabela só é escrita pelo
 * gatilho `auditar_papel()` (`security definer`), nenhum caminho do cliente
 * grava nela.
 */

const POR_PAGINA = 200;

interface LinhaAuditoria {
  id: string;
  tabela: string;
  registro_id: string;
  operacao: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  criado_em: string;
  ator: { nome: string; avatar_iniciais: string } | null;
}

const CAMPOS =
  'id, tabela, registro_id, operacao, antes, depois, criado_em, ator:perfis!auditoria_ator_id_fkey(nome, avatar_iniciais)' as const;

function paraDominio(linha: LinhaAuditoria): RegistroAuditoria {
  return {
    id: linha.id,
    tabela: linha.tabela,
    registroId: linha.registro_id,
    operacao: linha.operacao,
    antes: linha.antes,
    depois: linha.depois,
    criadoEm: linha.criado_em,
    ator: linha.ator ? { nome: linha.ator.nome, avatarIniciais: linha.ator.avatar_iniciais } : null,
  };
}

/** `API-R07` — pagina por dentro até esgotar a tabela. */
export async function listarAuditoria(): Promise<RegistroAuditoria[]> {
  const tudo: RegistroAuditoria[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('auditoria')
      .select(CAMPOS)
      .order('criado_em', { ascending: false })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar a auditoria: ${error.message}`);
    const linhas = data as unknown as LinhaAuditoria[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}
