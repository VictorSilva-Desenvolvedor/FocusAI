import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import type { NamedPermission, Usuario } from '@/types';

interface AuthValue {
  perfil: Usuario;
  /** Troca o perfil ativo. Existe só na maquete, para demonstrar a matriz de acesso. */
  trocarPerfil: (id: string) => void;
  perfisDisponiveis: Usuario[];
  temPermissao: (p: NamedPermission) => boolean;
  /**
   * CNF-R21 — liberar um criativo "com ressalva" é gate por departamento
   * (`Conformidade`), não por papel. Nem administrador escapa: assumir risco
   * regulatório é atribuição de uma função específica, não privilégio
   * hierárquico.
   */
  ehConformidade: boolean;
  /** O único papel externo. Toda tela que mostra dado de lead consulta isto. */
  ehAdvogado: boolean;
  /**
   * LED-R06 — a chave de isolamento entre carteiras. Nulo para o time interno.
   * Filtrar por ela no cliente é ergonomia; quando o backend entrar, quem
   * segura o isolamento é a política de acesso da tabela (`API-R02`).
   */
  advogadoId: string | null;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Normaliza "Conformidade", "conformidade", "Conformidade " para comparação. */
function normalizarDepartamento(valor: string | null): string {
  return (valor ?? '')
    .normalize('NFD')
    // Depois do NFD, os acentos viram marcas combinantes e caem junto com
    // espaços e hífens neste filtro.
    .replace(/[^a-z]/gi, '')
    .toLowerCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { usuarios } = useUsuarios();
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const value = useMemo<AuthValue>(() => {
    // Só quem pode entrar no sistema aparece no seletor. Uma conta desativada
    // no meio da sessão cai para a primeira disponível em vez de quebrar.
    const disponiveis = usuarios.filter((u) => u.status !== 'inativo');
    const perfil = disponiveis.find((u) => u.id === perfilId) ?? disponiveis[0] ?? usuarios[0];

    return {
      perfil,
      trocarPerfil: setPerfilId,
      perfisDisponiveis: disponiveis,
      temPermissao: (p) => perfil.permissoes.includes(p),
      ehConformidade: normalizarDepartamento(perfil.departamento) === 'conformidade',
      ehAdvogado: perfil.role === 'advogado',
      advogadoId: perfil.advogado_id,
    };
  }, [usuarios, perfilId]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
