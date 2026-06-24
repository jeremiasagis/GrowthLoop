-- ============================================================
-- Capa individual: 360 de competencias + 1-a-1 (PLAN-DESARROLLO Parte A).
-- 3 tablas + RLS (anonimato de pares, 1-a-1 privado) + 1 RPC de agregado.
-- Roles del 360 se derivan por identidad: self = subject, leader =
-- created_by (facilitador), peer = cualquier otro del equipo.
-- ============================================================

create table if not exists public.talent_reviews (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  subject_user_id uuid not null,
  status text not null default 'open',         -- open | closed
  competencies jsonb not null default '[]',    -- snapshot [{key,label}]
  created_by uuid,                             -- facilitador (= "leader")
  created_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists public.talent_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.talent_reviews(id) on delete cascade,
  rater_user_id uuid not null,
  ratings jsonb not null default '{}',         -- {compKey: 1-5}
  comment text,
  created_at timestamptz default now(),
  unique (review_id, rater_user_id)
);

create table if not exists public.one_on_ones (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  leader_user_id uuid,
  member_user_id uuid not null,
  date date default current_date,
  review_id uuid references public.talent_reviews(id) on delete set null,
  agenda jsonb default '[]',                   -- [string]
  notes text,
  commitments jsonb default '[]',              -- [{text, status, due?}]
  created_at timestamptz default now()
);

create index if not exists idx_treviews_team on public.talent_reviews(team_id);
create index if not exists idx_tratings_review on public.talent_ratings(review_id);
create index if not exists idx_ooo_member on public.one_on_ones(member_user_id);
create index if not exists idx_ooo_leader on public.one_on_ones(leader_user_id);

-- ── RLS ──
alter table public.talent_reviews enable row level security;
drop policy if exists treviews_read on public.talent_reviews;
drop policy if exists treviews_write on public.talent_reviews;
create policy treviews_read on public.talent_reviews for select
  using (team_id in (select public.visible_team_ids()));
create policy treviews_write on public.talent_reviews for all
  using (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'))
  with check (team_id in (select public.visible_team_ids()) and public.my_role() in ('facilitator','admin','superadmin'));

-- Anonimato de pares: cada uno solo ve/escribe SU evaluación. El agregado va por RPC.
alter table public.talent_ratings enable row level security;
drop policy if exists tratings_self on public.talent_ratings;
create policy tratings_self on public.talent_ratings for all
  using (rater_user_id = auth.uid())
  with check (rater_user_id = auth.uid()
    and review_id in (select id from public.talent_reviews where team_id in (select public.visible_team_ids())));

-- 1-a-1 privado: solo líder + miembro.
alter table public.one_on_ones enable row level security;
drop policy if exists ooo_rw on public.one_on_ones;
create policy ooo_rw on public.one_on_ones for all
  using (leader_user_id = auth.uid() or member_user_id = auth.uid())
  with check (team_id in (select public.visible_team_ids()) and (leader_user_id = auth.uid() or member_user_id = auth.uid()));

-- ── RPC: agregado del 360 (anonimato de pares, mínimo 3) ──
create or replace function public.get_review_aggregate(p_review_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  subj uuid; lead uuid; comps jsonb;
  self_r jsonb; lead_r jsonb; peer_avg jsonb; peer_cnt int;
begin
  select subject_user_id, created_by, competencies into subj, lead, comps
    from public.talent_reviews where id = p_review_id;
  if subj is null then return null; end if;
  -- autorización: quien llama debe poder ver el equipo del review.
  if not exists (select 1 from public.talent_reviews tr where tr.id = p_review_id
                 and tr.team_id in (select public.visible_team_ids())) then
    raise exception 'No autorizado';
  end if;

  select ratings into self_r from public.talent_ratings where review_id = p_review_id and rater_user_id = subj;
  select ratings into lead_r from public.talent_ratings where review_id = p_review_id and rater_user_id = lead;

  select count(*) into peer_cnt from public.talent_ratings
    where review_id = p_review_id and rater_user_id <> subj and (lead is null or rater_user_id <> lead);

  if peer_cnt >= 3 then
    select jsonb_object_agg(key, avg_val) into peer_avg from (
      select e.key, round(avg((e.value)::numeric), 2) as avg_val
      from public.talent_ratings tr, jsonb_each_text(tr.ratings) e
      where tr.review_id = p_review_id and tr.rater_user_id <> subj and (lead is null or tr.rater_user_id <> lead)
      group by e.key
    ) s;
  else
    peer_avg := null; -- no se revela con menos de 3 pares (anonimato)
  end if;

  return jsonb_build_object(
    'self', coalesce(self_r, '{}'::jsonb),
    'leader', coalesce(lead_r, '{}'::jsonb),
    'peers', peer_avg,
    'peerCount', peer_cnt,
    'competencies', comps
  );
end $$;

grant execute on function public.get_review_aggregate(uuid) to authenticated;
