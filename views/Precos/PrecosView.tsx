import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Coins, Landmark, Receipt } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import {
  PACOTES,
  RECARGA_MINIMA,
  VALOR_DO_CREDITO,
  descontoDoPacote,
  leadsDoPacote,
  precoPorCredito,
} from '@/src/lib/creditos';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_ETIQUETA, ESTILO_TEXTO } from '@/src/lib/estilo';
import { ESTILO_TESE } from '@/src/lib/leads';
import { TESES } from '@/src/lib/teses';
import {
  MODELO_PAGAMENTO_LABEL,
  TESE_CURTA,
  type ModeloPagamento,
  type PacoteCredito,
} from '@/types';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const brlCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * A tabela de preços.
 *
 * Existe separada de Créditos porque responde outra pergunta: Créditos mostra
 * **quanto o advogado tem**, e esta mostra **quanto as coisas custam**. Enquanto
 * as duas viviam na mesma tela, quem está no modelo avulso — que não tem saldo
 * nenhum — não tinha onde conferir o preço do lead que ia comprar.
 */
export function PrecosView() {
  const { ehAdvogado, advogadoId } = useAuth();
  const { advogados } = useAdvogados();

  const meuModelo = useMemo<ModeloPagamento | null>(() => {
    if (!ehAdvogado) return null;
    return advogados.find((a) => a.id === advogadoId)?.modeloPagamento ?? null;
  }, [advogados, advogadoId, ehAdvogado]);

  /*
   * As três teses custam o mesmo hoje (`TES-R07`), mas a tabela lê os dois
   * extremos em vez de assumir isso: preço por tese continua sendo estrutura, e
   * uma tela que cravou "R$ 40" no texto passa a mentir no dia em que um preço
   * divergir — sem erro nenhum que denuncie.
   */
  const faixa = useMemo(() => {
    const creditos = TESES.map((t) => t.custoCreditos);
    const avulsos = TESES.map((t) => t.precoAvulso);
    return {
      creditoMin: Math.min(...creditos),
      creditoMax: Math.max(...creditos),
      avulsoMin: Math.min(...avulsos),
      avulsoMax: Math.max(...avulsos),
      precoUnico: new Set(avulsos).size === 1 && new Set(creditos).size === 1,
    };
  }, []);

  const economiaPorLead = faixa.avulsoMax - faixa.creditoMax * VALOR_DO_CREDITO;

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Preços</h1>
        <p className="subtitulo-pagina mt-1">
          O que custa um lead qualificado com reunião agendada, nos dois modelos de pagamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className={`chip py-1.5 ${ESTILO_CHIP.neutro}`}>
          <span className="text-[15px] font-semibold tabular leading-none">
            {brl.format(faixa.avulsoMax)}
          </span>
          <span className="text-[12px]">por lead avulso</span>
        </div>
        <div className={`chip py-1.5 ${ESTILO_CHIP.marca}`}>
          <span className="text-[15px] font-semibold tabular leading-none">{faixa.creditoMax}</span>
          <span className="text-[12px]">créditos por lead</span>
        </div>
        <div className={`chip py-1.5 ${ESTILO_CHIP.sucesso}`}>
          <span className="text-[15px] font-semibold tabular leading-none">
            {brl.format(RECARGA_MINIMA)}
          </span>
          <span className="text-[12px]">recarga mínima · {leadsDoPacote(PACOTES[0])} leads</span>
        </div>
      </div>

      {/* Os dois modelos ------------------------------------------------- */}
      <section className="grid gap-4 sm:grid-cols-2 items-start">
        <Modelo
          modelo="avulso"
          destacado={meuModelo === 'avulso'}
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
          destacado={meuModelo === 'creditos'}
          valor={`${faixa.creditoMax} créditos`}
          unidade={`= ${brl.format(faixa.creditoMax * VALOR_DO_CREDITO)} por lead`}
          resumo={`Recarrega o saldo e compra sem passar por pagamento a cada lead. Economia de ${brl.format(
            economiaPorLead,
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
            <Recarga key={pacote.id} pacote={pacote} mostrarBotao={ehAdvogado} />
          ))}
        </div>

        {/* INV-14 — o gatilho do crédito é a confirmação do provedor de
            pagamento, que ainda não existe. O botão fica desabilitado de
            propósito, e a tela diz por quê em vez de falhar no clique. */}
        <div className={`rounded-lg border p-3 mt-4 ${ESTILO_BLOCO.info}`}>
          <p className="flex items-start gap-2 text-[13px] text-stone-700">
            <Landmark className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.info}`} />
            <span>
              O crédito entra no saldo quando o pagamento é confirmado pelo banco — comprovante
              enviado não credita (INV-14). O checkout ainda não está ligado:{' '}
              {ehAdvogado
                ? 'fale com seu contato na Focus para recarregar.'
                : 'quem precisar destravar um advogado usa o ajuste manual, que exige motivo (CRE-R06).'}
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
            ? 'O advogado escolhe o caso pelo caso, não pela etiqueta — tabela diferente por tese empurraria a carteira para a mais barata em vez da mais adequada (TES-R07).'
            : 'O preço acompanha o custo de aquisição da tese (TES-R07).'}
        </p>

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
                    <span className={`etiqueta ${ESTILO_TESE[tese.id]}`}>
                      {TESE_CURTA[tese.id]}
                    </span>
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

        <p className="nota mt-3">
          {ehAdvogado
            ? 'O preço fica congelado no lead no momento em que ele é publicado: mudança de tabela não reescreve o que você já viu no catálogo (CRE-R03).'
            : 'Alterar preço é da tela de Teses, com a permissão "Definir preço da tese". O valor fica congelado no lead publicado (CRE-R03).'}
        </p>
      </section>

      <Link to="/creditos" className="card card-interativo p-4 flex items-center gap-3 group">
        <Receipt className={`size-5 shrink-0 ${ESTILO_TEXTO.marca}`} />
        <div className="min-w-0">
          <div className="card-title">{ehAdvogado ? 'Seu saldo e extrato' : 'Créditos'}</div>
          <p className="nota mt-0.5">
            {ehAdvogado
              ? 'Quanto você tem, o que já consumiu e cada movimento do saldo'
              : 'Saldo por advogado, extrato geral e ajuste manual'}
          </p>
        </div>
        <ArrowRight className="ml-auto size-4 text-stone-300 group-hover:text-roxo-600 transition-colors" />
      </Link>
    </div>
  );
}

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
