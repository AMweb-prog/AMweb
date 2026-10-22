# -*- coding: utf-8 -*-
"""AMweb static site build.

    python3 build/site.py            -> writes the whole site to dist/

FR at the root, EN in /en/, AR in /ar/. Content (prices, articles, projects, reviews) comes from
build/data/defaults.json, or from Supabase when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
(this is what happens on Vercel after you click "Publier" in the admin).
"""
import html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import partials as P
from logo_lib import mark_svg, sprite
import data as DATA

OUT = os.path.join(REPO, 'dist') + os.sep
BASE = 'https://www.amweb.ma/'
AR = json.load(open(os.path.join(HERE, 'ar.json'), encoding='utf-8'))
MISSING = {}
LOCALE = {'fr': 'fr_MA', 'en': 'en_US', 'ar': 'ar_MA'}
DIRS = {'fr': '', 'en': 'en/', 'ar': 'ar/'}
CONTENT = {}          # filled in main()
STATIC = ['assets', 'admin', 'style.css', 'script.js', 'favicon.ico', 'manifest.json']


# ---------------------------------------------------------------- prices and timelines
def fmt_num(n, lang):
    s = f'{int(n):,}'
    return s if lang == 'en' else s.replace(',', ' ')


def offer(i):
    return next((o for o in CONTENT['offres'] if o['id'] == i), {})


MAINT_LABEL = {'fr': 'Sur devis', 'en': 'On quote', 'ar': 'حسب عرض السعر'}
MAINT_PER_QUOTE = {'fr': 'formule mensuelle, selon votre site', 'en': 'monthly plan, depending on your site', 'ar': None}
MAINT_PER_MONTH = {'fr': 'par mois, selon votre site', 'en': 'per month, depending on your site', 'ar': 'شهرياً، حسب موقعك'}


def tokens(s, lang):
    def price(m):
        o = offer(m.group(2))
        if o.get('prix') is None:
            return MAINT_LABEL[lang]
        return str(int(o['prix'])) if m.group(1) == 'prixnum' else fmt_num(o['prix'], lang)

    def duree(m):
        o = offer(m.group(1))
        return (o.get('duree_' + lang) or o.get('duree_fr') or '').strip()

    def maint(m):
        o = offer('maintenance')
        if o.get('prix') is None:
            per = MAINT_PER_QUOTE[lang] or AR.get(MAINT_PER_QUOTE['fr'], MAINT_PER_QUOTE['fr'])
            return f'<span class="price"><span class="price-amt">{MAINT_LABEL[lang]}</span></span><span class="maint-per">{html.escape(per)}</span>'
        return (f'<span class="price"><span class="price-amt">{fmt_num(o["prix"], lang)}</span><span class="price-cur">MAD</span></span>'
                f'<span class="maint-per">{MAINT_PER_MONTH[lang]}</span>')
    s = re.sub(r'\{\{?(prix|prixnum):(\w+)\}?\}', price, s)
    s = re.sub(r'\{\{?duree:(\w+)\}?\}', duree, s)
    s = re.sub(r'\{\{maintenance\}\}', maint, s)
    return s


# ---------------------------------------------------------------- translation + render
def tr(s, lang):
    def rep(m):
        fr, en = m.group(1), m.group(2)
        if lang == 'fr': t = fr
        elif lang == 'en': t = en
        else:
            t = AR.get(fr)
            if t is None:
                MISSING[fr] = en
                t = fr
        return html.escape(t, quote=True)
    return re.sub(r'\[\[(.+?)\|(.+?)\]\]', rep, s, flags=re.S)


def headmeta(title, desc, keywords, path, lang, alts_abs=None):
    url = BASE + path.replace('index.html', '')
    h = [f'<title>{html.escape(title)}</title>',
         f'<meta name="description" content="{html.escape(desc, quote=True)}" />']
    if keywords: h.append(f'<meta name="keywords" content="{html.escape(keywords, quote=True)}" />')
    h.append(f'<link rel="canonical" href="{url}" />')
    if alts_abs:
        for l, u in alts_abs.items():
            h.append(f'<link rel="alternate" hreflang="{l}" href="{u}" />')
        h.append(f'<link rel="alternate" hreflang="x-default" href="{alts_abs.get("fr", url)}" />')
    h += [f'<meta property="og:url" content="{url}" />',
          f'<meta property="og:title" content="{html.escape(title, quote=True)}" />',
          f'<meta property="og:description" content="{html.escape(desc, quote=True)}" />',
          f'<meta property="og:locale" content="{LOCALE[lang]}" />',
          f'<meta name="twitter:title" content="{html.escape(title, quote=True)}" />',
          f'<meta name="twitter:description" content="{html.escape(desc, quote=True)}" />']
    return '\n  '.join(h)


def render(tpl, c, meta):
    s = tpl
    rep = {
        '{{GTM_HEAD}}': P.GTM_HEAD, '{{GTM_BODY}}': P.GTM_BODY, '{{GA}}': P.GA, '{{BOOT}}': P.BOOT,
        '{{ASSETS_HEAD}}': P.assets_head(c), '{{SCRIPTS}}': P.scripts(c),
        '{{NAV}}': P.nav(c), '{{FOOTER}}': P.footer(c) + '\n  ' + P.chrome_bottom(c),
        '{{SPRITE}}': sprite(), '{{HEADMETA}}': meta,
        '{{LANG}}': c['lang'], '{{DIR}}': 'rtl' if c['lang'] == 'ar' else 'ltr',
        '{{ROOT}}': c['root'], '{{HOME}}': c['home'],
    }
    for k, v in rep.items(): s = s.replace(k, v)
    s = re.sub(r'\{\{MARK:(\w+)\}\}', lambda m: mark_svg(m.group(1)), s)
    s = tr(s, c['lang'])
    s = tokens(s, c['lang'])
    s = s.replace('>+212 780 611 376<', '><span class="ltr">+212 780 611 376</span><').replace('<small>WhatsApp</small>+212 780 611 376', '<small>WhatsApp</small><span class="ltr">+212 780 611 376</span>')
    # keep "E-commerce" on one line in visible text (never inside <head> or <script>)
    head, sep, body = s.partition('<body')
    parts = re.split(r'(<script[\s\S]*?</script>)', body)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r'>([^<]+)<', lambda m: '>' + re.sub(r'\b([Ee]-commerce)\b', r'<span class="nw">\1</span>', m.group(1)) + '<', parts[i])
        # never split a price: 3 000 MAD stays on one line
        parts[i] = re.sub(r'>([^<]+)<', lambda m: '>' + re.sub(r'(?<=\d) (?=\d{3}\b|MAD\b|DH\b|درهم|%)', ' ', m.group(1)) + '<', parts[i])
    s = head + sep + ''.join(parts)
    s = sync_faq_schema(s)
    left = re.findall(r'\{\{[A-Za-z_:]+\}\}|\{(?:prix|prixnum|duree):\w+\}|\[\[', s)
    assert not left, (c.get('page'), c.get('lang'), left[:5])
    for m in re.finditer('[—–]', s):
        raise SystemExit(f'DASH in {c.get("page")}/{c.get("lang")}: ...{s[max(0, m.start()-60):m.start()+20]}...')
    return s


def _plain(h):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', h)).replace('\u00a0', ' ')).strip()


def sync_faq_schema(s):
    """The FAQPage structured data must say exactly what the visible FAQ says, in the page's language."""
    m = re.search(r'<div class="faq">(.*?)\n\s*</div>', s, re.S)
    if not m or '"FAQPage"' not in s:
        return s
    qa = re.findall(r'<summary><span>(.*?)</span>.*?</summary>\s*<p class="ans">(.*?)</p>', m.group(1), re.S)
    if not qa:
        return s
    entities = [{"@type": "Question", "name": _plain(q), "acceptedAnswer": {"@type": "Answer", "text": _plain(a)}} for q, a in qa]

    def fix(node):
        if isinstance(node, dict):
            if node.get('@type') == 'FAQPage':
                node['mainEntity'] = entities
            for v in node.values():
                fix(v)
        elif isinstance(node, list):
            for v in node:
                fix(v)

    def rep(mm):
        try:
            obj = json.loads(mm.group(2))
        except ValueError:
            return mm.group(0)
        fix(obj)
        return mm.group(1) + '\n' + json.dumps(obj, ensure_ascii=False, indent=2) + '\n  ' + mm.group(3)
    return re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)', rep, s, flags=re.S)


def write(path, s):
    full = OUT + path
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(s)


MAIN_META = {
    'index': {
        'fr': ('AMweb | Création de site web à Kénitra, e-commerce, applications et CRM au Maroc',
               'AMweb, studio web et digital à Kénitra : sites vitrines dès {{prix:vitrine}} MAD, boutiques en ligne, applications et CRM sur mesure, SEO et marketing digital. Facilités de paiement.',
               'création site web Kénitra, agence web Kénitra, création site web Maroc, site e-commerce Maroc, application sur mesure Maroc, CRM Maroc, SEO Maroc, agence web Rabat, AMweb'),
        'en': ('AMweb | Web design studio in Kénitra, Morocco: websites, e-commerce, apps and CRM',
               'AMweb is a web and digital studio in Kénitra, Morocco: showcase websites from {{prix:vitrine}} MAD, online stores, custom apps and CRM, SEO and digital marketing. Payment plans available.',
               'web design Morocco, website Kénitra, web agency Morocco, e-commerce Morocco, custom app Morocco, CRM Morocco, SEO Morocco'),
        'ar': ('AMweb | تصميم مواقع الويب في القنيطرة، متاجر إلكترونية وتطبيقات وCRM بالمغرب',
               'AMweb استوديو ويب ورقمي في القنيطرة: مواقع تعريفية ابتداءً من {{prix:vitrine}} درهم، متاجر إلكترونية، تطبيقات وأنظمة CRM حسب الطلب، تحسين محركات البحث والتسويق الرقمي. تسهيلات في الأداء.',
               'تصميم مواقع القنيطرة, إنشاء موقع إلكتروني المغرب, متجر إلكتروني المغرب, تطبيقات حسب الطلب, CRM المغرب, تحسين محركات البحث'),
    },
    'offres': {
        'fr': ('Prix site web Maroc 2026 : offres dès {{prix:vitrine}} MAD | AMweb Kénitra',
               'Tarifs AMweb : Site Vitrine 3 pages {{prix:vitrine}} MAD, Site E-commerce {{prix:ecommerce}} MAD, Site Premium avec application et CRM dès {{prix:premium}} MAD. Hébergement inclus, facilités de paiement, devis gratuit.',
               'prix site web Maroc, tarif création site web Maroc, prix site e-commerce Maroc, devis site web Kénitra, forfait site vitrine Maroc, AMweb offres'),
        'en': ('Website prices in Morocco: packages from {{prix:vitrine}} MAD | AMweb',
               'AMweb packages: 3-page showcase site {{prix:vitrine}} MAD, e-commerce site {{prix:ecommerce}} MAD, premium with app and CRM from {{prix:premium}} MAD. Hosting included, payment plans, free quote.',
               'website price Morocco, e-commerce price Morocco, web design quote Morocco'),
        'ar': ('أسعار إنشاء المواقع في المغرب: عروض ابتداءً من {{prix:vitrine}} درهم | AMweb',
               'عروض AMweb: موقع تعريفي من 3 صفحات بـ {{prix:vitrine}} درهم، متجر إلكتروني بـ {{prix:ecommerce}} درهم، باقة بريميوم مع تطبيق وCRM ابتداءً من {{prix:premium}} درهم. الاستضافة مشمولة، تسهيلات في الأداء، عرض سعر مجاني.',
               'سعر موقع إلكتروني المغرب, سعر متجر إلكتروني المغرب, عرض سعر موقع'),
    },
}



def build_main():
    for page in ('index', 'offres'):
        tpl = open(os.path.join(HERE, 'templates', f'{page}.tpl.html'), encoding='utf-8').read()
        alts_abs = {l: BASE + DIRS[l] + ('' if page == 'index' else 'offres.html') for l in DIRS}
        for lang, d in DIRS.items():
            fn = f'{page}.html'
            up = '' if lang == 'fr' else '../'
            alts = {l: (up + DIRS[l] + fn) if l != lang else fn for l in DIRS}
            c = dict(lang=lang, root=up, home='', page=page, alts=alts, blog='conseils.html')
            t, de, kw = MAIN_META[page][lang]
            s = render(tpl, c, headmeta(tokens(t, lang), tokens(de, lang), kw, d + fn, lang, alts_abs))
            write(d + fn, s)
            print(d + fn, len(s))


def fr_page(path, page, tpl, title, desc, keywords):
    """French-only page (city and legal pages)."""
    depth = path.count('/')
    up = '../' * depth
    alts = {'fr': os.path.basename(path), 'en': up + 'en/index.html', 'ar': up + 'ar/index.html'}
    c = dict(lang='fr', root=up, home=up, page=page, alts=alts, blog=up + 'conseils.html')
    s = render(tpl, c, headmeta(tokens(title, 'fr'), tokens(desc, 'fr'), keywords, path, 'fr'))
    write(path, s)
    print(path, len(s))


def blog_page(path, page, tpl, title, desc, keywords, lang, langs):
    """Conseils hub / article in any language. `langs` = languages in which this page exists."""
    depth = path.count('/')                   # fr hub 0, fr article 1, en hub 1, en article 2
    up = '../' * depth                        # to site root (assets, legal pages)
    home = '../' * (depth - (0 if lang == 'fr' else 1))   # to this language's home folder
    fr_path = path[len(DIRS[lang]):]          # conseils.html or conseils/x.html
    alts = {}
    for l in DIRS:
        if l == lang:
            alts[l] = os.path.basename(path)
        elif l in langs:
            alts[l] = up + DIRS[l] + fr_path
        else:                                  # not translated yet: go to that language's blog home
            alts[l] = up + DIRS[l] + 'conseils.html'
    alts_abs = {l: BASE + DIRS[l] + fr_path for l in DIRS if l in langs}
    c = dict(lang=lang, root=up, home=home, page=page, alts=alts, blog=home + 'conseils.html')
    s = render(tpl, c, headmeta(tokens(title, lang), tokens(desc, lang), tokens(keywords, lang), path, lang, alts_abs if len(alts_abs) > 1 else None))
    write(path, s)
    print(path, len(s))


# ---------------------------------------------------------------- generated data file for script.js
def site_data_js():
    def tri(row, base):
        out = {l: (row.get(f'{base}_{l}') or '').strip() for l in DIRS}
        return out if any(out.values()) else None

    projects = []
    for r in CONTENT['realisations']:
        p = {'name': r.get('nom') or '', 'image': r.get('image_url') or ''}
        for k, base in (('sector', 'secteur'), ('result', 'resultat')):
            v = tri(r, base)
            if v: p[k] = v
        if r.get('lien'): p['url'] = r['lien']
        if p['image']: projects.append(p)
    testimonials = []
    for r in CONTENT['avis']:
        q = tri(r, 'texte')
        if q and r.get('nom'):
            t = {'quote': q, 'name': r['nom']}
            role = tri(r, 'role')
            if role: t['role'] = role
            testimonials.append(t)
    offers = {}
    for i in ('vitrine', 'ecommerce', 'premium'):
        o = offer(i)
        if o.get('prix') is None:
            continue
        e = {'price': {l: fmt_num(o['prix'], l) for l in DIRS}}
        if o.get('duree_fr'):
            e['time'] = {'fr': 'Livré en ' + o['duree_fr'], 'en': 'Delivered in ' + (o.get('duree_en') or o['duree_fr']),
                         'ar': 'التسليم خلال ' + (o.get('duree_ar') or o['duree_fr'])}
        offers[i] = e
    js = ('/* Generated by build/site.py from the admin content. Do not edit by hand: use the admin (amweb.ma/admin). */\n'
          'window.AMWEB_DATA = ' + json.dumps({'projects': projects, 'testimonials': testimonials}, ensure_ascii=False, indent=1) + ';\n'
          'window.AMWEB_OFFERS = ' + json.dumps(offers, ensure_ascii=False) + ';\n')
    write('assets/data/realisations.js', js)


def copy_static():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    for name in STATIC:
        src = os.path.join(REPO, name)
        if os.path.isdir(src):
            shutil.copytree(src, OUT + name)
        elif os.path.exists(src):
            shutil.copy2(src, OUT + name)
    for f in os.listdir(REPO):            # Google Search Console verification files
        if re.match(r'google[0-9a-f]+\.html$', f):
            shutil.copy2(os.path.join(REPO, f), OUT + f)
    write('robots.txt', open(os.path.join(HERE, 'robots.txt'), encoding='utf-8').read())


def build_sitemap(fr_only, blog_pages):
    D = CONTENT.get('lastmod', '2026-10-22')
    rows = []

    def url(loc, pr, freq, alts=None):
        a = ''
        if alts and len(alts) > 1:
            a = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{u}"/>' for l, u in alts.items())
            a += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{alts.get("fr", loc)}"/>'
        rows.append(f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{D}</lastmod>\n    <changefreq>{freq}</changefreq>\n    <priority>{pr}</priority>{a}\n  </url>')
    for page, pr in (('index', '1.0'), ('offres', '0.9')):
        fn = '' if page == 'index' else 'offres.html'
        alts = {l: BASE + DIRS[l] + fn for l in DIRS}
        for l in DIRS:
            url(BASE + DIRS[l] + fn, pr if l == 'fr' else '0.8', 'weekly', alts)
    groups = {}
    for path, lang, slug in blog_pages:
        groups.setdefault(slug or '', {})[lang] = BASE + path
    for slug, alts in groups.items():
        for l, loc in alts.items():
            pr = ('0.8' if not slug else '0.7') if l == 'fr' else '0.6'
            url(loc, pr, 'monthly', alts)
    for p in fr_only:
        if p == 'mentions-legales.html':
            continue
        url(BASE + p, '0.8' if p.startswith('creation') else '0.3', 'monthly')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<!-- SITEMAP.XML - AMweb.ma, generated on ' + D + ' -->\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + '\n'.join(rows) + '\n</urlset>\n')
    write('sitemap.xml', xml)
    print('sitemap', len(rows), 'urls')


def main():
    import datetime
    CONTENT.update(DATA.load())
    CONTENT['lastmod'] = datetime.date.today().isoformat()
    copy_static()
    build_main()
    import pages_fr, articles
    pages_fr.build(fr_page)
    articles.build(CONTENT['articles'], blog_page, pages_fr.shell)
    site_data_js()
    build_sitemap(pages_fr.PAGES_FR, articles.PAGES)
    if MISSING:
        print('MISSING AR translations:', len(MISSING), list(MISSING)[:5])
    print(f'Done: site written to {OUT} (content: {CONTENT["source"]})')


if __name__ == '__main__':
    main()
