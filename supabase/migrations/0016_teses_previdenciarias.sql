-- ---------------------------------------------------------------------------
-- 0016 — abre espaço no enum `tese` para as duas frentes previdenciárias
--
-- Os formulários de auxílio-doença e salário-maternidade já estavam no ar,
-- com fluxo de voz próprio, captando fora do enum — `registrar_captacao`
-- recusava com motivo, então nada entrava classificado errado, mas também
-- nada virava lead. Isto resolve só o lado do banco: os dois valores novos e
-- o mapeamento de formulário. `TESE_LABEL`/`TESES` (`src/lib/teses.ts`,
-- `types.ts`) e a wiring dos dois fluxos no n8n (`Registrar captação`,
-- `Registrar chamada iniciada`, no mesmo padrão das três teses já ligadas)
-- ainda dependem do público, oferta e filtros de elegibilidade reais das duas
-- frentes — conteúdo que não nasce de suposição sobre regra do INSS.
--
-- `alter type ... add value` não roda dentro da mesma transação em que o
-- valor novo é usado — por isso os dois `add value` e o `insert` seguinte são
-- três execuções separadas, não um único `begin/commit`.
-- ---------------------------------------------------------------------------

alter type public.tese add value 'auxilio_doenca';
alter type public.tese add value 'salario_maternidade';

insert into public.formularios_captacao (form_id, tese, descricao) values
  ('obYGpO', 'auxilio_doenca', 'Auxílio por incapacidade / auxílio-doença'),
  ('ZjXaWe', 'salario_maternidade', 'Salário-maternidade')
on conflict (form_id) do nothing;
