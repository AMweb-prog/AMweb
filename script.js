/* =============================================================
   AMweb - main script (index + offres)
   Motion: GSAP + ScrollTrigger + Lenis (degrades to static
   without them, and under prefers-reduced-motion)
   ============================================================= */
'use strict';

(function () {
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  /* ---------------- Language ---------------- */
  // Language comes from the page itself (FR at /, EN at /en/, AR at /ar/)
  const lang = (doc.lang || 'fr').slice(0, 2);
  const T3 = (fr, en, ar) => (lang === 'ar' ? ar : lang === 'en' ? en : fr);
  function track(name, params) { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) { /* ignore */ } }
  const WA_NUM = '212780611376';
  const openWA = msg => window.open(`https://wa.me/${WA_NUM}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  const phoneOk = v => v.replace(/[^0-9]/g, '').length >= 8;

  /* ---------------- Theme ---------------- */
  function setTheme(t) {
    doc.setAttribute('data-theme', t);
    store.set('amweb_theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F5F3EE' : '#0B0F1A');
    document.dispatchEvent(new CustomEvent('amweb:theme'));
  }

  /* ---------------- Orbit stage (canvas + DOM satellites) ---------------- */
  function OrbitStage(el) {
    const back = el.querySelector('.stage-back');
    const front = el.querySelector('.stage-front');
    const bctx = back.getContext('2d');
    const fctx = front.getContext('2d');
    const sats = Array.from(el.querySelectorAll('.sat'));
    const rings = [
      { r: .43, tilt: 72, rot: -11, speed: .045, parts: 2, phase: .4 },
      { r: .34, tilt: 62, rot: 17, speed: -.07, parts: 2, phase: 1.7 },
      { r: .495, tilt: 79, rot: 3, speed: .03, parts: 1, phase: 2.6 }
    ];
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: .2 + Math.random() * .8, tw: Math.random() * 6.28 }));
    let W = 0, H = 0, dpr = 1, orbitColor = '#3CF0C5', starColor = '#F5F3EE';
    let tx = 0, ty = 0, mx = 0, my = 0, running = false, raf = 0, satSize = [];
    const t0 = performance.now();

    function readColors() {
      const cs = getComputedStyle(doc);
      orbitColor = cs.getPropertyValue('--lg-orbit').trim() || '#3CF0C5';
      starColor = cs.getPropertyValue('--text').trim() || '#F5F3EE';
    }
    function resize() {
      const r = el.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      [back, front].forEach(c => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      satSize = sats.map(s => [s.offsetWidth, s.offsetHeight]);
      if (!running) draw((performance.now() - t0) / 1000);
    }
    function project(ring, a) {
      const R = ring.r * Math.min(W, H * 1.15) * (W < 520 ? .86 : 1);
      const t = (ring.tilt + my * 9) * Math.PI / 180;
      const rz = (ring.rot + mx * 7) * Math.PI / 180;
      const x = R * Math.cos(a), z = R * Math.sin(a);
      const y1 = z * Math.sin(t), d = z * Math.cos(t);
      const x2 = x * Math.cos(rz) - y1 * Math.sin(rz);
      const y2 = x * Math.sin(rz) + y1 * Math.cos(rz);
      const f = W * 1.7, s = f / (f - d);
      return { x: W / 2 + x2 * s, y: H / 2 + y2 * s, z: d / R, s };
    }
    function draw(t) {
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      bctx.clearRect(0, 0, W, H); fctx.clearRect(0, 0, W, H);
      // stars
      bctx.fillStyle = starColor;
      for (const s of stars) {
        bctx.globalAlpha = (.08 + .3 * s.z) * (.55 + .45 * Math.sin(t * 1.3 + s.tw));
        const sz = .6 + s.z * 1.1;
        bctx.fillRect(s.x * W - mx * 14 * s.z, s.y * H - my * 14 * s.z, sz, sz);
      }
      // dotted rings
      for (const ring of rings) {
        const N = 200;
        for (let i = 0; i < N; i += 1) {
          const p = project(ring, (i / N) * Math.PI * 2);
          const c = p.z >= 0 ? fctx : bctx;
          c.globalAlpha = p.z >= 0 ? .55 : .16;
          c.fillStyle = orbitColor;
          const sz = 1.25 * p.s;
          c.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        }
        // particles with trails
        for (let k = 0; k < ring.parts; k += 1) {
          const head = ring.phase + t * ring.speed * Math.PI * 2 + k * Math.PI;
          for (let j = 16; j >= 0; j -= 1) {
            const p = project(ring, head - Math.sign(ring.speed) * j * .022);
            const c = p.z >= 0 ? fctx : bctx;
            c.globalAlpha = (p.z >= 0 ? 1 : .35) * (1 - j / 17);
            c.fillStyle = orbitColor;
            c.beginPath();
            c.arc(p.x, p.y, (j === 0 ? 4.2 : 2.6 * (1 - j / 20)) * p.s, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
      bctx.globalAlpha = 1; fctx.globalAlpha = 1;
      // satellites ride the inner ring
      const r0 = rings[1];
      sats.forEach((s, i) => {
        const a = r0.phase + .9 + t * r0.speed * Math.PI * 2 + i * (Math.PI * 2 / sats.length);
        const p = project(r0, a);
        const [w, h] = satSize[i] || [0, 0];
        const sc = .82 + .22 * (p.z + 1) / 2;
        const sx = Math.min(Math.max(p.x - w / 2, 6), W - w - 6);
        s.style.transform = `translate3d(${sx.toFixed(1)}px, ${(p.y - h / 2).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
        s.style.opacity = p.z >= 0 ? 1 : .42;
        s.classList.toggle('is-front', p.z >= 0);
      });
    }
    function loop() {
      draw((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    readColors(); resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el);
    else window.addEventListener('resize', resize);
    document.addEventListener('amweb:theme', () => { readColors(); if (!running) draw(.6); });
    document.addEventListener('amweb:lang', () => { satSize = sats.map(s => [s.offsetWidth, s.offsetHeight]); if (!running) draw(.6); });
    const host = el.closest('section') || el;
    if (finePointer && !reduce) {
      host.addEventListener('pointermove', e => {
        tx = (e.clientX / window.innerWidth - .5) * 2;
        ty = (e.clientY / window.innerHeight - .5) * 2;
      });
      host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }
    if (reduce) { draw(.6); return; }
    new IntersectionObserver(entries => {
      entries.forEach(en => (en.isIntersecting ? start() : stop()));
    }, { threshold: 0 }).observe(el);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------------- Contact form -> WhatsApp ---------------- */
  const PLANS = {
    vitrine: { fr: 'Site Vitrine', en: 'Showcase site', ar: 'موقع تعريفي' },
    ecommerce: { fr: 'Site E-commerce', en: 'E-commerce site', ar: 'متجر إلكتروني' },
    premium: { fr: 'Site Premium', en: 'Premium site', ar: 'موقع بريميوم' },
    maintenance: { fr: 'Maintenance mensuelle', en: 'Monthly maintenance', ar: 'الصيانة الشهرية' }
  };
  /* ---------------- Send a form to the AMweb admin (/api/submit). WhatsApp stays available as a fallback. ---------------- */
  function sendLead(payload, opts) {
    const form = opts.form;
    const btn = form.querySelector('[type="submit"]');
    const hp = form.querySelector('[name="website"]');
    payload.website = hp ? hp.value : '';
    payload.lang = lang;
    payload.page = location.pathname;
    form.querySelectorAll('.form-done, .form-fail').forEach(n => n.remove());
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.innerHTML = '<span class="spin" aria-hidden="true"></span> ' + T3('Envoi…', 'Sending…', 'جارٍ الإرسال…'); }
    const restore = () => { if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = label; } };
    const place = box => { (opts.anchor || btn || form).insertAdjacentElement('afterend', box); };
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 15000);
    return fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
      .then(r => r.json().catch(() => ({})).then(j => ({ status: r.status, ok: r.ok && j.ok })))
      .catch(() => ({ status: 0, ok: false }))
      .then(res => {
        clearTimeout(timer);
        restore();
        if (res.ok) {
          const box = document.createElement('div');
          box.className = 'form-done';
          box.setAttribute('role', 'status');
          box.innerHTML = '<i class="ph ph-check-circle" aria-hidden="true"></i><div><strong></strong><span></span></div>';
          box.querySelector('strong').textContent = opts.okTitle || T3("Merci, c'est bien reçu !", 'Thank you, we got it!', 'شكراً، توصلنا بطلبك!');
          box.querySelector('span').textContent = opts.okText || T3('On vous répond sous 24h ouvrées.', 'We will reply within one business day.', 'سنرد عليك خلال 24 ساعة عمل.');
          if (!opts.noBox) place(box);
          if (opts.onDone) opts.onDone();
          return true;
        }
        const box = document.createElement('div');
        box.className = 'form-fail';
        box.setAttribute('role', 'alert');
        box.innerHTML = '<i class="ph ph-warning-circle" aria-hidden="true"></i><div><strong></strong><span></span><button type="button" class="btn btn-ghost btn-sm"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i> </button></div>';
        box.querySelector('strong').textContent = res.status === 429
          ? T3('Trop de demandes envoyées.', 'Too many requests sent.', 'تم إرسال طلبات كثيرة.')
          : T3("L'envoi n'a pas fonctionné.", 'Sending did not work.', 'لم ينجح الإرسال.');
        box.querySelector('span').textContent = T3('Envoyez-la sur WhatsApp : votre message est déjà rédigé.', 'Send it on WhatsApp: your message is already written.', 'أرسله عبر واتساب: رسالتك جاهزة.');
        const b = box.querySelector('button');
        b.appendChild(document.createTextNode(T3('Envoyer sur WhatsApp', 'Send on WhatsApp', 'إرسال عبر واتساب')));
        b.addEventListener('click', () => { openWA(opts.waMsg); track('whatsapp_fallback', { form: payload.type }); });
        place(box);
        return false;
      });
  }

  function initForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const chip = document.getElementById('planChip');
    const planName = document.getElementById('planName');
    let plan = new URLSearchParams(location.search).get('plan');
    if (!PLANS[plan]) plan = null;
    function paintPlan() {
      if (!chip) return;
      chip.classList.toggle('is-on', !!plan);
      if (plan) planName.textContent = PLANS[plan][lang];
    }
    paintPlan();
    document.addEventListener('amweb:lang', paintPlan);
    const clear = document.getElementById('planClear');
    if (clear) clear.addEventListener('click', () => {
      plan = null; paintPlan();
      history.replaceState(null, '', location.pathname + location.hash);
    });

    const val = id => (document.getElementById(id)?.value || '').trim();

    // Draft autosave (per visitor, this browser only)
    const FIELDS = ['nom', 'prenom', 'email', 'adresse', 'entreprise', 'tel'];
    const DKEY = 'amweb_draft';
    let draftTimer = 0;
    try {
      const saved = JSON.parse(store.get(DKEY) || 'null');
      const empty = FIELDS.every(id => !val(id));
      if (saved && empty && FIELDS.some(id => saved[id])) {
        FIELDS.forEach(id => { const el = document.getElementById(id); if (el && saved[id]) el.value = saved[id]; });
        new IntersectionObserver((en, io) => {
          if (en[0].isIntersecting) { toast(T3('Brouillon restauré', 'Draft restored', 'تمت استعادة المسودة')); io.disconnect(); }
        }, { threshold: .15 }).observe(form);
      }
    } catch (e) { /* ignore bad draft */ }
    form.addEventListener('input', () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => {
        const d = {}; FIELDS.forEach(id => { d[id] = val(id); });
        store.set(DKEY, JSON.stringify(d));
      }, 400);
    });
    const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    form.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const f = inp.closest('.field');
        if (f) { f.classList.remove('has-error'); inp.removeAttribute('aria-invalid'); }
      });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const checks = [['nom', v => v.length > 0], ['prenom', v => v.length > 0], ['email', emailOk]];
      let firstBad = null;
      checks.forEach(([id, ok]) => {
        const inp = document.getElementById(id);
        const good = ok(val(id));
        inp.closest('.field').classList.toggle('has-error', !good);
        if (!good) { inp.setAttribute('aria-invalid', 'true'); firstBad = firstBad || inp; }
        else inp.removeAttribute('aria-invalid');
      });
      if (firstBad) { firstBad.focus(); return; }

      const p = plan ? PLANS[plan][lang] : '';
      const n = `${val('nom')} ${val('prenom')}`.trim();
      const msg = T3(
        `Bonjour AMweb 👋\n\nJe souhaite démarrer un projet avec vous.\n\n${p ? `*Forfait :* ${p}\n` : ''}${plan === 'premium' ? '*Objet :* prendre rendez-vous pour définir le projet\n' : ''}*Nom :* ${n}\n*Email :* ${val('email')}\n*Adresse :* ${val('adresse')}\n*Entreprise :* ${val('entreprise')}\n*Téléphone :* ${val('tel')}\n\nMerci de me recontacter !`,
        `Hello AMweb 👋\n\nI would like to start a project with you.\n\n${p ? `*Package:* ${p}\n` : ''}${plan === 'premium' ? '*Request:* book a meeting to scope the project\n' : ''}*Name:* ${n}\n*Email:* ${val('email')}\n*Address:* ${val('adresse')}\n*Company:* ${val('entreprise')}\n*Phone:* ${val('tel')}\n\nPlease get back to me!`,
        `مرحباً AMweb 👋\n\nأرغب في بدء مشروع معكم.\n\n${p ? `*العرض:* ${p}\n` : ''}${plan === 'premium' ? '*الطلب:* حجز موعد لتحديد المشروع\n' : ''}*الاسم:* ${n}\n*البريد الإلكتروني:* ${val('email')}\n*العنوان:* ${val('adresse')}\n*الشركة:* ${val('entreprise')}\n*الهاتف:* ${val('tel')}\n\nشكراً على التواصل معي!`);
      sendLead({
        type: plan === 'premium' ? 'rdv' : 'contact', nom: n, email: val('email'), telephone: val('tel'), entreprise: val('entreprise'),
        details: { forfait: p || null, adresse: val('adresse') || null },
      }, {
        form, waMsg: msg,
        okText: T3('On revient vers vous très vite, par email ou par téléphone.', 'We will get back to you very soon, by email or phone.', 'سنعود إليك قريباً جداً عبر البريد أو الهاتف.'),
        onDone: () => {
          track('generate_lead', { method: 'contact_form', plan: plan || 'none' });
          form.reset();
          try { localStorage.removeItem(DKEY); } catch (err) { /* ignore */ }
        },
      });
    });
  }

  /* ---------------- Offres: plan selector ---------------- */
  function initPlans() {
    const plans = Array.from(document.querySelectorAll('.plan'));
    if (!plans.length) return;
    const mobile = window.matchMedia('(max-width: 1023px)');
    function activate(target, toggle) {
      plans.forEach(p => {
        let on = p === target;
        if (toggle && mobile.matches && p === target && p.classList.contains('is-active')) on = false;
        p.classList.toggle('is-active', on);
        p.querySelector('.plan-head').setAttribute('aria-expanded', String(on));
      });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    plans.forEach(p => p.querySelector('.plan-head').addEventListener('click', () => { activate(p, true); track('select_plan', { plan: p.dataset.plan }); }));
    window.__activatePlan = id => {
      const p = plans.find(x => x.dataset.plan === id);
      if (!p) return;
      if (window.__setView) window.__setView('one');
      activate(p);
      requestAnimationFrame(() => {
        const head = p.querySelector('.plan-head');
        const y = head.getBoundingClientRect().top + window.scrollY - 110;
        if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.3 });
        else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    };
    const fromHash = plans.find(p => '#' + p.id === location.hash);
    if (fromHash) {
      activate(fromHash);
      setTimeout(() => {
        const head = fromHash.querySelector('.plan-head');
        const y = head.getBoundingClientRect().top + window.scrollY - 110;
        if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      }, 60);
    }
  }

  /* ---------------- Menu ---------------- */
  function initMenu() {
    const burger = document.getElementById('burger');
    const menu = document.getElementById('menu');
    if (!burger || !menu) return;
    const set = open => {
      doc.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => set(!doc.classList.contains('menu-open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  /* ---------------- Anchor links (Lenis aware) ---------------- */
  function initAnchors() {
    document.querySelectorAll('a[href*="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return;
        const target = document.querySelector(url.hash);
        if (!target) return;
        e.preventDefault();
        const offset = url.hash === '#hero' || url.hash === '#top' ? 0 : (url.hash === '#services' ? 0 : -24);
        if (window.__lenis) window.__lenis.scrollTo(target, { offset, duration: 1.4 });
        else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        // keep the address bar clean: amweb.ma/ rather than amweb.ma/#services
        history.replaceState(null, '', location.pathname + url.search);
        if (url.hash === '#main') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
      });
    });
  }

  /* ---------------- Active nav link ---------------- */
  function initActiveNav() {
    const links = document.querySelectorAll('.nav-links a[data-nav]');
    if (!links.length || document.body.dataset.page !== 'index') return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.toggle('is-active', l.dataset.nav === en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['hero', 'about', 'services', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Motion (GSAP) ---------------- */
  function initMotion() {
    const gsap = window.gsap, ST = window.ScrollTrigger;
    const nav = document.getElementById('nav');
    const progress = document.querySelector('.progress');

    if (!gsap || !ST) {
      // Static fallback: keep nav background readable
      if (nav) nav.classList.add('is-scrolled');
      return;
    }
    gsap.registerPlugin(ST);

    // Smooth scroll
    if (!reduce && window.Lenis) {
      const lenis = new window.Lenis({ lerp: .1, smoothWheel: true });
      window.__lenis = lenis;
      lenis.on('scroll', ST.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Nav state + progress bar
    ST.create({
      start: 0, end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        nav.classList.toggle('is-hidden', self.direction === 1 && y > 500 && !doc.classList.contains('menu-open'));
        if (progress) progress.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      }
    });

    if (reduce) return;

    // Hero scroll-out
    const mm = gsap.matchMedia();
    document.querySelectorAll('.hero').forEach(hero => {
      const stage = hero.querySelector('.stage');
      const copy = hero.querySelector('.hero-copy');
      mm.add('(min-width: 1024px)', () => {
        gsap.set(stage, { yPercent: -50 });
        gsap.to(stage, { scale: 1.18, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(copy, { y: -90, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '20% top', end: 'bottom top', scrub: true } });
      });
    });

    // Generic headline reveals
    gsap.set('[data-reveal]', { y: 48, opacity: 0 });
    ST.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .08 })
    });

    // Manifesto: word-by-word scrub (re-split on language change)
    const mani = document.getElementById('manifesto');
    let maniTween = null;
    function splitManifesto() {
      if (!mani) return;
      const text = mani.dataset.text || (mani.dataset.text = mani.textContent.trim());
      mani.innerHTML = text.split(/\s+/).map(w => `<span class="w">${w.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</span>`).join(' ');
      if (maniTween) { maniTween.scrollTrigger && maniTween.scrollTrigger.kill(); maniTween.kill(); }
      maniTween = gsap.fromTo(mani.querySelectorAll('.w'), { opacity: .14 }, {
        opacity: 1, ease: 'none', stagger: .06,
        scrollTrigger: { trigger: mani, start: 'top 78%', end: 'bottom 42%', scrub: true }
      });
    }
    splitManifesto();
    document.addEventListener('amweb:lang', () => { splitManifesto(); ST.refresh(); });

    // Counters
    const fmtNum = (v, dec) => { const t = v.toFixed(dec); return lang === 'en' ? t : t.replace('.', ','); };
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = +el.dataset.count; const dec = +(el.dataset.dec || 0); const o = { v: 0 };
      el.textContent = fmtNum(0, dec);
      document.addEventListener('amweb:lang', () => { el.textContent = fmtNum(o.v, dec); });
      ST.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: target, duration: 1.8, ease: 'expo.out', onUpdate: () => { el.textContent = fmtNum(o.v, dec); } })
      });
    });

    // Image reveal + parallax
    document.querySelectorAll('.about-media').forEach(m => {
      gsap.fromTo(m, { clipPath: 'inset(18% 0% 18% 0% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: m, start: 'top 90%', end: 'top 35%', scrub: true } });
    });
    document.querySelectorAll('.about-media img[data-parallax]').forEach(img => {
      gsap.fromTo(img, { yPercent: -10 }, { yPercent: 2, ease: 'none', scrollTrigger: { trigger: img.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Marquee: velocity-reactive, flips with scroll direction
    const track = document.getElementById('marquee');
    if (track) {
      const group = track.querySelector('.marquee-group');
      track.appendChild(group.cloneNode(true));
      let gw = group.offsetWidth, x = 0, dir = 1, boost = 0;
      document.addEventListener('amweb:lang', () => {
        const groups = track.querySelectorAll('.marquee-group');
        groups[1].replaceWith(groups[0].cloneNode(true));
        gw = groups[0].offsetWidth;
      });
      window.addEventListener('resize', () => { gw = group.offsetWidth; });
      ST.create({
        trigger: track, start: 'top bottom', end: 'bottom top',
        onUpdate(self) { dir = self.direction; boost = Math.min(1400, Math.abs(self.getVelocity()) * .6); }
      });
      gsap.ticker.add((time, dt) => {
        boost *= .93;
        x -= dir * (60 + boost) * dt / 1000;
        if (x <= -gw) x += gw;
        if (x > 0) x -= gw;
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      });
    }

    // Services: horizontal pan (desktop, and phones/tablets tall enough to show a full card)
    const hpan = document.getElementById('hpan');
    const hTrack = document.getElementById('hpanTrack');
    const hProg = document.getElementById('hpanProgress');
    if (hpan && hTrack) {
      mm.add({ desk: '(min-width: 1024px)', touch: '(max-width: 1023px) and (min-height: 560px)' }, ctx => {
        hpan.classList.add('is-h');
        const dist = () => Math.max(0, hTrack.scrollWidth - window.innerWidth);
        const tween = gsap.to(hTrack, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: hpan, start: 'top top', end: () => '+=' + dist(),
            pin: true, scrub: ctx.conditions.desk ? 1 : .5, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: self => { if (hProg) hProg.style.transform = `scaleX(${self.progress.toFixed(4)})`; }
          }
        });
        hTrack.querySelectorAll('.panel-media img').forEach(img => {
          gsap.fromTo(img, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.closest('.panel'), containerAnimation: tween, start: 'left right', end: 'center center', scrub: true } });
        });
        return () => hpan.classList.remove('is-h');
      });
    }

    // Process: sticky stack, previous card recedes as next arrives
    const cards = gsap.utils.toArray('.pcard');
    cards.forEach((card, i) => {
      if (i === cards.length - 1) return;
      gsap.to(card, {
        scale: .9 + i * .02, '--dim': .55, ease: 'none',
        scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true }
      });
    });

    // Bento tiles enter
    if (document.querySelector('.tile')) gsap.set('.tile', { y: 60, opacity: 0 });
    if (document.querySelector('.tile')) ST.batch('.tile', { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .08 }) });

    // Plans enter (offres)
    if (document.querySelector('.plan-head')) {
      gsap.from('.plan-head', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '#plans', start: 'top 85%' } });
    }

    window.addEventListener('load', () => ST.refresh());
  }

  /* ---------------- Micro-interactions ---------------- */
  function initMicro() {
    // Footer orbit draw
    const fl = document.getElementById('footerLogo');
    if (fl) new IntersectionObserver((en, io) => { if (en[0].isIntersecting) { fl.classList.add('is-in'); io.disconnect(); } }, { threshold: .35 }).observe(fl);

    if (!finePointer || reduce) return;
    // Spotlight on tiles
    document.querySelectorAll('.tile, .plan-head').forEach(t => {
      t.addEventListener('pointermove', e => {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        t.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    // Magnetic buttons
    if (!window.gsap) return;
    document.querySelectorAll('.magnetic').forEach(el => {
      const xTo = window.gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1, .45)' });
      const yTo = window.gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1, .45)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .28);
        yTo((e.clientY - (r.top + r.height / 2)) * .38);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }


  /* ---------------- Toast ---------------- */
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = '<i class="ph ph-check-circle" aria-hidden="true"></i><span></span>';
    t.lastChild.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ---------------- Live studio status (Mo-Fr 09:00-18:00, Kénitra time) ---------------- */
  function initStatus() {
    const els = Array.from(document.querySelectorAll('[data-status]'));
    if (!els.length || !window.Intl) return;
    const T = {
      fr: { open: 'Studio ouvert, réponse rapide', today: "Fermé, ouvre aujourd'hui à 9h", tomorrow: 'Fermé, ouvre demain à 9h', monday: 'Fermé, ouvre lundi à 9h', clock: t => `${t} à Kénitra` },
      en: { open: 'Studio open, quick reply', today: 'Closed, opens today at 9am', tomorrow: 'Closed, opens tomorrow at 9am', monday: 'Closed, opens Monday at 9am', clock: t => `${t} in Kénitra` },
      ar: { open: 'الاستوديو مفتوح، رد سريع', today: 'مغلق، يفتح اليوم على الساعة 9', tomorrow: 'مغلق، يفتح غداً على الساعة 9', monday: 'مغلق، يفتح يوم الاثنين على الساعة 9', clock: t => `${t} بالقنيطرة` }
    };
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Casablanca', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
    catch (e) { return; }
    function paint() {
      const parts = fmt.formatToParts(new Date());
      const get = k => (parts.find(x => x.type === k) || {}).value;
      const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
      const mins = (+get('hour')) * 60 + (+get('minute'));
      const weekday = day >= 0 && day <= 4;
      const open = weekday && mins >= 540 && mins < 1080;
      let key = 'open';
      if (!open) key = weekday && mins < 540 ? 'today' : (day >= 0 && day <= 3 ? 'tomorrow' : 'monday');
      const L = T[lang];
      els.forEach(el => {
        el.classList.add('is-ready');
        el.classList.toggle('is-open', open);
        el.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${L[key]}</span><span class="clock">${L.clock(get('hour') + ':' + get('minute'))}</span>`;
      });
    }
    paint();
    setInterval(paint, 30000);
    document.addEventListener('amweb:lang', paint);
  }

  /* ---------------- Copy to clipboard ---------------- */
  function initCopy() {
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        try { await navigator.clipboard.writeText(text); }
        catch (e) {
          const ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (err) { /* ignore */ }
          ta.remove();
        }
        const icon = btn.querySelector('i');
        btn.classList.add('is-done'); if (icon) icon.className = 'ph ph-check';
        toast(T3('Email copié', 'Email copied', 'تم نسخ البريد الإلكتروني')); track('copy_email');
        setTimeout(() => { btn.classList.remove('is-done'); if (icon) icon.className = 'ph ph-copy'; }, 1800);
      });
    });
  }

  /* ---------------- Pricing views: one plan / compare all ---------------- */
  function initCompare() {
    const sec = document.getElementById('pricing');
    const cmp = document.getElementById('compare');
    if (!sec || !cmp) return;
    const btns = Array.from(sec.querySelectorAll('.seg-btn'));
    function setView(v) {
      const all = v === 'all';
      sec.classList.toggle('is-compare', all);
      cmp.hidden = !all;
      btns.forEach(b => { const on = b.dataset.view === v; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    btns.forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); if (b.dataset.view === 'all') track('view_compare'); }));
    window.__setView = setView;
  }

  /* ---------------- Plan finder ---------------- */
  function initFinder() {
    const card = document.getElementById('finderCard');
    if (!card) return;
    const steps = Array.from(card.querySelectorAll('.fstep'));
    const bars = Array.from(card.querySelectorAll('.fsteps-bar span'));
    const $ = id => document.getElementById(id);
    const count = $('finderCount'), back = $('finderBack'), reset = $('finderReset'), result = $('finderResult');
    const ans = {};
    let i = 0;
    const META = {
      vitrine: { price: '3 000', time: { fr: 'Livré en 1 à 2 semaines', en: 'Delivered in 1 to 2 weeks', ar: 'التسليم خلال 1 إلى 2 أسابيع' } },
      ecommerce: { price: '7 500', time: { fr: 'Livré en 3 à 4 semaines', en: 'Delivered in 3 to 4 weeks', ar: 'التسليم خلال 3 إلى 4 أسابيع' } },
      premium: { price: '10 000', from: true, time: { fr: 'Prix et délai définis en rendez-vous', en: 'Price and timeline set in a meeting', ar: 'السعر والمدة يُحدَّدان خلال موعد' } }
    };
    // Prices and timelines published from the admin (assets/data/realisations.js) override the defaults above
    const OFFERS = window.AMWEB_OFFERS || {};
    Object.keys(META).forEach(k => {
      const o = OFFERS[k];
      if (!o) return;
      if (o.price && o.price[lang]) META[k].price = o.price[lang];
      if (o.time && o.time[lang]) META[k].time = Object.assign({}, META[k].time, { [lang]: o.time[lang] });
    });
    const R = {
      vitrine: [
        { fr: '3 pages sur mesure, idéal pour présenter votre activité', en: '3 custom pages, ideal to present your business', ar: '3 صفحات حسب الطلب، مثالية لتقديم نشاطك' },
        { fr: 'Design responsive et SEO de base', en: 'Responsive design and basic SEO', ar: 'تصميم متجاوب وSEO أساسي' },
        { fr: 'Hébergement 1 an inclus', en: '1 year hosting included', ar: 'استضافة سنة مشمولة' }],
      sell: { fr: 'Boutique en ligne complète avec paiement intégré', en: 'Full online store with integrated payment', ar: 'متجر إلكتروني متكامل مع دفع مدمج' },
      pages: { fr: 'Pages illimitées pour toutes vos offres', en: 'Unlimited pages for all your offers', ar: 'صفحات غير محدودة لكل عروضك' },
      ecommerce: [
        { fr: 'Tableau de bord admin et SEO avancé', en: 'Admin dashboard and advanced SEO', ar: 'لوحة تحكم وSEO متقدم' },
        { fr: 'Support prioritaire 3 mois', en: '3 months priority support', ar: 'دعم ذو أولوية لمدة 3 أشهر' },
        { fr: 'Hébergement 1 an inclus', en: '1 year hosting included', ar: 'استضافة سنة مشمولة' }],
      premium: [
        { fr: 'Application ou CRM construit autour de votre métier', en: 'An app or CRM built around your business', ar: 'تطبيق أو CRM مبني حول نشاطك' },
        { fr: 'SEO avancé et design UI/UX haut de gamme', en: 'Advanced SEO and high-end UI/UX design', ar: 'SEO متقدم وتصميم UI/UX راقٍ' },
        { fr: 'Hébergement 2 ans et support VIP 6 mois', en: '2 years hosting and 6 months VIP support', ar: 'استضافة سنتين ودعم VIP لمدة 6 أشهر' }]
    };
    function decide() {
      if (ans.custom === 'yes') return 'premium';
      if (ans.sell === 'sell' || ans.pages === 'm' || ans.pages === 'l') return 'ecommerce';
      return 'vitrine';
    }
    function reasons(p) {
      if (p !== 'ecommerce') return R[p];
      const r = [];
      if (ans.sell === 'sell') r.push(R.sell);
      if (ans.pages && ans.pages !== 's') r.push(R.pages);
      return r.concat(R.ecommerce).slice(0, 3);
    }
    function note(p) {
      if (p === 'premium' && (ans.time === 'fast' || ans.time === 'month')) return T3('Le Site Premium est construit sur mesure : on fixe ensemble le délai et le prix lors du rendez-vous.', 'The Premium site is fully custom: we set the timeline and price together in the meeting.', 'الموقع البريميوم يُبنى حسب الطلب: نحدد المدة والسعر معاً خلال الموعد.');
      if (ans.time === 'fast' && p === 'ecommerce') return T3('Délai serré : le Site E-commerce demande 3 à 4 semaines. On peut prioriser une première version.', 'Tight timeline: the E-commerce site takes 3 to 4 weeks. We can prioritise a first version.', 'المدة ضيقة: المتجر الإلكتروني يتطلب 3 إلى 4 أسابيع. يمكننا إعطاء الأولوية لنسخة أولى.');
      if (ans.custom === 'unsure' && p !== 'premium') return T3('Si des besoins sur mesure apparaissent (application, CRM), le Site Premium pourra prendre le relais. On en parle ensemble.', 'If custom needs come up (app, CRM), the Premium site can take over. We will talk it through.', 'إذا ظهرت احتياجات خاصة (تطبيق، CRM) يمكن للموقع البريميوم أن يتكفل بها. سنتحدث عن ذلك معاً.');
      if (ans.sell === 'later' && p === 'vitrine') return T3('Vous pourrez passer au Site E-commerce quand vous serez prêt à vendre.', 'You can move up to the E-commerce site when you are ready to sell.', 'يمكنك الانتقال إلى المتجر الإلكتروني عندما تكون مستعداً للبيع.');
      return '';
    }
    function show(n, dir) {
      i = n;
      result.hidden = true;
      steps.forEach((st, k) => { st.classList.toggle('is-active', k === n); st.classList.toggle('is-back', k === n && dir < 0); });
      bars.forEach((b, k) => b.classList.toggle('is-done', k < n));
      count.textContent = `${n + 1} / ${steps.length}`;
      back.hidden = n === 0; reset.hidden = true;
    }
    function render() {
      const p = decide();
      i = steps.length;
      steps.forEach(st => st.classList.remove('is-active'));
      bars.forEach(b => b.classList.add('is-done'));
      count.textContent = T3('Terminé', 'Done', 'تم');
      back.hidden = false; reset.hidden = false;
      $('frName').textContent = PLANS[p][lang].replace('-', '\u2011');
      $('frPrice').textContent = META[p].price;
      $('frFrom').hidden = !META[p].from;
      $('frChoose').innerHTML = '<span></span> <i class="ph ph-arrow-right" aria-hidden="true"></i>';
      $('frChoose').firstChild.textContent = p === 'premium' ? T3('Réserver un rendez-vous', 'Book a meeting', 'احجز موعداً') : T3('Choisir ce forfait', 'Choose this package', 'اختر هذا العرض');
      if (p === 'premium') $('frChoose').setAttribute('data-book', 'premium'); else $('frChoose').removeAttribute('data-book');
      $('frTime').textContent = META[p].time[lang];
      $('frReasons').innerHTML = '';
      reasons(p).forEach(r => {
        const li = document.createElement('li');
        li.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i><span></span>';
        li.lastChild.textContent = r[lang];
        $('frReasons').appendChild(li);
      });
      const n = note(p);
      $('frNote').hidden = !n; $('frNote').textContent = n;
      $('frChoose').href = `./?plan=${p}#contact`;
      card.dataset.result = p;
      result.hidden = false;
      track('finder_complete', { plan: p });
    }
    steps.forEach((st, k) => {
      st.querySelectorAll('.fopt').forEach(opt => {
        opt.addEventListener('click', e => {
          ans[st.dataset.key] = opt.dataset.value;
          st.querySelectorAll('.fopt').forEach(o => o.classList.toggle('is-picked', o === opt));
          const fromKeyboard = e.detail === 0;
          setTimeout(() => {
            if (k < steps.length - 1) show(k + 1, 1); else render();
            if (fromKeyboard) {
              const next = k < steps.length - 1 ? steps[k + 1].querySelector('.fopt') : $('frChoose');
              if (next) next.focus();
            }
          }, reduce ? 0 : 260);
        });
      });
    });
    back.addEventListener('click', () => show(Math.max(0, i - 1), -1));
    reset.addEventListener('click', () => {
      Object.keys(ans).forEach(k => delete ans[k]);
      card.querySelectorAll('.fopt').forEach(o => o.classList.remove('is-picked'));
      show(0, -1);
    });
    $('frDetail').addEventListener('click', () => { if (window.__activatePlan) window.__activatePlan(card.dataset.result); });
    document.addEventListener('amweb:lang', () => { if (!result.hidden) render(); else count.textContent = `${i + 1} / ${steps.length}`; });
  }

  /* ---------------- Clickable orbit satellites ---------------- */
  function initSats() {
    document.querySelectorAll('.sat[data-go]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [kind, val] = btn.dataset.go.split(':');
        if (kind === 'plan' && window.__activatePlan) { window.__activatePlan(val); return; }
        if (kind !== 'panel') return;
        const hpan = document.getElementById('hpan');
        const track = document.getElementById('hpanTrack');
        const panel = track && track.querySelectorAll('.panel')[+val];
        if (!panel) return;
        const st = window.ScrollTrigger && window.ScrollTrigger.getAll().find(t => t.pin === hpan);
        let y;
        if (st) {
          const dist = track.scrollWidth - window.innerWidth;
          const x = Math.min(dist, Math.max(0, panel.offsetLeft - (window.innerWidth - panel.offsetWidth) / 2));
          y = st.start + (x / dist) * (st.end - st.start);
        } else {
          y = panel.getBoundingClientRect().top + window.scrollY - 90;
        }
        if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.6 });
        else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }


  /* ---------------- Booking dialog (meeting request via WhatsApp) ---------------- */
  function initBooking() {
    const dlg = document.getElementById('bookDialog');
    if (!dlg) return;
    const form = document.getElementById('bookForm');
    const daysBox = document.getElementById('bookDays');
    const locale = T3('fr-FR', 'en-GB', 'ar-MA');
    const wd = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const dm = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    const full = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    const d = new Date(); let n = 0;
    while (n < 10) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip chip-day'; b.dataset.label = full.format(d);
      b.innerHTML = '<span></span><small></small>';
      b.firstChild.textContent = wd.format(d); b.lastChild.textContent = dm.format(d);
      daysBox.appendChild(b); n += 1;
    }
    const pick = (box, el) => box.querySelectorAll('.chip').forEach(c => { const on = c === el; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
    ['bookDays', 'bookTimes', 'bookModes'].forEach(id => {
      const box = document.getElementById(id);
      box.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; pick(box, c); box.closest('.book-set').classList.remove('has-error'); });
    });
    const close = () => { dlg.close(); };
    dlg.addEventListener('close', () => { if (window.__lenis) window.__lenis.start(); });
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('[data-close]').addEventListener('click', close);
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-book]');
      if (!t || typeof dlg.showModal !== 'function') return;
      e.preventDefault();
      dlg.dataset.plan = t.dataset.book || '';
      dlg.showModal();
      if (window.__lenis) window.__lenis.stop();
    });
    form.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => inp.closest('.field').classList.remove('has-error')));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const day = daysBox.querySelector('.is-on');
      const time = document.querySelector('#bookTimes .is-on');
      const mode = document.querySelector('#bookModes .is-on');
      const name = document.getElementById('bkName'), phone = document.getElementById('bkPhone');
      let bad = null;
      if (!day) { daysBox.closest('.book-set').classList.add('has-error'); bad = bad || daysBox; }
      if (!time) { const tb = document.getElementById('bookTimes'); tb.closest('.book-set').classList.add('has-error'); bad = bad || tb; }
      if (!name.value.trim()) { name.closest('.field').classList.add('has-error'); bad = bad || name; }
      if (!phoneOk(phone.value)) { phone.closest('.field').classList.add('has-error'); bad = bad || phone; }
      if (bad) { if (bad.focus) bad.focus(); return; }
      const plan = PLANS[dlg.dataset.plan] ? PLANS[dlg.dataset.plan][lang] : '';
      const modeTxt = mode ? mode.textContent.trim() : '';
      const msg = T3(
        `Bonjour AMweb 👋\n\nJe souhaite réserver un rendez-vous.\n\n${plan ? `*Forfait :* ${plan}\n` : ''}*Date :* ${day.dataset.label}\n*Heure :* ${time.dataset.time}\n*Format :* ${modeTxt}\n*Nom :* ${name.value.trim()}\n*Téléphone :* ${phone.value.trim()}\n\nMerci de confirmer !`,
        `Hello AMweb 👋\n\nI would like to book a meeting.\n\n${plan ? `*Package:* ${plan}\n` : ''}*Date:* ${day.dataset.label}\n*Time:* ${time.dataset.time}\n*Format:* ${modeTxt}\n*Name:* ${name.value.trim()}\n*Phone:* ${phone.value.trim()}\n\nPlease confirm!`,
        `مرحباً AMweb 👋\n\nأرغب في حجز موعد.\n\n${plan ? `*العرض:* ${plan}\n` : ''}*التاريخ:* ${day.dataset.label}\n*الساعة:* ${time.dataset.time}\n*الطريقة:* ${modeTxt}\n*الاسم:* ${name.value.trim()}\n*الهاتف:* ${phone.value.trim()}\n\nالمرجو التأكيد!`);
      sendLead({
        type: 'rdv', nom: name.value.trim(), telephone: phone.value.trim(),
        details: { forfait: plan || null, date: day.dataset.label, heure: time.dataset.time, format: modeTxt || null },
      }, {
        form, waMsg: msg, noBox: true,
        onDone: () => {
          track('book_meeting', { plan: dlg.dataset.plan || 'none' });
          form.reset();
          form.querySelectorAll('.chip.is-on').forEach(c => { c.classList.remove('is-on'); c.setAttribute('aria-pressed', 'false'); });
          close();
          toast(T3('Rendez-vous demandé : on vous confirme rapidement.', 'Meeting requested: we will confirm quickly.', 'تم طلب الموعد: سنؤكده لك بسرعة.'));
        },
      });
    });
  }

  /* ---------------- Free audit form ---------------- */
  function initAudit() {
    const form = document.getElementById('auditForm');
    if (!form) return;
    const site = document.getElementById('auSite'), none = document.getElementById('auNoSite');
    none.addEventListener('change', () => { site.disabled = none.checked; site.closest('.field').classList.remove('has-error'); });
    form.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const f = inp.closest('.field'); if (f) f.classList.remove('has-error'); }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('auName'), phone = document.getElementById('auPhone');
      const sector = document.getElementById('auSector').value.trim();
      let bad = null;
      if (!none.checked && site.value.trim().length < 4) { site.closest('.field').classList.add('has-error'); bad = bad || site; }
      if (!name.value.trim()) { name.closest('.field').classList.add('has-error'); bad = bad || name; }
      if (!phoneOk(phone.value)) { phone.closest('.field').classList.add('has-error'); bad = bad || phone; }
      if (bad) { bad.focus(); return; }
      const s = none.checked ? T3('Pas encore de site', 'No website yet', 'ليس لدي موقع بعد') : site.value.trim();
      const msg = T3(
        `Bonjour AMweb 👋\n\nJe souhaite recevoir l'audit gratuit de mon site.\n\n*Site :* ${s}\n*Activité :* ${sector || '-'}\n*Nom :* ${name.value.trim()}\n*WhatsApp :* ${phone.value.trim()}\n\nMerci !`,
        `Hello AMweb 👋\n\nI would like my free website audit.\n\n*Website:* ${s}\n*Business:* ${sector || '-'}\n*Name:* ${name.value.trim()}\n*WhatsApp:* ${phone.value.trim()}\n\nThank you!`,
        `مرحباً AMweb 👋\n\nأرغب في الحصول على التدقيق المجاني لموقعي.\n\n*الموقع:* ${s}\n*النشاط:* ${sector || '-'}\n*الاسم:* ${name.value.trim()}\n*WhatsApp:* ${phone.value.trim()}\n\nشكراً!`);
      sendLead({
        type: 'audit', nom: name.value.trim(), telephone: phone.value.trim(),
        details: { site: s, activite: sector || null },
      }, {
        form, waMsg: msg,
        okText: T3('Votre audit arrive sous 48h sur WhatsApp.', 'Your audit arrives within 48 hours on WhatsApp.', 'يصلك التدقيق خلال 48 ساعة عبر واتساب.'),
        onDone: () => { track('audit_request', { has_site: !none.checked }); form.reset(); site.disabled = false; },
      });
    });
  }

  /* ---------------- Question forms (Conseils pages) ---------------- */
  function initQuestions() {
    document.querySelectorAll('.ask-form').forEach(form => {
      form.querySelectorAll('input, textarea').forEach(inp => inp.addEventListener('input', () => { const f = inp.closest('.field'); if (f) f.classList.remove('has-error'); }));
      form.addEventListener('submit', e => {
        e.preventDefault();
        const name = form.querySelector('[name="qname"]'), contact = form.querySelector('[name="qcontact"]'), q = form.querySelector('[name="qtext"]');
        let bad = null;
        if (!name.value.trim()) { name.closest('.field').classList.add('has-error'); bad = bad || name; }
        if (contact.value.trim().length < 6) { contact.closest('.field').classList.add('has-error'); bad = bad || contact; }
        if (q.value.trim().length < 5) { q.closest('.field').classList.add('has-error'); bad = bad || q; }
        if (bad) { bad.focus(); return; }
        const topic = form.dataset.topic || '';
        const about = topic ? T3(` à propos de l'article « ${topic} »`, ` about the article "${topic}"`, ` حول مقال «${topic}»`) : '';
        const msg = T3(
          `Bonjour AMweb 👋\n\nJ'ai une question${about} :\n\n${q.value.trim()}\n\n*Nom :* ${name.value.trim()}\n*Contact :* ${contact.value.trim()}`,
          `Hello AMweb 👋\n\nI have a question${about}:\n\n${q.value.trim()}\n\n*Name:* ${name.value.trim()}\n*Contact:* ${contact.value.trim()}`,
          `مرحباً AMweb 👋\n\nلدي سؤال${about}:\n\n${q.value.trim()}\n\n*الاسم:* ${name.value.trim()}\n*التواصل:* ${contact.value.trim()}`);
        sendLead({
          type: 'question', nom: name.value.trim(), email: contact.value.trim(), message: q.value.trim(),
          details: { article: topic || null },
        }, {
          form, waMsg: msg,
          okText: T3('On vous répond personnellement, très vite.', 'We will reply personally, very soon.', 'سنجيبك شخصياً في أقرب وقت.'),
          onDone: () => { track('ask_question', { topic: topic || 'general' }); form.reset(); },
        });
      });
    });
  }

  /* ---------------- Projects & testimonials from assets/data/realisations.js ---------------- */
  function initRealisations() {
    const sec = document.getElementById('realisations');
    const data = window.AMWEB_DATA || {};
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const quotes = Array.isArray(data.testimonials) ? data.testimonials : [];
    if (!sec || (!projects.length && !quotes.length)) return;
    const pickT = v => (v && typeof v === 'object' ? (v[lang] || v.fr || '') : (v || ''));
    const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const root = document.querySelector('link[rel="stylesheet"][href$="style.css"]').getAttribute('href').replace('style.css', '');
    const img = src => (/^https?:/.test(src) ? src : root + src);
    document.getElementById('realGrid').innerHTML = projects.map(p => `
      <article class="real">
        ${p.url ? `<a class="tile-link" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="${esc(pickT(p.name))}"></a>` : ''}
        <div class="real-media"><img src="${esc(img(p.image))}" alt="${esc(pickT(p.alt) || pickT(p.name))}" loading="lazy" decoding="async" width="1600" height="1000" /></div>
        <div class="real-body"><div><h3>${esc(pickT(p.name))}</h3><p>${esc(pickT(p.sector))}${p.result ? ' · ' + esc(pickT(p.result)) : ''}</p></div>${p.url ? '<span class="tile-arrow" aria-hidden="true"><i class="ph ph-arrow-up-right"></i></span>' : ''}</div>
      </article>`).join('');
    if (quotes.length) {
      const qg = document.getElementById('quoteGrid');
      qg.hidden = false;
      qg.innerHTML = quotes.slice(0, 3).map(q => `<figure class="quote"><p>“${esc(pickT(q.quote))}”</p><footer><strong>${esc(q.name)}</strong>${esc(pickT(q.role))}</footer></figure>`).join('');
    }
    sec.hidden = false;
  }

  /* ---------------- Cookie consent (Consent Mode v2) ---------------- */
  function initConsent() {
    const box = document.getElementById('consent');
    if (!box) return;
    let choice = null; try { choice = localStorage.getItem('amweb_consent'); } catch (e) { /* ignore */ }
    if (!choice) setTimeout(() => { box.hidden = false; }, 1800);
    box.querySelectorAll('[data-consent]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.consent;
      store.set('amweb_consent', v);
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: v });
      box.hidden = true;
    }));
    document.querySelectorAll('[data-consent-open]').forEach(b => b.addEventListener('click', () => { box.hidden = false; }));
  }

  /* ---------------- Mobile contact bar: step aside near forms and footer ---------------- */
  function initMbar() {
    const bar = document.getElementById('mbar');
    if (!bar) return;
    const seen = new Set();
    const targets = document.querySelectorAll('form, .footer, .hero, .page-head, .page-hero');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
      bar.classList.toggle('is-hidden', seen.size > 0);
    }, { threshold: .05 });
    targets.forEach(t => { if (!t.closest('dialog')) io.observe(t); });
  }

  /* ---------------- Analytics: WhatsApp / email clicks ---------------- */
  function initTracking() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const sec = a.closest('section, header, footer, .mbar, .menu');
      const where = sec ? (sec.id || sec.className.split(' ')[0]) : 'page';
      if (a.href.includes('wa.me')) track('whatsapp_click', { location: where });
      else if (a.href.startsWith('mailto:')) track('email_click', { location: where });
    });
  }

  /* ---------------- Intro / loader ---------------- */
  function intro() {
    const loader = document.querySelector('.loader');
    const ready = () => doc.classList.add('is-ready');
    if (!loader || doc.classList.contains('no-loader') || reduce) { ready(); return; }
    try { sessionStorage.setItem('amweb_intro', '1'); } catch (e) { /* ignore */ }
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const minTime = new Promise(r => setTimeout(r, 1500));
    Promise.race([Promise.all([fonts, minTime]), new Promise(r => setTimeout(r, 2600))]).then(() => {
      loader.classList.add('is-done');
      setTimeout(ready, 380);
      setTimeout(() => { loader.style.display = 'none'; }, 1100);
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', () => setTheme(doc.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));

    document.querySelectorAll('[data-orbit]').forEach(el => OrbitStage(el));
    initMenu();
    initForm();
    initCompare();
    initPlans();
    initFinder();
    initStatus();
    initCopy();
    initSats();
    initBooking();
    initAudit();
    initQuestions();
    initRealisations();
    initConsent();
    initMbar();
    initTracking();
    initMotion();
    initAnchors();
    initActiveNav();
    initMicro();
    intro();
    // arriving from another page on amweb.ma/#about: scroll there, then show only amweb.ma/
    if (location.hash) window.addEventListener('load', () => setTimeout(() => {
      history.replaceState(null, '', location.pathname + location.search);
    }, 1500));
  });
})();
