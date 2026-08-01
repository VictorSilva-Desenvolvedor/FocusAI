import { CalendarClock, Lock, MapPin, Phone, ShoppingCart, Timer, Undo2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { ESTILO_BLOCO, ESTILO_ETIQUETA, ESTILO_TEXTO } from '@/src/lib/estilo';
import {
  ESTILO_TESE,
  contatoVisivel,
  estaNoCatalogo,
  horasAteReuniao,
  motivoParaNaoComprar,
  reservadoPorOutro,
} from '@/src/lib/leads';
import { TESE_CURTA, type Advogado, type Lead } from '@/types';
import { formatarReuniao } from './LeadCard';

/**
 * A visão do advogado.
 *
 * Duas listas, nesta ordem: primeiro os leads que ele já comprou — é o que ele
 * precisa para trabalhar hoje —, depois o catálogo do que está à venda.
 */
export function CatalogoAdvogado({
  leads,
  advogado,
  aoAbrir,
}: {
  leads: Lead[];
  advogado: Advogado | null;
  aoAbrir: (lead: Lead) => void;
}) {
  const meus = leads.filter((l) => l.compradoPor === advogado?.id);
  const catalogo = leads.filter(estaNoCatalogo);

  if (!advogado) {
    return (
      <div className="card py-16 text-center">
        <p className="text-[14px] font-medium text-roxo-900">Acesso ainda não vinculado</p>
        <p className="nota mt-1">Fale com quem liberou sua conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="label-eyebrow">Seus leads</h2>
          <span className="text-[11px] text-stone-500 tabular">{meus.length}</span>
        </div>

        {meus.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-stone-600">
              Você ainda não comprou nenhum lead. O catálogo abaixo mostra o que está disponível nas
              suas teses.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {meus.map((lead) => (
              <CartaoComprado key={lead.id} lead={lead} aoAbrir={() => aoAbrir(lead)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="label-eyebrow">Disponíveis para você</h2>
          <span className="text-[11px] text-stone-500 tabular">{catalogo.length}</span>
        </div>
        <p className="nota mb-3">
          Filtrado pelas teses e pela região em que você atua. O telefone completo é liberado na
          compra.
        </p>

        {catalogo.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-[13px] text-stone-600">
              Nenhum lead disponível agora nas suas teses. Você recebe aviso assim que entrar um.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {catalogo.map((lead) => (
              <CartaoCatalogo
                key={lead.id}
                lead={lead}
                advogado={advogado}
                aoAbrir={() => aoAbrir(lead)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function CartaoComprado({ lead, aoAbrir }: { lead: Lead; aoAbrir: () => void }) {
  const { perfil } = useAuth();
  const devolvido = lead.devolucao !== null;

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={`card card-interativo p-4 text-left ${devolvido ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>{TESE_CURTA[lead.tese]}</span>
        {devolvido && (
          <span className={`etiqueta ${ESTILO_ETIQUETA.atencao}`}>
            <Undo2 className="size-3" />
            devolvido
          </span>
        )}
        <span className="nota ml-auto">{lead.cidade}</span>
      </div>

      <h3 className="text-[14px] font-semibold text-roxo-900 mt-2">{lead.nome}</h3>

      {lead.reuniaoEm && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-stone-600">
          <CalendarClock className="size-3.5 shrink-0" />
          {formatarReuniao(lead.reuniaoEm)}
        </div>
      )}

      {/*
        INV-11 — comprado, o contato aparece inteiro. É o produto entregue, e
        continua aparecendo mesmo depois de devolvido: o número já foi visto, e
        esconder agora não desfaz nada — só apaga o histórico de quem atendeu.
      */}
      <div className={`flex items-center gap-2 mt-3 rounded-lg border p-2.5 ${ESTILO_BLOCO.sucesso}`}>
        <Phone className={`size-4 shrink-0 ${ESTILO_TEXTO.sucesso}`} />
        <span className="text-[13px] font-semibold text-roxo-900 tabular">
          {contatoVisivel(lead, perfil)}
        </span>
      </div>

      <p className="text-[12px] text-stone-600 leading-snug mt-3 line-clamp-3">
        {devolvido ? lead.devolucao!.motivo : lead.resumoQualificacao}
      </p>
    </button>
  );
}

function CartaoCatalogo({
  lead,
  advogado,
  aoAbrir,
}: {
  lead: Lead;
  advogado: Advogado;
  aoAbrir: () => void;
}) {
  const { perfil } = useAuth();
  const recusa = motivoParaNaoComprar(lead, advogado);
  const reservado = reservadoPorOutro(lead, perfil);
  const horas = horasAteReuniao(lead);

  return (
    <button
      type="button"
      onClick={aoAbrir}
      className={`card card-interativo p-4 text-left ${reservado ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>{TESE_CURTA[lead.tese]}</span>
        <span className="nota ml-auto flex items-center gap-1">
          <MapPin className="size-3" />
          {lead.cidade}
        </span>
      </div>

      {/*
        O nome do cliente aparece porque é o advogado quem decide se pega o
        caso, e decidir sem saber de quem se trata não é decidir. O que não
        aparece é o contato: é ele que está à venda (INV-11).
      */}
      <h3 className="text-[14px] font-semibold text-roxo-900 mt-2">{lead.nome}</h3>

      {lead.reuniaoEm && (
        <div
          className={`flex items-center gap-1.5 mt-1.5 text-[12px] ${
            horas !== null && horas <= 48 ? 'text-erro-700 font-medium' : 'text-stone-600'
          }`}
        >
          <CalendarClock className="size-3.5 shrink-0" />
          {formatarReuniao(lead.reuniaoEm)}
        </div>
      )}

      <div
        className={`flex items-center gap-2 mt-3 rounded-lg border p-2.5 ${ESTILO_BLOCO.neutro}`}
      >
        <Lock className="size-4 shrink-0 text-stone-400" />
        <span className="text-[13px] font-semibold text-stone-500 tabular">
          {contatoVisivel(lead, perfil)}
        </span>
      </div>

      <p className="text-[12px] text-stone-600 leading-snug mt-3 line-clamp-3">
        {lead.resumoQualificacao}
      </p>

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-stone-100">
        <span className="text-[13px] font-semibold text-roxo-900 tabular">
          {advogado.modeloPagamento === 'avulso'
            ? brl.format(lead.precoAvulso)
            : `${lead.custoCreditos} créditos`}
        </span>

        {reservado ? (
          <span className="flex items-center gap-1 text-[11px] text-info-700">
            <Timer className="size-3.5" />
            reservado
          </span>
        ) : recusa ? (
          /* CRE-R04 — sem saldo o botão não é desenhado. Um botão que existe e
             falha no clique ensina a tentar de novo, e cada tentativa é uma
             corrida a mais pelo mesmo lead. */
          <span className="nota text-right max-w-40">{recusa}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-roxo-700">
            <ShoppingCart className="size-3.5" />
            Comprar
          </span>
        )}
      </div>
    </button>
  );
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
