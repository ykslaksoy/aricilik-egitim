/**
 * SüperArı — kendi hata kaydımız (üçüncü taraf servis yok).
 * POST /api/log  { v, page, kind, message, source, line, col, stack, mode }
 * → Supabase RPC sa_log_client_error (migration 20260929090000_hesap_silme_hata_kaydi.sql) → public.client_errors
 * Kimlik / e-posta / IP saklanmaz: IP yalnız günlük değişen tuzla kısa özet (hız sınırı için).
 * Hız sınırı: bu sunucu örneğinde IP başına dakikada 10; veritabanında ayrıca saatlik ve istemci başına sınır.
 */
const crypto = require('crypto');
const { config } = require('./supabase-config');

const hits = new Map();
function limited(key) {
  const now = Date.now(), win = 60000, max = 10;
  let h = hits.get(key);
  if (!h || now - h.t > win) h = { t: now, n: 0 };
  h.n++; hits.set(key, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > win) hits.delete(k);
  return h.n > max;
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return Promise.resolve(parse(String(req.body)));
  return new Promise((resolve) => {
    let s = '', over = false;
    req.on('data', (c) => { if (over) return; s += c; if (s.length > 12000) { over = true; resolve(null); } });
    req.on('end', () => { if (!over) resolve(parse(s)); });
    req.on('error', () => resolve(null));
  });
}
function parse(s) { if (!s || s.length > 12000) return null; try { const o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
function str(v, m) { return v == null ? '' : String(v).slice(0, m); }
function sameSite(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  const o = String(req.headers.origin || req.headers.referer || '');
  if (!o) return true; /* sendBeacon bazı tarayıcılarda Origin göndermez */
  try { return new URL(o).host.toLowerCase() === host; } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'yalniz POST' });
  if (!sameSite(req)) return send(res, 403, { error: 'kaynak' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || '').split(',')[0].trim();
  const env = process.env || {};
  const salt = String(env.SUPERARI_LOG_SALT || 'superari') + new Date().toISOString().slice(0, 10);
  const ipHash = crypto.createHash('sha256').update(salt + '|' + ip).digest('hex').slice(0, 16);
  if (limited(ipHash)) return send(res, 429, { error: 'cok fazla' });
  const b = await readBody(req);
  if (!b || !b.message) return send(res, 400, { error: 'bos' });
  const cfg = config(env);
  if (!cfg.enabled) return send(res, 202, { ok: false, reason: 'bulut kapali' });
  const payload = {
    v: str(b.v, 40), page: str(b.page, 120), kind: str(b.kind, 20), message: str(b.message, 500), source: str(b.source, 200),
    line: /^\d{1,9}$/.test(String(b.line)) ? String(b.line) : '', col: /^\d{1,9}$/.test(String(b.col)) ? String(b.col) : '',
    stack: str(b.stack, 2000), ua: str(req.headers['user-agent'], 300), mode: str(b.mode, 10), ip_hash: ipHash
  };
  try {
    const r = await fetch(cfg.url + '/rest/v1/rpc/sa_log_client_error', {
      method: 'POST',
      headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p: payload })
    });
    if (!r.ok) return send(res, 202, { ok: false, reason: r.status === 404 ? 'migration gerekli' : 'db ' + r.status });
    return send(res, 200, { ok: (await r.json()) === true });
  } catch (e) {
    return send(res, 202, { ok: false, reason: 'db erisilemedi' });
  }
};
