import { supabase } from '@/src/lib/supabase';
import type { CampanhaFormData } from '@/src/lib/campanhas';
import type { Campanha, PlataformaAnuncio, SituacaoCampanha, TeseId } from '@/types';

/**
 * A camada de leitura e escrita de campanha.
 *
 * `integracoes.ts` documenta Meta Ads e Google Ads como integração PENDENTE:
 * o custo por lead qualificado é digitado à mão. Esta camada não finge uma
 * sincronização que não existe — é CRUD comum, sob a política de acesso da
 * tabela, igual a `advogados`.
 */

const POR_PAGINA = 200;

interface LinhaCampanha {
  id: string;
  nome: string;
  tese: TeseId;
  plataforma: PlataformaAnuncio;
  situacao: SituacaoCampanha;
  verba_diaria: number;
  gasto_mes: number;
  leads_mes: number;
  leads_qualificados_mes: number;
  criativos_no_ar: number;
  criativos_sem_parecer: number;
}

const CAMPOS =
  'id, nome, tese, plataforma, situacao, verba_diaria, gasto_mes, leads_mes, leads_qualificados_mes, criativos_no_ar, criativos_sem_parecer' as const;

function paraDominio(linha: LinhaCampanha): Campanha {
  return {
    id: linha.id,
    nome: linha.nome,
    tese: linha.tese,
    plataforma: linha.plataforma,
    situacao: linha.situacao,
    verbaDiaria: Number(linha.verba_diaria),
    gastoMes: Number(linha.gasto_mes),
    leadsMes: linha.leads_mes,
    leadsQualificadosMes: linha.leads_qualificados_mes,
    criativosNoAr: linha.criativos_no_ar,
    criativosSemParecer: linha.criativos_sem_parecer,
  };
}

function paraLinha(dados: CampanhaFormData) {
  return {
    nome: dados.nome.trim(),
    tese: dados.tese as TeseId,
    plataforma: dados.plataforma as PlataformaAnuncio,
    situacao: dados.situacao,
    verba_diaria: dados.verbaDiaria,
    gasto_mes: dados.gastoMes,
    leads_mes: dados.leadsMes,
    leads_qualificados_mes: dados.leadsQualificadosMes,
    criativos_no_ar: dados.criativosNoAr,
    criativos_sem_parecer: dados.criativosSemParecer,
  };
}

/** `API-R07` — pagina sozinha, por dentro, até esgotar a tabela. */
export async function listarCampanhas(): Promise<Campanha[]> {
  const tudo: Campanha[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('campanhas')
      .select(CAMPOS)
      .order('nome', { ascending: true })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar as campanhas: ${error.message}`);
    const linhas = data as unknown as LinhaCampanha[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}

export type Resultado = { ok: true } | { ok: false; motivo: string };

export async function criarCampanha(dados: CampanhaFormData): Promise<Resultado> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, motivo: 'Sessão expirada — entre de novo.' };

  const { error: erroInsert } = await supabase
    .from('campanhas')
    .insert({ ...paraLinha(dados), criado_por: data.user.id });

  if (erroInsert) return { ok: false, motivo: erroInsert.message };
  return { ok: true };
}

export async function atualizarCampanha(id: string, dados: CampanhaFormData): Promise<Resultado> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, motivo: 'Sessão expirada — entre de novo.' };

  const { error: erroUpdate } = await supabase
    .from('campanhas')
    .update({ ...paraLinha(dados), atualizado_em: new Date().toISOString(), atualizado_por: data.user.id })
    .eq('id', id);

  if (erroUpdate) return { ok: false, motivo: erroUpdate.message };
  return { ok: true };
}
