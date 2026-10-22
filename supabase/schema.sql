-- =====================================================================
-- AMweb admin: database structure and security
-- Run ONCE in Supabase: SQL Editor > New query > paste this file > Run.
-- Then run seed.sql (current site content), then add your admin account
-- (see GUIDE-ADMIN.md, step 3).
-- Safe to run again: it only creates what is missing.
-- =====================================================================

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- requests (forms)
create table if not exists public.demandes (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type       text not null check (type in ('contact', 'audit', 'rdv', 'question')),
  statut     text not null default 'nouveau' check (statut in ('nouveau', 'en_cours', 'traite', 'archive')),
  lang       text,
  page       text,
  nom        text,
  email      text,
  telephone  text,
  entreprise text,
  message    text,
  details    jsonb not null default '{}'::jsonb,
  notes      text
);
create index if not exists demandes_created_idx on public.demandes (created_at desc);
create index if not exists demandes_statut_idx on public.demandes (statut);

-- ---------------------------------------------------------------- offers / prices
create table if not exists public.offres (
  id         text primary key check (id in ('vitrine', 'ecommerce', 'premium', 'maintenance')),
  prix       integer check (prix is null or prix >= 0),
  duree_fr   text,
  duree_en   text,
  duree_ar   text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- projects (réalisations)
create table if not exists public.realisations (
  id          uuid primary key default gen_random_uuid(),
  ordre       integer not null default 0,
  nom         text not null,
  secteur_fr  text, secteur_en text, secteur_ar text,
  resultat_fr text, resultat_en text, resultat_ar text,
  image_url   text,
  lien        text,
  publie      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- client reviews
create table if not exists public.avis (
  id         uuid primary key default gen_random_uuid(),
  ordre      integer not null default 0,
  nom        text not null,
  role_fr    text, role_en text, role_ar text,
  texte_fr   text, texte_en text, texte_ar text,
  publie     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Conseils articles (one row per language)
create table if not exists public.articles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  lang        text not null check (lang in ('fr', 'en', 'ar')),
  ordre       integer not null default 0,
  titre_seo   text,
  h1          text not null,
  description text not null default '',
  categorie   text not null default '',
  image       text not null default 'about',
  chapo       text not null default '',
  corps       text not null default '',
  faq         jsonb not null default '[]'::jsonb,
  sources     jsonb not null default '[]'::jsonb,
  mots_cles   text not null default '',
  publie      boolean not null default false,
  date_pub    date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (slug, lang)
);

-- ---------------------------------------------------------------- publish log
create table if not exists public.publications (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_email text,
  statut     text not null default 'ok'
);

-- ---------------------------------------------------------------- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['demandes', 'offres', 'realisations', 'avis', 'articles'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_touch') then
      execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- table access for the API
-- Logged-in users may reach the tables, but the RLS rules below decide what they can really see or change
-- (only admins). The public "anon" role gets nothing. The server key (service_role) is used by /api and the build.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- Row Level Security
-- Nobody can read or write anything with the public (anon) key.
-- Logged-in users listed in public.admins can manage everything.
-- Website forms are saved by the server function /api/submit with the service key.
alter table public.admins       enable row level security;
alter table public.demandes     enable row level security;
alter table public.offres       enable row level security;
alter table public.realisations enable row level security;
alter table public.avis         enable row level security;
alter table public.articles     enable row level security;
alter table public.publications enable row level security;

drop policy if exists "admin reads own row" on public.admins;
create policy "admin reads own row" on public.admins
  for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['demandes', 'offres', 'realisations', 'avis', 'articles', 'publications'] loop
    execute format('drop policy if exists "admins manage" on public.%I', t);
    execute format('create policy "admins manage" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- the admin may not create requests by hand (only the website does), but may read/update/delete them
drop policy if exists "admins manage" on public.demandes;
drop policy if exists "admins read" on public.demandes;
drop policy if exists "admins update" on public.demandes;
drop policy if exists "admins delete" on public.demandes;
create policy "admins read"   on public.demandes for select to authenticated using (public.is_admin());
create policy "admins update" on public.demandes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete" on public.demandes for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- image storage (projects, articles)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins update media" on storage.objects;
create policy "admins update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins list media" on storage.objects;
create policy "admins list media" on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_admin());
