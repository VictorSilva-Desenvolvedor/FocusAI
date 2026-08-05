-- ---------------------------------------------------------------------------
-- 0017 — limpa reserva de lead que expirou e ninguém liberou
--
-- `LED-R04` já trava a reserva contra o relógio: `reservar_lead` recusa uma
-- reserva nova só enquanto `reservado_ate > now()`, então a trava nunca bloqueia
-- ninguém depois de vencer — o problema não é de correção, é de higiene. Sem
-- limpeza, `reservado_por`/`reservado_ate` ficam com valor velho na linha até
-- alguém reservar de novo por cima, e a tela só esconde a trava vencida porque
-- recalcula contra o relógio a cada render — não porque a linha foi limpa.
--
-- `pg_cron` roda como o dono do agendamento (`postgres`), que já ignora
-- `revoke`/`grant` de tabela — por isso a função não precisa ser chamável por
-- `authenticated`, só existir.
-- ---------------------------------------------------------------------------

create function public.limpar_reservas_expiradas()
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  update public.leads
     set reservado_por = null, reservado_ate = null
   where reservado_ate is not null
     and reservado_ate < now();
$$;

revoke all on function public.limpar_reservas_expiradas() from public, anon, authenticated;

select cron.schedule(
  'limpar-reservas-expiradas',
  '*/5 * * * *',
  $$select public.limpar_reservas_expiradas();$$
);
