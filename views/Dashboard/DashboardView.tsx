import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNegociacoes } from '@/src/contexts/NegociacoesContext';
import { COLUNAS, DESFECHOS, visiveisPara } from '@/src/lib/negociacoes';
import { podeAcessar } from '@/src/lib/navigation';
import {
  ALERTAS,
  CADEIA,
  CARTEIRA_POR_NICHO,
  REGUA_COBRANCA,
  ROTINAS,
  TRABALHO_HOJE,
} from '@/src/lib/mockData';
import {
  ESTILO_BLOCO,
  ESTILO_CHIP,
  ESTILO_ETIQUETA,
  ESTILO_PONTO,
  ESTILO_TEXTO,
  type Tom,
} from '@/src/lib/estilo';
import {
  NEGOCIACAO_STATUS_LABEL,
  type ChipTrabalhoHoje,
  type NegociacaoStatus,
  type Profile,
  type SeveridadeAlerta,
} from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const HOJE = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
}).format(new Date());

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function DashboardView() {
  const { perfil } = useAuth();
  const { negociacoes } = useNegociacoes();
  const primeiroNome = perfil.nome.split(' ')[0];

  /*
   * O funil sai do mesmo store que o CRM, não de um mock paralelo. Painel
   * dizendo 284 enquanto o quadro mostra 24 é o tipo de divergência que faz
   * gestão parar de confiar nos dois números.
   */
  const { funil, totalFunil, resumoCaptar } = useMemo(() => {
    const minhas = visiveisPara(negociacoes, perfil);
    const linhas = [...COLUNAS, 'reprovado' as NegociacaoStatus].map((status) => ({
      status,
      total: minhas.filter((n) => n.status === status).length,
    }));
    const ativas = minhas.filter((n) => !DESFECHOS.includes(n.status));
    const propostas = minhas.filter((n) => n.status === 'proposta_enviada').length;
    return {
      funil: linhas,
      totalFunil: ativas.length,
      resumoCaptar: {
        valor: String(ativas.length),
        detalhe: `${propostas} com proposta enviada aguardando assinatura`,
      },
    };
  }, [negociacoes, perfil]);

  /*
   * ACC-R01 — permissivo por padrão é o comportamento natural, e é justamente
   * o que precisa ser contido aqui. Cada bloco abaixo fala de um módulo; quem
   * não acessa o módulo não vê o número. Some do menu E some do painel.
   */
  const veCrm = podeAcessar('crm', perfil);
  const veFinanceiro = podeAcessar('financeiro', perfil);
  const veCampanhas = podeAcessar('campanhas', perfil);
  const cadeiaVisivel = CADEIA.filter((e) => podeAcessar(e.modulo, perfil)).map((e) =>
    e.id === 'captar' ? { ...e, ...resumoCaptar } : e,
  );
  const alertasVisiveis = ALERTAS.filter((a) => podeAcessar(a.modulo, perfil));

  return (
    // pb generoso: o botão flutuante do assistente fica por cima do conteúdo
    // no canto inferior direito e engolia a última linha da tabela de nichos.
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <Cabecalho saudacao={`${saudacao()}, ${primeiroNome}`} perfil={perfil} />
      {veCrm && <TrabalhoHoje />}
      {cadeiaVisivel.length > 0 && <Cadeia etapas={cadeiaVisivel} />}

      {(veCrm || alertasVisiveis.length > 0) && (
        <div
          className={`grid gap-6 items-start ${
            veCrm && alertasVisiveis.length > 0 ? 'lg:grid-cols-[1.35fr_1fr]' : 'grid-cols-1'
          }`}
        >
          {veCrm && <Funil linhas={funil} total={totalFunil} />}
          {alertasVisiveis.length > 0 && <Alertas alertas={alertasVisiveis} />}
        </div>
      )}

      {veFinanceiro && (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <ReguaCobranca />
          <Rotinas />
        </div>
      )}

      {veCampanhas && <CarteiraPorNicho />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Cabecalho({ saudacao, perfil }: { saudacao: string; perfil: Profile }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="titulo-pagina">{saudacao}</h1>
        <p className="subtitulo-pagina mt-1 first-letter:uppercase">{HOJE}</p>
      </div>
      {podeAcessar('financeiro', perfil) && (
        <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
          <span className={`ponto-estado ${ESTILO_PONTO.sucesso}`} />
          Ciclo <strong className="font-semibold text-roxo-800">AGO/2026</strong> em faturamento
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** O mock fala em "positivo/crítico"; o sistema de cor fala em tons. */
const TOM_TRABALHO: Record<ChipTrabalhoHoje['tom'], Tom> = {
  neutro: 'neutro',
  positivo: 'sucesso',
  atencao: 'atencao',
  critico: 'erro',
};

function TrabalhoHoje() {
  return (
    <section>
      <h2 className="label-eyebrow mb-2">Meu trabalho hoje</h2>
      <div className="flex flex-wrap gap-2">
        {TRABALHO_HOJE.map((chip) => (
          <div
            key={chip.id}
            title={chip.criterio}
            className={`chip ${ESTILO_CHIP[TOM_TRABALHO[chip.tom]]}`}
          >
            <span className="text-lg font-semibold tabular leading-none">
              {chip.valor}
              {chip.meta !== undefined && (
                <span className="text-[13px] font-normal opacity-60">/{chip.meta}</span>
              )}
            </span>
            <span className="text-[12px] font-medium">{chip.rotulo}</span>
          </div>
        ))}
      </div>
      <p className="nota mt-2">Contadores calculados ao vivo — não existem gravados no banco.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Cadeia({ etapas }: { etapas: typeof CADEIA }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="label-eyebrow">A cadeia do negócio</h2>
        <span className="nota">captar → aprovar → distribuir → cobrar</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {etapas.map((etapa) => (
          <Link
            key={etapa.id}
            to={etapa.rota}
            className="card card-interativo p-4 group"
          >
            <div className="flex items-center gap-2 mb-3">
              {/* Numeração é a posição na cadeia completa, não no que sobrou
                  do filtro — quem vê só conformidade precisa saber que ela é o
                  passo 2, não o passo 1. */}
              <span className="size-5 rounded-full grid place-items-center bg-roxo-800 text-white text-[10px] font-semibold tabular">
                {CADEIA.findIndex((e) => e.id === etapa.id) + 1}
              </span>
              <span className="card-title">{etapa.titulo}</span>
              <ArrowRight className="ml-auto size-3.5 text-stone-300 group-hover:text-roxo-600 transition-colors" />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight text-roxo-900 tabular">
                {etapa.valor}
              </span>
              <span className="text-[12px] text-stone-500">{etapa.unidade}</span>
              {etapa.variacao !== null && (
                <span
                  className={`ml-auto flex items-center gap-0.5 text-[11px] font-medium tabular ${
                    etapa.variacao >= 0 ? ESTILO_TEXTO.sucesso : ESTILO_TEXTO.erro
                  }`}
                >
                  {etapa.variacao >= 0 ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {Math.abs(etapa.variacao).toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </span>
              )}
            </div>

            <p className="text-[12px] text-stone-500 mt-2 leading-snug">{etapa.detalhe}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Funil({
  linhas,
  total,
}: {
  linhas: Array<{ status: NegociacaoStatus; total: number }>;
  total: number;
}) {
  const maior = Math.max(...linhas.map((f) => f.total), 1);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="card-title">Funil por status</h2>
        <span className="text-[11px] text-stone-500 tabular">
          {total.toLocaleString('pt-BR')} ativas
        </span>
      </div>

      <ul className="space-y-2.5">
        {linhas.map((linha) => {
          const pct = (linha.total / maior) * 100;
          const reprovado = linha.status === 'reprovado';
          const ativo = linha.status === 'conta_ativa';

          return (
            <li key={linha.status} className="grid grid-cols-[11rem_1fr_2.5rem] items-center gap-3">
              <span className="text-[12px] text-stone-600 truncate">
                {NEGOCIACAO_STATUS_LABEL[linha.status]}
              </span>
              <div className="h-5 rounded-lg bg-stone-100 overflow-hidden">
                {/* Só a largura anima: `transition-all` aqui pegaria layout
                    também, e esta é uma lista que remonta a cada filtro. */}
                <div
                  className={`h-full rounded-lg transition-[width] duration-300 ${
                    reprovado
                      ? ESTILO_PONTO.erro
                      : ativo
                        ? ESTILO_PONTO.sucesso
                        : ESTILO_PONTO.marca
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[12px] font-medium text-roxo-900 tabular text-right">
                {linha.total}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="nota mt-4">
        Status é a máquina de estados do negócio e não é configurável. A etapa do Kanban é outra
        dimensão, essa sim livre — as duas convivem.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------

const ALERTA: Record<SeveridadeAlerta, { icone: typeof CircleAlert; tom: Tom }> = {
  critico: { icone: CircleAlert, tom: 'erro' },
  alto: { icone: AlertTriangle, tom: 'atencao' },
  medio: { icone: Info, tom: 'info' },
  info: { icone: Info, tom: 'neutro' },
};

function Alertas({ alertas }: { alertas: typeof ALERTAS }) {
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="card-title">Precisa de decisão</h2>
        <span className="text-[11px] text-stone-500 tabular">
          {alertas.length} {alertas.length === 1 ? 'aberto' : 'abertos'}
        </span>
      </div>

      <ul className="space-y-2.5">
        {alertas.map((alerta) => {
          const { icone: Icone, tom } = ALERTA[alerta.severidade];

          return (
            <li key={alerta.id} className={`rounded-lg border p-3 ${ESTILO_BLOCO[tom]}`}>
              <div className="flex gap-2.5">
                <Icone className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO[tom]}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-roxo-900 leading-snug">
                      {alerta.titulo}
                    </span>
                    {alerta.regra && (
                      <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                        {alerta.regra}
                      </code>
                    )}
                  </div>
                  <p className="text-[12px] text-stone-600 mt-1 leading-snug">{alerta.descricao}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function ReguaCobranca() {
  const maior = Math.max(...REGUA_COBRANCA.map((r) => r.enviados));

  return (
    <section className="card p-5">
      <h2 className="card-title mb-1">Régua de cobrança</h2>
      <p className="nota mb-4">
        Disparos do ciclo. O alerta interno D+15 só ocorre se os três avisos ao cliente saíram.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {REGUA_COBRANCA.map((marco) => (
          <div key={marco.marco} className="text-center">
            <div className="h-24 flex items-end justify-center mb-2">
              <div
                className={`w-full rounded-t-lg transition-[height] duration-300 ${
                  marco.marco === 'D+15' ? ESTILO_PONTO.erro : 'bg-roxo-400'
                }`}
                style={{ height: `${Math.max((marco.enviados / maior) * 100, 6)}%` }}
              />
            </div>
            <div className="text-[13px] font-semibold text-roxo-900 tabular">{marco.enviados}</div>
            <div className="text-[11px] font-medium text-roxo-700">{marco.marco}</div>
            <div className="nota text-[10px] mt-0.5">{marco.canal}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

const ESTADO_ROTINA = {
  ok: { tom: 'sucesso', rotulo: 'Rodando' },
  atencao: { tom: 'atencao', rotulo: 'Atrasada' },
  erro: { tom: 'erro', rotulo: 'Falhou' },
} as const satisfies Record<string, { tom: Tom; rotulo: string }>;

function Rotinas() {
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="card-title">A agenda invisível</h2>
        <span className="text-[11px] text-stone-500">6 de 15 rotinas</span>
      </div>
      <p className="nota mb-4">Rodam sozinhas, sem ninguém acionar.</p>

      <ul className="divide-y divide-stone-100">
        {ROTINAS.map((rotina) => {
          const estado = ESTADO_ROTINA[rotina.estado];
          return (
            <li key={rotina.nome} className="flex items-center gap-3 py-2.5">
              <span className={`ponto-estado ${ESTILO_PONTO[estado.tom]}`} title={estado.rotulo} />
              <span className="text-[13px] text-roxo-900 truncate">{rotina.nome}</span>
              <span className="nota ml-auto tabular shrink-0">
                {rotina.horario}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

/**
 * O conselho não é rótulo decorativo: ele define qual régua de conformidade o
 * criativo enfrenta antes de subir. Um mesmo anúncio passa para contador e
 * reprova para advogado.
 */
function CarteiraPorNicho() {
  const totalContas = CARTEIRA_POR_NICHO.reduce((s, n) => s + n.contas, 0);
  const totalVerba = CARTEIRA_POR_NICHO.reduce((s, n) => s + n.verbaMes, 0);
  const maiorVerba = Math.max(...CARTEIRA_POR_NICHO.map((n) => n.verbaMes));

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="card-title">Carteira por nicho</h2>
        <span className="text-[11px] text-stone-500 tabular">
          {totalContas} contas · {brl.format(totalVerba)}/mês
        </span>
      </div>
      <p className="nota mb-4">O conselho regulador define a régua de conformidade do criativo.</p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[38rem] text-[13px] border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[11px] text-stone-500">
              <th className="font-medium pb-2 pr-4">Nicho</th>
              <th className="font-medium pb-2 pr-4 w-20">Conselho</th>
              <th className="font-medium pb-2 pr-6 w-16 text-right">Contas</th>
              <th className="font-medium pb-2 pr-6 w-64">Verba/mês</th>
              <th className="font-medium pb-2 w-24 text-right">CPL médio</th>
            </tr>
          </thead>
          <tbody>
            {CARTEIRA_POR_NICHO.map((n) => (
              <tr key={n.nicho} className="border-t border-stone-100">
                <td className="py-2.5 pr-4 border-t border-stone-100 text-roxo-900 whitespace-nowrap">
                  {n.nicho}
                </td>
                <td className="py-2.5 pr-4 border-t border-stone-100">
                  <span className={`etiqueta ${ESTILO_ETIQUETA.marca}`}>{n.conselho}</span>
                </td>
                <td className="py-2.5 pr-6 border-t border-stone-100 text-right tabular text-stone-600">
                  {n.contas}
                </td>
                <td className="py-2.5 pr-6 border-t border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ESTILO_PONTO.marca}`}
                        style={{ width: `${(n.verbaMes / maiorVerba) * 100}%` }}
                      />
                    </div>
                    <span className="tabular text-stone-600 text-[12px] w-[5.5rem] text-right shrink-0">
                      {brl.format(n.verbaMes)}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 border-t border-stone-100 text-right tabular text-stone-600">
                  {n.cpl.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
