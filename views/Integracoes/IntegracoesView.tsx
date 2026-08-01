import { AlertTriangle, PlugZap, RefreshCw, ShieldOff } from 'lucide-react';
import { ESTILO_BLOCO, ESTILO_ETIQUETA, ESTILO_PONTO, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import { INTEGRACOES_SEED } from '@/src/lib/qualificacaoSeed';
import { ROTINAS } from '@/src/lib/mockData';
import { tempoRelativo } from '@/src/lib/format';
import { ESTADO_INTEGRACAO_LABEL, type EstadoIntegracao } from '@/types';

const TOM_ESTADO: Record<EstadoIntegracao, Tom> = {
  ok: 'sucesso',
  atencao: 'atencao',
  erro: 'erro',
  nao_configurada: 'neutro',
};

const TOM_ROTINA = {
  ok: 'sucesso',
  atencao: 'atencao',
  erro: 'erro',
} as const satisfies Record<string, Tom>;

export function IntegracoesView() {
  const naoConfiguradas = INTEGRACOES_SEED.filter((i) => i.estado === 'nao_configurada');
  const semReconciliacao = INTEGRACOES_SEED.filter((i) => !i.temReconciliacao);

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Integrações</h1>
        <p className="subtitulo-pagina mt-1">
          O que conversa com o mundo lá fora — e o que acontece quando uma dessas conversas falha.
        </p>
      </div>

      {/* API-R10 — configuração ausente não pode virar silêncio. O padrão fácil
          (chave vazia, pula a chamada) faz a funcionalidade sumir sem erro. */}
      {naoConfiguradas.length > 0 && (
        <div className={`rounded-lg border p-4 ${ESTILO_BLOCO.atencao}`}>
          <div className="flex gap-2.5">
            <ShieldOff className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.atencao}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[13px] font-medium text-roxo-900">
                  {naoConfiguradas.length} integração não configurada
                </h2>
                <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                  API-R10
                </code>
              </div>
              <p className="text-[12px] text-stone-600 mt-1 leading-snug">
                A etapa está sendo pulada. Ela aparece aqui de propósito: o padrão fácil — se a
                chave está vazia, pula a chamada — faz a funcionalidade sumir sem erro, sem aviso ao
                usuário e sem registro de que algo foi ignorado.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRACOES_SEED.map((integracao) => (
          <section key={integracao.id} className="card p-4">
            <div className="flex items-start gap-2">
              <span className={`ponto-estado mt-1.5 ${ESTILO_PONTO[TOM_ESTADO[integracao.estado]]}`} />
              <div className="min-w-0 flex-1">
                <h2 className="card-title">{integracao.nome}</h2>
                <p className="nota mt-0.5 leading-snug">{integracao.papel}</p>
              </div>
              <span className={`etiqueta shrink-0 ${ESTILO_ETIQUETA[TOM_ESTADO[integracao.estado]]}`}>
                {ESTADO_INTEGRACAO_LABEL[integracao.estado]}
              </span>
            </div>

            <p className="text-[12px] text-stone-600 leading-snug mt-3">{integracao.detalhe}</p>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100">
              {integracao.temReconciliacao ? (
                <span className={`flex items-center gap-1 text-[11px] ${ESTILO_TEXTO.sucesso}`}>
                  <RefreshCw className="size-3" />
                  com reconciliação
                </span>
              ) : (
                <span
                  title="Provedor que não reenvia em caso de falha precisa de rotina que confira o que ficou para trás (API-R12)."
                  className={`flex items-center gap-1 text-[11px] ${ESTILO_TEXTO.erro}`}
                >
                  <AlertTriangle className="size-3" />
                  sem reconciliação
                </span>
              )}
              <span className="nota ml-auto">
                {integracao.ultimoEvento ? tempoRelativo(integracao.ultimoEvento) : 'nunca'}
              </span>
            </div>
          </section>
        ))}
      </div>

      {/* API-R12 — todo fluxo de terceiro nasce com a reconciliação junto. Sem
          isso, evento perdido é dado perdido, e a perda é silenciosa. */}
      {semReconciliacao.length > 0 && (
        <div className={`rounded-lg border p-4 ${ESTILO_BLOCO.erro}`}>
          <div className="flex gap-2.5">
            <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[13px] font-medium text-roxo-900">
                  {semReconciliacao.length} integração de entrega única sem rotina de reconciliação
                </h2>
                <code className="etiqueta bg-white/70 border border-black/5 text-roxo-700">
                  API-R12
                </code>
              </div>
              <p className="text-[12px] text-stone-600 mt-1 leading-snug">
                Provedor que não reenvia em caso de falha exige rotina periódica conferindo o que
                ficou para trás. Sem ela, evento perdido é dado perdido — e ninguém fica sabendo até
                alguém reclamar de uma reunião que nunca apareceu no painel.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="card-title">A agenda invisível</h2>
            <span className="text-[11px] text-stone-500">{ROTINAS.length} rotinas</span>
          </div>
          <p className="nota mb-4">Rodam sozinhas, sem ninguém acionar.</p>

          <ul className="divide-y divide-stone-100">
            {ROTINAS.map((rotina) => (
              <li key={rotina.nome} className="flex items-center gap-3 py-2.5">
                <span className={`ponto-estado ${ESTILO_PONTO[TOM_ROTINA[rotina.estado]]}`} />
                <span className="text-[13px] text-roxo-900 truncate">{rotina.nome}</span>
                <span className="nota ml-auto tabular shrink-0">{rotina.horario}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-1.5 card-title mb-1">
            <PlugZap className="size-3.5" />
            Antes de abrir uma integração nova
          </h2>
          <p className="nota mb-4">
            A lista existe porque o custo de cada item já foi pago em produção em algum lugar.
          </p>

          <ul className="space-y-2.5">
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
    </div>
  );
}

function Item({ regra, children }: { regra: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[12px] text-stone-600 leading-snug">
      <code className="etiqueta bg-stone-100 text-roxo-700 shrink-0 mt-0.5">{regra}</code>
      <span>{children}</span>
    </li>
  );
}
