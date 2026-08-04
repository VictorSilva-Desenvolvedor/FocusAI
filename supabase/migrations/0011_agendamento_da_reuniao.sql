-- ---------------------------------------------------------------------------
-- 0011 — a hora marcada, que é o que se vende
--
-- Fecha o terceiro elo. A `0010` fez a qualificação chegar ao banco, e o teto
-- ficou em `qualificado`: o catálogo só mostra `agendado`, porque o que o
-- advogado compra é a reunião, não o telefone (`LED-R02`). Sem esta migration,
-- todo o resto funciona e ninguém compra nada.
--
-- O horário nasce durante a ligação, quando a Helena chama a ferramenta de
-- agenda. Essa chamada já passa pelo mesmo webhook do relatório de fim de
-- chamada, como mensagem do tipo `tool-calls`.
-- ---------------------------------------------------------------------------

/*
 * `LED-R01` do lado do banco.
 *
 * A elegibilidade é da tese, não do lead: cada tese exige respostas próprias, e
 * publicar sem elas é anunciar caso que o advogado recusa na primeira leitura —
 * e cada recusa dessas custa a confiança no catálogo inteiro, não só naquele
 * lead.
 *
 * A regra já existe em `elegibilidadeDoLead()`, no cliente. Aqui ela é
 * reimplementada de propósito: quem publica é a automação, com chave de
 * serviço, e ela nunca passa pelo código da tela. `API-R06` — a regra é do
 * módulo, não da view, e a view não é o único caminho.
 */
create function public.filtros_pendentes(p_lead_id uuid)
returns text[]
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(f.rotulo order by f.rotulo), '{}')
    from public.leads l
    join lateral (
      values
        ('polo_passivo'::public.tese, 'parte_no_processo', 'é parte no processo'),
        ('polo_passivo', 'sem_advogado_atuante', 'está sem advogado atuante'),
        ('vinculo_empregaticio', 'minimo_tres_meses', 'ao menos 3 meses trabalhados'),
        ('vinculo_empregaticio', 'saida_ate_dois_anos', 'saiu do emprego há no máximo 2 anos'),
        ('juros_abusivos', 'tem_contrato', 'tem contrato de crédito ativo'),
        ('juros_abusivos', 'confirmou_agendamento', 'confirmou que é o advogado quem liga')
    ) as f(tese, chave, rotulo) on f.tese = l.tese
   where l.id = p_lead_id
     and coalesce((l.elegibilidade ->> f.chave)::boolean, false) is not true;
$$;

revoke execute on function public.filtros_pendentes(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- O agendamento
-- ---------------------------------------------------------------------------

/*
 * `API-R08` — carimbar o horário e publicar no catálogo é um passo só.
 *
 * `API-R14` — o evento é gatilho, não fonte da verdade: quem decide se o lead
 * pode ser publicado é esta função, olhando a elegibilidade que está no banco.
 * O corpo do webhook informa o horário; não decide o status.
 *
 * `CRE-R03` — o preço é congelado aqui, no instante da publicação. Mexer na
 * tabela da tese depois não reescreve o que já está anunciado nem o que já foi
 * vendido; sem isso, o advogado veria um valor na tela e outro no débito.
 */
create function public.registrar_agendamento(
  p_lead_id uuid,
  p_chamada_id text,
  p_reuniao_em timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lead public.leads;
  v_pendentes text[];
  v_custo int;
  v_preco numeric(10, 2);
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'Lead não encontrado.');
  end if;

  -- INV-10 — lead vendido não volta ao catálogo, nem por reagendamento. Dois
  -- advogados com o mesmo contato disputam o mesmo cliente.
  if v_lead.comprado_por is not null then
    return jsonb_build_object('ok', false, 'motivo', 'Lead já vendido não volta ao catálogo.');
  end if;

  if p_reuniao_em is null then
    return jsonb_build_object('ok', false, 'motivo', 'Sem horário não há agendamento.');
  end if;

  /*
   * Reunião no passado é quase sempre fuso trocado, e o efeito é cruel: o lead
   * entra no catálogo já vencido, o advogado paga e descobre que a hora passou.
   * Recusar aqui devolve o erro a quem pode corrigi-lo.
   */
  if p_reuniao_em <= now() then
    return jsonb_build_object('ok', false, 'motivo', 'A reunião foi marcada para um horário que já passou.');
  end if;

  v_pendentes := public.filtros_pendentes(p_lead_id);
  if array_length(v_pendentes, 1) > 0 then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Não publica no catálogo — falta confirmar: ' || array_to_string(v_pendentes, '; ') || '.',
      'pendentes', to_jsonb(v_pendentes)
    );
  end if;

  -- CRE-R03 — o preço de tabela da tese, congelado agora.
  select custo_creditos, preco_avulso into v_custo, v_preco
    from (values
      ('polo_passivo'::public.tese, 3, 300::numeric),
      ('vinculo_empregaticio', 2, 250),
      ('juros_abusivos', 4, 350)
    ) as t(tese, custo_creditos, preco_avulso)
   where t.tese = v_lead.tese;

  update public.leads
     set reuniao_em = p_reuniao_em,
         status = 'agendado',
         custo_creditos = coalesce(v_custo, custo_creditos),
         preco_avulso = coalesce(v_preco, preco_avulso),
         ultima_atividade = now()
   where id = p_lead_id;

  /*
   * O agendamento é parte do registro que responde perante a OAB, então fica
   * junto das ligações. `chamada_id` com sufixo porque a mesma chamada produz o
   * agendamento e, depois, o relatório de fim — dois eventos distintos da mesma
   * ligação, e `API-R13` deduplica por par (identificador, tipo).
   */
  insert into public.ligacoes (lead_id, chamada_id, tentativa, resultado, resumo)
  values (
    p_lead_id,
    p_chamada_id || '::agendamento',
    public.tentativas_do_lead(p_lead_id) + 1,
    'qualificado',
    'Reunião marcada para ' || to_char(p_reuniao_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
  )
  on conflict (chamada_id) do nothing;

  return jsonb_build_object(
    'ok', true, 'lead_id', p_lead_id,
    'reuniao_em', p_reuniao_em, 'custo_creditos', v_custo, 'preco_avulso', v_preco
  );
end;
$$;

revoke execute on function public.registrar_agendamento(uuid, text, timestamptz)
  from public, anon, authenticated;
