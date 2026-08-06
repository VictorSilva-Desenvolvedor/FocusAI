import { ArrowRight, CheckCircle2, Unplug, Webhook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INTEGRACOES_ATIVAS, INTEGRACOES_PENDENTES } from '@/src/lib/integracoes';
import { ESTILO_TEXTO } from '@/src/lib/estilo';

/**
 * Não duplica o inventário — ele já vive em Integrações
 * (`src/lib/integracoes.ts`), com o cuidado de nunca inventar estado de saúde
 * (ver o comentário no topo daquele arquivo). Esta aba só resume os mesmos
 * números reais e leva para lá, em vez de manter uma segunda lista que
 * divergiria da primeira na primeira mudança que alguém esquecesse de repetir.
 */
export function ApisWebhooksView() {
  const navegar = useNavigate();
  const ativas = INTEGRACOES_ATIVAS.length;
  const pendentes = INTEGRACOES_PENDENTES.length;
  const semTerceiro = INTEGRACOES_PENDENTES.filter((i) => i.dependencia === 'codigo_proprio').length;

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <div className="label-eyebrow mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className={`size-3.5 ${ESTILO_TEXTO.sucesso}`} />
            Operando hoje
          </div>
          <div className="text-2xl font-semibold text-roxo-900 tabular">{ativas}</div>
        </div>
        <div className="card p-5">
          <div className="label-eyebrow mb-1.5 flex items-center gap-1.5">
            <Unplug className={`size-3.5 ${ESTILO_TEXTO.atencao}`} />
            Por ligar
          </div>
          <div className="text-2xl font-semibold text-roxo-900 tabular">{pendentes}</div>
          <p className="nota mt-1">{semTerceiro} não esperam terceiro nenhum</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navegar('/integracoes')}
        className="btn btn-secundario w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Webhook className="size-4" />
          Ver o inventário completo em Integrações
        </span>
        <ArrowRight className="size-4" />
      </button>

      <p className="nota mt-3">
        Chave de API, segredo de webhook e connection string não ficam em tela nenhuma
        (`API-R01`) — moram em `.secrets/` e nas variáveis do provedor, fora do navegador.
      </p>
    </div>
  );
}
