import { Snowflake } from 'lucide-react';
import { ESTILO_ETIQUETA } from '@/src/lib/estilo';
import {
  ESTILO_PRIORIDADE,
  diasSemInteracao,
  estaCongelada,
  prioridade,
} from '@/src/lib/negociacoes';
import type { Negociacao } from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

interface Props {
  negociacao: Negociacao;
  responsavel: string;
  arrastavel: boolean;
  aoIniciarArraste: () => void;
  aoTerminarArraste: () => void;
  aoAbrirMenu: (e: React.MouseEvent) => void;
}

export function NegociacaoCard({
  negociacao: n,
  responsavel,
  arrastavel,
  aoIniciarArraste,
  aoTerminarArraste,
  aoAbrirMenu,
}: Props) {
  const p = prioridade(n);
  const congelada = estaCongelada(n);
  const dias = diasSemInteracao(n);

  return (
    /* EST-R05 — cartão de Kanban fica fora de `transition-all`: a coluna
       remonta a cada arraste e animar layout aqui engasga a lista. */
    <article
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', n.id);
        e.dataTransfer.effectAllowed = 'move';
        aoIniciarArraste();
      }}
      onDragEnd={aoTerminarArraste}
      onContextMenu={aoAbrirMenu}
      className={`group rounded-lg border bg-white p-3 transition-colors ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : ''
      } ${congelada ? 'border-info-200 bg-info-50/40' : 'border-stone-200 hover:border-roxo-300'}`}
    >
      <div className="flex items-start gap-2">
        <h3 className="text-[13px] font-medium text-roxo-900 leading-snug min-w-0 flex-1">
          {n.cliente}
        </h3>
        <span
          title={
            n.prioridadeManual
              ? 'Prioridade definida manualmente'
              : 'Prioridade calculada automaticamente'
          }
          className={`etiqueta shrink-0 ${ESTILO_PRIORIDADE[p]} ${
            n.prioridadeManual ? 'ring-1 ring-roxo-300' : ''
          }`}
        >
          {p}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {n.conselho ? (
          <span className={`etiqueta ${ESTILO_ETIQUETA.marca}`}>{n.conselho}</span>
        ) : (
          <span
            title="Sem conselho definido — não avança para contrato assinado."
            className={`etiqueta ${ESTILO_ETIQUETA.atencao}`}
          >
            sem conselho
          </span>
        )}
        {n.nicho && <span className="text-[11px] text-stone-500 truncate">{n.nicho}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-2.5">
        <span className="text-[13px] font-semibold text-roxo-900 tabular">
          {brl.format(n.verbaMensal)}
          <span className="text-[10px] font-normal text-stone-400">/mês</span>
        </span>
        <span className="text-[11px] text-stone-500 truncate max-w-24" title={responsavel}>
          {responsavel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100">
        {congelada && (
          <span
            title={`Sem interação há ${dias} dias. O congelamento é visual — não muda status nem responsável.`}
            className="flex items-center gap-1 text-[10px] font-medium text-info-700"
          >
            <Snowflake className="size-3" />
            congelada
          </span>
        )}
        <span className="nota ml-auto text-[10px] tabular">
          {dias === 0 ? 'hoje' : `há ${dias}d`}
        </span>
      </div>
    </article>
  );
}
