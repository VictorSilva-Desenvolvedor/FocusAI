import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UsuariosProvider } from '@/src/contexts/UsuariosContext';
import { AdvogadosProvider } from '@/src/contexts/AdvogadosContext';
import { LeadsProvider } from '@/src/contexts/LeadsContext';
import { CreditosProvider } from '@/src/contexts/CreditosContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { AppLayout } from '@/src/components/Layout/AppLayout';
import { GuardaDeRota } from '@/src/components/Layout/GuardaDeRota';
import { PortaoDeSessao } from '@/src/components/Layout/PortaoDeSessao';
import { LoginView } from '@/views/Login/LoginView';
import { RedefinirSenhaView } from '@/views/RedefinirSenha/RedefinirSenhaView';
import { DashboardView } from '@/views/Dashboard/DashboardView';
import { LeadsView } from '@/views/Leads/LeadsView';
import { AdvogadosView } from '@/views/Advogados/AdvogadosView';
import { TesesView } from '@/views/Teses/TesesView';
import { QualificacaoView } from '@/views/Qualificacao/QualificacaoView';
import { CampanhasView } from '@/views/Campanhas/CampanhasView';
import { ConformidadeView } from '@/views/Conformidade/ConformidadeView';
import { CreditosView } from '@/views/Creditos/CreditosView';
import { IntegracoesView } from '@/views/Integracoes/IntegracoesView';
import { ConfigLayout } from '@/views/Config/ConfigLayout';
import { ContaPerfilView } from '@/views/Config/ContaPerfilView';
import { EmConstrucaoView } from '@/views/Config/EmConstrucaoView';
import { LogsSistemaView } from '@/views/Config/LogsSistemaView';
import { NotificacoesView } from '@/views/Config/NotificacoesView';
import { MeuDinheiroView } from '@/views/Config/MeuDinheiroView';
import { FunisEtapasView } from '@/views/Config/FunisEtapasView';
import { SlaPrazosView } from '@/views/Config/SlaPrazosView';
import { ApisWebhooksView } from '@/views/Config/ApisWebhooksView';
import { UsuariosView } from '@/views/Config/UsuariosView';

export default function App() {
  return (
    <UsuariosProvider>
      <AdvogadosProvider>
        <LeadsProvider>
          <CreditosProvider>
            {/*
              O roteador é o pai do provider de sessão, e não o contrário: a
              tela de login precisa ser uma rota, e rota não existe fora do
              roteador.
            */}
            <HashRouter>
              <AuthProvider>
                <Routes>
                  {/* As duas rotas sem sessão. Fora da moldura: não há barra
                      superior para desenhar quando não se sabe quem entrou. */}
                  <Route path="/login" element={<LoginView />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenhaView />} />

                  {/* ACC-R08 — o portão vem antes de tudo. Nada da aplicação
                      existe sem sessão autenticada e perfil resolvido. */}
                  <Route element={<PortaoDeSessao />}>
                    <Route element={<AppLayout />}>
                      {/*
                        ACC-R07 — o guard fica dentro da moldura: a barra
                        superior continua desenhada enquanto ele decide, e quem
                        não tem acesso volta ao painel em vez de ver a tela
                        piscar.
                      */}
                      <Route element={<GuardaDeRota />}>
                        <Route index element={<DashboardView />} />
                        <Route path="leads" element={<LeadsView />} />
                        <Route path="advogados" element={<AdvogadosView />} />
                        <Route path="teses" element={<TesesView />} />
                        <Route path="qualificacao" element={<QualificacaoView />} />
                        <Route path="campanhas" element={<CampanhasView />} />
                        <Route path="conformidade" element={<ConformidadeView />} />
                        {/* Preços virou seção de Créditos — link antigo continua abrindo. */}
                        <Route path="precos" element={<Navigate to="/creditos" replace />} />
                        <Route path="creditos" element={<CreditosView />} />
                        <Route path="integracoes" element={<IntegracoesView />} />
                        <Route path="config" element={<ConfigLayout />}>
                          <Route index element={<Navigate to="perfil" replace />} />
                          <Route path="perfil" element={<ContaPerfilView />} />
                          <Route path="notificacoes" element={<NotificacoesView />} />
                          <Route path="financeiro" element={<MeuDinheiroView />} />
                          <Route
                            path="bancarios"
                            element={
                              <EmConstrucaoView
                                titulo="Dados Bancários"
                                descricao="Não há hoje nenhum fluxo em que a Focus AI transfere dinheiro para a conta do advogado — devolução de lead credita saldo (CRE-R05), nunca dinheiro. Sem esse fluxo, guardar dado bancário não teria para que servir."
                              />
                            }
                          />
                          <Route path="usuarios" element={<UsuariosView />} />
                          <Route
                            path="equipe"
                            element={
                              <EmConstrucaoView
                                titulo="Equipe de Parceiros"
                                descricao="Hoje cada advogado tem no máximo uma conta de acesso, criada na liberação do funil (INV-12, ADV-R09). O esquema até permite mais de uma por escritório, mas nada no produto cria uma segunda — não há 'equipe' para listar ainda."
                              />
                            }
                          />
                          <Route path="funis" element={<FunisEtapasView />} />
                          <Route path="sla" element={<SlaPrazosView />} />
                          <Route path="logs" element={<LogsSistemaView />} />
                          <Route path="apis" element={<ApisWebhooksView />} />
                          <Route
                            path="termo"
                            element={
                              <EmConstrucaoView
                                titulo="Assinaturas do Termo"
                                descricao="Não existe termo de adesão com assinatura, testemunha ou procurador em nenhum lugar do sistema hoje — nem tela, nem tabela, nem documento. Precisa nascer como demanda própria, com o desenho jurídico definido antes do código."
                              />
                            }
                          />
                          <Route
                            path="empresas"
                            element={
                              <EmConstrucaoView
                                titulo="Empresas Parceiras"
                                descricao="Não existe o conceito de empresa parceira (com contrato e percentual) no modelo de negócio documentado — a Focus AI intermedeia lead e advogado diretamente, sem uma terceira entidade contratante no meio."
                              />
                            }
                          />
                          <Route path="*" element={<Navigate to="perfil" replace />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            </HashRouter>
          </CreditosProvider>
        </LeadsProvider>
      </AdvogadosProvider>
    </UsuariosProvider>
  );
}
