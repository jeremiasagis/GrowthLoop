-- ============================================================
-- FIX CRÍTICO: revertir security_invoker en las 3 vistas enmascaradas.
-- La migración 20260711090025 les puso security_invoker=true para
-- callar un advisor "Security Definer View". Pero estas vistas están
-- DISEÑADAS para correr con permisos del owner (bypass RLS) y hacer el
-- agregado del EQUIPO con el enmascarado por dentro (mask de user_id +
-- filtro visible_session_ids). Con security_invoker=true corren como el
-- que consulta y la RLS base ("solo tus filas") las recorta → los votos,
-- inputs y pulso agregados devolvían SOLO las filas propias.
-- Volvemos a owner-rights. El anonimato SIGUE garantizado porque el
-- enmascarado vive dentro de la vista, no en la RLS de la tabla base.
-- (El advisor "Security Definer View" es un trade-off aceptado y
-- controlado para estas 3 vistas.)
-- ============================================================

alter view public.session_votes_view  set (security_invoker = false);
alter view public.session_inputs_view set (security_invoker = false);
alter view public.session_pulse_view  set (security_invoker = false);

notify pgrst, 'reload schema';
