import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ESTILO_TEXTO } from '@/src/lib/estilo';

interface Props<T extends string> {
  /** Aparece no `aria-label` — é o que identifica o cartão para leitor de tela. */
  titulo: string;
  statusAtual: T;
  /**
   * Ações que não são mudança de etapa, no topo do menu.
   *
   * Precisam vir por aqui, e não ao lado do menu: o fechamento por clique fora
   * escuta `mousedown` e mede contra este container. Um botão irmão desmonta no
   * mousedown e o clique nunca chega a acontecer.
   */
  acoes?: ReactNode;
  /** Etapas do quadro, na ordem. */
  colunas: T[];
  /** Desfechos, separados por uma linha no fim do menu. */
  desfechos: T[];
  rotulos: Record<T, string>;
  /** Devolve o motivo da recusa, ou nulo se o movimento é permitido. */
  motivoParaRecusar: (destino: T) => string | null;
  x: number;
  y: number;
  aoFechar: () => void;
  aoMover: (destino: T) => void;
}

/**
 * Menu de contexto do cartão, compartilhado pelos dois quadros.
 *
 * Existe porque arrastar não é operável por teclado nem em tela sensível ao
 * toque — toda etapa alcançável por arraste precisa estar alcançável aqui
 * também. E é aqui que a recusa fica visível *antes* do clique: destino
 * bloqueado aparece marcado, com o motivo no `title`, em vez de aceitar o
 * clique e devolver um erro.
 */
export function MenuCartao<T extends string>({
  titulo,
  statusAtual,
  acoes,
  colunas,
  desfechos,
  rotulos,
  motivoParaRecusar,
  x,
  y,
  aoFechar,
  aoMover,
}: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Reposiciona se o menu estourar a janela — abrir perto da borda direita ou
  // do rodapé é o caso comum, não a exceção.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - width - 8),
      y: Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    const aoClicar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [aoFechar]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Ações de ${titulo}`}
      style={{ left: pos.x, top: pos.y }}
      className="menu-flutuante w-60"
    >
      {acoes && <div className="border-b border-stone-100 pb-1.5 mb-1.5">{acoes}</div>}

      <div className="label-eyebrow px-3 py-1.5">Mover para</div>

      {colunas.map((destino) => {
        const atual = destino === statusAtual;
        const recusa = motivoParaRecusar(destino);
        return (
          <button
            key={destino}
            type="button"
            role="menuitem"
            disabled={atual}
            title={recusa ?? undefined}
            onClick={() => aoMover(destino)}
            className={`item-menu ${
              atual
                ? 'text-stone-300 cursor-default'
                : recusa
                  ? 'text-stone-400 hover:bg-stone-50'
                  : 'text-roxo-900 hover:bg-roxo-50'
            }`}
          >
            {rotulos[destino]}
            {atual && <span className="text-[11px] text-stone-400"> · atual</span>}
            {!atual && recusa && (
              <span className={`text-[11px] ${ESTILO_TEXTO.atencao}`}> · bloqueado</span>
            )}
          </button>
        );
      })}

      <div className="border-t border-stone-100 mt-1.5 pt-1.5">
        {desfechos.map((destino) => (
          <button
            key={destino}
            type="button"
            role="menuitem"
            disabled={destino === statusAtual}
            onClick={() => aoMover(destino)}
            className="item-menu text-stone-600 hover:bg-stone-50 disabled:text-stone-300 disabled:hover:bg-transparent"
          >
            {rotulos[destino]}
          </button>
        ))}
      </div>
    </div>
  );
}
