-- =====================================================================
-- REPAIR of the ERP (amweb-erp) after the OLD website schema.sql was run in its project
-- ---------------------------------------------------------------------
-- The old website schema.sql (before 24/10/2026) used the same names as the ERP:
--   * it replaced the ERP function public.is_admin()  -> ERP admins were no longer admins;
--   * it added a trigger and a policy to the ERP table public.avis -> editing a review failed;
--   * it widened the rights on the ERP read-only finance tables (migrations 004 and 005).
-- This file puts the ERP back exactly as its own migrations define it.
-- Safe to run several times, and safe if nothing was damaged.
-- Run it in the ERP Supabase project, BEFORE the new website schema.sql.
-- =====================================================================

do $$
begin
  -- 1. ERP is_admin(): definition from 001_schema.sql
  if to_regclass('public.profiles') is not null
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'actif') then
    execute $f$
      create or replace function public.is_admin()
      returns boolean language sql stable security definer set search_path = public as $body$
        select exists (select 1 from public.profiles
                        where id = auth.uid() and role = 'admin' and actif);
      $body$
    $f$;
    execute 'grant execute on function public.is_admin() to authenticated';
  end if;

  -- 2. ERP table avis (it has the column note_etoiles): remove what the website added
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'avis' and column_name = 'note_etoiles') then
    execute 'drop trigger if exists avis_touch on public.avis';
    execute 'drop policy if exists "admins manage" on public.avis';
  end if;

  -- 3. Read-only finance tables of migration 004 (journal, transfers, supplier payments)
  if to_regclass('public.mouvements_tresorerie') is not null then
    execute 'revoke all on public.mouvements_tresorerie, public.transferts_tresorerie, public.reglements_fournisseurs from anon, authenticated';
    execute 'grant select on public.mouvements_tresorerie, public.transferts_tresorerie, public.reglements_fournisseurs to authenticated';
    execute 'grant select, insert, update, delete on public.comptes_tresorerie, public.fournisseurs, public.charges_recurrentes to authenticated';
    execute 'grant select, insert, update on public.rapprochements, public.rapprochement_lignes, public.engagements_fournisseurs to authenticated';
    execute 'grant select on public.occurrences_charges to authenticated';
    execute 'grant delete on public.rapprochements, public.rapprochement_lignes to authenticated';
    if to_regclass('public.rapprochement_historique_a_traiter') is not null then
      execute 'grant select on public.rapprochement_historique_a_traiter to authenticated';
    end if;
  end if;

  -- 4. Partner / capital tables of migration 005
  if to_regclass('public.associes') is not null then
    execute 'revoke all on public.finance_permissions_profiles, public.associes, public.historique_associes, public.configuration_capital,
      public.mouvements_parts_associes, public.apports_capital_associes, public.mouvements_comptes_associes,
      public.demandes_remboursement_associes, public.resultats_gestion, public.distributions_associes,
      public.lignes_distribution_associes, public.paiements_distribution_associes from anon, authenticated';
    execute 'grant select on public.finance_permissions_profiles, public.associes, public.historique_associes, public.configuration_capital,
      public.mouvements_parts_associes, public.apports_capital_associes, public.mouvements_comptes_associes,
      public.demandes_remboursement_associes, public.resultats_gestion, public.distributions_associes,
      public.lignes_distribution_associes, public.paiements_distribution_associes to authenticated';
    execute 'grant insert, update on public.associes to authenticated';
    execute 'grant insert, update on public.resultats_gestion to authenticated';
  end if;

  -- 5. CRM history and contract versions of migration 006 (append-only)
  if to_regclass('public.historique_etapes_prospects') is not null then
    execute 'revoke all on public.contacts_clients, public.historique_etapes_prospects, public.contrats_clients,
      public.versions_contrats, public.documents from anon, authenticated';
    execute 'grant select, insert, update, delete on public.contacts_clients, public.contrats_clients, public.documents to authenticated';
    execute 'grant select, insert on public.historique_etapes_prospects, public.versions_contrats to authenticated';
  end if;
end $$;
