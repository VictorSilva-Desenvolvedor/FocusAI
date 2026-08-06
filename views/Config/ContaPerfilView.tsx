import { useEffect, useId, useState } from 'react';
import { CheckCircle2, KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { atualizarProprioPerfil, redefinirSenha } from '@/src/servicos/perfil';
import { ROLE_CURTO } from '@/src/lib/usuarios';
import { Campo, entrada } from '@/src/components/ui/Campo';
import type { UserRole } from '@/types';

/** Mesma regra de `atualizar_proprio_perfil` no banco — nome e sobrenome. */
function nomeValido(nome: string): boolean {
  return nome.trim().split(/\s+/).filter(Boolean).length >= 2;
}

/**
 * `ACC-R03` — a tela de perfil que `atualizar_usuario` já citava. Só edita o
 * que é seguro editar sozinho: nome e senha. Papel, permissão, departamento e
 * e-mail continuam de fora — trocar qualquer um deles pela própria tela seria
 * autopromoção, e é exatamente o que a regra impede.
 */
export function ContaPerfilView() {
  const { perfil, recarregarPerfil } = useAuth();

  return (
    <div className="max-w-xl space-y-6">
      <CartaoNome nome={perfil.nome} email={perfil.email} papel={perfil.role} departamento={perfil.departamento} avatarIniciais={perfil.avatar_iniciais} aoSalvar={recarregarPerfil} />
      <CartaoSenha />
    </div>
  );
}

// ---------------------------------------------------------------------------

function CartaoNome({
  nome,
  email,
  papel,
  departamento,
  avatarIniciais,
  aoSalvar,
}: {
  nome: string;
  email: string;
  papel: UserRole;
  departamento: string | null;
  avatarIniciais: string;
  aoSalvar: () => Promise<void>;
}) {
  const idBase = useId();
  const [valor, setValor] = useState(nome);
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // O perfil recarrega depois de salvar (`recarregarPerfil`); segue o nome novo.
  useEffect(() => setValor(nome), [nome]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const alterado = valor.trim() !== nome.trim();

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeValido(valor)) {
      setErro('Informe nome e sobrenome — as iniciais do avatar saem daqui.');
      return;
    }
    setErro(undefined);
    setEnviando(true);
    const r = await atualizarProprioPerfil(valor.trim());
    setEnviando(false);

    if (!r.ok) {
      setErro(r.motivo);
      return;
    }
    await aoSalvar();
    setToast('Nome atualizado.');
  }

  return (
    <section className="card p-5">
      <h2 className="card-title">Dados pessoais</h2>
      <p className="subtitulo-pagina mt-1 mb-4">
        Papel, departamento e permissões não são editáveis por aqui (ACC-R03) — fale com quem
        administra Usuários.
      </p>

      <form onSubmit={submeter} className="space-y-4">
        <Campo id={`${idBase}-nome`} rotulo="Nome completo" erro={erro}>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="size-9 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold bg-roxo-600 text-white"
            >
              {avatarIniciais}
            </div>
            <input
              id={`${idBase}-nome`}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoComplete="off"
              className={entrada(erro)}
            />
          </div>
        </Campo>

        <Campo id={`${idBase}-email`} rotulo="E-mail" dica="Alterar e-mail ainda não está disponível por aqui.">
          <input id={`${idBase}-email`} value={email} disabled className={entrada()} />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo id={`${idBase}-papel`} rotulo="Papel">
            <input id={`${idBase}-papel`} value={ROLE_CURTO[papel]} disabled className={entrada()} />
          </Campo>
          <Campo id={`${idBase}-depto`} rotulo="Departamento">
            <input id={`${idBase}-depto`} value={departamento ?? '—'} disabled className={entrada()} />
          </Campo>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!alterado || enviando}
            className="btn btn-primario"
          >
            <UserRound className="size-4" />
            Salvar alterações
          </button>
        </div>
      </form>

      {toast && (
        <div role="status" className="toast bg-grafite-900 max-w-[calc(100vw-2rem)]">
          <CheckCircle2 className="size-4 shrink-0 text-roxo-400" />
          <span className="text-[13px]">{toast}</span>
        </div>
      )}
    </section>
  );
}

function CartaoSenha() {
  const idBase = useId();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();

    if (senha.length < 6) {
      setErro('A senha precisa de pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas precisam ser iguais.');
      return;
    }

    setErro(undefined);
    setEnviando(true);
    const r = await redefinirSenha(senha);
    setEnviando(false);

    if (r.erro) {
      setErro(r.erro);
      return;
    }
    setSenha('');
    setConfirmacao('');
    setToast('Senha atualizada.');
  }

  return (
    <section className="card p-5">
      <h2 className="card-title">Segurança</h2>
      <p className="subtitulo-pagina mt-1 mb-4">Troque a senha desta conta.</p>

      <form onSubmit={submeter} className="space-y-4">
        <Campo id={`${idBase}-senha`} rotulo="Nova senha">
          <input
            id={`${idBase}-senha`}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            className={entrada(erro)}
          />
        </Campo>

        <Campo id={`${idBase}-confirmacao`} rotulo="Confirmar nova senha" erro={erro}>
          <input
            id={`${idBase}-confirmacao`}
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            className={entrada(erro)}
          />
        </Campo>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!senha || !confirmacao || enviando}
            className="btn btn-primario"
          >
            <KeyRound className="size-4" />
            Atualizar senha
          </button>
        </div>
      </form>

      {toast && (
        <div role="status" className="toast bg-grafite-900 max-w-[calc(100vw-2rem)]">
          <CheckCircle2 className="size-4 shrink-0 text-roxo-400" />
          <span className="text-[13px]">{toast}</span>
        </div>
      )}
    </section>
  );
}
