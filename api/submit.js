// POST /api/submit : receives every website form (contact, audit, appointment, question),
// saves it in Supabase (table "demandes") and emails a notification through Brevo.
'use strict';
const { env, supa, readJson, send, ipHash, esc } = require('../lib/server.js');

const TYPES = { contact: 'Contact', audit: 'Audit gratuit', rdv: 'Rendez-vous', question: 'Question' };
const LIMITS = { nom: 120, email: 200, telephone: 40, entreprise: 160, message: 5000, page: 200, lang: 5 };
const MAX_PER_10_MIN = 5;

function clean(v, max) {
  if (v == null) return null;
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return s ? s.slice(0, max) : null;
}

function cleanDetails(d) {
  const out = {};
  if (!d || typeof d !== 'object' || Array.isArray(d)) return out;
  Object.keys(d).slice(0, 20).forEach(k => {
    const key = String(k).slice(0, 40);
    const v = d[k];
    if (v == null || v === '') return;
    out[key] = typeof v === 'boolean' || typeof v === 'number' ? v : String(v).slice(0, 1000);
  });
  return out;
}

async function notify(row) {
  const apiKey = env('BREVO_API_KEY', '');
  if (!apiKey) return 'skipped';
  const to = env('NOTIFY_EMAIL', 'contact@amweb.ma');
  const sender = env('NOTIFY_SENDER', 'contact@amweb.ma');
  const site = env('SITE_URL', 'https://www.amweb.ma').replace(/\/+$/, '');
  const lines = [
    ['Type', TYPES[row.type] || row.type], ['Nom', row.nom], ['Email', row.email], ['Téléphone', row.telephone],
    ['Entreprise', row.entreprise], ['Page', row.page], ['Langue', row.lang],
  ].concat(Object.entries(row.details || {}).filter(([k]) => k !== 'ip').map(([k, v]) => [k, v]));
  const table = lines.filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
    <p>Nouvelle demande sur amweb.ma :</p>
    <table>${table}</table>
    ${row.message ? `<p style="margin-top:16px;white-space:pre-wrap;border-left:3px solid #3CF0C5;padding-left:12px">${esc(row.message)}</p>` : ''}
    <p style="margin-top:20px"><a href="${site}/admin/#demandes" style="background:#3CF0C5;color:#0B0F1A;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:bold">Ouvrir dans l'admin</a></p>
  </div>`;
  const body = {
    sender: { email: sender, name: 'AMweb site' },
    to: [{ email: to }],
    subject: `Nouvelle demande : ${TYPES[row.type] || row.type}${row.nom ? ' de ' + row.nom : ''}`,
    htmlContent: html,
  };
  if (row.email) body.replyTo = { email: row.email, name: row.nom || row.email };
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`brevo ${r.status} ${await r.text()}`);
  return 'sent';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  const b = await readJson(req);
  if (!b || typeof b !== 'object') return send(res, 400, { ok: false, error: 'json' });
  // spam trap: real visitors never fill the hidden "website" field
  if (b.website) return send(res, 200, { ok: true });

  const type = String(b.type || '');
  if (!TYPES[type]) return send(res, 400, { ok: false, error: 'type' });
  const row = {
    type,
    lang: clean(b.lang, LIMITS.lang),
    page: clean(b.page, LIMITS.page),
    nom: clean(b.nom, LIMITS.nom),
    email: clean(b.email, LIMITS.email),
    telephone: clean(b.telephone, LIMITS.telephone),
    entreprise: clean(b.entreprise, LIMITS.entreprise),
    message: clean(b.message, LIMITS.message),
    details: cleanDetails(b.details),
  };
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    // the "WhatsApp or email" field of the question form may hold a phone number
    if (!row.telephone && /^[+\d][\d\s().-]{5,}$/.test(row.email)) { row.telephone = row.email; row.email = null; }
    else return send(res, 400, { ok: false, error: 'email' });
  }
  if (!row.nom || (!row.email && !row.telephone)) return send(res, 400, { ok: false, error: 'fields' });
  row.details.ip = ipHash(req);

  let saved = null, dbError = null;
  try {
    const db = supa();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await db.select('demandes', `select=id&details->>ip=eq.${row.details.ip}&created_at=gt.${encodeURIComponent(since)}`);
    if (recent.length >= MAX_PER_10_MIN) return send(res, 429, { ok: false, error: 'rate' });
    saved = await db.insert('demandes', row);
  } catch (e) {
    dbError = e;
    console.error('[submit] database error', e.message);
  }
  let mail = 'skipped';
  try { mail = await notify(row); } catch (e) { mail = 'error'; console.error('[submit] email error', e.message); }

  if (!saved && mail !== 'sent') return send(res, 502, { ok: false, error: 'storage' });
  return send(res, 200, { ok: true, id: saved ? saved.id : null, stored: !!saved, mail });
};
