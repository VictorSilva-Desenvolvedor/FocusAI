import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { AssistenteButton } from '@/src/components/Assistente/AssistenteButton';

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-fundo">
      <Topbar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {/* Botão flutuante presente em todo o sistema, para papéis internos. */}
      <AssistenteButton />
    </div>
  );
}
