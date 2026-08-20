# Testes — auditoria e correções do Impeccable

Registro do que foi mexido nesta rodada (skill Impeccable: instalação,
auditoria de acessibilidade/anti-padrão, documentação de sistema). Não existe
suíte automatizada neste repositório (ver CLAUDE.md, seção Verificação).

Mudança de tamanho, cor e contraste **não entra aqui como pendência de
conferência visual** — por decisão do usuário, esse tipo de correção é
considerada fechada assim que aplicada (seção 3). O que ainda fica listado
como pendência real é comportamento não coberto por `typecheck`/`smoke` e o
que só um scanner automatizado contra tela autenticada confirma (seções 5 e
6) — coisa que leitura de código, por mais cuidadosa, não garante sozinha.

## 0. Terceira passada — inventário completo por categoria de defeito

Depois da segunda passada (seção 3), varri o repositório inteiro por mais
quatro categorias, para não depender só do que apareceu em `/login`:

- `disabled:text-` / `disabled:bg-` fora de `src/index.css` — achei mais um
  caso: `MenuCartao.tsx`, os dois menus de mover status de lead
  (`text-stone-300`/`text-stone-400` no item já selecionado, 1.5:1/2.6:1 —
  mesmo bug dos botões de olho do login). Os três pontos (dois `disabled:`,
  mais o sufixo " · atual" de um deles) subiram para `stone-500`.
- `transition-all` — **zero usos reais**, só três comentários explicando por
  que não se usa (`EST-R05`). Confirmado limpo.
- `transition-[width|height|padding|margin|...]` — três usos, todos barra de
  progresso animando `width` (Campanhas, Dashboard, Qualificação), o padrão
  correto que `EST-R05` já prescreve. Nenhum achado.
- `text-roxo-200`/`text-roxo-300` como texto — todos os usos estão dentro de
  `Topbar.tsx`/`MenuDoUsuario.tsx`, sobre o fundo escuro `grafite-900`
  (~10:1 de contraste). Nenhum vazou para fundo claro.
- `text-stone-300`/`text-stone-400` em ícone com `aria-label` (informação que
  não está repetida em texto visível ao lado, diferente de um ícone puramente
  decorativo): achei três — `Mic`/`PhoneOff` em `LeadDrawer.tsx` e `Mic` em
  `QualificacaoView.tsx`, indicando se a ligação tem gravação. Subiram para
  `stone-500`. Ícones decorativos (setas de navegação, avatar `aria-hidden`,
  estrela de avaliação vazia) foram revisados e **deixados como estavam** —
  são redundantes com texto visível ao lado ou seguem um padrão de widget já
  aceito (estrelas vazias vs. preenchidas).

## 1. O que já foi verificado automaticamente

- [x] `npm run typecheck` — passou depois de cada bloco de edição.
- [x] `npx impeccable detect http://localhost:5173/#/login` (desktop e mobile,
      390×844) — zero achados de contraste, tamanho ou paleta depois da
      correção. Restam só os três itens aceitos na seção 4.
- [x] `npm run shot -- /login` e `npm run shot -- /login --click "text=Esqueci minha senha"`
      — console limpo nas duas, texto do botão desabilitado visivelmente
      legível nas duas capturas.

## 2. Rodar antes de aceitar esta mudança

```bash
npm run typecheck
npm run shot -- /login --out login.png
npm run shot -- /login --mobile --out login-mobile.png
```

**Não rode `npm run smoke` contra o projeto de trabalho** — ele compra e
devolve lead de verdade (`INV-13`/`INV-15` não desfazem isso). O banco de
teste isolado que existia para rodar `smoke` repetidamente foi apagado pelo
Supabase por inatividade (seção 6) e ainda não foi recriado; até lá, `smoke`
fica sem onde rodar sem custo. `typecheck` e `shot` são seguros em qualquer
projeto porque não gravam nada.

## 3. Checklist manual — o que só dá para ver logado

O scanner do Impeccable roda via navegador headless e não passa pelo
`PortaoDeSessao` sozinho (não tenta login) — precisa de alguém logado
manualmente antes (ver seção 6, onde isso já foi feito contra quatro
módulos). Cobri `/login` e `/redefinir-senha` (as duas únicas rotas públicas)
direto por varredura automatizada; os pontos abaixo foram corrigidos por
leitura direta do código-fonte — inclusive uma segunda varredura por `grep`
atrás de todo `text-[Npx]` abaixo de 11px e todo `text-stone-400` do
repositório inteiro, não só o que apareceu em `/login`.

**Mudanças de tamanho (px) e de cor de ícone/texto — marcadas como feitas por
decisão do usuário**, sem espera por conferência visual adicional. Ficam
listadas por referência (o que mudou, onde, por quê), não como pendência:

- [x] **Barra superior (`Topbar.tsx`)** — a tagline "LEADS QUALIFICADOS" subiu
      de 9px para 11px, e a etiqueta "parcial" ao lado de um módulo restrito
      subiu de 9px para o novo padrão de `.etiqueta` (11px).
- [x] **Menu do usuário (`MenuDoUsuario.tsx`)** — o papel abaixo do nome
      ("Advogado", "Gerente"...) subiu de 10px para 11px.
- [x] **Qualquer `.etiqueta`** (status de lead, tese, prioridade, resultado de
      ligação — usada em praticamente todo módulo) subiu de 10px para 11px. É
      a mudança de maior alcance desta rodada por ser a classe central mais
      usada.
- [x] **Cartão de lead (`LeadCard.tsx`)** — "vendido para X", "reservado",
      "sem gravação" e o custo em créditos ("40 cr") subiram de 10px para
      11px.
- [x] **Ficha de usuário (`UsuarioDrawer.tsx`)** — "parcial" e "via permissão"
      ao lado de cada módulo de acesso subiram para 11px.
- [x] **Campanhas (`CampanhasView.tsx`)** — o valor "bruto" abaixo do custo
      líquido na tabela de campanhas subiu para 11px.
- [x] **Dashboard (`DashboardView.tsx`)** — o número de posição na "cadeia do
      negócio" (1 a 4, dentro do círculo escuro) subiu de 10px para 11px.
- [x] **Qualquer botão primário/perigo desabilitado** em qualquer módulo
      (Leads, Créditos, Advogados, Configurações...) — texto passou de branco
      (quase invisível) para cinza escuro legível. Centralizado em
      `.btn-primario`/`.btn-perigo` (`src/index.css`).
- [x] **Ícones em `.btn-icone`** (ações de linha de tabela, cabeçalho de
      painel) — de `stone-400` para `stone-500`.
- [x] **Texto em `.nota`/`.campo-dica`** em qualquer formulário — de
      `stone-400` para `stone-500`, mesmo tamanho de antes.
- [x] **`FunisEtapasView.tsx`** (Configurações → Funis e etapas) — número de
      linha da tabela, de `stone-400` para `stone-500`.
- [x] **`MenuCartao.tsx`** (menu de mover lead de coluna, `LeadCard`/Kanban) —
      item já selecionado e sufixo " · atual"/" · bloqueado", de `stone-300`
      (1.5:1) e `stone-400` (2.6:1) para `stone-500`.
- [x] **Indicador de gravação** (ícone `Mic`/`PhoneOff` ao lado de cada
      ligação, em `LeadDrawer.tsx` e na régua de tentativas de
      `QualificacaoView.tsx`) — de `stone-300`/`stone-400` para `stone-500`.

Se algo aqui aparecer visualmente errado mais tarde (etiqueta apertada demais
numa célula estreita, por exemplo), é regressão de layout a corrigir pontual —
não motivo para reverter a mudança de tamanho/cor em si, que está fechada.

Pontos revisados e **deixados como estavam**, de propósito — não são
regressão se continuarem assim:

- **`CreditosView.tsx`** (linhas 649 e 791) — o traço "—" que marca "sem valor
  neste movimento" continua em `stone-400`. É indicador de ausência, não
  conteúdo que precisa ser lido palavra por palavra.
- **`LogsSistemaView.tsx:81`** e **`UsuarioDrawer.tsx:220`** — os círculos de
  iniciais de avatar continuam pequenos/claros. Ambos marcados `aria-hidden`,
  com o nome completo já visível ao lado ou no campo que está sendo digitado
  — redundantes por design, a mesma exceção que o próprio Impeccable
  documenta para conteúdo `sr-only`/decorativo.
- **Setas de navegação** (`ArrowRight` em cartão/linha clicável, várias
  telas) e a **estrela de avaliação vazia** em `LeadDrawer.tsx` — decorativas
  ou parte de um padrão de widget já aceito (estrela vazia vs. preenchida),
  não o único portador de informação.

## 4. Decisões tomadas e aceitas — não é bug se aparecer de novo

Se o hook do Impeccable (agora ativo em todo `Edit`/`Write`/`MultiEdit` e no
`Stop`, ver `.claude/settings.local.json`) voltar a sinalizar um destes três
pontos, **não é regressão** — é o próprio detector reencontrando uma exceção
já registrada:

1. **`ai-color-palette`** (roxo/violeta "parece paleta de IA") — suprimido em
   `.impeccable/config.json`. É decisão de marca (`CLAUDE.md`, seção
   Estilização). Não remover a supressão nem trocar a cor por causa disso.
2. **`tiny-text` em `.nota`/`.campo-dica`/`.campo-mensagem-erro` (11px)** — o
   detector recomenda 12px+; subir colidiria com `.campo-rotulo` (também
   12px) e apagaria um degrau da hierarquia de tipo. Decisão registrada em
   `EST-R14` (`CLAUDE.md`) e na seção Typography de `DESIGN.md`.
3. **`flat-type-hierarchy`** (a escala de 11 a 24px lida como "apertada" para
   um linter genérico) — característica deliberada de uma interface densa de
   operação (modo "Operate" do Impeccable), documentada em `DESIGN.md`.

## 5. Pendência aberta — não inventei correção sem fonte confirmada

- **`[layout-transition] transition: height`** — achado em `/login` e,
  confirmado depois (seção 6), **idêntico nas onze páginas** (as dez rotas
  autenticadas, mais o login público). Módulos sem nada em comum
  estruturalmente entre si — lista, painel, extrato, funil, formulário —
  todos com o mesmo achado, no mesmo texto. Onze telas diferentes reproduzindo
  bit-a-bit o mesmo resultado é o oposto do que se espera de um bug de
  componente; é assinatura de algo do Chromium/navegador
  (`src/index.css` inteiro foi lido de novo e não define `transition` sobre
  `height` em lugar nenhum). Considero isto **fechado como ambiental**, não
  como defeito do código — não há o que editar sem uma fonte que aponte para
  um elemento real da aplicação.

## 6. Módulos autenticados — varredura confirmada em produção

O scanner de navegador do Impeccable não tem como autenticar sozinho
(confirmado lendo o código-fonte do CLI: não existe flag de cookie, storage
state ou perfil persistente — cada varredura sobe um Chromium isolado do
zero), então precisa de alguém logado manualmente no navegador antes de
rodar.

O banco de teste isolado (`focusteste`) não existe mais — apagado pelo
Supabase depois de tempo pausado (plano gratuito), não algo desta sessão.
Sem ele, a varredura autenticada rodou contra o **projeto de trabalho**
(produção), logado com uma das contas internas de papel já existentes
(`victorpaulodev@focus.ai`). Isso é seguro porque `impeccable detect` é
só leitura — renderiza e mede CSS, nunca envia formulário nem grava nada;
diferente de `npm run smoke`, que **não** deve rodar ali por comprar/devolver
lead de verdade (`INV-13`/`INV-15`).

**Os dez módulos com rota própria foram varridos, logado, contra o projeto de
trabalho. Resultado idêntico nos dez** — mesmos 3 achados já revisados e
aceitos (seção 4) mais o `transition: height` ambiental (seção 5), nem um a
mais, nem um a menos:

- [x] `/leads` · `/` (dashboard) · `/creditos` · `/advogados` · `/teses` ·
      `/qualificacao` · `/campanhas` · `/conformidade` · `/integracoes` ·
      `/config`.
- [x] Assistente — sem rota própria (botão flutuante), já esteve presente em
      todas as páginas acima, montado ou não.

Dez módulos de natureza bem diferente — lista com filtro, painel com cards,
extrato tabular, funil de etapas, formulário de configuração — voltando
byte-a-byte iguais é a confirmação mais forte possível sem instrumentar cada
tela individualmente: os dois padrões de defeito reais do Impeccable
(contraste, piso de tamanho) estão mesmo extintos em todo o app, não só nos
quatro pontos amostrados antes.

## 7. O que este trabalho não tentou

Por decisão, não apliquei os comandos "estéticos" do Impeccable (`bolder`,
`colorize`, `overdrive`, `delight`, `quieter`) a nenhuma tela. Eles pedem
redesenho de composição e cor — e este projeto já tem um sistema de marca
fixo e documentado (roxo/grafite, `EST-R01`–`R14`) que essas skills tenderiam
a "corrigir" por padrão genérico. O que foi corrigido nesta rodada é técnico e
objetivo: contraste WCAG AA, piso de tamanho de texto funcional, paleta
respeitada por configuração explícita — não gosto visual.

## 8. `/impeccable audit` — passe técnico estruturado (a11y, performance, temas, responsividade, integridade)

Distinto do `detect` (anti-padrão pontual): um passe de 5 dimensões, cada uma
0-4. **Nota final 20/20**, depois de duas rodadas de correção.

- [x] Acessibilidade (3/4 → 4/4) — contraste e piso de texto já corrigidos;
      `<img>` com `alt` em 100% dos casos; `.campo` já tinha anel de foco
      customizado, `.btn`/`.btn-icone` dependiam só do outline padrão do
      navegador. Fechado: os dois ganharam
      `focus-visible:outline-2 outline-offset-2 outline-roxo-500` — só
      aparece na navegação por teclado (Tab), não a cada clique de mouse.
- [x] Performance (4/4) — `transition-all`: zero; `will-change`: zero;
      paginação já resolvida em toda a camada de serviço.
- [x] Temas (4/4) — token completo, zero cor hardcoded; tema escuro é
      decisão futura registrada (`EST-R09`), não lacuna atual.
- [x] Responsividade (3/4 → 4/4) — **achado real**: `.btn` (36px) e
      `.btn-icone` (32px) abaixo do piso de toque de 44px
      (WCAG 2.5.5 AAA / guia Apple e Google). Corrigido: ver `EST-R15`
      (`CLAUDE.md`). Por decisão do usuário, a correção foi além da classe
      central e cobriu todo `h-7`/`h-8`/`size-9` que a sobrescrevia —
      barra superior, fila de pareceres de Conformidade, ação em massa de
      Usuários, toggles de visão de Advogados/Leads.
- [x] Integridade de implementação (4/4) — sistema coerente, zero drift na
      varredura de 10 módulos ao vivo (seção 6).

`typecheck` limpo e `/login` conferido visualmente (console limpo) depois de
cada rodada de correção.

## 9. `/impeccable harden` — resiliência a dado real e falha de rede

Fora do escopo de `detect`/`audit`: dado extremo, erro de rede, clique duplo,
estado vazio. Verificado por leitura de código, com grep dirigido a cada
dimensão do checklist:

- [x] Clique duplo em envio de formulário — as 10 telas com `type="submit"`
      já usam `disabled={enviando ...}`. Nada a corrigir.
- [x] Estado vazio — 14 arquivos com mensagem específica e útil (ex.:
      "Nenhum lead disponível agora nas suas teses. Você recebe aviso assim
      que entrar um."), não um "sem resultados" genérico. Nada a corrigir.
- [x] Texto longo (nome, e-mail) — `truncate` já usado em 9 arquivos onde
      texto de tamanho variável entra num espaço fixo. Nada a corrigir.
- [x] **Achado real — falha de carregamento virava lista vazia.**
      `useDadosDaSessao` (o hook por trás de `Leads`, `Advogados`,
      `Créditos`, `Usuários`, `Campanhas`, `Conformidade`) sempre separou
      `erro` de lista vazia de verdade — o próprio comentário no código já
      dizia isso — mas **nenhuma das seis telas lia o campo**. Uma queda de
      rede virava "Nenhum lead com esses filtros", indistinguível de não ter
      lead nenhum. É o mesmo cenário que apareceu de verdade nesta sessão
      (`net::ERR_NAME_NOT_RESOLVED`/"Failed to fetch" contra o banco de
      teste) — só que na tela real isso não aparece como erro, aparece como
      catálogo vazio.
      - Corrigido: `src/components/ui/AvisoErro.tsx` (mensagem + "Tentar
        novamente", reaproveitando `ESTILO_BLOCO.erro`/`ESTILO_TEXTO.erro`
        já existentes) — conectado nas seis telas
        (`LeadsView`/`AdvogadosView`/`CreditosView`/`UsuariosView`/
        `CampanhasView`/`ConformidadeView`). `CreditosView` precisou de um
        ajuste a mais: é um dispatcher que delega para
        `PainelDoAdvogado`/`PainelDaOperacao`, então o aviso subiu para o
        nível do dispatcher em vez de duplicar em cada painel.
      - Registrado como `API-R17` (`CLAUDE.md`) — toda tela nova que usar
        `useDadosDaSessao` herda a obrigação de ler `erro` e renderizar
        `AvisoErro`.
- [x] i18n/RTL — fora de escopo real: produto é português único, sem
      biblioteca de internacionalização nem requisito de RTL em
      `CLAUDE.md`/`FOCUS-AI.md`. Não forcei achado onde não há requisito.

`typecheck` limpo depois da correção; console limpo em `/login` confirma que
o novo componente e as seis telas editadas continuam carregando sem erro de
build/runtime.

**Autorrevisão achou um segundo bug no próprio conserto do `AvisoErro`.** A
mensagem que ele mostra vinha de `useDadosDaSessao`, que usava `e.message`
quando existia — ou seja, o texto bruto do erro de rede do navegador
("Failed to fetch") ia direto pra tela, em inglês, sem contexto, exatamente o
que `harden.md` pede pra nunca fazer. Corrigido: mensagem fixa em português
("Falha ao carregar X. Verifique sua conexão."), texto técnico só no
console.

Isso levou a verificar o mesmo padrão do lado da escrita: 13 pontos em sete
arquivos de `src/servicos/` devolviam `motivo: error.message` quando uma
chamada `supabase.rpc(...)` falhava por transporte. Confirmado antes de
mexer (`grep -r "RAISE EXCEPTION" supabase/migrations/` — zero resultados)
que nenhuma função Postgres do projeto levanta exceção crua; toda recusa de
regra de negócio já vem como `{ok:false, motivo}` estruturado, então
`error.message` nesses 13 pontos só podia ser falha de conexão genuína, nunca
mensagem de validação. Corrigido nos sete arquivos — mesma mensagem fixa,
`console.error` preservando o texto técnico. Registrado junto de `API-R17`
(`CLAUDE.md`).

**Terceira autorrevisão achou um segundo achado de acessibilidade.**
`AvisoErro` não tinha `role="alert"` (o `Toast` já usa `role="status"` para
leitor de tela anunciar sozinho — o novo componente ficou de fora).
Corrigido: `role="alert"` (assertivo, não `role="status"` — este aviso
substitui a tela inteira, não só complementa, então precisa ser anunciado na
hora).

Verificando o mesmo tipo de lacuna em outro lugar: os seis diálogos/gavetas
do app (`role="dialog"`/`aria-modal="true"`) não prendiam o foco de teclado
— Tab conseguia escapar do diálogo pro conteúdo atrás do véu, que
`aria-modal` promete estar inerte. Corrigido com um hook central,
`src/components/ui/focoPreso.ts` (`useFocoPreso`), conectado nos seis:
`LeadDrawer`, `AdvogadoDrawer`, `UsuarioDrawer`, `NovoLeadDialog`,
`CampanhaDialog`, e o confirmador de motivo em `AdvogadosView`.

Rodada seguinte achou o mesmo problema em `MenuCartao` (`role="menu"`, o
menu de mover lead de coluna) — e o comentário do próprio arquivo já dizia
por quê ele existe: alternativa por teclado ao que o arraste não alcança,
então precisava valer pra teclado de verdade. Conectado também. Isso exigiu
mudar a API do hook: em vez de criar e devolver o próprio `ref`, passou a
receber um `ref` já existente — `MenuCartao` já tinha o dele, usado pra
reposicionar o menu e detectar clique fora, e um elemento só aceita um
`ref`. Os seis diálogos foram atualizados pra a nova forma (`useRef` +
`useFocoPreso(ref)`, duas linhas em vez de uma). Registrado como `EST-R16`
(`CLAUDE.md`).

- [ ] **Não verificado interativamente** — precisa de navegador de verdade,
      não `npm run shot`: abrir qualquer diálogo ou o menu de ações de um
      cartão, dar Tab repetidamente e confirmar que o foco nunca escapa, e
      que Shift+Tab no primeiro elemento volta pro último em vez de sair.
      Comportamento de teclado, não mudança visual — continua como
      pendência real, não cai na regra de "mudança visual não precisa
      testar".

## 10. Estado final

Depois da terceira passada (seção 0), fechei mais três checagens de código:
os mapas centrais de cor por estado (`src/lib/estilo.ts` —
`ESTILO_CHIP`/`ESTILO_ETIQUETA`/`ESTILO_BLOCO`/`ESTILO_PONTO`/`ESTILO_TEXTO`)
já seguem o padrão certo (fundo `-50`/`-100`/`-200`, texto `-600` a `-900`) —
conferido a olho e por cálculo de contraste no par mais apertado
(`sucesso-700` sobre `sucesso-100`, ~4.8:1, passa); e `text-stone-50/100/200`
como texto (ainda mais claro que os já corrigidos `300`/`400`) não aparece em
lugar nenhum do repositório.

Depois disso, o usuário rodou o scanner de verdade, logado no projeto de
trabalho, contra os **dez módulos com rota própria** (seção 6). **Zero
achados novos em qualquer um** — só os três já revisados e aceitos (seção 4)
mais o `transition: height` ambiental (seção 5), idênticos nos dez. Isso
fechou o ciclo do `detect` (anti-padrão pontual): os dois padrões de defeito
reais que o Impeccable achou em `/login` (contraste de cinza neutro abaixo de
4.5:1/3:1, texto funcional abaixo de 11px) foram corrigidos na fonte central
(`src/index.css`, mais catorze arquivos de view/componente) e confirmados
ausentes tanto por leitura de código quanto por varredura ao vivo, em cada
módulo do app, em produção.

Em seguida, o `/impeccable audit` (seção 8) — o passe estruturado de 5
dimensões, distinto do `detect` — achou dois pontos reais que nenhuma das
passadas anteriores cobria: alvo de toque de botão abaixo de 44px em todo o
app, e foco de teclado dependendo só do outline padrão do navegador em vez
de um customizado. Os dois corrigidos (`EST-R15`, `CLAUDE.md`) — o primeiro
incluindo os pontos que sobrescreviam a classe central (barra superior,
fila de pareceres de Conformidade, ação em massa de Usuários, toggles de
Advogados/Leads); o segundo com `focus-visible:outline` em `.btn`/
`.btn-icone`. Nota final do audit: **20/20**. `typecheck` limpo e
conferência visual (`/login`) depois de cada mudança.

O `/impeccable harden` (seção 9) — resiliência a dado real, erro de rede,
clique duplo — confirmou que clique duplo, estado vazio e texto longo já
estavam bem tratados, mas achou o ponto mais significativo desta sessão: as
seis telas que carregam lista do banco nunca distinguiam "falha ao carregar"
de "lista genuinamente vazia", mesmo o próprio código já separando os dois
internamente (`useDadosDaSessao`). Corrigido com um componente novo
(`AvisoErro`) conectado nas seis, registrado como `API-R17` — e duas
autorrevisões em cima do próprio conserto acharam mais dois bugs reais
(mensagem de erro técnica em inglês vazando pra tela, tanto na leitura
quanto em 13 pontos de escrita; e o aviso sem `role="alert"`).

Por último, verificando o mesmo tipo de lacuna de acessibilidade em outro
lugar: os seis diálogos/gavetas do app, mais `MenuCartao` (o menu de mover
lead de coluna — que existe justamente como alternativa por teclado ao
arraste), tinham `role="dialog"`/`role="menu"` certo mas não prendiam o
foco dentro deles. Corrigido com um hook central (`useFocoPreso`),
registrado como `EST-R16`. É o único achado desta sessão que fica como
pendência real de verificação manual — comportamento de teclado não dá para
confirmar sem navegador de verdade.

O que sobra fora do escopo deste trabalho é a recriação do banco de teste
isolado, apagado pelo Supabase por inatividade — demanda à parte, registrada,
não bloqueio.

## Arquivos novos desta rodada

- `PRODUCT.md` — contexto de produto, extraído de `CLAUDE.md`/`FOCUS-AI.md`
  (sem entrevista nova: a evidência já era forte o suficiente).
- `DESIGN.md` + `.impeccable/design.json` — sistema de design extraído de
  `src/index.css`, para o hook do Impeccable parar de tratar o roxo/grafite
  como anomalia.
- `.impeccable/config.json` — supressão explícita de `ai-color-palette`.
- `src/components/ui/AvisoErro.tsx` — banner de falha de carregamento com
  "Tentar novamente", achado do `/impeccable harden` (`API-R17`).
- `src/components/ui/focoPreso.ts` — `useFocoPreso`, prende o foco de
  teclado dentro de diálogo/gaveta/menu, achado do `/impeccable audit`
  (`EST-R16`).
- Este arquivo.
