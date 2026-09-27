/**
 * SüperArı — Canlı sağlık skoru (yalnız gerçek verilerden; iç model gizli).
 * Kaynaklar: muayene (Kolay / sesle), koloni gücü, yavru/ana, hastalık-varroa-ilaç kayıtları, besleme, oğul riski,
 * elle / cihaz tartımı; buluttan gelen değişiklikler de aynı depolara yazıldığı için otomatik dahil olur.
 * Yeni veri geldikçe (superari-records-changed / superari-cloud-pulled) yeniden hesaplanır.
 * Arayüze yalnız 0–100 skor, durum (Sağlıklı / İzle / Kontrol / Müdahale), sade gerekçeler ve «son muayene … gün önce / veri az» ipucu çıkar.
 * Skor geçmişi (kovan başına) superari.saglikSkor.v1 deposunda tutulur ve buluta eşitlenir (records, colony_event type 'saglik').
 * Demo veriler Canlı skora asla girmez; Demo modda bu modül skor üretmez.
 */
(function (global) {
  'use strict';
  var KEY = 'superari.saglikSkor.v1', KICK = 'superari.saglikKick.v1', MAXH = 90;
  function D() { return global.SuperAriDemo; }
  function isLive() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function clamp(n, lo, hi) { n = Number(n); if (!isFinite(n)) return lo; return Math.max(lo, Math.min(hi, n)); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function daysAgo(iso) {
    if (!iso) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso)); if (!m) return null;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((t - new Date(+m[1], m[2] - 1, +m[3])) / 86400000));
  }
  /* yakın tarihli veri daha ağır */
  function recency(days) { if (days == null) return 0; if (days <= 7) return 1; if (days <= 14) return 0.85; if (days <= 30) return 0.65; if (days <= 60) return 0.4; if (days <= 120) return 0.2; return 0.08; }
  function band(score) {
    if (score == null) return { key: 'none', label: 'Veri az', tone: 'gray', hint: 'Skor için bir muayene kaydı gerekir' };
    var SH = global.SuperAriSensorHealth;
    if (SH && SH.band) return SH.band(score);
    if (score >= 85) return { key: 'ok', label: 'Sağlıklı', tone: 'green' };
    if (score >= 70) return { key: 'watch', label: 'İzle', tone: 'yellow' };
    if (score >= 50) return { key: 'check', label: 'Kontrol', tone: 'orange' };
    return { key: 'act', label: 'Müdahale', tone: 'red' };
  }
  var LV = { temiz: 0, izle: 1, orta: 2, 'yüksek': 3, kritik: 4 };
  var DZ = { varroa: [0, 3, 10, 18, 26], nosema: [0, 2, 6, 11, 15], kirec: [0, 2, 5, 10, 12], eyc: [0, 3, 8, 13, 18],
    tulumsu: [0, 2, 5, 9, 12], dwv: [0, 2, 6, 10, 14], mumguvesi: [0, 1, 3, 6, 8], ayc: [0, 0, 0, 25, 60] };
  var LVTXT = { izle: 'izlenmeli', orta: 'orta düzeyde', 'yüksek': 'yüksek', kritik: 'kritik' };
  function live(x) { return x && !x.demo; }

  /** Elle tartım serisi (tarti-elle.js ile aynı: eklenen kat/besleme ağırlığı sonraki okumalardan düşülür). Yalnız Canlı depo. */
  function weightSeries(hiveId, days) {
    var rows = []; try { rows = JSON.parse(global.localStorage.getItem('superari.tartiElle.v1') || '[]'); } catch (e) { rows = []; }
    if (!Array.isArray(rows)) return [];
    var from = new Date(Date.now() - (days || 21) * 86400000).toISOString().slice(0, 10), off = 0;
    return rows.filter(function (x) { return x && !x.demo && String(x.hiveId) === String(hiveId) && x.at; })
      .sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); })
      .map(function (x) { off += Number(x.addKg) || 0; return { date: String(x.date || x.at).slice(0, 10), net: Math.round((Number(x.kg) - off) * 100) / 100 }; })
      .filter(function (p) { return p.date >= from && isFinite(p.net); });
  }
  /** Tek kovan için Canlı değerlendirme. */
  function evaluate(h) {
    var out = { hiveId: h && h.id, apiaryId: h && h.apiaryId, name: (h && (h.name || ('Kovan ' + h.id))) || '—', live: true,
      score: null, band: band(null), reasons: [], positives: [], actions: [], materials: [], hint: '', confidence: 'yok', lastDays: null, trend: '' };
    var DD = D(); if (!h || !DD || !DD.records) return out;
    var st; try { st = DD.records.status(h.id); } catch (e) { return out; }
    var rec = st.records || {};
    var strength = (rec.strength || []).filter(live), brood = (rec.brood || []).filter(live), disease = (rec.disease || []).filter(live), feed = (rec.feed || []).filter(live);
    var pens = [], acts = [], pos = [];
    function pen(p, days, text, kind, detail) { var w = recency(days); if (w <= 0 || p <= 0) return; pens.push({ p: p * w, text: text }); if (kind) acts.push({ kind: kind, title: text, detail: detail || '' }); }
    var s = strength[0] || null, b = brood[0] || null;
    var lastInsp = null;
    [s, b].forEach(function (r) { if (r && r.date && (!lastInsp || r.date > lastInsp)) lastInsp = r.date; });
    var dataPoints = 0, qcap = 100;
    if (b) {
      dataPoints++;
      var db = daysAgo(b.date);
      if (b.queenless && db != null && db <= 30) qcap = 60; /* yakın tarihte anasız → en az «Kontrol» */
      if (b.queenless) pen(30, db, 'Son muayenede ana arı ve yumurta görülmedi', 'yavru', 'Ana arı verin veya birleştirin; 1 hafta içinde tekrar bakın.');
      else if (b.eggs === false) pen(10, db, 'Son muayenede yumurta görülmedi', 'yavru', 'Birkaç gün içinde yumurta / genç larva kontrolü yapın.');
      else if (b.eggs) pos.push('Yumurta / ana arı görüldü');
      if (b.pattern === 'daginik') pen(14, db, 'Yavru düzeni dağınık', 'yavru', 'Ana arı ve hastalık belirtisi açısından bakın.');
      else if (b.pattern === 'duzenli') pos.push('Yavru düzenli');
      if (b.queenCell === 'ogul') pen(8, db, 'Oğul memesi görüldü', 'ogul', 'Yer açın, bölme düşünün.');
      else if (b.queenCell === 'yenileme') pen(4, db, 'Sessiz ana değiştirme memesi görüldü', null);
      if (b.chilled) pen(8, db, 'Üşümüş yavru görüldü', 'yavru', 'Çerçeve azaltın veya birleştirin.');
      if (b.varroaSeen === 'cok') pen(18, db, 'Muayenede çok varroa / bozuk kanatlı arı görüldü', 'varroa', 'Sayım ve mücadele planlayın.');
      else if (b.varroaSeen === 'az') pen(6, db, 'Muayenede birkaç varroa görüldü', 'varroa', 'Sayım yapın.');
      if (b.diseaseSign) pen(12, db, 'Muayenede hastalık belirtisi işaretlendi', 'varroa', 'Hastalık tahminini açın, gerekirse numune alın.');
    }
    if (s) {
      dataPoints++;
      var ds = daysAgo(s.date), bee = Number(s.beeFrames);
      if (isFinite(bee) && s.beeFrames != null) {
        if (bee <= 3) pen(16, ds, 'Koloni çok zayıf (' + bee + ' çerçeve arı)', 'besleme', 'Birleştirme veya destek çerçevesi düşünün.');
        else if (bee <= 5) pen(7, ds, 'Koloni zayıf (' + bee + ' çerçeve arı)', null);
        else if (bee >= 8) pos.push('Koloni güçlü (' + bee + ' çerçeve arı)');
        var prev = strength[1];
        if (prev && daysAgo(prev.date) - ds <= 60 && Number(prev.beeFrames) - bee >= 2) pen(6, ds, 'Koloni son muayeneye göre küçüldü (' + prev.beeFrames + ' → ' + bee + ' çerçeve)', null);
      }
      if (s.honeyFrames != null && Number(s.honeyFrames) < 2) {
        var fedRecent = feed.some(function (f) { var d = daysAgo(f.date); return d != null && d <= 14; });
        if (fedRecent) pen(3, ds, 'Stok az (besleme yapıldı)', null);
        else pen(8, ds, 'Bal / polen stoğu az', 'besleme', 'Mevsime uygun besleme yapın.');
      }
      if (s.varroaSeen === 'cok' && !(b && b.varroaSeen)) pen(18, ds, 'Muayenede çok varroa / bozuk kanatlı arı görüldü', 'varroa', 'Sayım ve mücadele planlayın.');
    }
    /* Hastalık / varroa sayım / ilaç kayıtları */
    var latest = {};
    disease.forEach(function (r) { if (r.disease && !latest[r.disease]) latest[r.disease] = r; });
    var cap = 100, lastTreat = null;
    disease.forEach(function (r) { if ((r.treatment || r.dose != null) && (!lastTreat || r.date > lastTreat)) lastTreat = r.date; });
    Object.keys(latest).forEach(function (k) {
      var r = latest[k], lv; try { lv = DD.records.diseaseLevel(r).level; } catch (e) { lv = 'temiz'; }
      var d = daysAgo(r.date), p = (DZ[k] || [0, 2, 5, 9, 12])[LV[lv] || 0] || 0;
      dataPoints++;
      if (!p) { if (k === 'varroa' && d != null && d <= 45) pos.push('Varroa sayımı temiz'); return; }
      if (k !== 'ayc' && lastTreat && lastTreat >= r.date && daysAgo(lastTreat) <= 45) { p = p * 0.5; pos.push('İlaçlama yapıldı'); }
      var label = (DD.records.DISEASE_LABEL && DD.records.DISEASE_LABEL[k]) || k;
      pen(p, d, label + ' ' + (LVTXT[lv] || lv), 'varroa', 'Kontrol sayımı / tedavi planlayın.');
      if (k === 'ayc' && r.status === 'dogrulandi') cap = 40;
      else if (k === 'ayc' && r.status === 'suphe') cap = Math.min(cap, 60);
    });
    if (st.queenless && !(b && b.queenless)) pen(22, 0, 'Koloni anasız olarak işaretli', 'yavru', 'Ana arı verin veya birleştirin.');
    /* Oğul riski (gerçek kayıtlardan hesaplanan) */
    var sw = null; try { sw = DD.colony && DD.colony.swarm ? DD.colony.swarm(h) : null; } catch (e) { sw = null; }
    var swLevel = sw && sw.level ? sw.level : '';
    if (swLevel === 'Çok yüksek') pen(12, 0, 'Oğul riski çok yüksek', 'ogul', 'Ballık, ana memesi ve yer kontrolü yapın.');
    else if (swLevel === 'Yüksek') pen(8, 0, 'Oğul riski yüksek', 'ogul', 'Ballık ve ana memesi kontrolü yapın.');
    /* Tartı (elle; cihaz verisi ileride aynı seriye eklenir) */
    {
      try {
        var ser = weightSeries(h.id, 21);
        if (ser.length >= 2) {
          dataPoints++;
          var last = ser[ser.length - 1], first = ser[0], dkg = Math.round((last.net - first.net) * 10) / 10;
          if (dkg <= -2) pen(dkg <= -4 ? 10 : 6, daysAgo(last.date), 'Ağırlık son ' + Math.max(1, daysAgo(first.date) - daysAgo(last.date)) + ' günde ' + String(Math.abs(dkg)).replace('.', ',') + ' kg azaldı', 'besleme', 'Stok ve yağma kontrolü yapın.');
          else if (dkg >= 2) pos.push('Ağırlık artıyor (+' + String(dkg).replace('.', ',') + ' kg)');
        }
      } catch (e) { /* ignore */ }
    }
    var ld = daysAgo(lastInsp);
    out.lastDays = ld;
    if (!dataPoints) { out.hint = 'Henüz muayene kaydı yok · veri az'; out.positives = pos; return out; }
    var raw = 100 - pens.reduce(function (a, x) { return a + x.p; }, 0);
    /* eski veri güveni düşürür: iyi skor «İzle»ye doğru çekilir (kötü skor yükseltilmez) */
    var c = ld == null ? 0.3 : ld <= 14 ? 1 : ld <= 30 ? 0.6 : ld <= 60 ? 0.3 : 0;
    var cc = dataPoints < 2 ? c * 0.8 : c;
    if (raw > 75) raw = 75 + (raw - 75) * cc;
    var score = Math.round(clamp(Math.min(raw, cap, qcap), 0, 100));
    out.score = score; out.band = band(score);
    out.confidence = c >= 1 && dataPoints >= 2 ? 'yuksek' : c >= 0.65 ? 'orta' : 'dusuk';
    pens.sort(function (a, b2) { return b2.p - a.p; });
    out.reasons = pens.filter(function (x) { return x.p >= 1; }).map(function (x) { return x.text; }).slice(0, 4);
    out.positives = pos.slice(0, 3);
    out.hint = ld == null ? 'Muayene kaydı yok · veri az' : (ld === 0 ? 'Son muayene bugün' : 'Son muayene ' + ld + ' gün önce') + (ld > 30 ? ' · veri eski' : (dataPoints < 2 ? ' · veri az' : ''));
    var seen = {};
    out.actions = acts.filter(function (a) { if (seen[a.title]) return false; seen[a.title] = 1; return true; }).slice(0, 4);
    if (!out.actions.length && (out.band.key === 'check' || out.band.key === 'act')) out.actions.push({ kind: 'genel', title: 'Genel kontrol', detail: 'Giriş, kapak ve koloni gücüne bakın.' });
    if (ld != null && ld > 30) out.actions.push({ kind: 'genel', title: 'Muayene zamanı', detail: 'Son muayene ' + ld + ' gün önce.' });
    var SH = global.SuperAriSensorHealth;
    out.materials = SH && SH.materialsForActions ? SH.materialsForActions(out.actions) : [];
    out.primaryKind = out.actions[0] ? out.actions[0].kind : null;
    out.openHive = score < 50;
    out.swarm = swLevel;
    out.trend = trendOf(h.id, score);
    return out;
  }

  /* ---- Skor geçmişi ---- */
  function readH() { try { var v = JSON.parse(global.localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } }
  function writeH(m) { try { global.localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* ignore */ } }
  function history(hiveId) { var m = readH(); return (m[String(hiveId)] || []).slice(); }
  /** ↑ / ↓ : ≥5 gün önceki (yoksa ilk) kayda göre ≥5 puan fark. */
  function trendOf(hiveId, score) {
    var list = history(hiveId); if (!list.length || score == null) return '';
    var ref = null, today = todayIso();
    for (var i = list.length - 1; i >= 0; i--) { var d = daysAgo(list[i].date); if (d != null && d >= 5) { ref = list[i]; break; } }
    if (!ref) ref = list[0]; /* 5 günden eski kayıt yoksa ilk kayda göre */
    if (!ref) return '';
    var diff = score - Number(ref.score);
    return diff >= 5 ? 'up' : diff <= -5 ? 'down' : '';
  }
  var BAD = { check: 1, act: 1 };
  /** Değerlendirmeyi geçmişe yaz (durum değişince, ≥3 puan oynayınca veya günde bir kez fark varsa). */
  function record(ev, m) {
    if (!ev || ev.score == null || ev.hiveId == null) return false;
    var k = String(ev.hiveId), list = m[k] = m[k] || [], last = list[list.length - 1], today = todayIso();
    if (last && last.status === ev.band.label && (Math.abs(last.score - ev.score) < 3) && (last.date === today || last.score === ev.score)) return false;
    var e = { id: 'hs' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), hiveId: ev.hiveId, at: new Date().toISOString(), date: today,
      score: ev.score, status: ev.band.label, reasons: ev.reasons.slice(0, 3) };
    if (ev.swarm) e.swarm = ev.swarm;
    list.push(e);
    if (list.length > MAXH) list.splice(0, list.length - MAXH);
    if (BAD[ev.band.key] && (!last || last.status !== e.status)) { try { global.localStorage.setItem(KICK, String(Date.now())); } catch (x) { /* ignore */ } }
    return true;
  }
  /** Tüm Canlı kovanları yeniden hesapla ve geçmişe işle. */
  function recalcAll() {
    if (!isLive()) return 0;
    var DD = D(); if (!DD) return 0;
    var hives = []; try { hives = DD.loadHives ? DD.loadHives() : (DD.hives || []); } catch (e) { hives = []; }
    var m = readH(), n = 0, ids = {};
    hives.forEach(function (h) { if (!h || h.demo) return; ids[String(h.id)] = 1; try { if (record(evaluate(h), m)) n++; } catch (e) { /* ignore */ } });
    Object.keys(m).forEach(function (k) { if (!ids[k] && !(m[k] && m[k].length)) delete m[k]; });
    if (n) { writeH(m); try { global.dispatchEvent(new CustomEvent('superari-health-updated', { detail: { changed: n } })); } catch (e) { /* ignore */ } }
    return n;
  }
  var tmr = null;
  function soon(ms) { clearTimeout(tmr); tmr = setTimeout(recalcAll, ms || 1500); }
  global.addEventListener('superari-records-changed', function () { soon(1500); });
  global.addEventListener('superari-cloud-pulled', function () { soon(1500); });
  global.addEventListener('storage', function (e) { if (e.key && /koloniKayit|tartiElle|hives/.test(e.key)) soon(2000); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { soon(900); }); else soon(900);

  global.SuperAriLiveHealth = { evaluate: evaluate, recalcAll: recalcAll, history: history, trendOf: trendOf, isLive: isLive, band: band, KEY: KEY, KICK: KICK };
})(window);
