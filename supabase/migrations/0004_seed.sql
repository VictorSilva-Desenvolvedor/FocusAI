-- Dado semeado. Fictício por princípio, e continua fictício.
--
-- Nenhum nome, telefone, inscrição da OAB ou valor aqui corresponde a pessoa ou
-- escritório real. A distribuição é escolhida para que as telas exerçam as
-- regras em vez de só terem o que exibir:
--
--  · advogado com saldo zerado e lead disponível na tese dele — é o caso que
--    prova CRE-R04: o botão de comprar não é desenhado, em vez de ser desenhado
--    e falhar no clique;
--  · lead vendido, lead devolvido e lead desqualificado, para que INV-10 e
--    CRE-R05 tenham o que mostrar;
--  · lead com reunião a menos de 48h, para o aviso de vencimento aparecer.
--
-- Os movimentos são a única fonte do saldo (INV-15): não há coluna para
-- conferir contra, e é de propósito.

-- ---------------------------------------------------------------------------
-- Advogados
-- ---------------------------------------------------------------------------

insert into public.advogados
  (id, nome, oab, oab_conferida_em, email, whatsapp, uf, teses, cidades, porte,
   status, modelo_pagamento, potencial_mensal, criado_em, ultima_atividade, motivo_perda)
values
  ('a0000000-0000-4000-8000-000000000001', 'Prev Fácil Advogados', '033901/GO',
   now() - interval '185 days', 'contato@prevfacil.adv.br', '(62) 98114-2077', 'GO',
   '{polo_passivo,vinculo_empregaticio}', '{}', 'grande',
   'ativo', 'creditos', 60, now() - interval '190 days', now() - interval '1 day', null),

  ('a0000000-0000-4000-8000-000000000002', 'Gomes & Cia', '124773/SP',
   now() - interval '140 days', 'contato@gomesecia.adv.br', '(11) 98220-3341', 'SP',
   '{juros_abusivos}', '{}', 'medio',
   'ativo', 'creditos', 32, now() - interval '145 days', now() - interval '3 days', null),

  -- Saldo termina em zero, com lead disponível na tese e na região dele.
  ('a0000000-0000-4000-8000-000000000003', 'Teixeira Bancário', '186640/SP',
   now() - interval '116 days', 'contato@teixeirabancario.adv.br', '(11) 98455-9012', 'SP',
   '{juros_abusivos,polo_passivo}', '{}', 'pequeno',
   'ativo', 'creditos', 18, now() - interval '120 days', now() - interval '2 days', null),

  ('a0000000-0000-4000-8000-000000000004', 'Albuquerque Trabalhista', '090184/SP',
   now() - interval '55 days', 'contato@albuquerquetrab.adv.br', '(11) 98701-4488', 'SP',
   '{vinculo_empregaticio}', '{}', 'grande',
   'modelo_definido', 'creditos', 50, now() - interval '61 days', now() - interval '2 days', null),

  ('a0000000-0000-4000-8000-000000000005', 'Silva & Associados', '104238/GO',
   null, 'contato@silvaeassociados.adv.br', '(62) 98330-1256', 'GO',
   '{polo_passivo}', '{}', 'pequeno',
   'novo', null, 12, now() - interval '16 days', now() - interval '3 days', null),

  ('a0000000-0000-4000-8000-000000000006', 'Bastos Advocacia', '155208/MT',
   null, 'contato@bastosadvocacia.adv.br', '(65) 98077-6510', 'MT',
   '{polo_passivo}', '{}', 'solo',
   'perdido', null, 4, now() - interval '60 days', now() - interval '22 days',
   'Achou o preço por lead alto para o ticket médio da região.');

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------

insert into public.leads
  (id, nome, tese, uf, cidade, status, origem, resumo_qualificacao, elegibilidade,
   reuniao_em, custo_creditos, preco_avulso, comprado_por, comprado_em,
   tem_gravacao, criado_em, ultima_atividade, motivo_desqualificacao,
   devolucao_motivo, devolucao_em)
values
  -- --- catálogo: GO / polo passivo ----------------------------------------
  ('b0000000-0000-4000-8000-000000000001', 'Marcos Antunes Ribeiro', 'polo_passivo', 'GO', 'Goiânia',
   'agendado', 'meta_ads',
   'Réu em ação de cobrança movida por instituição financeira. Diz que foi citado há duas semanas e que o advogado anterior parou de responder. Quer entender em que fase está e o que ainda dá para fazer.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() + interval '4 days', 3, 300, null, null, true,
   now() - interval '5 days', now() - interval '2 days', null, null, null),

  -- Reunião a menos de 48h: é este que dispara o aviso de vencimento.
  ('b0000000-0000-4000-8000-000000000002', 'Selma Prado Vasconcelos', 'polo_passivo', 'GO', 'Aparecida de Goiânia',
   'agendado', 'meta_ads',
   'Autora em ação de indenização que corre há três anos sem movimentação. Não sabe informar a fase e não tem contato com quem entrou com o processo. Pediu panorama e próximos passos.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() + interval '31 hours', 3, 300, null, null, true,
   now() - interval '6 days', now() - interval '1 day', null, null, null),

  ('b0000000-0000-4000-8000-000000000003', 'Reinaldo Faria Coelho', 'polo_passivo', 'GO', 'Anápolis',
   'agendado', 'meta_ads',
   'Executado em ação de despejo cumulada com cobrança. Relata bloqueio de valores em conta e quer saber se ainda cabe defesa nessa altura do processo.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() + interval '6 days', 3, 300, null, null, false,
   now() - interval '3 days', now() - interval '1 day', null, null, null),

  -- --- catálogo: SP / juros abusivos ---------------------------------------
  ('b0000000-0000-4000-8000-000000000004', 'Therezinha Almeida Bueno', 'juros_abusivos', 'SP', 'São Paulo',
   'agendado', 'meta_ads',
   'Aposentada com quatro consignados ativos, comprometendo mais da metade do benefício. Tem os contratos em mãos e confirmou o horário. Conversa conduzida em ritmo lento, sem pedir dado bancário.',
   '{"tem_contrato": true, "confirmou_agendamento": true}',
   now() + interval '3 days', 4, 350, null, null, true,
   now() - interval '4 days', now() - interval '1 day', null, null, null),

  ('b0000000-0000-4000-8000-000000000005', 'Osvaldo Petrucci Nogueira', 'juros_abusivos', 'SP', 'Campinas',
   'agendado', 'meta_ads',
   'Financiamento de veículo com parcela que subiu sem explicação clara. Guardou o contrato e os comprovantes. Quer saber se cabe revisão e qual o custo de entrar com o pedido.',
   '{"tem_contrato": true, "confirmou_agendamento": true}',
   now() + interval '5 days', 4, 350, null, null, true,
   now() - interval '2 days', now() - interval '1 day', null, null, null),

  -- --- catálogo: GO / vínculo ----------------------------------------------
  ('b0000000-0000-4000-8000-000000000006', 'Juliana Cardoso Pinheiro', 'vinculo_empregaticio', 'GO', 'Goiânia',
   'agendado', 'meta_ads',
   'Trabalhou onze meses como PJ numa clínica, com horário fixo, subordinação e exclusividade. Saiu há sete meses. Guardou mensagens e escala de plantão que sustentam o pedido.',
   '{"minimo_tres_meses": true, "saida_ate_dois_anos": true}',
   now() + interval '2 days', 2, 250, null, null, true,
   now() - interval '3 days', now() - interval '1 day', null, null, null),

  -- --- vendidos ao Prev Fácil ----------------------------------------------
  ('b0000000-0000-4000-8000-000000000007', 'Adilson Moreira Tavares', 'polo_passivo', 'GO', 'Goiânia',
   'atendido', 'meta_ads',
   'Réu em execução fiscal municipal. Consulta realizada; advogado seguiu com o caso.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() - interval '9 days', 3, 300,
   'a0000000-0000-4000-8000-000000000001', now() - interval '12 days', true,
   now() - interval '16 days', now() - interval '8 days', null, null, null),

  ('b0000000-0000-4000-8000-000000000008', 'Rita de Cássia Loureiro', 'vinculo_empregaticio', 'GO', 'Goiânia',
   'vendido', 'meta_ads',
   'Dois anos sem carteira assinada em comércio varejista, com testemunhas dispostas a confirmar. Saída há cinco meses.',
   '{"minimo_tres_meses": true, "saida_ate_dois_anos": true}',
   now() + interval '1 day', 2, 250,
   'a0000000-0000-4000-8000-000000000001', now() - interval '2 days', true,
   now() - interval '7 days', now() - interval '2 days', null, null, null),

  -- --- vendido ao Gomes -----------------------------------------------------
  ('b0000000-0000-4000-8000-000000000009', 'Neuza Barreto Sampaio', 'juros_abusivos', 'SP', 'Santo André',
   'vendido', 'meta_ads',
   'Cartão de crédito rotativo com saldo devedor que dobrou em oito meses. Tem faturas dos últimos dois anos.',
   '{"tem_contrato": true, "confirmou_agendamento": true}',
   now() + interval '2 days', 4, 350,
   'a0000000-0000-4000-8000-000000000002', now() - interval '1 day', true,
   now() - interval '6 days', now() - interval '1 day', null, null, null),

  -- --- devolvido: CRE-R05 — o crédito volta, o lead não --------------------
  ('b0000000-0000-4000-8000-00000000000a', 'Hélio Bandeira Ramos', 'polo_passivo', 'GO', 'Rio Verde',
   'expirado', 'meta_ads',
   'Relatou processo em andamento, mas na conferência o número informado não corresponde a nenhum protocolo localizado.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() - interval '4 days', 3, 300,
   'a0000000-0000-4000-8000-000000000001', now() - interval '8 days', true,
   now() - interval '11 days', now() - interval '5 days', null,
   'Cliente não reconhece o agendamento', now() - interval '5 days'),

  -- --- vendidos ao Teixeira (zeram o saldo dele) ---------------------------
  ('b0000000-0000-4000-8000-00000000000b', 'Waldemar Fontes Siqueira', 'juros_abusivos', 'SP', 'São Paulo',
   'atendido', 'meta_ads',
   'Cheque especial usado de forma contínua por dois anos. Consulta realizada.',
   '{"tem_contrato": true, "confirmou_agendamento": true}',
   now() - interval '20 days', 4, 350,
   'a0000000-0000-4000-8000-000000000003', now() - interval '24 days', true,
   now() - interval '28 days', now() - interval '19 days', null, null, null),

  ('b0000000-0000-4000-8000-00000000000c', 'Ivone Rezende Machado', 'polo_passivo', 'SP', 'Guarulhos',
   'atendido', 'meta_ads',
   'Ré em ação de cobrança condominial. Consulta realizada.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() - interval '15 days', 3, 300,
   'a0000000-0000-4000-8000-000000000003', now() - interval '18 days', true,
   now() - interval '22 days', now() - interval '14 days', null, null, null),

  ('b0000000-0000-4000-8000-00000000000d', 'Sebastião Quirino Alves', 'polo_passivo', 'SP', 'Osasco',
   'vendido', 'meta_ads',
   'Réu em ação de busca e apreensão. Quer entender se ainda cabe purgação da mora.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   now() + interval '3 days', 3, 300,
   'a0000000-0000-4000-8000-000000000003', now() - interval '2 days', true,
   now() - interval '9 days', now() - interval '2 days', null, null, null),

  -- --- etapas anteriores ao catálogo ---------------------------------------
  ('b0000000-0000-4000-8000-00000000000e', 'Denise Aparecida Fogaça', 'vinculo_empregaticio', 'SP', 'Sorocaba',
   'novo', 'meta_ads', 'Preencheu o formulário. Ainda não passou pela ligação.',
   '{}', null, 2, 250, null, null, false,
   now() - interval '5 hours', now() - interval '5 hours', null, null, null),

  ('b0000000-0000-4000-8000-00000000000f', 'Cleber Nascimento Duarte', 'juros_abusivos', 'SP', 'São Bernardo do Campo',
   'em_qualificacao', 'meta_ads', 'Primeira ligação em andamento; pediu para retornar depois das 18h.',
   '{"tem_contrato": true}', null, 4, 350, null, null, false,
   now() - interval '1 day', now() - interval '4 hours', null, null, null),

  -- Qualificado sem reunião: não entra no catálogo, porque o que o advogado
  -- compra é a hora marcada, não o telefone.
  ('b0000000-0000-4000-8000-000000000010', 'Marlene Souto Vilela', 'polo_passivo', 'GO', 'Goiânia',
   'qualificado', 'meta_ads',
   'Autora em ação de alimentos parada há dois anos. Confirmou que não tem advogado acompanhando; falta fechar o horário da consulta.',
   '{"parte_no_processo": true, "sem_advogado_atuante": true}',
   null, 3, 300, null, null, true,
   now() - interval '2 days', now() - interval '6 hours', null, null, null),

  ('b0000000-0000-4000-8000-000000000011', 'Fabrício Leandro Muniz', 'vinculo_empregaticio', 'GO', 'Goiânia',
   'desqualificado', 'meta_ads',
   'Vínculo encerrado há mais de quatro anos — fora do prazo de dois anos que a tese exige.',
   '{"minimo_tres_meses": true, "saida_ate_dois_anos": false}',
   null, 2, 250, null, null, true,
   now() - interval '8 days', now() - interval '7 days',
   'Saída do emprego fora do prazo prescricional de dois anos.', null, null);

-- ---------------------------------------------------------------------------
-- Contato — atrás da política de `leads_contato` (INV-11)
-- ---------------------------------------------------------------------------

insert into public.leads_contato (lead_id, telefone) values
  ('b0000000-0000-4000-8000-000000000001', '(62) 99612-4408'),
  ('b0000000-0000-4000-8000-000000000002', '(62) 99187-3350'),
  ('b0000000-0000-4000-8000-000000000003', '(62) 99244-7719'),
  ('b0000000-0000-4000-8000-000000000004', '(11) 99530-6182'),
  ('b0000000-0000-4000-8000-000000000005', '(19) 99771-2043'),
  ('b0000000-0000-4000-8000-000000000006', '(62) 99805-5527'),
  ('b0000000-0000-4000-8000-000000000007', '(62) 99318-9964'),
  ('b0000000-0000-4000-8000-000000000008', '(62) 99456-1108'),
  ('b0000000-0000-4000-8000-000000000009', '(11) 99204-8873'),
  ('b0000000-0000-4000-8000-00000000000a', '(64) 99633-2290'),
  ('b0000000-0000-4000-8000-00000000000b', '(11) 99880-4416'),
  ('b0000000-0000-4000-8000-00000000000c', '(11) 99145-7702'),
  ('b0000000-0000-4000-8000-00000000000d', '(11) 99372-6659'),
  ('b0000000-0000-4000-8000-00000000000e', '(15) 99028-3374'),
  ('b0000000-0000-4000-8000-00000000000f', '(11) 99719-0085'),
  ('b0000000-0000-4000-8000-000000000010', '(62) 99560-8831'),
  ('b0000000-0000-4000-8000-000000000011', '(62) 99093-4467');

-- ---------------------------------------------------------------------------
-- Extrato — a única fonte do saldo
-- ---------------------------------------------------------------------------

insert into public.movimentos_creditos
  (advogado_id, tipo, creditos, valor, lead_id, descricao, em, origem_confirmacao)
values
  -- Prev Fácil: 50 + 100 − 3 − 2 − 3 + 3 = 145
  ('a0000000-0000-4000-8000-000000000001', 'compra', 50, 4000, null,
   'Pacote Escritório', now() - interval '180 days', 'confirmacao_bancaria'),
  ('a0000000-0000-4000-8000-000000000001', 'compra', 100, 7000, null,
   'Pacote Volume', now() - interval '40 days', 'confirmacao_bancaria'),
  ('a0000000-0000-4000-8000-000000000001', 'consumo', -3, 0,
   'b0000000-0000-4000-8000-000000000007', 'polo_passivo · Goiânia', now() - interval '12 days', null),
  ('a0000000-0000-4000-8000-000000000001', 'consumo', -2, 0,
   'b0000000-0000-4000-8000-000000000008', 'vinculo_empregaticio · Goiânia', now() - interval '2 days', null),
  ('a0000000-0000-4000-8000-000000000001', 'consumo', -3, 0,
   'b0000000-0000-4000-8000-00000000000a', 'polo_passivo · Rio Verde', now() - interval '8 days', null),
  ('a0000000-0000-4000-8000-000000000001', 'devolucao', 3, 0,
   'b0000000-0000-4000-8000-00000000000a', 'Cliente não reconhece o agendamento', now() - interval '5 days', null),

  -- Gomes: 25 − 4 = 21
  ('a0000000-0000-4000-8000-000000000002', 'compra', 25, 2250, null,
   'Pacote Recorrente', now() - interval '30 days', 'confirmacao_bancaria'),
  ('a0000000-0000-4000-8000-000000000002', 'consumo', -4, 0,
   'b0000000-0000-4000-8000-000000000009', 'juros_abusivos · Santo André', now() - interval '1 day', null),

  -- Teixeira: 10 − 4 − 3 − 3 = 0. Saldo zerado com lead disponível na tese
  -- dele é o que faz CRE-R04 aparecer na tela.
  ('a0000000-0000-4000-8000-000000000003', 'compra', 10, 1000, null,
   'Pacote Inicial', now() - interval '90 days', 'confirmacao_bancaria'),
  ('a0000000-0000-4000-8000-000000000003', 'consumo', -4, 0,
   'b0000000-0000-4000-8000-00000000000b', 'juros_abusivos · São Paulo', now() - interval '24 days', null),
  ('a0000000-0000-4000-8000-000000000003', 'consumo', -3, 0,
   'b0000000-0000-4000-8000-00000000000c', 'polo_passivo · Guarulhos', now() - interval '18 days', null),
  ('a0000000-0000-4000-8000-000000000003', 'consumo', -3, 0,
   'b0000000-0000-4000-8000-00000000000d', 'polo_passivo · Osasco', now() - interval '2 days', null),

  -- Albuquerque: comprou o pacote e ainda não consumiu.
  ('a0000000-0000-4000-8000-000000000004', 'compra', 25, 2250, null,
   'Pacote Recorrente', now() - interval '10 days', 'confirmacao_bancaria');
