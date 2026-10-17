/**
 * SüperArı — koloni-241: cihaz / gateway ham okuma girişi (en az hâli).
 * POST /api/ingest   Authorization: Bearer <Supabase kullanıcı oturum anahtarı>
 *   gövde: { okumalar: [{ kovan_id, sensor_tipi, timestamp, deger, ... }], arilik_id?, cihaz_id? }  ya da tek okuma nesnesi
 *   (alanlar sensorGiris ile aynı; giren/cikan, yer, rms, darbe, g, bant, sr, kanal/kanallar atılmaz)
 * → okumalar arılık + TSİ günü paketleri hâlinde gzip NDJSON olarak özel «sensor-ham» kovasına (kullanıcının yetkisiyle, RLS),
 *   dizin satırı sa_sensor_ham_kaydet (kaynak 'ingest'). Gizli anahtar kullanılmaz.
 * EKSİK (Yapılacaklar): telefon bu okumaları sunucudan çekip kurallara vermez; cihaza özel anahtar (device token) yok.
 * GET /api/ingest → alan özeti.
 */
const zlib = require('zlib');
const { config } = require('./supabase-config');

const TIPLER = ['tarti', 'isi_nem', 'isi', 'nem', 'ses', 'titresim', 'ir', 'pil', 'dis_isi_nem'];
const MAX_BODY = 1024 * 1024, MAX_OKUMA = 5000;
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
    req.on('data', (c) => { if (over) return; s += c; if (s.length > MAX_BODY) { over = true; resolve(null); } });
    req.on('end', () => { if (!over) resolve(parse(s)); });
    req.on('error', () => resolve(null));
  });
}
function parse(s) { if (!s || s.length > MAX_BODY) return null; try { const o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
function gunTSI(t) { return new Date(t + 3 * 36e5).toISOString().slice(0, 10); }
/** Okumayı doğrula + sadeleştir (bilinmeyen alanlar da saklanır: ham veri geliştirme içindir; yalnız boyut sınırı) */
function okuma(o, ortak) {
  if (!o || typeof o !== 'object') return null;
  const tip = String(o.sensor_tipi || o.tip || '').toLowerCase();
  const t = Date.parse(o.timestamp || o.at);
  if (TIPLER.indexOf(tip) < 0 || !isFinite(t)) return null;
  if (t > Date.now() + 10 * 60000 || t < Date.now() - 400 * 864e5) return null;
  const hid = o.kovan_id != null && o.kovan_id !== '' ? Number(o.kovan_id) : NaN;
  if (tip !== 'dis_isi_nem' && tip !== 'pil' && !isFinite(hid)) return null;
  const r = Object.assign({}, o, { tip: tip === 'isi' || tip === 'nem' ? 'isi_nem' : tip, at: new Date(t).toISOString() });
  if (r.arilik_id == null && ortak.arilik_id != null) r.arilik_id = ortak.arilik_id;
  if (r.deviceId == null && (o.cihaz_id != null || ortak.cihaz_id != null)) r.deviceId = String(o.cihaz_id != null ? o.cihaz_id : ortak.cihaz_id).slice(0, 64);
  const s = JSON.stringify(r); return s.length <= 4000 ? { t, r, s } : null;
}
async function sb(cfg, token, path, opt) {
  const r = await fetch(cfg.url + path, Object.assign({}, opt, { headers: Object.assign({ apikey: cfg.anonKey, Authorization: 'Bearer ' + token }, (opt && opt.headers) || {}) }));
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { j = txt; }
  return { ok: r.ok, status: r.status, data: j };
}
module.exports = async function handler(req, res) {
  if (req.method === 'GET') return send(res, 200, { yol: '/api/ingest', yontem: 'POST', kimlik: 'Authorization: Bearer <Supabase oturum anahtarı>', alanlar: ['kovan_id', 'sensor_tipi (' + TIPLER.join('|') + ')', 'timestamp', 'deger', 'giren', 'cikan', 'yer', 'rms', 'darbe', 'g', 'bant', 'sr', 'kanal', 'kanallar', 'cihaz_id', 'arilik_id'], not: 'Okumalar yalnız sunucu arşivine (sensor-ham) yazılır; telefon kuralları bunları henüz okumaz.' });
  if (req.method !== 'POST') return send(res, 405, { error: 'yalniz POST' });
  const auth = String(req.headers.authorization || '');
  const token = /^Bearer\s+(\S{20,})$/i.exec(auth); if (!token) return send(res, 401, { error: 'oturum anahtarı gerekli' });
  const cfg = config(process.env || {});
  if (!cfg.enabled) return send(res, 503, { error: 'bulut kapalı' });
  const b = await readBody(req);
  if (!b) return send(res, 400, { error: 'gövde' });
  const ham = Array.isArray(b.okumalar) ? b.okumalar : (Array.isArray(b) ? b : [b]);
  if (!ham.length || ham.length > MAX_OKUMA) return send(res, 400, { error: '1–' + MAX_OKUMA + ' okuma' });
  const ortak = { arilik_id: b.arilik_id != null ? String(b.arilik_id).slice(0, 64) : null, cihaz_id: b.cihaz_id != null ? String(b.cihaz_id) : null };
  const L = ham.map((o) => okuma(o, ortak)), iyi = L.filter(Boolean);
  if (!iyi.length) return send(res, 400, { error: 'geçerli okuma yok', reddedilen: ham.length });
  try {
    const u = await sb(cfg, token[1], '/auth/v1/user', { method: 'GET' });
    if (!u.ok) return send(res, 401, { error: 'oturum geçersiz' });
    const h = await sb(cfg, token[1], '/rest/v1/rpc/sa_telefon_hesap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!h.ok || !h.data) return send(res, 403, { error: 'hesap' });
    const hesap = String(h.data);
    const G = {}; iyi.forEach((x) => { const ar = x.r.arilik_id != null ? String(x.r.arilik_id) : 'genel'; const k = ar + '|' + gunTSI(x.t); (G[k] || (G[k] = [])).push(x); });
    const paketler = [];
    for (const k of Object.keys(G)) {
      const R = G[k].sort((a, c) => a.t - c.t), [ar, gun] = k.split('|');
      const text = R.map((x) => x.s).join('\n') + '\n', gz = zlib.gzipSync(Buffer.from(text, 'utf8'));
      const yol = hesap + '/' + ar.replace(/[^A-Za-z0-9_.-]/g, '_') + '/' + gun + '/i' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.ndjson.gz';
      const up = await sb(cfg, token[1], '/storage/v1/object/sensor-ham/' + yol, { method: 'POST', headers: { 'Content-Type': 'application/gzip', 'x-upsert': 'false', 'cache-control': 'max-age=31536000' }, body: gz });
      if (!up.ok) return send(res, 502, { error: 'arşiv yazılamadı', durum: up.status, paketler });
      const tipler = Array.from(new Set(R.map((x) => x.r.tip))), kovanlar = Array.from(new Set(R.map((x) => x.r.kovan_id).filter((v) => v != null).map(String)));
      const kd = await sb(cfg, token[1], '/rest/v1/rpc/sa_sensor_ham_kaydet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_yol: yol, p_arilik: ar === 'genel' ? null : ar, p_gun: gun, p_okuma: R.length, p_bayt: gz.length, p_ham_bayt: Buffer.byteLength(text), p_tipler: tipler, p_kovanlar: kovanlar, p_devre_disi: 0, p_bas: new Date(R[0].t).toISOString(), p_bit: new Date(R[R.length - 1].t).toISOString(), p_sikistirma: 'gzip', p_kaynak: 'ingest' }) });
      if (!kd.ok) return send(res, 502, { error: 'dizin yazılamadı', paketler });
      paketler.push({ yol, okuma: R.length, bayt: gz.length });
    }
    return send(res, 200, { ok: true, kabul: iyi.length, reddedilen: ham.length - iyi.length, paketler, not: 'Yalnız arşiv; telefon kuralları bu okumaları henüz okumaz.' });
  } catch (e) {
    return send(res, 502, { error: 'bağlantı' });
  }
};
module.exports.okuma = okuma;
module.exports.gunTSI = gunTSI;
