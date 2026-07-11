-- ============================================================
-- 360 agregado a nivel organización (solo admin/superadmin).
-- Promedia las competencias del 360 a través de los equipos de la
-- org, respetando el anonimato: el promedio de pares de una
-- competencia se revela solo si hay ≥5 ratings de pares y ≥2
-- personas evaluadas. El promedio de auto-evaluación se agrega
-- sobre muchas personas (ya anónimo). Roles: self = subject,
-- leader = created_by; peer = cualquier otro.
-- ============================================================

create or replace function public.get_org_competency_aggregate()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if public.my_role() not in ('admin','superadmin') then
    raise exception 'No autorizado';
  end if;

  with scope as (
    select tr.id as review_id, tr.subject_user_id as subj, tr.created_by as lead, tr.competencies
    from public.talent_reviews tr
    where tr.status = 'closed' and tr.team_id in (select public.visible_team_ids())
  ),
  labels as (
    select c->>'key' as key, max(c->>'label') as label
    from scope s, jsonb_array_elements(s.competencies) c
    group by c->>'key'
  ),
  peer_vals as (
    select e.key as key, (e.value)::numeric as val, s.subj as subj
    from public.talent_ratings r
    join scope s on s.review_id = r.review_id
    cross join lateral jsonb_each_text(r.ratings) e
    where r.rater_user_id <> s.subj and (s.lead is null or r.rater_user_id <> s.lead)
  ),
  self_vals as (
    select e.key as key, (e.value)::numeric as val
    from public.talent_ratings r
    join scope s on s.review_id = r.review_id
    cross join lateral jsonb_each_text(r.ratings) e
    where r.rater_user_id = s.subj
  ),
  agg as (
    select l.key, l.label,
      (select round(avg(val), 2) from peer_vals p where p.key = l.key) as peer,
      (select count(*) from peer_vals p where p.key = l.key) as n_peer,
      (select count(distinct subj) from peer_vals p where p.key = l.key) as n_subj,
      (select round(avg(val), 2) from self_vals sv where sv.key = l.key) as self_avg
    from labels l
  )
  select jsonb_agg(jsonb_build_object(
      'key', key,
      'label', label,
      'peer', case when n_peer >= 5 and n_subj >= 2 then peer else null end,
      'self', self_avg,
      'nPeer', n_peer,
      'nSubjects', n_subj
    ) order by label)
  into result
  from agg;

  return coalesce(result, '[]'::jsonb);
end $$;

grant execute on function public.get_org_competency_aggregate() to authenticated;

notify pgrst, 'reload schema';
