import { useEffect, useMemo, useState } from 'react';
import { KanbanSquare, Plus, Search, Table2, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNegociacoes } from '@/src/contexts/NegociacoesContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { Toast, type Aviso } from '@/src/components/ui/Toast';
import { ESTILO_CHIP, ESTILO_PONTO, type Tom } from '@/src/lib/estilo';
import {
  COLUNAS,
  COR_COLUNA,
  DESFECHOS,
  estaCongelada,
  motivoParaRecusarMovimento,
  prioridade,
  veApenasPropria,
  visiveisPara,
} from '@/src/lib/negociacoes';
import { NEGOCIACAO_STATUS_LABEL, type Negociacao, type NegociacaoStatus } from '@/types';
import { NegociacaoCard } from './NegociacaoCard';
import { NegociacaoDrawer } from './NegociacaoDrawer';
import { TabelaNegociacoes } from './TabelaNegociacoes';
import { MenuCartao } from './MenuCartao';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function NegociacoesView() {
  const { perfil } = useAuth();
  const { negociacoes, mover } = useNegociacoes();
  const { usuarios } = useUsuarios();

  const [visao, setVisao] = useState<'kanban' | 'tabela'>('kanban');
  const [busca, setBusca] = useState('');
  const [filtroResp, setFiltroResp] = useState('');
  const [filtroConselho, setFiltroConselho] = useState('');
  const [mostrarDesfechos, setMostrarDesfechos] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<NegociacaoStatus | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<{ negociacao: Negociacao; x: number; y: number } | null>(null);
  const [perdaDe, setPerdaDe] = useState<Negociacao | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const nomePorId = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u.nome])),
    [usuarios],
  );

  const minhaCarteira = veApenasPropria(perfil);

  const daCarteira = useMemo(
    () => visiveisPara(negociacoes, perfil),
    [negociacoes, perfil],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCarteira.filter((n) => {
      if (filtroResp && n.responsavelId !== filtroResp) return false;
      if (filtroConselho && n.conselho !== filtroConselho) return false;
      if (!termo) return true;
      return (
        n.cliente.toLowerCase().includes(termo) ||
        n.nicho.toLowerCase().includes(termo) ||
        n.origem.toLowerCase().includes(termo)
      );
    });
  }, [daCarteira, busca, filtroResp, filtroConselho]);

  const noQuadro = useMemo(
    () => filtradas.filter((n) => !DESFECHOS.includes(n.status)),
    [filtradas],
  );
  const desfechos = useMemo(
    () => filtradas.filter((n) => DESFECHOS.includes(n.status)),
    [filtradas],
  );

  const chips = useMemo(() => {
    const propostas = noQuadro.filter((n) => n.status === 'proposta_enviada').length;
    const semConselho = noQuadro.filter((n) => !n.conselho).length;
    const congeladas = noQuadro.filter(estaCongelada).length;
    const p1 = noQuadro.filter((n) => prioridade(n) === 'P1').length;
    const verba = noQuadro.reduce((s, n) => s + n.verbaMensal, 0);
    return { propostas, semConselho, congeladas, p1, verba };
  }, [noQuadro]);

  const temFiltro = Boolean(busca || filtroResp || filtroConselho);

  function tentarMover(negociacao: Negociacao, destino: NegociacaoStatus) {
    const recusa = motivoParaRecusarMovimento(negociacao, destino);
    if (recusa) {
      setAviso({ texto: recusa, tom: 'erro' });
      return;
    }
    if (destino === 'perdido') {
      setPerdaDe(negociacao);
      return;
    }
    mover(negociacao.id, destino);
    setAviso({
      texto: `${negociacao.cliente} → ${NEGOCIACAO_STATUS_LABEL[destino]}.`,
    });
  }

  function soltarEm(destino: NegociacaoStatus) {
    setColunaAlvo(null);
    const id = arrastando;
    setArrastando(null);
    if (!id) return;
    const n = negociacoes.find((x) => x.id === id);
    if (n) tentarMover(n, destino);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho ------------------------------------------------------- */}
      <div className="shrink-0 px-4 sm:px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="titulo-pagina">Negociações</h1>
            <p className="subtitulo-pagina mt-1">
              {minhaCarteira
                ? 'Sua carteira. O funil vai do primeiro contato à conta no ar.'
                : 'O funil vai do primeiro contato à conta de anúncio no ar.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
              <BotaoVisao ativo={visao === 'kanban'} aoClicar={() => setVisao('kanban')} rotulo="Kanban">
                <KanbanSquare className="size-4" />
              </BotaoVisao>
              <BotaoVisao ativo={visao === 'tabela'} aoClicar={() => setVisao('tabela')} rotulo="Tabela">
                <Table2 className="size-4" />
              </BotaoVisao>
            </div>

            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="btn btn-primario"
            >
              <Plus className="size-4" />
              Nova negociação
            </button>
          </div>
        </div>

        {/* Chips ---------------------------------------------------------- */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip valor={noQuadro.length} rotulo="no funil" />
          <Chip valor={brl.format(chips.verba)} rotulo="verba em jogo" tom="marca" />
          <Chip valor={chips.propostas} rotulo="propostas pendentes" tom="atencao" />
          <Chip valor={chips.p1} rotulo="prioridade P1" tom="erro" />
          <Chip
            valor={chips.semConselho}
            rotulo="sem conselho"
            tom={chips.semConselho > 0 ? 'atencao' : 'neutro'}
            titulo="Sem conselho regulador definido não avançam para contrato assinado."
          />
          <Chip valor={chips.congeladas} rotulo="congeladas" tom="info" />
        </div>

        {/* Filtros -------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-52 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, nicho ou origem…"
              aria-label="Buscar negociações"
              className="campo pl-9"
            />
          </div>

          {!minhaCarteira && (
            <select
              value={filtroResp}
              onChange={(e) => setFiltroResp(e.target.value)}
              aria-label="Filtrar por responsável"
              className={seletor}
            >
              <option value="">Todos os responsáveis</option>
              {[...new Set(daCarteira.map((n) => n.responsavelId))].map((id) => (
                <option key={id} value={id}>
                  {nomePorId[id] ?? 'Sem responsável'}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroConselho}
            onChange={(e) => setFiltroConselho(e.target.value)}
            aria-label="Filtrar por conselho"
            className={seletor}
          >
            <option value="">Todos os conselhos</option>
            {[...new Set(daCarteira.map((n) => n.conselho).filter(Boolean))].map((c) => (
              <option key={c} value={c!}>
                {c}
              </option>
            ))}
          </select>

          {desfechos.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarDesfechos((v) => !v)}
              aria-pressed={mostrarDesfechos}
              className={`btn px-3 ${
                mostrarDesfechos
                  ? 'border border-roxo-300 bg-roxo-50 text-roxo-800'
                  : 'btn-secundario'
              }`}
            >
              Encerradas ({desfechos.length})
            </button>
          )}

          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroResp('');
                setFiltroConselho('');
              }}
              className="btn btn-fantasma px-3 gap-1.5"
            >
              <X className="size-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo --------------------------------------------------------- */}
      {visao === 'kanban' ? (
        <div className="flex-1 min-h-0 overflow-x-auto px-4 sm:px-6 pb-6">
          <div className="flex gap-3 h-full min-w-max">
            {COLUNAS.map((coluna) => {
              const cartoes = noQuadro.filter((n) => n.status === coluna);
              const total = cartoes.reduce((s, n) => s + n.verbaMensal, 0);
              const alvo = colunaAlvo === coluna;

              return (
                <section
                  key={coluna}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setColunaAlvo(coluna);
                  }}
                  onDragLeave={() => setColunaAlvo((c) => (c === coluna ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    soltarEm(coluna);
                  }}
                  className={`w-72 shrink-0 flex flex-col rounded-xl border transition-colors ${
                    alvo ? 'border-roxo-400 bg-roxo-50/60' : 'border-stone-200 bg-stone-50/60'
                  }`}
                >
                  <header className="shrink-0 px-3 py-2.5 border-b border-stone-200/70">
                    <div className="flex items-center gap-2">
                      <span className={`ponto-estado size-2 ${COR_COLUNA[coluna]}`} />
                      <h2 className="text-[12px] font-semibold text-roxo-900 truncate">
                        {NEGOCIACAO_STATUS_LABEL[coluna]}
                      </h2>
                      <span className="ml-auto text-[11px] text-stone-500 tabular">
                        {cartoes.length}
                      </span>
                    </div>
                    <div className="nota tabular mt-0.5">{brl.format(total)}/mês</div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cartoes.map((n) => (
                      <NegociacaoCard
                        key={n.id}
                        negociacao={n}
                        responsavel={nomePorId[n.responsavelId] ?? '—'}
                        arrastavel
                        aoIniciarArraste={() => setArrastando(n.id)}
                        aoTerminarArraste={() => {
                          setArrastando(null);
                          setColunaAlvo(null);
                        }}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ negociacao: n, x: e.clientX, y: e.clientY });
                        }}
                      />
                    ))}

                    {cartoes.length === 0 && (
                      <p className="nota text-center py-6">
                        {alvo ? 'Solte aqui' : 'Vazia'}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}

            {mostrarDesfechos && (
              <section className="w-72 shrink-0 flex flex-col rounded-xl border border-stone-200 bg-stone-100/70">
                <header className="shrink-0 px-3 py-2.5 border-b border-stone-200/70">
                  <div className="flex items-center gap-2">
                    <span className={`ponto-estado size-2 ${ESTILO_PONTO.neutro}`} />
                    <h2 className="text-[12px] font-semibold text-roxo-900">Encerradas</h2>
                    <span className="ml-auto text-[11px] text-stone-500 tabular">
                      {desfechos.length}
                    </span>
                  </div>
                  <div className="nota mt-0.5">Perdidas, pausadas e reprovadas</div>
                </header>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {desfechos.map((n) => (
                    <div key={n.id} className="opacity-70">
                      <NegociacaoCard
                        negociacao={n}
                        responsavel={nomePorId[n.responsavelId] ?? '—'}
                        arrastavel={false}
                        aoIniciarArraste={() => {}}
                        aoTerminarArraste={() => {}}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ negociacao: n, x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div className="nota text-[10px] px-3 pt-1">
                        {NEGOCIACAO_STATUS_LABEL[n.status]}
                        {n.motivoPerda && ` · ${n.motivoPerda}`}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-24">
          <TabelaNegociacoes
            negociacoes={mostrarDesfechos ? filtradas : noQuadro}
            nomePorId={nomePorId}
            aoAbrirMenu={(n, e) => setMenu({ negociacao: n, x: e.clientX, y: e.clientY })}
          />
        </div>
      )}

      <p className="nota shrink-0 px-4 sm:px-6 pb-3">
        {visao === 'kanban'
          ? 'Arraste o cartão para mudar de etapa, ou clique com o botão direito para o menu de ações.'
          : 'Clique em ⋯ para o menu de ações. As colunas ordenam ao clicar no título.'}
        {minhaCarteira && ' Você enxerga apenas as negociações sob sua responsabilidade.'}
      </p>

      {/* Sobreposições ---------------------------------------------------- */}
      {drawer && (
        <NegociacaoDrawer aoFechar={() => setDrawer(false)} aoSalvar={(t) => setAviso({ texto: t })} />
      )}

      {menu && (
        <MenuCartao
          negociacao={menu.negociacao}
          x={menu.x}
          y={menu.y}
          aoFechar={() => setMenu(null)}
          aoMover={(destino) => {
            setMenu(null);
            tentarMover(menu.negociacao, destino);
          }}
        />
      )}

      {perdaDe && (
        <MotivoDaPerda
          negociacao={perdaDe}
          aoCancelar={() => setPerdaDe(null)}
          aoConfirmar={(motivo) => {
            mover(perdaDe.id, 'perdido', motivo);
            setAviso({ texto: `${perdaDe.cliente} marcada como perdida.` });
            setPerdaDe(null);
          }}
        />
      )}

      <Toast aviso={aviso} aoFechar={() => setAviso(null)} />
    </div>
  );
}


// ---------------------------------------------------------------------------

/** Seletor da barra de filtros: mesma casca do campo, largura pelo conteúdo. */
const seletor = 'campo w-auto';

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

function BotaoVisao({
  ativo,
  aoClicar,
  rotulo,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      title={rotulo}
      className={`btn h-8 px-3 gap-1.5 ${
        ativo ? 'bg-roxo-100 text-roxo-800' : 'text-stone-500 hover:text-roxo-800'
      }`}
    >
      {children}
      <span className="hidden sm:inline">{rotulo}</span>
    </button>
  );
}

/** CRM-R10 — perder exige motivo. Sem texto, o botão não libera. */
function MotivoDaPerda({
  negociacao,
  aoCancelar,
  aoConfirmar,
}: {
  negociacao: Negociacao;
  aoCancelar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoCancelar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  return (
    <div className="pilha-dialogo grid place-items-center p-4">
      <button type="button" aria-label="Cancelar" onClick={aoCancelar} className="veu" />
      <div role="dialog" aria-modal="true" className="dialogo max-w-md p-6">
        <h2 className="text-[15px] font-semibold text-roxo-900">
          Por que {negociacao.cliente} foi perdida?
        </h2>
        <p className="text-[13px] text-stone-600 mt-1.5 mb-4">
          O motivo é obrigatório — é o que permite descobrir depois se o problema é preço, prazo ou
          nicho.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          autoFocus
          placeholder="Fechou com concorrente por preço."
          className="campo campo-area"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={aoCancelar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button
            type="button"
            disabled={motivo.trim().length < 3}
            onClick={() => aoConfirmar(motivo.trim())}
            className="btn btn-perigo"
          >
            Marcar como perdida
          </button>
        </div>
      </div>
    </div>
  );
}

