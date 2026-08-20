import { ArrowRight, Workflow } from 'lucide-react';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { COLUNAS, DESFECHOS, PROXIMA_ACAO } from '@/src/lib/advogados';
import { ADVOGADO_STATUS_LABEL } from '@/types';

/**
 * O funil do advogado é hoje fixo — `AdvogadoStatus`, no vocabulário canônico
 * de `types.ts` — não uma lista de etapas configurável. Etapa nova exigiria
 * mudar o tipo e as regras de transição em `src/lib/advogados.ts` (ADV-R01 a
 * ADV-R03), não um formulário. Esta tela mostra a etapa real e quantos
 * advogados estão nela agora, em vez de fingir que dá para editar a lista.
 */
export function FunisEtapasView() {
  const { advogados, carregando } = useAdvogados();

  const contagem = (status: (typeof COLUNAS)[number] | (typeof DESFECHOS)[number]) =>
    advogados.filter((a) => a.status === status).length;

  return (
    <div>
      <div className="mb-5">
        <h2 className="card-title flex items-center gap-2">
          <Workflow className="size-4 text-stone-400" />
          Funis e Etapas
        </h2>
        <p className="subtitulo-pagina mt-1">
          O funil de aquisição do advogado — fixo no código, não configurável por aqui — e quantos
          estão em cada etapa agora.
        </p>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-[13px]">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/60">
                <th className="text-left font-medium text-[11px] text-stone-500 px-4 py-2.5 w-10">
                  #
                </th>
                <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                  Etapa
                </th>
                <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                  Próxima ação sugerida (ADV-R08)
                </th>
                <th className="text-right font-medium text-[11px] text-stone-500 px-4 py-2.5">
                  Advogados agora
                </th>
              </tr>
            </thead>
            <tbody>
              {COLUNAS.map((status, i) => (
                <tr key={status} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-stone-500 tabular">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 text-roxo-900 font-medium">
                      {ADVOGADO_STATUS_LABEL[status]}
                      {i < COLUNAS.length - 1 && (
                        <ArrowRight className="size-3.5 text-stone-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-stone-600">{PROXIMA_ACAO[status]}</td>
                  <td className="px-4 py-3 text-right tabular font-medium text-roxo-900">
                    {carregando ? '—' : contagem(status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="card-title mb-2">Desfechos</h3>
        <p className="nota mb-3">
          Não são etapas do funil — saem da lista principal para não fazer o funil parecer maior
          do que é.
        </p>
        <div className="flex flex-wrap gap-4">
          {DESFECHOS.map((status) => (
            <div key={status} className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold text-roxo-900 tabular">
                {carregando ? '—' : contagem(status)}
              </span>
              <span className="text-[12px] text-stone-500">{ADVOGADO_STATUS_LABEL[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
