import { supabase } from '@/src/lib/supabase';
import type { Ligacao, LigacaoDetalhada, ResultadoLigacao, TeseId } from '@/types';

/**
 * A camada de leitura da qualificação por voz.
 *
 * `ligacoes` é append-only (`INV-13` — `ligacoes_imutaveis` bloqueia
 * `update`/`delete`), então esta camada só lê. Quem grava é
 * `registrar_qualificacao` (`supabase/migrations/0010_qualificacao_por_voz.sql`),
 * chamada pelo n8n — não há escrita daqui.
 */

const POR_PAGINA = 200;

interface LinhaLigacao {
  id: string;
  lead_id: string;
  tentativa: number;
  resultado: ResultadoLigacao;
  duracao_segundos: number | null;
  gravacao_url: string | null;
  iniciada_em: string | null;
  encerrada_em: string | null;
  registrada_em: string;
  leads: { nome: string; tese: TeseId } | { nome: string; tese: TeseId }[] | null;
}

const CAMPOS_LISTA =
  'id, lead_id, tentativa, resultado, duracao_segundos, gravacao_url, iniciada_em, encerrada_em, registrada_em, leads(nome, tese)' as const;

function nomeETese(linha: LinhaLigacao): { nome: string; tese: TeseId } {
  const lead = Array.isArray(linha.leads) ? linha.leads[0] : linha.leads;
  return { nome: lead?.nome ?? '(lead removido)', tese: lead?.tese ?? ('polo_passivo' as TeseId) };
}

function paraDominio(linha: LinhaLigacao): Ligacao {
  const { nome, tese } = nomeETese(linha);
  return {
    id: linha.id,
    leadId: linha.lead_id,
    leadNome: nome,
    tese,
    tentativa: linha.tentativa,
    resultado: linha.resultado,
    duracao: Number(linha.duracao_segundos ?? 0),
    temGravacao: linha.gravacao_url !== null,
    em: linha.encerrada_em ?? linha.iniciada_em ?? linha.registrada_em,
  };
}

/**
 * `API-R07` — pagina sozinha, por dentro, até esgotar a tabela.
 *
 * Ordena pela mais recente primeiro: é o que "Ligações recentes" quer dizer.
 */
export async function listarLigacoes(): Promise<Ligacao[]> {
  const tudo: Ligacao[] = [];
  for (let pagina = 0; ; pagina++) {
    const de = pagina * POR_PAGINA;
    const { data, error } = await supabase
      .from('ligacoes')
      .select(CAMPOS_LISTA)
      .order('registrada_em', { ascending: false })
      .range(de, de + POR_PAGINA - 1);

    if (error) throw new Error(`Falha ao carregar as ligações: ${error.message}`);
    const linhas = data as unknown as LinhaLigacao[];
    tudo.push(...linhas.map(paraDominio));
    if (linhas.length < POR_PAGINA) return tudo;
  }
}

interface LinhaLigacaoDetalhada extends LinhaLigacao {
  resumo: string | null;
  transcricao: string | null;
  motivo_encerramento: string | null;
}

const CAMPOS_DETALHE =
  'id, lead_id, tentativa, resultado, resumo, transcricao, duracao_segundos, gravacao_url, motivo_encerramento, iniciada_em, encerrada_em, registrada_em, leads(nome, tese)' as const;

/** O histórico completo de um lead — o que a ficha do lead mostra, tentativa por tentativa. */
export async function listarLigacoesDoLead(leadId: string): Promise<LigacaoDetalhada[]> {
  const { data, error } = await supabase
    .from('ligacoes')
    .select(CAMPOS_DETALHE)
    .eq('lead_id', leadId)
    .order('tentativa', { ascending: true });

  if (error) throw new Error(`Falha ao carregar o histórico de ligações: ${error.message}`);
  const linhas = data as unknown as LinhaLigacaoDetalhada[];
  return linhas.map((linha) => ({
    ...paraDominio(linha),
    resumo: linha.resumo,
    transcricao: linha.transcricao,
    gravacaoUrl: linha.gravacao_url,
    motivoEncerramento: linha.motivo_encerramento,
  }));
}
