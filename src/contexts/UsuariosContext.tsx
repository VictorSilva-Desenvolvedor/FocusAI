import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { USUARIOS_SEED } from '@/src/lib/mockData';
import { iniciais } from '@/src/lib/usuarios';
import type { UserStatus, Usuario, UsuarioFormData } from '@/types';

const CHAVE = 'crm.usuarios.v1';

interface UsuariosValue {
  usuarios: Usuario[];
  criar: (dados: UsuarioFormData, autorId: string) => Usuario;
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

  const criar = useCallback(
    (dados: UsuarioFormData, autorId: string): Usuario => {
      const novo: Usuario = {
        id: `u-${crypto.randomUUID().slice(0, 8)}`,
        nome: dados.nome.trim(),
        email: dados.email.trim().toLowerCase(),
        role: dados.role,
        departamento: dados.departamento.trim() || null,
        permissoes: [...dados.permissoes],
        white_label_id: null,
        avatar_iniciais: iniciais(dados.nome),
        // ACC-R22 — conta nasce como convite pendente, nunca ativa. Só vira
        // ativa quando a pessoa entra pela primeira vez.
        status: 'convite_pendente',
        criado_em: new Date().toISOString(),
        criado_por: autorId,
        ultimo_acesso: null,
      };
      aplicar((atual) => [novo, ...atual]);
      return novo;
    },
    [aplicar],
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
    () => ({ usuarios, criar, atualizar, alterarStatus, restaurarSeed }),
    [usuarios, criar, atualizar, alterarStatus, restaurarSeed],
  );

  return <UsuariosContext value={value}>{children}</UsuariosContext>;
}

export function useUsuarios(): UsuariosValue {
  const ctx = use(UsuariosContext);
  if (!ctx) throw new Error('useUsuarios precisa estar dentro de <UsuariosProvider>');
  return ctx;
}
