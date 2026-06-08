-- ============================================================
-- Merge atómico del resultado vivo de la sesión.
-- Antes setResult hacía read-modify-write desde el cliente: dos cambios
-- casi simultáneos (revelar voto + lanzar timer, etc.) se pisaban.
-- Ahora se mergea en el servidor con `result || patch` (un solo statement),
-- así cada clave sobrevive. SECURITY INVOKER → respeta el RLS de sessions
-- (solo facilitador/admin/superadmin del equipo pueden escribir).
-- ============================================================

create or replace function public.merge_session_result(p_session_id uuid, p_patch jsonb)
returns void
language sql
security invoker
set search_path = public as $$
  update public.sessions
     set result = coalesce(result, '{}'::jsonb) || p_patch
   where id = p_session_id;
$$;

grant execute on function public.merge_session_result(uuid, jsonb) to authenticated;
