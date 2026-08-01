import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CalendarClock, Coins, Phone, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_TEXTO } from '@/src/lib/estilo';
import { ESTILO_TESE, contatoVisivel, estaNoCatalogo } from '@/src/lib/leads';
import { TESE_POR_ID } from '@/src/lib/teses';
import { MODELO_PAGAMENTO_LABEL, TESE_CURTA, type Advogado, type Lead } from '@/types';

const formatoReuniao = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * O painel do advogado.
 *
 * Ele não opera a máquina de aquisição — consome o produto dela. Então a tela
 * responde três perguntas, nesta ordem: o que eu tenho para atender hoje, o que
 * há disponível para mim, e quanto posso comprar.
 */
export function PainelDoAdvogado({
  advogado,
  leads,
  saudacao,
  hoje,
}: {
  advogado: Advogado | null;
  leads: Lead[];
  saudacao: string;
  hoje: string;
}) {
  const { perfil } = useAuth();

  if (!advogado) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <div className="card py-16 text-center">
          <p className="text-[14px] font-medium text-roxo-900">Acesso ainda não vinculado</p>
          <p className="nota mt-1">Fale com quem liberou sua conta.</p>
        </div>
      </div>
    );
  }

  const meus = leads.filter((l) => l.compradoPor === advogado.id);
  const disponiveis = leads.filter(estaNoCatalogo);

  const agenda = meus
    .filter((l) => l.reuniaoEm && Date.parse(l.reuniaoEm) > Date.now())
    .sort((a, b) => Date.parse(a.reuniaoEm!) - Date.parse(b.reuniaoEm!));

  const avulso = advogado.modeloPagamento === 'avulso';

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">{saudacao}</h1>
          <p className="subtitulo-pagina mt-1 first-letter:uppercase">{hoje}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
          <Coins className={`size-3.5 ${ESTILO_TEXTO.marca}`} />
          <strong className="font-semibold text-roxo-800 tabular">
            {avulso ? MODELO_PAGAMENTO_LABEL.avulso : `${advogado.saldoCreditos} créditos`}
          </strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className={`chip ${ESTILO_CHIP.marca}`}>
          <span className="text-lg font-semibold tabular leading-none">{disponiveis.length}</span>
          <span className="text-[12px] font-medium">disponíveis para você</span>
        </div>
        <div className={`chip ${ESTILO_CHIP.sucesso}`}>
          <span className="text-lg font-semibold tabular leading-none">{agenda.length}</span>
          <span className="text-[12px] font-medium">reuniões pela frente</span>
        </div>
        <div className={`chip ${ESTILO_CHIP.neutro}`}>
          <span className="text-lg font-semibold tabular leading-none">{meus.length}</span>
          <span className="text-[12px] font-medium">leads adquiridos</span>
        </div>
      </div>

      {advogado.saldoCreditos === 0 && !avulso && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.atencao}`}>
          <p className="text-[13px] text-stone-700">
            Seu saldo está zerado. Você continua sendo avisado quando entra lead novo, mas só
            consegue comprar depois de recarregar.{' '}
            <Link to="/creditos" className="font-medium text-roxo-700 hover:text-roxo-900">
              Ver pacotes
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Agenda -------------------------------------------------------- */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="card-title">Suas próximas reuniões</h2>
            <span className="text-[11px] text-stone-500 tabular">{agenda.length}</span>
          </div>
          <p className="nota mb-4">
            É você quem liga na hora marcada. Confirme antes com o cliente pelo contato abaixo.
          </p>

          {agenda.length === 0 ? (
            <p className="nota py-6 text-center">
              Nenhuma reunião marcada. Veja o que está disponível no catálogo.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {agenda.map((lead) => (
                <li key={lead.id} className={`rounded-lg border p-3 ${ESTILO_BLOCO.neutro}`}>
                  <div className="flex items-start gap-2">
                    <CalendarClock className="size-4 shrink-0 mt-0.5 text-stone-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-roxo-900">{lead.nome}</span>
                        <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>
                          {TESE_CURTA[lead.tese]}
                        </span>
                      </div>
                      <div className="text-[12px] text-stone-600 mt-0.5 first-letter:uppercase">
                        {formatoReuniao.format(new Date(lead.reuniaoEm!))} · {lead.cidade}
                      </div>
                      {/* INV-11 — comprado, o contato aparece inteiro. */}
                      <div className="flex items-center gap-1.5 mt-1.5 text-[13px] font-semibold text-roxo-900 tabular">
                        <Phone className={`size-3.5 ${ESTILO_TEXTO.sucesso}`} />
                        {contatoVisivel(lead, perfil)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Suas teses -------------------------------------------------- */}
          <section className="card p-5">
            <h2 className="flex items-center gap-1.5 card-title mb-1">
              <Bell className="size-3.5" />
              O que você acompanha
            </h2>
            <p className="nota mb-4">
              Você recebe aviso quando entra lead novo nestas teses, em {advogado.uf}.
            </p>

            <ul className="space-y-2">
              {advogado.teses.map((teseId) => {
                const tese = TESE_POR_ID[teseId];
                const quantos = disponiveis.filter((l) => l.tese === teseId).length;
                return (
                  <li key={teseId} className="flex items-center gap-2.5">
                    <span className={`etiqueta ${ESTILO_TESE[teseId]}`}>{TESE_CURTA[teseId]}</span>
                    <span className="text-[12px] text-stone-600 truncate">{tese?.area}</span>
                    <span className="text-[12px] font-medium text-roxo-900 tabular ml-auto shrink-0">
                      {quantos}
                    </span>
                  </li>
                );
              })}
              {advogado.teses.length === 0 && (
                <p className="nota">
                  Nenhuma tese configurada — por isso o catálogo aparece vazio. Fale com seu
                  contato na Focus.
                </p>
              )}
            </ul>
          </section>

          <Link to="/leads" className="card card-interativo p-4 flex items-center gap-3 group">
            <ShoppingBag className={`size-5 shrink-0 ${ESTILO_TEXTO.marca}`} />
            <div className="min-w-0">
              <div className="card-title">Ver o catálogo</div>
              <p className="nota mt-0.5">
                {disponiveis.length} leads qualificados com reunião pronta
              </p>
            </div>
            <ArrowRight className="ml-auto size-4 text-stone-300 group-hover:text-roxo-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
