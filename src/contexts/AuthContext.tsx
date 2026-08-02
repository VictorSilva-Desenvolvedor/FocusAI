import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { perfilLocal } from '@/src/lib/sessao';
import { aoMudarSessao, carregarSessao, sair, type EstadoDaSessao } from '@/src/servicos/perfil';
import type { NamedPermission, Usuario } from '@/types';

interface AuthValue {
  perfil: Usuario;
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
   * Filtrar por ela no cliente é ergonomia; quem segura o isolamento é a
   * política de acesso da tabela (`API-R02`).
   */
  advogadoId: string | null;
  encerrarSessao: () => Promise<void>;
}

interface SessaoValue {
  estado: EstadoDaSessao;
  encerrarSessao: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);
const SessaoContext = createContext<SessaoValue | null>(null);

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
  const [remoto, setRemoto] = useState<EstadoDaSessao>({ estado: 'carregando' });

  useEffect(() => {
    let vivo = true;
    const recarregar = () => {
      /*
       * Consultar o Supabase de dentro do próprio ouvinte de sessão trava o
       * cliente: o ouvinte roda segurando o cadeado interno de autenticação, e
       * `getSession()` espera por esse mesmo cadeado. O sintoma é a promessa
       * que nunca resolve — a tela fica no esqueleto de carregamento para
       * sempre, sem erro nenhum no console. Sair do ouvinte antes de consultar
       * é o que a própria biblioteca recomenda.
       */
      setTimeout(() => {
        void carregarSessao().then((estado) => {
          if (vivo) setRemoto(estado);
        });
      }, 0);
    };

    recarregar();
    const cancelar = aoMudarSessao(recarregar);
    return () => {
      vivo = false;
      cancelar();
    };
  }, []);

  const encerrarSessao = useCallback(async () => {
    await sair();
    // Não espera o ouvinte: quem clicou em Sair precisa ver o efeito agora.
    setRemoto({ estado: 'anonimo' });
  }, []);

  /*
   * ACC-R08 — sessão autenticada que não resolve num perfil vira bloqueada.
   *
   * É o caso de uma conta que existe no banco com papel que a seed local não
   * tem. Deixar passar com perfil indefinido é o que `API-R05` proíbe: papel
   * indefinido não está em lista nenhuma, e todo guard que bloqueia por papel
   * deixa de bloquear.
   */
  const perfil = remoto.estado === 'autenticado' ? perfilLocal(remoto.perfil, usuarios) : null;

  const estado: EstadoDaSessao =
    remoto.estado === 'autenticado' && !perfil
      ? {
          estado: 'bloqueado',
          motivo: 'Esta conta não tem perfil correspondente nesta instalação.',
        }
      : remoto;

  const sessao = useMemo<SessaoValue>(() => ({ estado, encerrarSessao }), [estado, encerrarSessao]);

  const auth = useMemo<AuthValue | null>(() => {
    if (!perfil) return null;
    return {
      perfil,
      temPermissao: (p) => perfil.permissoes.includes(p),
      ehConformidade: normalizarDepartamento(perfil.departamento) === 'conformidade',
      ehAdvogado: perfil.role === 'advogado',
      advogadoId: perfil.advogado_id,
      encerrarSessao,
    };
  }, [perfil, encerrarSessao]);

  return (
    <SessaoContext value={sessao}>
      <AuthContext value={auth}>{children}</AuthContext>
    </SessaoContext>
  );
}

/** O estado da sessão. Só o portão de sessão precisa disto. */
export function useSessao(): SessaoValue {
  const ctx = use(SessaoContext);
  if (!ctx) throw new Error('useSessao precisa estar dentro de <AuthProvider>');
  return ctx;
}

/**
 * O perfil autenticado. Só é válido dentro do `PortaoDeSessao` — fora dele não
 * existe perfil, e devolver um em branco seria o mesmo que abrir a aplicação
 * para papel indefinido (`ACC-R08`).
 */
export function useAuth(): AuthValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro do <PortaoDeSessao>');
  return ctx;
}
