# CLAUDE.md

Orientação para quem trabalha neste repositório — inclusive agentes.

O idioma do projeto é **português**: código, comentários, commits, nomes de
variáveis e de tipos. Só o vocabulário do framework fica em inglês.

## O que é o sistema

**Focus AI** — plataforma de aquisição de clientes qualificados por IA para
advogados.

A Focus AI não vende serviço de marketing jurídico. Vende o **produto final
pronto**: o lead qualificado com a reunião já agendada. Ela roda o tráfego, uma
IA de voz qualifica o cliente final e marca a consulta; advogados compram esse
lead num aplicativo, por unidade ou consumindo crédito.

Quatro máquinas encadeadas:

**captar o lead → qualificar com a IA → agendar a reunião → entregar ao advogado**

A entidade que atravessa tudo é o **Lead**: é ele que a campanha produz, que a IA
qualifica, que carrega a reunião, que consome crédito ao ser comprado e que
responde, perante a OAB, como aquele cliente chegou àquele advogado.

**Cuidado de vocabulário**, porque as duas pontas usam a mesma palavra no dia a
dia: **lead** é sempre o cliente final (a pessoa com o problema jurídico).
**Advogado** é sempre o comprador. O advogado também entra por um funil de
captação, mas ali ele é `Advogado`, nunca `Lead`.

O que limita o negócio é que ele é um intermediário entre cliente e advogado, e
**intermediação de clientela é matéria regulada** (Provimento 205 da OAB). Duas
consequências entram no código como invariante, não como recomendação: um lead
nunca é vendido duas vezes, e o contato do cliente final não aparece antes da
compra.

## Estado atual

Maquete de front-end **com autenticação de verdade**. Entrar é entrar: e-mail e
senha contra o Supabase Auth, sessão que sobrevive ao recarregamento, e nenhuma
rota abre sem ela (`ACC-R08`).

Os dados das telas, porém, ainda são de maquete: `localStorage`
(`focus.leads.v1`, `focus.advogados.v1`, `focus.usuarios.v1`,
`focus.creditos.v1`); limpar a chave restaura os dados semeados.

**Os dois mundos se encontram em `src/lib/sessao.ts`.** O perfil que volta do
banco traz identificador em uuid; a seed usa slug. `perfilLocal()` casa os dois
pelo e-mail — por isso o e-mail de `USUARIOS_SEED` **é** o e-mail de login, e
mudar um sem mudar o outro faz a conta entrar com o nome errado. Sessão que não
resolve num perfil vira bloqueada, nunca aberta.

`npm run contas:teste` cria uma conta de acesso por papel; as senhas estão em
`.secrets/supabase.env`. Não há seletor de perfil: trocar de papel é sair e
entrar com outra conta.

**Conta nominal — de pessoa real — não entra no script.** Nome, e-mail e senha
vêm de variável em `.secrets/supabase.env`, e o script pula a conta se elas
faltarem. É a mesma regra que mantém a seed fictícia: dado real fica fora do Git,
inclusive e-mail de colega. Quem entra por uma conta assim não tem par na seed e
cai no primeiro perfil do mesmo papel — `perfilLocal()` mantém o nome e o e-mail
do banco justamente para a barra superior não mostrar outra pessoa.

Todos os onze módulos têm tela construída. Os números que não saem dos stores
reais vêm de seeds em `src/lib/*Seed.ts` — plausíveis, não reais, e fictícios por
princípio.

**A tabela de preços é a de hoje, não exemplo:** o lead custa 30 créditos ou
R$ 40 avulso nas três teses (`TES-R07`), o crédito vale R$ 1 e a recarga mínima
é de R$ 150, que compra cinco leads (`CRE-R07`). Mexer nesses números é mexer no
preço do produto — muda `src/lib/teses.ts` e `src/lib/creditos.ts` juntos, e as
seeds de campanha atrás, porque o preço avulso é o teto do custo por lead
qualificado.

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run typecheck  # só a verificação de tipos
npm run contas:teste # cria/atualiza uma conta de acesso por papel
npm run shot       # captura headless (precisa do dev rodando)
npm run smoke      # usuários + advogados + leads (precisa do dev rodando)
npm run smoke:rls  # política de acesso, direto contra o banco
npm run smoke:qualificacao # a cadeia de voz, direto contra o banco (só no de teste)
npm run n8n:fluxos # exporta os fluxos do n8n para automacoes/n8n/ (API-R16)
npm run meta:eventos # envia a fila de conversões para a Meta (automacoes/meta/)
npm run tally:preparar # confere os campos ocultos dos formulários (--valer aplica)
```

`npm run typecheck` é o portão mínimo antes de encerrar qualquer mudança.

### O banco de teste

Há **dois projetos Supabase**: o de trabalho, onde os leads reais caem, e um só
para teste. A separação não é conforto — é o que torna a suíte executável mais
de uma vez.

O motivo está nos invariantes. `npm run smoke` compra e devolve lead, e o que
isso grava não se desfaz: `INV-13` proíbe alterar o carimbo do comprador e
`INV-15` proíbe apagar movimento de crédito. Medido: a segunda execução já
encontra o funil diferente, e a terceira não acha o que comprar. Some-se que a
seed usa datas relativas — uma semana depois, as reuniões do catálogo estão
vencidas e não há o que vender.

```bash
npm run banco:teste                  # relata o que aplicaria e para
npm run banco:teste -- --valer       # aplica as migrations e cria as contas
npm run banco:reiniciar -- --valer   # derruba tudo e reaplica, com seed nova
npm run dev:teste                    # dev server apontado para o banco de teste

FOCUS_AMBIENTE=teste FOCUS_BASE_URL=http://localhost:5175 npm run smoke
```

`FOCUS_AMBIENTE=teste` faz os scripts lerem `.secrets/supabase-teste.env` em vez
de `.secrets/supabase.env`; `FOCUS_BASE_URL` aponta para o dev server certo — o
Vite pula para 5174 e 5175 quando as portas anteriores estão ocupadas, e sem
isso o smoke abre a aplicação errada e falha esperando um seletor que nunca vai
existir.

Duas travas que valem conhecer, porque as duas evitam estrago irreversível:

- **O reinício recusa rodar** se o projeto de teste apontar para o mesmo
  endereço do de trabalho. Um `.env` copiado e esquecido reaplicaria a seed onde
  os leads reais moram.
- **Migration que se declara `NÃO APLICADA`** no cabeçalho é adiada. O banco de
  teste só vale como teste se tiver o esquema que a produção tem; aplicar ali
  uma migration que lá não rodou faria o smoke passar sobre um banco que ninguém
  opera.

`npm run smoke:qualificacao` escreve, e o que escreve não se apaga — por isso
recusa rodar fora de `FOCUS_AMBIENTE=teste`. É a única verificação que percorre
a cadeia inteira: ligação, qualificação, agendamento e o lead aparecendo no
catálogo de um advogado da tese e da região.

Para conferir mudança de layout sem abrir navegador:

```bash
npm run shot                                   # / no viewport desktop
npm run shot -- --mobile                       # viewport estreito
npm run shot -- --largura 1600                 # largura específica
npm run shot -- --perfil advogado@focus.ai     # captura sob outro papel
npm run shot -- /login --out login.png         # a porta de entrada
npm run shot -- /leads --out leads.png         # outra rota
npm run shot -- /advogados --click "text=Novo advogado"
```

O script entra sozinho antes de capturar — `--perfil` recebe e-mail, não id de
seed. As imagens vão para `.screenshots/` (fora do Git). O script **falha se
algo escrever erro no console** — vale como smoke test de qualquer tela.

`npm run smoke` valida três fluxos ponta a ponta. Rode depois de mexer em
`src/lib/leads.ts`, `src/lib/advogados.ts`, `src/lib/usuarios.ts`, nos contextos
ou nas views correspondentes. Ele e o `shot` precisam das contas de teste
criadas e de rede: sem sessão não há tela.

## Estrutura

```
App.tsx                          Rotas (HashRouter)
main.tsx                         Entrada
types.ts                         Tipos de domínio — vocabulário canônico
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
  lib/estilo.ts                  Tom → classe completa (chip, etiqueta, bloco, ponto)
  lib/navigation.ts              Mapa de módulos × matriz de acesso
  lib/usuarios.ts                Hierarquia de criação, validação, prévia de acesso
  lib/leads.ts                   Exclusividade, máscara, reserva, compra, visibilidade
  lib/advogados.ts               Funil, liberação de acesso, prioridade
  lib/teses.ts                   As três teses e os filtros de elegibilidade
  lib/creditos.ts                Pacotes, saldo, devolução, receita
  lib/qualificacao.ts            SDR de voz: taxa, gravação, deduplicação
  lib/integracoes.ts             Inventário real: o que opera e o que falta ligar
  lib/identificador.ts           Slug estável para os dados semeados
  lib/format.ts                  Datas e tempo relativo
  lib/*Seed.ts                   Dados semeados, fictícios
  lib/mockData.ts                Usuários semeados e moldura do painel
  index.css                      Tema Tailwind
views/                           Uma pasta por módulo
scripts/                         screenshot.mjs, smoke-*.mjs
```

Alias: `@/*` → raiz do repositório. Importe `@/src/lib/...`, `@/views/...`,
`@/types` — caminho relativo só dentro da mesma pasta de view.

## Como trabalhar aqui

As convenções da próxima seção dizem *como escrever*. Esta diz *como decidir* —
vale igual para bug, para funcionalidade nova e para refatoração.

### Princípios

**A solução mais simples que não fura invariante.** Simples aqui é não inventar
camada: um `Record` de estado para classe completa resolve o que um nome de
classe montado em runtime quebra em silêncio (`EST-R01`). Mas simplicidade nunca
é atalho em invariante — mascarar o contato antes da compra (`INV-11`) e conferir
se o lead já tem dono (`INV-10`) continuam obrigatórios mesmo quando "é só uma
listagem".

**Abstração depois do terceiro caso.** Dois usos parecidos são coincidência; o
helper genérico escrito no primeiro vira parâmetro que ninguém sabe para que
serve.

**Legibilidade acima de esperteza.** O nome sai do vocabulário canônico de
`types.ts`, não de sinônimo improvisado. Função curta, uma responsabilidade —
`src/lib/` é feito de função pura porque é isso que se lê e se verifica sozinho.

**Entrega é bloco completo e funcional.** `// TODO: implementar depois` não é
resposta final. O que ficou de fora vira linha em **Pendências conhecidas**, com
o motivo — não comentário solto no meio do arquivo.

**Consistência antes de gosto pessoal.** Antes de introduzir padrão, procure o
que já existe: classe em `@layer components` (`EST-R06`), tom em `estilo.ts`
(`EST-R02`), acesso em `navigation.ts`. Dois padrões concorrentes com adoção
quase igual é a dívida mais cara deste repositório, porque ninguém sabe qual é o
certo e unificar já custa varredura.

### Ao corrigir um bug

1. **Reproduza.** `npm run shot -- /rota` derruba o caso na tela e falha se o
   console reclamar; `npm run smoke` cobre usuários, advogados e leads.
2. **Ache a causa raiz antes de mexer.** As falhas caras aqui são silenciosas, e
   a view quase nunca é a culpada: classe purgada por concatenação (`EST-R01`),
   id de seed com acento quebrando o elo (`identificador()`), tabela declarada
   depois do bloco de dados (zona morta temporal), truncamento silencioso de
   lista (`API-R07`). "Tela vazia com console limpo" é assinatura de elo de seed
   quebrado, não de erro de renderização.
3. **Corrija o mínimo.** Não reescreva o módulo para consertar uma condição.
   Reescrita ampla só quando for o pedido.
4. **O conserto mora onde a regra mora.** Defeito de negócio se resolve em
   `src/lib/`, com o ID no comentário; regra ainda sem ID ganha o próximo do
   prefixo, e ID não se renumera.
5. **Explique em duas frases** o que mudou e por quê.

### Ao adicionar funcionalidade

1. Requisito ambíguo? Assuma a leitura mais razoável e **declare a suposição** —
   não trave a entrega por isso.
2. **Pergunte primeiro se toca invariante.** Lead, contato do cliente, crédito,
   cadastro de advogado e registro de qualificação têm regra não negociável. Se a
   funcionalidade encosta em um deles, a invariante é o primeiro requisito, não
   ajuste no fim.
3. **Cada pedaço no seu lugar:** regra, cálculo e preço em `src/lib/` (função
   pura); estado em contexto; tom em `estilo.ts`; rótulo em `*_LABEL`; acesso em
   `navigation.ts`. A view chama e renderiza.
4. Módulo ou papel novo entra conscientemente em `MODULOS` — nada herda acesso
   (`INV-05`).
5. Feche pelo portão de verificação abaixo.

### Verificação — não há suíte de testes

Nenhum teste unitário existe no repositório. O que existe:

| Comando | Quando |
| --- | --- |
| `npm run typecheck` | sempre, antes de encerrar qualquer mudança |
| `npm run smoke` | mexeu em `leads.ts`, `advogados.ts`, `usuarios.ts`, nos contextos ou nas views deles |
| `npm run shot` | mexeu em layout, criou tela, ou quer conferir sob outro perfil |

**Não afrouxe o portão para passar.** Seletor de smoke não se troca para
"encontrar" o elemento, `.campo-mensagem-erro` não se renomeia para escapar da
verificação (`EST-R06`), erro de tipo não vira `any`. O que se corrige é a causa.

Quando uma suíte de verdade entrar, **combine o framework antes** de adicionar a
dependência, e comece por `src/lib/` — as funções são puras exatamente para isso.

### O que evitar

- **Dependência nova sem necessidade clara.** Ícone já é `lucide-react`
  (`EST-R08`); estilo já é Tailwind pelo `@theme`. Biblioteca a mais é superfície
  a mais para manter.
- **Duplicar regra que já vive na lib.** Se a view precisa saber se o contato
  aparece, ela chama `contatoVisivel` — não repete a condição.
- **Decidir acesso na view** por comparação de papel solta.
- **Mudança fora do escopo.** Item de Pendências conhecidas não se corrige "de
  passagem": é demanda própria, e misturar assunto no commit atrapalha quem for
  ler depois.
- **Comentário que parafraseia a linha seguinte.**
- **Dado real em seed, fixture ou exemplo.** Seed é fictícia e continua fictícia.

## Convenções

**Vocabulário canônico, não rótulo de tela.** `types.ts` desambigua. O rótulo que
o usuário lê fica em mapas `*_LABEL`; o código usa a chave.

**Regras de negócio são citadas pelo ID estável** (`LED-R03`, `ADV-R02`,
`TES-R01`, `CRE-R05`) em comentário, junto do motivo. Quem for mexer numa regra
procura pelo ID. Prefixos: `ACC` acesso · `LED` lead · `ADV` funil do advogado ·
`TES` teses · `QUA` qualificação por IA · `CRE` créditos · `CNF` conformidade ·
`CMP` campanhas · `INT` integrações · `AUT` automações · `ASS` assistente ·
`EST` estilização · `API` camada de dados. IDs não são renumerados — regra
removida deixa o ID aposentado.

Os prefixos `CRM`, `VRB`, `FIN` e `PLT` estão **aposentados**, junto com
`INV-01` a `INV-04` e `INV-08`: pertenciam a um domínio anterior que não existe
mais. Não reaproveite esses números.

**Comentário explica o porquê, não o quê.** O padrão do repositório é comentar a
consequência de negócio ("dois advogados com o mesmo contato disputam o mesmo
cliente"), não parafrasear a linha seguinte.

**Regra de negócio mora em `src/lib/`, não na view.** Validação, permissão,
transição, elegibilidade e preço são funções puras testáveis; a view chama e
renderiza.

**Acesso.** Nunca decida acesso na view por comparação de papel solta. Use
`nivelDeAcesso`, `modulosVisiveis`, `podeAcessar`, `temAcessoRestrito` e
`moduloDaRota` de `src/lib/navigation.ts`. Papel novo **não herda acesso** —
precisa ser adicionado conscientemente às listas em `MODULOS` (`INV-05`). A rota
é bloqueada pelo `GuardaDeRota`, que lê a mesma matriz: nível `blocked` volta ao
painel, `restricted` passa e a tela filtra o conteúdo.

São dois portões, e a ordem importa. O `PortaoDeSessao` roda **antes** e trata
de existir sessão (`ACC-R08`); o `GuardaDeRota` roda depois e trata de qual
módulo aquele papel abre (`ACC-R07`). Colapsar os dois quebra os dois: o guard
bloqueia *por papel*, e sem sessão não há papel — papel indefinido não está em
lista nenhuma, então ele passa. A falha liberaria tudo em vez de fechar, que é
exatamente o que `API-R05` proíbe.

**Dado do cliente final passa por um portão só.** Nenhuma tela lê
`lead.telefone` direto: tudo passa por `contatoVisivel` em `src/lib/leads.ts`.
Um lugar para a decisão significa que a próxima tela que listar lead não precisa
lembrar da regra.

**Seed é acoplada por id.** O lead aponta para o advogado que o comprou, o
extrato aponta para o lead. Os ids saem de `identificador()`, que **remove o
acento antes** de trocar o resto por hífen — sem isso "Prev Fácil" vira
`prev-f-cil`, o elo quebra em silêncio e a tela aparece vazia sem erro nenhum.

**Cuidado com a zona morta temporal nas seeds.** `LEADS_SEED` e `ADVOGADOS_SEED`
são avaliados na carga do módulo e chamam funções auxiliares que leem tabelas
`const`. Toda tabela que a auxiliar usa precisa estar declarada **antes** do
bloco de dados; declarada depois, o app quebra na inicialização com
`Cannot access before initialization`.

## Estilização

O mecanismo é Tailwind v4 pelo plugin do Vite (`@tailwindcss/vite`), com build
real. O tema vive no `@theme` de `src/index.css` — não há `tailwind.config.js`,
não há CDN, não há CSS de aplicação fora desse arquivo.

**A marca é roxo e preto.** `roxo-*` como cor primária, `grafite-*` como o preto
da moldura (barra superior, véu de diálogo, toast, botão do assistente). Isso é
decisão de marca, não acidente: roxo carrega a leitura "serviço profissional
premium" e o preto dá o peso de produto de tecnologia. Se você encontrar uma
convenção de outro sistema da casa proibindo roxo/violeta na interface, **ela não
vale aqui** — não "corrija" a paleta.

O `grafite-*` não é preto absoluto: tem um traço de roxo. Preto puro ao lado do
roxo corta seco e lê como buraco na tela em vez de superfície.

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
`sucesso`, `atencao`, `erro`, `info`) e cinco mapas de tom para classe completa,
um por papel visual:

| Mapa | Onde se usa |
| --- | --- |
| `ESTILO_CHIP` | contador do topo de tela — fundo claro, borda, texto |
| `ESTILO_ETIQUETA` | etiqueta compacta: tese, prioridade, resultado de ligação |
| `ESTILO_BLOCO` | caixa de aviso inteira tingida |
| `ESTILO_PONTO` | bolinha de estado, cabeça de coluna, barra de gráfico |
| `ESTILO_TEXTO` | ícone ou número solto sobre fundo claro |

A view escolhe o **tom**; o pigmento é problema do mapa. Mapa de domínio para tom
(`COR_COLUNA`, `ESTILO_TESE`, `TOM_RESULTADO`, `TOM_MOVIMENTO`) fica na lib do
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
quadro e linha de tabela ficam em `transition-colors`.

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

`.campo-mensagem-erro` é o gancho dos smoke tests para achar erro de validação —
trocar essa classe quebra o smoke, e é de propósito: o teste passa a apontar o
lugar único onde a mensagem de erro é estilizada. O componente `Campo` de
`src/components/ui/Campo.tsx` já aplica.

### `EST-R07` — o ponto de virada aqui é `sm:`

A adaptação é essencialmente binária — celular abaixo de 640px, desktop acima.
Siga o que já existe em vez de introduzir pontos de virada novos.

A exceção é a barra superior: com onze módulos, a navegação horizontal só cabe a
partir de `xl:`, e a busca só a partir de `2xl:`. Abaixo disso o menu compacto é
mais honesto que uma lista cortada no meio da palavra, que parece defeito.

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

### `EST-R13` — menu flutuante fecha por clique fora, então tudo dele mora dentro dele

`MenuCartao` escuta `mousedown` no documento e fecha quando o clique cai fora do
próprio container. Um botão irmão, posicionado ao lado, **desmonta no mousedown e
o clique nunca acontece** — o botão fica visível e simplesmente não funciona.
Ação extra entra pela propriedade `acoes`, dentro do menu.

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

- `INV-05` Papel novo não herda acesso.
- `INV-06` O assistente nunca faz consulta livre ao banco. Só consultas
  pré-definidas e pré-agregadas.
- `INV-10` **Nenhum lead é vendido duas vezes.** Devolução não recoloca no
  catálogo. Dois advogados com o mesmo contato é concorrência pelo mesmo cliente
  — exatamente o risco que o Provimento 205 levanta sobre intermediação.
- `INV-11` **O telefone do cliente final só aparece depois da compra.** É o
  produto e é dado pessoal. Antes da venda a tela mostra o suficiente para
  decidir, nunca o contato.
- `INV-12` **Advogado não se cadastra sozinho.** Login só nasce de um registro
  que passou pelo funil, com a inscrição da OAB conferida por alguém do time.
- `INV-13` **O registro da qualificação e do comprador é imutável.** É o que
  responde, perante a OAB, como o cliente foi direcionado e para quem.
- `INV-14` **Crédito só entra com confirmação de pagamento.** Baixa manual não
  credita.
- `INV-15` **Crédito consumido fecha com crédito comprado.** O saldo é a soma do
  extrato, nunca um número guardado à parte.
- `INV-16` **Nenhum criativo sobe sem parecer.** Quem anuncia captando clientela
  para advogado responde pela peça.
- `INV-17` **O sistema não guarda dado bancário do cliente final.** Nem senha,
  nem cartão, nem número de contrato. Não existe o campo — é assim que a regra se
  sustenta.

`INV-12` também é decisão de configuração, não só de código: `src/servicos/`
deliberadamente não expõe `signUp`, e o cadastro público precisa estar fechado no
projeto. Enquanto estiver aberto, o furo é limitado — conta sem linha em `perfis`
cai como bloqueada (`ACC-R08`) e não enxerga nada —, mas é furo.

Regras já vivas no código: `ACC-R02` e `ACC-R03` (`src/lib/usuarios.ts`),
`ACC-R21` e `ACC-R22` (`UsuariosContext`), `ACC-R01` e `ACC-R07`
(`src/lib/navigation.ts` + `GuardaDeRota`), `ACC-R08` (`PortaoDeSessao` +
`src/lib/sessao.ts`), `ACC-R09` (`src/servicos/perfil.ts`), `CNF-R21` (`AuthContext` +
`views/Conformidade/`), `LED-R01` a `LED-R08` (`src/lib/leads.ts`), `ADV-R01` a
`ADV-R10` (`src/lib/advogados.ts`), `TES-R01` a `TES-R07` (`src/lib/teses.ts`),
`CRE-R01` a `CRE-R07` (`src/lib/creditos.ts`), `QUA-R01` a `QUA-R03`
(`src/lib/qualificacao.ts` e `supabase/migrations/0010_qualificacao_por_voz.sql`),
`ASS-R02` (`AssistenteButton`), `CMP-R01` a `CMP-R06`
(`supabase/migrations/0006_atribuicao_meta.sql`).

`LED-R01` vive em dois lugares de propósito: `elegibilidadeDoLead()` decide na
tela, e `filtros_pendentes()` decide no banco
(`supabase/migrations/0011_agendamento_da_reuniao.sql`). Não é duplicação por
descuido — quem publica um lead é a automação da voz, com chave de serviço, e
ela nunca passa pelo código da view. A regra é do módulo, não da tela, e a tela
não é o único caminho até ela (`API-R06`).

## Camada de dados — contrato para quando o backend entrar

O backend já existe e já é usado numa frente: a autenticação. Os dados das telas
continuam em `localStorage`. As regras abaixo **não são hipótese** — são o
desenho já decidido (Supabase: tabelas com política de acesso,
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
  ergonomia, não controle de acesso. Isso vale em dobro aqui, onde `advogado_id`
  separa a carteira de um advogado da do outro — e onde a coisa filtrada é o
  telefone de uma pessoa real.
- `API-R03` — **Privilégio elevado obriga a reimplementar o isolamento.** A chave
  de serviço ignora todas as políticas do banco. Toda função que a usa carrega
  sozinha a responsabilidade de não vazar dado entre advogados — é onde a falha é
  mais provável e mais silenciosa.
- `API-R04` — **Função de banco nova revoga execução de `PUBLIC`, `anon` e
  `authenticated`, os três.** Revogar só de `PUBLIC` não tem efeito: a plataforma
  concede execução direto aos outros dois por privilégio padrão. Defina também o
  `search_path` explicitamente.
- `API-R05` — **Falha de carregamento de perfil precisa fechar, não abrir.** Se o
  perfil não carregar e a aplicação seguir com papel indefinido, todo guard que
  bloqueia *por papel* deixa de bloquear — "indefinido" não está em lista nenhuma.
  Timeout de carregamento tem que levar a estado bloqueado, não a estado livre.
  O `GuardaDeRota` (`ACC-R07`) já decide pela matriz de acesso; o que falta é o
  perfil vir de uma sessão de verdade, e é aí que este cuidado entra.

### Consultas

- `API-R06` — **A regra de leitura mora na camada de serviço.** Consulta solta
  espalhada pelas telas é o antipadrão que mais custa: quando a camada mascara o
  contato de lead não comprado, exclui lead já vendido do catálogo ou preserva o
  carimbo imutável da venda, quem consulta direto simplesmente não aplica nada
  disso — e o sintoma é uma tela nova entregando telefone de graça. Vale a mesma
  lógica que já governa `src/lib/`: a regra é do módulo, não da view.
- `API-R07` — **Lista grande exige paginação explícita.** O corte padrão é 1.000
  linhas e o truncamento é **silencioso**: não vem erro, vem menos dado. Já custou
  filtro perdendo opção e janela de comparação virando um terço do período, com os
  comparativos zerando sem ninguém notar. Passou de 1.000, paginou.
- `API-R08` — **Operação transacional ou validada é função no banco.** Tudo que
  precisa gravar em conjunto — comprar lead, debitar crédito, devolver — passa por
  função com validação antes de gravar, não por escrita direta. A compra é o caso
  crítico: carimbar o comprador e debitar o saldo em passos separados abre a
  janela em que dois advogados compram o mesmo lead. Trava de edição concorrente
  também: com expiração por falta de sinal de vida e limpeza de travas órfãs — é
  exatamente o que `LED-R04` já modela na maquete.
- `API-R09` — **Assinatura ao vivo com parcimônia.** O filtro de tempo real só
  aceita igualdade simples; filtro composto obriga a escutar a tabela inteira e
  refinar no cliente, com agrupamento de eventos para não recarregar a cada
  mudança. Há teto de eventos por segundo, e tabela movimentada com assinatura
  ampla o atinge.

### Integrações e eventos

- `API-R10` — **Configuração ausente não pode virar silêncio.** O padrão fácil —
  se a chave do webhook está vazia, pula a chamada — faz a funcionalidade sumir
  sem erro, sem aviso ao usuário e sem registro de que a etapa foi ignorada.
  Etapa pulada tem que aparecer em algum lugar; a tela de Integrações é onde.
- `API-R11` — **O fluxo externo responde honestamente.** Sucesso só em sucesso.
  Fluxo que engole erro e responde 200 em falha faz o sistema nunca saber que
  precisa reenfileirar.
- `API-R12` — **Evento de entrega única precisa de reconciliação.** Provedor que
  não reenvia em caso de falha exige rotina periódica que confira o que ficou
  para trás. Sem isso, evento perdido é dado perdido — e aqui o dado perdido é
  uma reunião agendada que nunca aparece no painel de ninguém. **Todo fluxo de
  terceiro nasce com a reconciliação junto**, não depois.
- `API-R13` — **Webhook de entrada é idempotente.** Eventos chegam repetidos.
  Deduplique por par (identificador, tipo de evento). Sem isso, uma ligação vira
  duas tentativas e o lead é descartado por excesso (`QUA-R02`).
- `API-R14` — **Evento é gatilho, não fonte da verdade.** Recebeu aviso? Consulte
  o estado real antes de agir sobre ele (`QUA-R01`).
- `API-R15` — **Balde público serve URL permanente.** Arquivo em balde público
  fica acessível para sempre, sem expiração, para quem tiver o endereço. Gravação
  de qualificação, documento de cliente e comprovante **não** vão para balde
  público — `INV-13` depende de a gravação ser rastreável, não exposta.
- `API-R16` — **Automação externa é código não versionado.** Fluxo que vive só
  dentro da ferramenta de automação é lógica de negócio fora do repositório, sem
  revisão e sem histórico. Ou versiona, ou registra explicitamente que é dívida.

### Coerência com os invariantes

`INV-14` — crédito só entra com confirmação de pagamento — é a mesma regra vista
do lado da integração: **o gatilho é o webhook do provedor de pagamento, e baixa
manual não credita.** Se algum dia alguém pedir para a baixa manual creditar
porque "o advogado já pagou e o comprovante está aqui", a resposta é o ajuste
manual — que é um tipo de movimento próprio, aparece no extrato como tal e exige
motivo —, não atalho no gatilho.

### Antes de abrir uma integração nova

- O dado sensível fica fora do navegador?
- Erro tem mensagem para o usuário **e** detalhe no log?
- A lista passa de 1.000 linhas? Paginou?
- Tabela nova: ativou a proteção de acesso, escreveu as políticas e **repetiu o
  bloqueio do papel externo**? `advogado` não é bloqueado automaticamente em
  tabela nova — é o mesmo `INV-05` do lado do banco.
- Usa privilégio elevado? Reimplementou o isolamento em código?
- Serviço pago: tem cache, teto, restrição por papel e registro de custo por uso?

## Pendências conhecidas

Não são bugs a corrigir de passagem — são dívidas anotadas. Mexa nelas quando
forem a demanda.

- **Validação jurídica do Provimento 205.** Um intermediário que dá a múltiplos
  advogados acesso a dados de possíveis clientes levanta questão de captação de
  clientela, de direito do cliente final saber como foi direcionado, e de
  concorrência entre advogados pelo mesmo lead. Precisa de revisão por advogado
  especialista em ética profissional **antes do lançamento comercial**. Não
  impede construir; impede lançar. Está visível no módulo de Conformidade e no
  painel.
- **Sessão real, dados de maquete.** O login autentica contra o Supabase, mas
  leads, advogados, créditos e usuários seguem em `localStorage`. `src/lib/sessao.ts`
  casa o perfil autenticado com a seed pelo e-mail; migrar os quatro contextos
  para `src/servicos/` é a demanda que apaga esse arquivo.
- **Cadastro público ainda aberto no projeto Supabase.** `disable_signup` precisa
  ir para `true` (Authentication › Sign In / Providers). Conta criada por fora
  não ganha linha em `perfis` e cai como bloqueada, então não enxerga nada — mas
  `INV-12` diz que ninguém se cadastra sozinho, e isso se fecha na configuração.
- **Sem recuperação de senha.** Trocar senha é por `npm run contas:teste` ou pelo
  painel do Supabase.
- **Convite não sai de verdade.** A conta do advogado já nasce da liberação de
  acesso (`ADV-R09`), mas o e-mail com o acesso depende do serviço de envio.
- **Aviso de lead novo não sai.** O painel do advogado promete o aviso em três
  lugares; a integração de WhatsApp está como não configurada e a etapa pulada
  aparece na tela de Integrações (`API-R10`). Falta o disparo — e ele depende
  de serviço externo, não de tela.
- **Recarga não tem checkout.** `INV-14` exige confirmação de pagamento, e o
  provedor ainda não existe: o botão de recarregar, na tela de Preços, está
  desabilitado de propósito. O caminho interno para destravar alguém é o ajuste
  manual (`CRE-R06`), que exige permissão e motivo.
- **O banco ainda conhece `closer` e `sdr`.** O app não: os dois papéis saíram
  do vocabulário, e quem conduz o funil do advogado é Customer Success. A
  migration `0009_papeis_sem_vendas_humana.sql` está escrita e **não aplicada**
  — ela recria o enum `papel_usuario`, e antes de rodar é preciso decidir o
  destino das contas que ainda estiverem com esses papéis, apagar
  `closer@focus.ai` e `sdr@focus.ai` do Supabase Auth e regerar
  `src/servicos/banco.types.ts`. Enquanto isso não acontece, uma conta com papel
  removido entra e cai como bloqueada (`ACC-R08`) — fecha, não abre, mas o
  motivo não aparece na tela.
- **Duas frentes de captação fora das três teses.** Os formulários de auxílio
  por incapacidade e de salário-maternidade estão no ar e têm fluxo de voz
  próprio, mas são previdenciários e não existem no enum `tese` — nem em
  `FOCUS-AI.md`, que descreve três. `registrar_captacao` recusa a captação
  deles com motivo, então nada entra classificado errado. Resolver é decisão de
  produto: ampliar as teses ou tirar os formulários do ar.
- **A fila de conversões da Meta não tem tela nem agendador.** As funções e os
  gatilhos existem (`CMP-R01` a `CMP-R06`), e `npm run meta:eventos` esvazia a
  fila — mas quem chama isso de tempos em tempos ainda é decisão de operação, e
  o que falhou só aparece consultando `eventos_meta`. A tela de Integrações é
  onde a etapa pulada deveria aparecer (`API-R10`).
- **Sem paginação** nas listas de leads e de advogados.
- **Sem trilha de auditoria** de mudança de papel, de preço por tese e de
  devolução de crédito.
- **Reserva de lead expira só na leitura.** `reservaAtiva` calcula contra o
  relógio a cada render; não há rotina que limpe trava órfã no armazenamento.
  Funciona na maquete, não sobrevive a múltiplos clientes.

## Documentação

**`FOCUS-AI.md` é a especificação do produto e é versionada.** É a fonte da
verdade sobre o modelo de negócio, as três teses e o aplicativo do advogado.
Quando o código e ela divergirem, uma das duas está errada — resolva, não
ignore.

### Material de apoio local — só leitura

Além dela existe material mantido **apenas na máquina**, fora do versionamento
(`.gitignore`): PDF, planilha, pasta de documentação, documento solto na raiz.
Esse material serve para consulta enquanto se trabalha, e nada além disso. As
regras são absolutas:

- **Nunca versione esse material.** Não tire do `.gitignore`, não faça
  `git add -f`, não copie trecho para arquivo versionado.
- **Nunca o cite em nada que vá para o Git** — mensagem de commit, corpo de PR,
  comentário de código ou README. Nem o nome do arquivo, nem o caminho, nem
  "conforme a documentação".
- **Ao comitar, confira antes de dar `git add`.** Nunca use `git add .` às cegas:
  material novo pode ter caído na raiz sem padrão que o `.gitignore` pegue. Rode
  `git status` e olhe a lista.
- **Fundamente pelo código ou pela especificação**, não pelo material local. Ao
  justificar uma decisão em commit ou comentário, aponte o ID da regra
  (`LED-R03`, `TES-R02`) e o efeito de negócio.

O que separa um do outro é o conteúdo, não o formato: dado de cliente, valor
contratado e parecer sobre publicidade regulada ficam de fora do repositório —
nem em fixture, nem em seed, nem em exemplo de comentário. Dado semeado é
fictício e continua fictício.

## Git

**Sem coautoria.** Nenhum commit deste repositório leva trailer `Co-Authored-By`,
assinatura de ferramenta, ou linha do tipo "Generated with". O autor é quem
assina o commit. Isso vale mesmo que a configuração padrão da ferramenta peça o
contrário.

**Um commit por função ou demanda.** Cada commit resolve uma coisa e fica
coerente sozinho: se a demanda tocou o catálogo de leads e, de passagem, o
formatador de data, são dois commits. Trabalho de várias frentes numa mesma
sessão vira vários commits, na ordem em que fazem sentido ser lidos — nunca um
"vários ajustes" no fim.

Antes de comitar, separe o que está no working tree por assunto (`git add -p`
quando o arquivo mistura assuntos) e verifique que cada commit passa no
`npm run typecheck` por si só.

Mensagem: uma linha no imperativo, em português, dizendo o efeito — não o
arquivo mexido. Corpo só quando o porquê não cabe no título. **Nunca cite a
documentação local** na mensagem — justifique pelo ID da regra e pelo efeito de
negócio.

```
Impede vender o mesmo lead para dois advogados
Mascara o contato do cliente até a compra
Separa a conferência da OAB do movimento de etapa
```

Não comite nem faça push sem o pedido explícito. Estando na `main`, crie um branch
antes.
