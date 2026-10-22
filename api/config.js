// GET /api/config : gives the admin page the PUBLIC Supabase settings (URL + publishable/anon key).
// This key is designed to be public: the database security rules (RLS) protect the data.
'use strict';
const { env, publicKey, send } = require('../lib/server.js');

module.exports = async (req, res) => {
  const url = env('SUPABASE_URL', '');
  const anonKey = publicKey();
  // never hand out a secret key by mistake (wrong key pasted in the public variable)
  let role = '';
  try { role = /^eyJ/.test(anonKey) ? JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64url').toString()).role : ''; } catch (e) { role = ''; }
  if (/^sb_secret_/.test(anonKey) || role === 'service_role') return send(res, 500, { ok: false, error: 'secret-key-in-public-variable' });
  if (!url || !anonKey) return send(res, 500, { ok: false, error: 'config' });
  return send(res, 200, { ok: true, url, anonKey });
};
