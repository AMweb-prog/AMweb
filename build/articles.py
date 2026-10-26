# -*- coding: utf-8 -*-
"""Conseils (blog): hub + articles in FR (/), EN (/en/) and AR (/ar/), built from the data
(build/data/defaults.json or Supabase). An article is identified by its slug; each language
version is optional except French."""
import html, re, zlib

BASE = 'https://www.amweb.ma/'
DIRS = {'fr': '', 'en': 'en/', 'ar': 'ar/'}
MONTHS = {
    'fr': ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    'ar': ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
}

LOC = {
    'fr': dict(
        home='Accueil', blog='Conseils', crumbs="Fil d'Ariane", minread='min de lecture', toc='Sommaire',
        sources='Sources et références', related='À lire aussi.', faq='Questions fréquentes.', audit='Audit gratuit',
        read="Lire l'article", alt="Illustration 3D AMweb pour l'article : ", articles='Articles',
        ask_title='Une question sur ce sujet ?', ask_lead='Posez-la ici. On vous répond personnellement, sans engagement.',
        name='Nom', name_err='Indiquez votre nom.', contact='WhatsApp ou email', contact_err='Indiquez un numéro ou un email.',
        q='Votre question', q_ph='Par exemple : combien de temps pour mettre ma boutique en ligne ?', q_err='Écrivez votre question.',
        send='Envoyer ma question', note='Votre question nous arrive directement. Réponse rapide, sans engagement.', form='Poser une question',
        hub_h1='Conseils pour réussir <span class="accent">en ligne</span> au Maroc.',
        hub_lead='Prix, choix du site, référencement, vente en ligne : des réponses claires aux questions que nos clients nous posent, avec des sources vérifiables.',
        hub_title='Conseils web pour entreprises au Maroc : prix, SEO, e-commerce | AMweb',
        hub_desc="Guides pratiques pour réussir en ligne au Maroc : prix d'un site web, site vitrine ou e-commerce, Google Maps, CRM, vente en ligne. Par AMweb, Kénitra.",
        hub_kw='conseils site web Maroc, blog web Maroc, prix site web Maroc, SEO Maroc, e-commerce Maroc',
        blog_name='Conseils AMweb', inlang='fr-MA'),
    'en': dict(
        home='Home', blog='Blog', crumbs='Breadcrumb', minread='min read', toc='Contents',
        sources='Sources and references', related='Read also.', faq='Frequently asked questions.', audit='Free audit',
        read='Read the article', alt='3D illustration by AMweb for the article: ', articles='Articles',
        ask_title='A question about this topic?', ask_lead='Ask it here. We reply personally, with no commitment.',
        name='Name', name_err='Please enter your name.', contact='WhatsApp or email', contact_err='Please enter a number or an email.',
        q='Your question', q_ph='For example: how long does it take to put my store online?', q_err='Please write your question.',
        send='Send my question', note='Your question comes straight to us. Quick reply, no commitment.', form='Ask a question',
        hub_h1='Advice to succeed <span class="accent">online</span> in Morocco.',
        hub_lead='Prices, choosing a website, SEO, selling online: clear answers to the questions our clients ask us, with verifiable sources.',
        hub_title='Web advice for businesses in Morocco: prices, SEO, e-commerce | AMweb',
        hub_desc='Practical guides to succeed online in Morocco: website prices, showcase site or online store, Google Maps, CRM, selling online. By AMweb, Kénitra.',
        hub_kw='website advice Morocco, web blog Morocco, website price Morocco, SEO Morocco, e-commerce Morocco',
        blog_name='AMweb Blog', inlang='en'),
    'ar': dict(
        home='الرئيسية', blog='نصائح', crumbs='مسار التصفح', minread='دقائق للقراءة', toc='المحتويات',
        sources='المصادر والمراجع', related='اقرأ أيضاً.', faq='أسئلة شائعة.', audit='تدقيق مجاني',
        read='اقرأ المقال', alt='رسم ثلاثي الأبعاد من AMweb لمقال: ', articles='المقالات',
        ask_title='لديك سؤال حول هذا الموضوع؟', ask_lead='اطرحه هنا. نجيبك شخصياً، دون أي التزام.',
        name='الاسم', name_err='يرجى إدخال اسمك.', contact='واتساب أو بريد إلكتروني', contact_err='يرجى إدخال رقم أو بريد إلكتروني.',
        q='سؤالك', q_ph='مثلاً: كم من الوقت يلزم لإطلاق متجري على الإنترنت؟', q_err='يرجى كتابة سؤالك.',
        send='أرسل سؤالي', note='يصلنا سؤالك مباشرة. رد سريع، دون أي التزام.', form='اطرح سؤالاً',
        hub_h1='نصائح للنجاح <span class="accent">على الإنترنت</span> في المغرب.',
        hub_lead='الأسعار، اختيار نوع الموقع، تحسين الظهور في Google، البيع عبر الإنترنت: إجابات واضحة عن الأسئلة التي يطرحها علينا عملاؤنا، مع مصادر يمكن التحقق منها.',
        hub_title='نصائح الويب للشركات في المغرب: الأسعار، SEO، التجارة الإلكترونية | AMweb',
        hub_desc='أدلة عملية للنجاح على الإنترنت في المغرب: سعر الموقع، موقع تعريفي أم متجر إلكتروني، الظهور على خرائط Google، أنظمة CRM، البيع عبر الإنترنت.',
        hub_kw='نصائح موقع إلكتروني المغرب, سعر موقع إلكتروني المغرب, تحسين محركات البحث المغرب, متجر إلكتروني المغرب',
        blog_name='نصائح AMweb', inlang='ar-MA'),
}


def fmt_date(iso, lang):
    try:
        y, m, d = (int(x) for x in str(iso)[:10].split('-'))
    except ValueError:
        return str(iso)
    if lang == 'en':
        return f'{MONTHS["en"][m - 1]} {d}, {y}'
    return f'{d} {MONTHS[lang][m - 1]} {y}'


def img_src(image, root):
    image = (image or 'about').strip()
    if image.startswith(('http://', 'https://')):
        return image
    return f'{root}assets/img/art/{image}.webp'


def img_abs(image):
    image = (image or 'about').strip()
    return image if image.startswith(('http://', 'https://')) else BASE + f'assets/img/art/{image}.webp'


def _crumbs(items, L):
    out = [f'<span aria-current="page">{label}</span>' if href is None else f'<a href="{href}">{label}</a>' for label, href in items]
    return f'<nav class="crumbs" aria-label="{L["crumbs"]}">' + '<span aria-hidden="true">/</span>'.join(out) + '</nav>'


def _crumbs_schema(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(items)]}


def _faq(faq, L):
    if not faq:
        return ''
    items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary><span>{q}</span> <i class="ph ph-plus" aria-hidden="true"></i></summary>
            <p class="ans">{a}</p>
          </details>''' for i, (q, a) in enumerate(faq))
    return f'''
    <section class="section" aria-labelledby="faq-title" style="padding-top:0">
      <div class="wrap faq-grid">
        <h2 class="h2 display" id="faq-title">{L['faq']}</h2>
        <div class="faq">{items}
        </div>
      </div>
    </section>'''


def _faq_schema(faq):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faq]}


def ask_block(topic, L):
    n = zlib.crc32(topic.encode()) % 999
    return f'''
    <section class="section" id="question" aria-labelledby="ask-title" style="padding-top:0">
      <div class="wrap">
        <div class="ask">
          <div class="ask-copy">
            <h2 class="ask-title display" id="ask-title">{L['ask_title']}</h2>
            <p class="lead">{L['ask_lead']}</p>
            <p class="status" data-status></p>
          </div>
          <form class="form ask-form" data-topic="{html.escape(topic, quote=True)}" novalidate aria-label="{L['form']}">
            <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
            <div class="form-row">
              <div class="field"><label for="qname-{n}">{L['name']}</label><input id="qname-{n}" name="qname" type="text" autocomplete="name" required /><span class="err">{L['name_err']}</span></div>
              <div class="field"><label for="qcontact-{n}">{L['contact']}</label><input id="qcontact-{n}" name="qcontact" type="text" autocomplete="tel" required placeholder="+212 6XX XXX XXX" /><span class="err">{L['contact_err']}</span></div>
            </div>
            <div class="field"><label for="qtext-{n}">{L['q']}</label><textarea id="qtext-{n}" name="qtext" rows="4" required placeholder="{html.escape(L['q_ph'], quote=True)}"></textarea><span class="err">{L['q_err']}</span></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i> {L['send']}</button>
            <p class="form-note">{L['note']}</p>
          </form>
        </div>
      </div>
    </section>'''


def _sources(srcs, L):
    if not srcs:
        return ''
    items = ''.join(f'<li><a href="{html.escape(s["url"], quote=True)}" target="_blank" rel="noopener">{s["label"]}</a></li>' for s in srcs if s.get('url'))
    return f'<aside class="sources" aria-label="{L["sources"]}"><h2>{L["sources"]}</h2><ul>' + items + '</ul></aside>'


def _toc(body, L):
    items = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
    if not items:
        return ''
    return f'<nav class="toc" aria-label="{L["toc"]}"><p class="toc-title">{L["toc"]}</p><ol>' + ''.join(
        f'<li><a href="#{i}">{re.sub("<[^>]+>", "", t)}</a></li>' for i, t in items) + '</ol></nav>'


def _words(h):
    return len(re.sub('<[^>]+>', ' ', h or '').split())


def _slug_ids(body):
    """Give every <h2> without an id a stable id, so the table of contents works for articles written in the admin."""
    used = set(re.findall(r'<h2 id="([^"]+)"', body))

    def rep(m):
        text = re.sub('<[^>]+>', '', m.group(1))
        base = re.sub(r'[^a-z0-9]+', '-', text.lower().encode('ascii', 'ignore').decode()).strip('-') or 'section'
        i, cand = 1, base
        while cand in used:
            i += 1
            cand = f'{base}-{i}'
        used.add(cand)
        return f'<h2 id="{cand}">{m.group(1)}</h2>'
    return re.sub(r'<h2>(.*?)</h2>', rep, body)


def article_page(a, siblings, lang, shell):
    L = LOC[lang]
    d = DIRS[lang]
    body = _slug_ids(a['corps'] or '')
    mins = max(3, round((_words(body) + _words(a['chapo'])) / 200))
    others = [o for o in siblings if o['slug'] != a['slug']][:3]
    rel = ''.join(f'''
          <a class="post post--sm" href="{o['slug']}.html">
            <div class="post-media"><div class="art"><img src="{img_src(o['image'], '../' * (d.count('/') + 1))}" alt="" width="1200" height="1400" loading="lazy" decoding="async" /></div></div>
            <div class="post-body"><span class="post-cat">{o['categorie']}</span><h3>{o['h1']}</h3></div>
          </a>''' for o in others)
    root = '../' * (d.count('/') + 1)
    faq = [tuple(x) for x in (a.get('faq') or []) if len(x) == 2 and x[0]]
    main = f'''
    <article>
      <header class="page-head page-head--post">
        <div class="wrap">
          {_crumbs([(L['home'], '../index.html'), (L['blog'], '../conseils.html'), (a['categorie'], None)], L)}
          <p class="post-meta"><span class="post-cat">{a['categorie']}</span><span>{mins} {L['minread']}</span><time datetime="{a['date_pub']}">{fmt_date(a['date_pub'], lang)}</time></p>
          <h1 class="page-title display">{a['h1']}</h1>
          <p class="lead post-lead">{a['chapo']}</p>
        </div>
      </header>
      <div class="wrap post-cover"><div class="art"><img src="{img_src(a['image'], root)}" alt="{html.escape(L['alt'] + re.sub('<[^>]+>', '', a['h1']), quote=True)}" width="1200" height="1400" decoding="async" /></div></div>
      <div class="wrap post-grid">
        <aside class="post-aside">{_toc(body, L)}
          <a class="btn btn-primary btn-full" href="../index.html#audit">{L['audit']} <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
        </aside>
        <div class="prose">{body}
          {_sources(a.get('sources') or [], L)}
        </div>
      </div>
    </article>
{_faq(faq, L)}
{ask_block(a['h1'], L)}
'''
    if rel:
        main += f'''
    <section class="section" aria-labelledby="rel-title" style="padding-top:0">
      <div class="wrap">
        <h2 class="h2 display" id="rel-title" style="margin-bottom:clamp(28px,4vw,48px)">{L['related']}</h2>
        <div class="post-grid-3">{rel}
        </div>
      </div>
    </section>'''
    path = f"{d}conseils/{a['slug']}.html"
    graph = [{"@type": "Article", "headline": a['h1'], "description": a['description'], "datePublished": str(a['date_pub'])[:10],
              "dateModified": str(a.get('updated_at') or a['date_pub'])[:10],
              "inLanguage": L['inlang'], "author": {"@type": "Organization", "name": "AMweb", "url": BASE},
              "publisher": {"@type": "Organization", "name": "AMweb", "logo": {"@type": "ImageObject", "url": BASE + "assets/img/icon-512.png"}},
              "image": img_abs(a['image']), "mainEntityOfPage": BASE + path,
              "citation": [s['url'] for s in (a.get('sources') or []) if s.get('url')]}]
    if faq:
        graph.append(_faq_schema(faq))
    graph.append(_crumbs_schema([(L['home'], d), (L['blog'], d + 'conseils.html'), (a['h1'], path)]))
    schema = {"@context": "https://schema.org", "@graph": graph}
    return path, shell(main, schema, 'article', ogtype='article'), a['titre_seo'] or a['h1'] + ' | AMweb', a['description'], a.get('mots_cles') or ''


def hub_page(arts, lang, shell):
    L = LOC[lang]
    d = DIRS[lang]
    root = '../' * d.count('/')
    first, rest = arts[0], arts[1:]
    cards = ''.join(f'''
          <a class="post" href="conseils/{o['slug']}.html">
            <div class="post-media"><div class="art"><img src="{img_src(o['image'], root)}" alt="" width="1200" height="1400" loading="lazy" decoding="async" /></div></div>
            <div class="post-body"><span class="post-cat">{o['categorie']}</span><h3>{o['h1']}</h3><p>{o['description']}</p></div>
          </a>''' for o in rest)
    main = f'''
    <section class="page-head" aria-labelledby="blog-title">
      <div class="wrap">
        {_crumbs([(L['home'], 'index.html'), (L['blog'], None)], L)}
        <h1 class="page-title display" id="blog-title">{L['hub_h1']}</h1>
        <p class="lead">{L['hub_lead']}</p>
      </div>
    </section>

    <section class="section" aria-label="{L['articles']}" style="padding-top:clamp(32px,5vw,64px)">
      <div class="wrap">
        <a class="post post--feature" href="conseils/{first['slug']}.html">
          <div class="post-media"><div class="art"><img src="{img_src(first['image'], root)}" alt="" width="1200" height="1500" decoding="async" /></div></div>
          <div class="post-body"><span class="post-cat">{first['categorie']}</span><h2 class="display">{first['h1']}</h2><p>{first['description']}</p><span class="btn btn-primary">{L['read']} <i class="ph ph-arrow-right" aria-hidden="true"></i></span></div>
        </a>
        <div class="post-grid-3" style="margin-top:16px">{cards}
        </div>
      </div>
    </section>
{ask_block('', L)}'''
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "Blog", "name": L['blog_name'], "url": BASE + d + "conseils.html", "inLanguage": L['inlang'], "publisher": {"@id": BASE + "#localbusiness"},
         "blogPost": [{"@type": "BlogPosting", "headline": a['h1'], "url": BASE + f"{d}conseils/{a['slug']}.html", "datePublished": str(a['date_pub'])[:10]} for a in arts]},
        _crumbs_schema([(L['home'], d), (L['blog'], d + 'conseils.html')])]}
    return d + 'conseils.html', shell(main, schema, 'conseils'), L['hub_title'], L['hub_desc'], L['hub_kw']


PAGES = []      # list of (path, lang, slug or None)


def build(rows, page_fn, shell):
    """rows: article rows from the data. page_fn(path, page, tpl, title, desc, kw, lang, langs_available)"""
    PAGES.clear()
    by_lang = {l: [] for l in DIRS}
    for r in sorted(rows, key=lambda r: (r.get('ordre') or 0, r['slug'])):
        if r.get('lang') in by_lang and r.get('publie', True) and r.get('slug') and r.get('h1'):
            by_lang[r['lang']].append(r)
    fr_slugs = {r['slug'] for r in by_lang['fr']}
    # an article must exist in French; other languages are optional
    for l in ('en', 'ar'):
        by_lang[l] = [r for r in by_lang[l] if r['slug'] in fr_slugs]
    langs_of = {}
    for l, arts in by_lang.items():
        for r in arts:
            langs_of.setdefault(r['slug'], set()).add(l)
    for lang, arts in by_lang.items():
        if not arts:
            continue
        path, tpl, t, de, kw = hub_page(arts, lang, shell)
        page_fn(path, 'conseils', tpl, t, de, kw, lang, {l for l in DIRS if by_lang[l]})
        PAGES.append((path, lang, None))
        for a in arts:
            path, tpl, t, de, kw = article_page(a, arts, lang, shell)
            page_fn(path, 'article', tpl, t, de, kw, lang, langs_of[a['slug']])
            PAGES.append((path, lang, a['slug']))
    return by_lang
