# CRM

CRM de agência de **tráfego pago para profissionais de captação regulada** —
advogados (OAB), contadores (CFC), médicos (CFM), dentistas (CFO) e psicólogos
(CFP).

O que a agência vende é lead qualificado. O que a limita é que a publicidade
desses profissionais é regulada: anúncio fora da norma expõe o cliente a
processo ético no conselho dele. Por isso a conformidade é um portão de verdade
no fluxo, não uma revisão opcional.

**captar o cliente → aprovar a conformidade → distribuir a verba → cobrar o entregue**

Estado atual: **maquete**. Sem backend — o que existe persiste em `localStorage`.
Telas construídas: Dashboard, CRM (funil) e Configurações → Usuários. Os demais
módulos são placeholders.

## Rodando

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run typecheck` | Só a verificação de tipos |
| `npm run preview` | Serve o build |
| `npm run shot` | Captura a tela num Chromium headless |
| `npm run smoke` | Testes de fluxo de CRM e Usuários (precisa do `dev` rodando) |

### Visualizar

Com `npm run dev` rodando, abra <http://localhost:5173>.

Para capturar a tela sem abrir navegador (útil para conferir mudança de layout
ou o painel sob outro papel):

```bash
npm run shot                                   # / no viewport desktop
npm run shot -- --mobile                       # viewport estreito
npm run shot -- --largura 1100                 # largura específica
npm run shot -- --perfil u-gestor              # painel como gestor de tráfego
npm run shot -- /config/usuarios --out u.png   # outra rota
npm run shot -- /config/usuarios --click "text=Novo usuário"   # abre o drawer
```

As imagens vão para `.screenshots/` (fora do versionamento). O script também
falha se algo escrever erro no console — vale como smoke test.

O seletor de perfil no canto superior direito troca o papel ativo em tempo real.
É a maneira de conferir a matriz de acesso: o menu **e o conteúdo do painel**
mudam junto.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · react-router-dom v7 (`HashRouter`)

Alias de caminho: `@/*` → raiz do repositório.
Paleta: roxo (`roxo-*`) com acento magenta (`magenta-*`), definida em
`src/index.css`. Cores semânticas (verde, âmbar, vermelho) usam a escala padrão
do Tailwind — status não é cor de marca.

## Estrutura

```
App.tsx                        Rotas
main.tsx                       Entrada
types.ts                       Tipos de domínio (vocabulário canônico)
src/
  components/Layout/           Topbar (navegação) e shell
  components/Assistente/       Assistente interno
  contexts/UsuariosContext.tsx Cadastro de usuários (persiste em localStorage)
  contexts/AuthContext.tsx     Perfil ativo, permissões, departamento
  lib/navigation.ts            Mapa de módulos × matriz de acesso
  lib/usuarios.ts              Hierarquia de criação, validação, prévia de acesso
  lib/format.ts                Datas e tempo relativo
  lib/mockData.ts              Contas semeadas e dados de maquete
  index.css                    Tema Tailwind
views/
  Dashboard/                   Tela inicial
  CRM/                         Negociações (Kanban + tabela + cadastro)
  Config/                      Usuários (lista + drawer de cadastro)
  Placeholder/                 Módulos ainda não construídos
scripts/
  screenshot.mjs               Captura headless
  smoke-usuarios.mjs           Teste de fluxo do cadastro de usuários
  smoke-crm.mjs                Teste de fluxo do funil
```

## Módulo CRM

`/#/crm`. Kanban do funil com arrastar-e-soltar, mais visão em tabela pelo mesmo
filtro. Persiste em `localStorage` (`crm.negociacoes.v1`).

| Regra | O que faz |
| --- | --- |
| `CRM-R01` | O título é sempre o nome do cliente — não existe título independente |
| `CRM-R04` | Toda mudança de etapa conta como atividade e tira do congelamento |
| `CRM-R05` | 12 dias sem interação exibe a negociação como congelada. É visual: não muda status nem responsável |
| `CRM-R10` | Marcar como perdida exige motivo escrito |
| `CRM-R17` | Prioridade P1/P2/P3 automática, sobrescrevível pelo gestor |
| `CRM-R20` | Sem conselho regulador não avança para contrato assinado, e conta não é ativada pulando conformidade |
| — | Closer, SDR e parceiro veem apenas a própria carteira |
| — | Cliente duplicado é recusado enquanto houver negociação ativa com o mesmo nome |
| — | Trocar o conselho limpa o nicho, que é derivado dele |

O funil do Dashboard lê **o mesmo store** — não há mock paralelo.

## Módulo de Usuários

`Configurações → Usuários` (`/#/config/usuarios`). Estado persiste em
`localStorage` (`crm.usuarios.v1`) — limpar essa chave restaura as contas
semeadas.

As regras que o módulo impõe:

| Regra | O que faz |
| --- | --- |
| `ACC-R02` | Criação é hierárquica. ADM cria todos; gerente cria o time de operação; gestor de tráfego cria só criativo |
| `ACC-R03` | Ninguém edita nem desativa a própria conta por aqui, nem administrador |
| `ACC-R21` | Conta nunca é excluída, só desativada — o histórico precisa continuar apontando para alguém |
| `ACC-R22` | Conta nasce como convite pendente e vira ativa no primeiro acesso |
| `CNF-R21` | Marca com alerta quem tem "liberar com ressalva" fora do departamento Conformidade, onde a permissão não tem efeito |
| `INV-05` | O formulário mostra a prévia de acesso do papel — papel novo não herda nada |
| — | E-mail único, inclusive contra contas desativadas |
| — | Não é possível desativar nem rebaixar o último administrador ativo |
| — | Trocar o papel repõe as permissões padrão dele, em vez de manter as do papel anterior |

## Convenções

O código usa o **vocabulário canônico**, não o rótulo da tela — `types.ts`
desambigua. "Cliente" é o escritório contratante; **Conta de Anúncio** é a
entidade operacional que atravessa todos os módulos.

Regras de negócio são citadas pelo ID estável (`CNF-R04`, `VRB-R01`, `FIN-R25`)
nos comentários. Quem for mexer numa regra procura pelo ID. IDs não são
renumerados: regra removida deixa o ID vago e aposentado.

| Prefixo | Domínio |
| --- | --- |
| `ACC` | Papéis, permissões e acesso |
| `CRM` | Funil comercial, diagnóstico, proposta |
| `CNF` | Conformidade publicitária (OAB, CFC, CFM, CFO, CFP) |
| `VRB` | Verba, distribuição de orçamento, contas de anúncio |
| `CMP` | Campanhas e criativos |
| `FIN` | Fee, repasse de mídia, cobrança, inadimplência |
| `PLT` | Plataformas de anúncio |
| `TAR` | Tarefas e solicitações |
| `INT` | Integrações externas |
| `AUT` | Automações agendadas |
| `ASS` | Assistente de IA |
| `EST` | Estilização — tokens, camadas, padrões de componente |
| `API` | Camada de dados, integrações e eventos |

A navegação e o conteúdo do painel filtram por papel, mas **esconder não é
bloquear a rota** — falta o guard.
