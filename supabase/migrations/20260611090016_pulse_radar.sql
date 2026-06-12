-- ════════════════════════════════════════════════════════════
-- 0016 · Pulso 2.0: 8 dimensiones (la gente puntúa 1-5)
-- Las 8 dimensiones se guardan como jsonb en `dims` (escala interna
-- 0-100). Las 5 columnas legacy quedan por compatibilidad con el
-- historial; el código nuevo escribe ambas.
-- ════════════════════════════════════════════════════════════

alter table public.session_pulse_responses add column if not exists dims jsonb;
alter table public.pulse_points add column if not exists dims jsonb;

-- La vista enmascarada del pulso ahora también expone dims
-- (sin user_id: el pulso es anónimo de verdad).
create or replace view public.session_pulse_view as
select session_id, confianza, comunic, claridad, foco, seguridad, dims
from public.session_pulse_responses
where session_id in (select public.visible_session_ids());

grant select on public.session_pulse_view to authenticated;
