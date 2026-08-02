import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { moduloDaRota, nivelDeAcesso } from '@/src/lib/navigation';

/**
 * `ACC-R07` — esconder do menu não é bloquear a rota.
 *
 * O menu e o painel já filtravam por papel, mas quem digitasse `/creditos` na
 * barra de endereço chegava lá. Com `advogado` no sistema isso deixou de ser
 * detalhe: é papel externo, e a tela que ele não deve abrir mostra saldo,
 * receita e carteira de outra pessoa.
 *
 * Bloqueia apenas o nível `blocked`. `restricted` **passa de propósito** — é o
 * modo como o advogado enxerga o próprio recorte do catálogo e do extrato; a
 * tela existe, o conteúdo é que é filtrado (`LED-R06`).
 *
 * Este guard só decide acesso a módulo, e conta com um perfil existir. Quem
 * garante isso é o `PortaoDeSessao` (`ACC-R08`), que roda antes: perfil que não
 * carregou vira estado bloqueado ali, e nunca chega aqui como papel indefinido
 * — que é o que `API-R05` proíbe, porque papel indefinido não está em lista
 * nenhuma e faria este `blocked` deixar de acontecer.
 */
export function GuardaDeRota() {
  const { perfil } = useAuth();
  const { pathname } = useLocation();

  const modulo = moduloDaRota(pathname);
  if (modulo && nivelDeAcesso(modulo, perfil) === 'blocked') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
