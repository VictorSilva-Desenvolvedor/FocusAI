import { MODULOS, nivelDeAcesso } from '@/src/lib/navigation';
import type {
  AccessLevel,
  NamedPermission,
  Profile,
  UserRole,
  Usuario,
  UsuarioFormData,
} from '@/types';

// ---------------------------------------------------------------------------
// ACC-R02 — criação de usuário é hierárquica
// ---------------------------------------------------------------------------

/**
 * Contas nunca são autocriadas: sempre criadas por alguém acima.
 *
 * Papel que não aparece como chave aqui não cria ninguém. Papel que não aparece
 * em nenhuma lista de valores só pode ser criado por `adm` — é o caso de
 * `white_label_admin`, que envolve contrato e divisão de receita.
 */
export const PODE_CRIAR: Partial<Record<UserRole, UserRole[]>> = {
  adm: [
    'gerente',
    'gestor_trafego',
    'analista_conformidade',
    'criativo',
    'closer',
    'sdr',
    'cs',
    'financeiro',
    'parceiro',
    'white_label_admin',
    'adm',
  ],
  gerente: ['gestor_trafego', 'analista_conformidade', 'criativo', 'closer', 'sdr', 'cs', 'financeiro'],
  gestor_trafego: ['criativo'],
};

export function papeisQuePodeCriar(ator: Profile): UserRole[] {
  return PODE_CRIAR[ator.role] ?? [];
}

export function podeCriarUsuario(ator: Profile): boolean {
  return papeisQuePodeCriar(ator).length > 0;
}

/**
 * ACC-R03 — ninguém edita a si mesmo pelo painel de usuários, nem
 * administrador. Alterações no próprio perfil passam pela tela de perfil, que
 * não expõe papel nem permissões — senão qualquer um se autopromove.
 *
 * Além disso, só se gerencia quem se poderia ter criado.
 */
export function motivoParaNaoGerenciar(ator: Profile, alvo: Usuario): string | null {
  if (ator.id === alvo.id) {
    return 'Ninguém edita a própria conta por aqui (ACC-R03). Use a tela de perfil.';
  }
  if (!papeisQuePodeCriar(ator).includes(alvo.role)) {
    return `Seu papel não gerencia contas de ${ROLE_CURTO[alvo.role]}.`;
  }
  return null;
}

export function podeGerenciar(ator: Profile, alvo: Usuario): boolean {
  return motivoParaNaoGerenciar(ator, alvo) === null;
}

/** Rótulo curto, para caber em coluna de tabela e em frase. */
export const ROLE_CURTO: Record<UserRole, string> = {
  adm: 'Administrador',
  gerente: 'Gerente',
  gestor_trafego: 'Gestor de Tráfego',
  analista_conformidade: 'Analista de Conformidade',
  criativo: 'Criativo',
  closer: 'Closer',
  sdr: 'SDR',
  cs: 'Customer Success',
  financeiro: 'Financeiro',
  parceiro: 'Parceiro',
  cliente: 'Cliente',
  white_label_admin: 'White Label',
};

// ---------------------------------------------------------------------------
// Padrões e derivações
// ---------------------------------------------------------------------------

/**
 * Permissões que o papel recebe por padrão. São sugestão do formulário, não
 * regra: a pessoa que cadastra pode marcar e desmarcar à vontade.
 */
export const PERMISSOES_PADRAO: Partial<Record<UserRole, NamedPermission[]>> = {
  adm: [
    'modulo:campanhas',
    'modulo:conformidade',
    'modulo:plataformas',
    'verba:aprovar_realocacao',
    'auditoria:repasse_midia',
    'cobranca:receber_aviso_inadimplencia',
    'assistente:financeiro',
  ],
  gerente: ['modulo:plataformas', 'verba:aprovar_realocacao'],
  gestor_trafego: ['modulo:campanhas', 'modulo:plataformas'],
  analista_conformidade: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
  financeiro: ['cobranca:receber_pendentes', 'cobranca:receber_aviso_inadimplencia'],
};

export function permissoesPadrao(role: UserRole): NamedPermission[] {
  return [...(PERMISSOES_PADRAO[role] ?? [])];
}

export const PERMISSAO_LABEL: Record<NamedPermission, { rotulo: string; efeito: string }> = {
  'modulo:campanhas': {
    rotulo: 'Módulo Campanhas',
    efeito: 'Libera contas de anúncio, campanhas e distribuição de verba',
  },
  'modulo:conformidade': {
    rotulo: 'Módulo Conformidade',
    efeito: 'Libera a fila de pareceres sobre criativo e página de destino',
  },
  'modulo:plataformas': {
    rotulo: 'Módulo Plataformas',
    efeito: 'Libera a saúde das integrações Meta, Google, TikTok e LinkedIn',
  },
  'verba:aprovar_realocacao': {
    rotulo: 'Aprovar realocação de verba',
    efeito: 'Pode mover orçamento entre contas depois do ciclo aplicado',
  },
  'conformidade:liberar_com_ressalva': {
    rotulo: 'Liberar com ressalva',
    efeito: 'Só tem efeito para quem está no departamento Conformidade (CNF-R21)',
  },
  'cobranca:receber_pendentes': {
    rotulo: 'Receber cobranças pendentes',
    efeito: 'Entra na fila de atribuição de cobrança',
  },
  'cobranca:receber_aviso_inadimplencia': {
    rotulo: 'Receber aviso de inadimplência',
    efeito: 'Recebe a notificação D+15 — sem ninguém marcado, ninguém é avisado',
  },
  'auditoria:repasse_midia': {
    rotulo: 'Auditoria de repasse de mídia',
    efeito: 'Acesso à tela de auditoria, que não aparece no menu',
  },
  'assistente:financeiro': {
    rotulo: 'Assistente — dados financeiros',
    efeito: 'Permite ao assistente responder com números financeiros agregados',
  },
};

export const TODAS_PERMISSOES = Object.keys(PERMISSAO_LABEL) as NamedPermission[];

export const DEPARTAMENTOS = [
  'Comercial',
  'Conformidade',
  'Criação',
  'Customer Success',
  'Financeiro',
  'Operações',
  'Tecnologia',
  'Tráfego',
] as const;

/** Duas primeiras iniciais do nome, ignorando conectivos. */
export function iniciais(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((p) => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p.toLowerCase()));
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * INV-05 — papel novo não herda acesso. O formulário mostra exatamente o que o
 * papel abre, para que a escolha seja consciente e não uma aposta.
 */
export function acessoDoPapel(
  role: UserRole,
  permissoes: NamedPermission[],
): Array<{ rotulo: string; nivel: Exclude<AccessLevel, 'blocked'>; viaPermissao: boolean }> {
  const fake: Profile = {
    id: '__preview__',
    nome: '',
    email: '',
    role,
    departamento: null,
    permissoes,
    white_label_id: null,
    avatar_iniciais: '',
  };

  return MODULOS.flatMap((modulo) => {
    const nivel = nivelDeAcesso(modulo, fake);
    if (nivel === 'blocked') return [];
    const viaPermissao = !modulo.papeis.includes(role) && nivel === 'full';
    return [{ rotulo: modulo.rotulo, nivel, viaPermissao }];
  });
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export type ErrosUsuario = Partial<Record<keyof UsuarioFormData, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Papéis internos: exigem departamento porque regras dependem dele. */
const EXIGE_DEPARTAMENTO = new Set<UserRole>([
  'adm',
  'gerente',
  'gestor_trafego',
  'analista_conformidade',
  'criativo',
  'closer',
  'sdr',
  'cs',
  'financeiro',
]);

export function validarUsuario(
  dados: UsuarioFormData,
  contexto: { usuarios: Usuario[]; ator: Profile; editandoId?: string },
): ErrosUsuario {
  const erros: ErrosUsuario = {};
  const { usuarios, ator, editandoId } = contexto;

  const nome = dados.nome.trim();
  if (!nome) {
    erros.nome = 'Informe o nome.';
  } else if (nome.split(/\s+/).length < 2) {
    erros.nome = 'Informe nome e sobrenome — as iniciais do avatar saem daqui.';
  }

  const email = dados.email.trim().toLowerCase();
  if (!email) {
    erros.email = 'Informe o e-mail.';
  } else if (!EMAIL_RE.test(email)) {
    erros.email = 'E-mail inválido.';
  } else {
    const duplicado = usuarios.some(
      (u) => u.email.toLowerCase() === email && u.id !== editandoId,
    );
    if (duplicado) {
      // Inclui inativos de propósito: reaproveitar o e-mail de uma conta
      // desativada faz o histórico dos dois se misturar.
      erros.email = 'Já existe uma conta com este e-mail, ativa ou desativada.';
    }
  }

  const permitidos = papeisQuePodeCriar(ator);
  if (!dados.role) {
    erros.role = 'Escolha um papel.';
  } else if (!permitidos.includes(dados.role)) {
    erros.role = `Seu papel não pode ${editandoId ? 'atribuir' : 'criar'} contas de ${ROLE_CURTO[dados.role]}.`;
  }

  if (EXIGE_DEPARTAMENTO.has(dados.role) && !dados.departamento.trim()) {
    erros.departamento = 'Departamento é obrigatório para papéis internos.';
  }

  return erros;
}

export function temErro(erros: ErrosUsuario): boolean {
  return Object.keys(erros).length > 0;
}

/**
 * Não é possível desativar ou rebaixar o último administrador ativo — o
 * sistema ficaria sem ninguém capaz de criar contas.
 */
export function ultimoAdminAtivo(usuarios: Usuario[], id: string): boolean {
  const ativos = usuarios.filter((u) => u.role === 'adm' && u.status === 'ativo');
  return ativos.length === 1 && ativos[0].id === id;
}
