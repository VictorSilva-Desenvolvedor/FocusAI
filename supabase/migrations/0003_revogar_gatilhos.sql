-- API-R04 — função de gatilho também revoga execução de PUBLIC, anon e
-- authenticated.
--
-- As três nasceram em 0001 e 0002 sem o revoke, e a plataforma concede execução
-- por privilégio padrão. O risco direto é baixo (chamada fora do contexto do
-- gatilho falha em `new`/`old`), mas a regra não abre exceção por severidade: a
-- superfície que ninguém revisa é justamente a que acumula o próximo furo.

revoke execute on function public.travar_carimbo_de_compra() from public, anon, authenticated;
revoke execute on function public.extrato_e_imutavel() from public, anon, authenticated;
revoke execute on function public.recusar_contato_duplicado() from public, anon, authenticated;
