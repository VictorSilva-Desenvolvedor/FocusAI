import { Clock, FileCode2, Timer } from 'lucide-react';
import { ESTILO_ETIQUETA } from '@/src/lib/estilo';
import { SLA_HORAS } from '@/src/lib/conformidade';
import { MINUTOS_DE_RESERVA, HORAS_PARA_VENCER, DIAS_PARA_PERDER } from '@/src/lib/leads';
import { DIAS_PARA_CONGELAR, DIAS_SEM_INTERACAO_P1 } from '@/src/lib/advogados';

interface Prazo {
  regra: string;
  rotulo: string;
  valor: string;
  descricao: string;
  onde: string;
}

/**
 * Não é um configurador — os prazos abaixo são constante versionada, cada um
 * no arquivo que a impõe. Mudá-los é mudar o número no código, não preencher
 * um formulário aqui; esta tela só junta o que já existe espalhado, para que
 * "quanto tempo dura X" tenha uma resposta num lugar só em vez de obrigar a
 * caçar cinco arquivos.
 */
const PRAZOS: Prazo[] = [
  {
    regra: 'LED-R04',
    rotulo: 'Trava de reserva do lead',
    valor: `${MINUTOS_DE_RESERVA} min`,
    descricao: 'Tempo que um advogado segura um lead no checkout antes de a trava expirar e o lead voltar ao catálogo para outro comprar.',
    onde: 'src/lib/leads.ts',
  },
  {
    regra: 'CNF-R01',
    rotulo: 'Parecer de conformidade',
    valor: `${SLA_HORAS} h`,
    descricao: 'Cronômetro do parecer sobre criativo, contado do envio até a decisão registrada.',
    onde: 'src/lib/conformidade.ts',
  },
  {
    regra: '—',
    rotulo: 'Aviso de lead vencendo',
    valor: `${HORAS_PARA_VENCER} h`,
    descricao: 'Quanto antes da hora da reunião o catálogo já marca o lead como "vence em breve".',
    onde: 'src/lib/leads.ts',
  },
  {
    regra: 'LED-R10',
    rotulo: 'Lead perdido por falta de contato',
    valor: `${DIAS_PARA_PERDER} dias`,
    descricao: 'Tempo sem sair de "Novo" até o lead sair da fila da IA e cair na coluna "Perdidos" do quadro.',
    onde: 'src/lib/leads.ts',
  },
  {
    regra: 'ADV-R04',
    rotulo: 'Prioridade automática P1 por inatividade',
    valor: `${DIAS_SEM_INTERACAO_P1} dias`,
    descricao: 'Advogado sem interação por esse tempo sobe para prioridade P1 no quadro, mesmo sem ser um lead quente.',
    onde: 'src/lib/advogados.ts',
  },
  {
    regra: 'ADV-R07',
    rotulo: 'Congelamento visual do card',
    valor: `${DIAS_PARA_CONGELAR} dias`,
    descricao: 'Card do advogado marcado como parado. É só sinal visual — não muda status nem responsável.',
    onde: 'src/lib/advogados.ts',
  },
];

export function SlaPrazosView() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="card-title flex items-center gap-2">
          <Timer className="size-4 text-stone-400" />
          SLA / Prazos
        </h2>
        <p className="subtitulo-pagina mt-1">
          Os prazos que já governam o sistema hoje, juntos num lugar só — cada um é constante
          versionada no arquivo indicado, não um valor editável por aqui.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {PRAZOS.map((p) => (
          <article key={p.rotulo} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="card-title">{p.rotulo}</h3>
                <p className="nota mt-1 leading-snug">{p.descricao}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-semibold text-roxo-900 tabular">{p.valor}</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <p className="flex gap-2 text-[12px] text-stone-600 leading-snug min-w-0">
                <FileCode2 className="size-3.5 shrink-0 mt-0.5 text-stone-400" />
                <code className="break-all">{p.onde}</code>
              </p>
              {p.regra !== '—' && (
                <code className={`etiqueta shrink-0 ${ESTILO_ETIQUETA.neutro}`}>{p.regra}</code>
              )}
            </div>
          </article>
        ))}
      </div>

      <p className="nota mt-4 flex items-center gap-1.5">
        <Clock className="size-3.5" />
        Mudar um destes números é mudar o código e comitar — não há caminho de configuração em
        runtime para nenhum deles.
      </p>
    </div>
  );
}
