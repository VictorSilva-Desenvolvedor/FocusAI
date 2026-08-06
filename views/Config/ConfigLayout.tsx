import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  FileSignature,
  Handshake,
  Landmark,
  ScrollText,
  Timer,
  UserCircle,
  Users,
  Wallet,
  Webhook,
  Workflow,
} from 'lucide-react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { MODULOS, nivelDeAcesso } from '@/src/lib/navigation';

interface AbaConfig {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  /**
   * `INV-05` — ferramenta de administração, não conta de quem está logado.
   * Só quem tem nível `full` no módulo enxerga; `advogado` e papel restrito
   * ficam só com as abas de conta própria (`somenteCompleto: false`).
   */
  somenteCompleto: boolean;
}

/**
 * As abas de Configurações. A maioria ainda não tem tela por trás — a decisão
 * foi construir uma aba de cada vez, começando por Conta & Perfil, que é a
 * que `ACC-R03` já citava e não existia (`atualizar_usuario` recusa a própria
 * conta e manda "usar a tela de perfil"). As demais entram como demanda
 * própria, não de passagem.
 */
const ABAS: AbaConfig[] = [
  { id: 'perfil', rotulo: 'Conta & Perfil', icone: UserCircle, somenteCompleto: false },
  { id: 'notificacoes', rotulo: 'Notificações', icone: Bell, somenteCompleto: false },
  { id: 'financeiro', rotulo: 'Meu Dinheiro', icone: Wallet, somenteCompleto: false },
  { id: 'bancarios', rotulo: 'Dados Bancários', icone: Landmark, somenteCompleto: false },
  { id: 'usuarios', rotulo: 'Usuários e Permissões', icone: Users, somenteCompleto: true },
  { id: 'equipe', rotulo: 'Equipe de Parceiros', icone: Handshake, somenteCompleto: true },
  { id: 'funis', rotulo: 'Funis e Etapas', icone: Workflow, somenteCompleto: true },
  { id: 'sla', rotulo: 'SLA / Prazos', icone: Timer, somenteCompleto: true },
  { id: 'logs', rotulo: 'Logs do Sistema', icone: ScrollText, somenteCompleto: true },
  { id: 'apis', rotulo: 'APIs e Webhooks', icone: Webhook, somenteCompleto: true },
  { id: 'termo', rotulo: 'Assinaturas do Termo', icone: FileSignature, somenteCompleto: true },
  { id: 'empresas', rotulo: 'Empresas Parceiras', icone: Building2, somenteCompleto: true },
];

const MODULO_CONFIG = MODULOS.find((m) => m.id === 'config')!;

export function ConfigLayout() {
  const { perfil } = useAuth();
  const { pathname } = useLocation();

  const nivel = nivelDeAcesso(MODULO_CONFIG, perfil);
  const abasVisiveis = ABAS.filter((aba) => !aba.somenteCompleto || nivel === 'full');

  // A rota já passou pelo GuardaDeRota (nível não é `blocked`); aqui só falta
  // recusar a aba de administração para quem só tem `restricted` no módulo —
  // sem isso, digitar /config/usuarios na barra de endereço abriria a aba
  // mesmo para quem o menu já esconde.
  const idAtual = pathname.split('/')[2] ?? '';
  const abaAtual = ABAS.find((aba) => aba.id === idAtual);
  if (abaAtual?.somenteCompleto && nivel !== 'full') {
    return <Navigate to="/config/perfil" replace />;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-6 pb-24 animate-entrada-suave">
      <div className="mb-5">
        <h1 className="titulo-pagina">Configurações</h1>
        <p className="subtitulo-pagina mt-1">
          {nivel === 'full'
            ? 'Sua conta e, para quem administra, o time e as regras do sistema.'
            : 'Seus dados de conta e acesso.'}
        </p>
      </div>

      <nav className="abas mb-6" aria-label="Seções de configurações">
        {abasVisiveis.map((aba) => (
          <NavLink
            key={aba.id}
            to={`/config/${aba.id}`}
            className={({ isActive }) => `aba flex items-center gap-1.5 ${isActive ? 'aba-ativa' : ''}`}
          >
            <aba.icone className="size-3.5" />
            {aba.rotulo}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
