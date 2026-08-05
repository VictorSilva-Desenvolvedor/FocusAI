import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import { Campo, entrada } from '@/src/components/ui/Campo';
import { useSessao } from '@/src/contexts/AuthContext';
import { ESTILO_BLOCO, ESTILO_TEXTO } from '@/src/lib/estilo';
import { entrar, solicitarRedefinicaoDeSenha } from '@/src/servicos/perfil';

/**
 * A porta de entrada. Uma das duas rotas que existem sem sessão — a outra é
 * `/redefinir-senha`, o destino do link de recuperação.
 *
 * Não há "criar conta", e a ausência é a regra: `INV-12` — advogado não se
 * cadastra sozinho, a conta nasce de um registro que passou pelo funil com a
 * inscrição da OAB conferida por alguém do time. `src/servicos/perfil.ts` nem
 * expõe `signUp`, e o cadastro público está fechado no projeto.
 */
export function LoginView() {
  const { estado } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  // Quem já tem sessão não fica olhando o formulário. O portão trata o inverso.
  if (estado.estado === 'autenticado') return <Navigate to="/" replace />;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const { erro: recusa } = await entrar(email.trim(), senha);

    if (recusa) {
      setErro(recusa);
      setEnviando(false);
      return;
    }

    /*
     * Sem `setEnviando(false)` no caminho feliz, de propósito: o provider vai
     * receber o aviso de sessão e trocar a árvore inteira. Devolver o botão ao
     * estado normal só piscaria "Entrar" um quadro antes da tela sumir.
     */
  }

  const bloqueada = estado.estado === 'bloqueado';

  if (recuperando) {
    return <RecuperarSenha aoVoltar={() => setRecuperando(false)} />;
  }

  return (
    <div className="min-h-screen bg-fundo grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-entrada-suave">
        {/* A marca, no mesmo par roxo e grafite da barra superior. */}
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="size-12 rounded-xl bg-grafite-900 grid place-items-center shadow-flutuante">
            <Zap className="size-6 text-roxo-400" strokeWidth={2.5} />
          </div>
          <div className="text-center leading-none">
            <div className="font-semibold text-xl text-grafite-900 tracking-tight">Focus AI</div>
            <div className="text-[10px] text-stone-500 tracking-[0.12em] uppercase mt-1.5">
              Leads qualificados
            </div>
          </div>
        </div>

        <form onSubmit={aoEnviar} className="card p-6 space-y-4" noValidate>
          <div>
            <h1 className="card-title">Entrar</h1>
            <p className="nota mt-1">Use o e-mail e a senha da sua conta de acesso.</p>
          </div>

          {bloqueada && (
            <div className={`rounded-lg border p-3 flex gap-2.5 ${ESTILO_BLOCO.atencao}`}>
              <AlertCircle className={`size-4 shrink-0 mt-px ${ESTILO_TEXTO.atencao}`} />
              <p className="text-[13px] text-stone-700">{estado.motivo}</p>
            </div>
          )}

          <Campo id="login-email" rotulo="E-mail">
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="voce@focus.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={entrada()}
            />
          </Campo>

          <Campo id="login-senha" rotulo="Senha">
            <div className="relative">
              <input
                id="login-senha"
                type={visivel ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={`${entrada()} pr-10`}
              />
              <button
                type="button"
                aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setVisivel((v) => !v)}
                className="btn-icone absolute right-0 top-0 size-9 text-stone-400 hover:text-stone-600"
              >
                {visivel ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Campo>

          <button
            type="button"
            onClick={() => setRecuperando(true)}
            className="text-[13px] text-roxo-600 hover:text-roxo-700 -mt-1"
          >
            Esqueci minha senha
          </button>

          {/*
            ACC-R09 — a recusa não distingue e-mail inexistente de senha errada.
            É a única mensagem, e ela vem pronta de `entrar()`: separar os dois
            casos transformaria esta tela num verificador de quem tem conta.
          */}
          {erro && <p className="campo-mensagem-erro">{erro}</p>}

          <button
            type="submit"
            disabled={enviando || !email.trim() || !senha}
            className="btn btn-primario w-full"
          >
            {enviando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Entrando…
              </>
            ) : (
              'Entrar'
            )}
          </button>

          <p className="nota text-center">
            Não há cadastro aberto. O acesso é liberado pelo time depois da
            conferência da inscrição na OAB.
          </p>
        </form>
      </div>
    </div>
  );
}

/**
 * O pedido de link de recuperação, dentro da mesma tela de login — não é rota
 * própria porque não precisa: ninguém chega aqui de fora, só clicando.
 *
 * Sempre mostra sucesso, exista ou não a conta com aquele e-mail — mesma
 * lógica de `entrar()`, que não distingue e-mail inexistente de senha errada
 * (`ACC-R09`): um erro específico aqui viraria um jeito de descobrir quem tem
 * conta.
 */
function RecuperarSenha({ aoVoltar }: { aoVoltar: () => void }) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    await solicitarRedefinicaoDeSenha(email.trim());
    setEnviando(false);
    setEnviado(true);
  }

  return (
    <div className="min-h-screen bg-fundo grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-entrada-suave">
        <div className="flex flex-col items-center gap-3 mb-7">
          <div className="size-12 rounded-xl bg-grafite-900 grid place-items-center shadow-flutuante">
            <Zap className="size-6 text-roxo-400" strokeWidth={2.5} />
          </div>
          <div className="text-center leading-none">
            <div className="font-semibold text-xl text-grafite-900 tracking-tight">Focus AI</div>
            <div className="text-[10px] text-stone-500 tracking-[0.12em] uppercase mt-1.5">
              Leads qualificados
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          {enviado ? (
            <>
              <div>
                <h1 className="card-title">Verifique seu e-mail</h1>
                <p className="nota mt-1">
                  Se existir uma conta com esse e-mail, o link de redefinição já foi enviado.
                </p>
              </div>
              <button type="button" onClick={aoVoltar} className="btn btn-secundario w-full">
                Voltar ao login
              </button>
            </>
          ) : (
            <form onSubmit={aoEnviar} className="space-y-4" noValidate>
              <div>
                <h1 className="card-title">Esqueci minha senha</h1>
                <p className="nota mt-1">
                  Informe o e-mail da sua conta. Mandamos um link para escolher uma senha nova.
                </p>
              </div>

              <Campo id="recuperar-email" rotulo="E-mail">
                <input
                  id="recuperar-email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="voce@focus.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={entrada()}
                />
              </Campo>

              <button
                type="submit"
                disabled={enviando || !email.trim()}
                className="btn btn-primario w-full"
              >
                {enviando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Enviar link de redefinição'
                )}
              </button>

              <button type="button" onClick={aoVoltar} className="btn btn-fantasma w-full">
                Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
