import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useConformidade } from '@/src/contexts/ConformidadeContext';
import { podeAcessar } from '@/src/lib/navigation';
import {
  COLUNAS,
  DESFECHOS,
  ESTILO_TESE,
  estaNoCatalogo,
  venceEmBreve,
  visiveisPara,
} from '@/src/lib/leads';
import { TESES } from '@/src/lib/teses';
import { alertasOperacionais, CADEIA, TRABALHO_HOJE } from '@/src/lib/dashboard';
import {
  ESTILO_BLOCO,
  ESTILO_CHIP,
  ESTILO_PONTO,
  ESTILO_TEXTO,
  type Tom,
} from '@/src/lib/estilo';
import {
  LEAD_STATUS_LABEL,
  TESE_CURTA,
  type AlertaOperacional,
  type ChipTrabalhoHoje,
  type LeadStatus,
  type Profile,
  type SeveridadeAlerta,
} from '@/types';
import { PainelDoAdvogado } from './PainelDoAdvogado';

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

/** Janela dos indicadores do painel. Ver o porquê em `numeros`. */
const JANELA_DIAS = 30;

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function DashboardView() {
  const { perfil, ehAdvogado, advogadoId } = useAuth();
  const { leads } = useLeads();
  const { advogados } = useAdvogados();
  const { pareceres } = useConformidade();
  const primeiroNome = perfil.nome.split(' ')[0];

  const advogadoDoPerfil = useMemo(
    () => advogados.find((a) => a.id === advogadoId) ?? null,
    [advogados, advogadoId],
  );

  /*
   * Os números saem do mesmo store que as telas de leads e advogados, não de um
   * mock paralelo. Painel dizendo um número enquanto o catálogo mostra outro é
   * o tipo de divergência que faz gestão parar de confiar nos dois.
   */
  const numeros = useMemo(() => {
    const meus = visiveisPara(leads, perfil, advogadoDoPerfil);
    /*
     * Janela móvel de 30 dias, não mês corrente. Mês corrente zera todo dia 1º
     * e o painel abre dizendo que nada foi captado nem vendido — o que parece
     * defeito, não começo de ciclo.
     */
    const desde = Date.now() - JANELA_DIAS * 86_400_000;

    const naFila = meus.filter((l) => l.status === 'novo' || l.status === 'em_qualificacao').length;
    const catalogo = meus.filter(estaNoCatalogo).length;
    const vencendo = meus.filter(venceEmBreve).length;
    const semGravacao = meus.filter((l) => l.compradoPor && !l.temGravacao).length;
    const vendidosMes = meus.filter(
      (l) => l.compradoEm && Date.parse(l.compradoEm) >= desde,
    ).length;
    const captadosMes = meus.filter((l) => Date.parse(l.criadoEm) >= desde).length;

    const funil = [...COLUNAS, 'desqualificado' as LeadStatus].map((status) => ({
      status,
      total: meus.filter((l) => l.status === status).length,
    }));
    const ativos = meus.filter((l) => !DESFECHOS.includes(l.status)).length;

    return { naFila, catalogo, vencendo, semGravacao, vendidosMes, captadosMes, funil, ativos };
  }, [leads, perfil, advogadoDoPerfil]);

  const estoquePorTese = useMemo(
    () =>
      TESES.map((tese) => {
        const daTese = leads.filter((l) => l.tese === tese.id);
        const vendidos = daTese.filter((l) => l.compradoPor).length;
        return {
          tese: tese.id,
          catalogo: daTese.filter(estaNoCatalogo).length,
          vendidos,
          receita: vendidos * tese.precoAvulso,
          preco: tese.precoAvulso,
        };
      }),
    [leads],
  );

  // O painel do advogado é outra tela: ele não opera a máquina, consome o
  // produto dela. Misturar as duas obrigaria a esconder metade dos blocos.
  if (ehAdvogado) {
    return (
      <PainelDoAdvogado
        advogado={advogadoDoPerfil}
        leads={visiveisPara(leads, perfil, advogadoDoPerfil)}
        saudacao={`${saudacao()}, ${primeiroNome}`}
        hoje={HOJE}
      />
    );
  }

  /*
   * ACC-R01 — permissivo por padrão é o comportamento natural, e é justamente
   * o que precisa ser contido aqui. Cada bloco abaixo fala de um módulo; quem
   * não acessa o módulo não vê o número. Some do menu E some do painel.
   */
  const veLeads = podeAcessar('leads', perfil);
  const veAdvogados = podeAcessar('advogados', perfil);
  const veCreditos = podeAcessar('creditos', perfil);

  const valores: Record<string, { valor: string; detalhe: string }> = {
    captar: {
      valor: String(numeros.captadosMes),
      detalhe: `${numeros.naFila} ainda na fila da qualificação`,
    },
    qualificar: {
      valor: String(numeros.naFila),
      detalhe: 'Filtros de elegibilidade por tese',
    },
    agendar: {
      valor: String(numeros.catalogo),
      detalhe:
        numeros.vencendo > 0
          ? `${numeros.vencendo} com reunião em menos de 48h e sem comprador`
          : 'Nenhum vencendo nas próximas 48h',
    },
    entregar: {
      valor: String(numeros.vendidosMes),
      detalhe: `${numeros.semGravacao} vendidos sem gravação da qualificação`,
    },
  };

  const cadeiaVisivel = CADEIA.filter((e) => podeAcessar(e.modulo, perfil)).map((e) => ({
    ...e,
    ...(valores[e.id] ?? {}),
  }));

  const alertas = alertasOperacionais({
    advogados,
    pareceres,
    leadsVencendo: numeros.vencendo,
    leadsSemGravacao: numeros.semGravacao,
  });
  const alertasVisiveis = alertas.filter((a) => podeAcessar(a.modulo, perfil));

  const chips: ChipTrabalhoHoje[] = TRABALHO_HOJE.map((chip) => ({
    ...chip,
    valor:
      chip.id === 'fila-ia'
        ? numeros.naFila
        : chip.id === 'catalogo'
          ? numeros.catalogo
          : chip.id === 'reuniao-amanha'
            ? numeros.vencendo
            : chip.id === 'sem-gravacao'
              ? numeros.semGravacao
              : numeros.vendidosMes,
  }));

  return (
    // pb generoso: o botão flutuante do assistente fica por cima do conteúdo
    // no canto inferior direito e engolia a última linha da tabela.
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <Cabecalho saudacao={`${saudacao()}, ${primeiroNome}`} perfil={perfil} />

      {veLeads && <TrabalhoHoje chips={chips} />}
      {cadeiaVisivel.length > 0 && <Cadeia etapas={cadeiaVisivel} />}

      {(veLeads || alertasVisiveis.length > 0) && (
        <div
          className={`grid gap-6 items-start ${
            veLeads && alertasVisiveis.length > 0 ? 'lg:grid-cols-[1.35fr_1fr]' : 'grid-cols-1'
          }`}
        >
          {veLeads && <Funil linhas={numeros.funil} total={numeros.ativos} />}
          {alertasVisiveis.length > 0 && <Alertas alertas={alertasVisiveis} />}
        </div>
      )}

      {veLeads && <EstoquePorTese linhas={estoquePorTese} />}
      {veAdvogados && veCreditos && <Carteira advogados={advogados} />}
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
      {podeAcessar('conformidade', perfil) && (
        <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
          <span className={`ponto-estado ${ESTILO_PONTO.atencao}`} />
          Validação do <strong className="font-semibold text-roxo-800">Provimento 205</strong>{' '}
          pendente
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

function TrabalhoHoje({ chips }: { chips: ChipTrabalhoHoje[] }) {
  return (
    <section>
      <h2 className="label-eyebrow mb-2">Meu trabalho hoje</h2>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
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
        <span className="nota">captar → qualificar → agendar → entregar</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {etapas.map((etapa) => (
          <Link key={etapa.id} to={etapa.rota} className="card card-interativo p-4 group">
            <div className="flex items-center gap-2 mb-3">
              {/* Numeração é a posição na cadeia completa, não no que sobrou do
                  filtro — quem vê só qualificação precisa saber que ela é o
                  passo 2, não o passo 1. */}
              <span className="size-5 rounded-full grid place-items-center bg-grafite-800 text-white text-[10px] font-semibold tabular">
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
  linhas: Array<{ status: LeadStatus; total: number }>;
  total: number;
}) {
  const maior = Math.max(...linhas.map((f) => f.total), 1);

  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="card-title">Funil do lead</h2>
        <span className="text-[11px] text-stone-500 tabular">
          {total.toLocaleString('pt-BR')} ativos
        </span>
      </div>

      <ul className="space-y-2.5">
        {linhas.map((linha) => {
          const pct = (linha.total / maior) * 100;
          const desqualificado = linha.status === 'desqualificado';
          const vendido = linha.status === 'vendido' || linha.status === 'atendido';

          return (
            <li key={linha.status} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3">
              <span className="text-[12px] text-stone-600 truncate">
                {LEAD_STATUS_LABEL[linha.status]}
              </span>
              <div className="h-5 rounded-lg bg-stone-100 overflow-hidden">
                {/* Só a largura anima: `transition-all` aqui pegaria layout
                    também, e esta é uma lista que remonta a cada filtro. */}
                <div
                  className={`h-full rounded-lg transition-[width] duration-300 ${
                    desqualificado
                      ? ESTILO_PONTO.erro
                      : vendido
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
        É o agendamento que transforma o lead em produto: antes dele há um contato, depois dele há
        uma reunião que alguém compra.
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

function Alertas({ alertas }: { alertas: AlertaOperacional[] }) {
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

function EstoquePorTese({
  linhas,
}: {
  linhas: Array<{
    tese: (typeof TESES)[number]['id'];
    catalogo: number;
    vendidos: number;
    receita: number;
    preco: number;
  }>;
}) {
  const totalCatalogo = linhas.reduce((s, l) => s + l.catalogo, 0);
  const totalReceita = linhas.reduce((s, l) => s + l.receita, 0);
  const maiorReceita = Math.max(...linhas.map((l) => l.receita), 1);

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="card-title">Estoque por tese</h2>
        <span className="text-[11px] text-stone-500 tabular">
          {totalCatalogo} no catálogo · {brl.format(totalReceita)} entregues
        </span>
      </div>
      <p className="nota mb-4">
        O produto é perecível: passada a hora marcada, o lead não vale mais nada.
      </p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[36rem] text-[13px] border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[11px] text-stone-500">
              <th className="font-medium pb-2 pr-4">Tese</th>
              <th className="font-medium pb-2 pr-6 w-24 text-right">No catálogo</th>
              <th className="font-medium pb-2 pr-6 w-20 text-right">Vendidos</th>
              <th className="font-medium pb-2 pr-6 w-56">Entregue</th>
              <th className="font-medium pb-2 w-24 text-right">Preço</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.tese} className="border-t border-stone-100">
                <td className="py-2.5 pr-4 border-t border-stone-100">
                  <span className={`etiqueta ${ESTILO_TESE[linha.tese]}`}>
                    {TESE_CURTA[linha.tese]}
                  </span>
                </td>
                <td className="py-2.5 pr-6 border-t border-stone-100 text-right tabular text-stone-600">
                  {linha.catalogo}
                </td>
                <td className="py-2.5 pr-6 border-t border-stone-100 text-right tabular text-stone-600">
                  {linha.vendidos}
                </td>
                <td className="py-2.5 pr-6 border-t border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ESTILO_PONTO.marca}`}
                        style={{ width: `${(linha.receita / maiorReceita) * 100}%` }}
                      />
                    </div>
                    <span className="tabular text-stone-600 text-[12px] w-20 text-right shrink-0">
                      {brl.format(linha.receita)}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 border-t border-stone-100 text-right tabular text-stone-600">
                  {brl.format(linha.preco)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Carteira({ advogados }: { advogados: ReturnType<typeof useAdvogados>['advogados'] }) {
  const ativos = advogados.filter((a) => a.status === 'ativo');
  const semSaldo = ativos.filter((a) => a.saldoCreditos === 0);
  const semTese = advogados.filter((a) => a.status === 'ativo' && a.teses.length === 0);
  const porConferir = advogados.filter(
    (a) => !a.oabConferidaEm && a.status !== 'perdido' && a.status !== 'recusado',
  );

  return (
    <section className="card p-5">
      <h2 className="card-title mb-1">A carteira de advogados</h2>
      <p className="nota mb-4">
        Quem compra o produto. Advogado sem tese ou sem saldo paga pelo acesso e não recebe nada.
      </p>

      <div className="grid gap-3 sm:grid-cols-4">
        <Numero valor={ativos.length} rotulo="ativos" tom="sucesso" />
        <Numero
          valor={porConferir.length}
          rotulo="inscrição por conferir"
          tom={porConferir.length > 0 ? 'atencao' : 'neutro'}
        />
        <Numero
          valor={semTese.length}
          rotulo="ativos sem tese"
          tom={semTese.length > 0 ? 'erro' : 'neutro'}
        />
        <Numero
          valor={semSaldo.length}
          rotulo="ativos sem saldo"
          tom={semSaldo.length > 0 ? 'atencao' : 'neutro'}
        />
      </div>
    </section>
  );
}

function Numero({ valor, rotulo, tom }: { valor: number; rotulo: string; tom: Tom }) {
  return (
    <div className={`rounded-lg border p-3 ${ESTILO_BLOCO[tom]}`}>
      <div className={`text-2xl font-semibold tabular ${ESTILO_TEXTO[tom]}`}>{valor}</div>
      <div className="text-[12px] text-stone-600 mt-0.5">{rotulo}</div>
    </div>
  );
}
