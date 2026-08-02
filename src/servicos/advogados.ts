import { supabase } from '@/src/lib/supabase';
import type {
  Advogado,
  AdvogadoStatus,
  ModeloPagamento,
  PorteEscritorio,
  PrioridadeAdvogado,
  TeseId,
} from '@/types';

const POR_PAGINA = 200;

interface LinhaAdvogado {
  id: string;
  nome: string;
  oab: string;
  oab_conferida_em: string | null;
  email: string;
  whatsapp: string;
  uf: string;
  teses: TeseId[];
  cidades: string[];
  porte: PorteEscritorio;
  status: AdvogadoStatus;
  modelo_pagamento: ModeloPagamento | null;
  potencial_mensal: number;
  usuario_id: string | null;
  prioridade_manual: PrioridadeAdvogado | null;
  responsavel_id: string | null;
  criado_por: string | null;
  criado_em: string;
  ultima_atividade: string;
  motivo_perda: string | null;
  saldo_creditos: number;
}

/*
 * Literal único, não concatenação: o cliente infere o formato do retorno a
 * partir do texto do `select`, e texto montado com `+` chega como `string`
 * genérica — a inferência morre e a consulta volta sem tipo nenhum.
 */
const CAMPOS =
  'id, nome, oab, oab_conferida_em, email, whatsapp, uf, teses, cidades, porte, status, modelo_pagamento, potencial_mensal, usuario_id, prioridade_manual, responsavel_id, criado_por, criado_em, ultima_atividade, motivo_perda, saldo_creditos' as const;

function paraDominio(linha: LinhaAdvogado): Advogado {
  return {
    id: linha.id,
    nome: linha.nome,
    oab: linha.oab,
    oabConferidaEm: linha.oab_conferida_em,
    email: linha.email,
    whatsapp: linha.whatsapp,
    uf: linha.uf,
    teses: linha.teses ?? [],
    cidades: linha.cidades ?? [],
    porte: linha.porte,
    status: linha.status,
    modeloPagamento: linha.modelo_pagamento,
    potencialMensal: linha.potencial_mensal,
    /*
     * `INV-15` — este número não é coluna. Vem da view, que soma o extrato.
     * Uma coluna `saldo` editável ao lado dos movimentos torna a conferência
     * impossível: os dois divergem e não há como saber qual está certo. Aqui a
     * deriva é estruturalmente impossível, porque não existe o segundo número.
     */
    saldoCreditos: linha.saldo_creditos,
    usuarioId: linha.usuario_id,
    prioridadeManual: linha.prioridade_manual,
    responsavelId: linha.responsavel_id ?? '',
    criadoPor: linha.criado_por ?? '',
    criadoEm: linha.criado_em,
    ultimaAtividade: linha.ultima_atividade,
    motivoPerda: linha.motivo_perda,
  };
}

/**
 * A leitura sai de `advogados_com_saldo`, nunca da tabela crua — é a view que
 * carrega o saldo. Consultar `advogados` direto devolve o cadastro sem ele, e o
 * sintoma é um painel mostrando zero crédito para quem tem cento e quarenta.
 *
 * A view é `security_invoker`, então a política de acesso da tabela vale
 * normalmente: o advogado enxerga só o próprio cadastro.
 */
export async function listarAdvogados(pagina = 0): Promise<Advogado[]> {
  const de = pagina * POR_PAGINA;
  const { data, error } = await supabase
    .from('advogados_com_saldo')
    .select(CAMPOS)
    .order('ultima_atividade', { ascending: false })
    .range(de, de + POR_PAGINA - 1);

  if (error) throw new Error(`Falha ao carregar advogados: ${error.message}`);
  return (data as LinhaAdvogado[]).map(paraDominio);
}

/** O cadastro do advogado logado. Nulo para o time interno. */
export async function advogadoDaSessao(advogadoId: string | null): Promise<Advogado | null> {
  if (!advogadoId) return null;

  const { data, error } = await supabase
    .from('advogados_com_saldo')
    .select(CAMPOS)
    .eq('id', advogadoId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o cadastro: ${error.message}`);
  return data ? paraDominio(data as LinhaAdvogado) : null;
}
