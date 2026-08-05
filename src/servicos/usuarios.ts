import { supabase } from '@/src/lib/supabase';
import type { NamedPermission, UserRole, UserStatus, Usuario, UsuarioFormData } from '@/types';

/**
 * A camada de leitura e escrita de usuário.
 *
 * `criar`/`criarParaAdvogado` não têm função no banco: criar linha em
 * `auth.users` exige a Admin API, que só roda com privilégio de servidor
 * (`API-R03`) — por isso passam pela função de borda `criar-usuario`, não por
 * `supabase.rpc`. `atualizar` e `alterarStatus` só tocam uma linha que já
 * existe em `perfis`, e essas sim são funções no banco, no mesmo desenho de
 * `src/servicos/advogados.ts`.
 */

const POR_PAGINA = 200;

interface LinhaPerfil {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
  departamento: string | null;
  permissoes: string[];
  advogado_id: string | null;
  avatar_iniciais: string;
  status: UserStatus;
  criado_em: string;
  criado_por: string | null;
  ultimo_acesso: string | null;
}

const CAMPOS =
  'id, nome, email, papel, departamento, permissoes, advogado_id, avatar_iniciais, status, criado_em, criado_por, ultimo_acesso' as const;

function paraDominio(linha: LinhaPerfil): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    role: linha.papel,
    departamento: linha.departamento,
    permissoes: (linha.permissoes ?? []) as NamedPermission[],
    advogado_id: linha.advogado_id,
    avatar_iniciais: linha.avatar_iniciais,
    status: linha.status,
    criado_em: linha.criado_em,
    criado_por: linha.criado_por,
    ultimo_acesso: linha.ultimo_acesso,
  };
}

/**
 * `API-R07` — lista grande exige paginação explícita. Hoje o time inteiro
 * cabe bem abaixo do corte de 1.000; o parâmetro existe para o dia em que não
 * couber mais.
 */
export async function listarUsuarios(pagina = 0): Promise<Usuario[]> {
  const de = pagina * POR_PAGINA;
  const { data, error } = await supabase
    .from('perfis')
    .select(CAMPOS)
    .order('criado_em', { ascending: false })
    .range(de, de + POR_PAGINA - 1);

  if (error) throw new Error(`Falha ao carregar usuários: ${error.message}`);
  return (data as LinhaPerfil[]).map(paraDominio);
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

export type Resultado = { ok: true } | { ok: false; motivo: string };

export const atualizarUsuario = async (id: string, dados: UsuarioFormData): Promise<Resultado> => {
  const { data, error } = await supabase.rpc('atualizar_usuario', {
    p_id: id,
    p_nome: dados.nome,
    p_email: dados.email,
    p_papel: dados.role,
    p_departamento: dados.departamento || undefined,
    p_permissoes: dados.permissoes,
  });
  if (error) return { ok: false, motivo: error.message };
  return data as Resultado;
};

export const alterarStatusUsuarios = async (ids: string[], status: UserStatus): Promise<Resultado> => {
  const { data, error } = await supabase.rpc('alterar_status_usuarios', { p_ids: ids, p_status: status });
  if (error) return { ok: false, motivo: error.message };
  return data as Resultado;
};

interface ResultadoCriacao {
  ok: boolean;
  id?: string;
  motivo?: string;
}

async function chamarCriarUsuario(corpo: Record<string, unknown>): Promise<{ ok: true; id: string } | { ok: false; motivo: string }> {
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) return { ok: false, motivo: 'Sessão ausente.' };

  const { data, error } = await supabase.functions.invoke<ResultadoCriacao>('criar-usuario', {
    body: corpo,
  });

  // `functions.invoke` devolve `error` tanto para falha de transporte quanto
  // para resposta HTTP de erro — a função de borda sempre responde um corpo
  // {ok, motivo}, então o motivo real mora em `error.context`, não em
  // `error.message` (que é só "Edge Function returned a non-2xx status code").
  if (error) {
    const contexto = (error as { context?: Response }).context;
    if (contexto) {
      try {
        const corpoErro = (await contexto.clone().json()) as ResultadoCriacao;
        return { ok: false, motivo: corpoErro.motivo ?? error.message };
      } catch {
        // corpo não veio como JSON — segue para o motivo genérico abaixo.
      }
    }
    return { ok: false, motivo: error.message };
  }

  if (!data?.ok || !data.id) {
    return { ok: false, motivo: data?.motivo ?? 'Não foi possível criar a conta.' };
  }
  return { ok: true, id: data.id };
}

/** INV-12 — conta criada por aqui é sempre do time interno (nunca `advogado`). */
export const criarUsuario = (dados: UsuarioFormData) =>
  chamarCriarUsuario({
    nome: dados.nome,
    email: dados.email,
    role: dados.role,
    departamento: dados.departamento,
    permissoes: dados.permissoes,
  });

/**
 * ADV-R09 — a única porta por onde nasce conta de advogado. `paraAdvogadoId`
 * é o que a função de borda usa para saber que este caminho, e não o
 * genérico, está sendo chamado — e para exigir a permissão
 * `advogado:liberar_acesso` em vez da hierarquia comum de `ACC-R02`.
 */
export const criarUsuarioParaAdvogado = (dados: UsuarioFormData, advogadoId: string) =>
  chamarCriarUsuario({
    nome: dados.nome,
    email: dados.email,
    role: dados.role,
    departamento: dados.departamento,
    permissoes: dados.permissoes,
    paraAdvogadoId: advogadoId,
  });
