import { useId, useMemo, useState } from 'react';
import { AlertTriangle, Check, Coins, Landmark, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useCreditos } from '@/src/contexts/CreditosContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { Campo } from '@/src/components/ui/Campo';
import { Toast, type Aviso } from '@/src/components/ui/Toast';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_ETIQUETA, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import {
  PACOTES,
  RECARGA_MINIMA,
  TOM_MOVIMENTO,
  VALOR_DO_CREDITO,
  descontoDoPacote,
  divergenciaDeSaldo,
  faixaDePrecoDasTeses,
  leadsDoPacote,
  motivoParaNaoAjustar,
  precoPorCredito,
  receitaDoPeriodo,
} from '@/src/lib/creditos';
import { formatarDataHora } from '@/src/lib/format';
import { ESTILO_TESE } from '@/src/lib/leads';
import { TESES } from '@/src/lib/teses';
import {
  MODELO_PAGAMENTO_LABEL,
  TESE_CURTA,
  TIPO_MOVIMENTO_LABEL,
  type Advogado,
  type ModeloPagamento,
  type MovimentoCredito,
  type PacoteCredito,
} from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const brlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CreditosView() {
  const { ehAdvogado, advogadoId } = useAuth();
  const { advogados } = useAdvogados();
  const { movimentos } = useCreditos();
  const { leads } = useLeads();

  const advogadoDoPerfil = useMemo(
    () => advogados.find((a) => a.id === advogadoId) ?? null,
    [advogados, advogadoId],
  );

  if (ehAdvogado) {
    return (
      <PainelDoAdvogado
        advogado={advogadoDoPerfil}
        movimentos={movimentos.filter((m) => m.advogadoId === advogadoId)}
      />
    );
  }

  return <PainelDaOperacao advogados={advogados} movimentos={movimentos} leads={leads} />;
}

// ---------------------------------------------------------------------------
// A visão do advogado: saldo, preço, pacotes e o próprio extrato
// ---------------------------------------------------------------------------

function PainelDoAdvogado({
  advogado,
  movimentos,
}: {
  advogado: Advogado | null;
  movimentos: MovimentoCredito[];
}) {
  const faixa = faixaDePrecoDasTeses();

  if (!advogado) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <div className="card py-16 text-center">
          <p className="text-[14px] font-medium text-roxo-900">Acesso ainda não vinculado</p>
        </div>
      </div>
    );
  }

  const avulso = advogado.modeloPagamento === 'avulso';

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Créditos</h1>
        <p className="subtitulo-pagina mt-1">
          {avulso
            ? 'Você está no modelo avulso: paga por lead, sem compromisso de volume.'
            : 'Cada lead consome créditos do seu saldo. O preço de cada tese e as recargas estão logo abaixo.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="label-eyebrow mb-1.5">Saldo</div>
          <div
            className={`text-3xl font-semibold tabular ${
              advogado.saldoCreditos === 0 ? ESTILO_TEXTO.erro : 'text-roxo-900'
            }`}
          >
            {advogado.saldoCreditos}
          </div>
          <p className="nota mt-1">créditos disponíveis</p>
        </div>

        <div className="card p-5">
          <div className="label-eyebrow mb-1.5">Modelo</div>
          <div className="text-[15px] font-semibold text-roxo-900">
            {advogado.modeloPagamento
              ? MODELO_PAGAMENTO_LABEL[advogado.modeloPagamento]
              : 'Ainda não definido'}
          </div>
          <p className="nota mt-1">
            {avulso ? 'Cobrança por lead acessado' : 'Pacote pré-pago com desconto por volume'}
          </p>
        </div>

        <div className="card p-5">
          <div className="label-eyebrow mb-1.5">Consumido</div>
          <div className="text-3xl font-semibold text-roxo-900 tabular">
            {Math.abs(movimentos.filter((m) => m.tipo === 'consumo').reduce((s, m) => s + m.creditos, 0))}
          </div>
          <p className="nota mt-1">créditos em leads adquiridos</p>
        </div>
      </div>

      {advogado.saldoCreditos === 0 && !avulso && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.erro}`}>
          <p className="flex items-start gap-2 text-[13px] text-stone-700">
            <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
            Seu saldo está zerado. Você continua recebendo aviso de lead novo, mas o botão de
            comprar não aparece até haver crédito — recarregue abaixo.
          </p>
        </div>
      )}

      {/* Os dois modelos ------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 items-start">
        <Modelo
          modelo="avulso"
          destacado={advogado.modeloPagamento === 'avulso'}
          valor={brl.format(faixa.avulsoMax)}
          unidade="por lead"
          resumo="Paga só o lead que pegar. Sem recarga, sem saldo parado."
          itens={[
            'Cobrança na compra de cada lead',
            'Sem compromisso de volume',
            'O mesmo produto: reunião agendada e contato liberado',
          ]}
        />

        <Modelo
          modelo="creditos"
          destacado={advogado.modeloPagamento === 'creditos'}
          valor={`${faixa.creditoMax} créditos`}
          unidade={`= ${brl.format(faixa.creditoMax * VALOR_DO_CREDITO)} por lead`}
          resumo={`Recarrega o saldo e compra sem passar por pagamento a cada lead. Economia de ${brl.format(
            faixa.avulsoMax - faixa.creditoMax * VALOR_DO_CREDITO,
          )} por lead.`}
          itens={[
            `1 crédito = ${brlCentavos.format(VALOR_DO_CREDITO)}`,
            `Recarga a partir de ${brl.format(RECARGA_MINIMA)}`,
            'Desconto por volume no preço do crédito',
          ]}
        />
      </section>

      {/* Recargas -------------------------------------------------------- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="card-title">Recargas de crédito</h2>
          <span className="text-[11px] text-stone-500 tabular">
            {brlCentavos.format(VALOR_DO_CREDITO)} por crédito na recarga mínima
          </span>
        </div>
        <p className="nota mb-4">
          O desconto por volume incide sobre o preço do crédito. O lead continua custando{' '}
          {faixa.creditoMax} créditos em qualquer pacote — o mesmo produto não tem dois preços no
          extrato (INV-15).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PACOTES.map((pacote) => (
            <Recarga key={pacote.id} pacote={pacote} mostrarBotao />
          ))}
        </div>

        {/* INV-14 — o gatilho do crédito é a confirmação de pagamento, que
            ainda não existe. O botão fica desabilitado de propósito, e a tela
            diz por quê em vez de falhar no clique. */}
        <div className={`rounded-lg border p-3 mt-4 ${ESTILO_BLOCO.info}`}>
          <p className="flex items-start gap-2 text-[13px] text-stone-700">
            <Landmark className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.info}`} />
            <span>
              O crédito entra no saldo quando o pagamento é confirmado pelo banco — comprovante
              enviado não credita (INV-14). O checkout ainda não está ligado: fale com seu contato
              na Focus para recarregar.
            </span>
          </p>
        </div>
      </section>

      {/* Preço por tese --------------------------------------------------- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="card-title">Preço por tese</h2>
          {faixa.precoUnico && (
            <span className="text-[11px] text-stone-500">mesmo preço nas três teses</span>
          )}
        </div>
        <p className="nota mb-4">
          {faixa.precoUnico
            ? 'Você escolhe o caso pelo caso, não pela etiqueta — tabela diferente por tese empurraria a carteira para a mais barata em vez da mais adequada (TES-R07).'
            : 'O preço acompanha o custo de aquisição da tese (TES-R07).'}
        </p>

        <TabelaDePrecoPorTese />

        <p className="nota mt-3">
          O preço fica congelado no lead no momento em que ele é publicado: mudança de tabela não
          reescreve o que você já viu no catálogo (CRE-R03).
        </p>
      </section>

      <section className="card p-5">
        <h2 className="card-title mb-4">Seu extrato</h2>
        <Extrato movimentos={movimentos} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A visão da operação: receita, preço, saldos e conferência
// ---------------------------------------------------------------------------

function PainelDaOperacao({
  advogados,
  movimentos,
  leads,
}: {
  advogados: Advogado[];
  movimentos: MovimentoCredito[];
  leads: ReturnType<typeof useLeads>['leads'];
}) {
  const inicioDoMes = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const faixa = faixaDePrecoDasTeses();
  const ativos = advogados.filter((a) => a.status === 'ativo');
  const receita = receitaDoPeriodo(movimentos, inicioDoMes);
  const creditosEmCirculacao = ativos.reduce((s, a) => s + a.saldoCreditos, 0);
  const semSaldo = ativos.filter((a) => a.saldoCreditos === 0);
  const vendidosNoMes = leads.filter(
    (l) => l.compradoEm && Date.parse(l.compradoEm) >= inicioDoMes.getTime(),
  ).length;

  /*
   * INV-15 — consumido tem que fechar com comprado. O saldo gravado na ficha é
   * conferido contra a soma do extrato; divergência é sinal de que alguém
   * escreveu saldo sem lançar movimento, e é exatamente o que torna a
   * conferência impossível depois.
   */
  const divergentes = ativos
    .map((a) => ({ advogado: a, divergencia: divergenciaDeSaldo(a, movimentos) }))
    .filter((d) => d.divergencia !== 0);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Créditos</h1>
        <p className="subtitulo-pagina mt-1">
          Saldo por advogado, extrato e conferência. A receita entra na compra do pacote — o consumo
          é entrega, não receita nova.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip valor={brl.format(receita)} rotulo="receita de pacotes no mês" tom="sucesso" />
        <Chip valor={vendidosNoMes} rotulo="leads vendidos no mês" tom="marca" />
        <Chip valor={creditosEmCirculacao} rotulo="créditos em circulação" />
        <Chip
          valor={semSaldo.length}
          rotulo="ativos sem saldo"
          tom={semSaldo.length > 0 ? 'atencao' : 'neutro'}
        />
        <Chip
          valor={divergentes.length}
          rotulo="saldos divergentes"
          tom={divergentes.length > 0 ? 'erro' : 'sucesso'}
          titulo="Saldo gravado conferido contra a soma do extrato (INV-15)."
        />
        <Chip valor={brl.format(faixa.avulsoMax)} rotulo="por lead avulso" />
        <Chip valor={`${faixa.creditoMax} créditos`} rotulo="por lead" tom="marca" />
        <Chip
          valor={brl.format(RECARGA_MINIMA)}
          rotulo={`recarga mínima · ${leadsDoPacote(PACOTES[0])} leads`}
        />
      </div>

      {/* INV-14 — o gatilho do crédito é a confirmação bancária. A tentação de
          creditar na baixa manual aparece sempre; o aviso fica fixo. */}
      <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.info}`}>
        <p className="flex items-start gap-2 text-[13px] text-stone-700">
          <Landmark className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.info}`} />
          Crédito só entra com confirmação bancária. Baixa manual não credita — se for preciso
          destravar alguém com urgência, o caminho é o ajuste manual, que aparece no extrato como
          tal e exige motivo (INV-14).
        </p>
      </div>

      {divergentes.length > 0 && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.erro}`}>
          <p className="flex items-start gap-2 text-[13px] text-stone-700">
            <TriangleAlert className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
            <span>
              {divergentes.length} advogado(s) com saldo gravado diferente da soma do extrato. Isso
              significa crédito escrito sem movimento correspondente — e é o que torna impossível
              saber, depois, qual dos dois números está certo (INV-15).
            </span>
          </p>
        </div>
      )}

      <AjusteManual advogados={ativos} />

      {/* Os dois modelos ------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 items-start">
        <Modelo
          modelo="avulso"
          destacado={false}
          valor={brl.format(faixa.avulsoMax)}
          unidade="por lead"
          resumo="Paga só o lead que pegar. Sem recarga, sem saldo parado."
          itens={[
            'Cobrança na compra de cada lead',
            'Sem compromisso de volume',
            'O mesmo produto: reunião agendada e contato liberado',
          ]}
        />

        <Modelo
          modelo="creditos"
          destacado={false}
          valor={`${faixa.creditoMax} créditos`}
          unidade={`= ${brl.format(faixa.creditoMax * VALOR_DO_CREDITO)} por lead`}
          resumo={`Recarrega o saldo e compra sem passar por pagamento a cada lead. Economia de ${brl.format(
            faixa.avulsoMax - faixa.creditoMax * VALOR_DO_CREDITO,
          )} por lead.`}
          itens={[
            `1 crédito = ${brlCentavos.format(VALOR_DO_CREDITO)}`,
            `Recarga a partir de ${brl.format(RECARGA_MINIMA)}`,
            'Desconto por volume no preço do crédito',
          ]}
        />
      </section>

      {/* Recargas -------------------------------------------------------- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="card-title">Recargas de crédito</h2>
          <span className="text-[11px] text-stone-500 tabular">
            {brlCentavos.format(VALOR_DO_CREDITO)} por crédito na recarga mínima
          </span>
        </div>
        <p className="nota mb-4">
          O desconto por volume incide sobre o preço do crédito. O lead continua custando{' '}
          {faixa.creditoMax} créditos em qualquer pacote — o mesmo produto não tem dois preços no
          extrato (INV-15).
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PACOTES.map((pacote) => (
            <Recarga key={pacote.id} pacote={pacote} mostrarBotao={false} />
          ))}
        </div>
      </section>

      {/* Preço por tese --------------------------------------------------- */}
      <section className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="card-title">Preço por tese</h2>
          {faixa.precoUnico && (
            <span className="text-[11px] text-stone-500">mesmo preço nas três teses</span>
          )}
        </div>
        <p className="nota mb-4">
          {faixa.precoUnico
            ? 'O advogado escolhe o caso pelo caso, não pela etiqueta — tabela diferente por tese empurraria a carteira para a mais barata em vez da mais adequada (TES-R07).'
            : 'O preço acompanha o custo de aquisição da tese (TES-R07).'}
        </p>

        <TabelaDePrecoPorTese />

        <p className="nota mt-3">
          Alterar preço é da tela de Teses, com a permissão "Definir preço da tese". O valor fica
          congelado no lead publicado (CRE-R03).
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] items-start">
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="card-title">Saldo por advogado</h2>
            <span className="text-[11px] text-stone-500 tabular">{ativos.length} ativos</span>
          </div>

          <ul className="divide-y divide-stone-100">
            {ativos.map((a) => {
              const divergencia = divergenciaDeSaldo(a, movimentos);
              return (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-roxo-900 truncate">{a.nome}</div>
                    <div className="nota">
                      {a.modeloPagamento
                        ? MODELO_PAGAMENTO_LABEL[a.modeloPagamento]
                        : 'sem modelo definido'}
                    </div>
                  </div>

                  {divergencia === 0 ? (
                    <Check className={`size-3.5 shrink-0 ${ESTILO_TEXTO.sucesso}`} />
                  ) : (
                    <span
                      title="Saldo gravado diverge da soma do extrato (INV-15)."
                      className={`text-[11px] tabular shrink-0 ${ESTILO_TEXTO.erro}`}
                    >
                      {divergencia > 0 ? '+' : ''}
                      {divergencia}
                    </span>
                  )}

                  <span
                    className={`text-[14px] font-semibold tabular shrink-0 w-12 text-right ${
                      a.saldoCreditos === 0 ? ESTILO_TEXTO.erro : 'text-roxo-900'
                    }`}
                  >
                    {a.saldoCreditos}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="card-title">Extrato geral</h2>
            <span className="text-[11px] text-stone-500 tabular">{movimentos.length} movimentos</span>
          </div>
          <Extrato movimentos={movimentos} mostrarAdvogado advogados={advogados} />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRE-R06 — ajuste manual
// ---------------------------------------------------------------------------

/**
 * A porta legítima para mexer no saldo à mão.
 *
 * Ela existe justamente para que a pressão de "destravar agora" não caia sobre
 * o gatilho da compra: o ajuste aparece no extrato como ajuste, exige motivo
 * escrito e não se confunde com pagamento confirmado (`INV-14`). O saldo
 * continua sendo a soma do extrato, porque o movimento é lançado junto com a
 * mudança de saldo, nunca no lugar dela (`INV-15`).
 */
function AjusteManual({ advogados }: { advogados: Advogado[] }) {
  const { perfil, temPermissao } = useAuth();
  const { recarregar: recarregarAdvogados } = useAdvogados();
  const { ajustar } = useCreditos();
  const idBase = useId();

  const [advogadoId, setAdvogadoId] = useState('');
  const [creditos, setCreditos] = useState('');
  const [motivo, setMotivo] = useState('');
  const [lancando, setLancando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  // A tela inteira some para quem não tem a permissão: um formulário visível e
  // recusado no envio só ensina a tentar de novo.
  if (!temPermissao('credito:conciliar_pagamento')) return null;

  const alvo = advogados.find((a) => a.id === advogadoId) ?? null;
  const quantidade = Number(creditos);
  const recusa = alvo ? motivoParaNaoAjustar(perfil, alvo, quantidade, motivo) : null;

  async function lancar() {
    if (!alvo || recusa || lancando) return;

    setLancando(true);
    // `CRE-R06` — a validação de verdade mora em `ajustar_creditos_advogado`;
    // `recusa` acima é só o freio da tela, mais barato de mostrar na hora.
    const r = await ajustar(alvo.id, quantidade, motivo);
    setLancando(false);

    if (!r.ok) {
      setAviso({ texto: r.motivo, tom: 'erro' });
      return;
    }

    // O saldo do advogado vem da view — recarregar é o que traz o número novo.
    await recarregarAdvogados();
    setAviso({
      texto: `${quantidade > 0 ? '+' : ''}${quantidade} créditos para ${alvo.nome}, com motivo registrado.`,
    });
    setAdvogadoId('');
    setCreditos('');
    setMotivo('');
  }

  return (
    <section className="card p-5">
      <h2 className="card-title">Ajuste manual</h2>
      <p className="nota mt-1 mb-4">
        Entra no extrato como ajuste, com o motivo. Não é confirmação de pagamento — compra de
        pacote só entra pelo gatilho do provedor (INV-14).
      </p>

      <div className="grid gap-3 sm:grid-cols-[1.2fr_auto_2fr_auto] sm:items-start">
        <Campo id={`${idBase}-adv`} rotulo="Advogado">
          <select
            id={`${idBase}-adv`}
            value={advogadoId}
            onChange={(e) => setAdvogadoId(e.target.value)}
            className="campo"
          >
            <option value="">Selecione…</option>
            {advogados.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} · {a.saldoCreditos}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id={`${idBase}-qtd`} rotulo="Créditos" dica="Negativo retira">
          <input
            id={`${idBase}-qtd`}
            inputMode="numeric"
            value={creditos}
            onChange={(e) => setCreditos(e.target.value.replace(/[^\d-]/g, ''))}
            className="campo tabular w-24"
            placeholder="5"
          />
        </Campo>

        <Campo id={`${idBase}-motivo`} rotulo="Motivo">
          <input
            id={`${idBase}-motivo`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="campo"
            placeholder="Correção de consumo lançado em duplicidade"
          />
        </Campo>

        <div className="sm:pt-[26px]">
          <button
            type="button"
            onClick={lancar}
            disabled={!alvo || recusa !== null || lancando}
            className="btn btn-primario w-full sm:w-auto"
          >
            {lancando ? 'Lançando…' : 'Lançar'}
          </button>
        </div>
      </div>

      {alvo && recusa && <p className="campo-mensagem-erro mt-2">{recusa}</p>}

      <Toast aviso={aviso} aoFechar={() => setAviso(null)} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Preço — os dois modelos, as recargas e a tabela por tese
// ---------------------------------------------------------------------------

function Modelo({
  modelo,
  destacado,
  valor,
  unidade,
  resumo,
  itens,
}: {
  modelo: ModeloPagamento;
  destacado: boolean;
  valor: string;
  unidade: string;
  resumo: string;
  itens: string[];
}) {
  return (
    <div className={`card p-5 ${destacado ? 'ring-1 ring-roxo-300' : ''}`}>
      <div className="flex items-center gap-2">
        <Coins className={`size-4 ${modelo === 'creditos' ? ESTILO_TEXTO.marca : 'text-stone-400'}`} />
        <h2 className="card-title">{MODELO_PAGAMENTO_LABEL[modelo]}</h2>
        {destacado && (
          <span className={`etiqueta ml-auto ${ESTILO_ETIQUETA.marca}`}>seu modelo</span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mt-3">
        <span className="text-2xl font-semibold tracking-tight text-roxo-900 tabular">{valor}</span>
        <span className="text-[12px] text-stone-500">{unidade}</span>
      </div>

      <p className="text-[13px] text-stone-600 leading-snug mt-2">{resumo}</p>

      <ul className="space-y-1.5 mt-4">
        {itens.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[12px] text-stone-600">
            <Check className={`size-3.5 shrink-0 mt-0.5 ${ESTILO_TEXTO.sucesso}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recarga({ pacote, mostrarBotao }: { pacote: PacoteCredito; mostrarBotao: boolean }) {
  const desconto = descontoDoPacote(pacote);
  const leads = leadsDoPacote(pacote);

  return (
    <div className={`card p-4 ${pacote.destaque ? 'ring-1 ring-roxo-300' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="card-title">{pacote.nome}</span>
        {desconto > 0 && <span className={`etiqueta ${ESTILO_ETIQUETA.sucesso}`}>−{desconto}%</span>}
      </div>

      <div className="text-2xl font-semibold text-roxo-900 tabular mt-2">
        {brl.format(pacote.valor)}
      </div>
      <div className="text-[13px] text-stone-700 tabular mt-1">
        {pacote.creditos.toLocaleString('pt-BR')}
        <span className="text-[12px] text-stone-500"> créditos</span>
      </div>

      <p className="nota mt-1">
        {leads} leads · {brlCentavos.format(precoPorCredito(pacote))} por crédito
      </p>

      {mostrarBotao && (
        <button
          type="button"
          disabled
          title="O checkout depende do provedor de pagamento (INV-14)."
          className="btn btn-primario w-full mt-3"
        >
          Recarregar
        </button>
      )}
    </div>
  );
}

function TabelaDePrecoPorTese() {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[30rem] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] text-stone-500">
            <th className="font-medium pb-2 pr-3">Tese</th>
            <th className="font-medium pb-2 pr-3">Área</th>
            <th className="font-medium pb-2 pr-3 w-28 text-right">Em créditos</th>
            <th className="font-medium pb-2 w-24 text-right">Avulso</th>
          </tr>
        </thead>
        <tbody>
          {TESES.map((tese) => (
            <tr key={tese.id} className="border-t border-stone-100">
              <td className="py-2.5 pr-3">
                <span className={`etiqueta ${ESTILO_TESE[tese.id]}`}>{TESE_CURTA[tese.id]}</span>
              </td>
              <td className="py-2.5 pr-3 text-stone-600">{tese.area}</td>
              <td className="py-2.5 pr-3 text-right tabular text-roxo-900 font-medium">
                {tese.custoCreditos}
              </td>
              <td className="py-2.5 text-right tabular text-stone-700">
                {brl.format(tese.precoAvulso)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Extrato({
  movimentos,
  mostrarAdvogado = false,
  advogados = [],
}: {
  movimentos: MovimentoCredito[];
  mostrarAdvogado?: boolean;
  advogados?: Advogado[];
}) {
  const nomePorId = useMemo(
    () => Object.fromEntries(advogados.map((a) => [a.id, a.nome])),
    [advogados],
  );

  const ordenados = useMemo(
    () => [...movimentos].sort((a, b) => Date.parse(b.em) - Date.parse(a.em)),
    [movimentos],
  );

  if (ordenados.length === 0) {
    return <p className="nota py-6 text-center">Nenhum movimento ainda.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[32rem] text-[13px]">
        <thead>
          <tr className="text-left text-[11px] text-stone-500">
            <th className="font-medium pb-2 pr-3 w-32">Tipo</th>
            {mostrarAdvogado && <th className="font-medium pb-2 pr-3">Advogado</th>}
            <th className="font-medium pb-2 pr-3">Descrição</th>
            <th className="font-medium pb-2 pr-3 w-20 text-right">Créditos</th>
            <th className="font-medium pb-2 w-32">Quando</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((m) => (
            <tr key={m.id} className="border-t border-stone-100">
              <td className="py-2.5 pr-3">
                <span className={`etiqueta ${ESTILO_ETIQUETA[TOM_MOVIMENTO[m.tipo]]}`}>
                  {TIPO_MOVIMENTO_LABEL[m.tipo]}
                </span>
              </td>
              {mostrarAdvogado && (
                <td className="py-2.5 pr-3 text-stone-700 truncate max-w-40">
                  {nomePorId[m.advogadoId] ?? m.advogadoId}
                </td>
              )}
              <td className="py-2.5 pr-3 text-stone-600">
                {m.descricao}
                {m.valor > 0 && (
                  <span className="nota block">{brl.format(m.valor)}</span>
                )}
              </td>
              <td
                className={`py-2.5 pr-3 text-right tabular font-medium ${
                  m.creditos > 0
                    ? ESTILO_TEXTO.sucesso
                    : m.creditos < 0
                      ? 'text-roxo-900'
                      : 'text-stone-400'
                }`}
              >
                {m.creditos > 0 ? '+' : ''}
                {m.creditos !== 0 ? m.creditos : '—'}
              </td>
              <td className="py-2.5 nota tabular">{formatarDataHora(m.em)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chip({
  valor,
  rotulo,
  tom = 'neutro',
  titulo,
}: {
  valor: number | string;
  rotulo: string;
  tom?: Tom;
  titulo?: string;
}) {
  return (
    <div title={titulo} className={`chip py-1.5 ${ESTILO_CHIP[tom]}`}>
      <span className="text-[15px] font-semibold tabular leading-none">{valor}</span>
      <span className="text-[12px]">{rotulo}</span>
    </div>
  );
}
