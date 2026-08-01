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
 * em nenhuma lista de valores só pode ser criado por `adm`.
 *
 * `advogado` está de fora de propósito, e é o ponto mais importante desta
 * tabela: conta de advogado não nasce daqui. Ela nasce da liberação de acesso
 * no funil, depois da inscrição da OAB conferida (`INV-12`). Criar advogado
 * pelo painel de usuários seria o cadastro livre que o modelo recusa — e
 * entregaria dado pessoal de cliente final a quem ninguém checou.
 */
export const PODE_CRIAR: Partial<Record<UserRole, UserRole[]>> = {
  adm: [
    'gerente',
    'gestor_trafego',
    'criativo',
    'analista_conformidade',
    'operador_ia',
    'closer',
    'sdr',
    'cs',
    'financeiro',
    'adm',
  ],
  gerente: [
    'gestor_trafego',
    'criativo',
    'analista_conformidade',
    'operador_ia',
    'closer',
    'sdr',
    'cs',
    'financeiro',
  ],
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
  if (alvo.role === 'advogado') {
    return 'Conta de advogado é gerenciada no funil de Advogados, onde a inscrição da OAB é conferida (INV-12).';
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
  criativo: 'Criativo',
  analista_conformidade: 'Analista de Conformidade',
  operador_ia: 'Operador da IA',
  closer: 'Closer',
  sdr: 'SDR',
  cs: 'Customer Success',
  financeiro: 'Financeiro',
  advogado: 'Advogado',
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
    'modulo:qualificacao',
    'modulo:integracoes',
    'tese:definir_preco',
    'advogado:liberar_acesso',
    'lead:aprovar_devolucao',
    'credito:conciliar_pagamento',
    'assistente:financeiro',
  ],
  gerente: [
    'modulo:integracoes',
    'tese:definir_preco',
    'advogado:liberar_acesso',
    'lead:aprovar_devolucao',
  ],
  gestor_trafego: ['modulo:campanhas', 'modulo:integracoes'],
  analista_conformidade: ['modulo:conformidade', 'conformidade:liberar_com_ressalva'],
  operador_ia: ['modulo:qualificacao'],
  closer: ['advogado:liberar_acesso'],
  cs: ['lead:aprovar_devolucao'],
  financeiro: ['credito:conciliar_pagamento', 'lead:aprovar_devolucao'],
};

export function permissoesPadrao(role: UserRole): NamedPermission[] {
  return [...(PERMISSOES_PADRAO[role] ?? [])];
}

export const PERMISSAO_LABEL: Record<NamedPermission, { rotulo: string; efeito: string }> = {
  'modulo:campanhas': {
    rotulo: 'Módulo Campanhas',
    efeito: 'Libera os anúncios por tese e o custo por lead qualificado',
  },
  'modulo:conformidade': {
    rotulo: 'Módulo Conformidade',
    efeito: 'Libera a fila de pareceres sobre criativo',
  },
  'modulo:qualificacao': {
    rotulo: 'Módulo Qualificação',
    efeito: 'Libera a fila de ligações da SDR de voz e as gravações',
  },
  'modulo:integracoes': {
    rotulo: 'Módulo Integrações',
    efeito: 'Libera a saúde das integrações de voz, anúncio, pagamento e WhatsApp',
  },
  'tese:definir_preco': {
    rotulo: 'Definir preço da tese',
    efeito: 'Altera o custo em créditos e o preço avulso — não reescreve o que já foi publicado (CRE-R03)',
  },
  'advogado:liberar_acesso': {
    rotulo: 'Liberar acesso de advogado',
    efeito: 'Cria a conta do advogado depois da inscrição da OAB conferida (INV-12)',
  },
  'lead:aprovar_devolucao': {
    rotulo: 'Aprovar devolução de lead',
    efeito: 'Devolve o crédito ao advogado. O lead não volta ao catálogo (CRE-R05)',
  },
  'conformidade:liberar_com_ressalva': {
    rotulo: 'Liberar com ressalva',
    efeito: 'Só tem efeito para quem está no departamento Conformidade (CNF-R21)',
  },
  'credito:conciliar_pagamento': {
    rotulo: 'Conciliar pagamento de crédito',
    efeito: 'Confere o extrato. Não credita: só a confirmação bancária credita (INV-14)',
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
  'Qualificação',
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
    advogado_id: null,
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
  'criativo',
  'analista_conformidade',
  'operador_ia',
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
  } else if (dados.role === 'advogado') {
    // INV-12 — a única porta de entrada do advogado é o funil.
    erros.role =
      'Conta de advogado só nasce da liberação de acesso no funil, com a inscrição da OAB conferida (INV-12).';
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
