import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useSessao } from '@/src/contexts/AuthContext';
import { ESTILO_TEXTO } from '@/src/lib/estilo';

/**
 * `ACC-R08` — nenhuma rota da aplicação abre sem sessão autenticada.
 *
 * Os quatro estados são tratados um a um, e isso é o ponto. O atalho tentador
 * seria colapsar "ainda carregando" com "não tem sessão" — ou pior, deixar
 * qualquer um dos dois seguir para a tela e confiar no `GuardaDeRota`. Não
 * funciona: o guard bloqueia **por papel**, e sem perfil não há papel; papel
 * indefinido não está em lista nenhuma, então o guard passa. A falha liberaria
 * tudo em vez de fechar, que é exatamente o que `API-R05` descreve.
 *
 * `bloqueado` é caso próprio, e não vira `anonimo`: a sessão existe, o problema
 * é o perfil. Mandar de volta ao login sem explicar produz o laço em que a
 * pessoa entra, é devolvida, entra de novo e nunca descobre por quê.
 */
export function PortaoDeSessao() {
  const { estado, encerrarSessao } = useSessao();

  if (estado.estado === 'carregando') {
    return (
      <div className="min-h-screen bg-fundo grid place-items-center">
        <Loader2 className={`size-6 animate-spin ${ESTILO_TEXTO.marca}`} aria-label="Carregando" />
      </div>
    );
  }

  if (estado.estado === 'anonimo') return <Navigate to="/login" replace />;

  if (estado.estado === 'bloqueado') {
    return (
      <div className="min-h-screen bg-fundo grid place-items-center px-4">
        <div className="card p-6 max-w-sm w-full text-center animate-entrada-suave">
          <ShieldAlert className={`size-8 mx-auto ${ESTILO_TEXTO.atencao}`} />
          <h1 className="card-title mt-3">Acesso não liberado</h1>
          <p className="nota mt-2">{estado.motivo}</p>
          <button
            type="button"
            onClick={() => void encerrarSessao()}
            className="btn btn-secundario w-full mt-5"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
