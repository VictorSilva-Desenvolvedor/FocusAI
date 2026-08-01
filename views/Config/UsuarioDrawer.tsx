import { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import {
  DEPARTAMENTOS,
  PERMISSAO_LABEL,
  ROLE_CURTO,
  TODAS_PERMISSOES,
  acessoDoPapel,
  iniciais,
  papeisQuePodeCriar,
  permissoesPadrao,
  temErro,
  ultimoAdminAtivo,
  validarUsuario,
  type ErrosUsuario,
} from '@/src/lib/usuarios';
import { ESTILO_BLOCO, ESTILO_CHIP, ESTILO_TEXTO } from '@/src/lib/estilo';
import type { NamedPermission, UserRole, Usuario, UsuarioFormData } from '@/types';

const VAZIO: UsuarioFormData = {
  nome: '',
  email: '',
  role: '' as UserRole,
  departamento: '',
  permissoes: [],
};

interface Props {
  /** Usuário em edição, ou null para criação. */
  editando: Usuario | null;
  aoFechar: () => void;
  aoSalvar: (mensagem: string) => void;
}

export function UsuarioDrawer({ editando, aoFechar, aoSalvar }: Props) {
  const { perfil } = useAuth();
  const { usuarios, criar, atualizar } = useUsuarios();
  const idBase = useId();

  const [dados, setDados] = useState<UsuarioFormData>(() =>
    editando
      ? {
          nome: editando.nome,
          email: editando.email,
          role: editando.role,
          departamento: editando.departamento ?? '',
          permissoes: [...editando.permissoes],
        }
      : VAZIO,
  );
  const [erros, setErros] = useState<ErrosUsuario>({});
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const papeisPermitidos = papeisQuePodeCriar(perfil);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  // Revalida a cada tecla, mas só depois da primeira tentativa de salvar —
  // marcar campo em vermelho antes de a pessoa terminar de digitar é ruído.
  useEffect(() => {
    if (!tentouSalvar) return;
    setErros(validarUsuario(dados, { usuarios, ator: perfil, editandoId: editando?.id }));
  }, [dados, tentouSalvar, usuarios, perfil, editando]);

  const acesso = useMemo(
    () => (dados.role ? acessoDoPapel(dados.role, dados.permissoes) : []),
    [dados.role, dados.permissoes],
  );

  /** Avisos não bloqueiam o salvamento — apontam armadilha conhecida. */
  const avisos = useMemo(() => {
    const lista: string[] = [];

    if (
      dados.permissoes.includes('conformidade:liberar_com_ressalva') &&
      dados.departamento.trim().toLowerCase() !== 'conformidade'
    ) {
      lista.push(
        'A permissão "Liberar com ressalva" não terá efeito: ela é gate por departamento (Conformidade), não por papel (CNF-R21).',
      );
    }

    if (dados.role && acesso.length <= 1) {
      lista.push(
        'Este papel só enxerga o Dashboard. Se a pessoa precisa trabalhar em algum módulo, marque a permissão correspondente.',
      );
    }

    if (
      editando &&
      editando.role === 'adm' &&
      dados.role !== 'adm' &&
      ultimoAdminAtivo(usuarios, editando.id)
    ) {
      lista.push(
        'Este é o último administrador ativo. Rebaixar o papel deixa o sistema sem ninguém capaz de criar contas.',
      );
    }

    return lista;
  }, [dados, acesso, editando, usuarios]);

  const bloqueado =
    editando != null &&
    editando.role === 'adm' &&
    dados.role !== 'adm' &&
    ultimoAdminAtivo(usuarios, editando.id);

  function alterarPapel(role: UserRole) {
    // Trocar de papel repõe as permissões padrão do novo papel. Manter as do
    // papel anterior é como um acesso indevido sobrevive a uma mudança de
    // função sem ninguém notar.
    setDados((d) => ({ ...d, role, permissoes: permissoesPadrao(role) }));
  }

  function alternarPermissao(p: NamedPermission) {
    setDados((d) => ({
      ...d,
      permissoes: d.permissoes.includes(p)
        ? d.permissoes.filter((x) => x !== p)
        : [...d.permissoes, p],
    }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setTentouSalvar(true);

    const novosErros = validarUsuario(dados, {
      usuarios,
      ator: perfil,
      editandoId: editando?.id,
    });
    setErros(novosErros);
    if (temErro(novosErros) || bloqueado) return;

    if (editando) {
      atualizar(editando.id, dados);
      aoSalvar(`${dados.nome.trim()} atualizado.`);
    } else {
      criar(dados, perfil.id);
      aoSalvar(`${dados.nome.trim()} cadastrado. Convite pendente de primeiro acesso.`);
    }
    aoFechar();
  }

  return (
    <div className="pilha-dialogo flex justify-end">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="veu" />

      <form
        onSubmit={submeter}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        className="gaveta max-w-xl"
      >
        <header className="shrink-0 flex items-start gap-3 px-6 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <h2 id={`${idBase}-titulo`} className="text-[15px] font-semibold text-roxo-900">
              {editando ? 'Editar usuário' : 'Novo usuário'}
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              {editando
                ? 'Data de criação, autor e último acesso não são reescritos.'
                : 'A conta nasce como convite pendente e vira ativa no primeiro acesso.'}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="btn-icone ml-auto"
          >
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Identificação ------------------------------------------------ */}
          <section className="space-y-4">
            <Campo
              id={`${idBase}-nome`}
              rotulo="Nome completo"
              erro={erros.nome}
              dica="As iniciais do avatar saem daqui."
            >
              <div className="flex items-center gap-3">
                <input
                  id={`${idBase}-nome`}
                  value={dados.nome}
                  onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
                  autoFocus
                  autoComplete="off"
                  className={entrada(erros.nome)}
                  placeholder="Ana Ribeiro"
                />
                <div
                  aria-hidden
                  className={`size-9 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold transition-colors ${
                    dados.nome.trim()
                      ? 'bg-roxo-600 text-white'
                      : 'bg-stone-100 text-stone-300 border border-dashed border-stone-300'
                  }`}
                >
                  {dados.nome.trim() ? iniciais(dados.nome) : '··'}
                </div>
              </div>
            </Campo>

            <Campo id={`${idBase}-email`} rotulo="E-mail" erro={erros.email}>
              <input
                id={`${idBase}-email`}
                type="email"
                value={dados.email}
                onChange={(e) => setDados((d) => ({ ...d, email: e.target.value }))}
                autoComplete="off"
                className={entrada(erros.email)}
                placeholder="ana@agencia.com.br"
              />
            </Campo>
          </section>

          {/* Papel e departamento ----------------------------------------- */}
          <section className="space-y-4 pt-5 border-t border-stone-100">
            <Campo
              id={`${idBase}-role`}
              rotulo="Papel"
              erro={erros.role}
              dica="Você só atribui papéis que teria permissão de criar."
            >
              <select
                id={`${idBase}-role`}
                value={dados.role}
                onChange={(e) => alterarPapel(e.target.value as UserRole)}
                className={entrada(erros.role)}
              >
                <option value="">Selecione…</option>
                {papeisPermitidos.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_CURTO[r]}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              id={`${idBase}-depto`}
              rotulo="Departamento"
              erro={erros.departamento}
              dica="Texto livre, mas algumas regras dependem do valor exato."
            >
              <input
                id={`${idBase}-depto`}
                list={`${idBase}-deptos`}
                value={dados.departamento}
                onChange={(e) => setDados((d) => ({ ...d, departamento: e.target.value }))}
                autoComplete="off"
                className={entrada(erros.departamento)}
                placeholder="Tráfego"
              />
              <datalist id={`${idBase}-deptos`}>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Campo>
          </section>

          {/* Permissões nomeadas ------------------------------------------ */}
          <section className="pt-5 border-t border-stone-100">
            <h3 className="text-[13px] font-semibold text-roxo-900">Permissões nomeadas</h3>
            <p className="subtitulo-pagina text-[12px] mt-0.5 mb-3">
              Independentes do papel. Trocar o papel repõe os padrões dele.
            </p>

            <ul className="space-y-1.5">
              {TODAS_PERMISSOES.map((p) => {
                const marcada = dados.permissoes.includes(p);
                return (
                  <li key={p}>
                    <label
                      className={`flex gap-2.5 items-start rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        marcada
                          ? 'border-roxo-300 bg-roxo-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => alternarPermissao(p)}
                        className="mt-0.5 size-4 shrink-0 accent-roxo-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-roxo-900">
                          {PERMISSAO_LABEL[p].rotulo}
                        </span>
                        <span className="block text-[11px] text-stone-500 leading-snug">
                          {PERMISSAO_LABEL[p].efeito}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Prévia de acesso --------------------------------------------- */}
          {dados.role && (
            <section className="pt-5 border-t border-stone-100">
              <h3 className="text-[13px] font-semibold text-roxo-900">O que esta conta enxerga</h3>
              <p className="subtitulo-pagina text-[12px] mt-0.5 mb-3">
                Papel novo não herda acesso — o que não estiver aqui fica bloqueado.
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {acesso.map((m) => (
                  <li
                    key={m.rotulo}
                    className={`flex items-center gap-1.5 text-[12px] rounded-lg border px-2.5 py-1.5 ${
                      m.nivel === 'full'
                        ? `${ESTILO_CHIP.sucesso}`
                        : 'border-stone-200 bg-stone-50 text-stone-600'
                    }`}
                  >
                    {m.nivel === 'full' && <Check className="size-3.5 shrink-0" />}
                    {m.rotulo}
                    {m.nivel === 'restricted' && <span className="nota text-[10px]">parcial</span>}
                    {m.viaPermissao && (
                      <span
                        className={`text-[10px] ${ESTILO_TEXTO.marca}`}
                        title="Liberado por permissão nomeada, não pelo papel"
                      >
                        via permissão
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Avisos -------------------------------------------------------- */}
          {avisos.length > 0 && (
            <ul className="space-y-2">
              {avisos.map((aviso) => (
                <li
                  key={aviso}
                  className={`flex gap-2.5 rounded-lg border p-3 ${ESTILO_BLOCO.atencao}`}
                >
                  <AlertTriangle className={`size-4 shrink-0 mt-0.5 ${ESTILO_TEXTO.atencao}`} />
                  <span className="text-[12px] text-atencao-900 leading-snug">{aviso}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 flex items-center gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50">
          {editando && (
            <span className="nota flex items-center gap-1.5 min-w-0">
              <Info className="size-3.5 shrink-0" />
              <span className="truncate">Alterações passam a valer no próximo acesso.</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button type="button" onClick={aoFechar} className="btn btn-fantasma">
              Cancelar
            </button>
            <button type="submit" disabled={bloqueado} className="btn btn-primario">
              {editando ? 'Salvar alterações' : 'Cadastrar usuário'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------

function entrada(erro?: string): string {
  return erro ? 'campo campo-invalido' : 'campo';
}

function Campo({
  id,
  rotulo,
  erro,
  dica,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="campo-rotulo">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p className="campo-mensagem-erro">{erro}</p>
      ) : dica ? (
        <p className="campo-dica">{dica}</p>
      ) : null}
    </div>
  );
}
