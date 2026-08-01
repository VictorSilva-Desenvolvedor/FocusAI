import { useMemo } from 'react';
import { ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_ETIQUETA, ESTILO_PONTO, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import { CAMPANHAS_SEED } from '@/src/lib/qualificacaoSeed';
import { ESTILO_TESE } from '@/src/lib/leads';
import { TESES } from '@/src/lib/teses';
import {
  PLATAFORMA_LABEL,
  SITUACAO_CAMPANHA_LABEL,
  TESE_CURTA,
  type Campanha,
  type SituacaoCampanha,
} from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const brlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

const TOM_SITUACAO: Record<SituacaoCampanha, Tom> = {
  ativa: 'sucesso',
  aprendizado: 'info',
  pausada: 'neutro',
  encerrada: 'neutro',
};

/**
 * O custo por lead qualificado é o número que decide. Lead que a IA
 * desqualifica custou anúncio igual e não virou produto nenhum — otimizar pelo
 * custo bruto leva a campanha a comprar volume que morre na qualificação.
 */
function custoPorQualificado(c: Campanha): number {
  if (c.leadsQualificadosMes === 0) return 0;
  return c.gastoMes / c.leadsQualificadosMes;
}

function custoBruto(c: Campanha): number {
  if (c.leadsMes === 0) return 0;
  return c.gastoMes / c.leadsMes;
}

export function CampanhasView() {
  const totais = useMemo(() => {
    const gasto = CAMPANHAS_SEED.reduce((s, c) => s + c.gastoMes, 0);
    const leads = CAMPANHAS_SEED.reduce((s, c) => s + c.leadsMes, 0);
    const qualificados = CAMPANHAS_SEED.reduce((s, c) => s + c.leadsQualificadosMes, 0);
    const semParecer = CAMPANHAS_SEED.reduce((s, c) => s + c.criativosSemParecer, 0);
    const diaria = CAMPANHAS_SEED.filter((c) => c.situacao === 'ativa').reduce(
      (s, c) => s + c.verbaDiaria,
      0,
    );
    return { gasto, leads, qualificados, semParecer, diaria };
  }, []);

  const porTese = useMemo(
    () =>
      TESES.map((tese) => {
        const campanhas = CAMPANHAS_SEED.filter((c) => c.tese === tese.id);
        const gasto = campanhas.reduce((s, c) => s + c.gastoMes, 0);
        const qualificados = campanhas.reduce((s, c) => s + c.leadsQualificadosMes, 0);
        return {
          tese: tese.id,
          gasto,
          qualificados,
          custo: qualificados > 0 ? gasto / qualificados : 0,
          /* O preço de venda do lead é o teto do custo de aquisição. Passar
             dele significa pagar para entregar. */
          teto: tese.precoAvulso,
        };
      }),
    [],
  );

  const maiorCusto = Math.max(...porTese.map((t) => t.custo), 1);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Campanhas</h1>
        <p className="subtitulo-pagina mt-1">
          Anúncios por tese. O número que decide não é o custo por lead — é o custo por lead
          qualificado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip valor={brl.format(totais.gasto)} rotulo="gasto no mês" />
        <Chip valor={brl.format(totais.diaria)} rotulo="verba diária ativa" tom="marca" />
        <Chip valor={totais.leads} rotulo="leads captados" />
        <Chip valor={totais.qualificados} rotulo="qualificados" tom="sucesso" />
        <Chip
          valor={pct.format(totais.leads > 0 ? totais.qualificados / totais.leads : 0)}
          rotulo="aproveitamento"
          tom="info"
        />
        <Chip
          valor={totais.semParecer}
          rotulo="criativos sem parecer"
          tom={totais.semParecer > 0 ? 'erro' : 'neutro'}
          titulo="Nenhum criativo sobe sem parecer aprovado (INV-16)."
        />
      </div>

      {/* INV-16 — criativo no ar sem parecer é o problema mais caro desta tela:
          quem anuncia captando clientela para advogado responde pela peça. */}
      {totais.semParecer > 0 && (
        <div className={`rounded-lg border p-4 ${ESTILO_BLOCO.erro}`}>
          <div className="flex gap-2.5">
            <ShieldAlert className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[13px] font-medium text-roxo-900">
                  {totais.semParecer} criativo no ar sem parecer aprovado
                </h2>
                <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                  INV-16
                </code>
              </div>
              <p className="text-[12px] text-stone-600 mt-1 leading-snug">
                A Focus anuncia captando clientela para advogado, então o Provimento 205 incide
                sobre o anúncio dela. Peça no ar sem parecer é exposição direta — derrubar antes de
                ajustar.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        {/* Campanhas ----------------------------------------------------- */}
        <section className="card p-5">
          <h2 className="card-title mb-4">Campanhas no ar</h2>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[46rem] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-stone-500">
                  <th className="font-medium pb-2 pr-3">Campanha</th>
                  <th className="font-medium pb-2 pr-3 w-24">Situação</th>
                  <th className="font-medium pb-2 pr-3 w-24 text-right">Gasto</th>
                  <th className="font-medium pb-2 pr-3 w-20 text-right">Leads</th>
                  <th className="font-medium pb-2 pr-3 w-20 text-right">Qualif.</th>
                  <th className="font-medium pb-2 w-28 text-right">Custo/qualif.</th>
                </tr>
              </thead>
              <tbody>
                {CAMPANHAS_SEED.map((c) => {
                  const custo = custoPorQualificado(c);
                  const tese = TESES.find((t) => t.id === c.tese);
                  const acimaDoTeto = tese ? custo > tese.precoAvulso : false;

                  return (
                    <tr key={c.id} className="border-t border-stone-100">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-roxo-900">{c.nome}</span>
                          {c.criativosSemParecer > 0 && (
                            <ShieldAlert
                              className="size-3.5 text-erro-500 shrink-0"
                              aria-label="Criativo sem parecer"
                            />
                          )}
                        </div>
                        <div className="nota flex items-center gap-1.5 mt-0.5">
                          <span className={`etiqueta ${ESTILO_TESE[c.tese]}`}>
                            {TESE_CURTA[c.tese]}
                          </span>
                          {PLATAFORMA_LABEL[c.plataforma]} · {c.criativosNoAr} criativos
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`etiqueta ${ESTILO_ETIQUETA[TOM_SITUACAO[c.situacao]]}`}>
                          {SITUACAO_CAMPANHA_LABEL[c.situacao]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular text-stone-600">
                        {brl.format(c.gastoMes)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular text-stone-600">{c.leadsMes}</td>
                      <td className="py-2.5 pr-3 text-right tabular text-stone-700">
                        {c.leadsQualificadosMes}
                      </td>
                      <td
                        className={`py-2.5 text-right tabular font-medium ${
                          acimaDoTeto ? ESTILO_TEXTO.erro : 'text-roxo-900'
                        }`}
                        title={
                          acimaDoTeto
                            ? 'Acima do preço de venda do lead — a campanha paga para entregar.'
                            : undefined
                        }
                      >
                        {brlCentavos.format(custo)}
                        <div className="nota text-[10px] font-normal">
                          bruto {brlCentavos.format(custoBruto(c))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Custo por tese ------------------------------------------------ */}
        <section className="card p-5">
          <h2 className="card-title mb-1">Custo por lead qualificado</h2>
          <p className="nota mb-4">
            A linha clara é o preço de venda do lead na tese. Custo acima dela significa pagar para
            entregar.
          </p>

          <ul className="space-y-4">
            {porTese.map((linha) => {
              const acima = linha.custo > linha.teto;
              return (
                <li key={linha.tese}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[12px] text-stone-700">{TESE_CURTA[linha.tese]}</span>
                    <span
                      className={`text-[12px] font-medium tabular ${
                        acima ? ESTILO_TEXTO.erro : 'text-roxo-900'
                      }`}
                    >
                      {brlCentavos.format(linha.custo)}
                    </span>
                  </div>

                  <div className="relative h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ${
                        acima ? ESTILO_PONTO.erro : ESTILO_PONTO.marca
                      }`}
                      style={{ width: `${(linha.custo / maiorCusto) * 100}%` }}
                    />
                    <span
                      title={`Preço de venda: ${brl.format(linha.teto)}`}
                      className="absolute inset-y-0 w-px bg-roxo-900/40"
                      style={{ left: `${Math.min((linha.teto / maiorCusto) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="nota mt-1 tabular">
                    {linha.qualificados} qualificados · {brl.format(linha.gasto)} gastos ·{' '}
                    {acima ? 'acima' : 'abaixo'} do preço de venda
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-stone-100 text-[11px]">
            <span className={`flex items-center gap-1 ${ESTILO_TEXTO.sucesso}`}>
              <TrendingUp className="size-3.5" />
              margem saudável
            </span>
            <span className={`flex items-center gap-1 ${ESTILO_TEXTO.erro}`}>
              <TrendingDown className="size-3.5" />
              custo acima da venda
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

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
