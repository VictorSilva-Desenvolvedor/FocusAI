import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, MicOff, MoreHorizontal, UserCheck } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { ESTILO_TESE, contatoVisivel, venceEmBreve } from '@/src/lib/leads';
import { LEAD_STATUS_LABEL, TESE_CURTA, type Lead } from '@/types';
import { formatarReuniao } from './LeadCard';

type Coluna = 'nome' | 'status' | 'reuniaoEm' | 'custoCreditos' | 'criadoEm';
type Direcao = 'asc' | 'desc';

export function TabelaLeads({
  leads,
  nomeDoAdvogado,
  aoAbrirMenu,
  aoAbrir,
}: {
  leads: Lead[];
  nomeDoAdvogado: Record<string, string>;
  aoAbrirMenu: (l: Lead, e: React.MouseEvent) => void;
  aoAbrir: (l: Lead) => void;
}) {
  const { perfil } = useAuth();
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({
    coluna: 'reuniaoEm',
    direcao: 'asc',
  });

  const ordenados = useMemo(() => {
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...leads].sort((a, b) => {
      switch (ordem.coluna) {
        case 'nome':
          return sinal * a.nome.localeCompare(b.nome, 'pt-BR');
        case 'status':
          return sinal * a.status.localeCompare(b.status);
        case 'custoCreditos':
          return sinal * (a.custoCreditos - b.custoCreditos);
        case 'criadoEm':
          return sinal * (Date.parse(a.criadoEm) - Date.parse(b.criadoEm));
        case 'reuniaoEm': {
          // Sem reunião vai para o fim em qualquer direção: são os que ainda
          // não viraram produto, e misturá-los no meio da agenda atrapalha.
          if (!a.reuniaoEm && !b.reuniaoEm) return 0;
          if (!a.reuniaoEm) return 1;
          if (!b.reuniaoEm) return -1;
          return sinal * (Date.parse(a.reuniaoEm) - Date.parse(b.reuniaoEm));
        }
      }
    });
  }, [leads, ordem]);

  function ordenarPor(coluna: Coluna) {
    setOrdem((o) =>
      o.coluna === coluna
        ? { coluna, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }
        : { coluna, direcao: 'asc' },
    );
  }

  if (leads.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Nenhum lead com esses filtros</p>
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
                Cliente
              </Cabecalho>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">Tese</th>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                Contato
              </th>
              <Cabecalho coluna="status" ordem={ordem} aoOrdenar={ordenarPor}>
                Etapa
              </Cabecalho>
              <Cabecalho coluna="reuniaoEm" ordem={ordem} aoOrdenar={ordenarPor}>
                Reunião
              </Cabecalho>
              <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                Comprador
              </th>
              <Cabecalho coluna="custoCreditos" ordem={ordem} aoOrdenar={ordenarPor}>
                Créditos
              </Cabecalho>
              <th className="w-12" />
            </tr>
          </thead>

          <tbody>
            {ordenados.map((l) => (
              <tr
                key={l.id}
                onClick={() => aoAbrir(l)}
                className={`border-b border-stone-100 last:border-0 cursor-pointer transition-colors ${
                  venceEmBreve(l) ? 'bg-erro-50/50 hover:bg-erro-50' : 'hover:bg-stone-50/60'
                }`}
              >
                <td className="px-3 py-3">
                  <div className="font-medium text-roxo-900">{l.nome}</div>
                  <div className="nota">
                    {l.cidade} · {l.uf}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <span className={`etiqueta ${ESTILO_TESE[l.tese]}`}>{TESE_CURTA[l.tese]}</span>
                </td>

                {/* INV-11 — a tabela passa pelo mesmo portão que o resto: nunca
                    lê `lead.telefone` direto. */}
                <td className="px-3 py-3 tabular text-stone-600 whitespace-nowrap">
                  {contatoVisivel(l, perfil)}
                </td>

                <td className="px-3 py-3 text-stone-700 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {LEAD_STATUS_LABEL[l.status]}
                    {l.compradoPor && !l.temGravacao && (
                      <MicOff
                        className="size-3.5 text-erro-500 shrink-0"
                        aria-label="Vendido sem gravação"
                      />
                    )}
                  </div>
                </td>

                <td className="px-3 py-3 text-stone-600 whitespace-nowrap tabular">
                  <div className="flex items-center gap-1.5">
                    {l.reuniaoEm ? formatarReuniao(l.reuniaoEm) : '—'}
                    {/* LED-R09 — entrega exclusiva: só este advogado enxerga no catálogo. */}
                    {!l.compradoPor && l.direcionadoPara && (
                      <span
                        title={`Exclusivo para ${nomeDoAdvogado[l.direcionadoPara] ?? l.direcionadoPara}`}
                        className="shrink-0"
                      >
                        <UserCheck className="size-3.5 text-roxo-600" />
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-3 py-3 text-stone-600 whitespace-nowrap">
                  {l.compradoPor ? (nomeDoAdvogado[l.compradoPor] ?? l.compradoPor) : '—'}
                </td>

                <td className="px-3 py-3 tabular text-stone-700">{l.custoCreditos}</td>

                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      aoAbrirMenu(l, e);
                    }}
                    aria-label={`Ações de ${l.nome}`}
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
