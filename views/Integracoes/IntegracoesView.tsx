import { CheckCircle2, FileCode2, PlugZap, ShieldCheck, Unplug } from 'lucide-react';
import { ESTILO_BLOCO, ESTILO_ETIQUETA, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import { INTEGRACOES_ATIVAS, INTEGRACOES_PENDENTES } from '@/src/lib/integracoes';
import { FRENTE_INTEGRACAO_LABEL, type FrenteIntegracao } from '@/types';

/**
 * A plataforma sustenta os quatro elos, então fica em roxo de destaque; os
 * elos da cadeia usam tom neutro para não sugerir gravidade diferente entre si.
 */
const TOM_FRENTE: Record<FrenteIntegracao, Tom> = {
  plataforma: 'marca',
  captar: 'neutro',
  qualificar: 'neutro',
  agendar: 'neutro',
  entregar: 'neutro',
};

export function IntegracoesView() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Integrações</h1>
        <p className="subtitulo-pagina mt-1">
          O que já conversa com o mundo lá fora — e o que ainda não conversa.
        </p>
      </div>

      {/* API-R10 — configuração ausente não pode virar silêncio. Etapa que não
          acontece precisa aparecer em algum lugar, e este é o lugar. */}
      <div className={`rounded-lg border p-4 ${ESTILO_BLOCO.atencao}`}>
        <div className="flex gap-2.5">
          <Unplug className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.atencao}`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[13px] font-medium text-roxo-900">
                {INTEGRACOES_ATIVAS.length} integrações operando,{' '}
                {INTEGRACOES_PENDENTES.length} ainda por ligar
              </h2>
              <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                API-R10
              </code>
            </div>
            <p className="text-[12px] text-stone-600 mt-1 leading-snug">
              Só entra na lista de cima o que tem código neste repositório e um comando que
              verifique. Etapa pulada por falta de configuração some sem erro, sem aviso ao usuário
              e sem registro de que algo foi ignorado — a lista de baixo existe para que ela não
              suma.
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className={`size-4 ${ESTILO_TEXTO.sucesso}`} />
          <h2 className="card-title">Operando hoje</h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {INTEGRACOES_ATIVAS.map((integracao) => (
            <article key={integracao.id} className="card p-4 flex flex-col">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="card-title">{integracao.nome}</h3>
                  <p className="nota mt-1 leading-snug">{integracao.papel}</p>
                </div>
                <span className={`etiqueta shrink-0 ${ESTILO_ETIQUETA.sucesso}`}>Operando</span>
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 space-y-2 flex-1">
                <p className="flex gap-2 text-[12px] text-stone-600 leading-snug">
                  <FileCode2 className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
                  <code className="break-all">{integracao.onde}</code>
                </p>
                <p className="flex gap-2 text-[12px] text-stone-600 leading-snug">
                  <ShieldCheck className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
                  {integracao.verificacao}
                </p>
              </div>

              <Regras ids={integracao.regras} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-1">
          <Unplug className={`size-4 ${ESTILO_TEXTO.atencao}`} />
          <h2 className="card-title">Falta ligar</h2>
        </div>
        <p className="nota mb-3">
          Na ordem da cadeia: captar → qualificar → agendar → entregar. A plataforma vem antes
          porque as quatro dependem dela.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {INTEGRACOES_PENDENTES.map((integracao) => (
            <article key={integracao.id} className="card p-4 flex flex-col">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="card-title">{integracao.nome}</h3>
                  <p className="nota mt-1 leading-snug">{integracao.papel}</p>
                </div>
                <span
                  className={`etiqueta shrink-0 ${ESTILO_ETIQUETA[TOM_FRENTE[integracao.frente]]}`}
                >
                  {FRENTE_INTEGRACAO_LABEL[integracao.frente]}
                </span>
              </div>

              <p className="text-[12px] text-stone-600 leading-snug mt-3 pt-3 border-t border-stone-100 flex-1">
                {integracao.semEla}
              </p>

              <Regras ids={integracao.regras} />
            </article>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-1.5 card-title mb-1">
          <PlugZap className="size-3.5" />
          Antes de abrir uma integração nova
        </h2>
        <p className="nota mb-4">
          A lista existe porque o custo de cada item já foi pago em produção em algum lugar.
        </p>

        <ul className="space-y-2.5 sm:columns-2 sm:gap-6">
          <Item regra="API-R01">O dado sensível fica fora do navegador?</Item>
          <Item regra="API-R11">
            Erro tem mensagem para o usuário <strong>e</strong> detalhe no log? Fluxo que engole
            erro e responde sucesso faz o sistema nunca saber que precisa reenfileirar.
          </Item>
          <Item regra="API-R07">
            A lista passa de 1.000 linhas? O corte é silencioso: não vem erro, vem menos dado.
          </Item>
          <Item regra="API-R13">
            Webhook de entrada é idempotente? Eventos chegam repetidos — deduplique por par
            identificador + tipo.
          </Item>
          <Item regra="API-R14">
            Evento é gatilho, não fonte da verdade. Recebeu aviso? Consulte o estado real antes de
            agir.
          </Item>
          <Item regra="API-R12">
            Provedor de entrega única? A rotina de reconciliação nasce no mesmo commit, não depois.
          </Item>
          <Item regra="API-R15">
            Balde público serve URL permanente. Documento de cliente e comprovante não vão para
            balde público.
          </Item>
          <Item regra="API-R16">
            Fluxo que vive só dentro da ferramenta de automação é lógica de negócio fora do
            repositório. Ou versiona, ou registra que é dívida.
          </Item>
        </ul>
      </section>
    </div>
  );
}

/** O ID é o que quem for mexer na integração procura para achar a regra. */
function Regras({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-stone-100">
      {ids.map((id) => (
        <code key={id} className="etiqueta bg-stone-100 text-roxo-700">
          {id}
        </code>
      ))}
    </div>
  );
}

function Item({ regra, children }: { regra: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[12px] text-stone-600 leading-snug break-inside-avoid mb-2.5">
      <code className="etiqueta bg-stone-100 text-roxo-700 shrink-0 mt-0.5">{regra}</code>
      <span>{children}</span>
    </li>
  );
}
