# -*- coding: utf-8 -*-
""""Création de site web pour <métier>" pages and their hub page (French only).

Content lives in metiers_data.py. Visible texts never call AMweb an "agence":
that word only appears in meta keywords and structured data.
"""
import html, re
from pages_fr import BASE, ORG, WIKI, shell, crumbs, crumbs_schema, faq_schema, faq_html
from metiers_data import CATS, METIERS
from leads import guide_block, visio_btn

HUB = 'creation-site-web-par-metier.html'
OFFERS = {
    'vitrine': ('Site Vitrine', '{{prix:vitrine}}', '{{prixnum:vitrine}}'),
    'ecommerce': ('Site E-commerce', '{{prix:ecommerce}}', '{{prixnum:ecommerce}}'),
    'premium': ('Site Premium', 'dès {{prix:premium}}', '{{prixnum:premium}}'),
}
CITIES = [('kenitra', 'Kénitra'), ('rabat', 'Rabat'), ('sale', 'Salé')]
# "le site d'un barbier", "d'une parapharmacie"...
OF = {
    'parapharmacie': "d'une parapharmacie", 'animalerie': "d'une animalerie", 'boutique-vetements': "d'une boutique de vêtements",
    'bijouterie': "d'une bijouterie", 'fleuriste': "d'un fleuriste", 'opticien': "d'un opticien", 'restaurant': "d'un restaurant",
    'coffee-shop': "d'un coffee shop", 'boulangerie-patisserie': "d'une boulangerie-pâtisserie", 'traiteur': "d'un traiteur",
    'barbier-coiffeur': "d'un barbier ou d'un salon", 'institut-de-beaute': "d'un institut ou d'un spa", 'salle-de-sport': "d'une salle de sport",
    'cabinet-medical': "d'un cabinet médical", 'avocat': "d'un cabinet d'avocats", 'fiduciaire': "d'une fiduciaire",
    'architecte': "d'un architecte", 'immobilier': "d'un professionnel de l'immobilier", 'hotel-riad': "d'un hôtel ou d'un riad",
    'location-voiture': "d'un loueur de voitures", 'garage-auto': "d'un garage", 'auto-ecole': "d'une auto-école",
    'photographe': "d'un photographe", 'ecole-privee': "d'une école", 'centre-de-formation': "d'un centre de formation",
}


def path_of(m):
    return f"creation-site-web-{m['slug']}.html"


def cap(s):
    return s[:1].upper() + s[1:]


def lc(s):
    """Lower-case the first letter only (keeps "Instagram", "WhatsApp"...)."""
    return s[:1].lower() + s[1:]


def plain(s):
    return re.sub('<[^>]+>', '', s)


def related(m):
    same = [x for x in METIERS if x['cat'] == m['cat'] and x['slug'] != m['slug']]
    other = [x for x in METIERS if x['cat'] != m['cat']]
    i = METIERS.index(m)
    pick = same[:4] + [other[i % len(other)]]
    return pick[:5]


def prices_block(m):
    rows = []
    for key, (name, price, _) in OFFERS.items():
        mark = ' style="border-color:var(--accent-fg)"' if key == m['offer'] else ''
        tag = ' · conseillé' if key == m['offer'] else ''
        small = {'vitrine': '3 pages sur mesure, SEO de base, hébergement 1 an',
                 'ecommerce': 'Boutique complète, paiement intégré, SEO avancé',
                 'premium': 'Application, CRM, réservations, défini en rendez-vous'}[key]
        rows.append(f'<a href="offres.html#{key}"{mark}><span>{name}{tag}</span><strong>{price} MAD</strong><small>{small}</small></a>')
    return '\n          '.join(rows)


def metier_page(m):
    h1 = m['h1']
    feats = ''.join(f'''
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph {ico}"></i></span><h3>{t}</h3><p>{d}</p></div>''' for ico, t, d in m['feats'])
    pages = ''.join(f'<li><strong>{n}</strong> : {d}.</li>' for n, d in m['pages'])
    tips = ''.join(f'<li>{t}</li>' for t in m['tips'])
    rel = related(m)
    rel_links = ', '.join(f'<a href="{path_of(x)}">{x["h1"]}</a>' for x in rel)
    city_links = ', '.join(f'<a href="creation-site-web-{s}.html">{n}</a>' for s, n in CITIES)
    main = f'''
    <section class="page-head page-head--city" aria-labelledby="m-title">
      <div class="wrap page-head-grid">
        <div>
          {crumbs([('Accueil', 'index.html'), ('Création site web par métier', HUB), (cap(m['name']), None)], '')}
          <h1 class="page-title display" id="m-title">Création de site web pour <span class="accent">{h1}</span>.</h1>
          <p class="lead">{m['lead']}</p>
          <div class="hero-actions" style="margin-top:32px">
            <a href="index.html#contact" class="btn btn-primary magnetic">Démarrer mon projet <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
            <a href="offres.html" class="btn btn-ghost magnetic">Voir les offres</a>
          </div>
        </div>
        <figure class="page-art"><div class="art"><img src="assets/img/art/{m['art']}.webp" alt="Création de site web pour {h1}, illustration 3D AMweb" width="1200" height="1400" decoding="async" /></div></figure>
      </div>
    </section>

    <section class="section" aria-labelledby="why-title" style="padding-top:clamp(40px,6vw,80px)">
      <div class="wrap split-text">
        <h2 class="h2 display" id="why-title">Comment vos clients vous cherchent.</h2>
        <div class="prose">{m['why']}</div>
      </div>
    </section>

    <section class="section" aria-labelledby="feat-title" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="feat-title" style="margin-bottom:clamp(32px,5vw,56px)">Ce que doit faire le site {OF[m['slug']]}.</h2>
        <div class="inc-grid">{feats}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="pages-title" style="padding-top:0">
      <div class="wrap split-text">
        <h2 class="h2 display" id="pages-title">Les pages à prévoir.</h2>
        <div class="prose"><ol>{pages}</ol></div>
      </div>
    </section>

    <section class="section" aria-labelledby="tips-title" style="padding-top:0">
      <div class="wrap split-text">
        <h2 class="h2 display" id="tips-title">Bon à savoir.</h2>
        <div class="prose"><ul>{tips}</ul></div>
      </div>
    </section>

    <section class="section" aria-labelledby="prices-title" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="prices-title">Quelle formule choisir ?</h2>
        <p class="lead" style="margin-top:16px">{m['advice']}</p>
        <div class="prose-prices prose-prices--wide">
          {prices_block(m)}
        </div>
      </div>
    </section>
{faq_html(m['faq'], 'Questions fréquentes.')}
{guide_block()}

    <section class="section" aria-labelledby="more-title" style="padding-top:0">
      <div class="wrap">
        <div class="cta-band">
          <div class="cta-band-mark" aria-hidden="true"><svg viewBox="0 0 182 96"><use href="#lg-mark"/></svg></div>
          <div style="position:relative">
            <h2 class="h2 display" id="more-title">Parlons de votre projet.</h2>
            <p>Décrivez votre activité en deux lignes : on vous répond sous 2 h en semaine avec une proposition adaptée, sans engagement. Ou réservez un appel visio de 30 minutes.</p>
          </div>
          <div class="cta-band-actions" style="position:relative">
            <a href="index.html#contact" class="btn btn-primary magnetic">Démarrer mon projet <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
            {visio_btn()}
          </div>
        </div>
        <p class="related-links">Nous créons aussi des sites pour : {rel_links}. Voir <a href="{HUB}">tous les métiers</a>. Nous travaillons à {city_links} et partout au Maroc.</p>
      </div>
    </section>'''

    path = path_of(m)
    oname, _, onum = OFFERS[m['offer']]
    who = plain(h1)
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": BASE + path + "#webpage", "url": BASE + path, "inLanguage": "fr-MA",
         "name": f"Création de site web pour {who}", "isPartOf": {"@id": BASE + "#website"},
         "about": {"@id": BASE + path + "#service"}, "primaryImageOfPage": BASE + "assets/img/og-image.jpg",
         "breadcrumb": {"@id": BASE + path + "#breadcrumb"}},
        {"@type": "Service", "@id": BASE + path + "#service", "name": f"Création de site web pour {who}",
         "alternateName": [f"Création site web {m['name']}", f"Site internet {m['name']}", f"Agence web pour {m['name']}"],
         "serviceType": "Création de site web",
         "description": plain(m['lead']),
         "provider": ORG,
         "audience": {"@type": "BusinessAudience", "audienceType": cap(who)},
         "areaServed": [{"@type": "City", "name": n, "sameAs": WIKI[s][0]} for s, n in CITIES] + [{"@type": "Country", "name": "Maroc"}],
         "hasOfferCatalog": {"@type": "OfferCatalog", "name": f"Sites web pour {who}", "itemListElement": [
             {"@type": "Offer", "name": oname, "priceCurrency": "MAD", "url": BASE + "offres.html#" + m['offer'],
              **({"priceSpecification": {"@type": "PriceSpecification", "minPrice": onum, "priceCurrency": "MAD"}} if m['offer'] == 'premium' else {"price": onum})}]}},
        faq_schema(m['faq']),
        dict(crumbs_schema([('Accueil', ''), ('Création site web par métier', HUB), (cap(m['name']), path)]), **{"@id": BASE + path + "#breadcrumb"})]}

    title = f"Création site web {m['name']} au Maroc | AMweb"
    f1, f2 = (lc(m['feats'][0][1]), lc(m['feats'][1][1]))
    desc = f"Site web pour {who} à Kénitra, Rabat, Salé et partout au Maroc : {f1}, {f2} et SEO local. Prix clairs, facilités de paiement."
    kw = (f"création site web {m['name']}, création site internet {m['name']}, site web {m['name']} maroc, "
          f"agence web {m['name']}, site {m['name']} kenitra, site {m['name']} rabat, {m['kw']}")
    return path, shell(main, schema, 'city'), title, desc, kw


def hub_page():
    groups = []
    for key, label in CATS:
        items = [m for m in METIERS if m['cat'] == key]
        cards = ''.join(f'''
          <a class="inc-item inc-link" href="{path_of(m)}"><h3>{cap(m['h1'])}</h3><p>{m['feats'][0][1]}, {lc(m['feats'][1][1])}, {lc(m['feats'][2][1])}.</p><span class="inc-more">Voir la page <i class="ph ph-arrow-right" aria-hidden="true"></i></span></a>''' for m in items)
        groups.append(f'''
    <section class="section" aria-labelledby="cat-{key}" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="cat-{key}" style="margin-bottom:clamp(28px,4vw,44px)">{label}.</h2>
        <div class="inc-grid">{cards}
        </div>
      </div>
    </section>''')
    city_links = ', '.join(f'<a href="creation-site-web-{s}.html">{n}</a>' for s, n in CITIES)
    main = f'''
    <section class="page-head page-head--city" aria-labelledby="hub-title">
      <div class="wrap page-head-grid">
        <div>
          {crumbs([('Accueil', 'index.html'), ('Création site web par métier', None)], '')}
          <h1 class="page-title display" id="hub-title">Création de site web <span class="accent">par métier</span>.</h1>
          <p class="lead">Un restaurant, une parapharmacie et un cabinet d'avocats n'ont pas besoin du même site. Choisissez votre activité : vous verrez ce que vos clients cherchent, les fonctions utiles, les pages à prévoir et la formule qui vous convient.</p>
          <div class="hero-actions" style="margin-top:32px">
            <a href="index.html#contact" class="btn btn-primary magnetic">Démarrer mon projet <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
            <a href="offres.html" class="btn btn-ghost magnetic">Voir les offres</a>
          </div>
        </div>
        <figure class="page-art"><div class="art"><img src="assets/img/art/build.webp" alt="Création de site web par métier, illustration 3D AMweb" width="1200" height="1400" decoding="async" /></div></figure>
      </div>
    </section>
{''.join(groups)}
{guide_block()}

    <section class="section" aria-labelledby="more-title" style="padding-top:0">
      <div class="wrap">
        <div class="cta-band">
          <div class="cta-band-mark" aria-hidden="true"><svg viewBox="0 0 182 96"><use href="#lg-mark"/></svg></div>
          <div style="position:relative">
            <h2 class="h2 display" id="more-title">Votre métier n'est pas dans la liste ?</h2>
            <p>On crée des sites pour toutes les activités. Décrivez la vôtre : réponse sous 2 h en semaine, ou appel visio de 30 minutes.</p>
          </div>
          <div class="cta-band-actions" style="position:relative">
            <a href="index.html#contact" class="btn btn-primary magnetic">Nous écrire <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
            {visio_btn()}
          </div>
        </div>
        <p class="related-links">Nous travaillons à {city_links} et partout au Maroc. Lisez aussi nos <a href="conseils.html">conseils pour réussir en ligne</a>.</p>
      </div>
    </section>'''
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": BASE + HUB + "#webpage", "url": BASE + HUB, "inLanguage": "fr-MA",
         "name": "Création de site web par métier", "isPartOf": {"@id": BASE + "#website"}, "about": ORG,
         "mainEntity": {"@type": "ItemList", "numberOfItems": len(METIERS), "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "name": f"Création de site web pour {plain(m['h1'])}", "url": BASE + path_of(m)}
             for i, m in enumerate(METIERS)]}},
        crumbs_schema([('Accueil', ''), ('Création site web par métier', HUB)])]}
    title = "Création de site web par métier au Maroc | AMweb"
    desc = "Restaurant, barbier, parapharmacie, coffee shop, animalerie, avocat, école... Le site web qu'il faut à chaque métier, à Kénitra, Rabat, Salé et au Maroc."
    kw = ("création site web par métier, création site web commerce maroc, site web professionnel maroc, agence web kenitra, "
          + ', '.join(f"création site web {m['name']}" for m in METIERS))
    return HUB, shell(main, schema, 'city'), title, desc, kw


def pages():
    return [hub_page()] + [metier_page(m) for m in METIERS]


def city_links_html():
    """Line added to the city pages: links to the trade pages."""
    top = ['restaurant', 'coffee-shop', 'barbier-coiffeur', 'parapharmacie', 'boutique-vetements', 'animalerie']
    by = {m['slug']: m for m in METIERS}
    links = ', '.join(f'<a href="{path_of(by[s])}">{by[s]["name"]}</a>' for s in top)
    return f' Vous avez un commerce ? Voyez nos sites pour {links} et <a href="{HUB}">tous les métiers</a>.'


def links_for(slugs):
    """Inline links to some trade pages (used by the city pages)."""
    by = {m['slug']: m for m in METIERS}
    return ', '.join(f'<a href="{path_of(by[s])}">site pour {by[s]["h1"]}</a>' for s in slugs)


def llms_txt():
    """/llms.txt: a plain summary of the site for AI assistants (ChatGPT, Claude, Perplexity...)."""
    first = lambda t: plain(t).split(' : ')[0].split('. ')[0]
    lines = ["# AMweb", "",
             "> Studio web et digital basé à Kénitra (Maroc). Création de sites vitrines, boutiques en ligne, applications et CRM sur mesure, "
             "référencement local et marketing digital, pour les entreprises de Kénitra, Rabat, Salé et de tout le Maroc. Prix affichés, facilités de paiement.", "",
             "## Pages principales",
             f"- [Accueil]({BASE}): présentation, services, méthode, contact",
             f"- [Offres et prix]({BASE}offres): Site Vitrine, Site E-commerce, Site Premium",
             f"- [Conseils]({BASE}conseils): articles pour réussir en ligne au Maroc",
             f"- [Création de site web par métier]({BASE}{HUB[:-5]}): le site adapté à chaque activité", "",
             "## Villes"]
    lines += [f"- [Création de site web à {n}]({BASE}creation-site-web-{s})" for s, n in CITIES]
    lines += ["", "## Sites web par métier"]
    lines += [f"- [{cap(plain(m['h1']))}]({BASE}creation-site-web-{m['slug']}): {', '.join(lc(f[1]) for f in m['feats'][:3])}" for m in METIERS]
    lines += ["", "## Contact", "- Téléphone et WhatsApp : +212 780 611 376", "- Email : contact@amweb.ma", "- Kénitra, Maroc", ""]
    return '\n'.join(lines)
