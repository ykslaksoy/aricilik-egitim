/**
 * SüperArı — canlı referans fiyat yenileme (Stok «Talep oluştur» anında çağrılır).
 * GET /api/fiyat  → apps/web/data/fiyat-ref.json ile AYNI biçim; kaynak sayfalar yeniden okunur.
 *   - Her kaynak URL paralel çekilir (istek başı ~4 sn, toplam bütçe < 9 sn).
 *   - Fiyat: n11 için sayfa içi finalP / priceFloat (dosyadaki fiyatla aynı alan), sonra JSON-LD offers.price,
 *     itemprop/og/product meta, mağazaya özgü alanlar (IdeaSoft salePrice, aslanpetek pbProductPriceCurrent…).
 *   - Birim fiyat: yeniBirim = eskiBirim × yeniFiyat / eskiFiyat (paket oranı korunur).
 *   - ref: (3+ kaynakta) medyanın 2,5 katı dışı aykırı → atılır; 4+ fiyatta kırpılmış ortalama (en düşük + en yüksek atılır), 2–3 fiyatta medyan,
 *     tek kaynakta o fiyat («Tek kaynak» notu), kaynak yoksa null.
 *   - Okunamayan / şüpheli (eski fiyatın 0,4–2,5 katı dışı) kaynak son bilinen fiyatıyla kalır: live:false.
 *   - Fiyat UYDURULMAZ. Yanıt: Cache-Control: no-store.
 * Kaynak başına: live (bool), fetchedAt (canlıysa şimdi; değilse son bilinen tarih), canlı değilse error.
 * Kalem başına: liveCount. Üst düzey: updated (ISO, saatli), baseUpdated (dosya tarihi), live { total, ok, failed, durationMs, bySite }.
 */
const BASE = require('../apps/web/data/fiyat-ref.json');

const PER_REQ_MS = 4000;
const TOTAL_MS = 8500;
const MAX_BYTES = 1500000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
const SANE_LOW = 0.4, SANE_HIGH = 2.5;

const r2 = (x) => Number(Number(x).toFixed(2));

/* "1.549,00" / "1549.00" / "1,549.00" / 389.95 → sayı */
function num(v) {
  if (typeof v === 'number') return isFinite(v) && v > 0 ? v : null;
  let s = String(v == null ? '' : v).replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (ld > -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? n : null;
}

function decodeEnt(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');
}

/* JSON-LD: Product → offers(.price | .lowPrice), @graph / dizi destekli */
function fromJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const visit = (o, inProduct) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((x) => visit(x, inProduct)); return; }
    const t = [].concat(o['@type'] || []).map(String);
    const isProduct = t.some((x) => /Product/i.test(x));
    const isOffer = t.some((x) => /Offer/i.test(x));
    if ((isOffer && inProduct) || (isOffer && !inProduct && o.price != null)) {
      const specs = [].concat(o.priceSpecification || []).filter((x) => x && !/ListPrice|Strikethrough/i.test(String(x.priceType || '')));
      const spec = specs[0] || {};
      const cur = o.priceCurrency || spec.priceCurrency;
      if (!cur || /TRY|TL/i.test(String(cur))) {
        const p = num(o.price != null ? o.price : (o.lowPrice != null ? o.lowPrice : spec.price));
        if (p) out.push(p);
      }
    }
    if (isProduct && o.offers) visit(o.offers, true);
    if (o['@graph']) visit(o['@graph'], false);
    if (!isProduct && !isOffer) for (const k in o) if (k !== 'offers' && o[k] && typeof o[k] === 'object') visit(o[k], false);
  };
  while ((m = re.exec(html))) {
    let j;
    try { j = JSON.parse(m[1].trim()); } catch (e) { try { j = JSON.parse(decodeEnt(m[1].trim())); } catch (e2) { continue; } }
    visit(j, false);
  }
  return out;
}

function fromMeta(html) {
  const out = [];
  const res = [
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount|product:sale_price:amount)["'][^>]*content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/gi,
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/gi,
    /content=["']([^"']+)["'][^>]*itemprop=["']price["']/gi
  ];
  for (const re of res) { let m; while ((m = re.exec(html))) { const p = num(m[1]); if (p) out.push(p); } }
  return out;
}

function grab(html, re) {
  const out = []; let m;
  while ((m = re.exec(html))) { const p = num(m[1]); if (p) out.push(p); }
  return out;
}

/* Mağazaya özgü alanlar. Sıra önemli: dosyadaki fiyat hangi alandan alındıysa önce o. */
const SITE = {
  'n11.com': (h) => [
    ...grab(h, /"finalP"\s*:\s*([\d.]+)/g),
    ...grab(h, /"priceFloat"\s*:\s*([\d.]+)/g),
    ...grab(h, /"displayPriceFloat"\s*:\s*([\d.]+)/g)
  ],
  'aslanpetek.com': (h) => [
    ...grab(h, /id="pbProductPriceCurrent"[^>]*>\s*([\d.,]+)/g),
    ...grab(h, /"base_price"\s*:\s*([\d.]+)/g)
  ],
  /* Şok (Next.js RSC): ürünün "discounted" alanı $id ile fiyat nesnesine bağlanır: 1b:{\"value\":219,\"text\":\"219,00\"…} */
  'sokmarket.com.tr': (h) => {
    const m = /\\"discounted\\":\\"\$([0-9a-z]+)\\"/.exec(h);
    if (!m) return [];
    const v = new RegExp('(?:\\\\n|")' + m[1] + ':\\{\\\\"value\\\\":([\\d.]+),').exec(h);
    return v ? [num(v[1])].filter(Boolean) : [];
  }
};
/* IdeaSoft (aricimarketi, aricobani, civan…): itemprop meta yoksa sayfa betiğindeki salePrice */
function fromPlatform(html) {
  /* yalnız ilk eşleşme: benzer ürün listelerindeki fiyatlar karışmasın */
  return grab(html, /\bsalePrice\s*:\s*([\d.]+)/g).slice(0, 1);
}

function hostKey(u) {
  try { return new URL(u).hostname.replace(/^(www|market)\./, ''); } catch (e) { return '?'; }
}

/* Dosyadaki eski fiyata en yakın olanı değil, ÖNCELİK sırasındaki ilk makul adayı seç (yakınlık seçimi fiyat uydurmaya döner). */
function extractPrice(html, url, oldPrice) {
  const host = hostKey(url);
  const site = Object.keys(SITE).find((k) => host === k || host.endsWith('.' + k));
  const groups = [
    ['site', site ? SITE[site](html) : []],
    ['jsonld', fromJsonLd(html)],
    ['meta', fromMeta(html)],
    ['platform', fromPlatform(html)]
  ];
  let suspicious = null;
  for (const [via, list] of groups) {
    for (const p of list) {
      const ratio = oldPrice ? p / oldPrice : 1;
      if (ratio >= SANE_LOW && ratio <= SANE_HIGH) return { price: p, via };
      if (suspicious == null) suspicious = { price: p, via };
    }
    if (list.length) break; /* en öncelikli kaynakta fiyat var ama makul değilse alt kaynağa düşme */
  }
  return suspicious ? { error: 'şüpheli fiyat ' + suspicious.price + ' (' + suspicious.via + ')' } : { error: 'fiyat bulunamadı' };
}

async function fetchHtml(url, deadline) {
  const left = Math.min(HOST_TIMEOUT[hostKey(url)] || PER_REQ_MS, deadline - Date.now());
  if (left < 300) throw new Error('süre doldu');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), left);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctl.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'accept-language': 'tr-TR,tr;q=0.9,en;q=0.5' }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    return txt.length > MAX_BYTES ? txt.slice(0, MAX_BYTES) : txt;
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('zaman aşımı');
    throw e;
  } finally { clearTimeout(timer); }
}

/* Ana makine başına eşzamanlılık: küçük mağazalar 429 döndürmesin; n11 paralel kaldırabiliyor. */
const HOST_LIMIT = { 'n11.com': 64, 'aricimarketi.com': 2, 'avrasyaaricilik.com.tr': 8, 'ermisaricilik.com': 20, 'sokmarket.com.tr': 6, 'aricobani.net': 2 };
/* ermisaricilik, akabebal: önbellekte olmayan sayfa ~5–6 sn'de üretiliyor (paralel istekler de aynı sürede döner) → daha uzun istek süresi */
const HOST_TIMEOUT = { 'ermisaricilik.com': 7500, 'akabebal.com': 7500 };
const DEFAULT_LIMIT = 3;
/* Otomatik okunamayan siteler: istek atılmaz, dosyadaki fiyatla kalır (live:false), sayfadan elle güncellenir. */
const NO_FETCH = {
  'akakce.com': 'Cloudflare bot koruması (403/429)',
  'eylularicilik.com': 'sunucu yurt dışı / veri merkezi bağlantısını kesiyor (TLS)'
};
const lanes = new Map();
function limited(host, fn) {
  let L = lanes.get(host);
  if (!L) { L = { active: 0, q: [] }; lanes.set(host, L); }
  const max = HOST_LIMIT[host] || DEFAULT_LIMIT;
  return new Promise((resolve, reject) => {
    const run = () => {
      L.active++;
      Promise.resolve().then(fn).then(resolve, reject).finally(() => { L.active--; const nx = L.q.shift(); if (nx) nx(); });
    };
    if (L.active < max) run(); else L.q.push(run);
  });
}
/* Zaman aşımı / 429 / 5xx: bütçe kalırsa bir kez daha dene */
async function fetchWithRetry(url, deadline) {
  const host = hostKey(url);
  try {
    return await limited(host, () => fetchHtml(url, deadline));
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (!/zaman aşımı|HTTP (429|5\d\d)|fetch failed/.test(msg) || deadline - Date.now() < 2000) throw e;
    await new Promise((r) => setTimeout(r, /429/.test(msg) ? 1200 : 50));
    return limited(host, () => fetchHtml(url, deadline));
  }
}

function median(a) {
  const s = a.slice().sort((x, y) => x - y), n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
}

/* fiyat-ref.json yöntemi: aykırı (medyanın 2,5 katı dışı) yalnız 3+ kaynakta; 4+ → kırpılmış ortalama, 2–3 → medyan,
   1 → o fiyat (not «Tek kaynak …» ile işaretlenir), 0 → ref yok. */
const TEK = 'Tek kaynak';
function recompute(item) {
  const src = item.sources || [];
  const ok = (v) => typeof v === 'number' && v > 0;
  const vals = src.map((s) => s.unitPrice).filter(ok);
  const med = vals.length >= 3 ? median(vals) : null;
  const kept = [];
  let one = null;
  for (const s of src) {
    const v = s.unitPrice;
    const out = !ok(v) || (med && (v > med * 2.5 || v < med / 2.5));
    if (out) s.outlier = true; else { delete s.outlier; kept.push(v); one = s; }
  }
  kept.sort((a, b) => a - b);
  const n = kept.length;
  let ref = null;
  if (n >= 4) ref = kept.slice(1, -1).reduce((a, b) => a + b, 0) / (n - 2);
  else if (n >= 2) ref = median(kept);
  else if (n === 1) ref = kept[0];
  item.ref = ref == null ? null : r2(ref);
  item.min = n ? r2(kept[0]) : null;
  item.max = n ? r2(kept[n - 1]) : null;
  item.n = n;
  /* tek kaynak notu: varsa korunur, yoksa yazılır; kaynak sayısı artınca kaldırılır */
  const note = String(item.note || '');
  if (n === 1) { if (note.indexOf(TEK) !== 0) item.note = TEK + ': ' + (one.name || 'satıcı') + ' — ortalama değil, tek satıcının fiyatı.' + (note ? ' ' + note : ''); }
  else if (note.indexOf(TEK) === 0) delete item.note;
  return item;
}

async function refresh() {
  const t0 = Date.now();
  const deadline = t0 + TOTAL_MS;
  const data = JSON.parse(JSON.stringify(BASE));
  const baseDate = String(BASE.updated || '');
  const jobs = [];
  const cache = new Map(); /* aynı URL tek kez çekilir */
  for (const item of data.items || []) {
    for (const s of item.sources || []) {
      if (!s.url || !(s.price > 0) || !(s.unitPrice > 0)) { s.live = false; s.fetchedAt = s.fetchedAt || baseDate; s.error = 'eksik kaynak'; continue; }
      const nf = NO_FETCH[hostKey(s.url)];
      if (nf) { s.live = false; s.fetchedAt = s.fetchedAt || baseDate; s.error = 'otomatik okunmuyor: ' + nf; continue; }
      if (!cache.has(s.url)) cache.set(s.url, fetchWithRetry(s.url, deadline).then((html) => ({ html }), (e) => ({ err: String((e && e.message) || e) })));
      jobs.push(cache.get(s.url).then((res) => {
        const now = new Date().toISOString();
        const prev = { price: s.price, unitPrice: s.unitPrice };
        let r = res.err ? { error: res.err } : extractPrice(res.html, s.url, s.price);
        if (r.price) {
          s.unitPrice = r2(prev.unitPrice * r.price / prev.price);
          s.price = r2(r.price);
          s.live = true;
          s.fetchedAt = now;
          s.via = r.via;
          if (Math.abs(s.price - prev.price) >= 0.005) { s.prevPrice = prev.price; s.prevUnitPrice = prev.unitPrice; }
          delete s.error;
        } else {
          s.live = false;
          s.fetchedAt = s.fetchedAt || baseDate;
          s.error = r.error;
        }
      }));
    }
  }
  await Promise.all(jobs);
  const bySite = {};
  let ok = 0, failed = 0;
  for (const item of data.items || []) {
    const hadRef = item.ref != null;
    recompute(item);
    if (hadRef && item.ref == null && !item.note) item.note = 'Güncel fiyatlarla geçerli kaynak kalmadı; referans hesaplanamadı — fiyatı kendiniz girin.';
    item.liveCount = (item.sources || []).filter((s) => s.live).length;
    for (const s of item.sources || []) {
      const h = hostKey(s.url);
      const b = bySite[h] || (bySite[h] = { ok: 0, failed: 0 });
      if (s.live) { b.ok++; ok++; } else { b.failed++; failed++; }
    }
  }
  data.baseUpdated = baseDate;
  data.updated = new Date().toISOString();
  data.live = { total: ok + failed, ok, failed, durationMs: Date.now() - t0, bySite };
  return data;
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'yalnız GET' })); }
  try {
    const data = await refresh();
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'fiyat yenilenemedi', detail: String((e && e.message) || e) }));
  }
}

module.exports = handler;
module.exports.refresh = refresh;
module.exports.recompute = recompute;
module.exports.extractPrice = extractPrice;
module.exports.num = num;
module.exports.NO_FETCH = NO_FETCH;
