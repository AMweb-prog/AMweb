# -*- coding: utf-8 -*-
"""French-only pages: city landing pages and legal pages."""
import json, re, html, zlib

BASE = 'https://www.amweb.ma/'
DATE = '2026-10-11'
DATE_FR = '22 octobre 2026'

WIKI = {
    'site': ('https://fr.wikipedia.org/wiki/Site_web', 'Site web (Wikipédia)'),
    'rwd': ('https://fr.wikipedia.org/wiki/Site_web_r%C3%A9actif', 'Site web réactif (Wikipédia)'),
    'seo': ('https://fr.wikipedia.org/wiki/Optimisation_pour_les_moteurs_de_recherche', 'Optimisation pour les moteurs de recherche (Wikipédia)'),
    'ecom': ('https://fr.wikipedia.org/wiki/Commerce_en_ligne', 'Commerce en ligne (Wikipédia)'),
    'crm': ('https://fr.wikipedia.org/wiki/Gestion_de_la_relation_client', 'Gestion de la relation client (Wikipédia)'),
    'kenitra': ('https://fr.wikipedia.org/wiki/K%C3%A9nitra', 'Kénitra (Wikipédia)'),
    'rabat': ('https://fr.wikipedia.org/wiki/Rabat', 'Rabat (Wikipédia)'),
    'sale': ('https://fr.wikipedia.org/wiki/Sal%C3%A9', 'Salé (Wikipédia)'),
}
EXT = {
    'datareportal': ('https://datareportal.com/reports/digital-2026-morocco', 'DataReportal, Digital 2026: Morocco'),
    'gsc': ('https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=fr', 'Google Search Central, guide de démarrage SEO'),
    'gbp': ('https://www.google.com/intl/fr/business/', 'Google Business Profile'),
    'psi': ('https://pagespeed.web.dev/', 'Google PageSpeed Insights'),
    'cndp': ('https://www.cndp.ma/', 'CNDP, Commission nationale de contrôle de la protection des données à caractère personnel'),
    'cmi': ('https://www.cmi.co.ma/', 'CMI, Centre Monétique Interbancaire'),
}

SHELL = """<!DOCTYPE html>
<html lang="{{LANG}}" dir="{{DIR}}" data-theme="dark">
<head>
  {{GTM_HEAD}}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  {{BOOT}}
  {{HEADMETA}}
  <meta name="author" content="AMweb" />
  <meta name="robots" content="__ROBOTS__" />
  <meta name="geo.region" content="MA" />
  <meta name="geo.placename" content="Kénitra, Maroc" />
  <meta property="og:type" content="__OGTYPE__" />
  <meta property="og:image" content="https://www.amweb.ma/assets/img/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="AMweb" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://www.amweb.ma/assets/img/og-image.jpg" />
  {{ASSETS_HEAD}}
  <script type="application/ld+json">
__SCHEMA__
  </script>
  {{GA}}
</head>
<body data-page="__PAGE__">
  {{GTM_BODY}}
  {{SPRITE}}
  {{NAV}}
  <main id="main">
__MAIN__
  </main>
  {{FOOTER}}
  {{SCRIPTS}}
</body>
</html>
"""


def shell(main, schema, page, ogtype='website', robots='index, follow, max-snippet:-1, max-image-preview:large'):
    return (SHELL.replace('__MAIN__', main).replace('__SCHEMA__', json.dumps(schema, ensure_ascii=False, indent=2))
            .replace('__PAGE__', page).replace('__OGTYPE__', ogtype).replace('__ROBOTS__', robots))


def crumbs(items, R):
    out = []
    for i, (label, href) in enumerate(items):
        if href is None:
            out.append(f'<span aria-current="page">{label}</span>')
        else:
            out.append(f'<a href="{href}">{label}</a>')
    return '<nav class="crumbs" aria-label="Fil d\'Ariane">' + '<span aria-hidden="true">/</span>'.join(out) + '</nav>'


def crumbs_schema(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(items)]}


def faq_schema(faq):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faq]}


def faq_html(faq, title='Questions fréquentes.'):
    items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary><span>{q}</span> <i class="ph ph-plus" aria-hidden="true"></i></summary>
            <p class="ans">{a}</p>
          </details>''' for i, (q, a) in enumerate(faq))
    return f'''
    <section class="section" aria-labelledby="faq-title" style="padding-top:0">
      <div class="wrap faq-grid">
        <h2 class="h2 display" id="faq-title">{title}</h2>
        <div class="faq">{items}
        </div>
      </div>
    </section>'''


def ask_block(topic=''):
    return f'''
    <section class="section" id="question" aria-labelledby="ask-title" style="padding-top:0">
      <div class="wrap">
        <div class="ask">
          <div class="ask-copy">
            <h2 class="ask-title display" id="ask-title">Une question sur ce sujet ?</h2>
            <p class="lead">Posez-la ici. On vous répond personnellement sur WhatsApp, sans engagement.</p>
            <p class="status" data-status></p>
          </div>
          <form class="form ask-form" data-topic="{html.escape(topic, quote=True)}" novalidate aria-label="Poser une question">
            <div class="form-row">
              <div class="field"><label for="qname-{zlib.crc32(topic.encode()) % 999}">Nom</label><input id="qname-{zlib.crc32(topic.encode()) % 999}" name="qname" type="text" autocomplete="name" required /><span class="err">Indiquez votre nom.</span></div>
              <div class="field"><label for="qcontact-{zlib.crc32(topic.encode()) % 999}">WhatsApp ou email</label><input id="qcontact-{zlib.crc32(topic.encode()) % 999}" name="qcontact" type="text" autocomplete="tel" required placeholder="+212 6XX XXX XXX" /><span class="err">Indiquez un numéro ou un email.</span></div>
            </div>
            <div class="field"><label for="qtext-{zlib.crc32(topic.encode()) % 999}">Votre question</label><textarea id="qtext-{zlib.crc32(topic.encode()) % 999}" name="qtext" rows="4" required placeholder="Par exemple : combien de temps pour mettre ma boutique en ligne ?"></textarea><span class="err">Écrivez votre question.</span></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i> Envoyer ma question</button>
            <p class="form-note">Votre question s'ouvre dans WhatsApp, prête à envoyer.</p>
          </form>
        </div>
      </div>
    </section>'''


def sources(keys):
    items = []
    for k in keys:
        url, label = WIKI.get(k) or EXT.get(k)
        items.append(f'<li><a href="{url}" target="_blank" rel="noopener">{label}</a></li>')
    return '<aside class="sources" aria-label="Sources"><h2>Sources et références</h2><ul>' + ''.join(items) + '</ul></aside>'


def W(k, text=None):
    url, label = WIKI[k]
    return f'<a href="{url}" target="_blank" rel="noopener">{text or label}</a>'


def X(k, text=None):
    url, label = EXT[k]
    return f'<a href="{url}" target="_blank" rel="noopener">{text or label}</a>'


ORG = {"@id": BASE + "#localbusiness"}

# =====================================================================
# CITY PAGES
# =====================================================================
CITIES = [
    dict(slug='kenitra', name='Kénitra', wiki='kenitra',
         lead="AMweb est un studio web basé à Kénitra. On crée des sites vitrines, des boutiques en ligne et des applications pour les entreprises de la ville et de toute la région Rabat-Salé-Kénitra.",
         local=f"""<p>Kénitra change vite. Avec l'Atlantic Free Zone et l'usine Stellantis, la ville attire des entreprises, des sous-traitants et de nouveaux habitants. Pour un commerce, un cabinet ou une PME, ce sont autant de clients qui cherchent d'abord sur Google, depuis leur téléphone.</p>
<p>Travailler avec un studio basé à Kénitra, c'est pouvoir se rencontrer facilement et avancer avec une équipe qui connaît le marché local, ses quartiers et ses habitudes. On vous reçoit au studio sur rendez-vous, ou on échange en visio et par téléphone.</p>""",
         faq=[("Où se trouve AMweb ?", "Notre studio est à Kénitra. On vous reçoit sur rendez-vous, et on peut aussi travailler en visio ou par téléphone."),
              ("Combien coûte un site web à Kénitra ?", "Chez AMweb : Site Vitrine {{prix:vitrine}} MAD, Site E-commerce {{prix:ecommerce}} MAD, Site Premium dès {{prix:premium}} MAD, avec facilités de paiement."),
              ("Pouvez-vous m'aider à apparaître sur Google Maps à Kénitra ?", "Oui. Notre offre SEO inclut l'optimisation de votre fiche Google Business Profile et du référencement local. Consultez aussi notre guide pour apparaître sur Google Maps à Kénitra.")]),
    dict(slug='rabat', name='Rabat', wiki='rabat',
         lead="Vous êtes à Rabat et vous cherchez un studio web réactif, avec des prix clairs ? AMweb, basé à Kénitra à moins d'une heure de la capitale, accompagne les entreprises de la capitale, de la première maquette au premier client.",
         local=f"""<p>Capitale administrative du Maroc, Rabat concentre ministères, institutions, professions libérales et PME de services. La concurrence en ligne y est forte : un site professionnel, rapide et bien référencé fait la différence entre être appelé ou être oublié.</p>
<p>On travaille avec vous en visio, par téléphone ou en rendez-vous selon votre projet, avec des étapes claires et des maquettes validées avant chaque développement.</p>""",
         faq=[("Travaillez-vous avec des entreprises à Rabat ?", "Oui. Basés à Kénitra, à moins d'une heure de Rabat, nous accompagnons des entreprises de toute la région Rabat-Salé-Kénitra, en visio, par téléphone ou en rendez-vous."),
              ("Combien coûte un site web à Rabat avec AMweb ?", "Les mêmes prix pour toute la région : Site Vitrine {{prix:vitrine}} MAD, Site E-commerce {{prix:ecommerce}} MAD, Site Premium dès {{prix:premium}} MAD, avec facilités de paiement."),
              ("Pouvez-vous créer un site bilingue français et arabe ?", "Oui, nous créons des sites multilingues, y compris en arabe avec une mise en page adaptée à la lecture de droite à gauche.")]),
    dict(slug='sale', name='Salé', wiki='sale',
         lead="Commerçants, artisans, cabinets et PME de Salé : AMweb crée votre site web sur mesure, votre boutique en ligne ou votre application, avec des prix affichés et des facilités de paiement.",
         local=f"""<p>Ville jumelle de Rabat, sur l'autre rive du Bouregreg, Salé compte un tissu dense de commerces, d'artisans et de nouvelles zones d'activité. Beaucoup de clients comparent désormais les adresses sur Google avant de se déplacer : votre site et votre fiche Google sont votre première vitrine.</p>
<p>Basés à Kénitra, nous travaillons avec les entreprises de Salé en visio, par téléphone ou en rendez-vous, avec la même méthode et les mêmes prix pour toute la région.</p>""",
         faq=[("Intervenez-vous à Salé ?", "Oui. Nous accompagnons les entreprises de Salé et de toute la région Rabat-Salé-Kénitra, en visio, par téléphone ou en rendez-vous."),
              ("Quel site choisir pour un commerce à Salé ?", "Pour présenter votre activité et être trouvé sur Google, le Site Vitrine à {{prix:vitrine}} MAD est un excellent départ. Pour vendre en ligne, choisissez le Site E-commerce à {{prix:ecommerce}} MAD."),
              ("Proposez-vous des facilités de paiement ?", "Oui, sur toutes nos formules, avec un échéancier défini ensemble avant le démarrage du projet.")]),
]


def city_page(c):
    name = c['name']
    others = [x for x in CITIES if x['slug'] != c['slug']]
    main = f'''
    <section class="page-head page-head--city" aria-labelledby="city-title">
      <div class="wrap page-head-grid">
        <div>
          {crumbs([('Accueil', 'index.html'), (f'Création site web {name}', None)], '')}
          <h1 class="page-title display" id="city-title">Création de site web à <span class="accent">{name}</span>.</h1>
          <p class="lead">{c['lead']}</p>
          <div class="hero-actions" style="margin-top:32px">
            <a href="index.html#contact" class="btn btn-primary magnetic">Démarrer un projet <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
            <a href="offres.html" class="btn btn-ghost magnetic">Voir les offres</a>
          </div>
        </div>
        <figure class="page-art"><div class="art"><img src="assets/img/art/{'about' if c['slug']=='kenitra' else ('web' if c['slug']=='rabat' else 'seo')}.webp" alt="Illustration 3D AMweb" width="1200" height="1400" decoding="async" /></div></figure>
      </div>
    </section>

    <section class="section" aria-labelledby="local-title" style="padding-top:clamp(40px,6vw,80px)">
      <div class="wrap split-text">
        <h2 class="h2 display" id="local-title">Un studio web proche de vous.</h2>
        <div class="prose">{c['local']}
          <p>En savoir plus sur {W(c['wiki'], name)}.</p>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="svc-title" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="svc-title" style="margin-bottom:clamp(32px,5vw,56px)">Ce qu'on crée pour les entreprises de {name}.</h2>
        <div class="inc-grid">
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-browser"></i></span><h3>Sites vitrines</h3><p>Un site clair et rapide qui présente votre activité et vous apporte des demandes.</p></div>
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-shopping-cart"></i></span><h3>Boutiques en ligne</h3><p>Catalogue, panier, paiement et tableau de bord pour vendre 24h/24.</p></div>
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-squares-four"></i></span><h3>Applications et CRM</h3><p>Des outils sur mesure pour gérer vos clients, vos ventes et votre équipe.</p></div>
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-magnifying-glass"></i></span><h3>SEO local</h3><p>Fiche Google Business, pages optimisées et suivi pour être trouvé à {name}.</p></div>
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-megaphone"></i></span><h3>Marketing digital</h3><p>Campagnes Instagram, TikTok, Facebook et Google Ads qui ciblent votre zone.</p></div>
          <div class="inc-item"><span class="inc-ico" aria-hidden="true"><i class="ph ph-hand-coins"></i></span><h3>Facilités de paiement</h3><p>Réglez en plusieurs fois, selon un échéancier défini ensemble.</p></div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="prices-title" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="prices-title" style="margin-bottom:clamp(32px,5vw,56px)">Des prix clairs, à {name} comme ailleurs.</h2>
        <div class="prose-prices prose-prices--wide">
          <a href="offres.html#vitrine"><span>Site Vitrine</span><strong>{{prix:vitrine}} MAD</strong><small>3 pages sur mesure, SEO de base, hébergement 1 an</small></a>
          <a href="offres.html#ecommerce"><span>Site E-commerce</span><strong>{{prix:ecommerce}} MAD</strong><small>Boutique complète, paiement intégré, SEO avancé</small></a>
          <a href="offres.html#premium"><span>Site Premium</span><strong>dès {{prix:premium}} MAD</strong><small>Application, CRM, SEO avancé, défini en rendez-vous</small></a>
        </div>
      </div>
    </section>
{faq_html(c['faq'], f'Questions fréquentes à {name}.')}

    <section class="section" aria-labelledby="more-title" style="padding-top:0">
      <div class="wrap">
        <div class="cta-band">
          <div class="cta-band-mark" aria-hidden="true"><svg viewBox="0 0 182 96"><use href="#lg-mark"/></svg></div>
          <div style="position:relative">
            <h2 class="h2 display" id="more-title">Audit gratuit de votre site en 48h.</h2>
            <p>Découvrez ce qui vous fait perdre des clients à {name}. Réponse sur WhatsApp, sans engagement.</p>
          </div>
          <a href="index.html#audit" class="btn btn-primary magnetic" style="position:relative">Recevoir mon audit <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
        </div>
        <p class="related-links">Nous intervenons aussi à <a href="creation-site-web-{others[0]['slug']}.html">{others[0]['name']}</a> et à <a href="creation-site-web-{others[1]['slug']}.html">{others[1]['name']}</a>. Lisez nos <a href="conseils.html">conseils pour réussir en ligne</a>.</p>
      </div>
    </section>'''
    path = f"creation-site-web-{c['slug']}.html"
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Service", "name": f"Création de site web à {name}", "serviceType": "Création de site web",
         "provider": ORG, "areaServed": {"@type": "City", "name": name},
         "description": c['lead'],
         "offers": [{"@type": "Offer", "name": "Site Vitrine", "price": "{{prixnum:vitrine}}", "priceCurrency": "MAD"},
                    {"@type": "Offer", "name": "Site E-commerce", "price": "{{prixnum:ecommerce}}", "priceCurrency": "MAD"},
                    {"@type": "AggregateOffer", "name": "Site Premium", "lowPrice": "{{prixnum:premium}}", "priceCurrency": "MAD"}]},
        faq_schema(c['faq']),
        crumbs_schema([('Accueil', ''), (f'Création site web {name}', path)])]}
    title = f"Création site web {name} | Sites, e-commerce et applications | AMweb"
    desc = f"Création de site web à {name} : sites vitrines dès {{prix:vitrine}} MAD, boutiques en ligne, applications et CRM, SEO local. Studio AMweb, facilités de paiement, devis gratuit."
    kw = f"création site web {name}, agence web {name}, site internet {name}, développeur web {name}, SEO {name}"
    return path, shell(main, schema, 'city'), title, desc, kw


# =====================================================================
# LEGAL PAGES
# =====================================================================
TODO = '<mark class="todo">à compléter</mark>'


def legal_pages():
    ml = f'''
    <section class="page-head" aria-labelledby="ml-title">
      <div class="wrap">
        {crumbs([('Accueil', 'index.html'), ('Mentions légales', None)], '')}
        <h1 class="page-title display" id="ml-title">Mentions légales.</h1>
        <p class="lead">Dernière mise à jour : {DATE_FR}.</p>
      </div>
    </section>
    <section class="section" style="padding-top:clamp(32px,5vw,64px)">
      <div class="wrap"><div class="legal prose">
        <h2>Éditeur du site</h2>
        <p>Le site amweb.ma est édité par <strong>AMweb</strong>, studio web et digital.</p>
        <ul>
          <li>Localisation : Kénitra, Maroc</li>
          <li>Email : <a href="mailto:contact@amweb.ma">contact@amweb.ma</a></li>
          <li>Signaler un problème sur le site : <a href="mailto:support@amweb.ma">support@amweb.ma</a></li>
          <li>Téléphone et WhatsApp : <a href="https://wa.me/212780611376">+212 780 611 376</a></li>
        </ul>
        <h2>Hébergement</h2>
        <p>Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>.</p>
        <h2>Propriété intellectuelle</h2>
        <p>L'ensemble des contenus de ce site (textes, logo, illustrations 3D, mise en page) est la propriété d'AMweb, sauf mention contraire. Toute reproduction sans autorisation écrite est interdite.</p>
        <p>Composants tiers utilisés sous licence : polices Unbounded, Geist, JetBrains Mono, Noto Kufi Arabic et IBM Plex Sans Arabic (licence SIL Open Font), icônes Phosphor (licence MIT), bibliothèques GSAP et Lenis.</p>
        <h2>Liens externes</h2>
        <p>Le site contient des liens vers des sites tiers (Wikipédia, Google, DataReportal...). AMweb n'est pas responsable de leur contenu.</p>
        <h2>Données personnelles</h2>
        <p>Voir notre <a href="confidentialite.html">politique de confidentialité</a>.</p>
      </div></div>
    </section>'''
    conf = f'''
    <section class="page-head" aria-labelledby="pc-title">
      <div class="wrap">
        {crumbs([('Accueil', 'index.html'), ('Confidentialité', None)], '')}
        <h1 class="page-title display" id="pc-title">Politique de confidentialité.</h1>
        <p class="lead">Comment AMweb traite vos données personnelles, conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel. Dernière mise à jour : {DATE_FR}.</p>
      </div>
    </section>
    <section class="section" style="padding-top:clamp(32px,5vw,64px)">
      <div class="wrap"><div class="legal prose">
        <h2>Responsable du traitement</h2>
        <p>AMweb, Kénitra, Maroc. Contact : <a href="mailto:contact@amweb.ma">contact@amweb.ma</a>.</p>
        <h2>Données collectées</h2>
        <ul>
          <li><strong>Formulaires</strong> (contact, audit gratuit, rendez-vous, questions) : nom, prénom, email, téléphone, adresse, entreprise, site web et votre message. Ces informations sont enregistrées dans notre espace de gestion sécurisé, accessible uniquement à l'équipe AMweb. Si l'envoi échoue, le site vous propose de nous écrire via WhatsApp avec le même message.</li>
          <li><strong>Mesure d'audience</strong> : si vous l'acceptez, Google Analytics collecte des données de navigation (pages vues, appareil, ville approximative) de façon agrégée.</li>
          <li><strong>Protection contre les abus</strong> : une empreinte anonymisée de votre adresse IP est conservée avec chaque demande pour limiter les envois automatiques. L'adresse IP elle-même n'est pas enregistrée.</li>
          <li><strong>Stockage local de votre navigateur</strong> : votre choix de thème, votre choix concernant les cookies et le brouillon du formulaire de contact. Ces données restent sur votre appareil.</li>
        </ul>
        <h2>Finalités</h2>
        <p>Répondre à vos demandes, établir des devis, organiser des rendez-vous, améliorer le site et mesurer son audience.</p>
        <h2>Base légale et consentement</h2>
        <p>Les données des formulaires sont traitées avec votre consentement, au moment où vous choisissez de nous écrire. Les cookies de mesure d'audience ne sont activés qu'après votre accord. Vous pouvez modifier votre choix à tout moment : <button type="button" class="link-inline" data-consent-open>gérer les cookies</button>.</p>
        <h2>Destinataires et transferts</h2>
        <p>Vos demandes sont réservées à AMweb et ne sont jamais revendues. Pour fonctionner, le site s'appuie sur des prestataires techniques : Vercel (hébergement du site), Supabase (base de données, serveurs situés dans l'Union européenne), Brevo (notification de vos demandes par email) et, si vous nous écrivez sur WhatsApp, Meta. La mesure d'audience utilise Google Analytics (Google). Ces services peuvent traiter des données hors du Maroc, selon leurs propres politiques de confidentialité.</p>
        <h2>Durée de conservation</h2>
        <p>Les demandes et les échanges sont conservés le temps nécessaire au suivi de votre demande et de la relation commerciale, puis supprimés. Les données de mesure d'audience sont conservées selon les paramètres de Google Analytics.</p>
        <h2>Vos droits</h2>
        <p>Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition au traitement de vos données. Pour l'exercer, écrivez-nous à <a href="mailto:contact@amweb.ma">contact@amweb.ma</a>. Vous pouvez également adresser une réclamation à la {X('cndp', 'CNDP')}.</p>
      </div></div>
    </section>'''
    out = []
    out.append(('mentions-legales.html', shell(ml, {"@context": "https://schema.org", "@type": "WebPage", "name": "Mentions légales AMweb", "url": BASE + "mentions-legales.html"}, 'legal', robots='noindex, follow'),
                'Mentions légales | AMweb', "Mentions légales du site amweb.ma, studio web et digital à Kénitra.", ''))
    out.append(('confidentialite.html', shell(conf, {"@context": "https://schema.org", "@type": "WebPage", "name": "Politique de confidentialité AMweb", "url": BASE + "confidentialite.html"}, 'legal'),
                'Politique de confidentialité (loi 09-08) | AMweb', "Comment AMweb traite vos données personnelles : formulaires, hébergement, Google Analytics, cookies et vos droits selon la loi 09-08.", ''))
    return out


PAGES_FR = []


def build(fr_page):
    """French-only pages: city landing pages and legal pages (Conseils articles come from build/articles.py)."""
    PAGES_FR.clear()
    jobs = [city_page(c) for c in CITIES] + legal_pages()
    for path, tpl, title, desc, kw in jobs:
        page = 'city' if path.startswith('creation') else 'legal'
        fr_page(path, page, tpl, title, desc, kw)
        PAGES_FR.append(path)
