import { supabase } from '@/src/lib/supabase';
import type { NamedPermission, Usuario, UserRole, UserStatus } from '@/types';

/**
 * Quem está logado.
 *
 * `INV-12` — não existe cadastro livre, então não existe `signUp` aqui. A conta
 * nasce de um registro que passou pelo funil, com a inscrição da OAB conferida
 * por alguém do time; quem a cria é a função de borda de liberação de acesso.
 */

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

/* Literal único: texto montado com `+` chega como `string` e a inferência morre. */
const CAMPOS =
  'id, nome, email, papel, departamento, permissoes, advogado_id, avatar_iniciais, status, criado_em, criado_por, ultimo_acesso' as const;

function paraDominio(linha: LinhaPerfil): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    // A coluna é `papel` e o campo do domínio é `role`: o vocabulário do
    // framework fica em inglês, o do negócio em português.
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
 * O que a aplicação sabe sobre a sessão.
 *
 * `carregando` e `perfil: null` são estados distintos de propósito — ver
 * `API-R05` abaixo. Colapsar os dois num só é exatamente o que abre o sistema.
 */
export type EstadoDaSessao =
  | { estado: 'carregando' }
  | { estado: 'anonimo' }
  | { estado: 'autenticado'; perfil: Usuario }
  | { estado: 'bloqueado'; motivo: string };

/**
 * `API-R05` — falha de carregamento de perfil precisa fechar, não abrir.
 *
 * O erro clássico é seguir com papel indefinido quando o perfil não carrega.
 * Todo guard que bloqueia *por papel* deixa de bloquear, porque "indefinido"
 * não está em lista nenhuma — e o resultado é o oposto do pretendido: a falha
 * libera tudo. Por isso não existe retorno "autenticado sem perfil": sessão
 * válida sem linha em `perfis` é `bloqueado`, e sessão com perfil inativo
 * também.
 *
 * O mesmo vale do lado do banco: `papel_atual()` devolve NULL nesses casos, e
 * toda política compara com igualdade — comparação com NULL nunca é verdadeira.
 */
export async function carregarSessao(): Promise<EstadoDaSessao> {
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) return { estado: 'anonimo' };

  const { data, error } = await supabase
    .from('perfis')
    .select(CAMPOS)
    .eq('id', sessao.session.user.id)
    .maybeSingle();

  if (error) {
    return { estado: 'bloqueado', motivo: `Não foi possível carregar o perfil: ${error.message}` };
  }
  if (!data) {
    return {
      estado: 'bloqueado',
      motivo: 'Esta conta não tem perfil vinculado. Fale com quem liberou seu acesso.',
    };
  }

  const perfil = paraDominio(data as LinhaPerfil);

  if (perfil.status === 'inativo') {
    return { estado: 'bloqueado', motivo: 'Esta conta está desativada.' };
  }

  return { estado: 'autenticado', perfil };
}

export async function entrar(email: string, senha: string): Promise<{ erro: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (!error) return { erro: null };

  /*
   * A mensagem do provedor não distingue e-mail inexistente de senha errada, e
   * isso é proposital: dizer "este e-mail não existe" transforma a tela de
   * login num verificador de quem tem conta. Aqui só se traduz.
   */
  const generica = 'E-mail ou senha incorretos.';
  return { erro: error.message.includes('Invalid login') ? generica : error.message };
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut();
}

/** Reage a login, logout e renovação de token em outra aba. */
export function aoMudarSessao(callback: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}
