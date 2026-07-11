-- ============================================================
-- Fix de seguridad: las vistas de sesión deben respetar el RLS del
-- usuario que consulta (security_invoker), como ya lo hace
-- session_cards_view. Sin esto corren con permisos del dueño y
-- saltean RLS → fuga potencial entre equipos (advisor CRITICAL).
-- ============================================================

alter view public.session_votes_view  set (security_invoker = true);
alter view public.session_inputs_view set (security_invoker = true);
alter view public.session_pulse_view  set (security_invoker = true);
