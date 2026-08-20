import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  MailCheck,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { AvisoErro } from '@/src/components/ui/AvisoErro';
import { formatarData, tempoRelativo } from '@/src/lib/format';
import {
  ROLE_CURTO,
  acessoDoPapel,
  motivoParaNaoGerenciar,
  podeCriarUsuario,
  podeGerenciar,
  ultimoAdminAtivo,
} from '@/src/lib/usuarios';
import { ESTILO_CHIP, ESTILO_TEXTO, type Tom } from '@/src/lib/estilo';
import { USER_STATUS_LABEL, type UserRole, type UserStatus, type Usuario } from '@/types';
import { UsuarioDrawer } from './UsuarioDrawer';

type Coluna = 'nome' | 'role' | 'status' | 'ultimo_acesso' | 'criado_em';
type Direcao = 'asc' | 'desc';

const TOM_STATUS: Record<UserStatus, Tom> = {
  ativo: 'sucesso',
  convite_pendente: 'atencao',
  inativo: 'neutro',
};

export function UsuariosView() {
  const { perfil } = useAuth();
  const { usuarios, alterarStatus, erro, recarregar } = useUsuarios();

  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<UserRole | ''>('');
  const [filtroStatus, setFiltroStatus] = useState<UserStatus | ''>('');
  const [filtroDepto, setFiltroDepto] = useState('');
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({
    coluna: 'nome',
    direcao: 'asc',
  });
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<{ aberto: boolean; editando: Usuario | null }>({
    aberto: false,
    editando: null,
  });
  const [confirmacao, setConfirmacao] = useState<{ ids: string[]; status: UserStatus } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const departamentos = useMemo(
    () => [...new Set(usuarios.map((u) => u.departamento).filter((d): d is string => !!d))].sort(),
    [usuarios],
  );

  const contadores = useMemo(
    () => ({
      total: usuarios.length,
      ativo: usuarios.filter((u) => u.status === 'ativo').length,
      convite_pendente: usuarios.filter((u) => u.status === 'convite_pendente').length,
      inativo: usuarios.filter((u) => u.status === 'inativo').length,
    }),
    [usuarios],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = usuarios.filter((u) => {
      if (filtroPapel && u.role !== filtroPapel) return false;
      if (filtroStatus && u.status !== filtroStatus) return false;
      if (filtroDepto && u.departamento !== filtroDepto) return false;
      if (!termo) return true;
      return (
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.departamento ?? '').toLowerCase().includes(termo)
      );
    });

    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      switch (ordem.coluna) {
        case 'nome':
          return sinal * a.nome.localeCompare(b.nome, 'pt-BR');
        case 'role':
          return sinal * ROLE_CURTO[a.role].localeCompare(ROLE_CURTO[b.role], 'pt-BR');
        case 'status':
          return sinal * a.status.localeCompare(b.status);
        // Nunca acessou vai para o fim em ordem crescente, não para o começo.
        case 'ultimo_acesso':
          if (!a.ultimo_acesso) return 1;
          if (!b.ultimo_acesso) return -1;
          return sinal * (Date.parse(a.ultimo_acesso) - Date.parse(b.ultimo_acesso));
        case 'criado_em':
          return sinal * (Date.parse(a.criado_em) - Date.parse(b.criado_em));
      }
    });
  }, [usuarios, busca, filtroPapel, filtroStatus, filtroDepto, ordem]);

  /** Só entra na seleção quem o ator pode de fato gerenciar. */
  const selecionaveis = useMemo(
    () => filtrados.filter((u) => podeGerenciar(perfil, u)),
    [filtrados, perfil],
  );

  const selecionados = useMemo(
    () => selecionaveis.filter((u) => selecao.has(u.id)),
    [selecionaveis, selecao],
  );

  const temFiltro = Boolean(busca || filtroPapel || filtroStatus || filtroDepto);
  const podeCriar = podeCriarUsuario(perfil);

  function ordenarPor(coluna: Coluna) {
    setOrdem((o) =>
      o.coluna === coluna
        ? { coluna, direcao: o.direcao === 'asc' ? 'desc' : 'asc' }
        : { coluna, direcao: 'asc' },
    );
  }

  function limparFiltros() {
    setBusca('');
    setFiltroPapel('');
    setFiltroStatus('');
    setFiltroDepto('');
  }

  function alternarTodos() {
    setSelecao((s) =>
      selecionados.length === selecionaveis.length && selecionaveis.length > 0
        ? new Set([...s].filter((id) => !selecionaveis.some((u) => u.id === id)))
        : new Set([...s, ...selecionaveis.map((u) => u.id)]),
    );
  }

  function alternarUm(id: string) {
    setSelecao((s) => {
      const nova = new Set(s);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function pedirMudancaStatus(ids: string[], status: UserStatus) {
    if (status === 'inativo') {
      const bloqueados = ids.filter((id) => ultimoAdminAtivo(usuarios, id));
      if (bloqueados.length > 0) {
        setToast('Não dá para desativar o último administrador ativo.');
        return;
      }
      setConfirmacao({ ids, status });
      return;
    }
    void aplicarMudancaStatus(ids, status);
  }

  async function aplicarMudancaStatus(ids: string[], status: UserStatus) {
    const n = ids.length;
    const r = await alterarStatus(ids, status);
    setSelecao(new Set());
    setConfirmacao(null);

    if (!r.ok) {
      setToast(r.motivo);
      return;
    }

    setToast(
      status === 'inativo'
        ? `${n} ${n === 1 ? 'conta desativada' : 'contas desativadas'}. O histórico foi preservado.`
        : `${n} ${n === 1 ? 'conta reativada' : 'contas reativadas'}.`,
    );
  }

  function exportarCsv() {
    const cabecalho = [
      'Nome',
      'E-mail',
      'Papel',
      'Departamento',
      'Status',
      'Criado em',
      'Último acesso',
    ];
    const linhas = filtrados.map((u) => [
      u.nome,
      u.email,
      ROLE_CURTO[u.role],
      u.departamento ?? '',
      USER_STATUS_LABEL[u.status],
      formatarData(u.criado_em),
      u.ultimo_acesso ? formatarData(u.ultimo_acesso) : 'nunca',
    ]);

    const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [cabecalho, ...linhas].map((l) => l.map(escapar).join(';')).join('\r\n');

    // O BOM faz o Excel em pt-BR abrir os acentos corretamente.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`${filtrados.length} ${filtrados.length === 1 ? 'linha' : 'linhas'} exportadas.`);
  }

  return (
    <div>
      {erro && (
        <div className="mb-5">
          <AvisoErro erro={erro} aoTentarNovamente={recarregar} />
        </div>
      )}
      {/* Cabeçalho ------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="titulo-pagina">Usuários</h1>
          <p className="subtitulo-pagina mt-1">
            Contas nunca são autocriadas — sempre criadas por alguém acima.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ aberto: true, editando: null })}
          disabled={!podeCriar}
          title={podeCriar ? undefined : 'Seu papel não cria contas.'}
          className="btn btn-primario"
        >
          <Plus className="size-4" />
          Novo usuário
        </button>
      </div>

      {/* Contadores clicáveis --------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <CardContador
          rotulo="Total"
          valor={contadores.total}
          ativo={filtroStatus === ''}
          aoClicar={() => setFiltroStatus('')}
        />
        <CardContador
          rotulo="Ativos"
          valor={contadores.ativo}
          cor={ESTILO_TEXTO.sucesso}
          ativo={filtroStatus === 'ativo'}
          aoClicar={() => setFiltroStatus(filtroStatus === 'ativo' ? '' : 'ativo')}
        />
        <CardContador
          rotulo="Convites pendentes"
          valor={contadores.convite_pendente}
          cor={ESTILO_TEXTO.atencao}
          ativo={filtroStatus === 'convite_pendente'}
          aoClicar={() =>
            setFiltroStatus(filtroStatus === 'convite_pendente' ? '' : 'convite_pendente')
          }
        />
        <CardContador
          rotulo="Inativos"
          valor={contadores.inativo}
          cor={ESTILO_TEXTO.neutro}
          ativo={filtroStatus === 'inativo'}
          aoClicar={() => setFiltroStatus(filtroStatus === 'inativo' ? '' : 'inativo')}
        />
      </div>

      {/* Filtros ---------------------------------------------------------- */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou departamento…"
            aria-label="Buscar usuários"
            className="campo campo-filtro pl-9"
          />
        </div>

        <select
          value={filtroPapel}
          onChange={(e) => setFiltroPapel(e.target.value as UserRole | '')}
          aria-label="Filtrar por papel"
          className={seletor}
        >
          <option value="">Todos os papéis</option>
          {[...new Set(usuarios.map((u) => u.role))].map((r) => (
            <option key={r} value={r}>
              {ROLE_CURTO[r]}
            </option>
          ))}
        </select>

        <select
          value={filtroDepto}
          onChange={(e) => setFiltroDepto(e.target.value)}
          aria-label="Filtrar por departamento"
          className={seletor}
        >
          <option value="">Todos os departamentos</option>
          {departamentos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {temFiltro && (
          <button
            type="button"
            onClick={limparFiltros}
            className="btn btn-fantasma px-3 gap-1.5"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        )}

        <button
          type="button"
          onClick={exportarCsv}
          disabled={filtrados.length === 0}
          className="btn btn-fantasma px-3 gap-1.5"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>

      {/* Ações em massa --------------------------------------------------- */}
      {selecionados.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 rounded-lg border border-roxo-200 bg-roxo-50 px-4 py-2.5">
          <span className="text-[13px] font-medium text-roxo-900">
            {selecionados.length} {selecionados.length === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                pedirMudancaStatus(
                  selecionados.map((u) => u.id),
                  'ativo',
                )
              }
              className="btn h-11 px-3 text-roxo-700 hover:bg-white"
            >
              Reativar
            </button>
            <button
              type="button"
              onClick={() =>
                pedirMudancaStatus(
                  selecionados.map((u) => u.id),
                  'inativo',
                )
              }
              className="btn h-11 px-3 text-erro-700 hover:bg-white"
            >
              Desativar
            </button>
            <button
              type="button"
              onClick={() => setSelecao(new Set())}
              aria-label="Limpar seleção"
              className="btn-icone text-stone-500 hover:bg-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabela ----------------------------------------------------------- */}
      <div className="card overflow-hidden">
        {filtrados.length === 0 ? (
          <EstadoVazio temFiltro={temFiltro} aoLimpar={limparFiltros} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-[13px]">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60">
                  <th className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={
                        selecionaveis.length > 0 && selecionados.length === selecionaveis.length
                      }
                      ref={(el) => {
                        if (el) {
                          el.indeterminate =
                            selecionados.length > 0 && selecionados.length < selecionaveis.length;
                        }
                      }}
                      onChange={alternarTodos}
                      disabled={selecionaveis.length === 0}
                      className="size-4 accent-roxo-600"
                    />
                  </th>
                  <Cabecalho coluna="nome" ordem={ordem} aoOrdenar={ordenarPor}>
                    Usuário
                  </Cabecalho>
                  <Cabecalho coluna="role" ordem={ordem} aoOrdenar={ordenarPor}>
                    Papel
                  </Cabecalho>
                  <th className="text-left font-medium text-[11px] text-stone-500 px-3 py-2.5">
                    Acesso
                  </th>
                  <Cabecalho coluna="status" ordem={ordem} aoOrdenar={ordenarPor}>
                    Status
                  </Cabecalho>
                  <Cabecalho coluna="ultimo_acesso" ordem={ordem} aoOrdenar={ordenarPor}>
                    Último acesso
                  </Cabecalho>
                  <th className="w-24" />
                </tr>
              </thead>

              <tbody>
                {filtrados.map((u) => (
                  <Linha
                    key={u.id}
                    usuario={u}
                    selecionado={selecao.has(u.id)}
                    ehVoce={u.id === perfil.id}
                    motivoBloqueio={motivoParaNaoGerenciar(perfil, u)}
                    aoSelecionar={() => alternarUm(u.id)}
                    aoEditar={() => setDrawer({ aberto: true, editando: u })}
                    aoAlterarStatus={(status) => pedirMudancaStatus([u.id], status)}
                    aoReenviarConvite={() => setToast(`Convite reenviado para ${u.email}.`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="nota mt-3">
        Mostrando {filtrados.length} de {usuarios.length}. Contas desativadas continuam na base — o
        histórico de quem aprovou verba e emitiu parecer precisa continuar apontando para alguém.
      </p>

      {/* Sobreposições ---------------------------------------------------- */}
      {drawer.aberto && (
        <UsuarioDrawer
          editando={drawer.editando}
          aoFechar={() => setDrawer({ aberto: false, editando: null })}
          aoSalvar={setToast}
        />
      )}

      {confirmacao && (
        <ConfirmarDesativacao
          quantidade={confirmacao.ids.length}
          aoCancelar={() => setConfirmacao(null)}
          aoConfirmar={() => void aplicarMudancaStatus(confirmacao.ids, confirmacao.status)}
        />
      )}

      {toast && (
        <div role="status" className="toast bg-grafite-900 max-w-[calc(100vw-2rem)]">
          <CheckCircle2 className="size-4 shrink-0 text-roxo-400" />
          <span className="text-[13px]">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Seletor da barra de filtros: mesma casca do campo, largura pelo conteúdo. */
const seletor = 'campo campo-filtro w-auto';

function CardContador({
  rotulo,
  valor,
  cor = 'text-roxo-900',
  ativo,
  aoClicar,
}: {
  rotulo: string;
  valor: number;
  cor?: string;
  ativo: boolean;
  aoClicar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`card p-3.5 text-left transition-colors ${
        ativo ? 'border-roxo-400 ring-2 ring-roxo-500/15' : 'hover:border-stone-300'
      }`}
    >
      <div className={`text-xl font-semibold tabular ${cor}`}>{valor}</div>
      <div className="text-[12px] text-stone-500 mt-0.5">{rotulo}</div>
    </button>
  );
}

function Cabecalho({
  coluna,
  ordem,
  aoOrdenar,
  children,
}: {
  coluna: Coluna;
  ordem: { coluna: Coluna; direcao: Direcao };
  aoOrdenar: (c: Coluna) => void;
  children: React.ReactNode;
}) {
  const ativa = ordem.coluna === coluna;
  return (
    <th
      className="text-left px-3 py-2.5"
      aria-sort={ativa ? (ordem.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => aoOrdenar(coluna)}
        className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
          ativa ? 'text-roxo-800' : 'text-stone-500 hover:text-roxo-800'
        }`}
      >
        {children}
        {ativa &&
          (ordem.direcao === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          ))}
      </button>
    </th>
  );
}

function Linha({
  usuario,
  selecionado,
  ehVoce,
  motivoBloqueio,
  aoSelecionar,
  aoEditar,
  aoAlterarStatus,
  aoReenviarConvite,
}: {
  usuario: Usuario;
  selecionado: boolean;
  ehVoce: boolean;
  motivoBloqueio: string | null;
  aoSelecionar: () => void;
  aoEditar: () => void;
  aoAlterarStatus: (s: UserStatus) => void;
  aoReenviarConvite: () => void;
}) {
  const gerenciavel = motivoBloqueio === null;
  const modulos = acessoDoPapel(usuario.role, usuario.permissoes);
  const plenos = modulos.filter((m) => m.nivel === 'full');

  // CNF-R21 — a permissão existe mas não terá efeito fora do departamento.
  const ressalvaSemEfeito =
    usuario.permissoes.includes('conformidade:liberar_com_ressalva') &&
    (usuario.departamento ?? '').toLowerCase() !== 'conformidade';

  return (
    <tr
      className={`border-b border-stone-100 last:border-0 transition-colors ${
        usuario.status === 'inativo' ? 'bg-stone-50/40' : 'hover:bg-stone-50/60'
      }`}
    >
      <td className="pl-4">
        <input
          type="checkbox"
          checked={selecionado}
          onChange={aoSelecionar}
          disabled={!gerenciavel}
          aria-label={`Selecionar ${usuario.nome}`}
          className="size-4 accent-roxo-600 disabled:opacity-30"
        />
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`size-8 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold ${
              usuario.status === 'inativo'
                ? 'bg-stone-200 text-stone-500'
                : 'bg-roxo-600 text-white'
            }`}
          >
            {usuario.avatar_iniciais}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-roxo-900 truncate">{usuario.nome}</span>
              {ehVoce && <span className="etiqueta bg-roxo-100 text-roxo-600 shrink-0">você</span>}
            </div>
            <div className="text-[12px] text-stone-500 truncate">{usuario.email}</div>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="text-stone-700 whitespace-nowrap">{ROLE_CURTO[usuario.role]}</div>
        <div className="nota">{usuario.departamento ?? '—'}</div>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-stone-600 tabular whitespace-nowrap">
            {plenos.length} {plenos.length === 1 ? 'módulo' : 'módulos'}
          </span>
          {ressalvaSemEfeito && (
            <span
              title="Tem a permissão de liberar com ressalva, mas está fora do departamento Conformidade — a permissão não tem efeito (CNF-R21)."
              className={ESTILO_TEXTO.atencao}
            >
              <ShieldAlert className="size-3.5" />
            </span>
          )}
        </div>
        <div
          className="nota truncate max-w-48"
          title={plenos.map((m) => m.rotulo).join(' · ') || 'nenhum'}
        >
          {plenos.map((m) => m.rotulo).join(' · ') || 'nenhum'}
        </div>
      </td>

      <td className="px-3 py-3">
        <span className={`etiqueta text-[11px] ${ESTILO_CHIP[TOM_STATUS[usuario.status]]} border`}>
          {USER_STATUS_LABEL[usuario.status]}
        </span>
      </td>

      <td className="px-3 py-3">
        <div className="text-[12px] text-stone-600 whitespace-nowrap">
          {tempoRelativo(usuario.ultimo_acesso)}
        </div>
        <div className="nota whitespace-nowrap">criado {formatarData(usuario.criado_em)}</div>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {usuario.status === 'convite_pendente' && gerenciavel && (
            <button
              type="button"
              onClick={aoReenviarConvite}
              title="Reenviar convite"
              aria-label={`Reenviar convite para ${usuario.nome}`}
              className="btn-icone"
            >
              <MailCheck className="size-4" />
            </button>
          )}

          <button
            type="button"
            onClick={aoEditar}
            disabled={!gerenciavel}
            title={motivoBloqueio ?? 'Editar'}
            aria-label={`Editar ${usuario.nome}`}
            className="btn-icone"
          >
            <Pencil className="size-4" />
          </button>

          {usuario.status === 'inativo' ? (
            <button
              type="button"
              onClick={() => aoAlterarStatus('ativo')}
              disabled={!gerenciavel}
              title={motivoBloqueio ?? 'Reativar'}
              aria-label={`Reativar ${usuario.nome}`}
              className="btn-icone hover:text-sucesso-700"
            >
              <CheckCircle2 className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => aoAlterarStatus('inativo')}
              disabled={!gerenciavel}
              title={motivoBloqueio ?? 'Desativar'}
              aria-label={`Desativar ${usuario.nome}`}
              className="btn-icone hover:text-erro-700"
            >
              <UserRoundX className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EstadoVazio({ temFiltro, aoLimpar }: { temFiltro: boolean; aoLimpar: () => void }) {
  return (
    <div className="py-16 text-center">
      <div className="size-11 mx-auto rounded-xl bg-stone-100 grid place-items-center mb-3">
        <Users className="size-5 text-stone-400" />
      </div>
      <p className="text-[14px] font-medium text-roxo-900">
        {temFiltro ? 'Nenhum usuário com esses filtros' : 'Nenhum usuário cadastrado'}
      </p>
      {temFiltro && (
        <button
          type="button"
          onClick={aoLimpar}
          className="text-[13px] font-medium text-roxo-600 hover:text-roxo-800 transition-colors mt-2"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function ConfirmarDesativacao({
  quantidade,
  aoCancelar,
  aoConfirmar,
}: {
  quantidade: number;
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
        <h2 className="text-[15px] font-semibold text-roxo-900">
          Desativar {quantidade === 1 ? 'esta conta' : `${quantidade} contas`}?
        </h2>
        <p className="text-[13px] text-stone-600 mt-2 leading-relaxed">
          A pessoa perde o acesso imediatamente, mas o registro permanece na base — tudo que ela
          aprovou, emitiu ou deu baixa continua rastreável. É reversível.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={aoCancelar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button type="button" onClick={aoConfirmar} autoFocus className="btn btn-perigo">
            Desativar
          </button>
        </div>
      </div>
    </div>
  );
}
