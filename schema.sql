-- ============================================================
-- BLACKSTONE SECURITY — database schema + row-level security
-- Single-tenant. Paste this whole file into:
--   Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- ---------- roles ----------
do $$ begin
  create type public.user_role as enum ('admin','officer','client');
exception when duplicate_object then null; end $$;

-- ---------- profiles (extends auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'client',
  created_at  timestamptz not null default now()
);

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper: is the current user an admin? (security definer => no RLS recursion)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- block anyone but an admin from changing roles (stops self-promotion)
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role) and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles
  for each row execute function public.guard_role_change();

-- ---------- sites ----------
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------- officer <-> site assignments ----------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  officer_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (site_id, officer_id)
);

-- ---------- client <-> site links (who can see which site) ----------
create table if not exists public.client_sites (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles(id) on delete cascade,
  site_id     uuid not null references public.sites(id) on delete cascade,
  unique (client_id, site_id)
);

-- ---------- shifts (scheduling) ----------
create table if not exists public.shifts (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  officer_id  uuid references public.profiles(id) on delete set null,
  start_ts    timestamptz not null,
  end_ts      timestamptz not null,
  status      text not null default 'scheduled', -- scheduled | completed | missed
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------- call-in / time-off requests ----------
create table if not exists public.time_off_requests (
  id            uuid primary key default gen_random_uuid(),
  officer_id    uuid not null references public.profiles(id) on delete cascade,
  type          text not null,            -- call_out | sick | pto | vacation | personal
  start_date    date not null,
  end_date      date not null,
  reason        text,
  status        text not null default 'pending', -- pending | approved | denied
  reviewer_id   uuid references public.profiles(id),
  reviewer_note text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.sites             enable row level security;
alter table public.assignments       enable row level security;
alter table public.client_sites      enable row level security;
alter table public.shifts            enable row level security;
alter table public.time_off_requests enable row level security;

-- ---- profiles ----
drop policy if exists p_self_read    on public.profiles;
drop policy if exists p_self_update  on public.profiles;
drop policy if exists p_admin_all    on public.profiles;
create policy p_self_read   on public.profiles for select using (id = auth.uid());
create policy p_self_update on public.profiles for update using (id = auth.uid());
create policy p_admin_all   on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---- sites ----
drop policy if exists s_admin_all      on public.sites;
drop policy if exists s_officer_read   on public.sites;
drop policy if exists s_client_read    on public.sites;
create policy s_admin_all    on public.sites for all
  using (public.is_admin()) with check (public.is_admin());
create policy s_officer_read on public.sites for select using (
  exists (select 1 from public.assignments a where a.site_id = sites.id and a.officer_id = auth.uid()));
create policy s_client_read  on public.sites for select using (
  exists (select 1 from public.client_sites c where c.site_id = sites.id and c.client_id = auth.uid()));

-- ---- assignments ----
drop policy if exists a_admin_all    on public.assignments;
drop policy if exists a_officer_read on public.assignments;
drop policy if exists a_client_read  on public.assignments;
create policy a_admin_all    on public.assignments for all
  using (public.is_admin()) with check (public.is_admin());
create policy a_officer_read on public.assignments for select using (officer_id = auth.uid());
create policy a_client_read  on public.assignments for select using (
  exists (select 1 from public.client_sites c where c.site_id = assignments.site_id and c.client_id = auth.uid()));

-- ---- client_sites ----
drop policy if exists cs_admin_all   on public.client_sites;
drop policy if exists cs_client_read on public.client_sites;
create policy cs_admin_all   on public.client_sites for all
  using (public.is_admin()) with check (public.is_admin());
create policy cs_client_read on public.client_sites for select using (client_id = auth.uid());

-- ---- shifts ----
drop policy if exists sh_admin_all    on public.shifts;
drop policy if exists sh_officer_read on public.shifts;
drop policy if exists sh_client_read  on public.shifts;
create policy sh_admin_all    on public.shifts for all
  using (public.is_admin()) with check (public.is_admin());
create policy sh_officer_read on public.shifts for select using (officer_id = auth.uid());
create policy sh_client_read  on public.shifts for select using (
  exists (select 1 from public.client_sites c where c.site_id = shifts.site_id and c.client_id = auth.uid()));

-- ---- time_off_requests ----
drop policy if exists t_officer_read   on public.time_off_requests;
drop policy if exists t_officer_insert on public.time_off_requests;
drop policy if exists t_admin_all      on public.time_off_requests;
create policy t_officer_read   on public.time_off_requests for select using (officer_id = auth.uid());
create policy t_officer_insert on public.time_off_requests for insert with check (officer_id = auth.uid());
create policy t_admin_all      on public.time_off_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- AFTER you sign up the owner account in the app, run ONCE to
-- make yourself the admin (replace the email):
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'owner@blackstone.com');
-- ============================================================
