/**
 * SüperArı — Stok alım talebi (Alınacaklar).
 * Kovan başına ihtiyaç: son 21 günde muayene edilen kovan → muayene bulgularından gerçek ihtiyaç
 * (bakim-plan.js feedPlan / medPlan etiket şerit dozu, açık [muayene-oto:*] görevleri, D.colony.boxes);
 * muayenesiz kovan → mevsim + tarih + ırk (kışlık hedef) + bilinen güç ile TAHMİN, tahmin payı (varsayılan %20) eklenir.
 * Kovan muayene edilince tahmini kendiliğinden gerçek ihtiyaçla değişir (her hesapta yeniden okunur).
 * Fiyat: önce kullanıcının girdiği birim fiyat (tarihli, superari.stok.fiyat.v1), yoksa data/fiyat-ref.json ortalaması
 * (her açılışta no-store + ?t= ile taze okunur; gömülü / önbellekli kopya yok), yoksa «fiyat girin». Varsayılan fiyat YOK.
 * Talepler: superari.stok.talep.v1 (canlı; bulut.js records kind colony_event, local_id 'tl:<id>') / superari.stok.talep.demo.v1 (demo, buluta gitmez).
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function live() { try { return global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function readJ(k, d) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function writeJ(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function R() { return D.records; }
  function today() { return R().todayLocal(); }
  function addDays(d, n) { return R().addDays(d, n); }
  function daysSince(iso) { var a = Date.parse(String(iso || '').slice(0, 10) + 'T00:00:00Z'), b = Date.parse(today() + 'T00:00:00Z'); return isFinite(a) ? Math.round((b - a) / 86400000) : null; }
  function norm(s) {
    return String(s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i' }[c]; })
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* ---------------- Katalog ----------------
   * scope: hive (kovan başına ölçeklenir) · apiary (arılık başına bir kez) · operator (işletme geneli, bir kez)
   * dur: dayanıklı → tahmin payı eklenmez · confirm: etiket dozu bilinmiyor → yalnız paket, teyit gerekli
   * re: normalleştirilmiş stok adı (ç→c …) ile eşleşme · cats: bu stok türünde ad eşleşmese de sayılır */
  var GROUPS = [
    { key: 'besleme', label: 'Besleme' }, { key: 'ilac', label: 'İlaç' }, { key: 'koruyucu', label: 'Koruyucu' },
    { key: 'uygulama', label: 'Uygulama ekipmanı' }, { key: 'tutsu', label: 'Tütsü' }, { key: 'kovan', label: 'Kovan' },
    { key: 'temizlik', label: 'Temizlik / hijyen' }, { key: 'diger', label: 'Diğer' }
  ];
  var CAT = [
    { key: 'seker', g: 'besleme', name: 'Şeker (toz)', unit: 'kg', step: 1, re: /seker/, cats: ['seker'], note: 'şurup için; stoktaki şurup şeker karşılığıyla sayılır' },
    { key: 'kek', g: 'besleme', name: 'Kek / fondan', unit: 'kg', step: 0.5, re: /\bkek|fondan/, cats: ['kek'] },
    { key: 'polen', g: 'besleme', name: 'Polen / polen ikamesi', unit: 'kg', step: 0.5, re: /polen/, cats: ['polen'] },
    { key: 'vitamin', g: 'besleme', name: 'Vitamin / besin takviyesi', unit: 'paket', step: 1, scope: 'apiary', re: /vitamin|takviye/, note: 'etiketteki kullanıma göre; doz yazılmaz' },
    { key: 'tuz', g: 'besleme', name: 'Tuz (suluk / tuzlu su)', unit: 'kg', step: 1, scope: 'apiary', re: /\btuz/ },
    { key: 'serit_amitraz', g: 'ilac', name: 'Varroa şeridi — amitraz', unit: 'şerit', step: 1, re: /amitraz|beeraz|rulamit|vamitrat/ },
    { key: 'serit_flumetrin', g: 'ilac', name: 'Varroa şeridi — flumetrin', unit: 'şerit', step: 1, re: /flumetrin|bayvarol|beevarflu|varodur|fumbee|polyvar/ },
    { key: 'serit_taufluvalinat', g: 'ilac', name: 'Varroa şeridi — tau-fluvalinat', unit: 'şerit', step: 1, re: /fluvalinat|apistan/ },
    { key: 'serit_koumafos', g: 'ilac', name: 'Varroa şeridi — koumafos', unit: 'şerit', step: 1, re: /koumafos|kumafos|checkmite/ },
    { key: 'ilac_teyit', g: 'ilac', name: 'Varroa ilacı — etiket dozu teyit edilecek', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: null },
    { key: 'okzalik', g: 'ilac', name: 'Okzalik asit', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /ok[sz]alik|oxalic/ },
    { key: 'formik', g: 'ilac', name: 'Formik asit', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /formik|formic/ },
    { key: 'timol', g: 'ilac', name: 'Timol', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /timol|thymol/ },
    { key: 'nitril', g: 'koruyucu', name: 'Nitril eldiven (100’lük kutu)', unit: 'paket', step: 1, re: /nitril/ },
    { key: 'gozluk', g: 'koruyucu', name: 'Koruyucu gözlük', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /gozluk/ },
    { key: 'maske', g: 'koruyucu', name: 'Maske / respiratör (asit)', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /maske|respirator/ },
    { key: 'arici_eldiven', g: 'koruyucu', name: 'Arıcı eldiveni (çift)', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /eldiven/ },
    { key: 'siringa', g: 'uygulama', name: 'Damlatma şırıngası', unit: 'adet', step: 1, scope: 'apiary', dur: true, re: /siringa|damlatma/ },
    { key: 'buharlastirici', g: 'uygulama', name: 'Okzalik buharlaştırıcı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /buharlastirici|sublimat/ },
    { key: 'olcu_kabi', g: 'uygulama', name: 'Ölçü kabı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /olcu kab|olcek/ },
    { key: 'alt_tabla', g: 'uygulama', name: 'Yapışkanlı alt tabla (akar sayımı)', unit: 'adet', step: 1, re: /alt tabla|yapiskanli/ },
    { key: 'alkol_kabi', g: 'uygulama', name: 'Alkol yıkama kabı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /yikama kab/ },
    { key: 'alkol', g: 'uygulama', name: 'Alkol (akar sayımı için)', unit: 'L', step: 0.5, re: /alkol|etanol|etil/ },
    { key: 'koruk', g: 'tutsu', name: 'Tütsü körüğü', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /koruk|tutsu/ },
    { key: 'koruk_yakit', g: 'tutsu', name: 'Körük yakıtı (çuval / talaş / pamuk)', unit: 'kg', step: 1, re: /yakit|cuval|talas|pamuk/ },
    { key: 'cakmak', g: 'tutsu', name: 'Çakmak / kibrit', unit: 'paket', step: 1, scope: 'apiary', re: /cakmak|kibrit/ },
    { key: 'cerceve', g: 'kovan', name: 'Çerçeve', unit: 'adet', step: 1, re: /cerceve/, cats: ['cerceve'] },
    { key: 'temel_petek', g: 'kovan', name: 'Temel petek', unit: 'adet', step: 1, re: /temel|petek/, cats: ['temelPetek'] },
    { key: 'kat', g: 'kovan', name: 'Kat / ballık', unit: 'adet', step: 1, dur: true, re: /\bkat\b|ballik|kovan|govde/, cats: ['kovan'] },
    { key: 'kapi_daraltici', g: 'kovan', name: 'Kapı daraltıcı', unit: 'adet', step: 1, dur: true, re: /daraltic/ },
    { key: 'besleyici', g: 'kovan', name: 'Besleyici (feeder)', unit: 'adet', step: 1, dur: true, re: /besleyici|feeder|beslik/ },
    { key: 'ana_izgarasi', g: 'kovan', name: 'Ana ızgarası', unit: 'adet', step: 1, dur: true, re: /izgara/ },
    { key: 'dezenfektan', g: 'temizlik', name: 'Dezenfektan', unit: 'L', step: 0.5, re: /dezenfektan|hipoklorit|camasir suyu|kostik/ },
    { key: 'kaziyici', g: 'temizlik', name: 'Kazıyıcı / el aleti', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /kaziyici|el aleti|maspala/ }
  ];
  var BY = {}; CAT.forEach(function (c) { BY[c.key] = c; });
  /* Eşleşme sırası: özel adlar önce (ör. «Okzalik buharlaştırıcı» asit değil, «Körük yakıtı» körük değil, «Alkol yıkama kabı» alkol değil) */
  var FIRST = ['buharlastirici', 'alkol_kabi', 'koruk_yakit', 'nitril', 'siringa', 'alt_tabla', 'temel_petek'];
  var MATCH = FIRST.map(function (k) { return BY[k]; }).concat(CAT.filter(function (c) { return FIRST.indexOf(c.key) < 0; }));
  var CATGROUP = { surup: 'besleme', seker: 'besleme', kek: 'besleme', polen: 'besleme', ilac: 'ilac', cerceve: 'kovan', temelPetek: 'kovan', kovan: 'kovan', ekipman: 'uygulama', diger: 'diger' };

  /* ---------------- Ayarlar: tahmin payı, fiyatlar ---------------- */
  var TOL_KEY = 'superari.stok.tolerans.v1', PRICE_KEY = 'superari.stok.fiyat.v1';
  function tol() { var v = Number(readJ(TOL_KEY, 20)); return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 20; }
  function setTol(v) { writeJ(TOL_KEY, Math.max(0, Math.min(100, Math.round(Number(v) || 0)))); }
  function prices() { var o = readJ(PRICE_KEY, {}); return o && typeof o === 'object' ? o : {}; }
  /** Kullanıcı fiyatı: { v: ₺, d: 'YYYY-AA-GG' } (eski düz sayı da okunur, tarihsiz sayılır) */
  function userPrice(key) {
    var p = prices()[key]; if (p == null) return null;
    if (typeof p === 'number') return { v: p, d: '' };
    return p && isFinite(Number(p.v)) && Number(p.v) > 0 ? { v: Number(p.v), d: String(p.d || '') } : null;
  }
  function setPrice(key, v) {
    var o = prices(), n = Number(String(v).replace(/\./g, '').replace(',', '.'));
    if (v === '' || v == null || !(n > 0)) delete o[key]; else o[key] = { v: Math.round(n * 100) / 100, d: today() };
    writeJ(PRICE_KEY, o);
  }

  /* ---------------- Referans fiyatlar (data/fiyat-ref.json; her seferinde taze) ---------------- */
  var REF = { status: 'idle', data: null, byKey: {}, at: 0 };
  function loadRef() {
    REF.status = 'loading';
    var url = 'data/fiyat-ref.json?t=' + Date.now();
    if (!global.fetch) { REF.status = 'none'; return Promise.resolve(REF); }
    return global.fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) return null;
      return r.json();
    }).catch(function () { return null; }).then(function (j) {
      REF.data = null; REF.byKey = {}; REF.at = Date.now();
      if (j && Array.isArray(j.items)) {
        REF.data = j;
        j.items.forEach(function (it) { if (it && it.key) REF.byKey[String(it.key)] = it; });
        REF.status = 'ok';
      } else REF.status = 'none';
      return REF;
    });
  }
  function refInfo() {
    var d = REF.data; if (!d) return { ok: false, status: REF.status };
    var upd = String(d.updated || '').slice(0, 10), age = upd ? daysSince(upd) : null;
    return { ok: true, updated: upd, age: age, stale: age == null || age > 7, currency: d.currency || 'TRY' };
  }
  /** Birim fiyat: kullanıcı → referans → yok. */
  function priceFor(key) {
    var u = userPrice(key), rf = REF.byKey[key], ri = refInfo();
    var ref = rf && rf.ref != null && isFinite(Number(rf.ref)) && Number(rf.ref) > 0 ? { v: Number(rf.ref), n: Number(rf.n) || 0, min: rf.min, max: rf.max, updated: ri.updated, note: rf.note || '', stale: !!rf.note || !!ri.stale } : null;
    if (u) { var ua = u.d ? daysSince(u.d) : null; return { v: u.v, src: 'user', date: u.d, old: ua == null || ua > 30, ref: ref }; }
    if (ref) return { v: ref.v, src: 'ref', date: ref.updated, ref: ref, stale: ref.stale };
    return { v: null, src: null, ref: null };
  }

  /* ---------------- Stok eşleşmesi ---------------- */
  var CONV = { 'ml>L': 0.001, 'g>kg': 0.001, 'L>ml': 1000, 'kg>g': 1000 };
  function conv(q, from, to) { if (from === to) return q; var f = CONV[from + '>' + to]; return f ? q * f : null; }
  function stockIndex(list) {
    var P = global.SuperAriPlan, out = {}, thr = {}, notes = {}, used = {};
    list.forEach(function (x) {
      var n = norm(x.name), hit = null;
      /* şurup → şeker karşılığı */
      if ((x.feedType === 'surup21' || x.feedType === 'surup11') && x.unit === 'L' && P && P.SYRUP[x.feedType]) {
        out.seker = (out.seker || 0) + Math.max(0, x.qty) * P.SYRUP[x.feedType].sugarKg;
        (notes.seker = notes.seker || []).push(x.name + ' ' + fmtN(x.qty) + ' L (≈ ' + fmtN(Math.max(0, x.qty) * P.SYRUP[x.feedType].sugarKg) + ' kg şeker)');
        used[x.id] = 'seker'; return;
      }
      for (var i = 0; i < MATCH.length && !hit; i++) {
        var c = MATCH[i]; if (!c.re) continue;
        if (c.key === 'arici_eldiven' && /nitril/.test(n)) continue;
        if (c.re.test(n) || (c.cats && c.cats.indexOf(x.category) >= 0)) hit = c;
      }
      if (!hit) return;
      used[x.id] = hit.key;
      var q = conv(Math.max(0, x.qty), x.unit, hit.unit);
      if (q == null) { (notes[hit.key] = notes[hit.key] || []).push(x.name + ' ' + fmtN(x.qty) + ' ' + x.unit + ' (birim uymuyor, sayılmadı)'); return; }
      out[hit.key] = (out[hit.key] || 0) + q;
      if (x.threshold > 0) { var tq = conv(x.threshold, x.unit, hit.unit); if (tq != null) thr[hit.key] = (thr[hit.key] || 0) + tq; }
    });
    return { have: out, thr: thr, notes: notes, used: used };
  }
  function fmtN(v) { return String(Math.round((Number(v) || 0) * 10) / 10).replace('.', ','); }
  function up(v, step) { step = step || 1; return Math.max(0, Math.ceil(v / step - 1e-9) * step); }
  function rnd(v, step) { return Math.round(v / (step || 1)) * (step || 1); }

  /* ---------------- İhtiyaç modeli ---------------- */
  var INSPECT_DAYS = 21, BEE_DEFAULT = 8, VISITS = 3, UNKNOWN_STORE_FRAC = 0.3;
  var GLOVE_PAIRS_PER_BOX = 50, FUEL_KG_PER_HIVE_VISIT = 0.05;
  /* Besleme dönüşümü (bakim-plan.js SYRUP ile aynı katsayılar):
   * 2:1 şurup ağırlıkça 2 kg şeker + 1 kg su = 3 kg, yoğunluk ≈ 1,33 → ≈ 2,25 L; yani 1 L 2:1 şurupta ≈ 0,89 kg şeker, 0,44 L su.
   * 1 L 2:1 şurup kışlık stoğa ≈ 0,8 kg katkı (arının işleme kaybı dahil). 1:1: 0,62 kg şeker/L, 0,5 kg stok/L.
   * Kovan başına üst sınır: sonbahar 2:1 en çok 15 L (≈ 13,4 kg şeker), ilkbahar 1:1 en çok 6 L; açık daha büyükse kek + birleştirme önerilir. */
  var FEED = {
    surup21: { sugarKg: 0.89, waterL: 0.44, storeKg: 0.8, capL: 15 },
    surup11: { sugarKg: 0.62, waterL: 0.62, storeKg: 0.5, capL: 6 }
  };
  function feedFromDeficit(deficitKg, type) {
    var F = FEED[type || 'surup21'], d = Math.max(0, Number(deficitKg) || 0);
    var rawL = Math.ceil(d / F.storeKg * 2) / 2, L = Math.min(rawL, F.capL);
    return { deficitKg: d, rawL: rawL, L: L, capped: rawL > F.capL, sugarKg: Math.round(L * F.sugarKg * 10) / 10, waterL: Math.round(L * F.waterL * 10) / 10 };
  }
  function syrupSugar(L, type) { return Math.round(Math.max(0, Number(L) || 0) * FEED[type || 'surup21'].sugarKg * 10) / 10; }
  /* Kovan başına makul üst sınırlar (tahmin payı dahil; muayene bulgusu da bu sınırı aşamaz) */
  var HIVE_CAP = {
    seker: syrupSugar(15, 'surup21'), kek: 4, polen: 1, besleyici: 1, alt_tabla: 1, alkol: 0.2,
    serit_amitraz: 4, serit_flumetrin: 4, serit_taufluvalinat: 4, serit_koumafos: 4,
    kat: 2, ana_izgarasi: 1, kapi_daraltici: 1, dezenfektan: 1
  };
  /** m (muayene) + t (tahmin) × (1 + T) ≤ sınır; pay yalnız bir kez, yalnız tahmine eklenir. */
  /* Tahmin payı yalnız kovan başına ölçeklenen sarf malzemesine; dayanıklı alet ve arılık başı tek paketlere eklenmez (1 → 2 şişmesin) */
  function tolOn(c) { return !!c && !c.dur && (!c.scope || c.scope === 'hive'); }
  function capHive(m, t, T, cap) {
    m = Math.max(0, m || 0); t = Math.max(0, t || 0);
    if (cap == null || !(cap > 0)) return { m: m, t: t, capped: false };
    if (m >= cap) return { m: cap, t: 0, capped: m > cap || t > 0 };
    if (m + t * (1 + T) > cap + 1e-9) return { m: m, t: (cap - m) / (1 + T), capped: true };
    return { m: m, t: t, capped: false };
  }
  function stripKey(p) {
    var a = norm((p && (p.active || '')) + ' ' + (p && p.name || ''));
    if (/amitraz/.test(a)) return 'serit_amitraz';
    if (/fluvalinat/.test(a)) return 'serit_taufluvalinat';
    if (/flumetrin/.test(a)) return 'serit_flumetrin';
    if (/koumafos|kumafos/.test(a)) return 'serit_koumafos';
    return 'ilac_teyit';
  }
  function tagsByHive() {
    var m = {}; var open = []; try { open = D.taskStore.open(); } catch (e) { open = []; }
    open.forEach(function (t) {
      var mm = /\[muayene-oto:([a-z]+)\]/.exec(String(t.note || '')); if (!mm || t.hiveId == null) return;
      var o = m[String(t.hiveId)] = m[String(t.hiveId)] || {};
      if (mm[1] === 'yer' && /Bal katını al/.test(String(t.title || ''))) return;
      o[mm[1]] = t;
    });
    return m;
  }
  function apiaryNeeds(ap, hs, ctx) {
    var P = global.SuperAriPlan, I = global.SuperAriIlac, t = today(), mon = Number(t.slice(5, 7));
    var acc = {}, act = hs.filter(function (h) { return h && h.colonyState !== 'birlestirildi'; });
    var cur = null, T = tol() / 100, capN = {};
    function add(key, q, src, why) {
      if (!(q > 0) || !BY[key]) return;
      var a;
      if (cur) { a = cur[key] = cur[key] || { m: 0, t: 0, why: {} }; }
      else a = acc[key] = acc[key] || { m: 0, t: 0, why: {} };
      a[src === 'm' ? 'm' : 't'] += q;
      if (why) a.why[why] = (a.why[why] || 0) + 1;
    }
    function flushHive(fpk) {
      var hv = cur; cur = null;
      Object.keys(hv).forEach(function (k) {
        var x = hv[k], cap = HIVE_CAP[k];
        if (k === 'cerceve' || k === 'temel_petek') cap = 2 * fpk;
        var c = capHive(x.m, x.t, tolOn(BY[k]) ? T : 0, cap);
        if (c.capped) capN[k] = (capN[k] || 0) + 1;
        var a = acc[k] = acc[k] || { m: 0, t: 0, why: {} };
        a.m += c.m; a.t += c.t;
        Object.keys(x.why).forEach(function (w) { a.why[w] = (a.why[w] || 0) + x.why[w]; });
      });
    }
    var out = { id: String(ap.id), name: ap.name, hives: act.length, insp: 0, fc: 0, acc: acc, flags: {}, season: 'yaz' };
    if (!P || !act.length) return out;
    var sk = 'yaz'; try { sk = P.seasonKind(ap.id); } catch (e) { sk = 'yaz'; }
    var autumn = sk === 'sonbahar' || (sk === 'akim' && mon >= 8 && mon <= 12);
    var growing = sk === 'ilkbahar' || (sk === 'akim' && !autumn);
    out.season = sk; out.autumn = autumn;
    var yr = Number(t.slice(0, 4)), autumnFrom = (mon >= 8 ? yr : yr - 1) + '-08-15';
    var rep = null;
    function repProduct() {
      if (rep !== null) return rep;
      rep = false;
      try {
        var mp = P.medPlan(act[0]);
        var ok = mp.products.filter(function (x) { return x.verified && !x.blocks.length; })[0] || mp.products.filter(function (x) { return x.verified; })[0];
        if (ok) rep = I.byId(ok.id) || false;
      } catch (e) { rep = false; }
      return rep;
    }
    var gloves = { m: 0, t: 0 }, teyit = null, sugarAny = false, acid = false;
    act.forEach(function (h) {
      var st = null; try { st = P.hiveState(h); } catch (e) { st = null; }
      if (!st) return;
      cur = {};
      var insp = !!(st.strength && st.strength.date >= addDays(t, -INSPECT_DAYS));
      var src = insp ? 'm' : 't';
      if (insp) out.insp++; else out.fc++;
      var bee = st.beeFrames != null && st.beeFrames !== '' ? Number(st.beeFrames) : null;
      var beeEst = bee != null ? bee : BEE_DEFAULT;
      var box = null; try { box = D.colony.boxes(h); } catch (e) { box = null; }
      box = box || { body: 1, kat: 0, frames: 10 };
      var fpk = box.frames && (box.body + box.kat) ? Math.round(box.frames / (box.body + box.kat)) : 10;
      var tg = ctx.tags[String(h.id)] || {};
      /* --- Varroa --- */
      var lt = st.lastTreat, treated = !!(lt && lt.date >= (autumn || sk === 'kis' ? autumnFrom : addDays(t, -42)));
      var inf = st.varroa && st.varroa.infestation != null ? Number(st.varroa.infestation) : null;
      if (insp && inf != null && inf >= 2 && !treated) {
        var mp = null; try { mp = P.medPlan(h, st); } catch (e) { mp = null; }
        if (mp && (mp.level === 'tedavi' || mp.level === 'planla') && mp.best && mp.best.dose && mp.best.dose.ok) {
          add(stripKey(I.byId(mp.best.id) || mp.best), Number(mp.best.dose.qty), 'm', mp.best.name + ' (etiket)');
          add('alt_tabla', 1, 'm'); gloves.m += 2;
        } else if (mp && (mp.level === 'tedavi' || mp.level === 'planla')) teyit = teyit || 'm';
      } else if (!(insp && inf != null) && !treated && autumn) {
        /* sayım yok / muayenesiz: sonbahar tedavisi tahmini (etiket bandı, bilinen arılı çerçeve; yoksa varsayılan) */
        var pr = repProduct(), dz = pr ? I.doseFor(pr.id, beeEst) : null;
        if (pr && dz && dz.ok) add(stripKey(pr), Number(dz.qty), 't', pr.name + ' (etiket' + (bee == null ? ', güç bilinmiyor → ' + BEE_DEFAULT + ' çerçeve varsayıldı' : '') + ')');
        else teyit = teyit || 't';
        add('alt_tabla', 1, 't'); gloves.t += 2;
      }
      if (tg.varroa || (insp && inf == null)) add('alkol', 0.1, 'm', 'varroa sayımı');
      else if (!insp && sk !== 'kis' && !(sk === 'akim' && !autumn)) add('alkol', 0.1, 't', 'varroa sayımı');
      /* --- Besleme --- */
      if (insp && st.honeyFrames != null && st.honeyFrames !== '') {
        var fp = null; try { fp = P.feedPlan(h, st); } catch (e) { fp = null; }
        if (fp && fp.need) {
          if (fp.type === 'kek') add('kek', Number(fp.kekKg) || 0, 'm', 'bakım planı besleme');
          else { add('seker', Number(fp.sugarKg) || 0, 'm', 'bakım planı besleme'); sugarAny = true; }
          add('besleyici', 1, 'm');
        }
      } else if (autumn) {
        var ws = null; try { ws = P.winterStock(h); } catch (e) { ws = null; }
        var needKg = !ws ? 0 : (ws.key === 'yeterli' ? 0 : (ws.needKg != null ? ws.needKg : (ws.target || 18) * UNKNOWN_STORE_FRAC));
        if (needKg > 0) { var ff = feedFromDeficit(needKg, 'surup21'); add('seker', ff.sugarKg, src, ws && ws.kg == null ? 'kışlık hedef (ırk/bölge), stok bilinmiyor' : 'kışlık stok açığı'); add('besleyici', 1, src); sugarAny = true; }
      } else if (sk === 'kis') add('kek', 2, src, 'kış ortası kek');
      else if (sk === 'ilkbahar') { add('seker', 3.7, src, 'uyarıcı besleme 1:1'); add('polen', 0.5, src, 'ilkbahar gelişimi'); add('besleyici', 1, src); sugarAny = true; }
      if (insp && st.cls === 'Zayıf' && (autumn || sk === 'ilkbahar')) { add('polen', 0.5, 'm', 'zayıf koloni'); if (autumn) add('kek', 1, 'm', 'zayıf koloni'); }
      /* --- Kovan (bulgu etiketleri: bakim-akis.js CARD_TAGS ile aynı eşleme: cerceve←yer, kapi←yagma/zayif, temizlik←guve/olu, hastalik) --- */
      if (tg.yer) { add('kat', 1, 'm', 'yer dar'); add('cerceve', fpk, 'm', 'yer dar'); add('temel_petek', fpk, 'm', 'yer dar'); if (growing) add('ana_izgarasi', 1, 'm'); }
      else if (!insp && growing && (bee == null || bee >= 8) && !box.kat) { add('kat', 1, 't', 'gelişim'); add('cerceve', fpk, 't', 'gelişim'); add('temel_petek', fpk, 't', 'gelişim'); add('ana_izgarasi', 1, 't'); }
      if (!insp && sk === 'ilkbahar') add('temel_petek', 2, 't', 'petek yenileme');
      if (tg.yagma || tg.zayif) add('kapi_daraltici', 1, 'm', tg.yagma ? 'yağma' : 'zayıf koloni');
      else if (autumn || sk === 'kis') add('kapi_daraltici', 1, src, 'kışa hazırlık');
      if (tg.hastalik || tg.olu) { add('dezenfektan', 0.5, 'm', 'hastalık / ölü arı bulgusu'); gloves.m += 2; }
      if (tg.guve) add('dezenfektan', 0.5, 'm', 'mum güvesi');
      flushHive(fpk);
    });
    cur = null;
    Object.keys(capN).forEach(function (k) { if (acc[k]) acc[k].why[capN[k] + ' kovanda üst sınır (' + (k === 'seker' ? '15 L 2:1 şurup ≈ ' + fmtN(HIVE_CAP.seker) + ' kg şeker' : (k === 'cerceve' || k === 'temel_petek' ? '2 kat' : fmtN(HIVE_CAP[k]) + ' ' + BY[k].unit)) + '/kovan)'] = 1; });
    /* --- Arılık başına --- */
    if (teyit) add('ilac_teyit', 1, teyit, 'etiket dozu doğrulanmadı / arılı çerçeve yok');
    if (autumn || sk === 'kis') { add('okzalik', 1, 't', 'yavrusuz dönem (kış) uygulaması'); add('siringa', 1, 't'); acid = true; out.flags.buharlastirici = true; }
    if (sk === 'yaz') { add('formik', 1, 't', 'hasat sonrası'); acid = true; }
    if (sugarAny) add('vitamin', 1, 't', 'besleme dönemi');
    add('tuz', 1, 't', 'suluk');
    gloves.t += 5 * VISITS;
    if (gloves.m) add('nitril', gloves.m / GLOVE_PAIRS_PER_BOX, 'm');
    add('nitril', gloves.t / GLOVE_PAIRS_PER_BOX, 't', VISITS + ' ziyaret');
    add('koruk_yakit', act.length * VISITS * FUEL_KG_PER_HIVE_VISIT, 't', VISITS + ' ziyaret × kovan');
    add('cakmak', 1, 't');
    add('dezenfektan', 1, 't', 'alet hijyeni');
    out.flags.koruk = out.flags.kaziyici = out.flags.arici_eldiven = true;
    if (acid) out.flags.gozluk = out.flags.maske = true;
    if (acid || sugarAny) out.flags.olcu_kabi = true;
    if (acc.alkol) out.flags.alkol_kabi = true;
    return out;
  }

  /** Talep: { scope, tol, sections:[{id,name,hives,insp,fc,lines,subtotal,missing}], combined:{lines,total,missing}, buyN, total, missing, ref } */
  function build(scope) {
    var T = tol() / 100, aps = []; try { aps = D.loadApiaries() || []; } catch (e) { aps = []; }
    var all = []; try { all = D.loadHives() || []; } catch (e) { all = []; }
    var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
    var SI = stockIndex(list), ctx = { tags: tagsByHive() };
    var apList = scope === 'all' ? aps : aps.filter(function (a) { return String(a.id) === String(scope); });
    var secs = apList.map(function (a) { return apiaryNeeds(a, all.filter(function (h) { return String(h.apiaryId) === String(a.id); }), ctx); });
    /* işletme geneli (bir kez) + stok eşiği */
    var op = { id: 'ortak', name: 'Ortak (işletme geneli, bir kez)', hives: 0, insp: 0, fc: 0, acc: {}, ortak: true };
    CAT.forEach(function (c) { if (c.scope === 'operator' && secs.some(function (s) { return s.flags && s.flags[c.key]; })) op.acc[c.key] = { m: 0, t: 1, why: { 'dayanıklı, bir kez': 1 } }; });
    function lineOf(key, a, have) {
      var c = BY[key], need = up(a.m + a.t * (tolOn(c) ? 1 + T : 1), c.step);
      return { key: key, g: c.g, name: c.name, unit: c.unit, m: a.m, t: a.t, need: need, have: have, buy: 0, confirm: !!c.confirm, note: c.note || '',
        src: a.esik ? 'esik' : (a.m && a.t ? 'mt' : (a.m ? 'm' : 't')), why: Object.keys(a.why || {}).sort(function (x, y) { return (/üst sınır/.test(y) ? 1 : 0) - (/üst sınır/.test(x) ? 1 : 0); }).slice(0, 3).join(' · '), stockNote: (SI.notes[key] || []).join('; ') };
    }
    var remaining = {}; Object.keys(SI.have).forEach(function (k) { remaining[k] = SI.have[k]; });
    var totalNeed = {};
    secs.concat([op]).forEach(function (s) { Object.keys(s.acc).forEach(function (k) { var c = BY[k]; totalNeed[k] = (totalNeed[k] || 0) + up(s.acc[k].m + s.acc[k].t * (tolOn(c) ? 1 + T : 1), c.step); }); });
    /* stok eşiği: arılık ihtiyaçları düşüldükten sonra stok eşik + pay altına inecekse, fark ortak bölümde «stok eşiği» satırı olur */
    Object.keys(SI.thr).forEach(function (k) {
      var target = up(SI.thr[k] * (1 + T), BY[k].step), left = (SI.have[k] || 0) - (totalNeed[k] || 0);
      if (left < target) { op.acc[k] = op.acc[k] || { m: 0, t: 0, why: {} }; op.acc[k].m += target; op.acc[k].esik = true; op.acc[k].why['stok eşiği ' + fmtN(SI.thr[k]) + ' + %' + tol() + ' pay'] = 1; }
    });
    var extra = [];
    list.forEach(function (x) {
      if (SI.used[x.id] || !(x.threshold > 0) || x.qty > x.threshold) return;
      var need = up(x.threshold * (1 + T), 0.5); /* eşik + pay */
      extra.push({ key: 'stok:' + x.id, g: CATGROUP[x.category] || 'diger', name: x.name, unit: x.unit, m: need, t: 0, need: need, have: Math.max(0, x.qty), buy: up(need - Math.max(0, x.qty), 0.5), src: 'esik', why: 'eşik ' + fmtN(x.threshold) + ' ' + x.unit + ' + %' + tol() + ' pay', note: '', stockNote: '' });
    });
    function finish(s, alloc) {
      var lines = Object.keys(s.acc).map(function (k) { return lineOf(k, s.acc[k], 0); });
      lines.forEach(function (l) {
        var avail = alloc ? (remaining[l.key] || 0) : (SI.have[l.key] || 0);
        l.have = Math.round(Math.min(avail, l.need) * 10) / 10;
        l.haveAll = Math.round((SI.have[l.key] || 0) * 10) / 10;
        l.buy = up(l.need - avail, BY[l.key].step);
        if (alloc) remaining[l.key] = Math.max(0, avail - l.need);
      });
      if (s.ortak) lines = lines.concat(extra);
      var order = {}; GROUPS.forEach(function (g, i) { order[g.key] = i; });
      var ci = {}; CAT.forEach(function (c, i) { ci[c.key] = i; });
      lines.sort(function (a, b) { return (order[a.g] - order[b.g]) || ((ci[a.key] == null ? 99 : ci[a.key]) - (ci[b.key] == null ? 99 : ci[b.key])); });
      price(lines);
      s.lines = lines; s.subtotal = sum(lines); s.missing = lines.filter(function (l) { return l.buy > 0 && l.price.v == null; }).length;
      return s;
    }
    var many = secs.length > 1;
    /* stok ortak: arılıklar sırayla stoktan pay alır, kalan ortak bölüme (toplam alınacak = toplam ihtiyaç − stok) */
    secs.forEach(function (s) { finish(s, true); });
    finish(op, true);
    /* birleşik liste (anahtar başına) */
    var comb = {};
    secs.concat([op]).forEach(function (s) {
      s.lines.forEach(function (l) {
        var c = comb[l.key];
        if (!c) { c = comb[l.key] = JSON.parse(JSON.stringify(l)); c.need = 0; c.buy = 0; c.m = 0; c.t = 0; c.srcs = {}; c.why = ''; }
        c.need += l.need; c.buy += l.buy; c.m += l.m; c.t += l.t; c.srcs[l.src] = 1; if (l.why && c.why.indexOf(l.why) < 0) c.why = c.why ? c.why : l.why;
      });
    });
    var clines = Object.keys(comb).map(function (k) {
      var c = comb[k], ks = Object.keys(c.srcs);
      c.src = ks.length === 1 ? ks[0] : (c.srcs.m || c.srcs.mt) && (c.srcs.t || c.srcs.mt) ? 'mt' : ks.filter(function (x) { return x !== 'esik'; })[0] || 'esik';
      c.have = c.haveAll != null ? c.haveAll : c.have; delete c.srcs;
      return c;
    });
    var order = {}; GROUPS.forEach(function (g, i) { order[g.key] = i; }); var ci = {}; CAT.forEach(function (c, i) { ci[c.key] = i; });
    clines.sort(function (a, b) { return (order[a.g] - order[b.g]) || ((ci[a.key] == null ? 99 : ci[a.key]) - (ci[b.key] == null ? 99 : ci[b.key])); });
    price(clines);
    var combined = { lines: clines, total: sum(clines), missing: clines.filter(function (l) { return l.buy > 0 && l.price.v == null; }).length };
    return {
      scope: scope, tol: tol(), sections: secs, ortak: op, combined: combined,
      buyN: clines.filter(function (l) { return l.buy > 0; }).length, total: combined.total, missing: combined.missing,
      hives: secs.reduce(function (a, s) { return a + s.hives; }, 0), insp: secs.reduce(function (a, s) { return a + s.insp; }, 0), fc: secs.reduce(function (a, s) { return a + s.fc; }, 0),
      ref: refInfo(), stockShared: many
    };
  }
  function price(lines) {
    lines.forEach(function (l) { l.price = priceFor(l.key); l.cost = l.buy > 0 && l.price.v != null ? Math.round(l.buy * l.price.v * 100) / 100 : 0; });
  }
  function sum(lines) { return Math.round(lines.reduce(function (a, l) { return a + (l.cost || 0); }, 0) * 100) / 100; }

  /* ---------------- Talep kaydı ---------------- */
  function talepKey() { return live() ? 'superari.stok.talep.v1' : 'superari.stok.talep.demo.v1'; }
  function talepler() { var a = readJ(talepKey(), []); return Array.isArray(a) ? a : []; }
  function saveTalep(rq, apName) {
    var ri = rq.ref || {};
    var rows = [];
    function push(s, lines) { lines.forEach(function (l) { if (l.buy > 0) rows.push({ apiaryId: s ? s.id : '', apiaryName: s ? s.name : 'Toplam', key: l.key, group: l.g, name: l.name, unit: l.unit, need: l.need, have: l.have, buy: l.buy, src: l.src, price: l.price.v, priceSrc: l.price.src, priceDate: l.price.date || '', cost: l.cost }); }); }
    rq.sections.forEach(function (s) { push(s, s.lines); });
    push(rq.ortak, rq.ortak.lines);
    var t = {
      id: 'tl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date: today(), createdAt: new Date().toISOString(),
      apiaryId: rq.scope === 'all' ? '' : String(rq.scope), apiaryName: apName, tol: rq.tol, hives: rq.hives, insp: rq.insp, fc: rq.fc,
      total: rq.total, missing: rq.missing, buyN: rq.buyN, priceRefDate: ri.ok ? ri.updated : '', priceRefStale: !!(ri.ok && ri.stale), lines: rows
    };
    if (!live()) t.demo = true;
    var a = talepler(); a.push(t); if (a.length > 50) a = a.slice(-50);
    writeJ(talepKey(), a);
    try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
    return t;
  }

  global.SuperAriTalep = {
    CAT: CAT, GROUPS: GROUPS, BY: BY, build: build, loadRef: loadRef, refInfo: refInfo, priceFor: priceFor, tol: tol, setTol: setTol,
    userPrice: userPrice, setPrice: setPrice, talepler: talepler, saveTalep: saveTalep, norm: norm, REF: REF,
    RULES: { INSPECT_DAYS: INSPECT_DAYS, BEE_DEFAULT: BEE_DEFAULT, VISITS: VISITS, UNKNOWN_STORE_FRAC: UNKNOWN_STORE_FRAC },
    FEED: FEED, HIVE_CAP: HIVE_CAP, feedFromDeficit: feedFromDeficit, syrupSugar: syrupSugar, capHive: capHive
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.SuperAriTalep;
})(typeof window !== 'undefined' ? window : globalThis);
