/**
 * SüperArı — koloni (önizleme): TCMB döviz kuru (USD, EUR → TL).
 * GET /api/kur → { kaynak, url, tarih (TCMB bülten tarihi GG.AA.YYYY), alindi (ISO), kurlar: { USD, EUR } }
 *   Kur: TCMB «Döviz Satış» (ForexSelling), https://www.tcmb.gov.tr/kurlar/today.xml
 *   TCMB tarayıcıdan CORS izni vermediği için yönetici paneli bu uçtan okur (aynı alan adı).
 *   Vercel CDN önbelleği 1 saat (s-maxage=3600); TCMB bülteni iş günlerinde 15:30'da yayımlanır.
 *   Okunamazsa 502 + { hata } — kur UYDURULMAZ, panel «Veri yok» gösterir.
 */
const URL_TCMB = 'https://www.tcmb.gov.tr/kurlar/today.xml';

function ayikla(xml) {
  const tarih = (xml.match(/Tarih="([^"]+)"/) || [])[1] || null;
  const kurlar = {};
  ['USD', 'EUR'].forEach((c) => {
    const b = (xml.match(new RegExp('CurrencyCode="' + c + '"[\\s\\S]*?</Currency>')) || [])[0];
    const v = b && (b.match(/<ForexSelling>([^<]*)</) || [])[1];
    const n = v ? Number(String(v).replace(',', '.')) : NaN;
    if (isFinite(n) && n > 0) kurlar[c] = n;
  });
  return { tarih, kurlar };
}

async function handler(req, res) {
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(URL_TCMB, { signal: ctl.signal, headers: { 'User-Agent': 'SuperAri/1.0 (+https://superari.vercel.app)' } });
    clearTimeout(t);
    if (!r.ok) throw new Error('TCMB yanıtı ' + r.status);
    const o = ayikla(await r.text());
    if (!o.kurlar.USD && !o.kurlar.EUR) throw new Error('TCMB kur bulunamadı');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ kaynak: 'TCMB döviz satış', url: URL_TCMB, tarih: o.tarih, alindi: new Date().toISOString(), kurlar: o.kurlar });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ hata: String((e && e.message) || e) });
  }
}
module.exports = handler;
module.exports.ayikla = ayikla;
