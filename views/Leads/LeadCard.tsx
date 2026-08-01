import { AlertTriangle, CalendarClock, Lock, MicOff, Timer } from 'lucide-react';
import {
  ESTILO_TESE,
  elegibilidadeDoLead,
  horasAteReuniao,
  reservaAtiva,
  venceEmBreve,
} from '@/src/lib/leads';
import { TESE_CURTA, type Lead } from '@/types';

interface Props {
  lead: Lead;
  compradorNome: string | null;
  arrastavel: boolean;
  aoIniciarArraste: () => void;
  aoTerminarArraste: () => void;
  aoAbrirMenu: (e: React.MouseEvent) => void;
  aoAbrir: () => void;
}

export function LeadCard({
  lead,
  compradorNome,
  arrastavel,
  aoIniciarArraste,
  aoTerminarArraste,
  aoAbrirMenu,
  aoAbrir,
}: Props) {
  const { elegivel, pendentes } = elegibilidadeDoLead(lead);
  const vence = venceEmBreve(lead);
  const horas = horasAteReuniao(lead);
  const reservado = reservaAtiva(lead);

  return (
    /* EST-R05 — cartão de Kanban fica fora de `transition-all`: a coluna
       remonta a cada arraste e animar layout aqui engasga a lista. */
    <article
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
        aoIniciarArraste();
      }}
      onDragEnd={aoTerminarArraste}
      onContextMenu={aoAbrirMenu}
      onClick={aoAbrir}
      className={`group rounded-lg border bg-white p-3 transition-colors ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        vence
          ? 'border-erro-300 bg-erro-50/40'
          : 'border-stone-200 hover:border-roxo-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <h3 className="text-[13px] font-medium text-roxo-900 leading-snug min-w-0 flex-1">
          {lead.nome}
        </h3>
        <span className={`etiqueta shrink-0 ${ESTILO_TESE[lead.tese]}`}>
          {TESE_CURTA[lead.tese]}
        </span>
      </div>

      <div className="text-[11px] text-stone-500 mt-1">
        {lead.cidade} · {lead.uf}
      </div>

      {/* A reunião é o que transforma o lead em produto, então é a informação
          de maior peso do cartão depois do nome. */}
      {lead.reuniaoEm && (
        <div
          className={`flex items-center gap-1.5 mt-2 text-[11px] ${
            vence ? 'text-erro-700 font-medium' : 'text-stone-600'
          }`}
        >
          <CalendarClock className="size-3.5 shrink-0" />
          {formatarReuniao(lead.reuniaoEm)}
          {vence && horas !== null && (
            <span className="tabular">· vence em {Math.round(horas)}h</span>
          )}
        </div>
      )}

      {!elegivel && (
        <div
          title={`Falta confirmar: ${pendentes.join('; ')}`}
          className="flex items-center gap-1.5 mt-2 text-[11px] text-atencao-800"
        >
          <AlertTriangle className="size-3.5 shrink-0" />
          {pendentes.length} filtro{pendentes.length > 1 ? 's' : ''} por confirmar
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100">
        {lead.compradoPor ? (
          <span
            title={`Vendido para ${compradorNome ?? lead.compradoPor}`}
            className="flex items-center gap-1 text-[10px] font-medium text-sucesso-700 truncate"
          >
            <Lock className="size-3" />
            {compradorNome ?? 'vendido'}
          </span>
        ) : reservado ? (
          <span
            title="Outro advogado está finalizando a compra"
            className="flex items-center gap-1 text-[10px] font-medium text-info-700"
          >
            <Timer className="size-3" />
            reservado
          </span>
        ) : null}

        {/* QUA-R03 — vendido sem gravação não tem como provar como o cliente
            foi direcionado. O aviso fica no cartão, não só no relatório. */}
        {lead.compradoPor && !lead.temGravacao && (
          <span
            title="Vendido sem gravação da qualificação (QUA-R03)."
            className="flex items-center gap-1 text-[10px] font-medium text-erro-600"
          >
            <MicOff className="size-3" />
            sem gravação
          </span>
        )}

        <span className="nota ml-auto text-[10px] tabular">{lead.custoCreditos} cr</span>
      </div>
    </article>
  );
}

const formatoReuniao = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarReuniao(iso: string): string {
  return formatoReuniao.format(new Date(iso));
}
