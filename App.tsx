import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsuariosProvider } from '@/src/contexts/UsuariosContext';
import { AdvogadosProvider } from '@/src/contexts/AdvogadosContext';
import { LeadsProvider } from '@/src/contexts/LeadsContext';
import { CreditosProvider } from '@/src/contexts/CreditosContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { AppLayout } from '@/src/components/Layout/AppLayout';
import { GuardaDeRota } from '@/src/components/Layout/GuardaDeRota';
import { DashboardView } from '@/views/Dashboard/DashboardView';
import { LeadsView } from '@/views/Leads/LeadsView';
import { AdvogadosView } from '@/views/Advogados/AdvogadosView';
import { TesesView } from '@/views/Teses/TesesView';
import { QualificacaoView } from '@/views/Qualificacao/QualificacaoView';
import { CampanhasView } from '@/views/Campanhas/CampanhasView';
import { ConformidadeView } from '@/views/Conformidade/ConformidadeView';
import { CreditosView } from '@/views/Creditos/CreditosView';
import { IntegracoesView } from '@/views/Integracoes/IntegracoesView';
import { UsuariosView } from '@/views/Config/UsuariosView';

export default function App() {
  return (
    <UsuariosProvider>
      <AdvogadosProvider>
        <LeadsProvider>
          <CreditosProvider>
            <AuthProvider>
              <HashRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                    {/*
                      ACC-R07 — o guard fica dentro da moldura: a barra superior
                      continua desenhada enquanto ele decide, e quem não tem
                      acesso volta ao painel em vez de ver a tela piscar.
                    */}
                    <Route element={<GuardaDeRota />}>
                      <Route index element={<DashboardView />} />
                      <Route path="leads" element={<LeadsView />} />
                      <Route path="advogados" element={<AdvogadosView />} />
                      <Route path="teses" element={<TesesView />} />
                      <Route path="qualificacao" element={<QualificacaoView />} />
                      <Route path="campanhas" element={<CampanhasView />} />
                      <Route path="conformidade" element={<ConformidadeView />} />
                      <Route path="creditos" element={<CreditosView />} />
                      <Route path="integracoes" element={<IntegracoesView />} />
                      <Route path="config">
                        <Route index element={<Navigate to="usuarios" replace />} />
                        <Route path="usuarios" element={<UsuariosView />} />
                        <Route path="*" element={<Navigate to="usuarios" replace />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </HashRouter>
            </AuthProvider>
          </CreditosProvider>
        </LeadsProvider>
      </AdvogadosProvider>
    </UsuariosProvider>
  );
}
