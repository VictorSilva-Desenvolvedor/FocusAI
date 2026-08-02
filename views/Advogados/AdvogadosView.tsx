import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, KanbanSquare, Plus, Search, Table2, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { Toast, type Aviso } from '@/src/components/ui/Toast';
import { MenuCartao } from '@/src/components/ui/MenuCartao';
import { ESTILO_CHIP, ESTILO_PONTO, type Tom } from '@/src/lib/estilo';
import {
  COLUNAS,
  COR_COLUNA,
  DESFECHOS,
  contaDoAdvogado,
  estaCongelado,
  motivoParaRecusarMovimento,
  prioridade,
  veApenasPropria,
  visiveisPara,
} from '@/src/lib/advogados';
import { TESES } from '@/src/lib/teses';
import {
  ADVOGADO_STATUS_LABEL,
  TESE_CURTA,
  type Advogado,
  type AdvogadoStatus,
  type TeseId,
} from '@/types';
import { AdvogadoCard } from './AdvogadoCard';
import { AdvogadoDrawer } from './AdvogadoDrawer';
import { TabelaAdvogados } from './TabelaAdvogados';

export function AdvogadosView() {
  const { perfil } = useAuth();
  const { advogados, mover, conferirOab, vincularUsuario } = useAdvogados();
  const { usuarios, criarParaAdvogado } = useUsuarios();

  const [visao, setVisao] = useState<'kanban' | 'tabela'>('kanban');
  const [busca, setBusca] = useState('');
  const [filtroResp, setFiltroResp] = useState('');
  const [filtroTese, setFiltroTese] = useState('');
  const [mostrarDesfechos, setMostrarDesfechos] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<AdvogadoStatus | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState<{ advogado: Advogado; x: number; y: number } | null>(null);
  const [perdaDe, setPerdaDe] = useState<{ advogado: Advogado; destino: AdvogadoStatus } | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const nomePorId = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id, u.nome])),
    [usuarios],
  );

  const minhaCarteira = veApenasPropria(perfil);
  const daCarteira = useMemo(() => visiveisPara(advogados, perfil), [advogados, perfil]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCarteira.filter((a) => {
      if (filtroResp && a.responsavelId !== filtroResp) return false;
      if (filtroTese && !a.teses.includes(filtroTese as TeseId)) return false;
      if (!termo) return true;
      return (
        a.nome.toLowerCase().includes(termo) ||
        a.oab.toLowerCase().includes(termo) ||
        a.uf.toLowerCase().includes(termo)
      );
    });
  }, [daCarteira, busca, filtroResp, filtroTese]);

  const noQuadro = useMemo(
    () => filtrados.filter((a) => !DESFECHOS.includes(a.status)),
    [filtrados],
  );
  const desfechos = useMemo(() => filtrados.filter((a) => DESFECHOS.includes(a.status)), [filtrados]);

  const chips = useMemo(() => {
    const porConferir = noQuadro.filter((a) => !a.oabConferidaEm).length;
    const semTese = noQuadro.filter((a) => a.teses.length === 0).length;
    const congelados = noQuadro.filter(estaCongelado).length;
    const p1 = noQuadro.filter((a) => prioridade(a) === 'P1').length;
    const potencial = noQuadro.reduce((s, a) => s + a.potencialMensal, 0);
    const semSaldo = noQuadro.filter((a) => a.status === 'ativo' && a.saldoCreditos === 0).length;
    return { porConferir, semTese, congelados, p1, potencial, semSaldo };
  }, [noQuadro]);

  const temFiltro = Boolean(busca || filtroResp || filtroTese);

  function tentarMover(advogado: Advogado, destino: AdvogadoStatus) {
    const recusa = motivoParaRecusarMovimento(advogado, destino, perfil);
    if (recusa) {
      setAviso({ texto: recusa, tom: 'erro' });
      return;
    }
    if (destino === 'perdido' || destino === 'recusado') {
      setPerdaDe({ advogado, destino });
      return;
    }
    mover(advogado.id, destino);

    /*
     * ADV-R09 / INV-12 — é aqui que a conta nasce, como consequência da
     * liberação: a ficha passou pela qualificação e pela conferência da
     * inscrição, e só então existe login. Enquanto isto não existia, o funil
     * chegava a "acesso liberado" sem criar acesso nenhum — o advogado ficava
     * cadastrado e sem aplicativo, e a falha era silenciosa.
     *
     * Uma conta já apontada para esta ficha é reaproveitada em vez de duplicada:
     * duas contas para o mesmo advogado partem o histórico de compra em duas
     * metades, e nenhuma delas responde sozinha por quem comprou o quê.
     */
    let complemento = '';
    if (destino === 'acesso_liberado' && !advogado.usuarioId) {
      const existente = usuarios.find((u) => u.advogado_id === advogado.id);
      const conta = existente ?? criarParaAdvogado(contaDoAdvogado(advogado), advogado.id, perfil.id);
      vincularUsuario(advogado.id, conta.id);
      complemento = existente
        ? ' Conta existente revinculada.'
        : ` Conta criada para ${conta.email}, como convite pendente.`;
    }

    setAviso({ texto: `${advogado.nome} → ${ADVOGADO_STATUS_LABEL[destino]}.${complemento}` });
  }

  function soltarEm(destino: AdvogadoStatus) {
    setColunaAlvo(null);
    const id = arrastando;
    setArrastando(null);
    if (!id) return;
    const a = advogados.find((x) => x.id === id);
    if (a) tentarMover(a, destino);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho ------------------------------------------------------- */}
      <div className="shrink-0 px-4 sm:px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="titulo-pagina">Advogados</h1>
            <p className="subtitulo-pagina mt-1">
              {minhaCarteira
                ? 'Sua carteira. Do anúncio à primeira compra de lead.'
                : 'O funil vai do anúncio à primeira compra. Acesso só depois da qualificação.'}
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

            <button type="button" onClick={() => setDrawer(true)} className="btn btn-primario">
              <Plus className="size-4" />
              Novo advogado
            </button>
          </div>
        </div>

        {/* Chips ---------------------------------------------------------- */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Chip valor={noQuadro.length} rotulo="no funil" />
          <Chip valor={chips.potencial} rotulo="leads/mês de potencial" tom="marca" />
          <Chip
            valor={chips.porConferir}
            rotulo="inscrição por conferir"
            tom={chips.porConferir > 0 ? 'atencao' : 'neutro'}
            titulo="Sem a inscrição conferida não se libera acesso (INV-12)."
          />
          <Chip
            valor={chips.semTese}
            rotulo="sem tese"
            tom={chips.semTese > 0 ? 'atencao' : 'neutro'}
            titulo="Sem tese o painel abre vazio e o aviso de lead novo nunca dispara (ADV-R03)."
          />
          <Chip valor={chips.p1} rotulo="prioridade P1" tom="erro" />
          <Chip
            valor={chips.semSaldo}
            rotulo="ativos sem saldo"
            tom={chips.semSaldo > 0 ? 'erro' : 'neutro'}
            titulo="Recebem aviso de lead novo e não conseguem comprar nenhum."
          />
          <Chip valor={chips.congelados} rotulo="congelados" tom="info" />
        </div>

        {/* Filtros -------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-52 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar escritório, inscrição ou UF…"
              aria-label="Buscar advogados"
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
              {[...new Set(daCarteira.map((a) => a.responsavelId))].map((id) => (
                <option key={id} value={id}>
                  {nomePorId[id] ?? 'Sem responsável'}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtroTese}
            onChange={(e) => setFiltroTese(e.target.value)}
            aria-label="Filtrar por tese"
            className={seletor}
          >
            <option value="">Todas as teses</option>
            {TESES.map((t) => (
              <option key={t.id} value={t.id}>
                {TESE_CURTA[t.id]}
              </option>
            ))}
          </select>

          {desfechos.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarDesfechos((v) => !v)}
              aria-pressed={mostrarDesfechos}
              className={`btn px-3 ${
                mostrarDesfechos ? 'border border-roxo-300 bg-roxo-50 text-roxo-800' : 'btn-secundario'
              }`}
            >
              Encerrados ({desfechos.length})
            </button>
          )}

          {temFiltro && (
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroResp('');
                setFiltroTese('');
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
              const cartoes = noQuadro.filter((a) => a.status === coluna);
              const potencial = cartoes.reduce((s, a) => s + a.potencialMensal, 0);
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
                        {ADVOGADO_STATUS_LABEL[coluna]}
                      </h2>
                      <span className="ml-auto text-[11px] text-stone-500 tabular">
                        {cartoes.length}
                      </span>
                    </div>
                    <div className="nota tabular mt-0.5">{potencial} leads/mês</div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cartoes.map((a) => (
                      <AdvogadoCard
                        key={a.id}
                        advogado={a}
                        responsavel={nomePorId[a.responsavelId] ?? '—'}
                        arrastavel
                        aoIniciarArraste={() => setArrastando(a.id)}
                        aoTerminarArraste={() => {
                          setArrastando(null);
                          setColunaAlvo(null);
                        }}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ advogado: a, x: e.clientX, y: e.clientY });
                        }}
                      />
                    ))}

                    {cartoes.length === 0 && (
                      <p className="nota text-center py-6">{alvo ? 'Solte aqui' : 'Vazia'}</p>
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
                    <h2 className="text-[12px] font-semibold text-roxo-900">Encerrados</h2>
                    <span className="ml-auto text-[11px] text-stone-500 tabular">
                      {desfechos.length}
                    </span>
                  </div>
                  <div className="nota mt-0.5">Perdidos, recusados e pausados</div>
                </header>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {desfechos.map((a) => (
                    <div key={a.id} className="opacity-70">
                      <AdvogadoCard
                        advogado={a}
                        responsavel={nomePorId[a.responsavelId] ?? '—'}
                        arrastavel={false}
                        aoIniciarArraste={() => {}}
                        aoTerminarArraste={() => {}}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ advogado: a, x: e.clientX, y: e.clientY });
                        }}
                      />
                      <div className="nota text-[10px] px-3 pt-1">
                        {ADVOGADO_STATUS_LABEL[a.status]}
                        {a.motivoPerda && ` · ${a.motivoPerda}`}
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
          <TabelaAdvogados
            advogados={mostrarDesfechos ? filtrados : noQuadro}
            nomePorId={nomePorId}
            aoAbrirMenu={(a, e) => setMenu({ advogado: a, x: e.clientX, y: e.clientY })}
          />
        </div>
      )}

      <p className="nota shrink-0 px-4 sm:px-6 pb-3">
        {visao === 'kanban'
          ? 'Arraste o cartão para mudar de etapa, ou clique com o botão direito para o menu de ações.'
          : 'Clique em ⋯ para o menu de ações. As colunas ordenam ao clicar no título.'}
        {minhaCarteira && ' Você enxerga apenas os advogados sob sua responsabilidade.'}
      </p>

      {/* Sobreposições ---------------------------------------------------- */}
      {drawer && (
        <AdvogadoDrawer aoFechar={() => setDrawer(false)} aoSalvar={(t) => setAviso({ texto: t })} />
      )}

      {menu && (
        <MenuCartao
          titulo={menu.advogado.nome}
          statusAtual={menu.advogado.status}
          colunas={COLUNAS}
          desfechos={DESFECHOS}
          rotulos={ADVOGADO_STATUS_LABEL}
          motivoParaRecusar={(destino) => motivoParaRecusarMovimento(menu.advogado, destino, perfil)}
          /*
            A conferência da inscrição não é movimento de etapa — é o ato que
            destrava a liberação de acesso (INV-12). Fica no topo do mesmo menu
            para conferir e mover na mesma interação.
          */
          acoes={
            !menu.advogado.oabConferidaEm && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  conferirOab(menu.advogado.id);
                  setAviso({ texto: `Inscrição ${menu.advogado.oab} conferida.` });
                  setMenu(null);
                }}
                className="item-menu flex items-center gap-2 font-medium text-sucesso-700 hover:bg-sucesso-50"
              >
                <BadgeCheck className="size-4 shrink-0" />
                Conferir inscrição {menu.advogado.oab}
              </button>
            )
          }
          x={menu.x}
          y={menu.y}
          aoFechar={() => setMenu(null)}
          aoMover={(destino) => {
            setMenu(null);
            tentarMover(menu.advogado, destino);
          }}
        />
      )}

      {perdaDe && (
        <MotivoDoEncerramento
          advogado={perdaDe.advogado}
          destino={perdaDe.destino}
          aoCancelar={() => setPerdaDe(null)}
          aoConfirmar={(motivo) => {
            mover(perdaDe.advogado.id, perdaDe.destino, motivo);
            setAviso({
              texto: `${perdaDe.advogado.nome} marcado como ${ADVOGADO_STATUS_LABEL[
                perdaDe.destino
              ].toLowerCase()}.`,
            });
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

/** ADV-R05 — encerrar exige motivo. Sem texto, o botão não libera. */
function MotivoDoEncerramento({
  advogado,
  destino,
  aoCancelar,
  aoConfirmar,
}: {
  advogado: Advogado;
  destino: AdvogadoStatus;
  aoCancelar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoCancelar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  const recusa = destino === 'recusado';

  return (
    <div className="pilha-dialogo grid place-items-center p-4">
      <button type="button" aria-label="Cancelar" onClick={aoCancelar} className="veu" />
      <div role="dialog" aria-modal="true" className="dialogo max-w-md p-6">
        <h2 className="text-[15px] font-semibold text-roxo-900">
          Por que {advogado.nome} foi {recusa ? 'recusado' : 'perdido'}?
        </h2>
        <p className="text-[13px] text-stone-600 mt-1.5 mb-4">
          {recusa
            ? 'Recusa entra no histórico da inscrição: é o que sustenta a decisão se a mesma pessoa voltar a se candidatar.'
            : 'O motivo é obrigatório — é o que permite descobrir depois se o problema é preço, tese ou região.'}
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          autoFocus
          placeholder={
            recusa ? 'Inscrição suspensa no momento da conferência.' : 'Achou o preço por lead alto.'
          }
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
            {recusa ? 'Recusar cadastro' : 'Marcar como perdido'}
          </button>
        </div>
      </div>
    </div>
  );
}
