-- ============================================================
-- BLACKSTONE SECURITY — Patrol & Reporting module
-- Run this whole file in Supabase -> SQL Editor (after schema.sql).
-- ============================================================

-- ---------- checkpoints (GPS points on a site, captured by admin) ----------
create table if not exists public.checkpoints (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.sites(id) on delete cascade,
  label       text not null,
  lat         double precision,
  lng         double precision,
  radius_m    integer not null default 40,   -- how close an officer must be to verify
  photo_url   text,                            -- reference photo of the spot
  method      text not null default 'GPS',
  created_at  timestamptz not null default now()
);

-- ---------- patrol rounds ----------
create table if not exists public.rounds (
  id          uuid primary key default gen_random_uuid(),
  officer_id  uuid not null references public.profiles(id) on delete cascade,
  site_id     uuid not null references public.sites(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  status      text not null default 'active',   -- active | completed
  route       jsonb,                            -- [{lat,lng,t}]
  notes       text
);

-- ---------- checkpoint scans within a round ----------
create table if not exists public.round_scans (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references public.rounds(id) on delete cascade,
  checkpoint_id uuid references public.checkpoints(id) on delete set null,
  label         text,
  scanned_at    timestamptz not null default now(),
  lat           double precision,
  lng           double precision
);

-- ---------- daily activity reports ----------
create table if not exists public.daily_reports (
  id          uuid primary key default gen_random_uuid(),
  officer_id  uuid not null references public.profiles(id) on delete cascade,
  site_id     uuid not null references public.sites(id) on delete cascade,
  report_date date not null default current_date,
  conditions  text,
  summary     text,
  weather     text,
  photo_urls  text[] not null default '{}',
  status      text not null default 'submitted',
  created_at  timestamptz not null default now()
);

-- ---------- incident reports ----------
create table if not exists public.incidents (
  id            uuid primary key default gen_random_uuid(),
  officer_id    uuid not null references public.profiles(id) on delete cascade,
  site_id       uuid not null references public.sites(id) on delete cascade,
  type          text not null,
  severity      text not null default 'Medium',  -- Low | Medium | High
  narrative     text,
  photo_urls    text[] not null default '{}',
  status        text not null default 'open',     -- open | reviewing | resolved
  reviewer_id   uuid references public.profiles(id),
  reviewer_note text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table public.checkpoints   enable row level security;
alter table public.rounds        enable row level security;
alter table public.round_scans   enable row level security;
alter table public.daily_reports enable row level security;
alter table public.incidents     enable row level security;

-- helper: does the current user have a client link to this site?
create or replace function public.client_sees_site(p_site uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.client_sites c where c.site_id = p_site and c.client_id = auth.uid());
$$;

-- helper: is the current user an officer assigned to this site?
create or replace function public.officer_on_site(p_site uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.assignments a where a.site_id = p_site and a.officer_id = auth.uid());
$$;

-- ---- checkpoints ----
drop policy if exists cp_admin on public.checkpoints;
drop policy if exists cp_officer on public.checkpoints;
drop policy if exists cp_client on public.checkpoints;
create policy cp_admin   on public.checkpoints for all
  using (public.is_admin()) with check (public.is_admin());
create policy cp_officer on public.checkpoints for select using (public.officer_on_site(site_id));
create policy cp_client  on public.checkpoints for select using (public.client_sees_site(site_id));

-- ---- rounds ----
drop policy if exists r_admin on public.rounds;
drop policy if exists r_officer on public.rounds;
drop policy if exists r_client on public.rounds;
create policy r_admin   on public.rounds for all
  using (public.is_admin()) with check (public.is_admin());
create policy r_officer on public.rounds for all
  using (officer_id = auth.uid()) with check (officer_id = auth.uid());
create policy r_client  on public.rounds for select using (public.client_sees_site(site_id));

-- ---- round_scans ----
drop policy if exists rs_admin on public.round_scans;
drop policy if exists rs_officer on public.round_scans;
drop policy if exists rs_client on public.round_scans;
create policy rs_admin   on public.round_scans for all
  using (public.is_admin()) with check (public.is_admin());
create policy rs_officer on public.round_scans for all
  using (exists (select 1 from public.rounds r where r.id = round_scans.round_id and r.officer_id = auth.uid()))
  with check (exists (select 1 from public.rounds r where r.id = round_scans.round_id and r.officer_id = auth.uid()));
create policy rs_client  on public.round_scans for select
  using (exists (select 1 from public.rounds r where r.id = round_scans.round_id and public.client_sees_site(r.site_id)));

-- ---- daily_reports ----
drop policy if exists dr_admin on public.daily_reports;
drop policy if exists dr_officer on public.daily_reports;
create policy dr_admin   on public.daily_reports for all
  using (public.is_admin()) with check (public.is_admin());
create policy dr_officer on public.daily_reports for all
  using (officer_id = auth.uid()) with check (officer_id = auth.uid());

-- ---- incidents ----
drop policy if exists in_admin on public.incidents;
drop policy if exists in_officer on public.incidents;
drop policy if exists in_client on public.incidents;
create policy in_admin   on public.incidents for all
  using (public.is_admin()) with check (public.is_admin());
create policy in_officer on public.incidents for all
  using (officer_id = auth.uid()) with check (officer_id = auth.uid());
create policy in_client  on public.incidents for select using (public.client_sees_site(site_id));

-- ============================================================
-- STORAGE — photo evidence bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

drop policy if exists ev_read   on storage.objects;
drop policy if exists ev_upload on storage.objects;
create policy ev_read   on storage.objects for select using (bucket_id = 'evidence');
create policy ev_upload on storage.objects for insert to authenticated with check (bucket_id = 'evidence');

-- ============================================================
-- SHIFT HANDOFFS — pass-down log between officers at a site
-- ============================================================
create table if not exists public.handoffs (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites(id) on delete cascade,
  from_officer    uuid not null references public.profiles(id) on delete cascade,
  notes           text,
  open_items      text,
  created_at      timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id)
);

alter table public.handoffs enable row level security;

drop policy if exists h_admin on public.handoffs;
drop policy if exists h_officer_read on public.handoffs;
drop policy if exists h_officer_write on public.handoffs;
drop policy if exists h_officer_ack on public.handoffs;
create policy h_admin        on public.handoffs for all
  using (public.is_admin()) with check (public.is_admin());
create policy h_officer_read on public.handoffs for select using (public.officer_on_site(site_id));
create policy h_officer_write on public.handoffs for insert
  with check (from_officer = auth.uid() and public.officer_on_site(site_id));
create policy h_officer_ack  on public.handoffs for update
  using (public.officer_on_site(site_id)) with check (public.officer_on_site(site_id));
