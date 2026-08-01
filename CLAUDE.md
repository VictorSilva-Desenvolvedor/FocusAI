# CLAUDE.md

Orientação para quem trabalha neste repositório — inclusive agentes.

O idioma do projeto é **português**: código, comentários, commits, nomes de
variáveis e de tipos. Só o vocabulário do framework fica em inglês.

## O que é o sistema

CRM de agência de tráfego pago para **profissionais de captação regulada** —
advogados (OAB), contadores (CFC), médicos (CFM), dentistas (CFO) e psicólogos
(CFP).

A agência vende lead qualificado. O que a limita é que a publicidade desses
profissionais é regulada: anúncio fora da norma expõe o cliente a processo ético
no conselho dele. **A conformidade é um portão de verdade no fluxo, não uma
revisão opcional** — qualquer atalho que permita subir criativo sem parecer está
errado, mesmo que a tela fique mais simples.

Quatro máquinas encadeadas:

**captar o cliente → aprovar a conformidade → distribuir a verba → cobrar o entregue**

A entidade que atravessa tudo é a **Conta de Anúncio**: é ela que a plataforma
reconhece, é nela que a verba entra, é sobre ela que a fatura de mídia chega e é
dela que sai a cobrança.

## Estado atual

Maquete de front-end. **Sem backend e sem autenticação.** O estado vive em
`localStorage` (`crm.usuarios.v1`, `crm.negociacoes.v1`); limpar a chave restaura
os dados semeados.

| Módulo | Situação |
| --- | --- |
| Dashboard (`/`) | Implementado — cards da cadeia, chips, funil, alertas |
| CRM (`/crm`) | Implementado — Kanban + tabela de negociações, drawer de cadastro |
| Configurações → Usuários (`/config/usuarios`) | Implementado — lista + drawer, matriz de acesso |
| Conformidade, Campanhas, Financeiro, Tarefas, Plataformas, Academy | `ModuloEmConstrucao` |

Fora de usuários e negociações, tudo vem de `src/lib/mockData.ts`. Os números são
plausíveis, não reais.

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run typecheck  # só a verificação de tipos
npm run shot       # captura headless (precisa do dev rodando)
npm run smoke      # fluxo de usuários + funil (precisa do dev rodando)
```

`npm run typecheck` é o portão mínimo antes de encerrar qualquer mudança.

Para conferir mudança de layout sem abrir navegador:

```bash
npm run shot                                   # / no viewport desktop
npm run shot -- --mobile                       # viewport estreito
npm run shot -- --perfil u-gestor              # painel sob outro papel
npm run shot -- /crm --out crm.png             # outra rota
npm run shot -- /config/usuarios --click "text=Novo usuário"
```

As imagens vão para `.screenshots/` (fora do Git). O script **falha se algo
escrever erro no console** — vale como smoke test de qualquer tela.

`npm run smoke` valida o fluxo de cadastro de usuários ponta a ponta. Rode depois
de mexer em `src/lib/usuarios.ts`, `UsuariosContext` ou nas telas de `views/Config/`.

## Estrutura

```
App.tsx                        Rotas (HashRouter)
main.tsx                       Entrada
types.ts                       Tipos de domínio — vocabulário canônico
src/
  components/Layout/           Topbar e shell
  components/Assistente/       Assistente interno
  components/ui/               Toast
  contexts/AuthContext.tsx     Perfil ativo, permissões, departamento
  contexts/UsuariosContext.tsx Cadastro de usuários
  contexts/NegociacoesContext.tsx  Funil comercial
  lib/estilo.ts                Tom → classe completa (chip, etiqueta, bloco, ponto)
  lib/navigation.ts            Mapa de módulos × matriz de acesso
  lib/usuarios.ts              Hierarquia de criação, validação, prévia de acesso
  lib/negociacoes.ts           Colunas, transições, prioridade, visibilidade
  lib/negociacoesSeed.ts       Negociações semeadas
  lib/mockData.ts              Dados de maquete dos módulos não construídos
  lib/format.ts                Datas e tempo relativo
  index.css                    Tema Tailwind
views/                         Telas por módulo
scripts/                       screenshot.mjs, smoke-usuarios.mjs
```

Alias: `@/*` → raiz do repositório. Importe `@/src/lib/...`, `@/views/...`,
`@/types` — caminho relativo só dentro da mesma pasta de view.

## Convenções

**Vocabulário canônico, não rótulo de tela.** `types.ts` desambigua. "Cliente" é
o escritório contratante; **Conta de Anúncio** é a entidade operacional. O rótulo
que o usuário lê fica em mapas `*_LABEL`; o código usa a chave.

**Regras de negócio são citadas pelo ID estável** (`ACC-R02`, `CNF-R04`,
`CRM-R17`, `VRB-R01`, `FIN-R25`) em comentário, junto do motivo. Quem for mexer
numa regra procura pelo ID. Prefixos: `ACC` acesso · `CRM` funil · `CNF`
conformidade · `VRB` verba · `CMP` campanhas · `FIN` financeiro · `PLT`
plataformas · `TAR` tarefas · `INT` integrações · `AUT` automações · `ASS`
assistente · `EST` estilização · `API` camada de dados. IDs não são renumerados —
regra removida deixa o ID aposentado.

**Comentário explica o porquê, não o quê.** O padrão do repositório é comentar a
consequência de negócio ("descobrir isso depois de assinar significa reprecificar
ou devolver o cliente"), não parafrasear a linha seguinte.

**Regra de negócio mora em `src/lib/`, não na view.** Validação, permissão,
transição e prioridade são funções puras testáveis; a view chama e renderiza.

**Acesso.** Nunca decida acesso na view por comparação de papel solta. Use
`nivelDeAcesso`, `modulosVisiveis` e `podeAcessar` de `src/lib/navigation.ts`.
Papel novo **não herda acesso** — precisa ser adicionado conscientemente às listas
em `MODULOS` (`INV-05`).

## Estilização

O mecanismo é Tailwind v4 pelo plugin do Vite (`@tailwindcss/vite`), com build
real. O tema vive no `@theme` de `src/index.css` — não há `tailwind.config.js`,
não há CDN, não há CSS de aplicação fora desse arquivo.

**A marca deste produto é roxa.** `roxo-*` como cor primária, `magenta-*` como
acento, definidos em `src/index.css`. Isso é decisão de marca, não acidente:
roxo carrega a leitura "serviço profissional premium" que o público do sistema
espera. Se você encontrar uma convenção de outro sistema da casa proibindo
roxo/violeta na interface, **ela não vale aqui** — não "corrija" a paleta.

Status usa a escala padrão do Tailwind (esmeralda, âmbar, vermelho, céu). Status
não é cor de marca. Mas o código **não escreve o pigmento**: os mesmos valores
estão no `@theme` sob nome de significado — `sucesso-*`, `atencao-*`, `erro-*`,
`info-*` (`EST-R10`).

O fundo da aplicação é `--color-fundo`, um cinza levemente arroxeado. Neutro frio
ao lado do roxo puxa o conjunto para o azulado; este tom mantém a página coesa
sem competir com o branco do card.

### `EST-R01` — nunca monte nome de classe por concatenação

`` className={`bg-${cor}-500`} `` **quebra neste projeto**. O build purga o que não
encontra escrito por extenso, e a classe some silenciosamente — sem erro de
compilação, sem aviso em runtime, só o elemento sem cor em produção. Escreva a
classe inteira em cada ramo, ou mapeie estado → classe completa num `Record`.

### `EST-R02` — a cor de um estado mora num mapa, não espalhada no JSX

`src/lib/estilo.ts` é o lugar. Ele define o tipo `Tom` (`neutro`, `marca`,
`sucesso`, `atencao`, `erro`, `info`) e quatro mapas de tom para classe completa,
um por papel visual:

| Mapa | Onde se usa |
| --- | --- |
| `ESTILO_CHIP` | contador do topo de tela — fundo claro, borda, texto |
| `ESTILO_ETIQUETA` | etiqueta compacta: conselho, prioridade, status de conta |
| `ESTILO_BLOCO` | caixa de aviso inteira tingida |
| `ESTILO_PONTO` | bolinha de estado, cabeça de coluna, barra de gráfico |
| `ESTILO_TEXTO` | ícone ou número solto sobre fundo claro |

A view escolhe o **tom**; o pigmento é problema do mapa. Mapa de domínio para tom
(`COR_COLUNA`, `ESTILO_PRIORIDADE` em `src/lib/negociacoes.ts`) fica na lib do
módulo e aponta para estes.

Escrever `bg-amber-50 text-amber-800` direto na view não é o caminho. O custo de
errar isso é conhecido: quando "a cor de pendência" precisa mudar, não existe um
lugar para mudá-la — vira varredura na base inteira.

### `EST-R03` — escala de camadas fixa, sem escalada

A escala está fixada, e as camadas em uso têm classe no `@layer components`:
`.pilha-dialogo` (container de diálogo e gaveta, `z-50`), `.veu` (o overlay
dentro dela), `.menu-flutuante` (`z-50`) e `.toast` (`z-70`).

| Camada | Valor | O que é |
| --- | --- | --- |
| Conteúdo elevado | `z-10` … `z-30` | Cabeçalho fixo, menu suspenso, popover |
| Sobreposição | `z-40` | Overlay de drawer e de modal |
| Diálogo | `z-50` | Corpo do drawer, modal, menu de contexto |
| Confirmação sobre diálogo | `z-60` | Confirmar dentro de um modal aberto |
| Toast | `z-70` | Avisos do sistema |

**Nunca escolha um valor arbitrário maior que o anterior.** Um `z-[9999]` novo
não resolve o problema, só empurra a próxima colisão para um número maior — e o
fim dessa corrida é `z-[100000]` convivendo com `z-[99999]` sem ninguém saber
qual vence o quê. Se o seu elemento precisa de uma camada que não está na tabela,
a tabela é que está errada: corrija-a aqui e migre os usos.

### `EST-R04` — escala de raio

Três degraus, e tem lógica:

- `rounded-xl` — superfícies. É o que a classe `.card` já aplica; use `.card` em
  vez de repetir as utilitárias.
- `rounded-lg` — controles: botão, campo, select, bloco interno.
- `rounded-full` — etiquetas, chips, avatares, botão circular. É o que `.etiqueta`
  aplica.

Não introduza `rounded-2xl` nem `rounded-md` — o custo de uma escala indefinida é
que dois elementos do mesmo tipo passam a divergir e ninguém sabe qual é o certo.

### `EST-R05` — `transition-colors` quando só a cor muda

`transition-all` anima qualquer propriedade que mude, inclusive layout — é a
causa mais comum de animação engasgada em lista grande. **Não há `transition-all`
na base, e não deve voltar**: onde uma barra precisa animar tamanho, o certo é
nomear a propriedade (`transition-[width]`, `transition-[height]`). Cartão de
Kanban e item de lista ficam em `transition-colors`.

### `EST-R06` — um padrão por elemento, definido em `@layer components`

O catálogo mora em `src/index.css`. Precisou de um padrão novo? Adicione lá e
use. Copiar a cadeia de utilitárias de outra tela e ajustar "só o raio" é como
nascem dois padrões de card concorrentes, com adoção quase igual e nenhuma
decisão registrada — e aí unificar já custa uma varredura.

| Grupo | Classes |
| --- | --- |
| Texto | `.titulo-pagina` `.subtitulo-pagina` `.card-title` `.label-eyebrow` `.nota` `.tabular` |
| Superfície | `.card` `.card-interativo` |
| Botão | `.btn` + `.btn-primario` \| `.btn-secundario` \| `.btn-fantasma` \| `.btn-perigo`; `.btn-icone` |
| Formulário | `.campo` + `.campo-filtro` \| `.campo-invalido` \| `.campo-area`; `.campo-rotulo` `.campo-dica` `.campo-mensagem-erro` |
| Etiqueta | `.etiqueta` `.chip` `.ponto-estado` |
| Camada | `.pilha-dialogo` `.veu` `.dialogo` `.gaveta` `.menu-flutuante` `.item-menu` `.toast` |

`.btn` é a base e não carrega cor: o uso é sempre `class="btn btn-primario"`.

`.campo-mensagem-erro` é o gancho do `npm run smoke` para achar erro de
validação — trocar essa classe quebra o smoke, e é de propósito: o teste passa a
apontar o lugar único onde a mensagem de erro é estilizada.

### `EST-R07` — o ponto de virada aqui é `sm:`

Medido: `sm:` 14 usos, `lg:` 6, `xl:` 3, **`md:` nenhum**. A adaptação é
essencialmente binária — celular abaixo de 640px, desktop acima. Siga o que já
existe em vez de introduzir um terceiro ponto de virada; e note que tela muito
larga hoje não recebe tratamento nenhum, o conteúdo estica.

### `EST-R08` — ícones sempre de `lucide-react`

É a única biblioteca de ícones. Tamanho por propriedade (`size={16}` e
`size={20}` são os usados), cor herdada por `text-*`.

### `EST-R10` — cor de estado tem nome de estado, não de pigmento

`sucesso-*`, `atencao-*`, `erro-*` e `info-*` no `@theme`. Os valores continuam
sendo a escala padrão do Tailwind — a mudança é de vocabulário, não de paleta.
`bg-red-50` escrito na view espalha a decisão; quando "a cor de erro" precisa
mudar, não há um lugar para mudá-la.

### `EST-R11` — duas sombras, uma por papel

`shadow-card` para superfície em repouso, `shadow-flutuante` para o que paira
(diálogo, gaveta, menu de contexto, toast, botão do assistente). Sem essa
separação, cada diálogo novo escolhe um `shadow-*` diferente e o sistema perde a
noção de profundidade. Não use `shadow-sm`/`md`/`lg`/`xl`/`2xl` soltos.

### `EST-R12` — animação declarada é animação usada

As seis do `@theme` — `surgir`, `entrada-suave`, `entrada-modal`,
`entrada-lateral`, `subir`, `pulso-marca` — têm consumidor no código. Keyframe
declarado e nunca aplicado não custa nada em runtime, mas sinaliza intenção não
cumprida: quem chega depois assume que existe um padrão de entrada que ninguém
escreveu. **Se o último uso sumir, o keyframe sai junto.**

`prefers-reduced-motion` já é tratado uma vez em `@layer base`, para todas — tela
nova não precisa lembrar do caso.

### `EST-R09` — se o tema escuro entrar um dia

Ainda não existe. Quando entrar, duas armadilhas conhecidas, que custam caro
justamente por serem silenciosas:

- A classe `dark` vai no `<html>` (`document.documentElement`). Uma regra de
  fundo escrita como `body.dark { … }` **nunca casa** — as variantes `dark:` dos
  componentes funcionam normalmente, então tudo escurece menos o fundo da página,
  e o sintoma é claro vazando nas bordas e na rolagem elástica. Escreva
  `html.dark body`.
- Fixe **uma** convenção de superfície de campo no escuro antes de espalhar.
  Campo mais claro que o card e campo mais escuro que o card são decisões visuais
  opostas; as duas convivendo é dívida que só aparece depois de dezenas de telas.

## Invariantes — não negociáveis

- `INV-01` Nenhum criativo sobe sem parecer aprovado. Nem provisoriamente, nem
  "só para testar audiência". O risco é do cliente.
- `INV-02` A verba distribuída fecha exatamente com a contratada. Excesso é
  prejuízo da agência; falta é entrega a menos que o cliente pagou.
- `INV-03` Repasse de mídia só dispara com confirmação bancária. Baixa manual não
  dispara.
- `INV-04` A data do parecer de conformidade é imutável — é o carimbo que prova,
  perante o conselho, quando a agência avaliou a peça.
- `INV-05` Papel novo não herda acesso.
- `INV-06` O assistente nunca faz consulta livre ao banco. Só consultas
  pré-definidas e pré-agregadas.

Regras já vivas no código: `ACC-R02` e `ACC-R03` (`src/lib/usuarios.ts`),
`ACC-R21` e `ACC-R22` (`UsuariosContext`), `ACC-R01` e `ACC-R07`
(`src/lib/navigation.ts`), `CNF-R21` (`AuthContext` + `views/Config/`),
`CRM-R17`, `CRM-R18` e `CRM-R20` (`src/lib/negociacoes.ts`), `ASS-R02`
(`AssistenteButton`).

## Camada de dados — contrato para quando o backend entrar

Hoje não existe backend: tudo é `localStorage`. As regras abaixo **não são
hipótese** — são o desenho já decidido (Supabase: tabelas com política de acesso,
funções no banco para operação transacional, funções de borda para o que exige
segredo, automações externas para o que exige IP fixo ou modelo oficial). Valem
a partir do commit em que a primeira consulta real existir, e valem antes disso
para quem for desenhar a tela que vai consumi-la.

Cada uma existe porque o custo dela já foi pago em produção em outro lugar.

### Autoridade e isolamento

- `API-R01` — **No navegador só existe chave anônima.** Nenhum segredo de
  servidor chega ao cliente. Toda autoridade vem do JWT do usuário logado,
  avaliado pela política de acesso da tabela.
- `API-R02` — **Segurança é da tabela, nunca da consulta.** Como é o cliente que
  monta a consulta, nada impede pedir mais do que se deve. Filtro no frontend é
  ergonomia, não controle de acesso. Isso vale em dobro aqui, onde `white_label_id`
  separa carteiras de agências diferentes.
- `API-R03` — **Privilégio elevado obriga a reimplementar o isolamento.** A chave
  de serviço ignora todas as políticas do banco. Toda função que a usa carrega
  sozinha a responsabilidade de não vazar dado entre carteiras — é onde a falha é
  mais provável e mais silenciosa.
- `API-R04` — **Função de banco nova revoga execução de `PUBLIC`, `anon` e
  `authenticated`, os três.** Revogar só de `PUBLIC` não tem efeito: a plataforma
  concede execução direto aos outros dois por privilégio padrão. Defina também o
  `search_path` explicitamente.
- `API-R05` — **Falha de carregamento de perfil precisa fechar, não abrir.** Se o
  perfil não carregar e a aplicação seguir com papel indefinido, todo guard que
  bloqueia *por papel* deixa de bloquear — "indefinido" não está em lista nenhuma.
  Timeout de carregamento tem que levar a estado bloqueado, não a estado livre.
  Ver a pendência do guard de rota (`ACC-R07`).

### Consultas

- `API-R06` — **A regra de leitura mora na camada de serviço.** Consulta solta
  espalhada pelas telas é o antipadrão que mais custa: quando a camada exclui
  registro cancelado, une modelo novo e legado ou preserva a data imutável da
  decisão, quem consulta direto simplesmente não aplica nada disso — e o sintoma
  é uma tela nova listando o que deveria estar fora. Vale a mesma lógica que já
  governa `src/lib/`: a regra é do módulo, não da view.
- `API-R07` — **Lista grande exige paginação explícita.** O corte padrão é 1.000
  linhas e o truncamento é **silencioso**: não vem erro, vem menos dado. Já custou
  filtro perdendo opção e janela de comparação virando um terço do período, com os
  comparativos zerando sem ninguém notar. Passou de 1.000, paginou.
- `API-R08` — **Operação transacional ou validada é função no banco.** Tudo que
  precisa gravar em conjunto — distribuição de verba, aprovação, conciliação —
  passa por função com validação antes de gravar, não por escrita direta. Trava de
  edição concorrente também: com expiração por falta de sinal de vida e limpeza de
  travas órfãs.
- `API-R09` — **Assinatura ao vivo com parcimônia.** O filtro de tempo real só
  aceita igualdade simples; filtro composto obriga a escutar a tabela inteira e
  refinar no cliente, com agrupamento de eventos para não recarregar a cada
  mudança. Há teto de eventos por segundo, e tabela movimentada com assinatura
  ampla o atinge.

### Integrações e eventos

- `API-R10` — **Configuração ausente não pode virar silêncio.** O padrão fácil —
  se a chave do webhook está vazia, pula a chamada — faz a funcionalidade sumir
  sem erro, sem aviso ao usuário e sem registro de que a etapa foi ignorada.
  Etapa pulada tem que aparecer em algum lugar.
- `API-R11` — **O fluxo externo responde honestamente.** Sucesso só em sucesso.
  Fluxo que engole erro e responde 200 em falha faz o sistema nunca saber que
  precisa reenfileirar.
- `API-R12` — **Evento de entrega única precisa de reconciliação.** Provedor que
  não reenvia em caso de falha exige rotina periódica que confira o que ficou
  para trás. Sem isso, evento perdido é dado perdido — já houve descarte
  silencioso por semanas. **Todo fluxo de terceiro nasce com a reconciliação
  junto**, não depois.
- `API-R13` — **Webhook de entrada é idempotente.** Eventos chegam repetidos.
  Deduplique por par (identificador, tipo de evento).
- `API-R14` — **Evento é gatilho, não fonte da verdade.** Recebeu aviso? Consulte
  o estado real antes de agir sobre ele.
- `API-R15` — **Balde público serve URL permanente.** Arquivo em balde público
  fica acessível para sempre, sem expiração, para quem tiver o endereço. Parecer
  de conformidade, documento de cliente e comprovante **não** vão para balde
  público (`INV-04` depende de o parecer ser rastreável, não exposto).
- `API-R16` — **Automação externa é código não versionado.** Fluxo que vive só
  dentro da ferramenta de automação é lógica de negócio fora do repositório, sem
  revisão e sem histórico. Ou versiona, ou registra explicitamente que é dívida.

### Coerência com os invariantes

`INV-03` — repasse só dispara com confirmação bancária — é a mesma regra vista do
lado da integração: **o gatilho é o webhook do banco preenchendo a data de
pagamento, e baixa manual não dispara.** Se algum dia alguém pedir para a baixa
manual disparar o repasse porque "a conta ficou sem saldo e a campanha parou", a
resposta é alerta, não atalho.

### Antes de abrir uma integração nova

- O dado sensível fica fora do navegador?
- Erro tem mensagem para o usuário **e** detalhe no log?
- A lista passa de 1.000 linhas? Paginou?
- Tabela nova: ativou a proteção de acesso, escreveu as políticas e **repetiu o
  bloqueio dos papéis externos**? Papel externo não é bloqueado automaticamente em
  tabela nova — é o mesmo `INV-05` do lado do banco.
- Usa privilégio elevado? Reimplementou o isolamento em código?
- Serviço pago: tem cache, teto, restrição por papel e registro de custo por uso?

## Pendências conhecidas

Não são bugs a corrigir de passagem — são dívidas anotadas. Mexa nelas quando
forem a demanda.

- **Sem guard de rota** (`ACC-R07`): menu e painel filtram, a rota não. Quem
  digitar `/financeiro` entra.
- **Sem autenticação.** O seletor de perfil da barra superior troca de usuário sem
  senha — serve para conferir a matriz de acesso, não é login.
- **Convite não sai de verdade.** Falta o serviço de envio.
- **Sem paginação** na lista de usuários.
- **Sem trilha de auditoria** de mudança de papel e permissão.

## Documentação local — só leitura

Existe material de apoio mantido **apenas na máquina**, fora do versionamento
(`.gitignore`). Serve para consulta e releitura enquanto se trabalha — nada além
disso. Vale para **qualquer formato e qualquer lugar**: pasta de documentação,
PDF, planilha ou documento solto na raiz do repositório. As regras são absolutas:

- **Nunca versione esse material.** Não tire do `.gitignore`, não faça
  `git add -f`, não copie trecho para arquivo versionado, não crie "resumo" dele
  no repositório.
- **Nunca o cite em nada que vá para o Git** — mensagem de commit, corpo de PR,
  comentário de código ou README. Nem o nome do arquivo, nem o caminho, nem o
  codinome do projeto, nem "conforme a documentação". Um commit não deve deixar
  pista de que esse material existe.
- **Ao comitar, confira antes de dar `git add`.** Nunca use `git add .` às cegas:
  material novo pode ter caído na raiz sem padrão que o `.gitignore` pegue. Rode
  `git status` e olhe a lista.
- **Fundamente pelo código, não pela documentação.** Ao justificar uma decisão em
  commit ou comentário, aponte o ID da regra (`ACC-R02`, `CRM-R20`) e o efeito de
  negócio — que são coisas que o próprio repositório sustenta.

O motivo é o conteúdo: dado de cliente (escritórios, consultórios), verba
contratada e parecer sobre publicidade regulada. Nada disso entra no repositório
— nem em fixture, nem em seed, nem em exemplo de comentário. Dado semeado é
fictício e continua fictício.

## Git

**Sem coautoria.** Nenhum commit deste repositório leva trailer `Co-Authored-By`,
assinatura de ferramenta, ou linha do tipo "Generated with". O autor é quem
assina o commit. Isso vale mesmo que a configuração padrão da ferramenta peça o
contrário.

**Um commit por função ou demanda.** Cada commit resolve uma coisa e fica
coerente sozinho: se a demanda tocou o cadastro de usuários e, de passagem, o
formatador de data, são dois commits. Trabalho de várias frentes numa mesma
sessão vira vários commits, na ordem em que fazem sentido ser lidos — nunca um
"vários ajustes" no fim.

Antes de comitar, separe o que está no working tree por assunto (`git add -p`
quando o arquivo mistura assuntos) e verifique que cada commit passa no
`npm run typecheck` por si só.

Mensagem: uma linha no imperativo, em português, dizendo o efeito — não o
arquivo mexido. Corpo só quando o porquê não cabe no título. **Nunca cite a
documentação local** nem o codinome do projeto na mensagem — justifique pelo ID
da regra e pelo efeito de negócio.

```
Impede ativar conta sem parecer de conformidade
Separa prioridade automática da manual no Kanban
Corrige duplicidade de e-mail contra conta desativada
```

Não comite nem faça push sem o pedido explícito. Estando na `main`, crie um branch
antes.
