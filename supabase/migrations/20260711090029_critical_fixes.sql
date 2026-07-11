-- ============================================================
-- Fixes críticos detectados en auditoría.
-- 1) initiatives.data: el baseline la crea con "create table if not
--    exists", no-op si la tabla ya existía sin la columna → causa del
--    error "Could not find the 'data' column of 'initiatives'".
--    Idempotente: la agrega si falta.
-- 2) set_my_commitment_status: el parámetro era uuid pero
--    initiatives.id es TEXT → el miembro no podía marcar sus
--    compromisos (invalid input syntax for type uuid).
-- ============================================================

-- 1) Columna data en initiatives.
alter table public.initiatives add column if not exists data jsonb not null default '{}'::jsonb;

-- 2) RPC de compromisos con el tipo correcto (text, no uuid).
drop function if exists public.set_my_commitment_status(uuid, text, text);
create or replace function public.set_my_commitment_status(p_init_id text, p_text text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  d jsonb; fl jsonb; arr jsonb; newarr jsonb := '[]'::jsonb; item jsonb; i int; found boolean := false;
begin
  if not exists (
    select 1 from public.initiatives ini
    where ini.id = p_init_id and ini.team_id in (select public.visible_team_ids())
  ) then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('pending','doing','done','blocked') then raise exception 'Estado inválido'; end if;

  select data into d from public.initiatives where id = p_init_id;
  fl := coalesce(d -> 'follow', '{}'::jsonb);
  arr := coalesce(fl -> 'actionStatus', '[]'::jsonb);
  for i in 0 .. coalesce(jsonb_array_length(arr), 0) - 1 loop
    item := arr -> i;
    if item ->> 'text' = p_text then item := jsonb_set(item, '{status}', to_jsonb(p_status)); found := true; end if;
    newarr := newarr || jsonb_build_array(item);
  end loop;
  if not found then newarr := newarr || jsonb_build_array(jsonb_build_object('text', p_text, 'who', '', 'status', p_status)); end if;
  fl := jsonb_set(fl, '{actionStatus}', newarr);
  d := jsonb_set(coalesce(d, '{}'::jsonb), '{follow}', fl);
  update public.initiatives set data = d where id = p_init_id;
end; $$;
grant execute on function public.set_my_commitment_status(text, text, text) to authenticated;

notify pgrst, 'reload schema';
