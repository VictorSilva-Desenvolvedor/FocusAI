import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BadgeCheck, MoreHorizontal, ShieldAlert, Snowflake } from 'lucide-react';
import { ESTILO_PRIORIDADE, diasSemInteracao, estaCongelado, prioridade } from '@/src/lib/advogados';
import { ESTILO_TESE } from '@/src/lib/leads';
import { ADVOGADO_STATUS_LABEL, PORTE_LABEL, TESE_CURTA, type Advogado } from '@/types';

type Coluna = 'nome' | 'status' | 'potencialMensal' | 'ultimaAtividade' | 'prioridade';
type Direcao = 'asc' | 'desc';

export function TabelaAdvogados({
  advogados,
  nomePorId,
  aoAbrirMenu,
}: {
  advogados: Advogado[];
  nomePorId: Record<string, string>;
  aoAbrirMenu: (a: Advogado, e: React.MouseEvent) => void;
}) {
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({
    coluna: 'ultimaAtividade',
    direcao: 'asc',
  });

  const ordenados = useMemo(() => {
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    const peso = { P1: 0, P2: 1, P3: 2 };
    return [...advogados].sort((a, b) => {
      switch (ordem.coluna) {
        case 'nome':
          return sinal * a.nome.localeCompare(b.nome, 'pt-BR');
        case 'status':
          return sinal * a.status.localeCompare(b.status);
        case 'potencialMensal':
          return sinal * (a.potencialMensal - b.potencialMensal);
        case 'prioridade':
          return sinal * (peso[prioridade(a)] - peso[prioridade(b)]);
        case 'ultimaAtividade':
          return sinal * (Date.parse(a.ultimaAtividade) - Date.parse(b.ultimaAtividade));
      }
    });
  }, [advogados, ordem]);

  function ordenarPor(coluna: Coluna) {
    setOrdem((o) =>
      o.coluna === coluna
        ? { coluna, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }
        : { coluna, direcao: 'asc' },
    );
  }

  if (advogados.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Nenhum advogado com esses filtros</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] text-[13px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/60">
              <Cabecalho coluna="nome" ordem={ordem} aoOrdenar={ordenarPor}>
                Escritório
              </Cabecalho>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                Inscrição
              </th>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">Teses</th>
              <Cabecalho coluna="status" ordem={ordem} aoOrdenar={ordenarPor}>
                Etapa
              </Cabecalho>
              <Cabecalho coluna="potencialMensal" ordem={ordem} aoOrdenar={ordenarPor}>
                Potencial
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
            {ordenados.map((a) => {
              const p = prioridade(a);
              const dias = diasSemInteracao(a);
              return (
                <tr
                  key={a.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-roxo-900">{a.nome}</span>
                      {estaCongelado(a) && (
                        <Snowflake className="size-3.5 text-info-500 shrink-0" aria-label="Congelado" />
                      )}
                    </div>
                    <div className="nota">
                      {PORTE_LABEL[a.porte]} · {a.uf}
                    </div>
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap">
                    {a.oabConferidaEm ? (
                      <span className="flex items-center gap-1 text-sucesso-700 tabular text-[12px]">
                        <BadgeCheck className="size-3.5" />
                        {a.oab}
                      </span>
                    ) : (
                      <span
                        title="Inscrição não conferida — não libera acesso (INV-12)."
                        className="flex items-center gap-1 text-atencao-800 tabular text-[12px]"
                      >
                        <ShieldAlert className="size-3.5" />
                        {a.oab}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.teses.length > 0 ? (
                        a.teses.map((t) => (
                          <span key={t} className={`etiqueta ${ESTILO_TESE[t]}`}>
                            {TESE_CURTA[t]}
                          </span>
                        ))
                      ) : (
                        <span className="etiqueta bg-atencao-100 text-atencao-800">sem tese</span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-stone-700 whitespace-nowrap">
                    {ADVOGADO_STATUS_LABEL[a.status]}
                  </td>

                  <td className="px-3 py-3 tabular text-stone-700 whitespace-nowrap">
                    {a.potencialMensal} leads/mês
                  </td>

                  <td className="px-3 py-3">
                    <span className={`etiqueta ${ESTILO_PRIORIDADE[p]}`}>{p}</span>
                  </td>

                  <td className="px-3 py-3 text-stone-600 whitespace-nowrap">
                    {nomePorId[a.responsavelId] ?? '—'}
                  </td>

                  <td className="px-3 py-3 text-stone-600 whitespace-nowrap tabular">
                    {dias === 0 ? 'hoje' : `há ${dias} dias`}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={(e) => aoAbrirMenu(a, e)}
                      aria-label={`Ações de ${a.nome}`}
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
          (ordem.direcao === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
}
