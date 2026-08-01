import type { AccessLevel, ModuleId, NamedPermission, Profile, UserRole } from '@/types';

export interface ModuleDef {
  id: ModuleId;
  rotulo: string;
  rota: string;
  descricao: string;
  /** Papéis com acesso pleno ao módulo. */
  papeis: UserRole[];
  /** Papéis com leitura restrita (ex.: advogado só vê o próprio recorte). */
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
 * adicionado aqui conscientemente (`INV-05`).
 *
 * ACC-R07 — esconder do menu não é bloquear a rota. O que está aqui controla
 * apenas a navegação; bloqueio real de rota é responsabilidade do guard, que
 * ainda não existe. A dívida ficou mais cara desde que `advogado` entrou: é
 * papel externo, e quem digita `/creditos` na barra de endereço chega lá.
 */
export const MODULOS: ModuleDef[] = [
  {
    id: 'dashboard',
    rotulo: 'Painel',
    rota: '/',
    descricao: 'Painel de entrada',
    papeis: [
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
    ],
    papeisRestritos: ['advogado'],
    grupo: 'operacao',
  },
  {
    id: 'leads',
    rotulo: 'Leads',
    rota: '/leads',
    descricao: 'Catálogo de leads qualificados com reunião agendada',
    papeis: ['adm', 'gerente', 'operador_ia', 'cs'],
    // O advogado entra aqui pelo catálogo mascarado e pelos leads que comprou;
    // closer e SDR precisam saber o que há em estoque para vender o acesso.
    papeisRestritos: ['advogado', 'closer', 'sdr'],
    grupo: 'operacao',
  },
  {
    id: 'advogados',
    rotulo: 'Advogados',
    rota: '/advogados',
    descricao: 'Funil de aquisição do advogado e liberação de acesso',
    papeis: ['adm', 'gerente', 'closer', 'sdr', 'cs'],
    grupo: 'operacao',
  },
  {
    id: 'teses',
    rotulo: 'Teses',
    rota: '/teses',
    descricao: 'Público, oferta, filtros de elegibilidade e preço de cada tese',
    papeis: ['adm', 'gerente', 'operador_ia', 'analista_conformidade'],
    papeisRestritos: ['criativo', 'gestor_trafego', 'advogado'],
    grupo: 'operacao',
  },
  {
    id: 'qualificacao',
    rotulo: 'Qualificação',
    rota: '/qualificacao',
    descricao: 'Fila da SDR de voz: ligações, resultado e gravação',
    papeis: ['adm', 'gerente', 'operador_ia'],
    papeisRestritos: ['closer', 'sdr', 'analista_conformidade'],
    liberadoPor: 'modulo:qualificacao',
    grupo: 'operacao',
  },
  {
    id: 'campanhas',
    rotulo: 'Campanhas',
    rota: '/campanhas',
    descricao: 'Anúncios por tese e custo por lead qualificado',
    papeis: ['adm', 'gerente', 'gestor_trafego'],
    papeisRestritos: ['criativo'],
    liberadoPor: 'modulo:campanhas',
    grupo: 'operacao',
  },
  {
    id: 'conformidade',
    rotulo: 'Conformidade',
    rota: '/conformidade',
    descricao: 'Parecer sobre criativo à luz do Provimento 205 da OAB',
    papeis: ['adm', 'analista_conformidade'],
    papeisRestritos: ['criativo', 'gestor_trafego'],
    liberadoPor: 'modulo:conformidade',
    grupo: 'operacao',
  },
  {
    id: 'creditos',
    rotulo: 'Créditos',
    rota: '/creditos',
    descricao: 'Pacotes, saldo, consumo por tese e receita',
    papeis: ['adm', 'gerente', 'financeiro'],
    papeisRestritos: ['advogado'],
    grupo: 'operacao',
  },
  {
    id: 'integracoes',
    rotulo: 'Integrações',
    rota: '/integracoes',
    descricao: 'Saúde da SDR de voz, dos anúncios, do pagamento e do WhatsApp',
    papeis: ['adm', 'gerente', 'gestor_trafego'],
    papeisRestritos: ['operador_ia'],
    liberadoPor: 'modulo:integracoes',
    grupo: 'apoio',
  },
  {
    id: 'config',
    rotulo: 'Configurações',
    rota: '/config',
    descricao: 'Usuários, papéis e permissões',
    papeis: ['adm', 'gerente'],
    papeisRestritos: [
      'gestor_trafego',
      'criativo',
      'analista_conformidade',
      'operador_ia',
      'closer',
      'sdr',
      'cs',
      'financeiro',
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
 * tela inicial não restringe nada — só esconde o caminho. Todo bloco do painel
 * que fala de um módulo passa por aqui.
 */
export function podeAcessar(moduloId: ModuleId, perfil: Profile): boolean {
  const modulo = MODULOS.find((m) => m.id === moduloId);
  if (!modulo) return false;
  return nivelDeAcesso(modulo, perfil) === 'full';
}

/**
 * Verdadeiro quando o papel só enxerga o próprio recorte do módulo. É o caso do
 * advogado no catálogo e no extrato: a tela existe, o conteúdo é filtrado.
 */
export function temAcessoRestrito(moduloId: ModuleId, perfil: Profile): boolean {
  const modulo = MODULOS.find((m) => m.id === moduloId);
  if (!modulo) return false;
  return nivelDeAcesso(modulo, perfil) === 'restricted';
}
