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
 * Quando a autenticação entrar, o cuidado é `API-R05`: perfil que não carregou
 * precisa cair em estado bloqueado, nunca seguir com papel indefinido. Papel
 * indefinido não está em lista nenhuma, e todo guard que bloqueia *por papel*
 * deixaria de bloquear exatamente na hora em que mais importa.
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
