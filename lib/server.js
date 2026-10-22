// Shared helpers for the AMweb server functions in /api (this folder is not an endpoint).
'use strict';
const crypto = require('crypto');

function env(name, fallback) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

// Supabase server key: the new "secret" key (sb_secret_...) or the legacy service_role key (a JWT).
function serverKey() {
  return env('SUPABASE_SECRET_KEY', '') || env('SUPABASE_SERVICE_ROLE_KEY', '');
}

// Supabase public key for the admin page: the new "publishable" key (sb_publishable_...) or the legacy anon key.
function publicKey() {
  return env('SUPABASE_PUBLISHABLE_KEY', '') || env('SUPABASE_ANON_KEY', '');
}

// New keys go in the "apikey" header only; legacy JWT keys are also sent as Bearer token.
function keyHeaders(key) {
  return /^eyJ/.test(key) ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

function supa() {
  const url = env('SUPABASE_URL', '').replace(/\/+$/, '');
  const key = serverKey();
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY are not configured');
  const headers = (extra) => Object.assign(keyHeaders(key), { 'Content-Type': 'application/json' }, extra || {});
  return {
    url,
    async select(table, query) {
      const r = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: headers() });
      if (!r.ok) throw new Error(`select ${table}: ${r.status} ${await r.text()}`);
      return r.json();
    },
    async insert(table, row) {
      const r = await fetch(`${url}/rest/v1/${table}`, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(row) });
      if (!r.ok) throw new Error(`insert ${table}: ${r.status} ${await r.text()}`);
      const data = await r.json();
      return Array.isArray(data) ? data[0] : data;
    },
    async user(accessToken) {
      const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` } });
      if (!r.ok) return null;
      return r.json();
    },
  };
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  const chunks = [];
  let size = 0;
  for await (const c of req) { size += c.length; if (size > 64 * 1024) return null; chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const f = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return f || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function ipHash(req) {
  const salt = env('IP_SALT', 'amweb');
  return crypto.createHash('sha256').update(salt + '|' + clientIp(req)).digest('hex').slice(0, 24);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { env, supa, publicKey, readJson, send, ipHash, esc };
