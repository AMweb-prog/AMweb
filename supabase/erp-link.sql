-- =====================================================================
-- Link the website requests with the ERP (amweb-erp)
-- Run in the ERP Supabase project, in this order:
--   1. supabase/erp-repair.sql  (only needed if an older website schema.sql was run there; harmless otherwise)
--   2. supabase/schema.sql      (website tables)
--   3. supabase/seed.sql        (current website content)
--   4. this file
-- Safe to run again.
-- =====================================================================

do $$
begin
  if to_regprocedure('public.mon_role()') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'actif') then
    raise exception 'ERP tables not found in this project: open the Supabase project of amweb-erp (the one in its config.js).';
  end if;
  if to_regclass('public.demandes') is null or to_regprocedure('public.site_is_admin()') is null then
    raise exception 'Website tables not found: run supabase/schema.sql (version of 24/10/2026 or later) first.';
  end if;
end $$;

-- ERP users with the role admin or responsable see the website requests and can change
-- their status, notes and details (for example when they create a prospect from a request).
-- Members (membre) see nothing. Only the website itself creates requests.
drop policy if exists "erp read" on public.demandes;
create policy "erp read" on public.demandes
  for select to authenticated
  using (coalesce(public.mon_role() in ('admin', 'responsable'), false));

drop policy if exists "erp update" on public.demandes;
create policy "erp update" on public.demandes
  for update to authenticated
  using (coalesce(public.mon_role() in ('admin', 'responsable'), false))
  with check (coalesce(public.mon_role() in ('admin', 'responsable'), false));

-- Active ERP admins can also open amweb.ma/admin with the same email and password.
insert into public.admins (user_id, email)
select p.id, p.email from public.profiles p
where p.role = 'admin' and p.actif
on conflict (user_id) do nothing;
