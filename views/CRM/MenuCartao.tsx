import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ESTILO_TEXTO } from '@/src/lib/estilo';
import { COLUNAS, motivoParaRecusarMovimento } from '@/src/lib/negociacoes';
import { NEGOCIACAO_STATUS_LABEL, type Negociacao, type NegociacaoStatus } from '@/types';

const ENCERRAMENTOS: NegociacaoStatus[] = ['em_pausa', 'reprovado', 'perdido'];

/**
 * Menu de contexto do cartão. Existe porque arrastar não é operável por
 * teclado nem em tela sensível ao toque — toda etapa alcançável por arraste
 * precisa estar alcançável aqui também.
 */
export function MenuCartao({
  negociacao,
  x,
  y,
  aoFechar,
  aoMover,
}: {
  negociacao: Negociacao;
  x: number;
  y: number;
  aoFechar: () => void;
  aoMover: (destino: NegociacaoStatus) => void;
}) {
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
      aria-label={`Ações de ${negociacao.cliente}`}
      style={{ left: pos.x, top: pos.y }}
      className="menu-flutuante w-60"
    >
      <div className="label-eyebrow px-3 py-1.5">
        Mover para
      </div>

      {COLUNAS.map((destino) => {
        const atual = destino === negociacao.status;
        const recusa = motivoParaRecusarMovimento(negociacao, destino);
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
            {NEGOCIACAO_STATUS_LABEL[destino]}
            {atual && <span className="text-[11px] text-stone-400"> · atual</span>}
            {!atual && recusa && (
              <span className={`text-[11px] ${ESTILO_TEXTO.atencao}`}> · bloqueado</span>
            )}
          </button>
        );
      })}

      <div className="border-t border-stone-100 mt-1.5 pt-1.5">
        {ENCERRAMENTOS.map((destino) => (
          <button
            key={destino}
            type="button"
            role="menuitem"
            disabled={destino === negociacao.status}
            onClick={() => aoMover(destino)}
            className="item-menu text-stone-600 hover:bg-stone-50 disabled:text-stone-300 disabled:hover:bg-transparent"
          >
            {NEGOCIACAO_STATUS_LABEL[destino]}
          </button>
        ))}
      </div>
    </div>
  );
}
