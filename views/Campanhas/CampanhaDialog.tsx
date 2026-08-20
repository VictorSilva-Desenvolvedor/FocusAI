import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCampanhas } from '@/src/contexts/CampanhasContext';
import { Campo, entrada } from '@/src/components/ui/Campo';
import { useFocoPreso } from '@/src/components/ui/focoPreso';
import {
  CAMPANHA_FORM_VAZIO,
  campanhaParaFormulario,
  temErroCampanha,
  validarCampanha,
  type CampanhaFormData,
  type ErrosCampanha,
} from '@/src/lib/campanhas';
import {
  PLATAFORMA_LABEL,
  SITUACAO_CAMPANHA_LABEL,
  TESE_CURTA,
  type Campanha,
  type PlataformaAnuncio,
  type SituacaoCampanha,
  type TeseId,
} from '@/types';

const TESES_DO_FORMULARIO = Object.keys(TESE_CURTA) as TeseId[];

interface Props {
  /** Campanha em edição, ou null para criação. */
  editando: Campanha | null;
  aoFechar: () => void;
  aoSalvar: (mensagem: string) => void;
}

export function CampanhaDialog({ editando, aoFechar, aoSalvar }: Props) {
  const { criar, atualizar } = useCampanhas();
  const idBase = useId();

  const [dados, setDados] = useState<CampanhaFormData>(() =>
    editando ? campanhaParaFormulario(editando) : CAMPANHA_FORM_VAZIO,
  );
  const [erros, setErros] = useState<ErrosCampanha>({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  function num(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    const v = validarCampanha(dados);
    setErros(v);
    if (temErroCampanha(v)) return;

    setEnviando(true);
    const r = editando ? await atualizar(editando.id, dados) : await criar(dados);
    setEnviando(false);

    if (!r.ok) {
      setErros((atual) => ({ ...atual, nome: r.motivo }));
      return;
    }
    aoSalvar(editando ? `${dados.nome.trim()} atualizada.` : `${dados.nome.trim()} cadastrada.`);
    aoFechar();
  }

  const refDialogo = useRef<HTMLFormElement>(null);
  useFocoPreso(refDialogo);

  return (
    <div className="pilha-dialogo grid place-items-center p-4">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="veu" />

      <form
        ref={refDialogo}
        onSubmit={submeter}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        className="dialogo max-w-xl w-full max-h-[90vh] flex flex-col"
      >
        <header className="shrink-0 flex items-start gap-3 px-6 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <h2 id={`${idBase}-titulo`} className="text-[15px] font-semibold text-roxo-900">
              {editando ? 'Editar campanha' : 'Nova campanha'}
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              Meta Ads e Google Ads ainda são integração pendente — os números são digitados à mão.
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="btn-icone ml-auto">
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Campo id={`${idBase}-nome`} rotulo="Nome da campanha" erro={erros.nome}>
            <input
              id={`${idBase}-nome`}
              value={dados.nome}
              onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
              autoFocus
              autoComplete="off"
              className={entrada(erros.nome)}
              placeholder="Polo passivo — processo parado"
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo id={`${idBase}-tese`} rotulo="Tese" erro={erros.tese}>
              <select
                id={`${idBase}-tese`}
                value={dados.tese}
                onChange={(e) => setDados((d) => ({ ...d, tese: e.target.value as TeseId }))}
                className={entrada(erros.tese)}
              >
                <option value="">Escolha</option>
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
                <option value="">Escolha</option>
                {Object.entries(PLATAFORMA_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo id={`${idBase}-situacao`} rotulo="Situação">
              <select
                id={`${idBase}-situacao`}
                value={dados.situacao}
                onChange={(e) =>
                  setDados((d) => ({ ...d, situacao: e.target.value as SituacaoCampanha }))
                }
                className="campo"
              >
                {Object.entries(SITUACAO_CAMPANHA_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${idBase}-verba`} rotulo="Verba diária (R$)" erro={erros.verbaDiaria}>
              <input
                id={`${idBase}-verba`}
                type="number"
                min={0}
                step="0.01"
                value={dados.verbaDiaria}
                onChange={(e) => setDados((d) => ({ ...d, verbaDiaria: num(e.target.value) }))}
                className={entrada(erros.verbaDiaria)}
              />
            </Campo>

            <Campo id={`${idBase}-gasto`} rotulo="Gasto do mês (R$)" erro={erros.gastoMes}>
              <input
                id={`${idBase}-gasto`}
                type="number"
                min={0}
                step="0.01"
                value={dados.gastoMes}
                onChange={(e) => setDados((d) => ({ ...d, gastoMes: num(e.target.value) }))}
                className={entrada(erros.gastoMes)}
              />
            </Campo>

            <Campo id={`${idBase}-leads`} rotulo="Leads no mês" erro={erros.leadsMes}>
              <input
                id={`${idBase}-leads`}
                type="number"
                min={0}
                step="1"
                value={dados.leadsMes}
                onChange={(e) => setDados((d) => ({ ...d, leadsMes: num(e.target.value) }))}
                className={entrada(erros.leadsMes)}
              />
            </Campo>

            <Campo
              id={`${idBase}-qualificados`}
              rotulo="Qualificados no mês"
              erro={erros.leadsQualificadosMes}
            >
              <input
                id={`${idBase}-qualificados`}
                type="number"
                min={0}
                step="1"
                value={dados.leadsQualificadosMes}
                onChange={(e) =>
                  setDados((d) => ({ ...d, leadsQualificadosMes: num(e.target.value) }))
                }
                className={entrada(erros.leadsQualificadosMes)}
              />
            </Campo>

            <Campo id={`${idBase}-noar`} rotulo="Criativos no ar" erro={erros.criativosNoAr}>
              <input
                id={`${idBase}-noar`}
                type="number"
                min={0}
                step="1"
                value={dados.criativosNoAr}
                onChange={(e) => setDados((d) => ({ ...d, criativosNoAr: num(e.target.value) }))}
                className={entrada(erros.criativosNoAr)}
              />
            </Campo>

            <Campo
              id={`${idBase}-semparecer`}
              rotulo="Sem parecer (INV-16)"
              erro={erros.criativosSemParecer}
            >
              <input
                id={`${idBase}-semparecer`}
                type="number"
                min={0}
                step="1"
                value={dados.criativosSemParecer}
                onChange={(e) =>
                  setDados((d) => ({ ...d, criativosSemParecer: num(e.target.value) }))
                }
                className={entrada(erros.criativosSemParecer)}
              />
            </Campo>
          </div>
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-stone-200">
          <button type="button" onClick={aoFechar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className="btn btn-primario">
            {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar campanha'}
          </button>
        </div>
      </form>
    </div>
  );
}
