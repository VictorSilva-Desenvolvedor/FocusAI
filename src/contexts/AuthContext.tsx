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
  /*
   * O perfil padrão é resolvido uma vez, na montagem.
   *
   * Antes ele era "o primeiro da lista", e conta nova entra no topo: criar um
   * usuário trocava o perfil ativo sem ninguém pedir. Com a conta de advogado
   * nascendo da liberação de acesso (`ADV-R09`), o efeito ficou grave — quem
   * liberasse um acesso passaria a enxergar o sistema pelo lado de fora, com o
   * menu do papel externo, sem entender por quê.
   *
   * E o padrão é sempre uma conta interna: `advogado` é o papel de fora, e o
   * sistema não abre por ele. Conta de advogado criada na sessão fica
   * persistida no topo da lista, então "o primeiro da lista" viraria o padrão
   * no recarregamento seguinte — e o guard de rota, corretamente, devolveria
   * a operação inteira ao painel do comprador.
   */
  const [padraoId] = useState<string | null>(
    () => (usuarios.find((u) => u.role !== 'advogado') ?? usuarios[0])?.id ?? null,
  );

  const value = useMemo<AuthValue>(() => {
    // Só quem pode entrar no sistema aparece no seletor. Uma conta desativada
    // no meio da sessão cai para o padrão em vez de quebrar.
    const disponiveis = usuarios.filter((u) => u.status !== 'inativo');
    const perfil =
      disponiveis.find((u) => u.id === perfilId) ??
      disponiveis.find((u) => u.id === padraoId) ??
      disponiveis[0] ??
      usuarios[0];

    return {
      perfil,
      trocarPerfil: setPerfilId,
      perfisDisponiveis: disponiveis,
      temPermissao: (p) => perfil.permissoes.includes(p),
      ehConformidade: normalizarDepartamento(perfil.departamento) === 'conformidade',
      ehAdvogado: perfil.role === 'advogado',
      advogadoId: perfil.advogado_id,
    };
  }, [usuarios, perfilId, padraoId]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
