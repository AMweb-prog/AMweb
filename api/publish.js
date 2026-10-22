// POST /api/publish : called by the admin "Publier" button. Checks that the caller is an admin,
// then triggers the Vercel Deploy Hook, which rebuilds the site with the latest content.
'use strict';
const { env, supa, send } = require('../lib/server.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return send(res, 401, { ok: false, error: 'auth' });
  const hook = env('VERCEL_DEPLOY_HOOK_URL', '');
  if (!hook) return send(res, 500, { ok: false, error: 'hook-missing' });
  let db;
  try { db = supa(); } catch (e) { return send(res, 500, { ok: false, error: 'config' }); }

  const user = await db.user(token);
  if (!user || !user.id) return send(res, 401, { ok: false, error: 'auth' });
  const admin = await db.select('admins', `select=user_id&user_id=eq.${encodeURIComponent(user.id)}`);
  if (!admin.length) return send(res, 403, { ok: false, error: 'forbidden' });

  // avoid accidental double clicks: one publication per minute
  const last = await db.select('publications', 'select=created_at&order=created_at.desc&limit=1');
  if (last.length && Date.now() - new Date(last[0].created_at).getTime() < 60 * 1000) {
    return send(res, 429, { ok: false, error: 'too-soon' });
  }
  let statut = 'ok';
  try {
    const r = await fetch(hook, { method: 'POST' });
    if (!r.ok) throw new Error(`hook ${r.status}`);
  } catch (e) {
    statut = 'erreur';
    console.error('[publish]', e.message);
  }
  try { await db.insert('publications', { user_email: user.email || null, statut }); } catch (e) { console.error('[publish] log', e.message); }
  if (statut !== 'ok') return send(res, 502, { ok: false, error: 'hook' });
  return send(res, 200, { ok: true });
};
