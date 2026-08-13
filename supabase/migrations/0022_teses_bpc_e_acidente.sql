-- ---------------------------------------------------------------------------
-- 0022 — abre espaço no enum `tese` para BPC LOAS e auxílio-acidente
--
-- Mesmo caso da 0016: os dois fluxos de voz já estavam no ar (captação por
-- Quiz do Lovable, achado ao investigar a conexão do Lovable com o n8n) e
-- captando fora do enum — a captação nem existia no banco, o lead se perdia
-- sem rastro nenhum. Isto resolve só o lado do banco: os dois valores novos.
-- `TESE_LABEL`/`TESES` (`src/lib/teses.ts`, `types.ts`), o preço e os filtros
-- de elegibilidade em `filtros_pendentes()`/`registrar_agendamento`
-- (`0011_agendamento_da_reuniao.sql`) continuam de fora de propósito —
-- conteúdo que não nasce de suposição sobre requisito do INSS ou de laudo de
-- acidente de trabalho.
--
-- Sem `formularios_captacao` aqui: diferente das duas previdenciárias da
-- 0016, estas não têm formulário no Tally — a captação chega só pelo Quiz do
-- Lovable, que já manda a tese resolvida (`p_tese`), sem `formulario_id` para
-- mapear.
--
-- `alter type ... add value` não roda dentro da mesma transação em que o
-- valor novo é usado — por isso são duas execuções separadas.
-- ---------------------------------------------------------------------------

alter type public.tese add value 'bpc_loas';
alter type public.tese add value 'auxilio_acidente';
