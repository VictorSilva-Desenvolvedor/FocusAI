import { useCallback, useEffect, useMemo, useState } from 'react';
import { KanbanSquare, Plus, Search, Table2, Trash2, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLeads } from '@/src/contexts/LeadsContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useCreditos } from '@/src/contexts/CreditosContext';
import { Toast, type Aviso } from '@/src/components/ui/Toast';
import { AvisoErro } from '@/src/components/ui/AvisoErro';
import { MenuCartao } from '@/src/components/ui/MenuCartao';
import { ESTILO_CHIP, ESTILO_PONTO, type Tom } from '@/src/lib/estilo';
import {
  COLUNAS,
  COR_COLUNA,
  DESFECHOS,
  DIAS_PARA_PERDER,
  estaNoCatalogo,
  estaPerdido,
  motivoParaNaoAgendarManualmente,
  motivoParaNaoEncerrarReuniao,
  motivoParaRecusarMovimento,
  venceEmBreve,
  visiveisPara,
} from '@/src/lib/leads';
import { leadsComUltimaNaoAtendida } from '@/src/lib/qualificacao';
import { listarLigacoes } from '@/src/servicos/qualificacao';
import { TESES } from '@/src/lib/teses';
import {
  LEAD_STATUS_LABEL,
  ORIGEM_LEAD_LABEL,
  TESE_CURTA,
  type Ligacao,
  type Lead,
  type LeadStatus,
  type OrigemLead,
} from '@/types';
import { LeadCard } from './LeadCard';
import { LeadDrawer } from './LeadDrawer';
import { CatalogoAdvogado } from './CatalogoAdvogado';
import { TabelaLeads } from './TabelaLeads';
import { NovoLeadDialog } from './NovoLeadDialog';

/**
 * `nao_atendeu` fica fora do select de etapa: escolher uma etapa só restringe
 * a mostrar, nunca exclui — e o que essa etapa precisa é o oposto, excluir por
 * padrão. Ela tem o próprio filtro (`ocultarNaoAtendidas`).
 */
const ETAPAS_DESFECHO_FILTRAVEIS = DESFECHOS.filter((s) => s !== 'nao_atendeu');

export function LeadsView() {
  const { perfil, ehAdvogado, advogadoId } = useAuth();
  const { leads, mover, agendar, comprar, devolver, reservar, liberarReserva, excluir, erro, recarregar } =
    useLeads();
  // O saldo vem da view `advogados_com_saldo`, somado do extrato: depois de uma
  // compra ou devolução os dois precisam ser relidos, porque quem os mudou foi
  // a função do banco, não esta tela.
  const { advogados, recarregar: recarregarAdvogados } = useAdvogados();
  const { recarregar: recarregarCreditos } = useCreditos();

  const [visao, setVisao] = useState<'kanban' | 'tabela'>('kanban');
  const [busca, setBusca] = useState('');
  const [filtroTese, setFiltroTese] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<LeadStatus | ''>('');
  const [filtroOrigem, setFiltroOrigem] = useState<OrigemLead | ''>('');
  const [filtroUf, setFiltroUf] = useState('');
  const [mostrarDesfechos, setMostrarDesfechos] = useState(false);
  /*
   * Toda tentativa sem atender vira desfecho na hora (`registrar_qualificacao`,
   * 0010) — mas não é um caso encerrado, é um que ainda vai tentar de novo, e
   * não carrega nenhuma informação nova sobre o cliente. Por isso é filtro
   * próprio, fora do select de etapa (onde escolher só mostraria, nunca
   * excluiria) e fora de "Encerrados" (não depende de abri-lo) — oculto por
   * padrão para a tela focar no que ainda dá para tocar.
   */
  const [ocultarNaoAtendidas, setOcultarNaoAtendidas] = useState(true);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<LeadStatus | null>(null);
  const [menu, setMenu] = useState<{ lead: Lead; x: number; y: number } | null>(null);
  const [detalhe, setDetalhe] = useState<Lead | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Lead | null>(null);
  const [mostrarNovoLead, setMostrarNovoLead] = useState(false);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);

  /*
   * `eh_time_interno()` é quem lê `ligacoes` (política em 0010) — para
   * advogado a consulta voltaria vazia mesmo, e o catálogo dele nem usa
   * `noQuadro`/`desfechos`, então não vale a viagem de rede.
   */
  useEffect(() => {
    if (ehAdvogado) return;
    let vivo = true;
    void listarLigacoes().then((r) => {
      if (vivo) setLigacoes(r);
    });
    return () => {
      vivo = false;
    };
  }, [ehAdvogado]);

  const leadsSemAtender = useMemo(() => leadsComUltimaNaoAtendida(ligacoes), [ligacoes]);

  const advogadoDoPerfil = useMemo(
    () => advogados.find((a) => a.id === advogadoId) ?? null,
    [advogados, advogadoId],
  );

  const nomeDoAdvogado = useMemo(
    () => Object.fromEntries(advogados.map((a) => [a.id, a.nome])),
    [advogados],
  );

  // LED-R06 — o recorte do advogado é aplicado antes de qualquer filtro de
  // tela. Filtro de busca nunca pode alargar o que ele enxerga.
  const daCarteira = useMemo(
    () => visiveisPara(leads, perfil, advogadoDoPerfil),
    [leads, perfil, advogadoDoPerfil],
  );

  const ufsDisponiveis = useMemo(
    () => Array.from(new Set(daCarteira.map((l) => l.uf))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [daCarteira],
  );

  /**
   * Os filtros de categoria, sem a exclusão de não atendidas — é sobre este
   * conjunto que `naoAtendidas` conta quantas existem para excluir.
   */
  const semOcultarNaoAtendidas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return daCarteira.filter((l) => {
      if (filtroTese && l.tese !== filtroTese) return false;
      if (filtroEtapa && l.status !== filtroEtapa) return false;
      if (filtroOrigem && l.origem !== filtroOrigem) return false;
      if (filtroUf && l.uf !== filtroUf) return false;
      if (!termo) return true;
      return (
        l.nome.toLowerCase().includes(termo) ||
        l.cidade.toLowerCase().includes(termo) ||
        l.uf.toLowerCase().includes(termo) ||
        l.resumoQualificacao.toLowerCase().includes(termo)
      );
    });
  }, [daCarteira, busca, filtroTese, filtroEtapa, filtroOrigem, filtroUf]);

  /**
   * `nao_atendeu` no `status` é o sinal previsto (`QUA-R04`), mas a automação
   * não está aplicando essa transição na prática — o sinal de verdade é a
   * ligação mais recente (`leadsComUltimaNaoAtendida`). Os dois juntos cobrem
   * tanto o caso real quanto o caso em que a automação for corrigida.
   */
  const semInformacaoNova = useCallback(
    (l: Lead) => l.status === 'nao_atendeu' || leadsSemAtender.has(l.id),
    [leadsSemAtender],
  );

  const naoAtendidas = useMemo(
    () => semOcultarNaoAtendidas.filter(semInformacaoNova).length,
    [semOcultarNaoAtendidas, semInformacaoNova],
  );

  /*
   * Filtro próprio, aplicado no mesmo nível que tese/etapa/origem/UF — e não
   * só dentro de "Encerrados", porque a maioria do que ele exclui hoje está
   * em `novo`/`em_qualificacao`, não nos desfechos (ver o comentário acima).
   */
  const filtrados = useMemo(
    () => (ocultarNaoAtendidas ? semOcultarNaoAtendidas.filter((l) => !semInformacaoNova(l)) : semOcultarNaoAtendidas),
    [semOcultarNaoAtendidas, ocultarNaoAtendidas, semInformacaoNova],
  );

  const noQuadro = useMemo(() => filtrados.filter((l) => !DESFECHOS.includes(l.status)), [filtrados]);
  const desfechos = useMemo(
    () => filtrados.filter((l) => DESFECHOS.includes(l.status)),
    [filtrados],
  );
  /**
   * LED-R10 — três dias sem sair de `novo` e o lead esfria. Sai da coluna
   * "Novo" para a coluna "Perdidos", que fica antes dela no quadro: ainda não
   * é um desfecho (o status continua `novo`, a IA pode qualificar a qualquer
   * momento), mas misturado com o que acabou de chegar ele nunca seria olhado
   * de novo.
   */
  const perdidos = useMemo(() => noQuadro.filter(estaPerdido), [noQuadro]);
  // Só para o botão "Encerrados" não sumir quando ocultar não atendidas zera
  // o que sobra do desfecho filtrado — ele precisa continuar clicável.
  const desfechosTodos = useMemo(
    () => semOcultarNaoAtendidas.filter((l) => DESFECHOS.includes(l.status)),
    [semOcultarNaoAtendidas],
  );

  const chips = useMemo(() => {
    const catalogo = noQuadro.filter(estaNoCatalogo).length;
    const vencendo = noQuadro.filter(venceEmBreve).length;
    const vendidos = noQuadro.filter((l) => l.compradoPor).length;
    const semGravacao = noQuadro.filter((l) => l.compradoPor && !l.temGravacao).length;
    // Perdido não conta como fila: já esfriou, não é mais o que a IA está de fato tentando.
    const naFila = noQuadro.filter(
      (l) => (l.status === 'novo' && !estaPerdido(l)) || l.status === 'em_qualificacao',
    ).length;
    return { catalogo, vencendo, vendidos, semGravacao, naFila, perdidos: perdidos.length };
  }, [noQuadro, perdidos]);

  /**
   * LED-R04 — abrir a gaveta de um lead do catálogo **é** entrar no checkout, e
   * é aí que a trava tem que nascer.
   *
   * Sem isso, dois advogados leem a mesma ficha ao mesmo tempo, os dois decidem
   * comprar, e o segundo descobre que perdeu só depois de clicar. A recusa
   * continua existindo na escrita (`INV-10`), mas ela é a última linha de
   * defesa, não o lugar onde a disputa deveria aparecer.
   *
   * A trava não é bloqueio: vence sozinha em `MINUTOS_DE_RESERVA` e é calculada
   * contra o relógio, nunca gravada como booleano — trava que ninguém limpou é
   * lead preso para sempre.
   */
  function abrirDetalhe(lead: Lead) {
    if (ehAdvogado && advogadoDoPerfil && estaNoCatalogo(lead)) {
      // A trava é gravada no banco; a gaveta abre sem esperar por ela, porque
      // quem perdeu a corrida descobre na compra, que é onde INV-10 decide.
      void reservar(lead.id);
    }
    setDetalhe(lead);
  }

  /** Sair sem comprar devolve o lead ao catálogo na hora, sem esperar o prazo. */
  function fecharDetalhe() {
    const atual = detalhe ? leads.find((l) => l.id === detalhe.id) : null;
    if (atual && advogadoDoPerfil && !atual.compradoPor && atual.reservadoPor === advogadoDoPerfil.id) {
      void liberarReserva(atual.id);
    }
    setDetalhe(null);
  }

  /**
   * `CRE-R02` / `API-R08` — comprar é um passo só, e agora ele é uma transação
   * no banco: carimbar o comprador, debitar o crédito e lançar o movimento
   * acontecem juntos ou não acontecem.
   *
   * Isto era três chamadas a três stores separados enquanto o estado era local.
   * Repetir o débito aqui agora lançaria o consumo duas vezes — o extrato é a
   * única fonte do saldo (`INV-15`), então movimento duplicado é saldo errado
   * sem nada para conferir contra.
   *
   * O saldo e o extrato são relidos depois porque quem os alterou foi o banco.
   */
  async function comprarLead(lead: Lead) {
    if (!advogadoDoPerfil) return;

    const resultado = await comprar(lead.id);
    if (!resultado.ok) {
      setAviso({ texto: resultado.motivo, tom: 'erro' });
      setDetalhe(null);
      return;
    }

    await Promise.all([recarregarAdvogados(), recarregarCreditos()]);
    setDetalhe(resultado.lead);
    setAviso({ texto: `${lead.nome} é seu. O telefone completo já está liberado.` });
  }

  /** `CRE-R05` — a reposição do crédito acontece dentro da função do banco. */
  async function devolverLead(lead: Lead, motivo: string) {
    if (!advogadoDoPerfil) return;

    const resultado = await devolver(lead.id, motivo);
    if (!resultado.ok) {
      setAviso({ texto: resultado.motivo, tom: 'erro' });
      return;
    }

    await Promise.all([recarregarAdvogados(), recarregarCreditos()]);
    setDetalhe(null);
    setAviso({ texto: `${lead.custoCreditos} créditos devolvidos. O lead não volta ao catálogo.` });
  }

  /**
   * LED-R07 — o desfecho vem de quem esteve na reunião, e passa pelas mesmas
   * travas do quadro: é o mesmo movimento que a operação faria, feito pelo
   * lado que sabe o que aconteceu.
   */
  async function encerrarReuniao(lead: Lead, desfecho: 'atendido' | 'no_show') {
    const recusa = motivoParaNaoEncerrarReuniao(lead, advogadoDoPerfil);
    if (recusa) {
      setAviso({ texto: recusa, tom: 'erro' });
      return;
    }
    const resultado = await mover(lead.id, desfecho);
    if (!resultado.ok) {
      setAviso({ texto: resultado.motivo, tom: 'erro' });
      return;
    }
    setDetalhe(null);
    setAviso({
      texto:
        desfecho === 'atendido'
          ? `Consulta de ${lead.nome} registrada como realizada.`
          : `${lead.nome} registrado como falta. O crédito não volta — a reunião foi entregue.`,
    });
  }

  async function tentarMover(lead: Lead, destino: LeadStatus) {
    const recusa = motivoParaRecusarMovimento(lead, destino);
    if (recusa) {
      setAviso({ texto: recusa, tom: 'erro' });
      return;
    }
    const resultado = await mover(lead.id, destino);
    if (!resultado.ok) {
      setAviso({ texto: resultado.motivo, tom: 'erro' });
      return;
    }
    setAviso({ texto: `${lead.nome} → ${LEAD_STATUS_LABEL[destino]}.` });
  }

  function soltarEm(destino: LeadStatus) {
    setColunaAlvo(null);
    const id = arrastando;
    setArrastando(null);
    if (!id) return;
    const l = leads.find((x) => x.id === id);
    if (l) tentarMover(l, destino);
  }

  /**
   * LED-R09 — agendamento manual, com ou sem entrega exclusiva. Mesma régua
   * que a automação já aplica no banco (`motivoParaNaoAgendarManualmente`
   * espelha `registrar_agendamento`), então o que passa aqui também passaria
   * lá — a diferença é só quem aciona.
   */
  function agendarManualmente(lead: Lead, reuniaoEm: string, direcionadoPara: string | null) {
    const recusa = motivoParaNaoAgendarManualmente(lead, reuniaoEm);
    if (recusa) {
      setAviso({ texto: recusa, tom: 'erro' });
      return;
    }
    agendar(lead.id, reuniaoEm, direcionadoPara);
    const nomeExclusivo = direcionadoPara ? nomeDoAdvogado[direcionadoPara] : null;
    setAviso({
      texto: nomeExclusivo
        ? `${lead.nome} agendado — entrega exclusiva para ${nomeExclusivo}.`
        : `${lead.nome} agendado e publicado no catálogo.`,
    });
  }

  /** Etapa de desfecho escolhida no filtro: sem isso o resultado fica escondido. */
  function selecionarEtapa(valor: string) {
    setFiltroEtapa(valor as LeadStatus | '');
    if (valor && (DESFECHOS as string[]).includes(valor)) {
      setMostrarDesfechos(true);
    }
  }

  /** Só administrador — a função no banco recusa lead vendido ou já ligado (INV-13). */
  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const lead = paraExcluir;
    setParaExcluir(null);
    const resultado = await excluir(lead.id);
    if (!resultado.ok) {
      setAviso({ texto: resultado.motivo, tom: 'erro' });
      return;
    }
    if (detalhe?.id === lead.id) setDetalhe(null);
    setAviso({ texto: `${lead.nome} excluído.` });
  }

  const temFiltro = Boolean(busca || filtroTese || filtroEtapa || filtroOrigem || filtroUf);

  function limparFiltros() {
    setBusca('');
    setFiltroTese('');
    setFiltroEtapa('');
    setFiltroOrigem('');
    setFiltroUf('');
  }

  return (
    <div className="flex flex-col h-full">
      {erro && (
        <div className="shrink-0 px-4 sm:px-6 pt-6">
          <AvisoErro erro={erro} aoTentarNovamente={recarregar} />
        </div>
      )}
      {/* Cabeçalho ------------------------------------------------------- */}
      <div className="shrink-0 px-4 sm:px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="titulo-pagina">{ehAdvogado ? 'Catálogo de leads' : 'Leads'}</h1>
            <p className="subtitulo-pagina mt-1">
              {ehAdvogado
                ? 'Pessoas já qualificadas, com reunião pronta para ser confirmada. O telefone é liberado na compra.'
                : 'Do formulário preenchido à consulta realizada. É o agendamento que transforma o lead em produto.'}
            </p>
          </div>

          {!ehAdvogado && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarNovoLead(true)}
                className="btn btn-primario gap-1.5"
              >
                <Plus className="size-4" />
                Novo lead
              </button>
              <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
                <BotaoVisao ativo={visao === 'kanban'} aoClicar={() => setVisao('kanban')} rotulo="Kanban">
                  <KanbanSquare className="size-4" />
                </BotaoVisao>
                <BotaoVisao ativo={visao === 'tabela'} aoClicar={() => setVisao('tabela')} rotulo="Tabela">
                  <Table2 className="size-4" />
                </BotaoVisao>
              </div>
            </div>
          )}
        </div>

        {/* Chips ---------------------------------------------------------- */}
        <div className="flex flex-wrap gap-2 mb-3">
          {ehAdvogado ? (
            <>
              <Chip valor={chips.catalogo} rotulo="disponíveis para você" tom="marca" />
              <Chip
                valor={daCarteira.filter((l) => l.compradoPor === advogadoId).length}
                rotulo="leads seus"
                tom="sucesso"
              />
              <Chip
                valor={advogadoDoPerfil?.saldoCreditos ?? 0}
                rotulo="créditos no saldo"
                tom={advogadoDoPerfil?.saldoCreditos === 0 ? 'erro' : 'neutro'}
              />
            </>
          ) : (
            <>
              <Chip valor={chips.naFila} rotulo="na fila da IA" />
              <Chip
                valor={chips.perdidos}
                rotulo="perdidos"
                tom={chips.perdidos > 0 ? 'erro' : 'neutro'}
                titulo="Mais de 3 dias sem sair de 'novo' — não entraram em qualificação a tempo (LED-R10)."
              />
              <Chip valor={chips.catalogo} rotulo="no catálogo" tom="marca" />
              <Chip
                valor={chips.vencendo}
                rotulo="vencem em 48h"
                tom={chips.vencendo > 0 ? 'erro' : 'neutro'}
                titulo="Agendados sem comprador. Passada a hora marcada, o lead não vale mais nada."
              />
              <Chip valor={chips.vendidos} rotulo="vendidos" tom="sucesso" />
              <Chip
                valor={chips.semGravacao}
                rotulo="vendidos sem gravação"
                tom={chips.semGravacao > 0 ? 'atencao' : 'neutro'}
                titulo="Sem gravação não há como provar como o cliente foi direcionado (QUA-R03)."
              />
            </>
          )}
        </div>

        {/* Filtros -------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-52 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, cidade ou resumo…"
              aria-label="Buscar leads"
              className="campo pl-9"
            />
          </div>

          <select
            value={filtroTese}
            onChange={(e) => setFiltroTese(e.target.value)}
            aria-label="Filtrar por tese"
            className="campo w-auto"
          >
            <option value="">Todas as teses</option>
            {TESES.map((t) => (
              <option key={t.id} value={t.id}>
                {TESE_CURTA[t.id]}
              </option>
            ))}
          </select>

          <select
            value={filtroEtapa}
            onChange={(e) => selecionarEtapa(e.target.value)}
            aria-label="Filtrar por etapa"
            className="campo w-auto"
          >
            <option value="">Todas as etapas</option>
            {COLUNAS.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
            {ETAPAS_DESFECHO_FILTRAVEIS.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value as OrigemLead | '')}
            aria-label="Filtrar por origem"
            className="campo w-auto"
          >
            <option value="">Todas as origens</option>
            {Object.entries(ORIGEM_LEAD_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>

          {ufsDisponiveis.length > 1 && (
            <select
              value={filtroUf}
              onChange={(e) => setFiltroUf(e.target.value)}
              aria-label="Filtrar por UF"
              className="campo w-auto"
            >
              <option value="">Todas as UFs</option>
              {ufsDisponiveis.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          )}

          {/* Filtro próprio, não uma opção de etapa: exclui, independente de
              "Encerrados" estar aberto — é o que faz a diferença entre "só
              mostrar" e "tirar do caminho". */}
          {!ehAdvogado && naoAtendidas > 0 && (
            <label className="flex items-center gap-1.5 text-[12px] text-stone-600 select-none">
              <input
                type="checkbox"
                checked={ocultarNaoAtendidas}
                onChange={(e) => setOcultarNaoAtendidas(e.target.checked)}
                className="accent-roxo-600"
              />
              Ocultar não atendidas ({naoAtendidas})
            </label>
          )}

          {/* Conta pelo total, não pelo filtrado — senão um funil só de "não
              atendida" faz o botão sumir e leva a checkbox de revelar junto. */}
          {!ehAdvogado && desfechosTodos.length > 0 && (
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
            <button type="button" onClick={limparFiltros} className="btn btn-fantasma px-3 gap-1.5">
              <X className="size-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo --------------------------------------------------------- */}
      {ehAdvogado ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-24">
          <CatalogoAdvogado leads={filtrados} advogado={advogadoDoPerfil} aoAbrir={abrirDetalhe} />
        </div>
      ) : visao === 'kanban' ? (
        <div className="flex-1 min-h-0 overflow-x-auto px-4 sm:px-6 pb-6">
          <div className="flex gap-3 h-full min-w-max">
            {perdidos.length > 0 && (
              <section className="w-72 shrink-0 flex flex-col rounded-xl border border-erro-200 bg-erro-50/40">
                <header className="shrink-0 px-3 py-2.5 border-b border-erro-200/70">
                  <div className="flex items-center gap-2">
                    <span className="ponto-estado size-2 bg-erro-400" />
                    <h2 className="text-[12px] font-semibold text-roxo-900">Perdidos</h2>
                    <span className="ml-auto text-[11px] text-stone-500 tabular">{perdidos.length}</span>
                  </div>
                  <div className="nota mt-0.5">Mais de {DIAS_PARA_PERDER} dias sem sair de "Novo"</div>
                </header>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {perdidos.map((l) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      compradorNome={null}
                      arrastavel
                      aoIniciarArraste={() => setArrastando(l.id)}
                      aoTerminarArraste={() => {
                        setArrastando(null);
                        setColunaAlvo(null);
                      }}
                      aoAbrirMenu={(e) => {
                        e.preventDefault();
                        setMenu({ lead: l, x: e.clientX, y: e.clientY });
                      }}
                      aoAbrir={() => abrirDetalhe(l)}
                    />
                  ))}
                </div>
              </section>
            )}

            {COLUNAS.map((coluna) => {
              const cartoes =
                coluna === 'novo'
                  ? noQuadro.filter((l) => l.status === coluna && !estaPerdido(l))
                  : noQuadro.filter((l) => l.status === coluna);
              const creditos = cartoes.reduce((s, l) => s + l.custoCreditos, 0);
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
                        {LEAD_STATUS_LABEL[coluna]}
                      </h2>
                      <span className="ml-auto text-[11px] text-stone-500 tabular">
                        {cartoes.length}
                      </span>
                    </div>
                    <div className="nota tabular mt-0.5">{creditos} créditos</div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {cartoes.map((l) => (
                      <LeadCard
                        key={l.id}
                        lead={l}
                        compradorNome={l.compradoPor ? nomeDoAdvogado[l.compradoPor] : null}
                        arrastavel
                        aoIniciarArraste={() => setArrastando(l.id)}
                        aoTerminarArraste={() => {
                          setArrastando(null);
                          setColunaAlvo(null);
                        }}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ lead: l, x: e.clientX, y: e.clientY });
                        }}
                        aoAbrir={() => abrirDetalhe(l)}
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
                  <div className="nota mt-0.5">Desqualificados, faltas e devolvidos</div>
                </header>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {desfechos.map((l) => (
                    <div key={l.id} className="opacity-70">
                      <LeadCard
                        lead={l}
                        compradorNome={l.compradoPor ? nomeDoAdvogado[l.compradoPor] : null}
                        arrastavel={false}
                        aoIniciarArraste={() => {}}
                        aoTerminarArraste={() => {}}
                        aoAbrirMenu={(e) => {
                          e.preventDefault();
                          setMenu({ lead: l, x: e.clientX, y: e.clientY });
                        }}
                        aoAbrir={() => abrirDetalhe(l)}
                      />
                      <div className="nota px-3 pt-1">
                        {LEAD_STATUS_LABEL[l.status]}
                        {l.motivoDesqualificacao && ` · ${l.motivoDesqualificacao}`}
                        {l.devolucao && ` · devolvido: ${l.devolucao.motivo}`}
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
          <TabelaLeads
            leads={mostrarDesfechos ? [...noQuadro, ...desfechos] : noQuadro}
            nomeDoAdvogado={nomeDoAdvogado}
            aoAbrirMenu={(l, e) => setMenu({ lead: l, x: e.clientX, y: e.clientY })}
            aoAbrir={abrirDetalhe}
          />
        </div>
      )}

      {!ehAdvogado && (
        <p className="nota shrink-0 px-4 sm:px-6 pb-3">
          {visao === 'kanban'
            ? 'Arraste o cartão para mudar de etapa, clique para abrir, ou use o botão direito para o menu.'
            : 'Clique na linha para abrir o lead. As colunas ordenam ao clicar no título.'}
        </p>
      )}

      {/* Sobreposições ---------------------------------------------------- */}
      {menu && (
        <MenuCartao
          titulo={menu.lead.nome}
          statusAtual={menu.lead.status}
          colunas={COLUNAS}
          desfechos={DESFECHOS}
          rotulos={LEAD_STATUS_LABEL}
          motivoParaRecusar={(destino) => motivoParaRecusarMovimento(menu.lead, destino)}
          x={menu.x}
          y={menu.y}
          aoFechar={() => setMenu(null)}
          aoMover={(destino) => {
            setMenu(null);
            tentarMover(menu.lead, destino);
          }}
          acoes={
            perfil.role === 'adm' ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const lead = menu.lead;
                  setMenu(null);
                  setParaExcluir(lead);
                }}
                className="item-menu text-erro-700 hover:bg-erro-50"
              >
                <Trash2 size={14} className="inline -mt-0.5 mr-1.5" />
                Excluir
              </button>
            ) : undefined
          }
        />
      )}

      {paraExcluir && (
        <ConfirmarExclusao
          lead={paraExcluir}
          aoCancelar={() => setParaExcluir(null)}
          aoConfirmar={confirmarExclusao}
        />
      )}

      {mostrarNovoLead && (
        <NovoLeadDialog
          leads={leads}
          aoFechar={() => setMostrarNovoLead(false)}
          aoCriar={(lead) => {
            setMostrarNovoLead(false);
            setAviso({ texto: `${lead.nome} cadastrado.` });
            setDetalhe(lead);
          }}
        />
      )}

      {detalhe && (
        <LeadDrawer
          lead={leads.find((l) => l.id === detalhe.id) ?? detalhe}
          advogado={advogadoDoPerfil}
          compradorNome={detalhe.compradoPor ? nomeDoAdvogado[detalhe.compradoPor] : null}
          aoFechar={fecharDetalhe}
          aoComprar={comprarLead}
          aoDevolver={devolverLead}
          aoEncerrar={encerrarReuniao}
          aoAgendar={agendarManualmente}
        />
      )}

      <Toast aviso={aviso} aoFechar={() => setAviso(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function ConfirmarExclusao({
  lead,
  aoCancelar,
  aoConfirmar,
}: {
  lead: Lead;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoCancelar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  return (
    <div className="pilha-dialogo grid place-items-center p-4">
      <button type="button" aria-label="Cancelar" onClick={aoCancelar} className="veu" />
      <div role="alertdialog" aria-modal="true" className="dialogo max-w-md p-6">
        <h2 className="text-[15px] font-semibold text-roxo-900">Excluir {lead.nome}?</h2>
        <p className="text-[13px] text-stone-600 mt-2 leading-relaxed">
          Não é devolução: o lead some da base, sem crédito para devolver. Só funciona porque este
          lead nunca foi vendido nem teve ligação registrada — nesses casos o registro é protegido
          (INV-13). Não é reversível.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={aoCancelar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button type="button" onClick={aoConfirmar} autoFocus className="btn btn-perigo">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

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
      className={`btn h-11 px-3 gap-1.5 ${
        ativo ? 'bg-roxo-100 text-roxo-800' : 'text-stone-500 hover:text-roxo-800'
      }`}
    >
      {children}
      <span className="hidden sm:inline">{rotulo}</span>
    </button>
  );
}
