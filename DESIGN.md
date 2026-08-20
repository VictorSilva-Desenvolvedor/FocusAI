---
name: Focus AI
description: Painel operacional de aquisição de leads jurídicos qualificados por IA, para advogados compradores.
colors:
  roxo-50: "#f7f4ff"
  roxo-100: "#efe9fe"
  roxo-200: "#ded4fd"
  roxo-300: "#c5b0fa"
  roxo-400: "#a684f5"
  roxo-500: "#8b5cf6"
  roxo-600: "#7539e8"
  roxo-700: "#6127c7"
  roxo-800: "#4a1d97"
  roxo-900: "#331068"
  roxo-950: "#1f0a45"
  grafite-700: "#26262b"
  grafite-800: "#17171a"
  grafite-900: "#0d0d10"
  grafite-950: "#08080a"
  fundo: "#f5f3f7"
  sucesso-500: "#10b981"
  sucesso-600: "#059669"
  atencao-500: "#f59e0b"
  atencao-600: "#d97706"
  erro-500: "#ef4444"
  erro-600: "#dc2626"
  info-500: "#0ea5e9"
typography:
  titulo:
    fontFamily: "Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "tight"
    letterSpacing: "-0.01em"
  corpo:
    fontFamily: "Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "normal"
  rotulo:
    fontFamily: "Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  nota:
    fontFamily: "Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
  eyebrow:
    fontFamily: "Segoe UI, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  controle: "8px"
  superficie: "12px"
  pilula: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.roxo-600}"
    textColor: "#ffffff"
    rounded: "{rounded.controle}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.roxo-700}"
  button-primary-disabled:
    backgroundColor: "#d6d3d1"
    textColor: "#57534e"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "#44403c"
    rounded: "{rounded.controle}"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.superficie}"
    padding: "24px"
  input:
    backgroundColor: "#ffffff"
    textColor: "#292524"
    rounded: "{rounded.controle}"
    height: "36px"
    padding: "0 12px"
---

# Design System: Focus AI

## Overview

**Creative North Star: "A sala de reunião do advogado sênior."**

Focus AI é o painel onde um advogado decide, em segundos, se vale a pena pagar
por um lead. O produto vendido é confiança regulada — um intermediário numa
atividade que a OAB fiscaliza de perto (Provimento 205) — então a interface
precisa ler como *serviço profissional premium* antes de ler como *ferramenta
de tráfego*. Roxo carrega essa leitura; grafite dá o peso de produto de
tecnologia sério sem competir com o roxo. As duas cores nunca dividem a cena
com uma terceira: cor de marca é rara e deliberada, cor de estado
(sucesso/atenção/erro/info) segue a escala Tailwind padrão porque status não é
identidade.

Este é um sistema de **Operar** (Impeccable mode: Operate), não de Persuadir —
o visitante já está convertido, comprou acesso, e está aqui para decidir sobre
leads, créditos e conformidade repetidamente ao longo do dia. Densidade,
escaneabilidade e consistência pesam mais que expressão. A marca vive em
detalhes precisos (a cor do ponto de status, o peso de um número tabular), não
em composição ousada de página.

**Key Characteristics:**
- Cinza levemente arroxeado como fundo (`--color-fundo`, #f5f3f7), nunca cinza
  puro — mantém o conjunto coeso com o roxo sem competir com o branco do card.
- Preto de marca (`grafite-*`) com um traço de roxo — nunca `black` puro, que
  cortaria seco ao lado do roxo e leria como buraco em vez de superfície.
- Tipo compacto e denso — a escala vai de 11px a 24px, a maior parte da
  interface roda em 13px. Ler mais rápido, não ler mais bonito.
- Duas sombras só: uma para superfície em repouso, uma para o que paira.
- Camadas em `z-index` numa escala fixa e nomeada — nunca um valor arbitrário
  maior que o anterior.

## Colors

A paleta é deliberadamente pequena: uma cor de marca, um neutro com um traço
dela, e a escala de estado padrão do Tailwind sob nome de significado.

### Primary
- **Roxo** (`--color-roxo-600` #7539e8 em ação; `--color-roxo-900` #331068 em
  título): o único acento de marca. Botão primário, título de página, link,
  aba ativa. Nunca mais de um elemento de acento por decisão na tela — é
  exatamente o "resíduo de UI genérica de IA" que um linter automatizado
  tentaria sinalizar aqui, e é intencional: ver a Regra do Roxo Deliberado
  abaixo.

### Neutral
- **Grafite** (`--color-grafite-900` #0d0d10): a moldura — barra superior, véu
  de diálogo, toast, botão do assistente. Não é preto puro.
- **Fundo** (`--color-fundo` #f5f3f7): o chão da aplicação atrás de todo card.
- **Stone (Tailwind padrão, 50–800):** texto secundário, borda, divisor,
  placeholder. `stone-800` é o corpo do texto de campo; `stone-500` é o piso
  para qualquer texto/ícone que precisa ser lido (ver a Regra do Contraste
  Mínimo); `stone-400` e mais claro são só para traço decorativo ou ícone ao
  lado de texto já legível, nunca para texto sozinho.

### Named Rules
**A Regra do Roxo Deliberado.** Esta paleta é roxo + preto por decisão de
marca documentada, não por convergência de padrão de IA generativa. Uma
ferramenta de lint de anti-padrão que sinalizar "paleta roxo/violeta = tell de
UI gerada por IA" está correta em geral e errada aqui — a exceção está
registrada em `.impeccable/config.json` (`ignoreRules: ["ai-color-palette"]`)
de propósito, não por descuido.

**A Regra do Contraste Mínimo.** Nenhum texto ou ícone funcional (não
puramente decorativo) usa uma cor abaixo de `stone-500` sobre fundo claro, nem
abaixo do que garanta 3:1 sobre fundo escuro. `stone-400` e mais claros existem
na escala, mas não carregam informação sozinhos.

## Typography

**Corpo/Título/Rótulo:** `'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif` — a fonte do sistema operacional, não uma importada. Numa interface densa de operação lida por advogados o dia inteiro, a familiaridade do sistema bate a personalidade de uma fonte de marca — e evita o "tell" de fonte importada (Inter/Roboto/etc.) que o Impeccable também audita.

**Character:** direto e denso. Sem serifa, sem itálico decorativo, sem peso extra-bold. A hierarquia vem de tamanho e cor, não de troca de família.

### Hierarchy
- **Título de página** (600, 24px, tracking apertado): `.titulo-pagina`, roxo-900. Um por tela.
- **Título de card** (600, 13px, tracking apertado): `.card-title`, roxo-900. Cabeçalho de bloco.
- **Corpo / controle** (400–500, 13px): texto de tabela, botão, campo, aba, item de menu. É onde a interface inteira vive.
- **Rótulo de campo** (500, 12px): `.campo-rotulo`, roxo-900.
- **Nota / dica** (400, 11px): `.nota`, `.campo-dica`, `.campo-mensagem-erro`. Texto de apoio — de propósito abaixo do corpo, nunca abaixo do piso de 11px.
- **Eyebrow** (600, 11px, caixa alta, tracking 0.14em): `.label-eyebrow`. Rótulo de seção.

### Named Rules
**A Regra do Piso de 11px.** Nenhum texto funcional — incluindo rótulo
decorativo em caixa alta — fica abaixo de 11px. Abaixo disso falha em tela de
alta densidade e no zoom do navegador; achado e corrigido por auditoria
automatizada (`EST-R14` em `CLAUDE.md`).

**A Regra do 11px Deliberado.** `.nota`/`.campo-dica`/`.campo-mensagem-erro`
ficam em 11px, não nos 12px+ que um linter de legibilidade recomendaria — subir
para 12px empataria com `.campo-rotulo` (também 12px) e apagaria um degrau da
hierarquia já enxuta. 11px já limpa o piso rígido (WCAG/`undersized-ui-text`);
o piso de 12px é orientação branda para leitura longa, não para rótulo de apoio
numa interface de operação. Ver `EST-R14`.

## Layout

Ponto de virada essencialmente binário: celular abaixo de 640px (`sm:`),
desktop acima. Uma exceção: a barra superior, com onze módulos, só cabe
horizontalmente a partir de `xl:`; a busca só a partir de `2xl:`. Abaixo disso,
menu compacto — mais honesto que uma lista cortada no meio da palavra.

Container padrão é o card branco sobre o fundo arroxeado; espaçamento interno
segue passos de 8/12/16/24px. Densidade alta: linhas de tabela e cartões de
painel priorizam caber mais informação por viewport sobre respiro generoso.

## Elevation & Depth

Duas sombras, uma por papel — não uma escala de cinco. Superfície em repouso
recebe `shadow-card`, quase imperceptível (`0 1px 2px rgba(8,8,10,.06)`); o que
paira sobre o conteúdo (diálogo, gaveta, menu de contexto, toast, botão do
assistente) recebe `shadow-flutuante`, bem mais presente
(`0 16px 40px -12px rgba(8,8,10,.32), 0 2px 8px rgba(8,8,10,.1)`). Nada entre
os dois papéis usa `shadow-sm/md/lg/xl/2xl` do Tailwind solto.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(8, 8, 10, 0.06)`): todo `.card` em repouso.
- **Flutuante** (`0 16px 40px -12px rgba(8, 8, 10, 0.32), 0 2px 8px rgba(8, 8, 10, 0.1)`): diálogo, gaveta, menu de contexto, toast, botão do assistente.

### Named Rules
**A Regra das Duas Sombras.** Sem essa separação, cada diálogo novo escolheria
um `shadow-*` diferente e o sistema perderia a noção de profundidade.

## Shapes

Três degraus de raio, cada um com um papel fixo:
- **`rounded-xl`** — superfícies (`.card`).
- **`rounded-lg`** — controles: botão, campo, select, bloco interno.
- **`rounded-full`** — etiqueta, chip, avatar, botão circular.

Nada entre eles (`rounded-2xl`, `rounded-md`) — dois elementos do mesmo tipo
divergindo é dívida que ninguém decidiu.

## Components

### Buttons
- **Shape:** `rounded-lg` (8px), altura fixa `h-9` (36px).
- **Primário:** fundo roxo-600, texto branco, hover roxo-700. Desabilitado:
  fundo stone-300, texto stone-600 (não branco — branco sobre stone-300 mede
  1.5:1, quase invisível; corrigido via `EST-R14`).
- **Secundário:** borda stone-200, fundo branco, texto stone-700.
- **Fantasma:** sem borda nem fundo em repouso, texto stone-600.
- **Perigo:** fundo erro-600, mesma regra de desabilitado do primário.
- **Só-ícone:** grade 32×32, ícone stone-500 em repouso (não stone-400 —
  2.5:1 sobre branco falha até o piso de 3:1 para ícone; corrigido via
  `EST-R14`), hover roxo-700 sobre fundo stone-100.
- **Hover / Focus:** só a cor de transição (`transition-colors`), nunca
  `transition-all` — anima propriedade que muda o layout é a causa mais comum
  de travamento em lista grande.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px).
- **Background:** branco puro sobre o fundo arroxeado da página.
- **Shadow Strategy:** `shadow-card` em repouso; `card-interativo` (quando o
  card inteiro é link/botão) só muda cor no hover, nunca sombra.
- **Border:** `stone-200/80`, sempre presente — é o que separa o card do
  fundo sem depender só da sombra quase imperceptível.
- **Internal Padding:** 24px (`p-6`) é o padrão de card completo.

### Inputs / Fields
- **Style:** borda stone-300, fundo branco, texto stone-800, `rounded-lg`.
- **Focus:** borda roxo-400 + anel `ring-roxo-500/15` — glow suave, não
  troca de fundo.
- **Erro:** borda erro-300, anel erro-500/15, mensagem em `erro-600` a 11px
  abaixo do campo.
- **Desabilitado:** fundo stone-50, texto stone-500 (não stone-400 — mesma
  correção de contraste do botão).
- **Placeholder:** stone-500 (não stone-400 pela mesma razão).

### Navigation
Barra superior em `grafite-900`, itens em `roxo-200`/branco quando ativos,
sublinhado nunca usado na barra principal — só nas abas internas de
Configurações, onde a navegação por sub-seção usa sublinha embaixo em vez de
pílula (pílula já é o padrão de etiqueta/chip).

## Do's and Don'ts

### Do:
- **Do** manter roxo como o único acento de marca por tela — raridade é o
  ponto.
- **Do** usar `stone-500` como piso para qualquer texto ou ícone funcional
  sobre fundo claro.
- **Do** manter texto funcional (incluindo rótulo decorativo) em 11px ou mais.
- **Do** nomear a propriedade animada (`transition-colors`,
  `transition-[height]`) — nunca `transition-all`.
- **Do** usar as duas sombras nomeadas (`shadow-card`, `shadow-flutuante`) e
  nada entre elas.

### Don't:
- **Don't** tratar o roxo/grafite como "tell de UI de IA" a suavizar — é
  decisão de marca documentada, não acidente (ver `.impeccable/config.json`).
- **Don't** usar `stone-400` ou mais claro para texto que carrega informação
  sozinho — reserve para traço decorativo ou ícone ao lado de texto já
  legível.
- **Don't** deixar estado desabilitado sem cor de texto própria — herdar
  `text-white` de um botão primário sobre fundo `stone-300` desabilitado é
  quase invisível.
- **Don't** subir `.nota`/`.campo-dica` para 12px "para seguir a recomendação
  geral de legibilidade" sem checar que isso não empata com `.campo-rotulo` —
  o objetivo é hierarquia, não só tamanho absoluto.
