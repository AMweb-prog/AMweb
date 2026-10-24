/* AMweb admin.
 * Talks directly to Supabase with the PUBLIC anon key + the logged-in admin session.
 * Security is enforced by the database rules (RLS, see supabase/schema.sql):
 * only accounts listed in public.admins can read or change anything.
 * Content changes go live when "Publier le site" rebuilds the site (api/publish.js).
 */
(function () {
  'use strict';

  /* ================================================================ helpers */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LANGS = ['fr', 'en', 'ar'];
  const LANG_NAME = { fr: 'Français', en: 'English', ar: 'العربية' };
  const LANG_SHORT = { fr: 'FR', en: 'EN', ar: 'AR' };
  const ART_KEYS = ['about', 'apps', 'build', 'listen', 'marketing', 'seo', 'web', 'method-ecouter', 'method-concevoir', 'method-developper', 'method-lancer'];
  const TYPES = {
    contact: { label: 'Contact', icon: 'envelope-simple' },
    audit: { label: 'Audit gratuit', icon: 'magnifying-glass' },
    rdv: { label: 'Rendez-vous', icon: 'calendar-check' },
    question: { label: 'Question', icon: 'chat-circle-dots' },
  };
  const STATUTS = { nouveau: 'Nouveau', en_cours: 'En cours', traite: 'Traité', archive: 'Archivé' };
  const DETAIL_KEYS = { forfait: 'Forfait', adresse: 'Adresse', date: 'Date souhaitée', heure: 'Heure', format: 'Format', site: 'Site actuel', activite: 'Activité', article: 'Article' };
  const OFFERS = {
    vitrine: { name: 'Site vitrine', icon: 'browser', needsTime: true },
    ecommerce: { name: 'Site e-commerce', icon: 'shopping-cart', needsTime: true },
    premium: { name: 'Sur mesure (Premium)', icon: 'diamond', needsTime: false },
    maintenance: { name: 'Maintenance', icon: 'wrench', needsTime: false, optionalPrice: true },
  };

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    let value;
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v; // static markup only, never user data
      else if (k === 'value') value = v;
      else if (k === 'checked') n.checked = !!v;
      else if (k === 'dataset') Object.assign(n.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    kids.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    if (value !== undefined) n.value = value;
    return n;
  }
  const icon = name => el('i', { class: 'ph ph-' + name, 'aria-hidden': 'true' });

  function toast(msg, kind) {
    const t = el('div', { class: 'toast' + (kind === 'err' ? ' err' : ''), role: kind === 'err' ? 'alert' : 'status' },
      icon(kind === 'err' ? 'warning-circle' : 'check-circle'), el('span', { text: msg }));
    $('#toasts').append(t);
    setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3500);
  }

  function errMsg(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e || '');
    if (/Invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
    if (/Email not confirmed/i.test(m)) return "Cet email n'est pas encore confirmé (voir Supabase > Authentication).";
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (/duplicate key|unique constraint|already exists/i.test(m)) return 'Cet élément existe déjà (adresse ou langue en double).';
    if (/articles_slug_check|slug/i.test(m) && /check/i.test(m)) return "L'adresse ne doit contenir que des lettres minuscules, des chiffres et des tirets.";
    if (/JWT|jwt expired|invalid token|refresh token/i.test(m)) return 'Session expirée : reconnectez-vous.';
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return 'Connexion impossible. Vérifiez votre connexion internet.';
    if (/rows returned|Cannot coerce|0 rows/i.test(m)) return 'Action refusée : ce compte n’a pas les droits.';
    if (/row-level security|permission denied/i.test(m)) return 'Action refusée : ce compte n’a pas les droits.';
    if (/payload too large|exceeded the maximum/i.test(m)) return 'Image trop lourde (5 Mo maximum).';
    return m || 'Une erreur est survenue.';
  }

  async function run(promise) {
    const res = await promise;
    if (res.error) throw res.error;
    return res;
  }

  function busy(btn, on, text) {
    if (!btn) return;
    if (on) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.innerHTML = '';
      btn.append(el('span', { class: 'spin', 'aria-hidden': 'true' }), ' ', text || 'Enregistrement…');
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.label != null) btn.innerHTML = btn.dataset.label;
    }
  }

  const fmtNum = (n, lang) => {
    const s = String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
    return s;
  };
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  function ago(iso) {
    const s = (new Date(iso).getTime() - Date.now()) / 1000;
    const a = Math.abs(s);
    if (a < 60) return 'à l’instant';
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), 'day');
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  const fullDate = iso => new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const slugify = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  function waNumber(phone) {
    let d = String(phone || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (/^0[5-7]\d{8}$/.test(d)) d = '212' + d.slice(1);
    return /^\d{8,15}$/.test(d) ? d : '';
  }

  function confirmBox(title, text, okLabel, danger) {
    const dlg = $('#confirmDlg');
    $('#confirmTitle').textContent = title;
    $('#confirmText').textContent = text || '';
    const ok = $('#confirmOk');
    ok.textContent = okLabel || 'Confirmer';
    ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise(res => dlg.addEventListener('close', () => res(dlg.returnValue === 'ok'), { once: true }));
  }

  /* form field builders */
  function field(label, control, opts = {}) {
    const lab = el('span', { class: 'label' }, el('span', null, label, opts.optional ? el('span', { class: 'opt', text: ' (facultatif)' }) : null));
    if (opts.max) {
      const c = el('span', { class: 'count' });
      const upd = () => { const n = control.value.length; c.textContent = `${n} / ${opts.max}`; c.classList.toggle('over', n > opts.max); };
      control.addEventListener('input', upd); upd();
      lab.append(c);
    }
    return el('label', { class: 'field' + (opts.class ? ' ' + opts.class : '') }, lab, control, opts.hint ? el('span', { class: 'hint', text: opts.hint }) : null);
  }
  function inp(name, value, attrs = {}) {
    const lang = attrs.lang;
    return el('input', Object.assign({ type: 'text', name, value: value == null ? '' : value, dir: lang === 'ar' ? 'rtl' : null }, attrs));
  }
  function area(name, value, attrs = {}) {
    const lang = attrs.lang;
    return el('textarea', Object.assign({ name, value: value == null ? '' : value, dir: lang === 'ar' ? 'rtl' : null }, attrs));
  }
  function toggle(name, checked, label) {
    return el('label', { class: 'switch' }, el('input', { type: 'checkbox', name, checked }), el('span', { class: 'track', 'aria-hidden': 'true' }), el('span', { text: label }));
  }
  const val = (form, name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');

  /* image upload: resized and converted to WebP in the browser, then stored in the "media" bucket */
  async function uploadImage(file, folder) {
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Format accepté : JPG, PNG ou WebP.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (15 Mo maximum avant compression).');
    let blob = file, ext = file.type.split('/')[1].replace('jpeg', 'jpg'), type = file.type;
    try {
      const bmp = await createImageBitmap(file);
      const max = 1600, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const webp = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
      if (webp && webp.type === 'image/webp') { blob = webp; ext = 'webp'; type = 'image/webp'; }
    } catch (e) { /* keep the original file */ }
    if (blob.size > 5 * 1024 * 1024) throw new Error('Image trop lourde (5 Mo maximum).');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await run(S.sb.storage.from('media').upload(path, blob, { contentType: type, cacheControl: '31536000', upsert: false }));
    return S.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  }

  /* ================================================================ state */
  const S = { sb: null, session: null, entered: false, offres: [], lastPub: null, newCount: 0, poll: 0, leaveGuard: null };
  const PENDING_KEY = 'amweb_admin_pending';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  /* ================================================================ boot and auth */
  function show(id) {
    ['boot', 'setupView', 'authView', 'appView'].forEach(v => { $('#' + v).hidden = v !== id; });
  }
  function authPanel(id, msg, ok) {
    show('authView');
    ['loginForm', 'forgotForm', 'recoveryForm'].forEach(f => { $('#' + f).hidden = f !== id; });
    const form = $('#' + id);
    const m = $('.form-msg', form);
    m.hidden = !msg; m.textContent = msg || ''; m.classList.toggle('ok', !!ok);
    const first = $('input', form); if (first) setTimeout(() => first.focus(), 30);
  }

  async function boot() {
    if (location.protocol === 'file:') {
      // opened by double-click from the computer: the admin needs the online server
      $('#setupTitle').textContent = 'À ouvrir en ligne';
      $('#setupLocal').hidden = false; $('#setupEnv').hidden = true;
      show('setupView');
      return;
    }
    let cfg = null;
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      cfg = await r.json();
    } catch (e) { cfg = null; }
    if (!cfg || !cfg.ok || !window.supabase) { show('setupView'); return; }
    S.sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'amweb-admin-auth' },
    });
    const recovering = /type=recovery/.test(location.hash);
    S.sb.auth.onAuthStateChange((event, session) => {
      S.session = session;
      if (event === 'PASSWORD_RECOVERY') { authPanel('recoveryForm'); return; }
      if (event === 'SIGNED_OUT') { leave(); return; }
      if (session && !S.entered && event === 'SIGNED_IN' && $('#recoveryForm').hidden) setTimeout(() => enter(session), 0);
    });
    const { data } = await S.sb.auth.getSession();
    if (recovering) return; // the PASSWORD_RECOVERY event shows the form
    if (data && data.session) enter(data.session);
    else authPanel('loginForm');
  }

  async function enter(session) {
    if (S.entered) return;
    S.entered = true;
    S.session = session;
    try {
      const { data } = await run(S.sb.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle());
      if (!data) {
        S.entered = false;
        await S.sb.auth.signOut();
        authPanel('loginForm', "Ce compte n'a pas accès à l'admin. Demandez à l'ajouter dans la table « admins » (voir GUIDE-ADMIN.md).");
        return;
      }
      $('#userEmail').textContent = session.user.email || '';
      await loadOffres();
      show('appView');
      if (!location.hash || location.hash.length < 2 || /access_token|type=/.test(location.hash)) history.replaceState(null, '', '#demandes');
      route();
      refreshPub();
      refreshNewCount();
      clearInterval(S.poll);
      S.poll = setInterval(() => { if (!document.hidden) { refreshNewCount(true); } }, 60000);
    } catch (e) {
      S.entered = false;
      authPanel('loginForm', errMsg(e));
    }
  }

  function leave() {
    S.entered = false;
    current = '';
    clearInterval(S.poll);
    $('#view').replaceChildren();
    authPanel('loginForm');
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget, btn = $('[type=submit]', f);
    const email = val(f, 'email'), password = f.elements.password.value;
    if (!email || !password) { authPanel('loginForm', 'Entrez votre email et votre mot de passe.'); return; }
    busy(btn, true, 'Connexion…');
    try {
      const { data } = await run(S.sb.auth.signInWithPassword({ email, password }));
      busy(btn, false);
      f.elements.password.value = '';
      enter(data.session);
    } catch (err) {
      busy(btn, false);
      authPanel('loginForm', errMsg(err));
    }
  });
  $('#forgotBtn').addEventListener('click', () => {
    $('#forgotForm').elements.email.value = $('#loginForm').elements.email.value;
    authPanel('forgotForm');
  });
  $$('[data-back-login]').forEach(b => b.addEventListener('click', () => authPanel('loginForm')));
  $('#forgotForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget, btn = $('[type=submit]', f), email = val(f, 'email');
    if (!email) return;
    busy(btn, true, 'Envoi…');
    try {
      await run(S.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/admin/' }));
      authPanel('forgotForm', 'Si ce compte existe, un email vient de partir. Ouvrez le lien qu’il contient.', true);
    } catch (err) { authPanel('forgotForm', errMsg(err)); }
    busy(btn, false);
  });
  $('#recoveryForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.currentTarget, btn = $('[type=submit]', f), password = f.elements.password.value;
    if (password.length < 10) { authPanel('recoveryForm', 'Au moins 10 caractères.'); return; }
    busy(btn, true);
    try {
      const { data } = await run(S.sb.auth.updateUser({ password }));
      f.elements.password.value = '';
      toast('Mot de passe enregistré.');
      history.replaceState(null, '', '#demandes');
      const { data: s } = await S.sb.auth.getSession();
      busy(btn, false);
      $('#recoveryForm').hidden = true;
      enter(s.session || { user: data.user });
    } catch (err) { busy(btn, false); authPanel('recoveryForm', errMsg(err)); }
  });
  $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
    const i = b.previousElementSibling, show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    b.firstElementChild.className = 'ph ph-' + (show ? 'eye-slash' : 'eye');
  }));
  $('#logoutBtn').addEventListener('click', async () => {
    if (S.leaveGuard && !(await S.leaveGuard())) return;
    await S.sb.auth.signOut();
  });

  /* ================================================================ publish */
  async function loadOffres() {
    const { data } = await run(S.sb.from('offres').select('*'));
    S.offres = data || [];
  }
  function markDirty(deleted) {
    if (deleted) store.set(PENDING_KEY, new Date().toISOString());
    setPubState(true);
  }
  function setPubState(dirty) {
    const st = $('#pubState');
    st.className = 'pub-state ' + (dirty ? 'dirty' : 'clean');
    $('#publishBtn').classList.toggle('is-dirty', !!dirty);
    st.textContent = dirty ? 'Modifications non publiées'
      : S.lastPub ? `Site publié ${ago(S.lastPub.created_at)}` : 'Site à jour';
    st.title = S.lastPub ? `Dernière publication : ${fullDate(S.lastPub.created_at)}` : '';
  }
  async function refreshPub() {
    try {
      const last = await run(S.sb.from('publications').select('created_at,statut').eq('statut', 'ok').order('created_at', { ascending: false }).limit(1));
      S.lastPub = (last.data || [])[0] || null;
      const tables = ['offres', 'realisations', 'temoignages', 'articles'];
      const res = await Promise.all(tables.map(t => S.sb.from(t).select('updated_at').order('updated_at', { ascending: false }).limit(1)));
      let latest = 0;
      res.forEach(r => { if (!r.error && r.data && r.data[0]) latest = Math.max(latest, new Date(r.data[0].updated_at).getTime()); });
      const pend = store.get(PENDING_KEY);
      if (pend) latest = Math.max(latest, new Date(pend).getTime());
      const pubAt = S.lastPub ? new Date(S.lastPub.created_at).getTime() : 0;
      setPubState(latest > pubAt + 1000);
    } catch (e) { /* the badge is only informative */ }
  }
  $('#publishBtn').addEventListener('click', async () => {
    const ok = await confirmBox('Publier le site ?', 'Le site va être reconstruit avec le contenu actuel (offres, réalisations, avis, articles). Il sera à jour dans 1 à 2 minutes.', 'Publier');
    if (!ok) return;
    const btn = $('#publishBtn');
    busy(btn, true, 'Publication…');
    try {
      const { data } = await S.sb.auth.getSession();
      const r = await fetch('/api/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        store.del(PENDING_KEY);
        toast('Publication lancée : le site sera à jour dans 1 à 2 minutes.');
        await refreshPub();
      } else if (r.status === 429) toast('Une publication vient d’être lancée. Attendez une minute avant de recommencer.', 'err');
      else if (j.error === 'hook-missing') toast('Publication impossible : VERCEL_DEPLOY_HOOK_URL manque dans Vercel (voir GUIDE-ADMIN.md).', 'err');
      else if (r.status === 401 || r.status === 403) toast('Publication refusée : reconnectez-vous.', 'err');
      else toast('La publication a échoué. Réessayez dans un instant.', 'err');
    } catch (e) { toast(errMsg(e), 'err'); }
    busy(btn, false);
  });

  /* ================================================================ router */
  const VIEWS = {};
  let current = '';
  async function route() {
    if (!S.entered) return;
    const [name, arg] = location.hash.replace(/^#/, '').split('/');
    const view = VIEWS[name] ? name : 'demandes';
    $$('.sidenav a').forEach(a => { if (a.dataset.nav === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.style.overflow = '';
    const same = current === view && VIEWS[view].update;
    current = view;
    S.leaveGuard = null;
    if (same) { VIEWS[view].update(arg ? decodeURIComponent(arg) : ''); return; }
    const box = $('#view');
    box.replaceChildren(el('div', { class: 'empty' }, el('span', { class: 'spin' })));
    try {
      await VIEWS[view].render(box, arg ? decodeURIComponent(arg) : '');
    } catch (e) {
      box.replaceChildren(el('div', { class: 'empty' }, icon('warning-circle'), el('p', { text: errMsg(e) }),
        el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { current = ''; route(); } }, 'Réessayer')));
      if (/JWT|expired/i.test(String(e && e.message))) S.sb.auth.signOut();
    }
  }
  let lastHash = location.hash;
  window.addEventListener('hashchange', async () => {
    if (S.leaveGuard) {
      const ok = await S.leaveGuard();
      if (!ok) { history.replaceState(null, '', lastHash); return; }
    }
    lastHash = location.hash;
    route();
  });
  window.addEventListener('beforeunload', e => { if (S.dirtyForm) { e.preventDefault(); e.returnValue = ''; } });
  function guardForm(form) {
    S.dirtyForm = false;
    form.addEventListener('input', () => { S.dirtyForm = true; });
    S.leaveGuard = async () => {
      if (!S.dirtyForm) return true;
      const ok = await confirmBox('Quitter sans enregistrer ?', 'Vos dernières modifications seront perdues.', 'Quitter', true);
      if (ok) S.dirtyForm = false;
      return ok;
    };
  }

  /* ================================================================ requests (demandes) */
  async function refreshNewCount(notify) {
    try {
      const { count } = await run(S.sb.from('demandes').select('id', { count: 'exact', head: true }).eq('statut', 'nouveau'));
      const before = S.newCount;
      S.newCount = count || 0;
      const b = $('#newBadge');
      b.hidden = !S.newCount; b.textContent = S.newCount > 99 ? '99+' : S.newCount;
      document.title = (S.newCount ? `(${S.newCount}) ` : '') + 'Admin AMweb';
      if (notify && S.newCount > before) {
        toast(S.newCount - before > 1 ? `${S.newCount - before} nouvelles demandes` : 'Nouvelle demande reçue');
        if (current === 'demandes' && VIEWS.demandes.reload) VIEWS.demandes.reload();
      }
    } catch (e) { /* ignore */ }
  }

  VIEWS.demandes = (function () {
    const st = { filter: 'nouveau', type: '', q: '', rows: [], open: null, limit: 50, more: false };
    let box;

    async function load() {
      let query = S.sb.from('demandes').select('*').order('created_at', { ascending: false }).limit(st.limit + 1);
      if (st.filter === 'actives') query = query.in('statut', ['nouveau', 'en_cours']);
      else if (st.filter !== 'toutes') query = query.eq('statut', st.filter);
      if (st.type) query = query.eq('type', st.type);
      const { data } = await run(query);
      st.more = data.length > st.limit;
      st.rows = data.slice(0, st.limit);
    }

    function snippet(r) {
      const d = r.details || {};
      return r.message || d.site || d.forfait || [d.date, d.heure].filter(Boolean).join(' à ') || r.email || r.telephone || '';
    }

    function listView() {
      const q = st.q.toLowerCase();
      const rows = st.rows.filter(r => !q || [r.nom, r.email, r.telephone, r.entreprise, r.message, JSON.stringify(r.details || {})].join(' ').toLowerCase().includes(q));
      if (!rows.length) {
        return el('div', { class: 'empty card' }, icon('tray'),
          el('p', { text: st.filter === 'nouveau' ? 'Aucune nouvelle demande. Tout est traité !' : 'Aucune demande ici.' }));
      }
      const list = el('div', { class: 'dlist', role: 'list' }, rows.map(r => {
        const t = TYPES[r.type] || { label: r.type, icon: 'tray' };
        return el('button', {
          type: 'button', role: 'listitem', class: 'ditem' + (r.statut === 'nouveau' ? ' is-new' : ''), 'aria-current': st.open && st.open.id === r.id ? 'true' : null,
          onclick: () => { location.hash = '#demandes/' + r.id; },
        },
        el('span', { class: 'dico', title: t.label }, icon(t.icon)),
        el('span', { class: 'dmain' }, el('span', { class: 'dname', text: r.nom || r.email || r.telephone || 'Sans nom' }),
          el('span', { class: 'dsnip', text: `${t.label} · ${snippet(r)}` })),
        el('span', { class: 'dtime', text: ago(r.created_at) }));
      }));
      const wrap = el('div', { class: 'stack' }, list);
      if (st.more) wrap.append(el('div', { class: 'more' }, el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: async e => { st.limit += 50; busy(e.currentTarget, true, 'Chargement…'); await load(); paint(); } }, 'Afficher plus')));
      return wrap;
    }

    function detailView(r) {
      if (!r) return el('div', { class: 'card empty' }, icon('cursor-click'), el('p', { text: 'Choisissez une demande pour voir le détail.' }));
      const t = TYPES[r.type] || { label: r.type, icon: 'tray' };
      const d = Object.assign({}, r.details || {}); delete d.ip;
      const wa = waNumber(r.telephone);
      const first = (r.nom || '').split(/\s+/).slice(-1)[0] || '';
      const subject = `Votre demande AMweb (${t.label.toLowerCase()})`;
      const kv = el('dl', { class: 'kv' });
      const add = (k, v, href) => { if (v == null || v === '') return; kv.append(el('dt', { text: k }), el('dd', null, href ? el('a', { href, target: href.startsWith('http') ? '_blank' : null, rel: 'noopener', text: v }) : String(v))); };
      add('Email', r.email, r.email ? 'mailto:' + r.email : null);
      add('Téléphone', r.telephone, r.telephone ? 'tel:' + r.telephone.replace(/[^\d+]/g, '') : null);
      add('Entreprise', r.entreprise);
      Object.keys(d).forEach(k => {
        const v = d[k];
        const isUrl = k === 'site' && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(String(v)) && !/\s/.test(String(v));
        add(DETAIL_KEYS[k] || k, v, isUrl ? (/^https?:/.test(v) ? v : 'https://' + v) : null);
      });
      add('Reçue', fullDate(r.created_at));
      add('Page', r.page, r.page ? r.page : null);
      add('Langue', r.lang ? (LANG_NAME[r.lang] || r.lang) : null);

      const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Statut' }, Object.keys(STATUTS).map(k =>
        el('button', { type: 'button', 'aria-pressed': String(r.statut === k), onclick: () => setStatut(r, k) }, STATUTS[k])));

      const notes = area('notes', r.notes || '', { rows: 3, placeholder: 'Notes internes (devis envoyé, rappel prévu…)' });
      const saveNotes = async () => {
        if ((notes.value || '') === (r.notes || '')) return;
        try {
          const { data } = await run(S.sb.from('demandes').update({ notes: notes.value }).eq('id', r.id).select().single());
          Object.assign(r, data); toast('Note enregistrée.');
        } catch (e) { toast(errMsg(e), 'err'); }
      };
      notes.addEventListener('blur', saveNotes);

      const waText = encodeURIComponent(`Bonjour ${first}, c'est AMweb. Merci pour votre demande ! `);
      return el('div', { class: 'card' },
        el('div', { class: 'dhead' },
          el('span', { class: 'dico' }, icon(t.icon)),
          el('div', null, el('h2', { text: r.nom || 'Sans nom' }), el('div', { class: 'row' }, el('span', { class: 'pill s-' + r.statut, text: STATUTS[r.statut] || r.statut }), el('span', { class: 'muted small', text: t.label }))),
          el('button', { class: 'icon-btn dclose', type: 'button', 'aria-label': 'Fermer', onclick: () => { location.hash = '#demandes'; } }, icon('x'))),
        el('div', { class: 'dactions' },
          r.email ? el('a', { class: 'btn btn-primary btn-sm', href: `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Bonjour ${first},\n\n`)}` }, icon('envelope-simple'), 'Répondre par email') : null,
          wa ? el('a', { class: 'btn btn-' + (r.email ? 'ghost' : 'primary') + ' btn-sm', href: `https://wa.me/${wa}?text=${waText}`, target: '_blank', rel: 'noopener' }, icon('whatsapp-logo'), 'WhatsApp') : null,
          r.telephone ? el('a', { class: 'btn btn-ghost btn-sm', href: 'tel:' + r.telephone.replace(/[^\d+]/g, '') }, icon('phone'), 'Appeler') : null),
        r.message ? el('div', { class: 'stack', style: 'gap:8px' }, el('h3', { text: 'Message' }), el('div', { class: 'dmsg', text: r.message })) : null,
        kv,
        el('div', { class: 'stack', style: 'gap:8px' }, el('h3', { text: 'Statut' }), seg),
        field('Notes', notes, { hint: 'Enregistrées automatiquement quand vous quittez le champ.' }),
        el('div', { class: 'row-end' },
          el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => remove(r) }, icon('trash'), 'Supprimer')));
    }

    async function setStatut(r, statut) {
      if (r.statut === statut) return;
      try {
        const { data } = await run(S.sb.from('demandes').update({ statut }).eq('id', r.id).select().single());
        Object.assign(r, data);
        toast(`Statut : ${STATUTS[statut]}`);
        refreshNewCount();
        paint();
      } catch (e) { toast(errMsg(e), 'err'); }
    }
    async function remove(r) {
      if (!(await confirmBox('Supprimer cette demande ?', `La demande de ${r.nom || 'ce contact'} sera effacée définitivement. Pour la garder sans l’afficher, choisissez plutôt « Archivé ».`, 'Supprimer', true))) return;
      try {
        await run(S.sb.from('demandes').delete().eq('id', r.id));
        st.rows = st.rows.filter(x => x.id !== r.id);
        st.open = null;
        toast('Demande supprimée.');
        refreshNewCount();
        location.hash = '#demandes';
        paint();
      } catch (e) { toast(errMsg(e), 'err'); }
    }

    function paint() {
      const split = $('.split', box);
      if (!split) return;
      split.classList.toggle('has-detail', !!st.open);
      split.replaceChildren(el('div', null, listView()), el('aside', { class: 'detail', 'aria-label': 'Détail de la demande' }, detailView(st.open)));
      $$('.seg[data-filter] button', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === st.filter)));
      const cnt = $('[data-new-count]', box); if (cnt) { cnt.hidden = !S.newCount; cnt.textContent = S.newCount; }
      document.body.style.overflow = st.open && window.matchMedia('(max-width: 900px)').matches ? 'hidden' : '';
    }

    async function openId(id) {
      if (!id) { st.open = null; paint(); return; }
      let r = st.rows.find(x => String(x.id) === String(id));
      if (!r) {
        const { data } = await run(S.sb.from('demandes').select('*').eq('id', id).maybeSingle());
        r = data;
        if (r && !st.rows.some(x => x.id === r.id)) st.rows.unshift(r);
      }
      st.open = r || null;
      paint();
      if (r && window.matchMedia('(max-width: 900px)').matches) { const d = $('.detail', box); if (d) d.scrollTop = 0; }
    }

    async function render(target, arg) {
      box = target;
      st.limit = 50;
      await load();
      const filters = [['nouveau', 'Nouvelles'], ['en_cours', 'En cours'], ['actives', 'À traiter'], ['traite', 'Traitées'], ['archive', 'Archivées'], ['toutes', 'Toutes']];
      const typeSel = el('select', { 'aria-label': 'Type de demande', onchange: async e => { st.type = e.target.value; await load(); paint(); } },
        el('option', { value: '', text: 'Tous les types' }), Object.keys(TYPES).map(k => el('option', { value: k, text: TYPES[k].label })));
      typeSel.value = st.type;
      const search = el('input', { type: 'search', placeholder: 'Rechercher un nom, un email, un message…', 'aria-label': 'Rechercher', value: st.q });
      let tm = 0;
      search.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = search.value.trim(); paint(); }, 150); });
      box.replaceChildren(el('section', { class: 'page' },
        el('div', { class: 'page-head' },
          el('div', null, el('h1', { text: 'Demandes' }), el('p', { class: 'muted', text: 'Tous les formulaires du site arrivent ici : contact, audit gratuit, rendez-vous et questions.' })),
          el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: async e => { busy(e.currentTarget, true, 'Actualisation…'); await load(); await refreshNewCount(); busy(e.currentTarget, false); paint(); } }, icon('arrows-clockwise'), 'Actualiser'))),
        el('div', { class: 'toolbar' },
          el('div', { class: 'seg', role: 'group', 'aria-label': 'Filtrer par statut', 'data-filter': '' }, filters.map(([v, l]) =>
            el('button', { type: 'button', dataset: { v }, 'aria-pressed': String(st.filter === v), onclick: async () => { st.filter = v; await load(); paint(); } }, l,
              v === 'nouveau' ? el('b', { 'data-new-count': '', hidden: !S.newCount, text: S.newCount }) : null))),
          typeSel, search),
        el('div', { class: 'split' })));
      await openId(arg);
    }

    return {
      render,
      update: arg => openId(arg).catch(e => toast(errMsg(e), 'err')),
      reload: async () => { await load(); paint(); },
    };
  })();

  /* ================================================================ offers */
  VIEWS.offres = {
    async render(box) {
      await loadOffres();
      const byId = Object.fromEntries(S.offres.map(o => [o.id, o]));
      const form = el('form', { class: 'stack', novalidate: true });
      const grid = el('div', { class: 'offers' });
      Object.keys(OFFERS).forEach(id => {
        const meta = OFFERS[id], o = byId[id] || { id };
        const price = el('span', { class: 'suffix' }, inp(`${id}.prix`, o.prix == null ? '' : o.prix, { inputmode: 'numeric', autocomplete: 'off', placeholder: meta.optionalPrice ? 'Sur devis' : '' }), el('span', { text: meta.optionalPrice ? 'MAD/mois' : 'MAD' }));
        const card = el('div', { class: 'card offer-card stack' },
          el('h2', null, icon(meta.icon), meta.name),
          field(id === 'premium' ? 'Prix de départ (« dès … MAD »)' : meta.optionalPrice ? 'Prix mensuel' : 'Prix', price,
            { optional: meta.optionalPrice, hint: meta.optionalPrice ? 'Laissez vide pour afficher « Sur devis ».' : 'En dirhams, sans centimes. Exemple : 3000 ou 3 000' }));
        if (meta.needsTime) {
          card.append(el('div', { class: 'lang-block' }, el('span', { class: 'label', text: 'Délai de livraison (affiché après « Livré en »)' }),
            LANGS.map(l => field(LANG_NAME[l], inp(`${id}.duree_${l}`, o['duree_' + l] || '', { lang: l, placeholder: l === 'fr' ? '1 à 2 semaines' : l === 'en' ? '1 to 2 weeks' : '1 إلى 2 أسابيع' }), { optional: l !== 'fr' }))));
        }
        grid.append(card);
      });
      const save = el('button', { class: 'btn btn-primary', type: 'submit' }, icon('floppy-disk'), 'Enregistrer les offres');
      form.append(
        el('div', { class: 'callout' }, icon('info'), el('p', null, 'Ces prix et délais apparaissent partout sur le site (accueil, page Offres, FAQ, articles). Dans un article, écrivez ', el('code', { text: '{{prix:vitrine}}' }), ' pour afficher le prix à jour.')),
        grid, el('div', { class: 'sticky-save' }, save));
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const rows = [];
        let bad = null;
        Object.keys(OFFERS).forEach(id => {
          const meta = OFFERS[id];
          const pIn = form.elements[`${id}.prix`];
          const raw = pIn.value.trim().replace(/[\s .,]/g, '');
          const prix = raw === '' ? null : Number(raw);
          const okPrice = (prix === null && meta.optionalPrice) || (Number.isInteger(prix) && prix >= 0 && prix < 10000000);
          pIn.toggleAttribute('aria-invalid', !okPrice); if (!okPrice) bad = bad || pIn;
          const row = { id, prix };
          if (meta.needsTime) {
            LANGS.forEach(l => { row['duree_' + l] = val(form, `${id}.duree_${l}`) || null; });
            const fr = form.elements[`${id}.duree_fr`];
            fr.toggleAttribute('aria-invalid', !row.duree_fr); if (!row.duree_fr) bad = bad || fr;
          }
          rows.push(row);
        });
        if (bad) { bad.focus(); toast('Vérifiez les champs en rouge.', 'err'); return; }
        busy(save, true);
        try {
          await Promise.all(rows.map(r => { const { id, ...rest } = r; return run(S.sb.from('offres').update(rest).eq('id', id).select().single()); }));
          await loadOffres();
          S.dirtyForm = false;
          toast('Offres enregistrées. Cliquez sur « Publier le site » pour les mettre en ligne.');
          markDirty();
        } catch (err) { toast(errMsg(err), 'err'); }
        busy(save, false);
      });
      box.replaceChildren(el('section', { class: 'page' },
        el('div', { class: 'page-head' }, el('div', null, el('h1', { text: 'Prix et offres' }), el('p', { class: 'muted', text: 'Modifiez les prix et les délais affichés sur le site.' }))),
        form));
      guardForm(form);
    },
  };

  /* ================================================================ simple lists: projects and reviews */
  function listManager(cfg) {
    let rows = [], box;
    async function load() {
      const { data } = await run(S.sb.from(cfg.table).select('*').order('ordre', { ascending: true }).order('created_at', { ascending: true }));
      rows = data || [];
    }
    async function move(i, dir) {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return;
      const a = rows[i], b = rows[j];
      rows[i] = b; rows[j] = a;
      try {
        await Promise.all(rows.map((r, k) => ((k + 1) * 10 !== r.ordre ? run(S.sb.from(cfg.table).update({ ordre: (k + 1) * 10 }).eq('id', r.id)).then(() => { r.ordre = (k + 1) * 10; }) : null)));
        markDirty();
      } catch (e) { toast(errMsg(e), 'err'); await load(); }
      paint();
    }
    async function togglePub(r) {
      try {
        const { data } = await run(S.sb.from(cfg.table).update({ publie: !r.publie }).eq('id', r.id).select().single());
        Object.assign(r, data); markDirty();
        toast(r.publie ? 'Affiché sur le site (après publication).' : 'Masqué du site (après publication).');
      } catch (e) { toast(errMsg(e), 'err'); }
      paint();
    }
    async function remove(r) {
      if (!(await confirmBox(`Supprimer « ${r.nom} » ?`, 'Cette action est définitive. Pour le cacher sans le perdre, désactivez plutôt « Affiché sur le site ».', 'Supprimer', true))) return;
      try {
        await run(S.sb.from(cfg.table).delete().eq('id', r.id));
        rows = rows.filter(x => x.id !== r.id);
        markDirty(true);
        toast('Supprimé.');
      } catch (e) { toast(errMsg(e), 'err'); }
      paint();
    }

    function edit(r) {
      const isNew = !r;
      r = r || { publie: true, ordre: (rows.length + 1) * 10 };
      const dlg = $('#editDlg');
      const form = el('form', { novalidate: true });
      const state = { image: r.image_url || '' };
      const body = el('div', { class: 'modal-body stack' }, cfg.fields(r, state));
      const save = el('button', { class: 'btn btn-primary', type: 'submit' }, icon('floppy-disk'), 'Enregistrer');
      let dirty = false;
      form.addEventListener('input', () => { dirty = true; });
      const close = async () => {
        if (dirty && !(await confirmBox('Fermer sans enregistrer ?', 'Vos modifications seront perdues.', 'Fermer', true))) return;
        dlg.close();
      };
      form.append(
        el('div', { class: 'modal-head' }, el('h2', { id: 'editTitle', text: isNew ? cfg.newTitle : `Modifier : ${r.nom}` }),
          el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer', onclick: close }, icon('x'))),
        body,
        el('div', { class: 'modal-foot' }, el('div', { class: 'left' }, toggle('publie', r.publie !== false, 'Affiché sur le site')),
          el('button', { class: 'btn btn-ghost', type: 'button', onclick: close }, 'Annuler'), save));
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = cfg.read(form, state);
        if (!data) return;
        data.publie = form.elements.publie.checked;
        busy(save, true);
        try {
          if (isNew) { data.ordre = r.ordre; await run(S.sb.from(cfg.table).insert(data).select().single()); }
          else await run(S.sb.from(cfg.table).update(data).eq('id', r.id).select().single());
          dirty = false;
          dlg.close();
          toast('Enregistré. Pensez à « Publier le site ».');
          markDirty();
          await load(); paint();
        } catch (err) { toast(errMsg(err), 'err'); busy(save, false); }
      });
      dlg.replaceChildren(form);
      dlg.oncancel = e => { e.preventDefault(); close(); };
      dlg.showModal();
      const first = $('input[type=text]', form); if (first) first.focus();
    }

    function paint() {
      const listBox = $('[data-items]', box);
      if (!listBox) return;
      if (!rows.length) {
        listBox.replaceChildren(el('div', { class: 'card empty' }, icon(cfg.emptyIcon), el('p', { text: cfg.emptyText }),
          el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => edit(null) }, icon('plus'), cfg.addLabel)));
        return;
      }
      listBox.replaceChildren(el('div', { class: 'items' }, rows.map((r, i) => el('div', { class: 'item' + (r.publie ? '' : ' off') },
        cfg.thumb(r),
        el('div', { class: 'item-main' }, el('strong', { text: r.nom }), el('span', { text: cfg.sub(r) }),
          el('span', null, r.publie ? el('span', { class: 'pill ok', text: 'Affiché' }) : el('span', { class: 'pill draft', text: 'Masqué' }), cfg.warn && cfg.warn(r) ? el('span', { class: 'pill draft', style: 'margin-left:6px', text: cfg.warn(r) }) : null)),
        el('div', { class: 'item-actions' },
          el('div', { class: 'order' },
            el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Monter', disabled: i === 0, onclick: () => move(i, -1) }, icon('caret-up')),
            el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Descendre', disabled: i === rows.length - 1, onclick: () => move(i, 1) }, icon('caret-down'))),
          el('button', { class: 'icon-btn', type: 'button', title: r.publie ? 'Masquer' : 'Afficher', 'aria-label': r.publie ? 'Masquer du site' : 'Afficher sur le site', onclick: () => togglePub(r) }, icon(r.publie ? 'eye' : 'eye-slash')),
          el('button', { class: 'icon-btn', type: 'button', title: 'Modifier', 'aria-label': `Modifier ${r.nom}`, onclick: () => edit(r) }, icon('pencil-simple')),
          el('button', { class: 'icon-btn danger', type: 'button', title: 'Supprimer', 'aria-label': `Supprimer ${r.nom}`, onclick: () => remove(r) }, icon('trash')))))));
    }

    return {
      async render(target) {
        box = target;
        await load();
        box.replaceChildren(el('section', { class: 'page' },
          el('div', { class: 'page-head' }, el('div', null, el('h1', { text: cfg.title }), el('p', { class: 'muted', text: cfg.intro })),
            el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => edit(null) }, icon('plus'), cfg.addLabel))),
          cfg.callout ? el('div', { class: 'callout' }, icon('info'), el('p', { text: cfg.callout })) : null,
          el('div', { 'data-items': '' })));
        paint();
      },
    };
  }

  function triBlock(title, base, r, opts = {}) {
    return el('div', { class: 'lang-block' }, el('span', { class: 'label', text: title }),
      LANGS.map(l => field(LANG_NAME[l], opts.area ? area(`${base}_${l}`, r[`${base}_${l}`], { lang: l, rows: 3, placeholder: opts.ph && opts.ph[l] }) : inp(`${base}_${l}`, r[`${base}_${l}`], { lang: l, placeholder: opts.ph && opts.ph[l] }), { optional: l !== 'fr' })));
  }
  const readTri = (form, base) => Object.fromEntries(LANGS.map(l => [`${base}_${l}`, val(form, `${base}_${l}`) || null]));

  VIEWS.realisations = listManager({
    table: 'realisations', title: 'Réalisations', intro: 'Les projets affichés dans la section « Réalisations » de l’accueil.',
    addLabel: 'Ajouter un projet', newTitle: 'Nouveau projet', emptyIcon: 'images', emptyText: 'Aucun projet pour l’instant. La section reste cachée sur le site tant qu’il n’y a pas de projet avec une image.',
    callout: 'Un projet ne s’affiche que s’il a une image. Les images sont redimensionnées et compressées automatiquement.',
    thumb: r => r.image_url ? el('img', { class: 'item-thumb', src: r.image_url, alt: '' }) : el('span', { class: 'item-thumb' }, icon('image')),
    sub: r => [r.secteur_fr, r.resultat_fr].filter(Boolean).join(' · ') || (r.lien || ''),
    warn: r => (r.image_url ? '' : 'Sans image : non affiché'),
    fields(r, state) {
      const preview = el('img', { class: 'img-current', alt: 'Aperçu de l’image', src: state.image || null, hidden: !state.image });
      const status = el('span', { class: 'hint' });
      const file = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Choisir une image' });
      const pick = el('span', { class: 'btn btn-ghost btn-sm upload' }, icon('upload-simple'), state.image ? 'Changer l’image' : 'Choisir une image', file);
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        status.textContent = 'Envoi de l’image…';
        try {
          state.image = await uploadImage(f, 'realisations');
          preview.src = state.image; preview.hidden = false; status.textContent = 'Image prête.';
          file.closest('form').dispatchEvent(new Event('input'));
        } catch (e) { status.textContent = ''; toast(errMsg(e), 'err'); }
        file.value = '';
      });
      return [
        el('div', { class: 'grid-2' },
          field('Nom du projet', inp('nom', r.nom, { required: true, placeholder: 'Café Sara' })),
          field('Lien du site', inp('lien', r.lien, { type: 'url', placeholder: 'https://…', inputmode: 'url' }), { optional: true })),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Image (capture du site)' }), preview, el('div', { class: 'row' }, pick, status),
          el('span', { class: 'hint', text: 'Format paysage conseillé (par ex. 1600 × 1000). JPG, PNG ou WebP.' })),
        triBlock('Secteur', 'secteur', r, { ph: { fr: 'Restaurant', en: 'Restaurant', ar: 'مطعم' } }),
        triBlock('Résultat obtenu', 'resultat', r, { ph: { fr: '+40 % de réservations en 3 mois', en: '+40% bookings in 3 months', ar: '' } }),
      ];
    },
    read(form, state) {
      const nom = val(form, 'nom');
      if (!nom) { form.elements.nom.setAttribute('aria-invalid', 'true'); form.elements.nom.focus(); return null; }
      let lien = val(form, 'lien');
      if (lien && !/^https?:\/\//i.test(lien)) lien = 'https://' + lien;
      return Object.assign({ nom, lien: lien || null, image_url: state.image || null }, readTri(form, 'secteur'), readTri(form, 'resultat'));
    },
  });

  VIEWS.avis = listManager({
    table: 'temoignages', title: 'Avis clients', intro: 'Les témoignages affichés sur l’accueil.',
    addLabel: 'Ajouter un avis', newTitle: 'Nouvel avis', emptyIcon: 'chat-centered-text', emptyText: 'Aucun avis pour l’instant. La section reste cachée tant qu’il n’y en a pas.',
    callout: 'Publiez uniquement de vrais avis, avec l’accord du client. Le texte en français est obligatoire ; sans traduction, la version française s’affiche.',
    thumb: () => el('span', { class: 'item-thumb' }, icon('quotes')),
    sub: r => r.texte_fr || '',
    fields(r) {
      return [
        el('div', { class: 'grid-2' }, field('Nom du client', inp('nom', r.nom, { required: true, placeholder: 'Sara A.' })), el('div')),
        triBlock('Rôle ou entreprise', 'role', r, { ph: { fr: 'Gérante, Café Sara', en: 'Owner, Café Sara', ar: '' } }),
        triBlock('Avis', 'texte', r, { area: true }),
      ];
    },
    read(form) {
      const nom = val(form, 'nom'), t = val(form, 'texte_fr');
      if (!nom) { form.elements.nom.setAttribute('aria-invalid', 'true'); form.elements.nom.focus(); return null; }
      if (!t) { form.elements.texte_fr.setAttribute('aria-invalid', 'true'); form.elements.texte_fr.focus(); toast('Le texte en français est obligatoire.', 'err'); return null; }
      return Object.assign({ nom }, readTri(form, 'role'), readTri(form, 'texte'));
    },
  });

  /* ================================================================ articles (Conseils) */
  function renderTokens(s, lang) {
    const offer = id => S.offres.find(o => o.id === id) || {};
    return String(s || '')
      .replace(/\{\{(prix|prixnum):(\w+)\}\}/g, (m, k, id) => { const o = offer(id); return o.prix == null ? 'Sur devis' : (k === 'prixnum' ? String(o.prix) : fmtNum(o.prix, lang)); })
      .replace(/\{\{duree:(\w+)\}\}/g, (m, id) => { const o = offer(id); return o['duree_' + lang] || o.duree_fr || ''; });
  }

  VIEWS.articles = (function () {
    let rows = [], box;
    async function load() {
      const { data } = await run(S.sb.from('articles').select('*').order('ordre', { ascending: true }).order('slug', { ascending: true }));
      rows = data || [];
    }
    const groups = () => {
      const g = new Map();
      rows.forEach(r => { if (!g.has(r.slug)) g.set(r.slug, {}); g.get(r.slug)[r.lang] = r; });
      return Array.from(g.entries()).map(([slug, v]) => ({ slug, v, ordre: Math.min(...Object.values(v).map(x => x.ordre || 0)) })).sort((a, b) => a.ordre - b.ordre || a.slug.localeCompare(b.slug));
    };
    const langPill = r => !r ? el('span', { class: 'pill missing' }, '—')
      : r.publie ? el('span', { class: 'pill ok', title: 'En ligne' }, icon('check'), LANG_SHORT[r.lang]) : el('span', { class: 'pill draft', title: 'Brouillon' }, LANG_SHORT[r.lang]);

    function listPage() {
      const gs = groups();
      const t = el('table', { class: 'atable' },
        el('thead', null, el('tr', null, el('th', { text: 'Article' }), el('th', { text: 'Catégorie' }), el('th', { text: 'Langues' }), el('th', { text: 'Date' }))),
        el('tbody', null, gs.map(g => {
          const fr = g.v.fr || g.v.en || g.v.ar;
          return el('tr', { tabindex: '0', onclick: () => { location.hash = '#articles/' + g.slug; }, onkeydown: e => { if (e.key === 'Enter') location.hash = '#articles/' + g.slug; } },
            el('td', null, el('div', { class: 't', text: fr.h1 }), el('div', { class: 'muted small', text: '/conseils/' + g.slug + '.html' })),
            el('td', { class: 'muted', text: fr.categorie }),
            el('td', null, el('div', { class: 'langs' }, LANGS.map(l => langPill(g.v[l])))),
            el('td', { class: 'muted', text: fr.date_pub ? new Date(fr.date_pub).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }));
        })));
      return el('section', { class: 'page' },
        el('div', { class: 'page-head' },
          el('div', null, el('h1', { text: 'Articles Conseils' }), el('p', { class: 'muted', text: `${gs.length} articles. Chaque article existe en français et peut avoir une version anglaise et arabe.` })),
          el('div', { class: 'page-actions' }, el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => { location.hash = '#articles/nouveau'; } }, icon('plus'), 'Nouvel article'))),
        el('div', { class: 'callout' }, icon('info'), el('p', null, 'Coché ', el('span', { class: 'pill ok' }, icon('check'), 'FR'), ' = en ligne après publication. Orange = brouillon (non visible). Les versions EN et AR ne s’affichent que si la version française est en ligne.')),
        gs.length ? el('div', { class: 'card', style: 'padding:8px 8px 0' }, t) : el('div', { class: 'card empty' }, icon('article'), el('p', { text: 'Aucun article.' })));
    }

    /* ---- editor */
    function pairsEditor(name, items, kind) {
      const wrap = el('div', { class: 'pairs' });
      const add = (a, b) => {
        const row = el('div', { class: 'pair', dataset: { pair: name } },
          el('div', null,
            kind === 'faq' ? inp('', a, { placeholder: 'Question', 'data-a': '' }) : inp('', a, { type: 'url', placeholder: 'https://…', 'data-a': '', inputmode: 'url' }),
            kind === 'faq' ? area('', b, { placeholder: 'Réponse (texte simple, sans HTML)', 'data-b': '', rows: 3 }) : inp('', b, { placeholder: 'Nom de la source (ex. Google Search Central)', 'data-b': '' })),
          el('button', { class: 'icon-btn danger', type: 'button', 'aria-label': 'Retirer', onclick: e => { const f = e.currentTarget.closest('form'); row.remove(); if (f) f.dispatchEvent(new Event('input')); } }, icon('trash')));
        wrap.append(row);
      };
      (items || []).forEach(it => (kind === 'faq' ? add(it[0], it[1]) : add(it.url, it.label)));
      return el('div', { class: 'stack', style: 'gap:10px' }, wrap,
        el('div', null, el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => add('', '') }, icon('plus'), kind === 'faq' ? 'Ajouter une question' : 'Ajouter une source')));
    }
    function readPairs(form, name, kind) {
      return $$(`[data-pair="${name}"]`, form).map(p => [$('[data-a]', p).value.trim(), $('[data-b]', p).value.trim()])
        .filter(([a, b]) => a && b).map(([a, b]) => (kind === 'faq' ? [a, b] : { url: /^https?:\/\//.test(a) ? a : 'https://' + a, label: b }));
    }

    function imagePicker(current, onPick) {
      let value = current || 'about';
      const big = el('img', { class: 'img-current', alt: '' });
      const setBig = () => { big.src = /^https?:/.test(value) ? value : `/assets/img/art/${value}.webp`; };
      setBig();
      const grid = el('div', { class: 'imgs' }, ART_KEYS.map(k => el('button', { type: 'button', 'aria-pressed': String(value === k), title: k, onclick: e => { value = k; mark(); onPick(k); e.currentTarget.closest('form').dispatchEvent(new Event('input')); } },
        el('img', { src: `/assets/img/art/${k}.webp`, alt: k, loading: 'lazy' }))));
      const mark = () => { $$('button', grid).forEach(b => b.setAttribute('aria-pressed', String(b.title === value))); setBig(); };
      const file = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Importer une image' });
      const status = el('span', { class: 'hint' });
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        status.textContent = 'Envoi…';
        try { value = await uploadImage(f, 'articles'); mark(); onPick(value); status.textContent = 'Image importée.'; file.closest('form').dispatchEvent(new Event('input')); } catch (e) { status.textContent = ''; toast(errMsg(e), 'err'); }
        file.value = '';
      });
      return el('div', { class: 'stack', style: 'gap:10px' }, big, grid,
        el('div', { class: 'row' }, el('span', { class: 'btn btn-ghost btn-sm upload' }, icon('upload-simple'), 'Importer une image', file), status));
    }

    function insertAround(ta, before, after) {
      const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
      const mid = v.slice(s, e);
      ta.value = v.slice(0, s) + before + mid + after + v.slice(e);
      ta.focus();
      ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + mid.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function previewDoc(r, lang, data) {
      const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const img = /^https?:/.test(data.image) ? data.image : `${location.origin}/assets/img/art/${data.image || 'about'}.webp`;
      const faq = (data.faq || []).map(([q, a]) => `<details open><summary>${esc(renderTokens(q, lang))}</summary><p>${esc(renderTokens(a, lang))}</p></details>`).join('');
      const font = (fam, file, w) => `@font-face{font-family:'${fam}';src:url('${location.origin}/assets/fonts/${file}.woff2') format('woff2');font-weight:${w}}`;
      return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
        ${font('Unbounded', 'unbounded-latin-600-normal', 600)}${font('Geist', 'geist-sans-latin-400-normal', 400)}${font('Geist', 'geist-sans-latin-600-normal', 600)}
        ${font('IBM Plex Sans Arabic', 'ibm-plex-sans-arabic-arabic-400-normal', 400)}${font('Noto Kufi Arabic', 'noto-kufi-arabic-arabic-700-normal', 600)}
        body{margin:0;background:#F5F3EE;color:#0B0F1A;font:17px/1.7 Geist,'IBM Plex Sans Arabic',system-ui,sans-serif}
        article{max-width:720px;margin:0 auto;padding:32px 20px 60px}
        .cat{font:600 12px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#0B7F66}
        h1{font:600 32px/1.15 Unbounded,'Noto Kufi Arabic','Arial Black',sans-serif;margin:12px 0 16px;letter-spacing:-.01em}
        h2{font:600 22px/1.25 Unbounded,'Noto Kufi Arabic','Arial Black',sans-serif;margin:36px 0 10px} h3{font-size:18px;margin:24px 0 8px}
        .chapo{font-size:19px;color:#3a4152} img.hero{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:20px 0}
        a{color:#0B7F66} table{border-collapse:collapse;width:100%} td,th{border:1px solid #d8d4cb;padding:8px;text-align:start}
        details{border-top:1px solid #d8d4cb;padding:12px 0} summary{font-weight:600;cursor:pointer}
        .tip{padding:12px 16px;background:#e6f9f3;border-radius:12px}</style></head><body><article>
        <div class="cat">${esc(data.categorie)}</div><h1>${esc(renderTokens(data.h1, lang))}</h1>
        <p class="chapo">${esc(renderTokens(data.chapo, lang))}</p><img class="hero" src="${esc(img)}" alt="">
        ${renderTokens(data.corps, lang)}${faq ? '<h2>FAQ</h2>' + faq : ''}</article></body></html>`;
    }

    function langForm(slug, lang, r, isNewArticle, frRow, prefill) {
      const form = el('form', { class: 'editor', novalidate: true, dataset: { lang } });
      const d = Object.assign({ publie: false, ordre: frRow ? frRow.ordre : (rows.length ? Math.max(...rows.map(x => x.ordre || 0)) + 1 : 1), image: frRow ? frRow.image : 'about', date_pub: new Date().toISOString().slice(0, 10), faq: [], sources: [] }, prefill || {}, r || {});
      const state = { image: d.image };
      const L = { lang };
      const corps = area('corps', d.corps, Object.assign({ class: 'code', spellcheck: 'false' }, L));
      const iframe = el('iframe', { class: 'preview', title: 'Aperçu de l’article', sandbox: 'allow-same-origin', hidden: true });
      const prevBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, 'Aperçu');
      const collect = () => ({
        h1: val(form, 'h1'), titre_seo: val(form, 'titre_seo') || null, description: val(form, 'description'), categorie: val(form, 'categorie'),
        chapo: val(form, 'chapo'), corps: form.elements.corps.value, faq: readPairs(form, 'faq', 'faq'), sources: readPairs(form, 'sources', 'src'),
        mots_cles: val(form, 'mots_cles'), image: state.image || 'about', date_pub: val(form, 'date_pub') || new Date().toISOString().slice(0, 10),
        ordre: parseInt(val(form, 'ordre'), 10) || 0, publie: form.elements.publie.checked,
      });
      prevBtn.addEventListener('click', () => {
        const on = prevBtn.getAttribute('aria-pressed') !== 'true';
        prevBtn.setAttribute('aria-pressed', String(on));
        iframe.hidden = !on; corps.hidden = on;
        if (on) iframe.srcdoc = previewDoc(r, lang, collect());
      });
      const tokenSel = el('select', { 'aria-label': 'Insérer un prix ou un délai', onchange: e => { if (e.target.value) { insertAround(corps, e.target.value, ''); e.target.value = ''; } } },
        el('option', { value: '', text: 'Insérer un prix…' }),
        ['vitrine', 'ecommerce', 'premium'].map(k => el('option', { value: `{{prix:${k}}}`, text: `Prix ${OFFERS[k].name}` })),
        ['vitrine', 'ecommerce'].map(k => el('option', { value: `{{duree:${k}}}`, text: `Délai ${OFFERS[k].name}` })));
      const tb = (label, b, a, title) => el('button', { type: 'button', title: title || label, onclick: () => insertAround(corps, b, a) }, label);
      const cats = Array.from(new Set(rows.filter(x => x.lang === lang).map(x => x.categorie).filter(Boolean)));
      const listId = `cats-${lang}`;

      const main = el('div', { class: 'stack' },
        field('Titre de l’article (H1)', inp('h1', d.h1, Object.assign({ required: true }, L)), { max: 80 }),
        field('Chapô (introduction)', area('chapo', d.chapo, Object.assign({ rows: 3 }, L)), { hint: 'Deux ou trois phrases qui donnent envie de lire.' }),
        el('div', { class: 'field' },
          el('span', { class: 'label', text: 'Contenu' }),
          el('div', { class: 'toolbar-mini' }, tb('H2', '<h2>', '</h2>', 'Intertitre'), tb('H3', '<h3>', '</h3>', 'Sous-intertitre'), tb('¶', '<p>', '</p>', 'Paragraphe'),
            tb('Gras', '<strong>', '</strong>'), tb('Liste', '<ul>\n  <li>', '</li>\n  <li></li>\n</ul>', 'Liste à puces'), tb('Lien', '<a href="https://">', '</a>', 'Lien'), tokenSel, prevBtn),
          corps, iframe,
          el('span', { class: 'hint', text: 'Contenu en HTML simple : <h2>, <h3>, <p>, <ul><li>, <strong>, <a href="…">. Les {{prix:…}} affichent les prix à jour.' })),
        el('div', { class: 'field' }, el('span', { class: 'label', text: 'Questions fréquentes (FAQ)' }), pairsEditor('faq', d.faq, 'faq'),
          el('span', { class: 'hint', text: 'Affichées en bas de l’article et envoyées à Google (résultats enrichis).' })),
        el('div', { class: 'field' }, el('span', { class: 'label' }, el('span', null, 'Sources', el('span', { class: 'opt', text: ' (facultatif)' }))), pairsEditor('sources', d.sources, 'src')));

      const save = el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, icon('floppy-disk'), 'Enregistrer');
      const side = el('aside', { class: 'editor-side' },
        el('div', { class: 'card stack' },
          toggle('publie', d.publie, 'En ligne (après publication)'),
          save,
          r ? el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => removeLang(r) }, icon('trash'), `Supprimer la version ${LANG_SHORT[lang]}`) : null),
        el('div', { class: 'card stack' }, el('h3', { text: 'Google' }),
          field('Titre SEO', inp('titre_seo', d.titre_seo, Object.assign({ placeholder: 'Par défaut : le titre H1' }, L)), { max: 65, optional: true }),
          field('Description', area('description', d.description, Object.assign({ rows: 3, required: true }, L)), { max: 160, hint: 'Le texte gris sous le titre dans Google. 120 à 155 caractères.' }),
          field('Mots-clés', inp('mots_cles', d.mots_cles, L), { optional: true, hint: 'Séparés par des virgules.' })),
        el('div', { class: 'card stack' }, el('h3', { text: 'Classement' }),
          field('Catégorie', inp('categorie', d.categorie, Object.assign({ list: listId, required: true }, L))), el('datalist', { id: listId }, cats.map(c => el('option', { value: c }))),
          el('div', { class: 'grid-2' }, field('Date', inp('date_pub', d.date_pub, { type: 'date' })), field('Ordre', inp('ordre', d.ordre, { type: 'number', step: '1' }), { hint: '1 = en premier' }))),
        el('div', { class: 'card stack' }, el('h3', { text: 'Image' }), imagePicker(d.image, v => { state.image = v; })));
      form.append(main, side);

      form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = collect();
        const need = [['h1', data.h1], ['description', data.description], ['categorie', data.categorie]];
        let bad = null;
        need.forEach(([n, v]) => { form.elements[n].toggleAttribute('aria-invalid', !v); if (!v) bad = bad || form.elements[n]; });
        if (bad) { bad.focus(); toast('Remplissez les champs obligatoires (titre, description, catégorie).', 'err'); return; }
        // the site needs at least one French article online
        if (lang === 'fr' && r && r.publie && !data.publie && !rows.some(x => x.lang === 'fr' && x.publie && x.id !== r.id)) {
          toast('Impossible : il faut au moins un article français en ligne.', 'err'); return;
        }
        let theSlug = slug;
        if (isNewArticle) {
          const sIn = form.closest('[data-article]').querySelector('[name=slug]');
          theSlug = sIn.value.trim();
          if (!SLUG_RE.test(theSlug)) { sIn.setAttribute('aria-invalid', 'true'); sIn.focus(); toast('Adresse invalide : lettres minuscules, chiffres et tirets uniquement.', 'err'); return; }
          if (rows.some(x => x.slug === theSlug)) { sIn.setAttribute('aria-invalid', 'true'); sIn.focus(); toast('Un article utilise déjà cette adresse.', 'err'); return; }
        }
        busy(save, true);
        try {
          if (r) await run(S.sb.from('articles').update(data).eq('id', r.id).select().single());
          else await run(S.sb.from('articles').insert(Object.assign({ slug: theSlug, lang }, data)).select().single());
          S.dirtyForm = false;
          markDirty();
          toast(data.publie ? 'Article enregistré. Cliquez sur « Publier le site » pour le mettre en ligne.' : 'Brouillon enregistré.');
          await load();
          if (isNewArticle) { history.replaceState(null, '', '#articles/' + theSlug); lastHash = location.hash; }
          editor(isNewArticle ? theSlug : slug, lang);
        } catch (err) { toast(errMsg(err), 'err'); busy(save, false); }
      });
      return form;
    }

    async function removeLang(r) {
      const others = rows.filter(x => x.slug === r.slug && x.id !== r.id);
      if (r.lang === 'fr' && r.publie && !rows.some(x => x.lang === 'fr' && x.publie && x.id !== r.id)) { toast('Impossible : c’est le dernier article français en ligne.', 'err'); return; }
      const msg = r.lang === 'fr' && others.length ? 'Sans version française, les versions EN et AR de cet article ne s’afficheront plus.' : 'Cette action est définitive.';
      if (!(await confirmBox(`Supprimer la version ${LANG_SHORT[r.lang]} ?`, msg, 'Supprimer', true))) return;
      try {
        await run(S.sb.from('articles').delete().eq('id', r.id));
        S.dirtyForm = false;
        markDirty(true);
        toast('Version supprimée.');
        await load();
        if (others.length) editor(r.slug, others[0].lang); else location.hash = '#articles';
      } catch (e) { toast(errMsg(e), 'err'); }
    }

    function editor(slug, lang) {
      const isNew = slug === 'nouveau';
      const v = {};
      rows.filter(x => x.slug === slug).forEach(x => { v[x.lang] = x; });
      if (!isNew && !Object.keys(v).length) { box.replaceChildren(el('div', { class: 'card empty' }, icon('article'), el('p', { text: 'Article introuvable.' }), el('a', { class: 'btn btn-ghost btn-sm', href: '#articles' }, 'Retour à la liste'))); return; }
      lang = isNew ? 'fr' : (lang || (v.fr ? 'fr' : Object.keys(v)[0]));
      const title = isNew ? 'Nouvel article' : (v.fr || v.en || v.ar).h1;
      const tabs = el('div', { class: 'tabs', role: 'tablist' }, LANGS.map(l => el('button', {
        type: 'button', role: 'tab', 'aria-selected': String(l === lang), disabled: isNew && l !== 'fr',
        onclick: async () => { if (l === lang) return; if (S.leaveGuard && !(await S.leaveGuard())) return; editor(slug, l); },
      }, el('span', { class: 'dot' + (v[l] ? (v[l].publie ? ' ok' : ' draft') : '') }), LANG_NAME[l])));
      let content;
      if (v[lang] || isNew) content = langForm(slug, lang, v[lang] || null, isNew, v.fr);
      else {
        const src = v.fr || v.en || v.ar;
        content = el('div', { class: 'card empty' }, icon('translate'),
          el('p', { text: `Cet article n’a pas encore de version ${LANG_NAME[lang]}.` }),
          el('div', { class: 'row', style: 'justify-content:center' },
            el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: () => startFrom(src) }, icon('copy'), `Partir du texte ${LANG_SHORT[src.lang]} (à traduire)`),
            el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => startFrom(null) }, 'Page vide')),
          el('p', { class: 'small', text: 'La nouvelle version reste en brouillon tant que vous ne la mettez pas en ligne.' }));
      }
      function startFrom(src) {
        // a NEW row for this language, prefilled with the source text to translate; it starts as a draft
        const pre = src ? { h1: src.h1, chapo: src.chapo, corps: src.corps, faq: src.faq, sources: src.sources, description: src.description, image: src.image, ordre: src.ordre, date_pub: src.date_pub } : null;
        const f = langForm(slug, lang, null, false, v.fr, pre);
        content.replaceWith(f);
        guardForm(f);
        if (pre) S.dirtyForm = true;
      }
      const slugBox = isNew
        ? el('div', { class: 'card stack' }, field('Adresse de la page', inp('slug', '', { placeholder: 'mon-nouvel-article', pattern: '[a-z0-9-]+', required: true }),
          { hint: 'Lettres minuscules, chiffres et tirets. Remplie automatiquement depuis le titre. Elle ne pourra plus être changée.' }))
        : null;
      box.replaceChildren(el('section', { class: 'page', 'data-article': '' },
        el('a', { class: 'back', href: '#articles' }, icon('arrow-left'), 'Tous les articles'),
        el('div', { class: 'page-head' }, el('div', null, el('h1', { text: title }), isNew ? null : el('a', { class: 'muted small', href: `/conseils/${slug}.html`, target: '_blank', rel: 'noopener', text: `amweb.ma/conseils/${slug}.html` }))),
        slugBox, tabs, content));
      if (isNew) {
        const s = $('[name=slug]', box), h = $('[name=h1]', box);
        let touched = false;
        s.addEventListener('input', () => { touched = true; s.removeAttribute('aria-invalid'); });
        h.addEventListener('input', () => { if (!touched) s.value = slugify(h.value); });
      }
      if (content.tagName === 'FORM') guardForm(content);
    }

    return {
      async render(target, arg) {
        box = target;
        await load();
        if (arg) editor(arg); else box.replaceChildren(listPage());
      },
      async update(arg) {
        if (arg) editor(arg); else { await load(); box.replaceChildren(listPage()); }
      },
    };
  })();

  /* ================================================================ go */
  window.addEventListener('focus', () => { if (S.entered) refreshNewCount(true); });
  boot();
})();
