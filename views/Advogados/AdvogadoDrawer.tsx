import { useEffect, useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAdvogados } from '@/src/contexts/AdvogadosContext';
import { useUsuarios } from '@/src/contexts/UsuariosContext';
import { Campo, entrada } from '@/src/components/ui/Campo';
import {
  UFS,
  formatarOab,
  formatarWhatsapp,
  temErro,
  validarAdvogado,
  type AdvogadoFormData,
  type ErrosAdvogado,
} from '@/src/lib/advogados';
import { TESES } from '@/src/lib/teses';
import { MODELO_PAGAMENTO_LABEL, PORTE_LABEL, type PorteEscritorio, type TeseId } from '@/types';

/** Papéis que podem ser responsáveis por um advogado no funil. */
const PAPEIS_COMERCIAIS = new Set(['cs', 'gerente', 'adm']);

export function AdvogadoDrawer({
  aoFechar,
  aoSalvar,
}: {
  aoFechar: () => void;
  aoSalvar: (mensagem: string) => void;
}) {
  const { perfil } = useAuth();
  const { advogados, criar } = useAdvogados();
  const { usuarios } = useUsuarios();
  const idBase = useId();

  const [dados, setDados] = useState<AdvogadoFormData>({
    nome: '',
    oab: '',
    email: '',
    whatsapp: '',
    uf: '',
    teses: [],
    cidades: '',
    porte: '',
    potencialMensal: '',
    modeloPagamento: '',
    // Quem cria já é o responsável natural, se for papel comercial.
    responsavelId: PAPEIS_COMERCIAIS.has(perfil.role) ? perfil.id : '',
  });
  const [erros, setErros] = useState<ErrosAdvogado>({});
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
    setErros(validarAdvogado(dados, advogados));
  }, [dados, tentou, advogados]);

  function alternarTese(tese: TeseId) {
    setDados((d) => ({
      ...d,
      teses: d.teses.includes(tese) ? d.teses.filter((t) => t !== tese) : [...d.teses, tese],
    }));
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setTentou(true);
    const novos = validarAdvogado(dados, advogados);
    setErros(novos);
    if (temErro(novos)) return;

    criar(dados, perfil.id);
    aoSalvar(`${dados.nome.trim()} entrou no funil em "Novo".`);
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
              Novo advogado
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              Entra em "Novo". O acesso só é liberado depois da qualificação e da inscrição
              conferida.
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="btn-icone ml-auto">
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Campo id={`${idBase}-nome`} rotulo="Escritório ou profissional" erro={erros.nome}>
            <input
              id={`${idBase}-nome`}
              value={dados.nome}
              onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
              autoFocus
              autoComplete="off"
              className={entrada(erros.nome)}
              placeholder="Silva & Associados"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo
              id={`${idBase}-oab`}
              rotulo="Inscrição na OAB"
              erro={erros.oab}
              dica="Conferida depois, no funil"
            >
              <input
                id={`${idBase}-oab`}
                value={dados.oab}
                onChange={(e) => setDados((d) => ({ ...d, oab: formatarOab(e.target.value) }))}
                autoComplete="off"
                className={`${entrada(erros.oab)} tabular`}
                placeholder="123456/GO"
              />
            </Campo>

            <Campo id={`${idBase}-uf`} rotulo="UF de atuação" erro={erros.uf}>
              <select
                id={`${idBase}-uf`}
                value={dados.uf}
                onChange={(e) => setDados((d) => ({ ...d, uf: e.target.value }))}
                className={entrada(erros.uf)}
              >
                <option value="">Selecione…</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo
            id={`${idBase}-email`}
            rotulo="E-mail"
            erro={erros.email}
            dica="É por onde o acesso é enviado"
          >
            <input
              id={`${idBase}-email`}
              type="email"
              value={dados.email}
              onChange={(e) => setDados((d) => ({ ...d, email: e.target.value }))}
              autoComplete="off"
              className={entrada(erros.email)}
              placeholder="contato@escritorio.adv.br"
            />
          </Campo>

          <Campo
            id={`${idBase}-whats`}
            rotulo="WhatsApp"
            erro={erros.whatsapp}
            dica="É por onde sai o aviso de lead novo"
          >
            <input
              id={`${idBase}-whats`}
              inputMode="tel"
              value={dados.whatsapp}
              onChange={(e) => setDados((d) => ({ ...d, whatsapp: formatarWhatsapp(e.target.value) }))}
              className={`${entrada(erros.whatsapp)} tabular`}
              placeholder="(62) 99999-0000"
            />
          </Campo>

          {/* ADV-R03 — sem tese o painel abre vazio e a notificação nunca sai.
              Por isso a escolha é explícita aqui, e não um padrão silencioso. */}
          <fieldset>
            <legend className="campo-rotulo">Teses em que atua</legend>
            <div className="space-y-1.5">
              {TESES.map((tese) => {
                const marcada = dados.teses.includes(tese.id);
                return (
                  <label
                    key={tese.id}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      marcada
                        ? 'border-roxo-300 bg-roxo-50/60'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => alternarTese(tese.id)}
                      className="mt-0.5 accent-roxo-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-roxo-900">{tese.nome}</span>
                      <span className="block nota">{tese.area}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {erros.teses && <p className="campo-mensagem-erro">{erros.teses}</p>}
          </fieldset>

          {/*
            LED-R06 — a região entra junto da tese porque as duas fazem a mesma
            coisa: recortam o catálogo dele. Em branco não é campo esquecido, é
            resposta — o estado inteiro —, e por isso não vira erro de validação.
          */}
          <Campo
            id={`${idBase}-cidades`}
            rotulo="Cidades que acompanha"
            dica="Separadas por vírgula. Em branco, ele recebe o estado inteiro"
          >
            <input
              id={`${idBase}-cidades`}
              value={dados.cidades}
              onChange={(e) => setDados((d) => ({ ...d, cidades: e.target.value }))}
              className={entrada()}
              placeholder="Goiânia, Aparecida de Goiânia"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo id={`${idBase}-porte`} rotulo="Porte do escritório" erro={erros.porte}>
              <select
                id={`${idBase}-porte`}
                value={dados.porte}
                onChange={(e) =>
                  setDados((d) => ({ ...d, porte: e.target.value as PorteEscritorio | '' }))
                }
                className={entrada(erros.porte)}
              >
                <option value="">Selecione…</option>
                {(Object.keys(PORTE_LABEL) as PorteEscritorio[]).map((p) => (
                  <option key={p} value={p}>
                    {PORTE_LABEL[p]}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              id={`${idBase}-potencial`}
              rotulo="Potencial mensal"
              erro={erros.potencialMensal}
              dica="Leads por mês"
            >
              <input
                id={`${idBase}-potencial`}
                inputMode="numeric"
                value={dados.potencialMensal}
                onChange={(e) =>
                  setDados((d) => ({ ...d, potencialMensal: e.target.value.replace(/\D/g, '') }))
                }
                className={`${entrada(erros.potencialMensal)} tabular`}
                placeholder="20"
              />
            </Campo>
          </div>

          <Campo
            id={`${idBase}-modelo`}
            rotulo="Modelo de pagamento pretendido"
            dica="Pode ficar em branco — é escolhido depois, no painel"
          >
            <select
              id={`${idBase}-modelo`}
              value={dados.modeloPagamento}
              onChange={(e) =>
                setDados((d) => ({
                  ...d,
                  modeloPagamento: e.target.value as AdvogadoFormData['modeloPagamento'],
                }))
              }
              className="campo"
            >
              <option value="">Ainda não definido</option>
              {(Object.keys(MODELO_PAGAMENTO_LABEL) as Array<keyof typeof MODELO_PAGAMENTO_LABEL>).map(
                (m) => (
                  <option key={m} value={m}>
                    {MODELO_PAGAMENTO_LABEL[m]}
                  </option>
                ),
              )}
            </select>
          </Campo>

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
            Criar advogado
          </button>
        </footer>
      </form>
    </div>
  );
}
