import { useMemo, useState } from 'react';
import { Mic, MicOff, PhoneOff, Sparkles } from 'lucide-react';
import { useLeads } from '@/src/contexts/LeadsContext';
import { useDadosDaSessao } from '@/src/contexts/dadosDaSessao';
import { listarLigacoes } from '@/src/servicos/qualificacao';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_ETIQUETA, ESTILO_PONTO, ESTILO_TEXTO } from '@/src/lib/estilo';
import {
  MAX_TENTATIVAS,
  NOME_DA_IA,
  TOM_RESULTADO,
  chaveDoMes,
  formatarDuracao,
  mesesComLigacoes,
  rotuloDoMes,
  taxaDeQualificacao,
  taxaPorTese,
  vendidosSemGravacao,
} from '@/src/lib/qualificacao';
import { ESTILO_TESE } from '@/src/lib/leads';
import { TESES } from '@/src/lib/teses';
import { tempoRelativo } from '@/src/lib/format';
import { RESULTADO_LIGACAO_LABEL, TESE_CURTA } from '@/types';

const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

export function QualificacaoView() {
  const { leads } = useLeads();
  const { dados: ligacoes } = useDadosDaSessao(listarLigacoes, 'ligações');

  const naFila = useMemo(
    () => leads.filter((l) => l.status === 'novo' || l.status === 'em_qualificacao'),
    [leads],
  );

  const semGravacao = useMemo(() => vendidosSemGravacao(leads), [leads]);

  /**
   * Leva de captação vira mês: filtro para separar visualmente o que já foi
   * revisado do que é a leva corrente, sem tocar no histórico (`ligacoes` é
   * imutável — `INV-13`). "Todos os meses" por padrão, para não esconder dado
   * na primeira visita.
   */
  const meses = useMemo(() => mesesComLigacoes(ligacoes), [ligacoes]);
  const [filtroMes, setFiltroMes] = useState('');
  const ligacoesFiltradas = useMemo(
    () => (filtroMes ? ligacoes.filter((l) => chaveDoMes(l.em) === filtroMes) : ligacoes),
    [ligacoes, filtroMes],
  );

  const emAndamento = ligacoesFiltradas.filter((l) => l.resultado === 'em_andamento');
  const taxa = taxaDeQualificacao(ligacoesFiltradas);
  const semAtender = ligacoesFiltradas.filter(
    (l) => l.resultado === 'nao_atendeu' && l.tentativa >= MAX_TENTATIVAS,
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Qualificação</h1>
        <p className="subtitulo-pagina mt-1">
          {NOME_DA_IA} liga, conduz o roteiro da tese, apura os filtros de elegibilidade e agenda. É
          o passo que transforma formulário preenchido em produto.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip valor={naFila.length} rotulo="na fila" />
        <Chip valor={emAndamento.length} rotulo="em ligação agora" tom="marca" />
        <Chip valor={pct.format(taxa)} rotulo="taxa de qualificação" tom="sucesso" />
        <Chip
          valor={semGravacao.length}
          rotulo="vendidos sem gravação"
          tom={semGravacao.length > 0 ? 'erro' : 'neutro'}
          titulo="Sem gravação não há como demonstrar como o cliente foi direcionado (QUA-R03)."
        />
        <Chip valor={semAtender.length} rotulo={`${MAX_TENTATIVAS} tentativas sem atender`} tom="atencao" />
      </div>

      {/* QUA-R03 — a pendência é de prova, não de operação: aparece antes de
          qualquer outra coisa porque é ela que responde ao conselho. */}
      {semGravacao.length > 0 && (
        <section className={`rounded-lg border p-4 ${ESTILO_BLOCO.erro}`}>
          <div className="flex gap-2.5">
            <MicOff className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[13px] font-medium text-roxo-900">
                  {semGravacao.length} lead{semGravacao.length > 1 ? 's' : ''} vendido
                  {semGravacao.length > 1 ? 's' : ''} sem gravação da qualificação
                </h2>
                <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                  QUA-R03
                </code>
              </div>
              <p className="text-[12px] text-stone-600 mt-1 leading-snug">
                A gravação demonstra o que foi perguntado, o que foi oferecido e o que ficou
                combinado. É prova do momento da ligação e não se produz depois — quando alguém
                pergunta, ou existe ou não existe.
              </p>
              <ul className="mt-2 space-y-1">
                {semGravacao.map((lead) => (
                  <li key={lead.id} className="text-[12px] text-stone-700">
                    {lead.nome} · {TESE_CURTA[lead.tese]} · {lead.cidade}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        {/* Fila de ligações --------------------------------------------- */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="card-title">Ligações recentes</h2>
            <div className="flex items-center gap-2">
              {meses.length > 1 && (
                <select
                  value={filtroMes}
                  onChange={(e) => setFiltroMes(e.target.value)}
                  aria-label="Filtrar por mês"
                  className="campo w-auto py-1 text-[12px]"
                >
                  <option value="">Todos os meses</option>
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {rotuloDoMes(m)}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-[11px] text-stone-500 tabular shrink-0">{ligacoesFiltradas.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[36rem] text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-stone-500">
                  <th className="font-medium pb-2 pr-3">Lead</th>
                  <th className="font-medium pb-2 pr-3 w-24">Tese</th>
                  <th className="font-medium pb-2 pr-3 w-14 text-center">Tent.</th>
                  <th className="font-medium pb-2 pr-3 w-32">Resultado</th>
                  <th className="font-medium pb-2 pr-3 w-24">Duração</th>
                  <th className="font-medium pb-2 w-24">Quando</th>
                </tr>
              </thead>
              <tbody>
                {ligacoesFiltradas.map((ligacao) => (
                  <tr key={ligacao.id} className="border-t border-stone-100">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-roxo-900">{ligacao.leadNome}</span>
                        {ligacao.temGravacao ? (
                          <Mic className="size-3 text-stone-300 shrink-0" aria-label="Com gravação" />
                        ) : (
                          <MicOff
                            className="size-3 text-erro-500 shrink-0"
                            aria-label="Sem gravação"
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`etiqueta ${ESTILO_TESE[ligacao.tese]}`}>
                        {TESE_CURTA[ligacao.tese]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-center tabular text-stone-600">
                      {ligacao.tentativa}/{MAX_TENTATIVAS}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`etiqueta ${ESTILO_ETIQUETA[TOM_RESULTADO[ligacao.resultado]]}`}>
                        {RESULTADO_LIGACAO_LABEL[ligacao.resultado]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 tabular text-stone-600">
                      {formatarDuracao(ligacao.duracao)}
                    </td>
                    <td className="py-2.5 nota">{tempoRelativo(ligacao.em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          {/* Taxa por tese ---------------------------------------------- */}
          <section className="card p-5">
            <h2 className="card-title mb-1">Taxa por tese</h2>
            <p className="nota mb-4">
              Dos que atenderam, quantos viraram produto. Quem não atendeu fica fora do
              denominador — mede telefone e horário, não roteiro.
            </p>

            <ul className="space-y-3">
              {TESES.map((tese) => {
                const t = taxaPorTese(ligacoesFiltradas, tese.id);
                return (
                  <li key={tese.id}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[12px] text-stone-700">{TESE_CURTA[tese.id]}</span>
                      <span className="text-[12px] font-medium text-roxo-900 tabular">
                        {pct.format(t)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      {/* Só a largura anima: `transition-all` aqui pegaria
                          layout também (EST-R05). */}
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${ESTILO_PONTO.marca}`}
                        style={{ width: `${t * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Régua de tentativas ---------------------------------------- */}
          <section className="card p-5">
            <h2 className="card-title mb-1">A régua de tentativas</h2>
            <p className="nota mb-4">
              Três tentativas e para. A quarta ligação já é insistência — e insistência com público
              vulnerável é exatamente o que a Focus não pode fazer.
            </p>

            <ul className="space-y-2">
              {semAtender.map((ligacao) => (
                <li key={ligacao.id} className="flex items-center gap-2 text-[12px]">
                  <PhoneOff className="size-3.5 shrink-0 text-stone-400" />
                  <span className="text-stone-700 truncate">{ligacao.leadNome}</span>
                  <span className="nota ml-auto shrink-0">encerrado na {ligacao.tentativa}ª</span>
                </li>
              ))}
              {semAtender.length === 0 && <p className="nota">Ninguém na régua no momento.</p>}
            </ul>
          </section>

          {/* Como o evento é tratado ------------------------------------ */}
          <section className={`rounded-lg border p-4 ${ESTILO_BLOCO.info}`}>
            <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-roxo-900 mb-1.5">
              <Sparkles className="size-3.5" />
              Como o resultado da ligação chega
            </h2>
            <p className="text-[12px] text-stone-600 leading-snug">
              O evento da ferramenta de voz é <strong>gatilho, não fonte da verdade</strong>: ele
              avisa que a ligação terminou, e o sistema consulta o estado real antes de gravar
              qualquer coisa (QUA-R01). O mesmo evento chega repetido, então a deduplicação é por
              par identificador + tipo — sem isso, uma ligação vira duas tentativas e o lead é
              descartado por excesso (QUA-R02).
            </p>
          </section>
        </div>
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
  tom?: keyof typeof ESTILO_CHIP;
  titulo?: string;
}) {
  return (
    <div title={titulo} className={`chip py-1.5 ${ESTILO_CHIP[tom]}`}>
      <span className="text-[15px] font-semibold tabular leading-none">{valor}</span>
      <span className="text-[12px]">{rotulo}</span>
    </div>
  );
}
