import { MoreHorizontal, Star, Undo2 } from 'lucide-react';
import { ESTILO_ETIQUETA, ESTILO_TEXTO } from '@/src/lib/estilo';
import { tempoRelativo } from '@/src/lib/format';
import { ADVOGADO_STATUS_LABEL, MODELO_PAGAMENTO_LABEL, type Advogado } from '@/types';
import type { LinhaDoRanking } from '@/src/lib/advogados';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** As três primeiras posições ganham peso visual; da quarta em diante é número. */
const MEDALHA: Record<number, string> = {
  1: 'bg-roxo-600 text-white',
  2: 'bg-roxo-200 text-roxo-900',
  3: 'bg-roxo-100 text-roxo-800',
};

/**
 * ADV-R10 — quem consome o produto, em ordem.
 *
 * Quem não comprou no período fica no fim, sem posição e com o motivo à vista:
 * advogado ativo que parou de comprar é o sinal mais barato de cancelamento que
 * esta tela consegue dar, e some se a lista mostrar só quem compra.
 */
export function RankingAdvogados({
  linhas,
  aoAbrirMenu,
}: {
  linhas: LinhaDoRanking[];
  aoAbrirMenu: (a: Advogado, e: React.MouseEvent) => void;
}) {
  if (linhas.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Nenhum advogado com esses filtros</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-[13px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/60 text-left text-[11px] font-medium text-stone-500">
              <th className="px-3 py-2.5 w-12">#</th>
              <th className="px-3 py-2.5">Escritório</th>
              <th className="px-3 py-2.5 w-24 text-right">Leads</th>
              <th className="px-3 py-2.5 w-24 text-right">Créditos</th>
              <th className="px-3 py-2.5 w-28 text-right" title="Consumo a preço de tabela. Não é receita: no modelo de crédito o dinheiro entrou na recarga.">
                Entregue
              </th>
              <th className="px-3 py-2.5 w-20 text-right">Nota</th>
              <th className="px-3 py-2.5 w-32">Última compra</th>
              <th className="w-12" />
            </tr>
          </thead>

          <tbody>
            {linhas.map(({ advogado, posicao, leads, creditos, entregue, devolvidos, nota, ultimaCompra }) => (
              <tr
                key={advogado.id}
                className={`border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors ${
                  posicao === null ? 'opacity-70' : ''
                }`}
              >
                <td className="px-3 py-3">
                  {posicao === null ? (
                    <span className="nota tabular">—</span>
                  ) : (
                    <span
                      className={`grid place-items-center size-6 rounded-full text-[11px] font-semibold tabular ${
                        MEDALHA[posicao] ?? 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {posicao}
                    </span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <div className="font-medium text-roxo-900">{advogado.nome}</div>
                  <div className="nota">
                    {ADVOGADO_STATUS_LABEL[advogado.status]} ·{' '}
                    {advogado.modeloPagamento
                      ? MODELO_PAGAMENTO_LABEL[advogado.modeloPagamento]
                      : 'sem modelo definido'}
                  </div>
                </td>

                <td className="px-3 py-3 text-right">
                  <span className="tabular font-medium text-roxo-900">{leads}</span>
                  {devolvidos > 0 && (
                    <span
                      title={`${devolvidos} devolvido(s) — o crédito voltou, o lead não (CRE-R05).`}
                      className={`flex items-center justify-end gap-1 nota tabular ${ESTILO_TEXTO.atencao}`}
                    >
                      <Undo2 className="size-3" />
                      {devolvidos}
                    </span>
                  )}
                </td>

                <td className="px-3 py-3 text-right tabular text-stone-700">
                  {creditos > 0 ? creditos : '—'}
                </td>

                <td className="px-3 py-3 text-right tabular text-stone-700">
                  {entregue > 0 ? brl.format(entregue) : '—'}
                </td>

                <td className="px-3 py-3 text-right">
                  {nota === null ? (
                    <span className="nota">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 tabular text-stone-700">
                      <Star className={`size-3.5 ${ESTILO_TEXTO.atencao}`} />
                      {nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </span>
                  )}
                </td>

                <td className="px-3 py-3 whitespace-nowrap">
                  {ultimaCompra ? (
                    <span className="text-stone-600 tabular">{tempoRelativo(ultimaCompra)}</span>
                  ) : (
                    <span className={`etiqueta ${ESTILO_ETIQUETA.atencao}`}>sem compra</span>
                  )}
                </td>

                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => aoAbrirMenu(advogado, e)}
                    aria-label={`Ações de ${advogado.nome}`}
                    className="btn-icone"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
