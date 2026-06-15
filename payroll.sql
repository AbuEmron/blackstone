-- ============================================================
-- BLACKSTONE SECURITY — Payroll & Time Clock module
-- Run in Supabase -> SQL Editor (after schema.sql + patrol-reporting.sql).
-- ============================================================

-- ---------- pay rate on profiles ----------
alter table public.profiles add column if not exists pay_rate numeric;

-- extend the guard so officers can't change their own role OR pay rate
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if (new.role is distinct from old.role) then
      raise exception 'Only an admin can change roles';
    end if;
    if (new.pay_rate is distinct from old.pay_rate) then
      raise exception 'Only an admin can change pay rate';
    end if;
  end if;
  return new;
end; $$;

-- ---------- time clock entries ----------
create table if not exists public.time_entries (
  id            uuid primary key default gen_random_uuid(),
  officer_id    uuid not null references public.profiles(id) on delete cascade,
  site_id       uuid references public.sites(id) on delete set null,
  clock_in      timestamptz not null default now(),
  clock_out     timestamptz,
  break_minutes integer not null default 0,
  source        text not null default 'clock',   -- clock | manual
  lat           double precision,
  lng           double precision,
  created_at    timestamptz not null default now()
);

alter table public.time_entries enable row level security;

drop policy if exists te_admin on public.time_entries;
drop policy if exists te_officer on public.time_entries;
create policy te_admin   on public.time_entries for all
  using (public.is_admin()) with check (public.is_admin());
create policy te_officer on public.time_entries for all
  using (officer_id = auth.uid()) with check (officer_id = auth.uid());
