import { AlertTriangle } from 'lucide-react';
import { ESTILO_BLOCO, ESTILO_TEXTO } from '@/src/lib/estilo';

/**
 * Aviso de falha ao carregar uma lista — não confundir com estado vazio.
 *
 * `useDadosDaSessao` já distingue os dois (`erro: string | null`), mas até
 * agora nenhuma tela lia esse campo: uma falha de rede virava "Nenhum lead
 * com esses filtros" igual a realmente não ter lead nenhum. Achado pelo
 * `/impeccable harden`.
 *
 * `role="alert"` (assertivo), não `role="status"` como `Toast` — este aviso
 * substitui o conteúdo inteiro da tela, não só complementa um clique; quem
 * usa leitor de tela precisa saber na hora, não na próxima pausa da fila de
 * anúncios.
 */
export function AvisoErro({ erro, aoTentarNovamente }: { erro: string; aoTentarNovamente: () => void }) {
  return (
    <div role="alert" className={`rounded-lg border p-3 flex items-start gap-2.5 ${ESTILO_BLOCO.erro}`}>
      <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-stone-700">{erro}</p>
      </div>
      <button type="button" onClick={aoTentarNovamente} className="btn btn-secundario shrink-0">
        Tentar novamente
      </button>
    </div>
  );
}
