import { useEffect, useId, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useLeads } from '@/src/contexts/LeadsContext';
import { Campo, entrada } from '@/src/components/ui/Campo';
import {
  LEAD_FORM_VAZIO,
  formatarTelefone,
  temErro,
  validarLead,
  type ErrosLead,
  type LeadFormData,
} from '@/src/lib/leads';
import { ORIGEM_LEAD_LABEL, TESE_CURTA, type Lead, type OrigemLead, type TeseId } from '@/types';

const TESES_DO_FORMULARIO = Object.keys(TESE_CURTA) as TeseId[];

interface Props {
  leads: Lead[];
  aoFechar: () => void;
  aoCriar: (lead: Lead) => void;
}

export function NovoLeadDialog({ leads, aoFechar, aoCriar }: Props) {
  const { criar } = useLeads();
  const idBase = useId();

  const [dados, setDados] = useState<LeadFormData>(LEAD_FORM_VAZIO);
  const [erros, setErros] = useState<ErrosLead>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErroGeral(null);
    const v = validarLead(dados, leads);
    setErros(v);
    if (temErro(v)) return;

    setEnviando(true);
    const r = await criar(dados);
    setEnviando(false);

    if (!r.ok) {
      setErroGeral(r.motivo);
      return;
    }
    aoCriar(r.lead);
  }

  return (
    <div className="pilha-dialogo grid place-items-center p-4">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="veu" />

      <form
        onSubmit={submeter}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idBase}-titulo`}
        className="dialogo max-w-xl w-full max-h-[90vh] flex flex-col"
      >
        <header className="shrink-0 flex items-start gap-3 px-6 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <h2 id={`${idBase}-titulo`} className="text-[15px] font-semibold text-roxo-900">
              Novo lead
            </h2>
            <p className="subtitulo-pagina text-[12px] mt-0.5">
              Entra na fila da IA como qualquer outro — em "novo", sem reunião marcada.
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="btn-icone ml-auto">
            <X className="size-4.5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {erroGeral && (
            <p className="campo-mensagem-erro rounded-lg border border-erro-200 bg-erro-50 px-3 py-2">
              {erroGeral}
            </p>
          )}

          <Campo id={`${idBase}-nome`} rotulo="Nome do cliente" erro={erros.nome}>
            <input
              id={`${idBase}-nome`}
              value={dados.nome}
              onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))}
              autoFocus
              autoComplete="off"
              className={entrada(erros.nome)}
              placeholder="Maria de Lourdes Campos"
            />
          </Campo>

          <Campo id={`${idBase}-telefone`} rotulo="Telefone" erro={erros.telefone}>
            <input
              id={`${idBase}-telefone`}
              value={dados.telefone}
              onChange={(e) => setDados((d) => ({ ...d, telefone: formatarTelefone(e.target.value) }))}
              autoComplete="off"
              className={entrada(erros.telefone)}
              placeholder="(11) 91234-5678"
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

            <Campo id={`${idBase}-uf`} rotulo="UF" erro={erros.uf}>
              <input
                id={`${idBase}-uf`}
                value={dados.uf}
                onChange={(e) => setDados((d) => ({ ...d, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2}
                autoComplete="off"
                className={entrada(erros.uf)}
                placeholder="SP"
              />
            </Campo>

            <Campo id={`${idBase}-cidade`} rotulo="Cidade" erro={erros.cidade}>
              <input
                id={`${idBase}-cidade`}
                value={dados.cidade}
                onChange={(e) => setDados((d) => ({ ...d, cidade: e.target.value }))}
                autoComplete="off"
                className={entrada(erros.cidade)}
                placeholder="São Paulo"
              />
            </Campo>
          </div>

          <Campo id={`${idBase}-origem`} rotulo="Origem">
            <select
              id={`${idBase}-origem`}
              value={dados.origem}
              onChange={(e) => setDados((d) => ({ ...d, origem: e.target.value as OrigemLead }))}
              className="campo"
            >
              {Object.entries(ORIGEM_LEAD_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id={`${idBase}-resumo`}
            rotulo="Resumo"
            erro={erros.resumoQualificacao}
            dica="O que se sabe até agora — a IA completa isso na qualificação."
          >
            <textarea
              id={`${idBase}-resumo`}
              value={dados.resumoQualificacao}
              onChange={(e) => setDados((d) => ({ ...d, resumoQualificacao: e.target.value }))}
              rows={3}
              className={`${entrada(erros.resumoQualificacao)} campo-area`}
              placeholder="Como o lead chegou e o que já foi dito sobre o caso…"
            />
          </Campo>
        </div>

        <div className="shrink-0 flex justify-end gap-2 px-6 py-4 border-t border-stone-200">
          <button type="button" onClick={aoFechar} className="btn btn-fantasma">
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className="btn btn-primario">
            {enviando ? 'Cadastrando…' : 'Cadastrar lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
