import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, MoreHorizontal, Snowflake } from 'lucide-react';
import {
  ESTILO_PRIORIDADE,
  diasSemInteracao,
  estaCongelada,
  prioridade,
} from '@/src/lib/negociacoes';
import { ESTILO_ETIQUETA } from '@/src/lib/estilo';
import { NEGOCIACAO_STATUS_LABEL, type Negociacao } from '@/types';

type Coluna = 'cliente' | 'status' | 'verbaMensal' | 'ultimaAtividade' | 'prioridade';
type Direcao = 'asc' | 'desc';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export function TabelaNegociacoes({
  negociacoes,
  nomePorId,
  aoAbrirMenu,
}: {
  negociacoes: Negociacao[];
  nomePorId: Record<string, string>;
  aoAbrirMenu: (n: Negociacao, e: React.MouseEvent) => void;
}) {
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({
    coluna: 'ultimaAtividade',
    direcao: 'asc',
  });

  const ordenadas = useMemo(() => {
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    const peso = { P1: 0, P2: 1, P3: 2 };
    return [...negociacoes].sort((a, b) => {
      switch (ordem.coluna) {
        case 'cliente':
          return sinal * a.cliente.localeCompare(b.cliente, 'pt-BR');
        case 'status':
          return sinal * a.status.localeCompare(b.status);
        case 'verbaMensal':
          return sinal * (a.verbaMensal - b.verbaMensal);
        case 'prioridade':
          return sinal * (peso[prioridade(a)] - peso[prioridade(b)]);
        case 'ultimaAtividade':
          return sinal * (Date.parse(a.ultimaAtividade) - Date.parse(b.ultimaAtividade));
      }
    });
  }, [negociacoes, ordem]);

  function ordenarPor(coluna: Coluna) {
    setOrdem((o) =>
      o.coluna === coluna
        ? { coluna, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }
        : { coluna, direcao: 'asc' },
    );
  }

  if (negociacoes.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Nenhuma negociação com esses filtros</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-[13px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/60">
              <Cabecalho coluna="cliente" ordem={ordem} aoOrdenar={ordenarPor}>
                Cliente
              </Cabecalho>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">Nicho</th>
              <Cabecalho coluna="status" ordem={ordem} aoOrdenar={ordenarPor}>
                Etapa
              </Cabecalho>
              <Cabecalho coluna="verbaMensal" ordem={ordem} aoOrdenar={ordenarPor}>
                Verba/mês
              </Cabecalho>
              <Cabecalho coluna="prioridade" ordem={ordem} aoOrdenar={ordenarPor}>
                Prio.
              </Cabecalho>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                Responsável
              </th>
              <Cabecalho coluna="ultimaAtividade" ordem={ordem} aoOrdenar={ordenarPor}>
                Última atividade
              </Cabecalho>
              <th className="w-12" />
            </tr>
          </thead>

          <tbody>
            {ordenadas.map((n) => {
              const p = prioridade(n);
              const dias = diasSemInteracao(n);
              return (
                <tr
                  key={n.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-roxo-900">{n.cliente}</span>
                      {estaCongelada(n) && (
                        <Snowflake
                          className="size-3.5 text-info-500 shrink-0"
                          aria-label="Congelada"
                        />
                      )}
                    </div>
                    <div className="nota">{n.origem}</div>
                  </td>

                  <td className="px-3 py-3">
                    {n.conselho ? (
                      <span className={`etiqueta ${ESTILO_ETIQUETA.marca}`}>{n.conselho}</span>
                    ) : (
                      <span className={`etiqueta ${ESTILO_ETIQUETA.atencao}`}>sem conselho</span>
                    )}
                    <div className="nota mt-0.5">{n.nicho || '—'}</div>
                  </td>

                  <td className="px-3 py-3 text-stone-700 whitespace-nowrap">
                    {NEGOCIACAO_STATUS_LABEL[n.status]}
                  </td>

                  <td className="px-3 py-3 tabular text-stone-700 whitespace-nowrap">
                    {brl.format(n.verbaMensal)}
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`etiqueta ${ESTILO_PRIORIDADE[p]}`}
                    >
                      {p}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-stone-600 whitespace-nowrap">
                    {nomePorId[n.responsavelId] ?? '—'}
                  </td>

                  <td className="px-3 py-3 text-stone-600 whitespace-nowrap tabular">
                    {dias === 0 ? 'hoje' : `há ${dias} dias`}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={(e) => aoAbrirMenu(n, e)}
                      aria-label={`Ações de ${n.cliente}`}
                      className="btn-icone"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cabecalho({
  coluna,
  ordem,
  aoOrdenar,
  children,
}: {
  coluna: Coluna;
  ordem: { coluna: Coluna; direcao: Direcao };
  aoOrdenar: (c: Coluna) => void;
  children: React.ReactNode;
}) {
  const ativa = ordem.coluna === coluna;
  return (
    <th
      className="text-left px-3 py-2.5"
      aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(coluna)}
        className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
          ativa ? 'text-roxo-800' : 'text-stone-500 hover:text-roxo-800'
        }`}
      >
        {children}
        {ativa &&
          (ordem.direcao === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          ))}
      </button>
    </th>
  );
}
