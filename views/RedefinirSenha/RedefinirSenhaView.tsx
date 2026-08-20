import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Campo, entrada } from '@/src/components/ui/Campo';
import { ESTILO_BLOCO, ESTILO_TEXTO } from '@/src/lib/estilo';
import { confirmarRecuperacao, redefinirSenha } from '@/src/servicos/perfil';

/**
 * A rota do link de recuperação de senha. Existe fora do `PortaoDeSessao`, ao
 * lado de `/login` — quem chega aqui não tem sessão normal, só o `token_hash`
 * que `verifyOtp()` troca por uma sessão de recuperação, restrita a chamar
 * `redefinirSenha()`.
 */
export function RedefinirSenhaView() {
  const [params] = useSearchParams();
  const [estado, setEstado] = useState<'confirmando' | 'pronto' | 'invalido'>('confirmando');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    const tokenHash = params.get('token_hash');
    if (!tokenHash || params.get('type') !== 'recovery') {
      setEstado('invalido');
      return;
    }
    void confirmarRecuperacao(tokenHash).then((r) => {
      if (r.erro) {
        setErro(r.erro);
        setEstado('invalido');
      } else {
        setEstado('pronto');
      }
    });
  }, [params]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro('A senha precisa de ao menos 6 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas precisam ser iguais.');
      return;
    }

    setEnviando(true);
    const r = await redefinirSenha(senha);
    setEnviando(false);

    if (r.erro) {
      setErro(r.erro);
      return;
    }
    setConcluido(true);
  }

  return (
    <div className="min-h-screen bg-fundo grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-entrada-suave">
        <div className="flex flex-col items-center gap-3 mb-7">
          <img src="/logo.png" alt="Focus AI" className="size-14 shadow-flutuante rounded-full" />
          <div className="text-center leading-none">
            <div className="font-semibold text-xl text-grafite-900 tracking-tight">Focus AI</div>
            <div className="text-[11px] text-stone-600 tracking-[0.12em] uppercase mt-1.5">
              Leads qualificados
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          {estado === 'confirmando' && (
            <div className="flex items-center gap-2.5 text-stone-500 text-sm py-4 justify-center">
              <Loader2 size={16} className="animate-spin" />
              Confirmando o link…
            </div>
          )}

          {estado === 'invalido' && (
            <>
              <div className={`rounded-lg border p-3 flex gap-2.5 ${ESTILO_BLOCO.erro}`}>
                <AlertCircle className={`size-4 shrink-0 mt-px ${ESTILO_TEXTO.erro}`} />
                <p className="text-[13px] text-stone-700">
                  {erro ?? 'Este link de redefinição não é válido.'}
                </p>
              </div>
              <Link to="/login" className="btn btn-secundario w-full">
                Voltar ao login
              </Link>
            </>
          )}

          {estado === 'pronto' && concluido && (
            <>
              <div className={`rounded-lg border p-3 flex gap-2.5 ${ESTILO_BLOCO.sucesso}`}>
                <CheckCircle2 className={`size-4 shrink-0 mt-px ${ESTILO_TEXTO.sucesso}`} />
                <p className="text-[13px] text-stone-700">
                  Senha alterada. Já pode entrar com ela.
                </p>
              </div>
              <Link to="/login" className="btn btn-primario w-full">
                Ir para o login
              </Link>
            </>
          )}

          {estado === 'pronto' && !concluido && (
            <form onSubmit={aoEnviar} className="space-y-4" noValidate>
              <div>
                <h1 className="card-title">Nova senha</h1>
                <p className="nota mt-1">Escolha a senha que vai usar daqui para frente.</p>
              </div>

              <Campo id="nova-senha" rotulo="Nova senha">
                <div className="relative">
                  <input
                    id="nova-senha"
                    type={visivel ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={`${entrada()} pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setVisivel((v) => !v)}
                    className="btn-icone absolute right-0 top-0 size-9 hover:text-stone-600"
                  >
                    {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>

              <Campo id="confirmar-senha" rotulo="Confirme a nova senha">
                <input
                  id="confirmar-senha"
                  type={visivel ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  className={entrada()}
                />
              </Campo>

              {erro && <p className="campo-mensagem-erro">{erro}</p>}

              <button
                type="submit"
                disabled={enviando || !senha || !confirmacao}
                className="btn btn-primario w-full"
              >
                {enviando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
