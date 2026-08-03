# Focus AI

Plataforma de aquisição de clientes qualificados por IA para advogados.

A Focus AI não vende serviço de marketing jurídico — vende o **produto final
pronto**: o lead qualificado com reunião já agendada. Ela roda o tráfego, uma IA
de voz qualifica o cliente final e marca a consulta; advogados compram esse lead
num aplicativo, por unidade ou consumindo crédito.

**captar o lead → qualificar com a IA → agendar a reunião → entregar ao advogado**

A entidade que atravessa tudo é o **Lead**: é ele que a campanha produz, que a
IA qualifica, que carrega a reunião, que consome crédito ao ser comprado e que
responde, perante a OAB, como aquele cliente chegou àquele advogado.

Estado atual: **maquete com login de verdade**. A autenticação é real, contra o
Supabase; os dados das telas ainda vêm de `localStorage`.

## Rodando

```bash
npm install
cp .env.example .env.local   # e preencha
npm run dev                  # http://localhost:5173
```

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck + build de produção |
| `npm run typecheck` | Só a verificação de tipos |
| `npm run preview` | Serve o build |
| `npm run contas:teste` | Cria/atualiza as contas de acesso, uma por papel |
| `npm run shot` | Captura a tela num Chromium headless |
| `npm run smoke` | Fluxos de usuários, advogados e leads (precisa do `dev` rodando) |
| `npm run smoke:rls` | Política de acesso, direto contra o banco |

## Entrar

O acesso é por e-mail e senha. `npm run contas:teste` cria uma conta por papel
para conferir a matriz de acesso — as senhas ficam em `.secrets/supabase.env`,
fora do versionamento.

| Papel | E-mail |
| --- | --- |
| Administrador | `victorpaulodev@focus.ai` |
| Gerente | `gerente@focus.ai` |
| Gestor de Tráfego | `gestortrafego@focus.ai` |
| Criativo | `criativo@focus.ai` |
| Analista de Conformidade | `analistaconformidade@focus.ai` |
| Operador da IA | `operadoria@focus.ai` |
| Closer | `closer@focus.ai` |
| SDR | `sdr@focus.ai` |
| Customer Success | `cs@focus.ai` |
| Financeiro | `financeiro@focus.ai` |
| Advogado | `advogado@focus.ai`, `advogado2@`, `advogado3@` |

São contas de desenvolvimento: senha curta e igual para todo mundo. Não têm
lugar num projeto que atenda usuário de verdade.

Além delas existem **contas nominais** — pessoas reais do time, com senha
própria. Nome, e-mail e senha ficam em `.secrets/supabase.env` e não aparecem
aqui nem no script: e-mail de pessoa real não entra em arquivo versionado, pela
mesma razão que seed é fictícia. Sem as variáveis preenchidas, o script cria só
as contas da tabela acima.

Trocar de papel é sair e entrar com outra conta — não existe seletor de perfil.
Entrar como advogado mostra o outro lado do produto: o painel do comprador, com
catálogo mascarado e saldo de créditos.

Três contas de advogado, e não uma, porque `LED-R06` não é demonstrável com uma
carteira só; a terceira tem saldo zerado, que é o caso de `CRE-R04`.

### Visualizar

Com `npm run dev` rodando, abra <http://localhost:5173>.

Para capturar a tela sem abrir navegador:

```bash
npm run shot                                     # / no viewport desktop
npm run shot -- --mobile                         # viewport estreito
npm run shot -- --largura 1600                   # largura específica
npm run shot -- /leads --out leads.png           # outra rota
npm run shot -- --perfil advogado@focus.ai       # captura sob outro papel
npm run shot -- /login --out login.png           # a porta de entrada
npm run shot -- /advogados --click "text=Novo advogado"
```

O script entra sozinho antes de capturar, com a conta de administrador ou com a
que `--perfil` indicar. As imagens vão para `.screenshots/` (fora do
versionamento), e o script **falha se algo escrever erro no console** — vale
como smoke test de qualquer tela.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · react-router-dom v7 (`HashRouter`)

Alias de caminho: `@/*` → raiz do repositório.
Paleta: roxo (`roxo-*`) com preto (`grafite-*`), definida em `src/index.css`.
Cores de estado (`sucesso-*`, `atencao-*`, `erro-*`, `info-*`) usam a escala
padrão do Tailwind sob nome de significado — status não é cor de marca.

## Estrutura

```
FOCUS-AI.md                      Especificação do produto
App.tsx                          Rotas
main.tsx                         Entrada
types.ts                         Tipos de domínio (vocabulário canônico)
src/
  components/Layout/             Topbar, shell, portão de sessão e guard de rota
  components/ui/                 Toast, MenuCartao, Campo
  components/Assistente/         Assistente interno
  contexts/AuthContext.tsx       Sessão, perfil ativo, permissões, departamento
  servicos/perfil.ts             Entrar, sair e carregar a sessão do Supabase
  lib/sessao.ts                  Casa o perfil autenticado com a seed local
  contexts/UsuariosContext.tsx   Cadastro de usuários
  contexts/AdvogadosContext.tsx  Funil de aquisição do advogado
  contexts/LeadsContext.tsx      Catálogo de leads
  contexts/CreditosContext.tsx   Extrato de créditos
  lib/navigation.ts              Mapa de módulos × matriz de acesso
  lib/usuarios.ts                Hierarquia de criação, validação, prévia de acesso
  lib/leads.ts                   Exclusividade, máscara de contato, reserva, compra
  lib/advogados.ts               Funil, liberação de acesso, prioridade
  lib/teses.ts                   As três teses e seus filtros de elegibilidade
  lib/creditos.ts                Pacotes, saldo, devolução, receita
  lib/qualificacao.ts            SDR de voz: taxa, gravação, deduplicação
  lib/integracoes.ts             Inventário real: o que opera e o que falta ligar
  lib/estilo.ts                  Tom → classe completa
  lib/identificador.ts           Slug estável para os dados semeados
  lib/format.ts                  Datas e tempo relativo
  index.css                      Tema Tailwind
views/                           Uma pasta por módulo
views/Login/LoginView.tsx        A única tela que existe sem sessão
scripts/
  contas-de-teste.mjs            Uma conta de acesso por papel
  entrar.mjs                     Login para os scripts de verificação
  screenshot.mjs                 Captura headless
  smoke-usuarios.mjs             Cadastro de usuários
  smoke-advogados.mjs            Funil de advogados
  smoke-leads.mjs                Catálogo, compra, exclusividade e devolução
  smoke-rls.mjs                  Política de acesso, direto contra o banco
```

## Módulos

| Módulo | Rota | O que faz |
| --- | --- | --- |
| Painel | `/` | Cadeia do negócio, funil, estoque por tese, alertas |
| Leads | `/leads` | Catálogo do produto: quadro e tabela para a operação, catálogo mascarado para o advogado |
| Advogados | `/advogados` | Funil de aquisição do advogado até a primeira compra |
| Teses | `/teses` | Público, oferta, filtros de elegibilidade e preço de cada tese |
| Qualificação | `/qualificacao` | Fila da SDR de voz, taxa por tese, pendências de gravação |
| Campanhas | `/campanhas` | Anúncios por tese e custo por lead qualificado |
| Conformidade | `/conformidade` | Parecer sobre criativo e a pendência do Provimento 205 |
| Créditos | `/creditos` | Pacotes, saldo, consumo e conferência do extrato |
| Integrações | `/integracoes` | Saúde da voz, do anúncio, do pagamento e do WhatsApp |
| Configurações | `/config/usuarios` | Usuários, papéis e permissões |

Estado em `localStorage`: `focus.leads.v1`, `focus.advogados.v1`,
`focus.usuarios.v1`, `focus.creditos.v1`. Limpar a chave restaura os dados
semeados — que são fictícios.

## As regras que o sistema impõe

### Leads — o produto

| Regra | O que faz |
| --- | --- |
| `INV-10` | Nenhum lead é vendido duas vezes. Devolução não recoloca no catálogo |
| `INV-11` | O telefone do cliente final só aparece depois da compra |
| `LED-R01` | Não publica no catálogo sem os filtros da tese confirmados |
| `LED-R02` | Não vende sem reunião agendada — é a hora marcada que o advogado compra |
| `LED-R04` | Abrir a ficha no catálogo trava o lead; a trava expira sozinha |
| `LED-R06` | O advogado só enxerga as próprias teses e região, mais o que comprou |
| `LED-R07` | Quem encerra a reunião é quem comprou, e só depois da hora marcada |
| `LED-R08` | A nota do lead vem do comprador — é o retorno que corrige a qualificação |

### Advogados — quem compra

| Regra | O que faz |
| --- | --- |
| `INV-12` | Advogado não se cadastra sozinho; acesso só depois da inscrição conferida |
| `ADV-R02` | Não se libera acesso pulando a qualificação |
| `ADV-R03` | Sem tese e região definidas o painel abre vazio e o aviso nunca dispara |
| `ADV-R04` | Prioridade P1/P2/P3 automática, sobrescrevível pelo gestor |
| `ADV-R05` | Marcar como perdido ou recusado exige motivo escrito |
| `ADV-R09` | A conta de acesso nasce da liberação, por quem tem a permissão |

### Teses — o que a IA apura

| Regra | O que faz |
| --- | --- |
| `TES-R01` | Vínculo: mínimo de 3 meses trabalhados |
| `TES-R02` | Vínculo: saída nos últimos 2 anos — a urgência sai do prazo, não do roteiro |
| `TES-R03` | Juros abusivos: não há campo para senha, cartão ou dado bancário (`INV-17`) |
| `TES-R04` | Polo passivo: precisa ser parte no processo e estar sem advogado atuante |
| `TES-R05` | Juros abusivos: registrar que é o advogado quem liga na hora marcada |

### Créditos

| Regra | O que faz |
| --- | --- |
| `INV-14` | Crédito só entra com confirmação de pagamento; baixa manual não credita |
| `INV-15` | Consumido fecha com comprado — o saldo é a soma do extrato |
| `CRE-R02` | Comprar é transacional: carimba o comprador e debita no mesmo passo |
| `CRE-R03` | O preço é congelado no lead ao publicar |
| `CRE-R04` | Sem saldo o botão de comprar não é desenhado |
| `CRE-R05` | Devolução exige motivo, repõe o crédito e não devolve o lead ao catálogo |
| `CRE-R06` | Ajuste manual exige permissão e motivo — e não se disfarça de pagamento |

### Acesso

| Regra | O que faz |
| --- | --- |
| `ACC-R02` | Criação é hierárquica. Conta de advogado nunca nasce por aqui |
| `ACC-R07` | A rota é bloqueada, não só escondida do menu — o guard usa a mesma matriz |
| `ACC-R08` | Nenhuma rota abre sem sessão. Perfil que não resolve fecha, não abre |
| `ACC-R09` | O login não diz se foi o e-mail ou a senha que estava errado |
| `ACC-R03` | Ninguém edita nem desativa a própria conta pelo painel |
| `ACC-R21` | Conta nunca é excluída, só desativada |
| `ACC-R22` | Conta nasce como convite pendente e vira ativa no primeiro acesso |
| `INV-05` | Papel novo não herda acesso — o formulário mostra a prévia |

## Convenções

O código usa o **vocabulário canônico**, não o rótulo da tela — `types.ts`
desambigua. **Lead** é sempre o cliente final; **advogado** é sempre o comprador.

Regras de negócio são citadas pelo ID estável (`LED-R03`, `TES-R02`, `CRE-R05`)
nos comentários, junto do motivo. Quem for mexer numa regra procura pelo ID. IDs
não são renumerados: regra removida deixa o ID aposentado.

| Prefixo | Domínio |
| --- | --- |
| `ACC` | Papéis, permissões e acesso |
| `LED` | Lead qualificado: catálogo, exclusividade, contato |
| `ADV` | Funil do advogado e liberação de acesso |
| `TES` | Teses, elegibilidade e roteiro |
| `QUA` | Qualificação por IA |
| `CRE` | Créditos, preço e devolução |
| `CNF` | Conformidade publicitária (Provimento 205) |
| `CMP` | Campanhas e criativos |
| `INT` | Integrações externas |
| `AUT` | Automações agendadas |
| `ASS` | Assistente de IA |
| `EST` | Estilização — tokens, camadas, padrões de componente |
| `API` | Camada de dados, integrações e eventos |

## Pendências conhecidas

- **Validação jurídica do Provimento 205.** Um intermediário que dá a múltiplos
  advogados acesso a dados de possíveis clientes levanta questão de captação de
  clientela. Precisa de revisão por especialista em ética profissional **antes do
  lançamento comercial**. Não impede construir; impede lançar.
- **Sessão real, dados de maquete.** O login autentica contra o Supabase, mas
  leads, advogados, créditos e usuários ainda vivem em `localStorage`. O perfil
  autenticado é casado com a seed local pelo e-mail (`src/lib/sessao.ts`) — sem
  isso o advogado entraria num painel vazio, porque o `advogado_id` do banco é
  uuid e o da seed é slug. Migrar os quatro contextos para os serviços de
  `src/servicos/` é a demanda que apaga esse arquivo.
- **Cadastro público ainda aberto no projeto Supabase.** Conta criada por fora
  não ganha linha em `perfis` e cai como bloqueada, então não enxerga nada — mas
  `disable_signup` precisa ir para `true` em Authentication › Sign In / Providers.
  `INV-12` diz que ninguém se cadastra sozinho, e o lugar de fechar isso é a
  configuração, não o código.
- **Sem recuperação de senha.** Trocar senha é pelo `npm run contas:teste` ou
  pelo painel do Supabase.
- **Convite não sai de verdade.** A conta do advogado já nasce da liberação
  (`ADV-R09`), mas o e-mail com o acesso depende de serviço de envio.
- **Aviso de lead novo não sai.** Três telas prometem ao advogado que ele será
  avisado; a integração de WhatsApp está marcada como não configurada e a
  etapa aparece como pulada (`API-R10`). Falta o disparo.
- **Compra de pacote não tem checkout.** Crédito só entra por confirmação de
  pagamento (`INV-14`), e o provedor ainda não existe. O caminho interno é o
  ajuste manual (`CRE-R06`).
- **Sem paginação** nas listas de leads e advogados.
- **Sem trilha de auditoria** de mudança de papel, de preço por tese e de
  devolução de crédito.
