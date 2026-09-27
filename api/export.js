/**
 * SüperArı — salt okunur bulut dışa aktarma (asistan / yedek için).
 * Kapalıdır: yalnız Vercel'de SUPERARI_EXPORT_TOKEN (en az 32 karakter) tanımlıysa çalışır.
 * İstek: GET /api/export  başlık «Authorization: Bearer <SUPERARI_EXPORT_TOKEN>»
 *   ?email=<kullanıcı e-postası>  (isteğe bağlı: yalnız bu kullanıcının üye olduğu arılıklar + kendi satırları)
 *   ?tables=records,hives        (isteğe bağlı)   ?since=2026-09-01T00:00:00Z (server_updated_at sonrası)
 *   ?photos=1                    (fotoğraflar için 1 saatlik imzalı adres, en çok 200)
 * Sunucu tarafında service_role anahtarı kullanılır; anahtar asla yanıta konmaz. Yalnız SELECT yapılır.
 * Silinmiş (deleted) satırlar dönmez. Demo veriler zaten buluta hiç yüklenmez.
 */
const crypto = require('crypto');
const TABLES = ['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos'];

function pickSuffix(env, names, suffixes) {
  for (const n of names) { const v = env[n]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  const keys = Object.keys(env).sort();
  for (const sfx of suffixes) for (const k of keys) {
    if (k === sfx || k.endsWith('_' + sfx)) { const v = env[k]; if (typeof v === 'string' && v.trim()) return v.trim(); }
  }
  return '';
}
function safeEq(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(obj));
}
module.exports = async function handler(req, res) {
  const env = process.env || {};
  const token = String(env.SUPERARI_EXPORT_TOKEN || '');
  if (token.length < 32) return send(res, 404, { error: 'kapali' });
  if (req.method !== 'GET') return send(res, 405, { error: 'yalniz GET' });
  const auth = String(req.headers.authorization || '');
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m || !safeEq(m[1].trim(), token)) return send(res, 401, { error: 'yetkisiz' });

  const url = pickSuffix(env, ['SUPABASE_URL', 'Repo_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], ['SUPABASE_URL']).replace(/\/+$/, '');
  const key = pickSuffix(env, ['SUPABASE_SERVICE_ROLE_KEY', 'Repo_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'], ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']);
  if (!/^https:\/\//.test(url) || key.length < 20) return send(res, 503, { error: 'sunucu anahtari yok' });
  const H = { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' };

  const q = new URL(req.url, 'http://x').searchParams;
  const want = (q.get('tables') || '').split(',').map(s => s.trim()).filter(t => TABLES.includes(t));
  const tables = want.length ? want : TABLES;
  const since = q.get('since') && !isNaN(Date.parse(q.get('since'))) ? new Date(q.get('since')).toISOString() : null;
  const email = (q.get('email') || '').trim().toLowerCase();

  async function get(path) {
    const r = await fetch(url + '/rest/v1/' + path, { headers: H });
    if (!r.ok) throw new Error(path.split('?')[0] + ': ' + r.status);
    return r.json();
  }
  async function all(table, filter) {
    let out = [], from = 0;
    for (;;) {
      const r = await fetch(url + '/rest/v1/' + table + '?select=*&deleted=eq.false' + filter + '&order=server_updated_at.asc', {
        headers: Object.assign({ Range: from + '-' + (from + 999), 'Range-Unit': 'items' }, H)
      });
      if (!r.ok) throw new Error(table + ': ' + r.status);
      const rows = await r.json();
      out = out.concat(rows);
      if (rows.length < 1000 || out.length >= 20000) return out;
      from += 1000;
    }
  }
  try {
    let filter = since ? '&server_updated_at=gt.' + encodeURIComponent(since) : '';
    const meta = { exportedAt: new Date().toISOString(), since };
    if (email) {
      const prof = await get('profiles?select=id,email&email=eq.' + encodeURIComponent(email));
      if (!prof.length) return send(res, 404, { error: 'kullanici yok' });
      const uid = prof[0].id;
      const mem = await get('apiary_members?select=apiary_id&user_id=eq.' + uid);
      const ids = mem.map(x => x.apiary_id).filter(x => /^[0-9a-f-]{36}$/i.test(x));
      meta.email = email; meta.apiaryCount = ids.length;
      const apF = ids.length ? 'apiary_id.in.(' + ids.join(',') + '),' : '';
      filter += '&or=(' + encodeURIComponent(apF + 'owner_id.eq.' + uid) + ')';
      var apFilter = (since ? '&server_updated_at=gt.' + encodeURIComponent(since) : '') + (ids.length ? '&id=in.(' + ids.join(',') + ')' : '&id=is.null');
    }
    const out = {};
    for (const t of tables) out[t] = await all(t, t === 'apiaries' && email ? apFilter : filter);
    if (q.get('photos') === '1' && out.photos && out.photos.length) {
      const list = out.photos.slice(0, 200);
      const r = await fetch(url + '/storage/v1/object/sign/photos', {
        method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
        body: JSON.stringify({ expiresIn: 3600, paths: list.map(p => p.storage_path) })
      });
      if (r.ok) {
        const signed = await r.json();
        const by = {}; (signed || []).forEach(s => { if (s && s.path && s.signedURL) by[s.path] = url + '/storage/v1' + s.signedURL; });
        list.forEach(p => { p.signed_url = by[p.storage_path] || null; });
      }
    }
    const counts = {}; Object.keys(out).forEach(t => { counts[t] = out[t].length; });
    return send(res, 200, { meta: Object.assign(meta, { counts }), tables: out });
  } catch (e) {
    return send(res, 502, { error: String(e && e.message || e).slice(0, 200) });
  }
};
