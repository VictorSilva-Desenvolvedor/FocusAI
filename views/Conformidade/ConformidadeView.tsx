import { useId, useMemo, useState, type FormEvent } from 'react';
import { Clock, Plus, Scale, Send, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { useConformidade } from '@/src/contexts/ConformidadeContext';
import { Campo, entrada } from '@/src/components/ui/Campo';
import { Toast, type Aviso } from '@/src/components/ui/Toast';
import {
  ESTILO_BLOCO,
  ESTILO_CHIP,
  ESTILO_ETIQUETA,
  ESTILO_TEXTO,
  type Tom,
} from '@/src/lib/estilo';
import {
  SLA_HORAS,
  horasNaFila,
  temErroCriativo,
  validarCriativo,
  type CriativoFormData,
  type ErrosCriativo,
} from '@/src/lib/conformidade';
import { ESTILO_TESE } from '@/src/lib/leads';
import { formatarDataHora, tempoRelativo } from '@/src/lib/format';
import {
  DECISAO_LABEL,
  PLATAFORMA_LABEL,
  TESE_CURTA,
  type DecisaoConformidade,
  type Parecer,
  type PlataformaAnuncio,
  type TeseId,
} from '@/types';

const TOM_DECISAO: Record<DecisaoConformidade, Tom> = {
  aprovado: 'sucesso',
  aprovado_com_ressalva: 'info',
  exigir_ajuste: 'atencao',
  pendencia_documental: 'atencao',
  reprovado: 'erro',
};

const TESES_DO_FORMULARIO = Object.keys(TESE_CURTA) as TeseId[];

const FORM_VAZIO: CriativoFormData = { criativo: '', tese: '', plataforma: '' };

export function ConformidadeView() {
  const { perfil, ehConformidade, temPermissao } = useAuth();
  const { usuarios } = useUsuarios();
  const { pareceres, enviar, emitir } = useConformidade();
  const idBase = useId();

  const nomePorId = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u.nome])),
    [usuarios],
  );

  // Espelha `papeis`/`papeisRestritos` de `conformidade` em navigation.ts:
  // quem produz criativo envia, quem tem acesso pleno decide.
  const podeEnviar =
    perfil.role === 'adm' || perfil.role === 'gestor_trafego' || perfil.role === 'criativo';
  const podeDecidir = perfil.role === 'adm' || perfil.role === 'analista_conformidade';

  const pendentes = useMemo(() => pareceres.filter((p) => p.decisao === null), [pareceres]);
  const emitidos = useMemo(() => pareceres.filter((p) => p.decisao !== null), [pareceres]);
  const foraDoSla = useMemo(
    () => pendentes.filter((p) => horasNaFila(p) > SLA_HORAS),
    [pendentes],
  );
  const reprovados = useMemo(() => emitidos.filter((p) => p.decisao === 'reprovado'), [emitidos]);

  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [dados, setDados] = useState<CriativoFormData>(FORM_VAZIO);
  const [erros, setErros] = useState<ErrosCriativo>({});
  const [enviando, setEnviando] = useState(false);

  /*
   * CNF-R21 — liberar com ressalva é gate por departamento, não por papel. Nem
   * administrador escapa: assumir risco regulatório é atribuição de uma função
   * específica, não privilégio hierárquico. A tela avisa quando a permissão
   * está marcada mas não tem efeito, senão a pessoa descobre no clique.
   */
  const permissaoSemEfeito = temPermissao('conformidade:liberar_com_ressalva') && !ehConformidade;

  async function enviarCriativo(e: FormEvent) {
    e.preventDefault();
    const v = validarCriativo(dados);
    setErros(v);
    if (temErroCriativo(v)) return;

    setEnviando(true);
    const r = await enviar(dados.criativo.trim(), dados.tese as TeseId, dados.plataforma as PlataformaAnuncio);
    setEnviando(false);

    if (!r.ok) {
      setAviso({ texto: r.motivo, tom: 'erro' });
      return;
    }
    setDados(FORM_VAZIO);
    setErros({});
    setMostrarForm(false);
    setAviso({ texto: 'Criativo enviado para a fila de parecer.' });
  }

  async function emitirDecisao(parecer: Parecer, decisao: DecisaoConformidade, observacao: string) {
    const r = await emitir(parecer.id, decisao, observacao.trim() || null);
    if (!r.ok) {
      setAviso({ texto: r.motivo, tom: 'erro' });
      return;
    }
    setAviso({ texto: `Parecer registrado: ${DECISAO_LABEL[decisao]}.` });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 space-y-6 animate-entrada-suave">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="titulo-pagina">Conformidade</h1>
          <p className="subtitulo-pagina mt-1">
            Parecer sobre criativo e página de destino, à luz do Provimento 205 da OAB.
          </p>
        </div>
        {podeEnviar && (
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="btn btn-primario gap-1.5"
          >
            {mostrarForm ? <X className="size-4" /> : <Plus className="size-4" />}
            Enviar criativo
          </button>
        )}
      </div>

      {mostrarForm && podeEnviar && (
        <form onSubmit={enviarCriativo} className="card p-5 space-y-4">
          <Campo id={`${idBase}-criativo`} rotulo="Criativo" erro={erros.criativo}>
            <input
              id={`${idBase}-criativo`}
              value={dados.criativo}
              onChange={(e) => setDados((d) => ({ ...d, criativo: e.target.value }))}
              placeholder='Vídeo 30s — "seu processo está parado?"'
              autoFocus
              className={entrada(erros.criativo)}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${idBase}-tese`} rotulo="Tese" erro={erros.tese}>
              <select
                id={`${idBase}-tese`}
                value={dados.tese}
                onChange={(e) => setDados((d) => ({ ...d, tese: e.target.value as TeseId }))}
                className={entrada(erros.tese)}
              >
                <option value="">Escolha a tese</option>
                {TESES_DO_FORMULARIO.map((id) => (
                  <option key={id} value={id}>
                    {TESE_CURTA[id]}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id={`${idBase}-plataforma`} rotulo="Plataforma" erro={erros.plataforma}>
              <select
                id={`${idBase}-plataforma`}
                value={dados.plataforma}
                onChange={(e) =>
                  setDados((d) => ({ ...d, plataforma: e.target.value as PlataformaAnuncio }))
                }
                className={entrada(erros.plataforma)}
              >
                <option value="">Escolha a plataforma</option>
                {Object.entries(PLATAFORMA_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMostrarForm(false)} className="btn btn-fantasma">
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn btn-primario">
              {enviando ? 'Enviando…' : 'Enviar para parecer'}
            </button>
          </div>
        </form>
      )}

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
            {pendentes.map((parecer) => (
              <ItemFilaParecer
                key={parecer.id}
                parecer={parecer}
                estourou={horasNaFila(parecer) > SLA_HORAS}
                podeDecidir={podeDecidir}
                nomeDoRemetente={nomePorId[parecer.enviadoPor] ?? '—'}
                aoEmitir={(decisao, observacao) => emitirDecisao(parecer, decisao, observacao)}
              />
            ))}
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
            {emitidos.length === 0 && <p className="nota py-4 text-center">Nenhum parecer emitido ainda.</p>}
          </ul>
        </section>
      </div>

      <Toast aviso={aviso} aoFechar={() => setAviso(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ItemFilaParecer({
  parecer,
  estourou,
  podeDecidir,
  nomeDoRemetente,
  aoEmitir,
}: {
  parecer: Parecer;
  estourou: boolean;
  podeDecidir: boolean;
  nomeDoRemetente: string;
  aoEmitir: (decisao: DecisaoConformidade, observacao: string) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [decisao, setDecisao] = useState<DecisaoConformidade | ''>('');
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function registrar() {
    if (!decisao) return;
    setEnviando(true);
    await aoEmitir(decisao, observacao);
    setEnviando(false);
    setAberto(false);
    setDecisao('');
    setObservacao('');
  }

  return (
    <li className={`rounded-lg border p-3 ${estourou ? ESTILO_BLOCO.erro : ESTILO_BLOCO.neutro}`}>
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
          <p className="nota mt-1">
            enviado por {nomeDoRemetente} · {tempoRelativo(parecer.enviadoEm)}
          </p>
        </div>
        <span
          className={`text-[11px] tabular shrink-0 ${
            estourou ? `font-semibold ${ESTILO_TEXTO.erro}` : 'text-stone-500'
          }`}
        >
          {Math.round(horasNaFila(parecer))}h
        </span>
      </div>

      {podeDecidir && aberto && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          <select
            value={decisao}
            onChange={(e) => setDecisao(e.target.value as DecisaoConformidade)}
            aria-label="Decisão do parecer"
            className="campo w-full text-[12px]"
          >
            <option value="">Escolha a decisão</option>
            {Object.entries(DECISAO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observação (opcional)"
            aria-label="Observação do parecer"
            rows={2}
            className="campo campo-area w-full text-[12px]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="btn btn-fantasma text-[12px] h-7 px-2.5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={registrar}
              disabled={!decisao || enviando}
              className="btn btn-primario text-[12px] h-7 px-2.5 gap-1"
            >
              <Send className="size-3.5" />
              {enviando ? 'Registrando…' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {podeDecidir && !aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="btn btn-secundario text-[11px] h-7 px-2.5 mt-2"
        >
          Dar parecer
        </button>
      )}
    </li>
  );
}

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
