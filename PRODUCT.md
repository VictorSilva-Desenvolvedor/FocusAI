# Product

<!-- impeccable:product-schema 1 -->

<!--
  Escrito sem entrevista: todo campo abaixo tem evidência forte em CLAUDE.md e
  FOCUS-AI.md, já versionados e mantidos pelo time. Onde a evidência é direta,
  não está marcado; onde é inferência a partir do código (não uma frase
  explícita de negócio), está sinalizado "[inferido]".
-->

## Platform

web

## Users

**Advogados** — o comprador e usuário logado do aplicativo. Chegam por um
funil de tráfego pago próprio (captados como lead também), são qualificados e
só então recebem login e senha — não existe cadastro público
(`INV-12`). Usam o painel repetidamente ao longo do dia para decidir se um lead
vale o crédito ou o valor avulso, acompanhar o funil de compra, conferir o
saldo de créditos e — a partir de um certo papel — administrar usuários,
conformidade e integrações internas do time da Focus AI.

**Leads (clientes finais)** — nunca usuários do aplicativo. São o produto:
pessoas com um problema jurídico, captadas por anúncio, qualificadas por voz de
IA e agendadas. O contato deles só aparece para o advogado depois da compra
(`INV-11`).

## Product Purpose

A Focus AI vende o produto final pronto de aquisição de clientes jurídicos: o
lead qualificado com a reunião já agendada — não o serviço de marketing em si
(tráfego + gestão + acompanhamento, como uma agência tradicional cobraria). O
advogado paga pelo resultado direto, não pelo esforço de campanha.

Sucesso para o advogado: abrir o painel, encontrar um lead elegível para sua
tese e região, comprar com confiança de que ninguém mais vai competir por
aquele mesmo cliente (`INV-10`), e chegar à reunião já sabendo o suficiente
para conduzir bem a consulta.

## Positioning

Um concorrente que só faz tráfego e geração de lead não consegue copiar isto
sem reconstruir a máquina inteira: captação paga → SDR de voz por IA que
qualifica e agenda → publicação no catálogo → venda com exclusividade
garantida. A Focus AI controla as quatro pontas e responde, perante a OAB, por
como aquele cliente final chegou àquele advogado (`INV-13`) — não é um
marketplace de leads frios revendidos por terceiros.

## Operating Context

- **Regulação:** intermediação de clientela entre cliente final e advogado é
  matéria regulada pelo Provimento 205 da OAB. Isso não é contexto de fundo —
  vira invariante de código (`INV-10`, `INV-11`, `INV-12`, `INV-13`, `INV-16`,
  `INV-17`).
- **Quatro teses jurídicas hoje ativas** (consultoria em polo passivo,
  reconhecimento de vínculo empregatício, juros abusivos, e — em ampliação —
  auxílio-doença/salário-maternidade/BPC-LOAS/auxílio-acidente): cada uma tem
  público, filtro de elegibilidade, roteiro de qualificação por voz e preço
  próprios (`src/lib/teses.ts`).
- **A IA de voz (Helena)** liga, qualifica e agenda a consulta em nome da
  Focus AI, antes de qualquer contato do advogado com o cliente final.
- **Onze módulos** cobrem o ciclo inteiro: Dashboard, Leads, Advogados
  (funil de aquisição do próprio advogado), Créditos, Teses, Qualificação,
  Conformidade, Campanhas, Integrações, Assistente interno, Configurações.

## Capabilities and Constraints

- Autenticação real via Supabase Auth; nenhuma rota abre sem sessão
  (`ACC-R08`).
- Dois modelos de pagamento pelo lead: avulso (R$ 40) ou crédito (40 créditos,
  1 crédito = R$ 1) — mesmo preço nos dois modelos; o ganho de recarregar é o
  bônus do pacote, não um crédito mais barato (`CRE-R07`, `TES-R07`).
- Devolução de lead não recoloca no catálogo (`INV-10`); crédito consumido só
  fecha com crédito comprado, o saldo é sempre a soma do extrato, nunca um
  número guardado à parte (`INV-15`).
- **Sem checkout de recarga ainda** — falta provedor de pagamento; o caminho
  interno é ajuste manual com permissão e motivo.
- **Sem aviso automático de lead novo** — a integração de WhatsApp ainda não
  está configurada.
- Nenhum teste automatizado no repositório; verificação é `npm run typecheck`
  + `npm run smoke` + `npm run shot` contra um banco de teste isolado.

## Brand Commitments

- **Nome:** Focus AI.
- **Paleta:** roxo (`roxo-*`) como cor de marca primária, grafite (`grafite-*`,
  um preto com traço de roxo — nunca black absoluto) como moldura. Decisão de
  marca documentada e deliberada: roxo carrega a leitura "serviço profissional
  premium" que o público advogado espera; preto dá o peso de produto de
  tecnologia. Esta combinação **não deve ser suavizada** por soar a "paleta
  característica de UI gerada por IA" — é o oposto de acidental.
- **Fundo da aplicação:** cinza levemente arroxeado (`--color-fundo`), não
  cinza puro — mantém o conjunto coeso com o roxo.
- **Fonte:** a fonte do sistema operacional (`'Segoe UI', system-ui, ...`), não
  uma fonte importada — escolha deliberada para uma interface densa de
  operação usada por profissionais o dia inteiro.
- **Idioma do produto e do código:** português. Vocabulário canônico definido
  em `types.ts` — "lead" é sempre o cliente final, "advogado" é sempre o
  comprador, mesmo quando o advogado também passa por um funil de captação.

## Evidence on Hand

- `FOCUS-AI.md` é a especificação de produto versionada — fonte da verdade
  sobre modelo de negócio, teses e o aplicativo do advogado. Diverge do código
  em um ponto conhecido: descreve três teses, o código já tem quatro
  (ampliação em andamento, ver Pendências conhecidas em `CLAUDE.md`).
- Todos os onze módulos têm tela construída; parte dos números ainda vem de
  seed fictícia (`src/lib/*Seed.ts`) em vez do banco real — não confundir seed
  com dado de produção.
- **Não fabricar** cliente, depoimento, benchmark, preço ou prazo além do que
  `FOCUS-AI.md`/`CLAUDE.md` já registram. Onde a lib ainda não resolveu algo
  (ex.: preço das quatro novas frentes de captação), o estado correto é "ainda
  não vendido", não um número inventado.

## Product Principles

1. **O lead é a entidade que atravessa tudo.** Toda decisão de dado, acesso ou
   preço se resolve perguntando o que acontece com o lead — não com a tela.
2. **Regulação é o primeiro requisito, não o último ajuste.** Uma
   funcionalidade que encosta em lead, contato do cliente final, crédito,
   cadastro de advogado ou registro de qualificação carrega a invariante como
   parte do pedido, não como polimento depois.
3. **O produto é o resultado, não o esforço.** Preço, copy e fluxo comunicam
   "reunião agendada com cliente qualificado" — nunca "campanha rodando" ou
   "lead gerado" sem qualificação.
4. **Consistência antes de gosto pessoal.** Onze módulos precisam ler como um
   produto só; um padrão novo sem necessidade clara é dívida, não progresso.
5. **Confiança regulada é o ativo.** A interface de um advogado decidindo se
   compra um lead precisa ler como profissional premium — é isso que sustenta
   o preço e a legitimidade da intermediação sob o Provimento 205.

## Accessibility & Inclusion

Nenhum requisito de acessibilidade formal foi confirmado pelo time até a data
desta captura. Piso técnico adotado por auditoria automatizada (Impeccable,
ver `DESIGN.md` e `EST-R14` em `CLAUDE.md`): contraste de texto funcional
≥ 4.5:1 sobre fundo claro (`stone-500` como piso de cor neutra), texto
funcional ≥ 11px inclusive em rótulo decorativo, estado desabilitado sempre com
cor de texto própria — nunca herdada de um botão ativo sobre fundo mais claro.
