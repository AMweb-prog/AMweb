// GET /api/keepalive : called once a day by a Vercel Cron Job (see vercel.json).
// A free Supabase project is paused after 7 days without activity; this tiny query keeps it awake.
'use strict';
const { supa, send } = require('../lib/server.js');

module.exports = async (req, res) => {
  try {
    await supa().select('offres', 'select=id&limit=1');
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('[keepalive]', e.message);
    return send(res, 500, { ok: false });
  }
};
