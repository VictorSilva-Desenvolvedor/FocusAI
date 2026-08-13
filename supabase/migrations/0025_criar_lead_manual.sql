-- Cadastro manual de lead — a mesma escrita que `registrar_captacao` faz
-- (0008_formularios_de_captacao.sql), disparada por quem opera o catálogo em
-- vez de pelo webhook do formulário.
--
-- Não reusa `registrar_captacao`: aquela existe para o caminho idempotente do
-- webhook — dedupe por respondente_id, trava de concorrência, UF derivada do
-- DDD — e nada disso se aplica a alguém digitando um lead na tela. O que os
-- dois compartilham, a checagem de contato duplicado (`INV-10`), já mora no
-- trigger de `leads_contato` e não precisa ser repetida aqui.

create function public.criar_lead_manual(
  p_nome text,
  p_telefone text,
  p_tese public.tese,
  p_uf text,
  p_cidade text,
  p_resumo text default '',
  p_origem public.origem_lead default 'organico'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_lead_id uuid;
  v_telefone text := trim(coalesce(p_telefone, ''));
begin
  if public.papel_atual() not in ('adm', 'gerente', 'operador_ia', 'cs') then
    return jsonb_build_object('ok', false, 'motivo', 'Sem permissão para cadastrar lead manualmente.');
  end if;

  if coalesce(trim(p_nome), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o nome do cliente.');
  end if;
  if v_telefone = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe o telefone — é ele que o advogado compra.');
  end if;
  if coalesce(trim(p_uf), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe a UF.');
  end if;
  if coalesce(trim(p_cidade), '') = '' then
    return jsonb_build_object('ok', false, 'motivo', 'Informe a cidade.');
  end if;

  insert into public.leads (nome, tese, uf, cidade, status, origem, resumo_qualificacao)
  values (trim(p_nome), p_tese, upper(trim(p_uf)), trim(p_cidade), 'novo', p_origem, coalesce(p_resumo, ''))
  returning id into v_lead_id;

  -- INV-10 — `contato_sem_duplicata_ativa` recusa com exceção se já existir
  -- lead ativo com o mesmo telefone; a função inteira desfaz junto (mesma
  -- transação), então não sobra lead órfão sem contato.
  insert into public.leads_contato (lead_id, telefone) values (v_lead_id, v_telefone);

  return jsonb_build_object('ok', true, 'lead_id', v_lead_id);
end;
$$;

revoke all on function public.criar_lead_manual(text, text, public.tese, text, text, text, public.origem_lead)
  from public, anon, authenticated;
grant execute on function public.criar_lead_manual(text, text, public.tese, text, text, text, public.origem_lead)
  to authenticated;
