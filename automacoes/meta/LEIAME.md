# Pixel da Meta com o Tally no plano gratuito

O que o plano Pro do Tally vende é o atalho de colar o id do pixel dentro do
formulário. Não é preciso: o plano gratuito já entrega as três peças que fazem a
coisa inteira funcionar — **campo oculto** alimentado por parâmetro de URL,
**redirecionamento ao concluir**, e **webhook**.

O formulário continua hospedado no Tally. O pixel continua no nosso site. O que
atravessa de um lado ao outro é a identidade do clique.

```
anúncio → nossa landing            pixel base grava _fbp / _fbc
          clique no botão          o link leva _fbp, _fbc, fbclid e um evento_id
                                   que a landing gera e guarda
        → formulário no Tally      campos ocultos guardam o que veio na URL
          envio                    webhook devolve tudo ao servidor
        → nossa página de obrigado o pixel dispara o Lead com o evento_id
                                   guardado, que é o mesmo do webhook
```

O `evento_id` é a peça central, e é nosso de propósito. O `respondentId` do
Tally também chegaria aos dois lados, mas só alcançaria o navegador como
variável inserida à mão na URL de redirecionamento, formulário por formulário, e
sumiria se alguém reescrevesse essa URL. Gerado pela landing, o id não depende de
configuração nenhuma.

É ele que vira o `event_id` das duas pontas (`CMP-R01`): a Meta deduplica em vez
de contar a mesma conversão duas vezes. O que o navegador perde para bloqueador e
para o iOS, o servidor entrega.

`_fbp` e `_fbc` são cookies do **nosso** domínio — o Tally não os enxerga e
nunca os enxergaria. Levá-los na URL é o que permite reenviar, dias depois, a
reunião agendada e o lead vendido (`CMP-R02`): o cookie some, e `fbclid` não se
recupera.

## Onde cada coisa mora

| Peça | Arquivo |
| --- | --- |
| Tabelas, gatilhos e as funções | `supabase/migrations/0006_atribuicao_meta.sql` |
| Id próprio da conversão e UF pelo DDD | `supabase/migrations/0007_evento_id_proprio.sql` |
| Script das nossas páginas | `public/tally-meta.js` |
| Envio para a Meta | `scripts/meta-eventos.mjs` (`npm run meta:eventos`) |
| Campos ocultos nos formulários | `scripts/tally-preparar.mjs` (`npm run tally:preparar`) |
| Credenciais | `.secrets/meta.env`, `.secrets/tally.env` |

**O nó do n8n é fiação, não regra.** O fluxo mapeia campo e transporta; nenhuma
decisão — normalização de telefone, hash, `action_source`, janela de sete dias —
é escrita dentro dele. `eventos_meta_pendentes()` devolve o evento já montado
justamente para isso (`API-R16`).

## 1. No formulário do Tally

**Campos ocultos.** `npm run tally:preparar` cuida disso pela API, em todos os
formulários da conta, com os cinco nomes que o script da landing anexa ao link:

```
fbp    fbc    fbclid    pagina    evento_id
```

Sem `--valer` ele só relata; com `--valer` aplica. É idempotente, acrescenta só
o que falta e recusa-se a consertar bloco inválido — formulário no ar não se
altera de passagem.

**Redirecionamento ao concluir.** Em *Redirect on completion*, aponte para a
nossa página de obrigado. **URL simples, sem variável:**

```
https://focusai.com.br/obrigado
```

O id da conversão não precisa viajar por aqui. Ele é gerado pela landing, vai ao
servidor pelo campo oculto `evento_id` e à página de obrigado pelo armazenamento
do nosso próprio domínio — que é o que dispensa inserir `@RespondentId` à mão em
cada formulário e sobrevive a alguém reescrever a URL.

**Webhook.** Aponte para o fluxo do n8n e ligue a chave de assinatura. Esta
etapa é só pela tela: a chave de API do Tally não abre o endpoint de webhooks.

## 2. Nas nossas páginas

Na landing, depois do código base do pixel:

```html
<script src="https://focus-ai.pages.dev/tally-meta.js"></script>
```

Na página de obrigado, o mesmo arquivo com o atributo que a identifica:

```html
<script src="https://focus-ai.pages.dev/tally-meta.js" data-obrigado></script>
```

O atributo não é detalhe. Sem ele o script não teria como saber que aquela
página é a de conversão, e dispararia `Lead` em toda visita à landing de quem já
preencheu o formulário um dia.

Se o botão do formulário não for um `<a href>` e sim um script que navega, monte
o endereço com o ajudante que o arquivo expõe:

```js
location.href = window.focusTally.url('https://tally.so/r/xxxxxx');
```

## 3. Fluxo do n8n — já existe

`[FOCUS] Captação Tally → Supabase → Meta` (`3fjeFCCvKJjFudnB`), ativo, com
webhook de produção em:

```
https://n8nai.jurifocus.site/webhook/captacao-meta
```

É **fluxo novo e separado**, não uma alteração nos HELENA. Aqueles estão no ar
disparando ligação VAPI, e cada tese já tem o seu (`/tally-lead`,
`/tally-lead-consultoria`, `/tally-lead-jurosabusivos`). Este entra como um
**segundo webhook** no formulário, para que a captação alimente o catálogo sem
tocar no que já roda.

Quatro nós: **Webhook** → **Code** (extrai) → duas **HTTP Request** → **Respond**.
O nó de código só localiza campo por tipo e campo oculto por nome; tese, UF,
deduplicação e enfileiramento são todos do banco.

O segredo do Supabase mora na credencial `Supabase Focus AI (service role)`,
**restrita ao host do projeto** — usada contra qualquer outro domínio, o n8n
recusa. Nenhum nó carrega chave escrita à mão.

O desenho, para quem for refazer ou auditar — primeiro a identidade, depois o
lead, porque a captação precisa existir antes de o evento ser enfileirado:

```
POST {SUPABASE_URL}/rest/v1/rpc/registrar_identidade_captacao
  apikey: {SUPABASE_SECRET_KEY}
  Authorization: Bearer {SUPABASE_SECRET_KEY}

{
  "p_respondente_id": "={{ $json.body.data.respondentId }}",
  "p_formulario_id":  "={{ $json.body.data.formId }}",
  "p_fbp":            "={{ … campo oculto fbp }}",
  "p_fbc":            "={{ … campo oculto fbc }}",
  "p_fbclid":         "={{ … campo oculto fbclid }}",
  "p_pagina":         "={{ … campo oculto pagina }}",
  "p_evento_id":      "={{ … campo oculto evento_id }}"
}
```

```
POST {SUPABASE_URL}/rest/v1/rpc/registrar_captacao

{
  "p_respondente_id": "={{ $json.body.data.respondentId }}",
  "p_formulario_id":  "={{ $json.body.data.formId }}",
  "p_nome":     "…",
  "p_telefone": "…",
  "p_tese":     "polo_passivo | vinculo_empregaticio | juros_abusivos",
  "p_elegibilidade": { }
}
```

`p_uf` e `p_cidade` são opcionais e o fluxo não precisa mandá-los: nenhum
formulário no ar pergunta região. A UF sai do DDD do telefone (`uf_do_ddd`), que
é a única informação de região que existe na captação — e ela não é cosmética:
a política do catálogo casa `leads.uf` com a UF do advogado, e lead sem UF não
apareceria para comprador nenhum. A cidade fica vazia até a qualificação, porque
o DDD cobre região e não município, e cidade chutada é pior que cidade ausente.

O webhook chega como `{ eventId, eventType: 'FORM_RESPONSE', createdAt, data }`,
e as respostas vêm em `data.fields[]`, cada uma com `key`, `label` e `value` —
os campos ocultos vêm nessa mesma lista, com `label` igual ao nome que você deu.
O mapeamento de rótulo para parâmetro é a única coisa que o fluxo decide, e é
mapeamento, não regra.

Prefira casar por `key` a casar por `label`: o rótulo é o texto que a pessoa lê
na tela, e renomear a pergunta — coisa que se faz sem pensar — quebraria o
mapeamento em silêncio.

Três cuidados que não são opcionais:

- **Não passe `p_ip` nem `p_agente_usuario`.** Neste caminho quem chama o
  servidor é o Tally, e o cabeçalho traz o endereço **dele**. Enviado à Meta
  como IP de quem preencheu o formulário, aponta para um datacenter e estraga a
  correspondência. Campo ausente a Meta ignora; campo errado ela usa.
- **Confira o `Tally-Signature`** antes de gravar. Sem isso qualquer um posta
  lead no nosso banco.
- **Responda honestamente** (`API-R11`). Se o RPC voltar `ok: false`, o fluxo
  responde erro. Fluxo que engole falha e responde 200 faz o Tally nunca
  reenviar, e o lead se perde sem deixar rastro.

A função é idempotente (`API-R13`): reenvio devolve o mesmo `lead_id` com
`repetido: true`, sem criar segundo lead.

## 4. Envio

`npm run meta:eventos` esvazia a fila. Precisa rodar de tempos em tempos — a
cada 5 ou 10 minutos dá margem folgada dentro da janela de sete dias.

Quem agenda pode ser o n8n, com **Schedule** → três HTTP Request:
`abandonar_eventos_meta_vencidos` → `eventos_meta_pendentes` → para cada item,
`graph.facebook.com` e depois `marcar_evento_meta`. É o mesmo que o script faz,
com as mesmas funções.

## Os formulários no ar

Cada formulário é uma tese, e o mapeamento mora na tabela
`formularios_captacao` — não dentro do nó. O fluxo manda só o `formId`, e
`registrar_captacao` resolve a tese. Formulário sem mapeamento é recusado com
motivo, e o lead não entra no catálogo classificado como algo que não é.

| Id | Formulário | Tese |
| --- | --- | --- |
| `PdWNOe` | processo em fase decisiva / conta bloqueada | `polo_passivo` |
| `RGlNYd` | trabalhou sem carteira, hora extra | `vinculo_empregaticio` |
| `PdL5OB` | juros abusivos ao banco | `juros_abusivos` |
| `obYGpO` | auxílio por incapacidade | **sem tese no domínio** |
| `ZjXaWe` | salário-maternidade | **sem tese no domínio** |
| `ODbVVK` | FOCUS TESTE | — |

Os dois últimos são previdenciários e não existem no enum `tese` de
`0001_fundacao.sql`, que tem três valores. Enquanto não existirem, a captação
deles não tem como ser gravada: `registrar_captacao` recusa tese inválida. São
duas decisões distintas — ampliar as teses do produto, ou tirar esses
formulários do ar —, e nenhuma das duas é de código.

Nenhum formulário pergunta cidade ou estado, e nenhum pergunta e-mail, exceto o
`RGlNYd`. É o que a captação tem: nome e telefone.

## Conferir se está funcionando

1. No Gerenciador de Eventos, **Testar eventos**: pegue o código e ponha em
   `META_TEST_EVENT_CODE`.
2. Entre na landing com `?fbclid=teste123` na URL e clique no botão do
   formulário. A URL do Tally tem que chegar com `fbp`, `fbc`, `fbclid` e `evento_id`.
3. Preencha e envie. Na página de obrigado deve aparecer um `Lead` de
   **Browser**; rodando `npm run meta:eventos`, um de **Server**, marcados como
   deduplicados.
4. Mova o lead para `agendado` no banco e rode de novo: aparece um `Schedule`.
5. Tire o `META_TEST_EVENT_CODE` antes de valer para campanha.

## O que fica de fora, e por quê

- **E-mail do cliente final não é enviado**, porque não é guardado. `INV-17` — o
  que não se grava não vaza. Melhoraria a correspondência; é troca que precisa
  ser decidida, não assumida.
- **Telefone e nome saem hasheados** (`CMP-R05`), nunca em claro.
- **Lead sem captação não entra na fila** (`CMP-R02`). Lead semeado ou
  cadastrado à mão não veio de anúncio, e mandá-lo como conversão faria o custo
  por resultado do painel mentir.

## Se um dia o formulário for embedado

O script já cobre o caso: o iframe emite `Tally.FormSubmitted` e ele dispara o
`Lead` na hora, sem depender de redirecionamento. Aí a identidade não tem como
voltar pelo webhook — o formulário embedado não recebe a URL da nossa página —
e vai direto para um endpoint próprio, declarado na tag:

```html
<script src="…/tally-meta.js" data-endpoint="https://n8n.exemplo/webhook/captacao-identidade"></script>
```

Esse endpoint chama `registrar_identidade_captacao` com os mesmos parâmetros,
mais `p_ip` e `p_agente_usuario` vindos do cabeçalho — que aí, sim, são do
navegador do cliente.
