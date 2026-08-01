import { BadgeCheck, ShieldAlert, Snowflake } from 'lucide-react';
import { ESTILO_PRIORIDADE, diasSemInteracao, estaCongelado, prioridade } from '@/src/lib/advogados';
import { ESTILO_TESE } from '@/src/lib/leads';
import { TESE_CURTA, type Advogado } from '@/types';

interface Props {
  advogado: Advogado;
  responsavel: string;
  arrastavel: boolean;
  aoIniciarArraste: () => void;
  aoTerminarArraste: () => void;
  aoAbrirMenu: (e: React.MouseEvent) => void;
}

export function AdvogadoCard({
  advogado: a,
  responsavel,
  arrastavel,
  aoIniciarArraste,
  aoTerminarArraste,
  aoAbrirMenu,
}: Props) {
  const p = prioridade(a);
  const congelado = estaCongelado(a);
  const dias = diasSemInteracao(a);

  return (
    /* EST-R05 — cartão de Kanban fica fora de `transition-all`: a coluna
       remonta a cada arraste e animar layout aqui engasga a lista. */
    <article
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', a.id);
        e.dataTransfer.effectAllowed = 'move';
        aoIniciarArraste();
      }}
      onDragEnd={aoTerminarArraste}
      onContextMenu={aoAbrirMenu}
      className={`group rounded-lg border bg-white p-3 transition-colors ${
        arrastavel ? 'cursor-grab active:cursor-grabbing' : ''
      } ${congelado ? 'border-info-200 bg-info-50/40' : 'border-stone-200 hover:border-roxo-300'}`}
    >
      <div className="flex items-start gap-2">
        <h3 className="text-[13px] font-medium text-roxo-900 leading-snug min-w-0 flex-1">
          {a.nome}
        </h3>
        <span
          title={
            a.prioridadeManual
              ? 'Prioridade definida manualmente'
              : 'Prioridade calculada automaticamente'
          }
          className={`etiqueta shrink-0 ${ESTILO_PRIORIDADE[p]} ${
            a.prioridadeManual ? 'ring-1 ring-roxo-300' : ''
          }`}
        >
          {p}
        </span>
      </div>

      {/* A inscrição conferida é o que destrava a liberação de acesso (INV-12),
          então é a primeira coisa que o cartão precisa responder. */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {a.oabConferidaEm ? (
          <span
            title="Inscrição na OAB conferida"
            className="flex items-center gap-1 text-[11px] text-sucesso-700 tabular"
          >
            <BadgeCheck className="size-3.5" />
            {a.oab}
          </span>
        ) : (
          <span
            title="Inscrição ainda não conferida — não libera acesso (INV-12)."
            className="flex items-center gap-1 text-[11px] text-atencao-800 tabular"
          >
            <ShieldAlert className="size-3.5" />
            {a.oab} · por conferir
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 flex-wrap">
        {a.teses.length > 0 ? (
          a.teses.map((t) => (
            <span key={t} className={`etiqueta ${ESTILO_TESE[t]}`}>
              {TESE_CURTA[t]}
            </span>
          ))
        ) : (
          <span
            title="Sem tese definida o painel abre vazio e o aviso de lead novo nunca dispara (ADV-R03)."
            className="etiqueta bg-atencao-100 text-atencao-800"
          >
            sem tese
          </span>
        )}
        <span className="text-[11px] text-stone-500">{a.uf}</span>
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-2.5">
        <span className="text-[13px] font-semibold text-roxo-900 tabular">
          {a.potencialMensal}
          <span className="text-[10px] font-normal text-stone-400"> leads/mês</span>
        </span>
        <span className="text-[11px] text-stone-500 truncate max-w-24" title={responsavel}>
          {responsavel}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-stone-100">
        {congelado && (
          <span
            title={`Sem interação há ${dias} dias. O congelamento é visual — não muda status nem responsável.`}
            className="flex items-center gap-1 text-[10px] font-medium text-info-700"
          >
            <Snowflake className="size-3" />
            congelado
          </span>
        )}
        {a.status === 'ativo' && (
          <span
            title="Saldo de créditos disponível"
            className={`text-[10px] font-medium tabular ${
              a.saldoCreditos === 0 ? 'text-erro-600' : 'text-stone-500'
            }`}
          >
            {a.saldoCreditos} créditos
          </span>
        )}
        <span className="nota ml-auto text-[10px] tabular">
          {dias === 0 ? 'hoje' : `há ${dias}d`}
        </span>
      </div>
    </article>
  );
}
