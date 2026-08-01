import { useMemo } from 'react';
import { Clock, Scale, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import {
  ESTILO_BLOCO,
  ESTILO_CHIP,
  ESTILO_ETIQUETA,
  ESTILO_TEXTO,
  type Tom,
} from '@/src/lib/estilo';
import { PARECERES_SEED } from '@/src/lib/qualificacaoSeed';
import { ESTILO_TESE } from '@/src/lib/leads';
import { formatarDataHora, tempoRelativo } from '@/src/lib/format';
import {
  DECISAO_LABEL,
  PLATAFORMA_LABEL,
  TESE_CURTA,
  type DecisaoConformidade,
  type Parecer,
} from '@/types';

/** CNF-R01 — o cronômetro corre do envio até o parecer registrado. */
const SLA_HORAS = 24;

const TOM_DECISAO: Record<DecisaoConformidade, Tom> = {
  aprovado: 'sucesso',
  aprovado_com_ressalva: 'info',
  exigir_ajuste: 'atencao',
  pendencia_documental: 'atencao',
  reprovado: 'erro',
};

function horasNaFila(parecer: Parecer): number {
  const fim = parecer.emitidoEm ? Date.parse(parecer.emitidoEm) : Date.now();
  return (fim - Date.parse(parecer.enviadoEm)) / 3_600_000;
}

export function ConformidadeView() {
  const { perfil, ehConformidade, temPermissao } = useAuth();
  const { usuarios } = useUsuarios();

  const nomePorId = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u.nome])),
    [usuarios],
  );

  const pendentes = PARECERES_SEED.filter((p) => p.decisao === null);
  const emitidos = PARECERES_SEED.filter((p) => p.decisao !== null);
  const foraDoSla = pendentes.filter((p) => horasNaFila(p) > SLA_HORAS);
  const reprovados = emitidos.filter((p) => p.decisao === 'reprovado');

  /*
   * CNF-R21 — liberar com ressalva é gate por departamento, não por papel. Nem
   * administrador escapa: assumir risco regulatório é atribuição de uma função
   * específica, não privilégio hierárquico. A tela avisa quando a permissão
   * está marcada mas não tem efeito, senão a pessoa descobre no clique.
   */
  const permissaoSemEfeito = temPermissao('conformidade:liberar_com_ressalva') && !ehConformidade;

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div>
        <h1 className="titulo-pagina">Conformidade</h1>
        <p className="subtitulo-pagina mt-1">
          Parecer sobre criativo e página de destino, à luz do Provimento 205 da OAB.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip valor={pendentes.length} rotulo="na fila" tom="marca" />
        <Chip
          valor={foraDoSla.length}
          rotulo={`fora do SLA de ${SLA_HORAS}h`}
          tom={foraDoSla.length > 0 ? 'erro' : 'neutro'}
        />
        <Chip valor={reprovados.length} rotulo="reprovados" tom="erro" />
        <Chip valor={emitidos.length} rotulo="pareceres emitidos" tom="sucesso" />
      </div>

      {/*
        A pendência de validação jurídica não é alerta operacional: é a condição
        para lançar. Fica no topo do módulo porque nenhum parecer individual
        resolve a questão de arquitetura que ela levanta.
      */}
      <section className={`rounded-lg border p-4 ${ESTILO_BLOCO.atencao}`}>
        <div className="flex gap-3">
          <Scale className={`size-5 shrink-0 mt-0.5 ${ESTILO_TEXTO.atencao}`} />
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-roxo-900">
              Validação jurídica do modelo — pendente antes do lançamento comercial
            </h2>
            <p className="text-[13px] text-stone-700 mt-1.5 leading-relaxed">
              A arquitetura precisa ser revisada por advogado especialista em ética profissional à
              luz do Provimento 205, que regula publicidade e captação de clientela. Um
              intermediário que dá a múltiplos advogados acesso a dados de possíveis clientes
              levanta três questões concretas:
            </p>
            <ul className="mt-2.5 space-y-1.5">
              <Questao>Captação de clientela por intermediário.</Questao>
              <Questao>
                Direito do cliente final de escolher seu advogado com informação clara sobre como
                foi direcionado.
              </Questao>
              <Questao>
                Concorrência entre advogados pelo mesmo lead, se o mesmo contato for vendido mais de
                uma vez — é o que <code className="text-[11px] font-semibold">INV-10</code> impede no
                código.
              </Questao>
            </ul>
            <p className="text-[12px] text-stone-600 mt-3 leading-snug">
              Isso <strong>não impede construir</strong> o produto. Impede lançar comercialmente sem
              a revisão — e a revisão precisa acontecer antes, não depois.
            </p>
          </div>
        </div>
      </section>

      {permissaoSemEfeito && (
        <div className={`rounded-lg border p-3 ${ESTILO_BLOCO.info}`}>
          <p className="text-[13px] text-stone-700">
            Você tem a permissão <strong>liberar com ressalva</strong>, mas está no departamento{' '}
            <strong>{perfil.departamento ?? 'não informado'}</strong>. A permissão só tem efeito para
            quem está em Conformidade (CNF-R21) — assumir risco regulatório é atribuição de uma
            função, não privilégio de papel.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Fila ---------------------------------------------------------- */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="card-title">Fila de parecer</h2>
            <span className="text-[11px] text-stone-500 tabular">{pendentes.length}</span>
          </div>
          <p className="nota mb-4">
            O cronômetro corre desde o envio e só para quando o parecer é registrado (CNF-R01).
          </p>

          <ul className="space-y-2">
            {pendentes.map((parecer) => {
              const horas = horasNaFila(parecer);
              const estourou = horas > SLA_HORAS;
              return (
                <li
                  key={parecer.id}
                  className={`rounded-lg border p-3 ${estourou ? ESTILO_BLOCO.erro : ESTILO_BLOCO.neutro}`}
                >
                  <div className="flex items-start gap-2">
                    <Clock
                      className={`size-4 shrink-0 mt-0.5 ${estourou ? ESTILO_TEXTO.erro : 'text-stone-400'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-roxo-900 leading-snug">
                        {parecer.criativo}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`etiqueta ${ESTILO_TESE[parecer.tese]}`}>
                          {TESE_CURTA[parecer.tese]}
                        </span>
                        <span className="nota">{PLATAFORMA_LABEL[parecer.plataforma]}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] tabular shrink-0 ${
                        estourou ? `font-semibold ${ESTILO_TEXTO.erro}` : 'text-stone-500'
                      }`}
                    >
                      {Math.round(horas)}h
                    </span>
                  </div>
                </li>
              );
            })}
            {pendentes.length === 0 && <p className="nota py-4 text-center">Fila vazia.</p>}
          </ul>
        </section>

        {/* Emitidos ------------------------------------------------------ */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="card-title">Pareceres emitidos</h2>
            <span className="text-[11px] text-stone-500 tabular">{emitidos.length}</span>
          </div>
          <p className="nota mb-4">
            A data do parecer é imutável — é o carimbo que prova quando a peça foi avaliada
            (INV-13).
          </p>

          <ul className="divide-y divide-stone-100">
            {emitidos.map((parecer) => (
              <li key={parecer.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  {parecer.decisao === 'reprovado' ? (
                    <ShieldAlert className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.erro}`} />
                  ) : (
                    <ShieldCheck className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.sucesso}`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-roxo-900 leading-snug">
                      {parecer.criativo}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`etiqueta ${ESTILO_ETIQUETA[TOM_DECISAO[parecer.decisao!]]}`}>
                        {DECISAO_LABEL[parecer.decisao!]}
                      </span>
                      <span className={`etiqueta ${ESTILO_TESE[parecer.tese]}`}>
                        {TESE_CURTA[parecer.tese]}
                      </span>
                    </div>
                    {parecer.observacao && (
                      <p className="text-[12px] text-stone-600 mt-1.5 leading-snug">
                        {parecer.observacao}
                      </p>
                    )}
                    <p
                      className="nota mt-1"
                      title={parecer.emitidoEm ? formatarDataHora(parecer.emitidoEm) : undefined}
                    >
                      {nomePorId[parecer.emitidoPor ?? ''] ?? '—'} ·{' '}
                      {tempoRelativo(parecer.emitidoEm)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Questao({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] text-stone-700 leading-snug">
      <span className="text-stone-400 shrink-0">·</span>
      {children}
    </li>
  );
}

function Chip({
  valor,
  rotulo,
  tom = 'neutro',
}: {
  valor: number | string;
  rotulo: string;
  tom?: Tom;
}) {
  return (
    <div className={`chip py-1.5 ${ESTILO_CHIP[tom]}`}>
      <span className="text-[15px] font-semibold tabular leading-none">{valor}</span>
      <span className="text-[12px]">{rotulo}</span>
    </div>
  );
}
