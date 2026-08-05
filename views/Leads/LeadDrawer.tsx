import { useEffect, useId, useState } from 'react';
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronDown,
  Lock,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ShoppingCart,
  Star,
  Undo2,
  UserX,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { listarLigacoesDoLead } from '@/src/servicos/qualificacao';
import { ESTILO_BLOCO, ESTILO_ETIQUETA, ESTILO_TEXTO } from '@/src/lib/estilo';
import {
  ESTILO_TESE,
  NOTA_MAXIMA,
  contatoVisivel,
  elegibilidadeDoLead,
  motivoParaNaoComprar,
  podeAvaliar,
  podeEncerrarReuniao,
} from '@/src/lib/leads';
import { MAX_TENTATIVAS, TOM_RESULTADO, formatarDuracao } from '@/src/lib/qualificacao';
import { MOTIVOS_DEVOLUCAO, podeDevolver } from '@/src/lib/creditos';
import { TESE_POR_ID } from '@/src/lib/teses';
import { formatarDataHora } from '@/src/lib/format';
import {
  LEAD_STATUS_LABEL,
  ORIGEM_LEAD_LABEL,
  RESULTADO_LIGACAO_LABEL,
  TESE_CURTA,
  type Advogado,
  type Lead,
  type LigacaoDetalhada,
} from '@/types';
import { formatarReuniao } from './LeadCard';

interface Props {
  lead: Lead;
  /** O advogado do perfil ativo. Nulo para o time interno. */
  advogado: Advogado | null;
  compradorNome: string | null;
  aoFechar: () => void;
  aoComprar: (lead: Lead) => void;
  aoDevolver: (lead: Lead, motivo: string) => void;
  /** LED-R07 — desfecho da reunião, registrado por quem esteve nela. */
  aoEncerrar: (lead: Lead, desfecho: 'atendido' | 'no_show') => void;
}

export function LeadDrawer({
  lead,
  advogado,
  compradorNome,
  aoFechar,
  aoComprar,
  aoDevolver,
  aoEncerrar,
}: Props) {
  const { perfil, ehAdvogado } = useAuth();
  const { responderFiltro } = useLeads();
  const idBase = useId();
  const [devolvendo, setDevolvendo] = useState(false);
  const [ligacoes, setLigacoes] = useState<LigacaoDetalhada[] | null>(null);

  useEffect(() => {
    // Só o time interno — o resumo já visível ao advogado basta para decidir a
    // compra; a transcrição bruta é detalhe de operação, não do catálogo.
    if (ehAdvogado) return;
    let vivo = true;
    setLigacoes(null);
    void listarLigacoesDoLead(lead.id).then((r) => {
      if (vivo) setLigacoes(r);
    });
    return () => {
      vivo = false;
    };
  }, [lead.id, ehAdvogado]);

  const tese = TESE_POR_ID[lead.tese];
  const { elegivel, pendentes } = elegibilidadeDoLead(lead);
  const recusaCompra = motivoParaNaoComprar(lead, advogado);
  const meu = lead.compradoPor !== null && lead.compradoPor === perfil.advogado_id;
  const contato = contatoVisivel(lead, perfil);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div className="pilha-dialogo flex justify-end">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="veu" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        className="gaveta max-w-lg"
      >
        <header className="shrink-0 flex items-start gap-3 px-6 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`etiqueta ${ESTILO_TESE[lead.tese]}`}>{TESE_CURTA[lead.tese]}</span>
              <span className="nota">{LEAD_STATUS_LABEL[lead.status]}</span>
            </div>
            <h2 id={`${idBase}-titulo`} className="text-[15px] font-semibold text-roxo-900 mt-1">
              {lead.nome}
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              {lead.cidade} · {lead.uf} · {ORIGEM_LEAD_LABEL[lead.origem]}
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="btn-icone ml-auto">
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Reunião ---------------------------------------------------- */}
          <section>
            <h3 className="label-eyebrow mb-2">A reunião</h3>
            {lead.reuniaoEm ? (
              <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.marca}`}>
                <div className="flex items-center gap-2 text-[14px] font-semibold text-roxo-900">
                  <CalendarClock className="size-4" />
                  {formatarReuniao(lead.reuniaoEm)}
                </div>
                <p className="nota mt-1">
                  É a hora marcada que o advogado compra. Sem ela, o registro é só um contato.
                </p>
              </div>
            ) : (
              <p className="text-[13px] text-stone-500">Ainda não agendada.</p>
            )}
          </section>

          {/* Contato ---------------------------------------------------- */}
          <section>
            <h3 className="label-eyebrow mb-2">Contato</h3>
            <div
              className={`flex items-center gap-2.5 rounded-lg border p-3 ${
                meu || !ehAdvogado ? ESTILO_BLOCO.sucesso : ESTILO_BLOCO.neutro
              }`}
            >
              {meu || !ehAdvogado ? (
                <Phone className={`size-4 shrink-0 ${ESTILO_TEXTO.sucesso}`} />
              ) : (
                <Lock className="size-4 shrink-0 text-stone-400" />
              )}
              <span className="text-[14px] font-semibold text-roxo-900 tabular">{contato}</span>
              {ehAdvogado && !meu && (
                <span className="nota ml-auto text-right">
                  O número completo é liberado na compra
                </span>
              )}
            </div>
          </section>

          {/* Resumo da qualificação ------------------------------------- */}
          <section>
            <h3 className="label-eyebrow mb-2">O que a qualificação apurou</h3>
            <p className="text-[13px] text-stone-700 leading-relaxed">{lead.resumoQualificacao}</p>
            {!lead.temGravacao && (
              <p className={`flex items-center gap-1.5 mt-2 text-[11px] ${ESTILO_TEXTO.erro}`}>
                <MicOff className="size-3.5" />
                Sem gravação da ligação — não há como demonstrar como o cliente foi direcionado
                (QUA-R03).
              </p>
            )}
          </section>

          {/* Histórico de ligações ---------------------------------------- */}
          {!ehAdvogado && (ligacoes === null || ligacoes.length > 0) && (
            <section>
              <h3 className="label-eyebrow mb-2">Histórico de ligações</h3>
              {ligacoes === null ? (
                <p className="nota">Carregando…</p>
              ) : (
                <ul className="space-y-2">
                  {ligacoes.map((lig) => (
                    <LinhaLigacao key={lig.id} ligacao={lig} />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Elegibilidade ----------------------------------------------- */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="label-eyebrow">Filtros da tese</h3>
              <span className={`text-[11px] ${elegivel ? ESTILO_TEXTO.sucesso : ESTILO_TEXTO.atencao}`}>
                {elegivel ? 'todos confirmados' : `${pendentes.length} por confirmar`}
              </span>
            </div>

            <ul className="space-y-1.5">
              {tese?.filtros.map((filtro) => {
                const marcado = lead.elegibilidade[filtro.id] === true;
                return (
                  <li
                    key={filtro.id}
                    className={`rounded-lg border p-2.5 ${
                      marcado ? ESTILO_BLOCO.sucesso : ESTILO_BLOCO.neutro
                    }`}
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={ehAdvogado}
                        onChange={(e) => responderFiltro(lead.id, filtro.id, e.target.checked)}
                        className="mt-0.5 accent-roxo-600 disabled:opacity-50"
                      />
                      <span className="min-w-0">
                        <span className="block text-[12px] font-medium text-roxo-900">
                          {filtro.rotulo}
                        </span>
                        <span className="block nota mt-0.5">{filtro.motivo}</span>
                        <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700 mt-1">
                          {filtro.regra}
                        </code>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Cuidados da tese -------------------------------------------- */}
          {tese && tese.cuidados.length > 0 && (
            <section>
              <h3 className="label-eyebrow mb-2">Cuidados desta tese</h3>
              <ul className="space-y-1">
                {tese.cuidados.map((cuidado) => (
                  <li key={cuidado} className="flex gap-2 text-[12px] text-stone-600 leading-snug">
                    <Check className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
                    {cuidado}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Avaliação ---------------------------------------------------- */}
          {(podeAvaliar(lead, advogado) || lead.avaliacao) && (
            <Avaliacao lead={lead} avaliavel={podeAvaliar(lead, advogado)} />
          )}

          {/* Rastro ------------------------------------------------------- */}
          <section>
            <h3 className="label-eyebrow mb-2">Rastro</h3>
            <dl className="text-[12px] space-y-1.5">
              <Linha rotulo="Entrou em" valor={formatarDataHora(lead.criadoEm)} />
              {lead.compradoEm && (
                <Linha
                  rotulo="Vendido em"
                  valor={`${formatarDataHora(lead.compradoEm)} · ${compradorNome ?? lead.compradoPor}`}
                />
              )}
              {lead.devolucao && (
                <Linha
                  rotulo="Devolvido em"
                  valor={`${formatarDataHora(lead.devolucao.em)} · ${lead.devolucao.motivo}`}
                />
              )}
            </dl>
            {lead.compradoEm && (
              <p className="nota mt-2">
                A data da venda e o comprador são imutáveis — é o que responde, perante a OAB, como
                aquele cliente foi direcionado (INV-13).
              </p>
            )}
          </section>
        </div>

        <footer className="shrink-0 px-6 py-4 border-t border-stone-200 bg-stone-50">
          {devolvendo ? (
            <FormularioDevolucao
              aoCancelar={() => setDevolvendo(false)}
              aoConfirmar={(motivo) => {
                aoDevolver(lead, motivo);
                setDevolvendo(false);
              }}
            />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-roxo-900 tabular">
                  {lead.custoCreditos} créditos
                  <span className="text-[11px] font-normal text-stone-500">
                    {' '}
                    ou {brl.format(lead.precoAvulso)} avulso
                  </span>
                </div>
                {/* CRE-R04 — o motivo aparece no lugar do botão, não como erro
                    depois do clique. Botão que falha ensina a tentar de novo. */}
                {recusaCompra && !meu && <p className="nota mt-0.5">{recusaCompra}</p>}
              </div>

              {meu ? (
                /* LED-R07 — passada a hora marcada, a pergunta deixa de ser
                   "devolver ou não" e passa a ser "o cliente apareceu?". */
                <div className="flex items-center gap-2 shrink-0">
                  {podeEncerrarReuniao(lead, advogado) && (
                    <>
                      <button
                        type="button"
                        onClick={() => aoEncerrar(lead, 'no_show')}
                        className="btn btn-secundario"
                      >
                        <UserX className="size-4" />
                        Faltou
                      </button>
                      <button
                        type="button"
                        onClick={() => aoEncerrar(lead, 'atendido')}
                        className="btn btn-primario"
                      >
                        <CalendarCheck className="size-4" />
                        Consulta feita
                      </button>
                    </>
                  )}

                  {podeDevolver(lead) ? (
                    <button
                      type="button"
                      onClick={() => setDevolvendo(true)}
                      className="btn btn-secundario"
                    >
                      <Undo2 className="size-4" />
                      Devolver
                    </button>
                  ) : (
                    !podeEncerrarReuniao(lead, advogado) && (
                      <span className="flex items-center gap-1.5 text-[12px] text-sucesso-700">
                        <BadgeCheck className="size-4" />
                        Seu lead
                      </span>
                    )
                  )}
                </div>
              ) : (
                !recusaCompra && (
                  <button
                    type="button"
                    onClick={() => aoComprar(lead)}
                    className="btn btn-primario shrink-0"
                  >
                    <ShoppingCart className="size-4" />
                    Comprar lead
                  </button>
                )
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** Uma tentativa no histórico — resultado, duração, e a transcrição sob demanda. */
function LinhaLigacao({ ligacao }: { ligacao: LigacaoDetalhada }) {
  return (
    <li className={`rounded-lg border p-2.5 ${ESTILO_BLOCO.neutro}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-stone-500 tabular">
          {ligacao.tentativa}/{MAX_TENTATIVAS}
        </span>
        <span className={`etiqueta ${ESTILO_ETIQUETA[TOM_RESULTADO[ligacao.resultado]]}`}>
          {RESULTADO_LIGACAO_LABEL[ligacao.resultado]}
        </span>
        <span className="nota">{formatarDuracao(ligacao.duracao)}</span>
        <span className="nota ml-auto">{formatarDataHora(ligacao.em)}</span>
        {ligacao.temGravacao ? (
          <Mic className="size-3 text-stone-400 shrink-0" aria-label="Com gravação" />
        ) : (
          <PhoneOff className="size-3 text-stone-400 shrink-0" aria-label="Sem gravação" />
        )}
      </div>

      {ligacao.motivoEncerramento && (
        <p className="text-[12px] text-stone-600 mt-1.5">{ligacao.motivoEncerramento}</p>
      )}

      {ligacao.gravacaoUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- é ligação telefônica, não há legenda a gerar.
        <audio controls src={ligacao.gravacaoUrl} className="w-full h-8 mt-2" />
      )}

      {ligacao.transcricao && (
        <details className="mt-2 group">
          <summary className="flex items-center gap-1 text-[11px] text-roxo-700 cursor-pointer select-none">
            <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
            Ver transcrição
          </summary>
          <p className="text-[12px] text-stone-700 leading-relaxed mt-2 whitespace-pre-line">
            {ligacao.transcricao}
          </p>
        </details>
      )}
    </li>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-stone-500 shrink-0 w-24">{rotulo}</dt>
      <dd className="text-stone-700 min-w-0">{valor}</dd>
    </div>
  );
}

/**
 * LED-R08 — a nota do comprador, depois da consulta.
 *
 * É o único retorno que a Focus recebe sobre a própria qualificação: tudo o
 * mais que ela mede (taxa, duração, gravação) é visto de dentro. Fica visível
 * também para o time interno, e de propósito — nota que só o advogado enxerga
 * não corrige régua nenhuma.
 */
function Avaliacao({ lead, avaliavel }: { lead: Lead; avaliavel: boolean }) {
  const { avaliar } = useLeads();
  const registrada = lead.avaliacao;
  const [nota, setNota] = useState(registrada?.nota ?? 0);
  const [comentario, setComentario] = useState(registrada?.comentario ?? '');

  const notas = Array.from({ length: NOTA_MAXIMA }, (_, i) => i + 1);
  const mudou = registrada
    ? nota !== registrada.nota || comentario !== (registrada.comentario ?? '')
    : nota > 0;

  return (
    <section>
      <h3 className="label-eyebrow mb-2">
        {avaliavel ? 'Como foi este lead?' : 'Avaliação do comprador'}
      </h3>

      <div className="flex items-center gap-1">
        {notas.map((valor) => {
          const cheia = valor <= nota;
          const estrela = (
            <Star
              className={`size-5 ${cheia ? 'fill-atencao-400 text-atencao-400' : 'text-stone-300'}`}
            />
          );

          return avaliavel ? (
            <button
              key={valor}
              type="button"
              onClick={() => setNota(valor)}
              aria-label={`${valor} de ${NOTA_MAXIMA}`}
              aria-pressed={cheia}
              className="btn-icone"
            >
              {estrela}
            </button>
          ) : (
            <span key={valor}>{estrela}</span>
          );
        })}
        {registrada && (
          <span className="nota ml-2">avaliado em {formatarDataHora(registrada.em)}</span>
        )}
      </div>

      {avaliavel ? (
        <>
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            aria-label="Comentário sobre o lead"
            placeholder="O caso era o que o resumo dizia? (opcional)"
            className="campo mt-2"
          />
          <p className="campo-dica">
            A nota é do lead entregue, não do cliente. É ela que corrige a régua da qualificação.
          </p>
          <button
            type="button"
            disabled={nota === 0 || !mudou}
            onClick={() => avaliar(lead.id, nota, comentario)}
            className="btn btn-secundario mt-2"
          >
            {registrada ? 'Atualizar avaliação' : 'Salvar avaliação'}
          </button>
        </>
      ) : (
        registrada?.comentario && (
          <p className="text-[13px] text-stone-700 leading-relaxed mt-2">{registrada.comentario}</p>
        )
      )}
    </section>
  );
}

/** CRE-R05 — devolver exige motivo, e o lead não volta ao catálogo. */
function FormularioDevolucao({
  aoCancelar,
  aoConfirmar,
}: {
  aoCancelar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');

  return (
    <div>
      <label htmlFor="motivo-devolucao" className="campo-rotulo">
        Por que este lead está sendo devolvido?
      </label>
      <select
        id="motivo-devolucao"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="campo"
      >
        <option value="">Selecione…</option>
        {MOTIVOS_DEVOLUCAO.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <p className="campo-dica">
        O crédito volta para o seu saldo. O lead não retorna ao catálogo: o contato já foi
        entregue, e revendê-lo criaria dois advogados disputando o mesmo cliente (INV-10).
      </p>
      <div className="flex justify-end gap-2 mt-3">
        <button type="button" onClick={aoCancelar} className="btn btn-fantasma">
          Cancelar
        </button>
        <button
          type="button"
          disabled={!motivo}
          onClick={() => aoConfirmar(motivo)}
          className="btn btn-primario"
        >
          Confirmar devolução
        </button>
      </div>
    </div>
  );
}
