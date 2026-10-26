# -*- coding: utf-8 -*-
"""Content source for the build.

- Without Supabase settings: uses build/data/defaults.json (the content shipped with the repo).
- With SUPABASE_URL + SUPABASE_SECRET_KEY (or the legacy SUPABASE_SERVICE_ROLE_KEY), set in Vercel: reads the published content
  edited in the admin. If Supabase cannot be reached, the build FAILS on purpose, so Vercel
  keeps the previous version online instead of publishing outdated content.
"""
import json, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
OFFER_IDS = ('vitrine', 'ecommerce', 'premium', 'maintenance')


def _get(url, key, table, query):
    headers = {'apikey': key, 'Accept': 'application/json'}
    if key.startswith('eyJ'):  # legacy service_role JWT; new sb_secret_ keys go in "apikey" only
        headers['Authorization'] = f'Bearer {key}'
    req = urllib.request.Request(f'{url}/rest/v1/{table}?{query}', headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'ignore')[:300]
        hint = {404: f'table "{table}" not found in {url}: run supabase/schema.sql then supabase/seed.sql in THIS Supabase project, and check SUPABASE_URL',
                401: 'key refused: put the secret key of THIS Supabase project in SUPABASE_SECRET_KEY',
                403: 'key refused: put the secret key of THIS Supabase project in SUPABASE_SECRET_KEY'}.get(e.code, '')
        raise OSError(f'HTTP {e.code} on table "{table}". {hint}. Supabase said: {detail}') from None


def load():
    data = json.load(open(os.path.join(HERE, 'data', 'defaults.json'), encoding='utf-8'))
    url = os.environ.get('SUPABASE_URL', '').strip().rstrip('/')
    key = (os.environ.get('SUPABASE_SECRET_KEY', '') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')).strip()
    if not (url and key):
        data['source'] = 'defaults'
        print('[data] SUPABASE_URL / SUPABASE_SECRET_KEY not set: using build/data/defaults.json')
        return data
    try:
        offres = _get(url, key, 'offres', 'select=*')
        articles = _get(url, key, 'articles', 'select=*&publie=eq.true&order=ordre.asc,slug.asc')
        realisations = _get(url, key, 'realisations', 'select=*&publie=eq.true&order=ordre.asc,created_at.asc')
        avis = _get(url, key, 'temoignages', 'select=*&publie=eq.true&order=ordre.asc,created_at.asc')  # website testimonials ("avis" is an ERP table)
    except (urllib.error.URLError, OSError, ValueError) as e:
        sys.exit(f'[data] ERROR: cannot read Supabase ({e}). Build stopped so the current site stays online. '
                 'If the Supabase project is paused, restore it from the Supabase dashboard.')
    have = {o['id'] for o in offres}
    missing = [i for i in OFFER_IDS if i not in have]
    if missing:
        sys.exit(f'[data] ERROR: table "offres" is missing {missing}. Run supabase/seed.sql once.')
    if not any(a.get('lang') == 'fr' for a in articles):
        sys.exit('[data] ERROR: no published French article in Supabase. Run supabase/seed.sql once, or publish an article.')
    data.update(offres=offres, articles=articles, realisations=realisations, avis=avis, source='supabase')
    print(f'[data] Supabase: {len(articles)} articles, {len(realisations)} realisations, {len(avis)} avis')
    return data
