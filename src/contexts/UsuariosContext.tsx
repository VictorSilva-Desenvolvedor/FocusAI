import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { USUARIOS_SEED } from '@/src/lib/mockData';
import { iniciais } from '@/src/lib/usuarios';
import type { UserStatus, Usuario, UsuarioFormData } from '@/types';

const CHAVE = 'focus.usuarios.v1';

interface UsuariosValue {
  usuarios: Usuario[];
  criar: (dados: UsuarioFormData, autorId: string) => Usuario;
  /**
   * INV-12 / ADV-R09 — a única porta por onde nasce conta de advogado, e ela
   * fica no funil, depois da inscrição conferida. Existe separada de `criar`
   * porque é o único caminho autorizado a preencher `advogado_id`, que é a
   * chave de isolamento entre carteiras (`LED-R06`).
   */
  criarParaAdvogado: (dados: UsuarioFormData, advogadoId: string, autorId: string) => Usuario;
  atualizar: (id: string, dados: UsuarioFormData) => void;
  alterarStatus: (ids: string[], status: UserStatus) => void;
  restaurarSeed: () => void;
}

const UsuariosContext = createContext<UsuariosValue | null>(null);

function carregar(): Usuario[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return USUARIOS_SEED;
    const dados = JSON.parse(bruto);
    // Um payload corrompido não pode derrubar o app inteiro na inicialização.
    if (!Array.isArray(dados) || dados.length === 0) return USUARIOS_SEED;
    return dados as Usuario[];
  } catch {
    return USUARIOS_SEED;
  }
}

function persistir(usuarios: Usuario[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(usuarios));
  } catch {
    // Modo privativo ou cota estourada. A sessão continua funcionando em
    // memória; perder a persistência é melhor que quebrar o cadastro.
  }
}

export function UsuariosProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>(carregar);

  const aplicar = useCallback((proximo: (atual: Usuario[]) => Usuario[]) => {
    setUsuarios((atual) => {
      const novo = proximo(atual);
      persistir(novo);
      return novo;
    });
  }, []);

  const montar = useCallback(
    (dados: UsuarioFormData, autorId: string, advogadoId: string | null): Usuario => ({
      id: `u-${crypto.randomUUID().slice(0, 8)}`,
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      role: dados.role,
      departamento: dados.departamento.trim() || null,
      permissoes: [...dados.permissoes],
      advogado_id: advogadoId,
      avatar_iniciais: iniciais(dados.nome),
      // ACC-R22 — conta nasce como convite pendente, nunca ativa. Só vira
      // ativa quando a pessoa entra pela primeira vez.
      status: 'convite_pendente',
      criado_em: new Date().toISOString(),
      criado_por: autorId,
      ultimo_acesso: null,
    }),
    [],
  );

  const criar = useCallback(
    (dados: UsuarioFormData, autorId: string): Usuario => {
      // INV-12 — conta criada por aqui é sempre do time interno. Advogado não
      // passa por este caminho: a conta dele nasce da liberação de acesso no
      // funil, por `criarParaAdvogado`, e é lá que `advogado_id` é preenchido.
      const novo = montar(dados, autorId, null);
      aplicar((atual) => [novo, ...atual]);
      return novo;
    },
    [aplicar, montar],
  );

  const criarParaAdvogado = useCallback(
    (dados: UsuarioFormData, advogadoId: string, autorId: string): Usuario => {
      /*
       * LED-R06 — `advogado_id` é a chave de isolamento entre carteiras, e é
       * por isso que ele só é escrito aqui: gravá-lo pelo formulário genérico
       * significaria que apontar uma conta qualquer para uma carteira qualquer
       * seria questão de escolher um valor num campo.
       *
       * A conta nasce em convite pendente como qualquer outra (`ACC-R22`). O
       * envio do convite depende de serviço externo e continua não existindo —
       * está anotado como pendência, não simulado aqui.
       */
      const novo = montar({ ...dados, role: 'advogado' }, autorId, advogadoId);
      aplicar((atual) => [novo, ...atual]);
      return novo;
    },
    [aplicar, montar],
  );

  const atualizar = useCallback(
    (id: string, dados: UsuarioFormData) => {
      aplicar((atual) =>
        atual.map((u) =>
          u.id === id
            ? {
                ...u,
                nome: dados.nome.trim(),
                email: dados.email.trim().toLowerCase(),
                role: dados.role,
                departamento: dados.departamento.trim() || null,
                permissoes: [...dados.permissoes],
                avatar_iniciais: iniciais(dados.nome),
                // criado_em, criado_por e ultimo_acesso nunca são reescritos.
              }
            : u,
        ),
      );
    },
    [aplicar],
  );

  const alterarStatus = useCallback(
    (ids: string[], status: UserStatus) => {
      const alvo = new Set(ids);
      aplicar((atual) => atual.map((u) => (alvo.has(u.id) ? { ...u, status } : u)));
    },
    [aplicar],
  );

  const restaurarSeed = useCallback(() => {
    aplicar(() => USUARIOS_SEED);
  }, [aplicar]);

  const value = useMemo<UsuariosValue>(
    () => ({ usuarios, criar, criarParaAdvogado, atualizar, alterarStatus, restaurarSeed }),
    [usuarios, criar, criarParaAdvogado, atualizar, alterarStatus, restaurarSeed],
  );

  return <UsuariosContext value={value}>{children}</UsuariosContext>;
}

export function useUsuarios(): UsuariosValue {
  const ctx = use(UsuariosContext);
  if (!ctx) throw new Error('useUsuarios precisa estar dentro de <UsuariosProvider>');
  return ctx;
}
