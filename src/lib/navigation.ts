import type { AccessLevel, ModuleId, NamedPermission, Profile, UserRole } from '@/types';

export interface ModuleDef {
  id: ModuleId;
  rotulo: string;
  rota: string;
  descricao: string;
  /** Papéis com acesso pleno ao módulo. */
  papeis: UserRole[];
  /** Papéis com leitura restrita (ex.: criativo só vê a fila de criativos). */
  papeisRestritos?: UserRole[];
  /** Permissão nomeada que libera o módulo a quem o papel bloqueia. */
  liberadoPor?: NamedPermission;
  grupo: 'operacao' | 'apoio' | 'sistema';
}

/**
 * Mapa dos módulos cruzado com a matriz de acesso.
 *
 * ACC-R01 — o sistema é permissivo por padrão e restritivo por exceção. Esta
 * lista é a exceção: papel novo NÃO herda acesso automaticamente, precisa ser
 * adicionado aqui conscientemente.
 *
 * ACC-R07 — esconder do menu não é bloquear a rota. O que está aqui controla
 * apenas a navegação; bloqueio real de rota é responsabilidade do guard.
 */
export const MODULOS: ModuleDef[] = [
  {
    id: 'dashboard',
    rotulo: 'Dashboard',
    rota: '/',
    descricao: 'Painel de entrada',
    papeis: [
      'adm',
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
    ],
    grupo: 'operacao',
  },
  {
    id: 'crm',
    rotulo: 'CRM',
    rota: '/crm',
    descricao: 'Funil comercial, diagnóstico, proposta e contrato',
    papeis: ['adm', 'gerente', 'closer', 'sdr', 'cs', 'parceiro'],
    papeisRestritos: ['gestor_trafego'],
    grupo: 'operacao',
  },
  {
    id: 'conformidade',
    rotulo: 'Conformidade',
    rota: '/conformidade',
    descricao: 'Parecer sobre criativo e página de destino (OAB, CFC, CFM, CFO, CFP)',
    papeis: ['adm', 'analista_conformidade'],
    papeisRestritos: ['criativo', 'gestor_trafego'],
    liberadoPor: 'modulo:conformidade',
    grupo: 'operacao',
  },
  {
    id: 'campanhas',
    rotulo: 'Campanhas',
    rota: '/campanhas',
    descricao: 'Contas de anúncio, campanhas, criativos e distribuição de verba',
    papeis: ['adm', 'gerente', 'gestor_trafego'],
    papeisRestritos: ['criativo', 'cs'],
    liberadoPor: 'modulo:campanhas',
    grupo: 'operacao',
  },
  {
    id: 'financeiro',
    rotulo: 'Financeiro',
    rota: '/financeiro',
    descricao: 'Contratos, fee, repasse de mídia, cobrança e inadimplência',
    papeis: ['adm', 'gerente', 'financeiro', 'white_label_admin'],
    grupo: 'operacao',
  },
  {
    id: 'tarefas',
    rotulo: 'Tarefas',
    rota: '/tarefas',
    descricao: 'Tarefas, reuniões e solicitações de TI',
    papeis: [
      'adm',
      'gerente',
      'gestor_trafego',
      'analista_conformidade',
      'criativo',
      'closer',
      'sdr',
      'cs',
      'financeiro',
    ],
    grupo: 'operacao',
  },
  {
    id: 'plataformas',
    rotulo: 'Plataformas',
    rota: '/plataformas',
    descricao: 'Saúde das integrações Meta, Google, TikTok e LinkedIn',
    papeis: ['adm', 'gerente', 'gestor_trafego'],
    liberadoPor: 'modulo:plataformas',
    grupo: 'apoio',
  },
  {
    id: 'academy',
    rotulo: 'Academy',
    rota: '/academy',
    descricao: 'Trilha de treinamento',
    papeis: [
      'adm',
      'gerente',
      'gestor_trafego',
      'analista_conformidade',
      'criativo',
      'closer',
      'sdr',
      'cs',
      'financeiro',
      'parceiro',
    ],
    grupo: 'apoio',
  },
  {
    id: 'config',
    rotulo: 'Configurações',
    rota: '/config',
    descricao: 'Usuários, funis, SLAs, integrações, contas bancárias',
    papeis: ['adm', 'gerente'],
    papeisRestritos: [
      'gestor_trafego',
      'analista_conformidade',
      'criativo',
      'closer',
      'sdr',
      'cs',
      'financeiro',
      'parceiro',
      'white_label_admin',
    ],
    grupo: 'sistema',
  },
];

export function nivelDeAcesso(modulo: ModuleDef, perfil: Profile): AccessLevel {
  if (modulo.papeis.includes(perfil.role)) return 'full';
  if (modulo.liberadoPor && perfil.permissoes.includes(modulo.liberadoPor)) return 'full';
  if (modulo.papeisRestritos?.includes(perfil.role)) return 'restricted';
  return 'blocked';
}

export function modulosVisiveis(perfil: Profile): Array<ModuleDef & { nivel: AccessLevel }> {
  return MODULOS.map((m) => ({ ...m, nivel: nivelDeAcesso(m, perfil) })).filter(
    (m) => m.nivel !== 'blocked',
  );
}

/**
 * Vale para conteúdo, não só para navegação.
 *
 * Um painel que some do menu mas continua expondo os números do módulo pela
 * tela inicial não restringe nada — só esconde o caminho. Todo bloco do
 * dashboard que fala de um módulo passa por aqui.
 */
export function podeAcessar(moduloId: ModuleId, perfil: Profile): boolean {
  const modulo = MODULOS.find((m) => m.id === moduloId);
  if (!modulo) return false;
  return nivelDeAcesso(modulo, perfil) === 'full';
}
