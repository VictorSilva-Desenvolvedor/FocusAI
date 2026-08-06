import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  Coins,
  MapPin,
  Phone,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Undo2,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { leadsQueCabem } from '@/src/lib/creditos';
import { ESTILO_BLOCO, ESTILO_ETIQUETA, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import { ESTILO_TESE, contatoVisivel, estaNoCatalogo, horasAteReuniao } from '@/src/lib/leads';
import { TESE_POR_ID } from '@/src/lib/teses';
import { LEAD_STATUS_LABEL, TESE_CURTA, type Advogado, type Lead } from '@/types';

const formatoReuniao = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** Janela dos números do painel — a mesma do painel da operação. */
const JANELA_DIAS = 30;

/** Quantos itens cada lista curta mostra antes de mandar para a tela cheia. */
const NA_PREVIA = 4;

/**
 * O painel do advogado.
 *
 * Ele não opera a máquina de aquisição — consome o produto dela. A tela
 * responde, nesta ordem: o que eu tenho para atender, o que já comprei, o que
 * posso comprar agora e quanto ainda dá para comprar. As três primeiras são
 * leituras do mesmo store de leads; a última sai do saldo.
 *
 * Comprar continua sendo na tela de Leads, e de propósito: a compra abre reserva
 * com prazo (`LED-R04`) e passa pelas travas de `motivoParaNaoComprar`. Um botão
 * de comprar aqui teria que repetir as duas coisas, e a cópia é justamente onde
 * a regra se perde.
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

  const numeros = useMemo(() => {
    if (!advogado) return null;

    const desde = Date.now() - JANELA_DIAS * 86_400_000;
    const meus = leads.filter((l) => l.compradoPor === advogado.id);
    const noPeriodo = meus.filter((l) => l.compradoEm && Date.parse(l.compradoEm) >= desde);
    const avulso = advogado.modeloPagamento === 'avulso';

    return {
      avulso,
      meus,
      recentes: [...meus].sort(
        (a, b) => Date.parse(b.compradoEm ?? '') - Date.parse(a.compradoEm ?? ''),
      ),
      devolvidos: meus.filter((l) => l.devolucao !== null).length,
      noPeriodo: noPeriodo.length,
      /* No avulso o que importa é o quanto ele pagou; no crédito, o quanto
         consumiu do saldo. São unidades diferentes e a tela não as mistura. */
      gastoNoPeriodo: avulso
        ? noPeriodo.reduce((s, l) => s + l.precoAvulso, 0)
        : noPeriodo.reduce((s, l) => s + l.custoCreditos, 0),
      agenda: meus
        .filter((l) => l.reuniaoEm && Date.parse(l.reuniaoEm) > Date.now())
        .sort((a, b) => Date.parse(a.reuniaoEm!) - Date.parse(b.reuniaoEm!)),
      // O produto é perecível: quem vence primeiro aparece primeiro.
      disponiveis: leads
        .filter(estaNoCatalogo)
        .sort((a, b) => Date.parse(a.reuniaoEm ?? '') - Date.parse(b.reuniaoEm ?? '')),
    };
  }, [advogado, leads]);

  if (!advogado || !numeros) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <div className="card py-16 text-center">
          <p className="text-[14px] font-medium text-roxo-900">Acesso ainda não vinculado</p>
          <p className="nota mt-1">Fale com quem liberou sua conta.</p>
        </div>
      </div>
    );
  }

  const { avulso, meus, recentes, devolvidos, noPeriodo, gastoNoPeriodo, agenda, disponiveis } =
    numeros;
  const cabem = leadsQueCabem(advogado.saldoCreditos);

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">{saudacao}</h1>
          <p className="subtitulo-pagina mt-1 first-letter:uppercase">{hoje}</p>
        </div>

        {/* O saldo em créditos não diz nada sozinho: o que o advogado precisa
            saber é quantos leads ele ainda compra com ele. */}
        <Link
          to="/creditos"
          className="flex items-center gap-2 text-[11px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2 hover:border-roxo-300 transition-colors"
        >
          <Coins className={`size-3.5 ${ESTILO_TEXTO.marca}`} />
          {avulso ? (
            <strong className="font-semibold text-roxo-800 tabular">
              Avulso · {brl.format(disponiveis[0]?.precoAvulso ?? 0)} por lead
            </strong>
          ) : (
            <span>
              <strong className="font-semibold text-roxo-800 tabular">
                {advogado.saldoCreditos} créditos
              </strong>
              <span className="tabular"> · dá para {cabem} leads</span>
            </span>
          )}
        </Link>
      </div>

      {/* Os números ------------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Numero
          valor={meus.length}
          rotulo="leads comprados"
          detalhe={
            devolvidos > 0
              ? `${devolvidos} devolvido${devolvidos > 1 ? 's' : ''} · ${noPeriodo} em 30 dias`
              : `${noPeriodo} nos últimos 30 dias`
          }
          tom="marca"
        />
        <Numero
          valor={agenda.length}
          rotulo="reuniões pela frente"
          detalhe="Você liga na hora marcada"
          tom="sucesso"
        />
        <Numero
          valor={disponiveis.length}
          rotulo="disponíveis para você"
          detalhe="Nas suas teses e na sua região"
          tom="neutro"
        />
        <Numero
          valor={avulso ? brl.format(gastoNoPeriodo) : gastoNoPeriodo}
          rotulo={avulso ? 'pago em 30 dias' : 'créditos consumidos em 30 dias'}
          detalhe={avulso ? 'Cobrança por lead' : `Saldo atual: ${advogado.saldoCreditos}`}
          tom="info"
        />
      </div>

      {advogado.saldoCreditos === 0 && !avulso && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.atencao}`}>
          <p className="text-[13px] text-stone-700">
            Seu saldo está zerado. Você continua sendo avisado quando entra lead novo, mas só
            consegue comprar depois de recarregar.{' '}
            <Link to="/creditos" className="font-medium text-roxo-700 hover:text-roxo-900">
              Ver preços e recargas
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        <div className="space-y-6">
          {/* Agenda ------------------------------------------------------- */}
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

          {/* Leads comprados --------------------------------------------- */}
          <section className="card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="card-title">Seus leads</h2>
              <span className="text-[11px] text-stone-500 tabular">{meus.length} comprados</span>
            </div>
            <p className="nota mb-4">
              Cada linha é uma compra sua: o contato continua liberado depois da consulta, e depois
              da devolução — o número já foi visto.
            </p>

            {meus.length === 0 ? (
              <p className="nota py-6 text-center">
                Você ainda não comprou nenhum lead. O catálogo mostra o que está disponível nas suas
                teses.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-stone-100">
                  {recentes.slice(0, NA_PREVIA).map((lead) => (
                    <li key={lead.id} className="flex items-start gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium text-roxo-900">{lead.nome}</span>
                          <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>
                            {TESE_CURTA[lead.tese]}
                          </span>
                          {lead.devolucao && (
                            <span className={`etiqueta ${ESTILO_ETIQUETA.atencao}`}>
                              <Undo2 className="size-3" />
                              devolvido
                            </span>
                          )}
                        </div>
                        <div className="nota mt-0.5">
                          {LEAD_STATUS_LABEL[lead.status]} · {lead.cidade}
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-roxo-900 tabular shrink-0">
                        {contatoVisivel(lead, perfil)}
                      </span>
                    </li>
                  ))}
                </ul>

                {meus.length > NA_PREVIA && (
                  <Link
                    to="/leads"
                    className="flex items-center gap-1.5 text-[12px] font-medium text-roxo-700 hover:text-roxo-900 mt-3"
                  >
                    Ver os {meus.length} leads
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Para comprar agora ------------------------------------------- */}
          <section className="card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="flex items-center gap-1.5 card-title">
                <ShoppingCart className="size-3.5" />
                Para comprar agora
              </h2>
              <span className="text-[11px] text-stone-500 tabular">{disponiveis.length}</span>
            </div>
            <p className="nota mb-4">
              Reunião já agendada. A compra libera o telefone completo na hora.
            </p>

            {disponiveis.length === 0 ? (
              <p className="nota py-6 text-center">
                Nada disponível agora nas suas teses. Você recebe aviso assim que entrar um.
              </p>
            ) : (
              <ul className="space-y-2">
                {disponiveis.slice(0, NA_PREVIA).map((lead) => {
                  const horas = horasAteReuniao(lead);
                  const urgente = horas !== null && horas <= 48;

                  return (
                    <li key={lead.id}>
                      <Link
                        to="/leads"
                        className="block rounded-lg border border-stone-200 p-3 hover:border-roxo-300 hover:bg-roxo-50/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>
                            {TESE_CURTA[lead.tese]}
                          </span>
                          <span className="nota ml-auto flex items-center gap-1">
                            <MapPin className="size-3" />
                            {lead.cidade}
                          </span>
                        </div>

                        <div className="text-[13px] font-medium text-roxo-900 mt-1.5">
                          {lead.nome}
                        </div>

                        {lead.reuniaoEm && (
                          <div
                            className={`flex items-center gap-1.5 text-[12px] mt-0.5 first-letter:uppercase ${
                              urgente ? 'text-erro-700 font-medium' : 'text-stone-600'
                            }`}
                          >
                            <CalendarClock className="size-3.5 shrink-0" />
                            {formatoReuniao.format(new Date(lead.reuniaoEm))}
                          </div>
                        )}

                        <div className="text-[12px] font-semibold text-roxo-900 tabular mt-1.5">
                          {avulso ? brl.format(lead.precoAvulso) : `${lead.custoCreditos} créditos`}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Suas teses --------------------------------------------------- */}
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
                  Nenhuma tese configurada — por isso o catálogo aparece vazio. Fale com seu contato
                  na Focus.
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

          <Link to="/creditos" className="card card-interativo p-4 flex items-center gap-3 group">
            <Tag className={`size-5 shrink-0 ${ESTILO_TEXTO.marca}`} />
            <div className="min-w-0">
              <div className="card-title">Preços e recargas</div>
              <p className="nota mt-0.5">
                {avulso ? 'Quanto custa cada lead' : 'Quanto rende cada recarga'}
              </p>
            </div>
            <ArrowRight className="ml-auto size-4 text-stone-300 group-hover:text-roxo-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** O mesmo bloco de número do painel da operação — um padrão por elemento. */
function Numero({
  valor,
  rotulo,
  detalhe,
  tom,
}: {
  valor: number | string;
  rotulo: string;
  detalhe: string;
  tom: Tom;
}) {
  return (
    <div className={`rounded-lg border p-3 ${ESTILO_BLOCO[tom]}`}>
      <div className={`text-2xl font-semibold tabular ${ESTILO_TEXTO[tom]}`}>{valor}</div>
      <div className="text-[12px] text-stone-600 mt-0.5">{rotulo}</div>
      <div className="nota mt-0.5">{detalhe}</div>
    </div>
  );
}
