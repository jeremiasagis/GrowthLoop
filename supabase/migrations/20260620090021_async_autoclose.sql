-- ============================================================
-- Autocierre de aportes async vencidos (PLAN-TECNICO · WS-infra).
-- Cierra SOLO los aportes async STANDALONE (sin loop) cuya fecha
-- venció. Los async de un LOOP no se autocierran: el facilitador los
-- cierra para no perder el guardado en la iniciativa (finalize); a
-- esos se los nudgea en la UI cuando vencen.
-- ============================================================

create or replace function public.close_overdue_async_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  with upd as (
    update public.sessions
    set status = 'closed', closed_at = now()
    where status = 'live'
      and mode = 'async'
      and initiative_id is null
      and (result ->> 'asyncUntil') is not null
      and (result ->> 'asyncUntil')::timestamptz < now()
    returning 1
  )
  select count(*) into n from upd;
  return n;
end;
$$;

-- ── Programar el autocierre cada hora ──
-- Requiere la extensión pg_cron (Supabase → Database → Extensions → pg_cron).
-- Descomentá estas dos líneas DESPUÉS de habilitar pg_cron:
--
-- create extension if not exists pg_cron;
-- select cron.schedule('close-overdue-async', '0 * * * *',
--   $cron$ select public.close_overdue_async_sessions(); $cron$);
