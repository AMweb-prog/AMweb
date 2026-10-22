from logo_lib import full_svg, mark_svg, sprite

WA = "https://wa.me/212780611376"

# Consent Mode v2: analytics cookies off until the visitor accepts (loi 09-08 / CNDP friendly)
CONSENT_HEAD = """<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  try { if (localStorage.getItem('amweb_consent') === 'granted') gtag('consent', 'update', { analytics_storage: 'granted' }); } catch (e) {}
  </script>"""

GTM_HEAD = CONSENT_HEAD + """
  <!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WCVJZSS4');</script>
<!-- End Google Tag Manager -->"""

GTM_BODY = """<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WCVJZSS4"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->"""

GA = """<!-- [ANALYTICS] Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-RQTW7E5SFS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-RQTW7E5SFS');
  </script>"""

BOOT = """<script>
  (function(){var d=document.documentElement;d.classList.add('js');
  try{var t=localStorage.getItem('amweb_theme');if(t==='light'||t==='dark')d.setAttribute('data-theme',t);}catch(e){}
  try{if(sessionStorage.getItem('amweb_intro')){d.classList.add('no-loader');}}catch(e){d.classList.add('no-loader');}
  })();
  </script>"""


def assets_head(c):
    r = c['root']
    ar = ''
    if c['lang'] == 'ar':
        ar = f'\n  <link rel="preload" href="{r}assets/fonts/noto-kufi-arabic-arabic-700-normal.woff2" as="font" type="font/woff2" crossorigin />'
    return f"""<link rel="icon" type="image/svg+xml" href="{r}assets/img/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="{r}assets/img/icon-32.png" />
  <link rel="alternate icon" href="{r}favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="{r}assets/img/icon-180.png" />
  <link rel="manifest" href="{r}manifest.json" />
  <meta name="theme-color" content="#0B0F1A" />

  <link rel="preload" href="{r}assets/fonts/unbounded-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="{r}assets/fonts/geist-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />{ar}
  <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
  <link rel="stylesheet" href="{r}assets/css/icons.css" />
  <link rel="stylesheet" href="{r}style.css" />"""


def scripts(c):
    r = c['root']
    return f"""<script src="{r}assets/vendor/gsap.min.js" defer></script>
  <script src="{r}assets/vendor/ScrollTrigger.min.js" defer></script>
  <script src="{r}assets/vendor/lenis.min.js" defer></script>
  <script src="{r}assets/data/realisations.js" defer></script>
  <script src="{r}script.js" defer></script>"""


LANG_LABEL = {'fr': 'FR', 'en': 'EN', 'ar': 'ع'}
LANG_NAME = {'fr': 'Français', 'en': 'English', 'ar': 'العربية'}


def lang_switch(c):
    items = ''
    for l in ('fr', 'en', 'ar'):
        cur = ' aria-current="true"' if l == c['lang'] else ''
        items += f'<a href="{c["alts"][l]}" hreflang="{l}" lang="{l}"{cur}>{LANG_NAME[l]}</a>'
    return f"""<details class="lang-sw">
          <summary class="tool-btn" aria-label="Langue / Language / اللغة">{LANG_LABEL[c['lang']]}</summary>
          <div class="lang-menu">{items}</div>
        </details>"""


def home_link(c, anchor):
    # on the homepage itself, keep pure anchors (smooth scroll); elsewhere go to the homepage
    return f'#{anchor}' if c['page'] == 'index' else f'{c["home"]}index.html#{anchor}'


def nav(c):
    H = lambda a: home_link(c, a)
    off_cur = ' aria-current="page"' if c['page'] == 'offres' else ''
    blog_cur = ' aria-current="page"' if c['page'] in ('conseils', 'article') else ''
    r = c['root']
    return f"""<a class="skip-link" href="#main">[[Aller au contenu|Skip to content]]</a>
  <div class="progress" aria-hidden="true"></div>

  <div class="loader" aria-hidden="true">{mark_svg('ld')}</div>

  <header class="nav" id="nav">
    <div class="nav-bar">
      <a href="{c['home']}index.html" class="nav-logo" aria-label="AMweb"><svg viewBox="0 0 414 96" aria-hidden="true"><use href="#lg-full"/></svg></a>
      <nav aria-label="[[Navigation principale|Main navigation]]">
        <ul class="nav-links">
          <li><a href="{H('hero')}" data-nav="hero">[[Accueil|Home]]</a></li>
          <li><a href="{H('about')}" data-nav="about">[[À propos|About]]</a></li>
          <li><a href="{H('services')}" data-nav="services">[[Services|Services]]</a></li>
          <li><a href="{c['home']}offres.html"{off_cur}>[[Nos offres|Our offers]]</a></li>
          <li><a href="{c.get('blog', r + 'conseils.html')}"{blog_cur}>[[Conseils|Blog]]</a></li>
          <li><a href="{H('contact')}" data-nav="contact">[[Contact|Contact]]</a></li>
        </ul>
      </nav>
      <div class="nav-tools">
        {lang_switch(c)}
        <button class="tool-btn" id="themeBtn" type="button" aria-label="[[Changer de thème|Toggle theme]]"><i class="ph ph-sun theme-ico-dark" aria-hidden="true"></i><i class="ph ph-moon theme-ico-light" aria-hidden="true"></i></button>
        <a href="{H('contact')}" class="btn btn-primary btn-sm nav-cta magnetic">[[Démarrer un projet|Start a project]]</a>
        <button class="tool-btn burger" id="burger" type="button" aria-label="[[Menu|Menu]]" aria-expanded="false" aria-controls="menu"><span><span></span><span></span></span></button>
      </div>
    </div>
  </header>

  <div class="menu" id="menu" aria-hidden="true">
    <ul class="menu-links">
      <li><a href="{H('hero')}"><span>[[Accueil|Home]]</span></a></li>
      <li><a href="{H('services')}"><span>[[Services|Services]]</span></a></li>
      <li><a href="{c['home']}offres.html"><span>[[Nos offres|Our offers]]</span></a></li>
      <li><a href="{c.get('blog', r + 'conseils.html')}"><span>[[Conseils|Blog]]</span></a></li>
      <li><a href="{H('contact')}"><span>[[Contact|Contact]]</span></a></li>
    </ul>
    <div class="menu-foot">
      <a href="mailto:contact@amweb.ma">contact@amweb.ma</a>
      <a href="{WA}" rel="noopener">+212 780 611 376</a>
      <span>[[Kénitra, Maroc|Kénitra, Morocco]]</span>
      <p class="status" data-status style="margin-top:14px"></p>
    </div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>"""


def chrome_bottom(c):
    """Mobile contact bar, booking dialog, consent banner (all pages)."""
    H = lambda a: home_link(c, a)
    r = c['root']
    times = ''.join(f'<button type="button" class="chip" data-time="{t}">{t}</button>' for t in ('10:00', '11:30', '14:30', '16:00'))
    return f"""<div class="mbar" id="mbar">
    <a class="mbar-wa" href="{WA}" rel="noopener" aria-label="WhatsApp"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i><span>WhatsApp</span></a>
    <a class="btn btn-primary mbar-cta" href="{H('contact')}">[[Démarrer un projet|Start a project]] <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
  </div>

  <dialog class="book" id="bookDialog" aria-labelledby="bookTitle">
    <form class="book-inner" id="bookForm" novalidate>
      <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
      <button class="book-x" type="button" data-close aria-label="[[Fermer|Close]]"><i class="ph ph-x" aria-hidden="true"></i></button>
      <span class="eyebrow">[[Rendez-vous gratuit|Free meeting]]</span>
      <h2 class="book-title display" id="bookTitle">[[Réservons un créneau.|Let's book a slot.]]</h2>
      <p class="book-lead">[[Choisissez un jour, une heure et un format. On vous confirme le rendez-vous rapidement.|Pick a day, a time and a format. We confirm the meeting quickly.]]</p>
      <fieldset class="book-set"><legend>[[Jour|Day]]</legend><div class="chips" id="bookDays"></div><span class="err" id="bookDayErr">[[Choisissez un jour.|Pick a day.]]</span></fieldset>
      <fieldset class="book-set"><legend>[[Heure|Time]]</legend><div class="chips" id="bookTimes">{times}</div><span class="err" id="bookTimeErr">[[Choisissez une heure.|Pick a time.]]</span></fieldset>
      <fieldset class="book-set"><legend>[[Format|Format]]</legend><div class="chips" id="bookModes">
        <button type="button" class="chip is-on" data-mode="studio" aria-pressed="true">[[Au studio à Kénitra|At the studio in Kénitra]]</button>
        <button type="button" class="chip" data-mode="video" aria-pressed="false">[[Visio|Video call]]</button>
        <button type="button" class="chip" data-mode="phone" aria-pressed="false">[[Téléphone|Phone]]</button>
      </div></fieldset>
      <div class="form-row">
        <div class="field"><label for="bkName">[[Nom complet|Full name]]</label><input id="bkName" type="text" autocomplete="name" required aria-describedby="bkName-err" /><span class="err" id="bkName-err">[[Indiquez votre nom.|Please enter your name.]]</span></div>
        <div class="field"><label for="bkPhone">[[Téléphone / WhatsApp|Phone / WhatsApp]]</label><input id="bkPhone" type="tel" autocomplete="tel" required placeholder="+212 6XX XXX XXX" aria-describedby="bkPhone-err" /><span class="err" id="bkPhone-err">[[Indiquez un numéro valide.|Enter a valid number.]]</span></div>
      </div>
      <button type="submit" class="btn btn-primary btn-full"><i class="ph ph-calendar-check" aria-hidden="true"></i> [[Réserver ce créneau|Book this slot]]</button>
    </form>
  </dialog>

  <div class="consent" id="consent" hidden role="region" aria-label="Cookies">
    <p>[[On utilise Google Analytics pour mesurer l'audience et améliorer le site.|We use Google Analytics to measure traffic and improve the site.]] <a href="{r}confidentialite.html">[[En savoir plus|Learn more]]</a></p>
    <div class="consent-actions">
      <button type="button" class="btn btn-ghost btn-sm" data-consent="denied">[[Refuser|Decline]]</button>
      <button type="button" class="btn btn-primary btn-sm" data-consent="granted">[[Accepter|Accept]]</button>
    </div>
  </div>"""


def footer(c):
    H = lambda a: home_link(c, a)
    r = c['root']
    return f"""<footer class="footer" aria-label="[[Pied de page|Footer]]">
    <div class="wrap">
      <div class="footer-logo" id="footerLogo">{full_svg('ft', label='AMweb')}</div>
      <div class="footer-grid">
        <div>
          <p class="footer-tag">[[Studio web & digital. On met votre marque en orbite.|Web & digital studio. We put your brand in orbit.]]</p>
          <div class="socials" style="margin-top:28px">
            <a class="social" href="https://instagram.com/amweb.ma" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="ph ph-instagram-logo" aria-hidden="true"></i></a>
            <a class="social" href="https://tiktok.com/@amweb.ma" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i class="ph ph-tiktok-logo" aria-hidden="true"></i></a>
            <a class="social" href="{WA}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i></a>
          </div>
        </div>
        <nav aria-label="[[Navigation secondaire|Secondary navigation]]">
          <h4>[[Navigation|Navigation]]</h4>
          <ul>
            <li><a href="{H('services')}">[[Services|Services]]</a></li>
            <li><a href="{c['home']}offres.html">[[Nos offres|Our offers]]</a></li>
            <li><a href="{c['home']}offres.html#finder">[[Trouver mon forfait|Find my package]]</a></li>
            <li><a href="{H('audit')}">[[Audit gratuit|Free audit]]</a></li>
            <li><a href="{c.get('blog', r + 'conseils.html')}">[[Conseils|Blog]]</a></li>
          </ul>
        </nav>
        <div>
          <h4>[[Contact|Contact]]</h4>
          <ul>
            <li><a href="mailto:contact@amweb.ma">contact@amweb.ma</a></li>
            <li class="mail-sub"><small>[[Suivi de projet|Project follow-up]]</small><a href="mailto:projet@amweb.ma">projet@amweb.ma</a></li>
            <li class="mail-sub"><small>[[Signaler un problème|Report an issue]]</small><a href="mailto:support@amweb.ma">support@amweb.ma</a></li>
            <li><a href="{WA}" rel="noopener">+212 780 611 376</a></li>
            <li><a href="https://instagram.com/amweb.ma" target="_blank" rel="noopener noreferrer" dir="ltr">@amweb.ma</a></li>
            <li>[[Kénitra, Maroc|Kénitra, Morocco]]</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span id="year">2026</span> AMweb. [[Tous droits réservés.|All rights reserved.]]</span>
        <a class="made" href="{c['home']}index.html" dir="ltr" aria-label="Made with love by AMweb">Made with <span class="heart" aria-hidden="true">❤️</span> by <svg viewBox="0 0 414 96" aria-hidden="true"><use href="#lg-full"/></svg></a>
        <span class="footer-legal"><a href="{r}mentions-legales.html">[[Mentions légales|Legal notice]]</a><a href="{r}confidentialite.html">[[Confidentialité|Privacy]]</a><button type="button" class="link-inline" data-consent-open>[[Cookies|Cookies]]</button></span>
      </div>
    </div>
  </footer>"""
