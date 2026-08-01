import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsuariosProvider } from '@/src/contexts/UsuariosContext';
import { NegociacoesProvider } from '@/src/contexts/NegociacoesContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { AppLayout } from '@/src/components/Layout/AppLayout';
import { DashboardView } from '@/views/Dashboard/DashboardView';
import { NegociacoesView } from '@/views/CRM/NegociacoesView';
import { UsuariosView } from '@/views/Config/UsuariosView';
import { ModuloEmConstrucao } from '@/views/Placeholder/ModuloEmConstrucao';

export default function App() {
  return (
    <UsuariosProvider>
      <NegociacoesProvider>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardView />} />
                <Route path="crm" element={<NegociacoesView />} />
                <Route path="conformidade/*" element={<ModuloEmConstrucao />} />
                <Route path="campanhas/*" element={<ModuloEmConstrucao />} />
                <Route path="financeiro/*" element={<ModuloEmConstrucao />} />
                <Route path="tarefas/*" element={<ModuloEmConstrucao />} />
                <Route path="plataformas/*" element={<ModuloEmConstrucao />} />
                <Route path="academy/*" element={<ModuloEmConstrucao />} />
                <Route path="config">
                  <Route index element={<Navigate to="usuarios" replace />} />
                  <Route path="usuarios" element={<UsuariosView />} />
                  <Route path="*" element={<ModuloEmConstrucao />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </NegociacoesProvider>
    </UsuariosProvider>
  );
}
