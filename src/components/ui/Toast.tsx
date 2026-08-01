import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface Aviso {
  texto: string;
  tom?: 'ok' | 'erro';
}

/**
 * Aviso efêmero no rodapé. Recusa de regra sai aqui em vez de virar modal —
 * o operador precisa entender por que o cartão voltou, não parar o fluxo.
 */
export function Toast({ aviso, aoFechar }: { aviso: Aviso | null; aoFechar: () => void }) {
  useEffect(() => {
    if (!aviso) return;
    // Recusa de regra fica mais tempo: é texto que precisa ser lido, não
    // confirmação de algo que a pessoa acabou de fazer de propósito.
    const t = setTimeout(aoFechar, aviso.tom === 'erro' ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [aviso, aoFechar]);

  if (!aviso) return null;
  const erro = aviso.tom === 'erro';

  return (
    <div
      role="status"
      className={`toast max-w-[min(34rem,calc(100vw-2rem))] ${
        erro ? 'bg-erro-700' : 'bg-grafite-900'
      }`}
    >
      {erro ? (
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-roxo-400" />
      )}
      <span className="text-[13px] leading-snug">{aviso.texto}</span>
    </div>
  );
}
