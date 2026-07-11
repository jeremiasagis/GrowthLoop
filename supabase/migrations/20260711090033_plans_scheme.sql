-- ============================================================
-- Esquema de planes (Free / Pro / Business / Enterprise).
-- 1) Arregla el schema drift: plan/kind/owner_id se habían agregado a
--    mano en la base viva y no estaban en ninguna migración. Acá quedan
--    versionados e idempotentes.
-- 2) Migra el valor viejo 'starter' -> 'free' (el nuevo plan base).
-- Los planes los asigna el superadmin a mano (sin registro ni pasarela
-- de pago todavía); esta migración solo prepara la columna.
-- ============================================================

alter table public.organizations add column if not exists plan text;
alter table public.organizations add column if not exists kind text;
alter table public.organizations add column if not exists owner_id text;

alter table public.organizations alter column plan set default 'free';
alter table public.organizations alter column kind set default 'company';

update public.organizations set plan = 'free'    where plan is null or plan = 'starter';
update public.organizations set kind = 'company' where kind is null;

notify pgrst, 'reload schema';
