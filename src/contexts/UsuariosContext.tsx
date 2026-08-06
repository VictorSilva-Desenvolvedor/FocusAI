import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import {
  alterarStatusUsuarios,
  atualizarUsuario,
  criarUsuario,
  criarUsuarioParaAdvogado,
  listarUsuarios,
} from '@/src/servicos/usuarios';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import type { UserStatus, Usuario, UsuarioFormData } from '@/types';

export type ResultadoUsuario = { ok: true; id: string } | { ok: false; motivo: string };
export type ResultadoOperacao = { ok: true } | { ok: false; motivo: string };

/*
 * Leitura e escrita no banco. `criar`/`criarParaAdvogado` chamam a função de
 * borda `criar-usuario` — criar linha em `auth.users` precisa da Admin API, e
 * Admin API não roda numa função Postgres chamável direto pelo cliente
 * (`API-R03`). `atualizar`/`alterarStatus` são funções no banco comuns, no
 * mesmo desenho de `AdvogadosContext`: a validação de `ACC-R02`/`ACC-R03`
 * mora na função, não aqui — a tela decide cedo só para dar o aviso na hora.
 */

interface UsuariosValue {
  usuarios: Usuario[];
  /** Verdadeiro enquanto a primeira carga não voltou do banco. */
  carregando: boolean;
  /** Mensagem da falha de carregamento, ou nulo. */
  erro: string | null;
  criar: (dados: UsuarioFormData) => Promise<ResultadoUsuario>;
  /**
   * INV-12 / ADV-R09 — a única porta por onde nasce conta de advogado, e ela
   * fica no funil, depois da inscrição conferida. Existe separada de `criar`
   * porque é o único caminho autorizado a preencher `advogado_id`, que é a
   * chave de isolamento entre carteiras (`LED-R06`).
   */
  criarParaAdvogado: (dados: UsuarioFormData, advogadoId: string) => Promise<ResultadoUsuario>;
  atualizar: (id: string, dados: UsuarioFormData) => Promise<ResultadoOperacao>;
  alterarStatus: (ids: string[], status: UserStatus) => Promise<ResultadoOperacao>;
  /** Busca de novo no banco e devolve a lista. */
  recarregar: () => Promise<Usuario[]>;
}

const UsuariosContext = createContext<UsuariosValue | null>(null);

export function UsuariosProvider({ children }: { children: ReactNode }) {
  const { dados: usuarios, carregando, erro, recarregar } = useDadosDaSessao(listarUsuarios, 'usuarios');

  const criar = useCallback(
    async (dados: UsuarioFormData): Promise<ResultadoUsuario> => {
      const r = await criarUsuario(dados);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const criarParaAdvogado = useCallback(
    async (dados: UsuarioFormData, advogadoId: string): Promise<ResultadoUsuario> => {
      const r = await criarUsuarioParaAdvogado(dados, advogadoId);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const atualizar = useCallback(
    async (id: string, dados: UsuarioFormData): Promise<ResultadoOperacao> => {
      const r = await atualizarUsuario(id, dados);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const alterarStatus = useCallback(
    async (ids: string[], status: UserStatus): Promise<ResultadoOperacao> => {
      const r = await alterarStatusUsuarios(ids, status);
      if (r.ok) await recarregar();
      return r;
    },
    [recarregar],
  );

  const value = useMemo<UsuariosValue>(
    () => ({ usuarios, carregando, erro, criar, criarParaAdvogado, atualizar, alterarStatus, recarregar }),
    [usuarios, carregando, erro, criar, criarParaAdvogado, atualizar, alterarStatus, recarregar],
  );

  return <UsuariosContext value={value}>{children}</UsuariosContext>;
}

export function useUsuarios(): UsuariosValue {
  const ctx = use(UsuariosContext);
  if (!ctx) throw new Error('useUsuarios precisa estar dentro de <UsuariosProvider>');
  return ctx;
}
