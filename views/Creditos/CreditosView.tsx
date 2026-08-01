import { useMemo } from 'react';
import { AlertTriangle, Check, Landmark, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useCreditos } from '@/src/contexts/CreditosContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_ETIQUETA, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import {
  PACOTES,
  TOM_MOVIMENTO,
  descontoDoPacote,
  divergenciaDeSaldo,
  precoPorCredito,
  receitaDoPeriodo,
} from '@/src/lib/creditos';
import { formatarDataHora } from '@/src/lib/format';
import {
  MODELO_PAGAMENTO_LABEL,
  TIPO_MOVIMENTO_LABEL,
  type Advogado,
  type MovimentoCredito,
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
// A visão do advogado: saldo, pacotes e o próprio extrato
// ---------------------------------------------------------------------------

function PainelDoAdvogado({
  advogado,
  movimentos,
}: {
  advogado: Advogado | null;
  movimentos: MovimentoCredito[];
}) {
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
            : 'Cada lead consome créditos do seu saldo. O custo varia por tese.'}
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
            comprar não aparece até haver crédito.
          </p>
        </div>
      )}

      <section>
        <h2 className="label-eyebrow mb-3">Pacotes</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PACOTES.map((pacote) => {
            const desconto = descontoDoPacote(pacote);
            return (
              <div
                key={pacote.id}
                className={`card p-4 ${pacote.destaque ? 'ring-1 ring-roxo-300' : ''}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="card-title">{pacote.nome}</span>
                  {desconto > 0 && (
                    <span className={`etiqueta ${ESTILO_ETIQUETA.sucesso}`}>−{desconto}%</span>
                  )}
                </div>
                <div className="text-2xl font-semibold text-roxo-900 tabular mt-2">
                  {pacote.creditos}
                  <span className="text-[12px] font-normal text-stone-500"> créditos</span>
                </div>
                <div className="text-[13px] text-stone-700 tabular mt-1">
                  {brl.format(pacote.valor)}
                </div>
                <p className="nota mt-1">{brlCentavos.format(precoPorCredito(pacote))} por crédito</p>
                <button type="button" disabled className="btn btn-primario w-full mt-3">
                  Comprar pacote
                </button>
              </div>
            );
          })}
        </div>
        <p className="nota mt-2">
          O crédito entra no saldo só quando o pagamento é confirmado pelo banco. Comprovante
          enviado não credita (INV-14).
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
// A visão da operação: receita, saldos e conferência
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
          Pacotes, saldo por advogado e consumo. A receita entra na compra do pacote — o consumo é
          entrega, não receita nova.
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
