import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
   * `carregarSessao()` já garante isso: sem linha em `perfis`, ou com
   * `status = 'inativo'`, o estado que ela devolve já é `bloqueado` — não há
   * mais o que verificar aqui. (Até usuários migrar para o banco, este trecho
   * também cruzava `remoto.perfil` contra a seed local por e-mail; sem seed,
   * não há mais dois mundos para casar.)
   */
  const perfil = remoto.estado === 'autenticado' ? remoto.perfil : null;

  const sessao = useMemo<SessaoValue>(() => ({ estado: remoto, encerrarSessao }), [remoto, encerrarSessao]);

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
