import { useEffect, type RefObject } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Prende o foco de teclado dentro de um diálogo/gaveta/menu: Tab no último
 * elemento focável volta pro primeiro, Shift+Tab no primeiro vai pro último.
 * Ao montar, move o foco pro primeiro elemento de dentro; ao desmontar,
 * devolve pra quem tinha o foco antes (o botão que abriu).
 *
 * Achado pelo `/impeccable audit`: `role="dialog"`/`aria-modal="true"` sem
 * isso é só decoração — quem navega por teclado consegue dar Tab e sair do
 * diálogo pro conteúdo atrás do véu, que `aria-modal` promete estar inerte.
 * `MenuCartao` (`role="menu"`) tem o mesmo problema, e o próprio comentário
 * do arquivo já diz por quê o menu existe: é a alternativa por teclado ao
 * que o arraste não alcança.
 *
 * Recebe o `ref` em vez de criar um: `MenuCartao` já usa o dele para
 * reposicionar o menu e detectar clique fora, e um elemento só aceita um
 * `ref`. O diálogo/menu existe só enquanto está aberto (o pai monta/desmonta
 * o componente, não alterna uma prop `aberto`), então "montou" já é "abriu"
 * — sem precisar de um parâmetro extra para isso.
 */
export function useFocoPreso<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const container = ref.current;
    const primeiroFocavel = container?.querySelector<HTMLElement>(FOCAVEIS);
    (primeiroFocavel ?? container)?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !container) return;
      const focaveis = Array.from(container.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus();
    };
  }, []);
}
