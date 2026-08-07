# Focus AI — Especificação de Produto

Plataforma de aquisição de clientes qualificados por IA para advogados.

Este documento descreve o conceito do produto: o modelo de negócio, as teses
jurídicas trabalhadas e a especificação funcional do aplicativo. Serve para
orientar o desenvolvimento — não é registro de implementação. O que já existe
em código está no [README](README.md); as convenções, no [CLAUDE.md](CLAUDE.md).

## 1. Visão geral

A Focus AI conecta advogados a clientes qualificados através de um sistema de IA
que faz toda a captação, qualificação e agendamento — sem que o advogado precise
fazer marketing.

**A virada de modelo, em uma frase.** Em vez de vender *serviço de marketing
jurídico* (tráfego + gestão + acompanhamento, como uma agência tradicional), a
Focus AI vende o produto final pronto: **a reunião agendada com o cliente
qualificado**. O advogado não paga por esforço de campanha — paga pelo resultado
direto: acesso a um lead qualificado, com reunião já pré-agendada ou pronta para
ser confirmada.

## 2. O funil, visão macro

```
[1] Focus AI roda tráfego pago (Meta Ads)
        ↓
[2] Cliente final vê o anúncio e preenche o formulário
        ↓
[3] SDR de IA (Helena) liga, qualifica e agenda a consulta
        ↓
[4] O lead qualificado + reunião agendada vira um "produto"
        ↓
[5] Advogados acessam esse produto pelo APLICATIVO Focus AI
        ↓
[6] Advogado paga (lead avulso ou crédito) para acessar
        ↓
[7] Advogado recebe as informações da reunião + telefone do cliente
        ↓
[8] Advogado entra em contato, confirma e conduz a consulta
```

A Focus AI controla as pontas **1 a 4** — a máquina de aquisição e qualificação.
O aplicativo cobre as pontas **5 a 8**: é a camada de distribuição e monetização
desses leads para os advogados.

## 3. As três teses trabalhadas

A qualificação é feita por SDR de voz especializado por tese. Cada uma tem fluxo
próprio de captação, qualificação e agendamento.

### 3.1 Consultoria em polo passivo (processo judicial)

**Público.** Pessoas que estão sendo processadas (réu) ou que processaram alguém
(autor), sem advogado atuante ou com advogado que não responde nem atualiza.

**A oferta.** Consulta paga, com valor simbólico (R$ 100 a R$ 200), em que o
advogado entrega um panorama completo do processo — como ele está, o que esperar
e um planejamento de próximos passos.

**Por que a taxa simbólica funciona:**

- Filtra quem tem intenção real de resolver, reduzindo o volume de curiosos.
- Já gera receita direta na primeira interação, antes de qualquer contrato maior.
- Pode virar porta de entrada para um caso maior, se o advogado identificar
  oportunidade durante a consulta.

**Como a IA qualifica.** Pergunta aberta ("me conta o que está acontecendo") que
deixa o cliente narrar a situação; a IA identifica se é réu ou autor e se há
advogado atuando, sem virar interrogatório. Qualifica o mínimo necessário e
agenda rápido.

### 3.2 Reconhecimento de vínculo empregatício

**Público.** Trabalhadores que atuaram sem carteira assinada, ou como PJ/MEI
disfarçando vínculo empregatício.

**A oferta.** Consulta gratuita em que o advogado analisa se o caso se enquadra
nos requisitos legais e orienta os próximos passos.

| Filtro de elegibilidade | Critério |
| --- | --- |
| Tempo mínimo de vínculo | 3 meses trabalhados |
| Recência | Situação dos últimos 2 anos (dentro do prazo prescricional) |

**Urgência real usada na qualificação.** O prazo de até 2 anos após a saída do
emprego para buscar o direito na Justiça. É urgência genuína, não fabricada — a
distinção importa, porque urgência inventada é justamente o que expõe a peça a
questionamento ético.

### 3.3 Juros abusivos (revisão de contrato bancário)

**Público.** Principalmente pessoas 55+, com empréstimo consignado, cartão de
crédito, cheque especial ou financiamento com juros que parecem desproporcionais.

**A oferta.** Consulta gratuita em que o advogado revisa o contrato e orienta
sobre a possibilidade de revisão judicial.

**Cuidados específicos desse público.** Ritmo de conversa mais devagar, linguagem
sem jargão, **nunca solicitar dado bancário sensível** (senha, cartão), e sempre
deixar claro que é o advogado quem liga na hora marcada. O detalhamento extra do
processo é deliberado: é o público mais vulnerável a golpe e mais leigo em geral,
e uma ligação ambígua aqui custa a confiança do cliente e a reputação de quem
atende.

## 4. O aplicativo — a peça central

### 4.1 Conceito

Aplicativo web e/ou mobile onde advogados têm login e senha e acessam um painel
de leads liberados: pessoas já qualificadas pela IA, com reunião pronta para ser
confirmada.

### 4.2 Como o advogado ganha acesso

**O acesso ao aplicativo não é livre.** Para ganhar login e senha, o advogado
precisa primeiro passar pelo funil de tráfego pago da própria Focus AI — ou seja,
a Focus capta advogados como leads também (anúncio, formulário), qualifica esse
advogado, e só então libera o acesso.

Por que isso importa:

- Evita que qualquer pessoa crie conta e acesse dados de clientes sem controle.
- Cria uma segunda camada de receita e qualificação — a Focus vende o próprio
  acesso ao aplicativo como produto, não só os leads dentro dele.
- Permite filtrar que tipo de advogado entra na base (área de atuação, região,
  porte do escritório), mantendo a qualidade do relacionamento.

Consequência para a implementação: **não existe cadastro livre.** A conta nasce
de uma liberação, não de um formulário público.

### 4.3 Estrutura do painel do advogado

O advogado logado vê:

- Lista de leads disponíveis, filtrados por tese (polo passivo, reconhecimento de
  vínculo, juros abusivos) e por região.
- Status de cada lead: qualificado, reunião já agendada, ou disponível para
  agendar.
- Histórico de leads que ele já comprou ou acessou.
- Saldo de créditos, ou histórico de compras avulsas, conforme o modelo.

### 4.4 Os dois modelos de pagamento

| Modelo | Como funciona | O que ganha |
| --- | --- | --- |
| **A — Por lead (avulso)** | Valor fixo por cada lead que o advogado quer acessar. Sem compromisso de volume, sem assinatura | Entrada sem fricção |
| **B — Créditos** | Pacote de créditos comprado antecipadamente. Cada lead consome uma quantidade de créditos, que pode variar por tese | Previsibilidade de receita para a Focus, bônus de crédito por volume para o advogado |

**O que exatamente o advogado compra ao acessar um lead:**

- As informações da reunião — data, horário, tese e resumo da qualificação feita
  pela IA.
- O telefone do cliente, para entrar em contato diretamente e confirmar.

### 4.5 Fluxo completo do advogado

1. Vê o anúncio da Focus AI e preenche o formulário de interesse.
2. Passa por qualificação, que pode ser via IA, similar ao fluxo do cliente final.
3. Recebe login e senha por e-mail ou WhatsApp.
4. Acessa o painel e escolhe o modelo de pagamento (avulso ou crédito).
5. Compra créditos ou paga pelo lead específico.
6. Recebe as informações da reunião e o telefone do cliente.
7. Entra em contato, confirma a reunião e conduz a consulta.
8. *(Futuro)* Avalia a qualidade do lead no próprio painel, gerando dado para a
   Focus melhorar a qualificação.

## 5. Considerações técnicas

| Frente | O que precisa existir |
| --- | --- |
| Autenticação | Login e senha com controle de acesso. O advogado só é criado no sistema depois de passar pelo funil de qualificação |
| Pagamento | Suporte aos dois modelos: cobrança avulsa e créditos pré-pagos com consumo por lead |
| Painel de leads | Interface onde os leads qualificados aparecem organizados por tese, região e status |
| Integração com o SDR de voz | Os leads do painel vêm do mesmo sistema de qualificação por voz já em uso (Vapi ou similar); exige integração entre a ferramenta de ligação e o banco que alimenta o painel |
| Gestão de créditos | Lógica de quanto cada lead custa em créditos, possivelmente variável por tese, conforme o ticket médio da área |
| Notificações | Avisar o advogado quando surgir lead novo na região ou tese que ele acompanha |

## 6. Identidade de marca

- **Nome:** Focus AI
- **Cores:** roxo e preto como paleta principal — a mesma decisão de marca
  registrada nas convenções de estilo do repositório.
- **Posicionamento:** não é agência de marketing jurídico. É plataforma de
  aquisição de clientes qualificados por IA, em que o advogado paga pelo
  resultado (lead + reunião), não pelo processo.

## 7. Pendência — validação jurídica antes do lançamento

Antes de lançar o modelo, é necessário que um advogado — idealmente especialista
em direito da advocacia e ética profissional — revise a arquitetura à luz do
**Provimento 205 da OAB**, que regula publicidade e captação de clientela.

Um marketplace que vende acesso a dados de potenciais clientes para múltiplos
advogados pode levantar questões sobre:

- Captação de clientela por intermediário.
- Direito do cliente final de escolher seu advogado com informação clara sobre
  como foi direcionado.
- Concorrência entre advogados pelo mesmo lead, se o mesmo contato for vendido
  mais de uma vez.

Essa validação **não impede a construção do produto, mas precisa acontecer antes
do lançamento comercial, não depois.** É o mesmo princípio que já governa o
restante do sistema: a conformidade é um portão de verdade no fluxo, não uma
revisão posterior.
