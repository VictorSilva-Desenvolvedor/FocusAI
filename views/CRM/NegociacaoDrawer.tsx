import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNegociacoes } from '@/src/contexts/NegociacoesContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import {
  CONSELHOS,
  NICHOS_POR_CONSELHO,
  ORIGENS,
  formatarWhatsapp,
  temErro,
  validarNegociacao,
  type ErrosNegociacao,
  type NegociacaoFormData,
} from '@/src/lib/negociacoes';
import type { ConselhoRegulador } from '@/types';

/** Papéis que podem ser responsáveis por uma negociação. */
const PAPEIS_COMERCIAIS = new Set(['closer', 'sdr', 'cs', 'gerente', 'adm', 'parceiro']);

export function NegociacaoDrawer({
  aoFechar,
  aoSalvar,
}: {
  aoFechar: () => void;
  aoSalvar: (mensagem: string) => void;
}) {
  const { perfil } = useAuth();
  const { negociacoes, criar } = useNegociacoes();
  const { usuarios } = useUsuarios();
  const idBase = useId();

  const [dados, setDados] = useState<NegociacaoFormData>({
    cliente: '',
    whatsapp: '',
    conselho: '',
    nicho: '',
    verbaMensal: '',
    origem: '',
    // Quem cria já é o responsável natural, se for papel comercial.
    responsavelId: PAPEIS_COMERCIAIS.has(perfil.role) ? perfil.id : '',
  });
  const [erros, setErros] = useState<ErrosNegociacao>({});
  const [tentou, setTentou] = useState(false);

  const responsaveis = useMemo(
    () => usuarios.filter((u) => u.status !== 'inativo' && PAPEIS_COMERCIAIS.has(u.role)),
    [usuarios],
  );

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  useEffect(() => {
    if (!tentou) return;
    setErros(validarNegociacao(dados, negociacoes));
  }, [dados, tentou, negociacoes]);

  const nichos = dados.conselho ? NICHOS_POR_CONSELHO[dados.conselho as ConselhoRegulador] : [];

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    const novos = validarNegociacao(dados, negociacoes);
    setErros(novos);
    if (temErro(novos)) return;

    criar(dados, perfil.id);
    aoSalvar(`${dados.cliente.trim()} entrou no funil em "Em andamento".`);
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
        className="gaveta max-w-lg"
      >
        <header className="shrink-0 flex items-start gap-3 px-6 py-4 border-b border-stone-200">
          <div>
            <h2 id={`${idBase}-titulo`} className="text-[15px] font-semibold text-roxo-900">
              Nova negociação
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              Entra em "Em andamento". O título é sempre o nome do cliente.
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Campo id={`${idBase}-cliente`} rotulo="Escritório ou profissional" erro={erros.cliente}>
            <input
              id={`${idBase}-cliente`}
              value={dados.cliente}
              onChange={(e) => setDados((d) => ({ ...d, cliente: e.target.value }))}
              autoFocus
              autoComplete="off"
              className={entrada(erros.cliente)}
              placeholder="Silva & Associados"
            />
          </Campo>

          <Campo
            id={`${idBase}-whats`}
            rotulo="WhatsApp"
            erro={erros.whatsapp}
            dica="Sem ele a régua de cobrança falha em silêncio lá na frente."
          >
            <input
              id={`${idBase}-whats`}
              value={dados.whatsapp}
              onChange={(e) =>
                setDados((d) => ({ ...d, whatsapp: formatarWhatsapp(e.target.value) }))
              }
              inputMode="tel"
              autoComplete="off"
              className={entrada(erros.whatsapp)}
              placeholder="(62) 99999-0000"
            />
          </Campo>

          <div className="grid sm:grid-cols-2 gap-4">
            <Campo
              id={`${idBase}-conselho`}
              rotulo="Conselho regulador"
              erro={erros.conselho}
              dica="Define a régua de conformidade."
            >
              <select
                id={`${idBase}-conselho`}
                value={dados.conselho}
                onChange={(e) =>
                  // Trocar de conselho invalida o nicho: cada conselho tem a
                  // própria lista, e manter o antigo grava combinação impossível.
                  setDados((d) => ({
                    ...d,
                    conselho: e.target.value as ConselhoRegulador | '',
                    nicho: '',
                  }))
                }
                className={entrada(erros.conselho)}
              >
                <option value="">Selecione…</option>
                {CONSELHOS.filter((c) => c !== 'nenhum').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id={`${idBase}-nicho`} rotulo="Nicho" erro={erros.nicho}>
              <select
                id={`${idBase}-nicho`}
                value={dados.nicho}
                onChange={(e) => setDados((d) => ({ ...d, nicho: e.target.value }))}
                disabled={!dados.conselho}
                className={entrada(erros.nicho)}
              >
                <option value="">{dados.conselho ? 'Selecione…' : 'Escolha o conselho'}</option>
                {nichos.map((nic) => (
                  <option key={nic} value={nic}>
                    {nic}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Campo id={`${idBase}-verba`} rotulo="Verba mensal prevista" erro={erros.verbaMensal}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-stone-400">
                  R$
                </span>
                <input
                  id={`${idBase}-verba`}
                  value={dados.verbaMensal}
                  onChange={(e) =>
                    setDados((d) => ({ ...d, verbaMensal: e.target.value.replace(/[^\d.,]/g, '') }))
                  }
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${entrada(erros.verbaMensal)} pl-9`}
                  placeholder="12.000"
                />
              </div>
            </Campo>

            <Campo id={`${idBase}-origem`} rotulo="Origem do lead" erro={erros.origem}>
              <select
                id={`${idBase}-origem`}
                value={dados.origem}
                onChange={(e) => setDados((d) => ({ ...d, origem: e.target.value }))}
                className={entrada(erros.origem)}
              >
                <option value="">Selecione…</option>
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo id={`${idBase}-resp`} rotulo="Responsável" erro={erros.responsavelId}>
            <select
              id={`${idBase}-resp`}
              value={dados.responsavelId}
              onChange={(e) => setDados((d) => ({ ...d, responsavelId: e.target.value }))}
              className={entrada(erros.responsavelId)}
            >
              <option value="">Selecione…</option>
              {responsaveis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <footer className="shrink-0 flex justify-end items-center gap-2 px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button type="button" onClick={aoFechar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario">
            Criar negociação
          </button>
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
