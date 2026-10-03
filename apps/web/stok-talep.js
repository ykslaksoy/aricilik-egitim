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
    { key: 'temizlik', label: 'Temizlik / hijyen' }, { key: 'anaari', label: 'Ana arı' }, { key: 'ariKoloni', label: 'Arı / koloni' }
  ]; /* koloni-75: «Diğer» başlığı yok — listede olmayan her şey «Kalem ekle» ile kategorisiyle girilir (kullanıcı kategorisi = kendi başlığı) */
  var CAT = [
    { key: 'seker', g: 'besleme', name: 'Şeker (toz)', unit: 'kg', step: 1, re: /seker/, cats: ['seker'], note: 'şurup için; stoktaki şurup şeker karşılığıyla sayılır' },
    { key: 'kek', g: 'besleme', name: 'Kek / fondan', unit: 'kg', step: 0.5, re: /\bkek|fondan/, cats: ['kek'] },
    { key: 'polen', g: 'besleme', name: 'Polen / polen ikamesi', unit: 'kg', step: 0.5, re: /polen/, cats: ['polen'] },
    { key: 'vitamin', g: 'besleme', name: 'Vitamin / besin takviyesi', unit: 'paket', step: 1, scope: 'apiary', re: /vitamin|takviye/, note: 'etiketteki kullanıma göre; doz yazılmaz' },
    { key: 'tuz', g: 'besleme', name: 'Tuz (suluk / tuzlu su)', unit: 'kg', step: 1, scope: 'apiary', re: /\btuz/ },
    /* Rulamit-VA tütsü plakası (ruhsatlı, şerit değil): tahmine KENDİLİĞİNDEN girmez (şeritle çift tedavi olmasın); stokta eşik verilirse talebe girer.
       Şerit anahtarından önce durur: «Rulamit-VA» / «Amitraz tütsü plakası» şeride sayılmaz. */
    { key: 'amitraz_tutsu', g: 'ilac', name: 'Amitraz tütsü plakası (Rulamit-VA)', unit: 'kutu', step: 1, scope: 'apiary', manual: true, re: /rulamit va\b|tutsu plaka|amitraz tutsu/,
      note: 'kutuda 3 poşet × 1 plaka; şeritle birlikte kendiliğinden eklenmez — etiket: kovan başına 7 duman darbesi, 3 gün ara ile 3 kez' },
    /* Vamitrat-VA: kovan içinde YAKILAN karton şerit (tütsü, Teknovet etiketi) — temas şeridi değildir; tahmine kendiliğinden girmez, yalnız stok eşiği. */
    { key: 'amitraz_yakma', g: 'ilac', name: 'Amitraz yakma şeridi (Vamitrat-VA)', unit: 'şerit', step: 1, scope: 'apiary', manual: true, re: /vamitrat|yakma serid|amitraz yakma/,
      note: 'kutuda 3 poşet × 10 şerit; şeritle birlikte kendiliğinden eklenmez — etiket: kovan başına 1 şerit yakılır, 3 gün ara ile 3 kez (yüksek Varroa: 4 kez)' },
    { key: 'serit_amitraz', notol: true, g: 'ilac', name: 'Varroa şeridi — amitraz', unit: 'şerit', step: 1, re: /amitraz|beeraz|rulamit/ },
    { key: 'serit_flumetrin', notol: true, g: 'ilac', name: 'Varroa şeridi — flumetrin', unit: 'şerit', step: 1, re: /flumetrin|bayvarol|beevarflu|varodur|fumbee|polyvar/ },
    { key: 'serit_taufluvalinat', notol: true, g: 'ilac', name: 'Varroa şeridi — tau-fluvalinat', unit: 'şerit', step: 1, re: /fluvalinat|apistan/ },
    { key: 'serit_koumafos', notol: true, g: 'ilac', name: 'Varroa şeridi — koumafos', unit: 'şerit', step: 1, re: /koumafos|kumafos|checkmite/ },
    { key: 'ilac_teyit', g: 'ilac', name: 'Varroa ilacı — etiket dozu teyit edilecek', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: null },
    { key: 'okzalik', g: 'ilac', name: 'Okzalik asit', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /ok[sz]alik|oxalic/ },
    { key: 'formik', g: 'ilac', name: 'Formik asit', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /formik|formic/ },
    { key: 'timol', g: 'ilac', name: 'Timol', unit: 'paket', step: 1, scope: 'apiary', confirm: true, re: /timol|thymol/ },
    { key: 'nitril', g: 'koruyucu', name: 'Nitril eldiven (100’lük kutu)', unit: 'paket', step: 1, scope: 'apiary', re: /nitril/ },
    { key: 'gozluk', g: 'koruyucu', name: 'Koruyucu gözlük', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /gozluk/ },
    { key: 'maske', g: 'koruyucu', name: 'Maske / respiratör (asit)', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /maske|respirator/ },
    { key: 'arici_eldiven', g: 'koruyucu', name: 'Arıcı eldiveni (çift)', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /eldiven/ },
    { key: 'siringa', g: 'uygulama', name: 'Damlatma şırıngası', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /siringa|damlatma/ },
    { key: 'buharlastirici', g: 'uygulama', name: 'Okzalik buharlaştırıcı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /buharlastirici|sublimat/ },
    { key: 'olcu_kabi', g: 'uygulama', name: 'Ölçü kabı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /olcu kab|olcek/ },
    { key: 'alt_tabla', g: 'uygulama', name: 'Yapışkanlı alt tabla (akar sayımı)', unit: 'adet', step: 1, scope: 'apiary', dur: true, re: /alt tabla|yapiskanli/ },
    { key: 'alkol_kabi', g: 'uygulama', name: 'Alkol yıkama kabı', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /yikama kab/ },
    { key: 'alkol', g: 'uygulama', name: 'Alkol (akar sayımı için)', unit: 'L', step: 0.5, scope: 'apiary', re: /alkol|etanol|etil/ },
    { key: 'koruk', g: 'tutsu', name: 'Tütsü körüğü', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /koruk|tutsu/ },
    { key: 'koruk_yakit', g: 'tutsu', name: 'Körük yakıtı (çuval / talaş / pamuk)', unit: 'kg', step: 1, scope: 'apiary', re: /yakit|cuval|talas|pamuk/ },
    { key: 'cakmak', g: 'tutsu', name: 'Çakmak / kibrit', unit: 'paket', step: 1, scope: 'apiary', re: /cakmak|kibrit/ },
    { key: 'cerceve', g: 'kovan', name: 'Çerçeve', unit: 'adet', step: 1, re: /cerceve/, cats: ['cerceve'] },
    { key: 'temel_petek', g: 'kovan', name: 'Temel petek', unit: 'adet', step: 1, re: /temel|petek/, cats: ['temelPetek'] },
    { key: 'kat', g: 'kovan', name: 'Kat / ballık', unit: 'adet', step: 1, dur: true, re: /\bkat\b|ballik|kovan|govde/, cats: ['kovan'] },
    { key: 'kapi_daraltici', g: 'kovan', name: 'Kapı daraltıcı', unit: 'adet', step: 1, dur: true, re: /daraltic/ },
    { key: 'besleyici', g: 'kovan', name: 'Besleyici (feeder)', unit: 'adet', step: 1, dur: true, re: /besleyici|feeder|beslik/ },
    { key: 'ana_izgarasi', g: 'kovan', name: 'Ana ızgarası', unit: 'adet', step: 1, dur: true, re: /izgara/ },
    { key: 'dezenfektan', g: 'temizlik', name: 'Dezenfektan', unit: 'L', step: 0.5, scope: 'apiary', re: /dezenfektan|hipoklorit|camasir suyu|kostik/ },
    { key: 'kaziyici', g: 'temizlik', name: 'Kazıyıcı / el aleti', unit: 'adet', step: 1, scope: 'operator', dur: true, re: /kaziyici|el aleti|maspala/ }
  ];
  var BY = {}; CAT.forEach(function (c) { BY[c.key] = c; });
  /* Eşleşme sırası: özel adlar önce (ör. «Okzalik buharlaştırıcı» asit değil, «Körük yakıtı» körük değil, «Alkol yıkama kabı» alkol değil) */
  var FIRST = ['buharlastirici', 'alkol_kabi', 'koruk_yakit', 'nitril', 'siringa', 'alt_tabla', 'temel_petek'];
  var MATCH = FIRST.map(function (k) { return BY[k]; }).concat(CAT.filter(function (c) { return FIRST.indexOf(c.key) < 0; }));
  var CATGROUP = { surup: 'besleme', seker: 'besleme', kek: 'besleme', polen: 'besleme', ilac: 'ilac', cerceve: 'kovan', temelPetek: 'kovan', kovan: 'kovan', ekipman: 'uygulama', anaari: 'anaari', ariKoloni: 'ariKoloni' };
  /** Stok kategorisi → talep grubu (kullanıcı kategorisi kendi grubudur) */
  function groupOfCat(cat) { return CATGROUP[cat] || String(cat || 'ekipman'); }
  function groupLabel(k) {
    var g = GROUPS.filter(function (x) { return x.key === k; })[0]; if (g) return g.label;
    try { if (D.stock && D.stock.catLabel) return D.stock.catLabel(k); } catch (e) { /* ignore */ }
    return k === 'diger' ? 'Diğer' : String(k || 'Kalem');
  }
  /** Satırlardaki gruplar: sabit sıra + sonra kullanıcı kategorileri (ilk görülme sırası) */
  function groupList(lines) {
    var out = GROUPS.slice(), seen = {}; GROUPS.forEach(function (g) { seen[g.key] = 1; });
    (lines || []).forEach(function (l) { var k = l && (l.g || l.group); if (k && !seen[k]) { seen[k] = 1; out.push({ key: k, label: groupLabel(k), custom: true }); } });
    return out;
  }
  function gOrder(k) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].key === k) return i; return 90; }

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
  /** Türkçe sayı: «1.250,50» / «42,5» / «42.5» / «1.250» → sayı */
  function parseNum(v) {
    var r = String(v == null ? '' : v).trim().replace(/\s|₺/g, '');
    if (!r) return NaN;
    if (r.indexOf(',') >= 0) r = r.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(r)) r = r.replace(/\./g, '');
    return /^\d+(\.\d+)?$/.test(r) ? Number(r) : NaN;
  }
  function setPrice(key, v) {
    var o = prices(), n = typeof v === 'number' ? v : parseNum(v);
    if (v === '' || v == null || !(n > 0)) delete o[key]; else o[key] = { v: Math.round(n * 100) / 100, d: today() };
    writeJ(PRICE_KEY, o);
  }

  /* ---------------- Referans fiyatlar (data/fiyat-ref.json; her seferinde taze) ---------------- */
  /* Etkin fiyat dosyası (hesapta kullanılan) + son başarılı dosyanın çevrimdışı yedeği (superari.stok.fiyatcache.v1).
   * Yeni dosya etkin olandan farklıysa ve kullanıcı listeye bakıyorsa sessizce değiştirilmez: REF.pending + bildirim. */
  var CACHE_KEY = 'superari.stok.fiyatcache.v1';
  var REF = { status: 'idle', data: null, byKey: {}, at: 0, fromCache: false, fail: null, pending: null, dismissed: '', loading: false };
  function liveCount(j) {
    var n = 0; ((j && j.items) || []).forEach(function (it) { n += it && it.liveCount != null ? Number(it.liveCount) || 0 : ((it && it.sources) || []).filter(function (x) { return x && x.live === true; }).length; });
    return n;
  }
  function setActive(j, fromCache) {
    REF.liveN = liveCount(j);
    REF.data = j; REF.byKey = {}; REF.at = Date.now(); REF.status = 'ok'; REF.fromCache = !!fromCache;
    j.items.forEach(function (it) { if (it && it.key) REF.byKey[String(it.key)] = it; });
  }
  function refSig(j) { return j && Array.isArray(j.items) ? String(j.updated || '') + '|' + j.items.map(function (i) { return i.key + ':' + (i.ref == null ? '' : Number(i.ref)); }).sort().join(',') : ''; }
  function diffRef(a, b) {
    var A = {}, B = {}, out = [];
    ((a && a.items) || []).forEach(function (i) { if (i && i.key) A[i.key] = i; });
    ((b && b.items) || []).forEach(function (i) { if (i && i.key) B[i.key] = i; });
    Object.keys(A).concat(Object.keys(B).filter(function (k) { return !A[k]; })).forEach(function (k) {
      var o = A[k], n = B[k], ov = o && o.ref != null && Number(o.ref) > 0 ? Number(o.ref) : null, nv = n && n.ref != null && Number(n.ref) > 0 ? Number(n.ref) : null;
      if (ov !== nv) out.push({ key: k, name: (n || o).name || (BY[k] ? BY[k].name : k), unit: (n || o).unit || '', old: ov, nw: nv });
    });
    return out;
  }
  /** Fiyat değişikliği metni (tüm listelerde aynı): eski yok → «fiyat eklendi: 130 ₺ / kutu»; yeni yok → «fiyat kaldırıldı (önceki 13 ₺ / kutu)»; ikisi de var → «13 ₺ → 15 ₺ / kutu». */
  function tl2(v) { return (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₺'; }
  function priceChangeText(c) {
    var o = c && c.old != null ? Number(c.old) : null, n = c && c.nw != null ? Number(c.nw) : null, u = c && c.unit ? ' / ' + c.unit : '';
    if (o == null && n == null) return 'fiyat yok';
    if (o == null) return 'fiyat eklendi: ' + tl2(n) + u;
    if (n == null) return 'fiyat kaldırıldı (önceki ' + tl2(o) + u + ')';
    return tl2(o) + ' → ' + tl2(n) + u;
  }
  (function initCache() {
    var c = readJ(CACHE_KEY, null);
    if (c && c.data && Array.isArray(c.data.items)) { setActive(c.data, true); REF.cachedAt = c.at || ''; REF.fetchedAt = c.at || ''; REF.src = 'cache'; }
  })();
  function writeCache(j) { writeJ(CACHE_KEY, { at: new Date().toISOString(), data: j }); }
  /**
   * Fiyat dosyasını taze oku (no-store + ?t=). opts.ask(): true dönerse (kullanıcı listeye bakıyor) farklı dosya bekletilir (REF.pending).
   * Dönen: { applied, pending, same, failed, changes }
   */
  function loadRef(opts) {
    opts = opts || {};
    REF.loading = true;
    var url = 'data/fiyat-ref.json?t=' + Date.now(), kind = null;
    var p = !global.fetch ? Promise.resolve(null) : global.fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) {
      if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) { kind = 'error'; return null; }
      return r.json();
    }, function () { kind = 'offline'; return null; }).catch(function () { kind = kind || 'error'; return null; });
    return p.then(function (j) {
      if (!j || !Array.isArray(j.items)) kind = kind || 'error';
      return offerRef(j, opts, 'file', kind);
    });
  }
  /** Gelen fiyat dosyasını değerlendir (dosya veya canlı uç nokta SuperAriFiyatLive.refresh() ile aynı biçim). */
  function offerRef(j, opts, src, kind) {
    opts = opts || {}; REF.loading = false;
    if (!j || !Array.isArray(j.items)) {
      REF.fail = kind === 'offline' || (global.navigator && global.navigator.onLine === false) ? 'offline' : 'error';
      if (!REF.data) REF.status = 'none';
      return { failed: true, kind: REF.fail };
    }
    REF.fail = null;
    var sig = refSig(j), now = new Date().toISOString();
    if (REF.data && refSig(REF.data) === sig) { REF.fromCache = false; REF.pending = null; REF.fetchedAt = now; REF.src = src || 'file'; writeCache(j); return { same: true, changes: [] }; }
    var ch = REF.data ? diffRef(REF.data, j) : [];
    if (REF.data && !opts.force && opts.ask && opts.ask()) {
      if (REF.dismissed === sig && !opts.always) return { kept: true, changes: ch };
      REF.pending = { data: j, sig: sig, changes: ch, at: now, src: src || 'file' };
      return { pending: true, changes: ch };
    }
    setActive(j, false); REF.fetchedAt = now; REF.src = src || 'file'; writeCache(j); REF.pending = null;
    return { applied: true, changes: ch };
  }
  function applyPending() { var p = REF.pending; if (!p) return false; setActive(p.data, false); REF.fetchedAt = p.at; REF.src = p.src; writeCache(p.data); REF.pending = null; return true; }
  function dismissPending() { if (REF.pending) REF.dismissed = REF.pending.sig; REF.pending = null; }
  /** fn() içindeki hesap verilen fiyat dosyasıyla yapılır (bildirimde «tahmini toplam A → B» için) */
  function withRef(data, fn) {
    var sd = REF.data, sb = REF.byKey, sa = REF.at, sf = REF.fromCache;
    setActive(data, false);
    try { return fn(); } finally { REF.data = sd; REF.byKey = sb; REF.at = sa; REF.fromCache = sf; }
  }
  function refInfo() {
    var d = REF.data; if (!d) return { ok: false, status: REF.status, fail: REF.fail, loading: REF.loading };
    var upd = String(d.updated || '').slice(0, 10), age = upd ? daysSince(upd) : null;
    return { ok: true, updated: upd, age: age, stale: age == null || age > 7, currency: d.currency || 'TRY', fromCache: REF.fromCache, fail: REF.fail, loading: REF.loading, pending: !!REF.pending, src: REF.fromCache ? 'cache' : (REF.src || 'file'), liveN: REF.liveN || 0 };
  }
  /** Birim fiyat: kullanıcı → referans → yok. */
  function priceFor(key) {
    var u = userPrice(key), rf = REF.byKey[key], ri = refInfo();
    var ref = rf && rf.ref != null && isFinite(Number(rf.ref)) && Number(rf.ref) > 0 ? { v: Number(rf.ref), n: Number(rf.n) || 0, min: rf.min, max: rf.max, updated: ri.updated, note: rf.note || '', stale: !!rf.note || !!ri.stale, dateStale: !!ri.stale, single: (Number(rf.n) || 0) === 1 } : null;
    if (u) { var ua = u.d ? daysSince(u.d) : null; return { v: u.v, src: 'user', date: u.d, old: ua == null || ua > 30, ref: ref }; }
    if (ref) return { v: ref.v, src: 'ref', date: ref.updated, ref: ref, stale: ref.stale };
    return { v: null, src: null, ref: null };
  }

  /* ---------------- Stok eşleşmesi ---------------- */
  var CONV = { 'ml>L': 0.001, 'g>kg': 0.001, 'L>ml': 1000, 'kg>g': 1000 };
  function conv(q, from, to) { if (from === to) return q; var f = CONV[from + '>' + to]; return f ? q * f : null; }
  function matchCat(x, n) {
    n = n == null ? norm(x.name) : n;
    for (var i = 0; i < MATCH.length; i++) {
      var c = MATCH[i]; if (!c.re) continue;
      if (c.key === 'arici_eldiven' && /nitril/.test(n)) continue;
      if (c.re.test(n) || (c.cats && c.cats.indexOf(x.category) >= 0)) return c;
    }
    return null;
  }
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
      hit = matchCat(x, n);
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
  var GLOVE_PAIRS_PER_BOX = 50;
  /* Gerçekçi arılık / kovan oranları (denetim koloni-64):
   * körük yakıtı: ziyaret başına arılıkta 0,1 kg + kovan başına 0,005 kg · alt tabla: arılıkta 3 örnek kovan (yeniden kullanılır)
   * alkol: arılıkta 0,5 L (örnek kovan yıkaması, süzülüp yeniden kullanılır) + sayımı istenen muayeneli kovan başına 0,1 L
   * vitamin: 1 paket / 40 beslenen kovan · okzalik: 1 paket / 25 kovan (damlatma) · formik: 1 paket / 10 kovan
   * kapı daraltıcı: kovanların çoğunda var → bulgu (yağma / zayıf) + yedek %10 · besleyici: yalnız stokta izleniyorsa, eksik kadar
   * dezenfektan: arılıkta 0,5 L alet hijyeni + hastalık bulgulu kovan başına 0,5 L */
  var FUEL_KG_PER_APIARY_VISIT = 0.1, FUEL_KG_PER_HIVE_VISIT = 0.005, STICKY_PER_APIARY = 3, ALCOHOL_L_PER_APIARY = 0.5, ALCOHOL_L_PER_COUNT = 0.1;
  var HIVES_PER_VITAMIN = 40, HIVES_PER_OXALIC = 25, HIVES_PER_FORMIC = 10, REDUCER_SPARE = 0.1, DISINFECT_L_PER_APIARY = 0.5;
  /* Tek kullanımlık nitril: arılık ziyareti başına 2 çift (1 çalışma + 1 yedek); asit uygulanan arılıkta +2 çift (arılık başına);
   * şerit uygulaması ziyaret çiftlerine dahil; hastalık / ölü arı bulgulu kovanda +1 çift (kovanlar arası değişim). Tahmin payı yok. */
  var GLOVE_PAIRS_PER_VISIT = 2, GLOVE_PAIRS_ACID = 2, GLOVE_PAIRS_DISEASE_HIVE = 1;
  function glovePairs(o) { return (o.aps || 0) * VISITS * GLOVE_PAIRS_PER_VISIT + (o.acid || 0) * GLOVE_PAIRS_ACID + (o.dis || 0) * GLOVE_PAIRS_DISEASE_HIVE; }
  function gloveWhy(o) {
    return (o.aps > 1 ? o.aps + ' arılık × ' : '') + VISITS + ' ziyaret × ' + GLOVE_PAIRS_PER_VISIT + ' çift' + (o.acid ? ' + asit uygulaması' + (o.aps > 1 && o.acid < o.aps ? ' (' + o.acid + ' arılık)' : '') : '') +
      (o.dis ? ' + ' + o.dis + ' hastalık/ölü arı bulgulu kovan' : '') + ' = ' + glovePairs(o) + ' çift';
  }
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
    seker: syrupSugar(15, 'surup21'), kek: 4, polen: 1, besleyici: 1, alkol: 0.1,
    serit_amitraz: 4, serit_flumetrin: 4, serit_taufluvalinat: 4, serit_koumafos: 4,
    kat: 2, ana_izgarasi: 1, kapi_daraltici: 1, dezenfektan: 1
  };
  /** m (muayene) + t (tahmin) × (1 + T) ≤ sınır; pay yalnız bir kez, yalnız tahmine eklenir. */
  /* Tahmin payı yalnız kovan başına ölçeklenen sarf malzemesine; dayanıklı alet ve arılık başı tek paketlere eklenmez (1 → 2 şişmesin) */
  function tolOn(c) { return !!c && !c.dur && !c.notol && (!c.scope || c.scope === 'hive'); } /* şerit: etiket dozu kesin → pay yok */
  function capHive(m, t, T, cap) {
    m = Math.max(0, m || 0); t = Math.max(0, t || 0);
    if (cap == null || !(cap > 0)) return { m: m, t: t, capped: false };
    if (m >= cap) return { m: cap, t: 0, capped: m > cap || t > 0 };
    if (m + t * (1 + T) > cap + 1e-9) return { m: m, t: (cap - m) / (1 + T), capped: true };
    return { m: m, t: t, capped: false };
  }
  function stripKey(p) {
    var a = norm((p && (p.active || '')) + ' ' + (p && p.name || ''));
    if (/vamitrat/.test(a)) return 'amitraz_yakma';
    if (/rulamit va\b/.test(a)) return 'amitraz_tutsu';
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
    var disHives = 0, fedN = 0, teyit = null, sugarAny = false, acid = false;
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
        } else if (mp && (mp.level === 'tedavi' || mp.level === 'planla')) teyit = teyit || 'm';
      } else if (!(insp && inf != null) && !treated && autumn) {
        /* sayım yok / muayenesiz: sonbahar tedavisi tahmini (etiket bandı, bilinen arılı çerçeve; yoksa varsayılan) */
        var pr = repProduct(), dz = pr ? I.doseFor(pr.id, beeEst) : null;
        if (pr && dz && dz.ok) add(stripKey(pr), Number(dz.qty), 't', pr.name + ' (etiket' + (bee == null ? ', güç bilinmiyor → ' + BEE_DEFAULT + ' çerçeve varsayıldı' : '') + ')');
        else teyit = teyit || 't';

      }
      if (tg.varroa || (insp && inf == null)) add('alkol', ALCOHOL_L_PER_COUNT, 'm', 'sayımı istenen muayeneli kovan');
      /* --- Besleme --- */
      if (insp && st.honeyFrames != null && st.honeyFrames !== '') {
        var fp = null; try { fp = P.feedPlan(h, st); } catch (e) { fp = null; }
        if (fp && fp.need) {
          if (fp.type === 'kek') add('kek', Number(fp.kekKg) || 0, 'm', 'bakım planı besleme');
          else { add('seker', Number(fp.sugarKg) || 0, 'm', 'bakım planı besleme'); sugarAny = true; }
          add('besleyici', 1, 'm'); fedN++;
        }
      } else if (autumn) {
        var ws = null; try { ws = P.winterStock(h); } catch (e) { ws = null; }
        var needKg = !ws ? 0 : (ws.key === 'yeterli' ? 0 : (ws.needKg != null ? ws.needKg : (ws.target || 18) * UNKNOWN_STORE_FRAC));
        if (needKg > 0) { var ff = feedFromDeficit(needKg, 'surup21'); add('seker', ff.sugarKg, src, ws && ws.kg == null ? 'kışlık hedef (ırk/bölge), stok bilinmiyor' : 'kışlık stok açığı'); add('besleyici', 1, src); sugarAny = true; fedN++; }
      } else if (sk === 'kis') add('kek', 2, src, 'kış ortası kek');
      else if (sk === 'ilkbahar') { add('seker', 3.7, src, 'uyarıcı besleme 1:1'); add('polen', 0.5, src, 'ilkbahar gelişimi'); add('besleyici', 1, src); sugarAny = true; fedN++; }
      if (insp && st.cls === 'Zayıf' && (autumn || sk === 'ilkbahar')) { add('polen', 0.5, 'm', 'zayıf koloni'); if (autumn) add('kek', 1, 'm', 'zayıf koloni'); }
      /* --- Kovan (bulgu etiketleri: bakim-akis.js CARD_TAGS ile aynı eşleme: cerceve←yer, kapi←yagma/zayif, temizlik←guve/olu, hastalik) --- */
      if (tg.yer) { add('kat', 1, 'm', 'yer dar'); add('cerceve', fpk, 'm', 'yer dar'); add('temel_petek', fpk, 'm', 'yer dar'); if (growing) add('ana_izgarasi', 1, 'm'); }
      else if (!insp && growing && (bee == null || bee >= 8) && !box.kat) { add('kat', 1, 't', 'gelişim'); add('cerceve', fpk, 't', 'gelişim'); add('temel_petek', fpk, 't', 'gelişim'); add('ana_izgarasi', 1, 't'); }
      if (!insp && sk === 'ilkbahar') add('temel_petek', 2, 't', 'petek yenileme');
      if (tg.yagma || tg.zayif) add('kapi_daraltici', 1, 'm', tg.yagma ? 'yağma' : 'zayıf koloni');

      if (tg.hastalik || tg.olu) { add('dezenfektan', 0.5, 'm', 'hastalık / ölü arı bulgusu'); disHives++; }
      if (tg.guve) add('dezenfektan', 0.5, 'm', 'mum güvesi');
      flushHive(fpk);
    });
    cur = null;
    Object.keys(capN).forEach(function (k) { if (acc[k]) acc[k].why[capN[k] + ' kovanda üst sınır (' + (k === 'seker' ? '15 L 2:1 şurup ≈ ' + fmtN(HIVE_CAP.seker) + ' kg şeker' : (k === 'cerceve' || k === 'temel_petek' ? '2 kat' : fmtN(HIVE_CAP[k]) + ' ' + BY[k].unit)) + '/kovan)'] = 1; });
    /* --- Arılık başına --- */
    if (teyit) add('ilac_teyit', 1, teyit, 'etiket dozu doğrulanmadı / arılı çerçeve yok');
    var nH = act.length, winterish = autumn || sk === 'kis';
    /* Okzalik damlatma (şırınga, işletmede bir kez); buharlaştırıcı ayrı bir yöntem → kendiliğinden eklenmez */
    if (winterish) { add('okzalik', nH / HIVES_PER_OXALIC, 't', 'yavrusuz dönem damlatma · 1 paket ≈ ' + HIVES_PER_OXALIC + ' kovan'); acid = true; out.flags.siringa = true; }
    if (sk === 'yaz') { add('formik', nH / HIVES_PER_FORMIC, 't', 'hasat sonrası · 1 paket ≈ ' + HIVES_PER_FORMIC + ' kovan'); acid = true; out.flags.maske = true; }
    if (fedN) add('vitamin', fedN / HIVES_PER_VITAMIN, 't', 'beslenen kovan · 1 paket ≈ ' + HIVES_PER_VITAMIN + ' kovan');
    if (sk !== 'kis') add('alt_tabla', STICKY_PER_APIARY, 't', STICKY_PER_APIARY + ' örnek kovan, yeniden kullanılır');
    if (sk !== 'kis') add('alkol', ALCOHOL_L_PER_APIARY, 't', 'örnek kovan yıkaması; süzülüp yeniden kullanılır');
    if (winterish) add('kapi_daraltici', nH * REDUCER_SPARE, 't', 'kışa hazırlık · kayıp/kırık yedeği %' + Math.round(REDUCER_SPARE * 100));
    add('tuz', 1, 't', 'suluk');
    var gm = { aps: 1, acid: acid ? 1 : 0, dis: disHives };
    add('nitril', (VISITS * GLOVE_PAIRS_PER_VISIT + gm.acid * GLOVE_PAIRS_ACID) / GLOVE_PAIRS_PER_BOX, 't');
    if (disHives) add('nitril', disHives * GLOVE_PAIRS_DISEASE_HIVE / GLOVE_PAIRS_PER_BOX, 'm');
    acc.nitril.meta = gm; acc.nitril.why = {}; acc.nitril.why[gloveWhy(gm)] = 1;
    add('koruk_yakit', VISITS * (FUEL_KG_PER_APIARY_VISIT + nH * FUEL_KG_PER_HIVE_VISIT), 't', VISITS + ' ziyaret × (' + fmtN(FUEL_KG_PER_APIARY_VISIT) + ' kg/arılık + ' + fmtN(FUEL_KG_PER_HIVE_VISIT * 1000) + ' g/kovan)');
    add('cakmak', 0.2, 't', '1 paket ≈ 5 arılık');
    add('dezenfektan', DISINFECT_L_PER_APIARY, 't', 'alet hijyeni');
    out.flags.koruk = out.flags.kaziyici = out.flags.arici_eldiven = true;
    if (acid) out.flags.gozluk = true;
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
    /* Besleyici yeniden kullanılır: stokta izlenmiyorsa (kalem yok) var sayılır, satır çıkmaz; izleniyorsa eksik kadar alınır */
    if (SI.have.besleyici == null) secs.forEach(function (s) { delete s.acc.besleyici; });
    /* işletme geneli (bir kez) + stok eşiği */
    var op = { id: 'ortak', name: 'Ortak (işletme geneli, bir kez)', hives: 0, insp: 0, fc: 0, acc: {}, ortak: true };
    CAT.forEach(function (c) { if (c.scope === 'operator' && secs.some(function (s) { return s.flags && s.flags[c.key]; })) op.acc[c.key] = { m: 0, t: 1, why: { 'dayanıklı, bir kez': 1 } }; });
    function lineOf(key, a, have) {
      var c = BY[key], need = up(a.m + a.t * (tolOn(c) ? 1 + T : 1), c.step);
      return { key: key, g: c.g, name: c.name, unit: c.unit, m: a.m, t: a.t, need: need, have: have, buy: 0, confirm: !!c.confirm, note: c.note || '',
        meta: a.meta ? JSON.parse(JSON.stringify(a.meta)) : null, src: a.esik ? 'esik' : (a.m && a.t ? 'mt' : (a.m ? 'm' : 't')), why: Object.keys(a.why || {}).sort(function (x, y) { return (/üst sınır/.test(y) ? 1 : 0) - (/üst sınır/.test(x) ? 1 : 0); }).slice(0, 3).join(' · '), stockNote: (SI.notes[key] || []).join('; ') };
    }
    var MV = mevcut(), haveT = {};
    Object.keys(SI.have).forEach(function (k) { haveT[k] = SI.have[k]; });
    Object.keys(MV).forEach(function (k) { if (Number(MV[k]) > 0) haveT[k] = (haveT[k] || 0) + Number(MV[k]); });
    /* önce stok, sonra elde olan (Mevcut) payı dağıtılır */
    var remaining = {}, remM = {}; Object.keys(SI.have).forEach(function (k) { remaining[k] = SI.have[k]; });
    Object.keys(MV).forEach(function (k) { if (Number(MV[k]) > 0) remM[k] = Number(MV[k]); });
    var totalNeed = {};
    secs.concat([op]).forEach(function (s) { Object.keys(s.acc).forEach(function (k) { var c = BY[k]; totalNeed[k] = (totalNeed[k] || 0) + up(s.acc[k].m + s.acc[k].t * (tolOn(c) ? 1 + T : 1), c.step); }); });
    /* stok eşiği: arılık ihtiyaçları düşüldükten sonra stok eşik + pay altına inecekse, fark ortak bölümde «stok eşiği» satırı olur */
    Object.keys(SI.thr).forEach(function (k) {
      var target = up(SI.thr[k] * (1 + T), BY[k].step), left = (haveT[k] || 0) - (totalNeed[k] || 0);
      if (left < target) { op.acc[k] = op.acc[k] || { m: 0, t: 0, why: {} }; op.acc[k].m += target; op.acc[k].esik = true; op.acc[k].why['stok eşiği ' + fmtN(SI.thr[k]) + ' + %' + tol() + ' pay'] = 1; }
    });
    var extra = [];
    list.forEach(function (x) {
      if (SI.used[x.id] || !(x.threshold > 0) || x.qty > x.threshold) return;
      var need = up(x.threshold * (1 + T), 0.5), xm = Number(MV['stok:' + x.id]) || 0; /* eşik + pay; elde olan düşülür */
      extra.push({ key: 'stok:' + x.id, g: groupOfCat(x.category), cat: x.category, name: x.name, unit: x.unit, m: need, t: 0, need: need, have: Math.max(0, x.qty), mev: xm, buy: up(Math.max(0, need - Math.max(0, x.qty) - xm), 0.5), src: 'esik', why: 'eşik ' + fmtN(x.threshold) + ' ' + x.unit + ' + %' + tol() + ' pay', note: '', stockNote: '' });
    });
    /* Elle eklenen kalemler («Kalem ekle»): bu kapsamın taslağı, ortak bölümde; Mevcut düşülür */
    manual(scope).forEach(function (x) {
      var k = 'el:' + x.id, xm = Number(MV[k]) || 0, q = Number(x.q) || 0;
      extra.push({ key: k, g: groupOfCat(x.cat), cat: x.cat, name: x.name, unit: x.unit, m: q, t: 0, need: q, have: 0, mev: xm, buy: Math.max(0, Math.round((q - xm) * 100) / 100), src: 'elle', why: 'elle eklendi', note: '', stockNote: '', manual: true });
    });
    function finish(s, alloc) {
      var lines = Object.keys(s.acc).map(function (k) { return lineOf(k, s.acc[k], 0); });
      lines.forEach(function (l) {
        var avail = alloc ? (remaining[l.key] || 0) : (SI.have[l.key] || 0), mAv = alloc ? (remM[l.key] || 0) : (Number(MV[l.key]) || 0);
        var fromS = Math.min(avail, l.need), fromM = Math.min(mAv, Math.max(0, l.need - fromS));
        l.have = Math.round(fromS * 10) / 10;
        l.haveAll = Math.round((SI.have[l.key] || 0) * 10) / 10;
        l.mev = Number(MV[l.key]) || 0; l.mevUsed = Math.round(fromM * 100) / 100;
        l.buy = up(Math.max(0, l.need - fromS - fromM), BY[l.key].step);
        if (alloc) { remaining[l.key] = Math.max(0, avail - fromS); remM[l.key] = Math.max(0, mAv - fromM); }
      });
      if (s.ortak) lines = lines.concat(extra);
      var order = {}; GROUPS.forEach(function (g, i) { order[g.key] = i; });
      var ci = {}; CAT.forEach(function (c, i) { ci[c.key] = i; });
      lines.sort(function (a, b) { return (gOrder(a.g) - gOrder(b.g)) || ((ci[a.key] == null ? 99 : ci[a.key]) - (ci[b.key] == null ? 99 : ci[b.key])); });
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
        if (!c) { c = comb[l.key] = JSON.parse(JSON.stringify(l)); c.need = 0; c.buy = 0; c.m = 0; c.t = 0; c.srcs = {}; c.why = ''; c.meta = null; }
        c.need += l.need; c.buy += l.buy; c.m += l.m; c.t += l.t; c.srcs[l.src] = 1; if (l.why && c.why.indexOf(l.why) < 0) c.why = c.why ? c.why : l.why;
        if (l.meta) { c.meta = c.meta || { aps: 0, acid: 0, dis: 0 }; if (c.meta !== l.meta) { c.meta.aps += l.meta.aps || 0; c.meta.acid += l.meta.acid || 0; c.meta.dis += l.meta.dis || 0; } }
      });
    });
    var clines = Object.keys(comb).map(function (k) {
      var c = comb[k], ks = Object.keys(c.srcs);
      c.src = ks.length === 1 ? ks[0] : (c.srcs.m || c.srcs.mt) && (c.srcs.t || c.srcs.mt) ? 'mt' : ks.filter(function (x) { return x !== 'esik'; })[0] || 'esik';
      c.have = c.haveAll != null ? c.haveAll : c.have; delete c.srcs;
      /* Tümü: arılık ihtiyaçları ham toplanır, tek seferde yukarı yuvarlanır (arılık tavanları toplanmaz) */
      var bc = BY[k];
      if (bc) {
        var nd = up(c.m + c.t * (tolOn(bc) ? 1 + T : 1), bc.step);
        c.mev = Number(MV[k]) || 0;
        if (nd < c.need) { c.need = nd; c.buy = up(Math.max(0, nd - (c.haveAll || 0) - c.mev), bc.step); }
      }
      if (k === 'nitril' && c.meta) c.why = gloveWhy(c.meta);
      return c;
    });
    var order = {}; GROUPS.forEach(function (g, i) { order[g.key] = i; }); var ci = {}; CAT.forEach(function (c, i) { ci[c.key] = i; });
    clines.sort(function (a, b) { return (gOrder(a.g) - gOrder(b.g)) || ((ci[a.key] == null ? 99 : ci[a.key]) - (ci[b.key] == null ? 99 : ci[b.key])); });
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
  /* ---------------- Mevcut (elde olan, stoğa henüz girilmemiş) ----------------
   * Alım talebi satırında girilir; alınacak = max(0, gerekli − stokta − mevcut). Anahtar başına saklanır;
   * «Talep oluştur» kaydında stoğa «Giriş (mevcut, talep sırasında)» olarak işlenir ve temizlenir (çift sayım yok). */
  function mevKey() { return live() ? 'superari.stok.mevcut.v1' : 'superari.stok.mevcut.demo.v1'; }
  function mevcut() { var o = readJ(mevKey(), {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function setMevcut(key, v) {
    var o = mevcut(), n = typeof v === 'number' ? v : parseNum(v);
    if (!(n > 0)) delete o[key]; else o[key] = Math.round(n * 100) / 100;
    writeJ(mevKey(), o); return o[key] || 0;
  }
  function clearMevcut() { try { global.localStorage.removeItem(mevKey()); } catch (e) { /* ignore */ } }
  /** Kayıt sırasında: girilen mevcutları stoğa ekler. lines: kalem adı/birimi için (combined). */
  var MEV_REASON = 'Giriş (mevcut, talep sırasında)';
  /**
   * İptal: talep kaydında stoğa giren Mevcut miktarlar geri alınır — o stok hareketi silinir (Hareketler'de iz kalmaz),
   * hareket bulunamazsa (ör. eski kayıt kırpılmış) açıkça etiketli ters hareket yazılır; miktarlar Mevcut alanlarına geri döner.
   * «Stoğa ekle» ile işlenen alımlar (got / stk) dokunulmaz.
   */
  function revertMevcut(t) {
    var out = [];
    (t.mevcutAdded || []).forEach(function (x) {
      var q = Number(x && x.q); if (!(q > 0)) return;
      var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
      var tg = x.id && list.some(function (s) { return s.id === x.id; }) ? { id: x.id, f: null } : stockTarget({ key: x.key, name: x.name, unit: x.unit }, false);
      var how = 'yok';
      if (tg) {
        var it0 = list.filter(function (s) { return s.id === tg.id; })[0];
        var f = tg.f != null ? tg.f : (it0 ? (conv(1, x.unit, it0.unit) || 1) : 1);
        var dq = x.dq != null ? Number(x.dq) : Math.round(q * f * 100) / 100;
        var r = null;
        if (D.stock.unlog) {
          try {
            r = D.stock.unlog(tg.id, function (l) {
              return l.reason === MEV_REASON && Math.abs(Number(l.delta) - dq) < 0.051 && (x.at ? l.at === x.at : l.date === t.date);
            });
          } catch (e) { r = null; }
        }
        if (r) {
          how = 'silindi';
          if (x.created && r.item && !(r.item.qty > 0) && !(r.item.log || []).length) { try { D.stock.remove(tg.id); } catch (e) { /* ignore */ } }
        } else {
          try { if (D.stock.adjust(tg.id, -dq, 'İptal: mevcut talebe geri döndü (alım talebi · ' + dShortT(t.date) + ')', today())) how = 'ters'; } catch (e) { /* ignore */ }
        }
      }
      setMevcut(x.key, (Number(mevcut()[x.key]) || 0) + q);
      out.push({ key: x.key, name: x.name, q: q, unit: x.unit, how: how });
    });
    return out;
  }
  function applyMevcut(lines, d) {
    var mv = mevcut(), out = [], byKey = {};
    (lines || []).forEach(function (l) { byKey[l.key] = l; });
    Object.keys(mv).forEach(function (k) {
      var q = Number(mv[k]); if (!(q > 0)) return;
      var l = byKey[k] || { key: k, name: BY[k] ? BY[k].name : k, unit: BY[k] ? BY[k].unit : 'adet', g: BY[k] ? BY[k].g : 'ekipman' };
      var tg = stockTarget(l, true); if (!tg) return;
      var dq = Math.round(q * tg.f * 100) / 100, it = null;
      try { it = D.stock.adjust(tg.id, dq, MEV_REASON, d || today()); } catch (e) { it = null; }
      var le = it && Array.isArray(it.log) && it.log.length ? it.log[it.log.length - 1] : null;
      if (it) out.push({ key: k, id: tg.id, name: tg.name, q: q, unit: l.unit, dq: dq, at: le && le.at ? le.at : '', created: !!tg.created });
    });
    clearMevcut();
    return out;
  }
  /* ---------------- Elle kalem («Kalem ekle», koloni-75) ----------------
   * Alım talebi taslağına: superari.stok.talep.elle.v1 (canlı) / .demo.v1 — [{ id, scope, name, cat, q, unit, at }].
   * Fiyat girilirse «sizin fiyatınız» olarak 'el:<id>' anahtarıyla saklanır. «Talep oluştur» kaydında talebe geçer, taslak temizlenir. */
  function manKey() { return live() ? 'superari.stok.talep.elle.v1' : 'superari.stok.talep.elle.demo.v1'; }
  function manualAll() { var a = readJ(manKey(), []); return Array.isArray(a) ? a.filter(function (x) { return x && x.id && x.name; }) : []; }
  function manual(scope) { var sc = String(scope == null ? 'all' : scope); return manualAll().filter(function (x) { return String(x.scope) === sc; }); }
  function cleanManual(o) {
    var name = String(o && o.name || '').trim().slice(0, 80), q = typeof o.q === 'number' ? o.q : parseNum(o.q), unit = String(o && o.unit || 'adet').slice(0, 12);
    if (!name) return { error: 'Kalem adı girin.' };
    if (!(q > 0)) return { error: 'Geçerli bir miktar girin.' };
    var p = o.p === '' || o.p == null ? null : (typeof o.p === 'number' ? o.p : parseNum(o.p));
    if (p != null && !(p > 0)) return { error: 'Geçerli bir birim fiyat girin (ör. 42,50) veya boş bırakın.' };
    return { name: name, q: Math.round(q * 100) / 100, unit: unit, cat: String(o.cat || 'ekipman'), p: p != null ? Math.round(p * 100) / 100 : null };
  }
  /** Taslağa elle kalem: { ok, line } | { ok:false, error } */
  function addManual(scope, o) {
    var c = cleanManual(o || {}); if (c.error) return { ok: false, error: c.error };
    var x = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), scope: String(scope == null ? 'all' : scope), name: c.name, cat: c.cat, q: c.q, unit: c.unit, at: new Date().toISOString() };
    var a = manualAll(); a.push(x); writeJ(manKey(), a);
    if (c.p != null) setPrice('el:' + x.id, c.p);
    try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: true, line: x };
  }
  function removeManual(id) {
    var a = manualAll(), n = a.filter(function (x) { return x.id !== id; }); if (n.length === a.length) return false;
    writeJ(manKey(), n); setPrice('el:' + id, ''); setMevcut('el:' + id, 0);
    try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
    return true;
  }
  function clearManual(scope) { var sc = String(scope == null ? 'all' : scope); writeJ(manKey(), manualAll().filter(function (x) { return String(x.scope) !== sc; })); }
  function talepKey() { return live() ? 'superari.stok.talep.v1' : 'superari.stok.talep.demo.v1'; }
  function talepler() { var a = readJ(talepKey(), []); return Array.isArray(a) ? a : []; }
  function saveTalep(rq, apName) {
    var ri = rq.ref || {};
    var rows = [];
    function push(s, lines) { lines.forEach(function (l) { if (l.buy > 0) rows.push({ apiaryId: s ? s.id : '', apiaryName: s ? s.name : 'Toplam', key: l.key, group: l.g, cat: l.cat || undefined, manual: l.manual || undefined, name: l.name, unit: l.unit, need: l.need, have: l.have, buy: l.buy, src: l.src, price: l.price.v, priceSrc: l.price.src, priceDate: l.price.date || '', cost: l.cost }); }); }
    if (rq.scope === 'all') {
      /* Tümü: kalem başına tek satır (alım kaydı kolay), arılık dağılımı satırda saklanır */
      var per = {};
      rq.sections.concat([rq.ortak]).forEach(function (s) { s.lines.forEach(function (l) { if (l.buy > 0) (per[l.key] = per[l.key] || []).push({ id: s.ortak ? '' : s.id, name: s.name, buy: l.buy }); }); });
      push({ id: '', name: 'Tümü' }, rq.combined.lines);
      rows.forEach(function (r) { if (per[r.key]) r.aps = per[r.key]; });
    } else {
      rq.sections.forEach(function (s) { push(s, s.lines); });
      push(rq.ortak, rq.ortak.lines);
    }
    var t = {
      id: 'tl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date: today(), createdAt: new Date().toISOString(),
      apiaryId: rq.scope === 'all' ? '' : String(rq.scope), apiaryName: apName, tol: rq.tol, hives: rq.hives, insp: rq.insp, fc: rq.fc,
      status: 'acik', total: rq.total, missing: rq.missing, buyN: rq.buyN, priceRefDate: ri.ok ? ri.updated : '', priceRefStale: !!(ri.ok && ri.stale),
      priceAt: ri.ok ? (REF.fetchedAt || '') : '', priceSource: ri.ok ? (REF.fromCache ? 'cache' : (REF.src || 'file')) : 'user', lines: rows
    };
    if (!live()) t.demo = true;
    /* elde olan (Mevcut) miktarlar stoğa girer, alanlar temizlenir; talep zaten bunlar düşülerek hesaplandı */
    var mvLines = (rq.combined && rq.combined.lines || []).slice();
    rq.sections.concat([rq.ortak]).forEach(function (s) { (s.lines || []).forEach(function (l) { mvLines.push(l); }); });
    var mvAdded = applyMevcut(mvLines, t.date);
    if (mvAdded.length) t.mevcutAdded = mvAdded.map(function (x) { return { key: x.key, name: x.name, q: x.q, unit: x.unit, id: x.id, dq: x.dq, at: x.at, created: x.created || undefined }; }); /* iptalde geri almak için hareket kimliği */
    var a = talepler(); a.push(t); if (a.length > 50) a = a.slice(-50);
    writeJ(talepKey(), a);
    clearManual(rq.scope); /* elle eklenen kalemler artık talepte */
    try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
    return t;
  }

  /* ---------------- Kayıtlı talepler: durum, iptal / sil, alım kaydı ---------------- */
  var STATUS = { acik: 'Açık', kismen: 'Alındı (kısmen)', tamam: 'Tamamlandı', iptal: 'İptal' };
  function r2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function gotQ(l) { return l && l.got && Number(l.got.q) > 0 ? Number(l.got.q) : 0; }
  function statusOf(t) {
    if (!t) return 'acik';
    if (t.status === 'iptal') return 'iptal';
    var ls = t.lines || [], n = ls.filter(function (l) { return gotQ(l) > 0; }).length;
    return !ls.length || !n ? 'acik' : (n === ls.length ? 'tamam' : 'kismen');
  }
  /** Tahmini vs gerçek: est = talep tahmini toplamı; act = ödenen (miktar × ödenen birim); estBought = alınan miktarlar × tahmini birim (fark bunun üzerinden) */
  function talepSums(t) {
    var o = { est: r2(t.total), act: 0, estBought: 0, bought: 0, n: (t.lines || []).length, actMissing: 0, estMissing: 0 };
    (t.lines || []).forEach(function (l) {
      var q = gotQ(l); if (!q) return;
      o.bought++;
      if (l.got.p != null && Number(l.got.p) > 0) o.act += q * Number(l.got.p); else o.actMissing++;
      if (l.price != null) o.estBought += q * Number(l.price); else o.estMissing++;
    });
    o.act = r2(o.act); o.estBought = r2(o.estBought); o.diff = r2(o.act - o.estBought);
    return o;
  }
  var AYT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function dShortT(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Number(m[3]) + ' ' + AYT[Number(m[2]) - 1] + ' ' + m[1] : ''; }
  /** Hareketler: «Giriş (alım talebi · 3 Eki 2026)» satırından talebi bul (stok kalemi + talep tarihi; aynı gün birden çoksa en yenisi) */
  function talepForLog(itemId, reason) {
    var m = /alım talebi · ([^)]+)\)/.exec(String(reason || '')); if (!m) return null;
    var hit = null;
    talepler().forEach(function (t) {
      if (!t || dShortT(t.date) !== m[1]) return;
      if ((t.lines || []).some(function (l) { return l.stk && l.stk.id === itemId; }) && (!hit || String(t.createdAt) > String(hit.createdAt))) hit = t;
    });
    return hit;
  }
  function talepById(id) { return talepler().filter(function (t) { return t && t.id === id; })[0] || null; }
  function writeTalepler(a) { writeJ(talepKey(), a); try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ } }
  function updateTalep(id, fn) {
    var a = talepler(), out = null;
    a = a.map(function (t) { if (!t || t.id !== id) return t; var c = JSON.parse(JSON.stringify(t)); fn(c); c.updatedAt = new Date().toISOString(); if (c.status !== 'iptal') c.status = statusOf(c); out = c; return c; });
    if (out) writeTalepler(a);
    return out;
  }
  /** Açık talepte tahmini fiyatlar güncel fiyatlardan farklı mı (sizin fiyatınız → kaynak ortalaması) */
  function talepPriceDiff(t) {
    var n = 0, nt = 0, items = [];
    (t.lines || []).forEach(function (l) {
      var p = priceFor(l.key), nv = p.v != null ? Number(p.v) : null, ov = l.price != null ? Number(l.price) : null;
      if ((nv == null) !== (ov == null) || (nv != null && Math.abs(nv - ov) > 0.004)) { n++; items.push({ key: l.key, name: l.name, unit: l.unit || '', old: ov, nw: nv }); }
      if (nv != null) nt += l.buy * nv;
    });
    return { n: n, total: r2(nt), items: items };
  }
  /** Güncel fiyatlarla yeniden hesapla: yalnız tahmini birim / tutar değişir; ödenen gerçek fiyatlar (got) korunur */
  function repriceTalep(id) {
    var ri = refInfo();
    return updateTalep(id, function (t) {
      if (statusOf(t) === 'iptal' || statusOf(t) === 'tamam') return;
      var miss = 0, tot = 0;
      t.lines.forEach(function (l) {
        var p = priceFor(l.key);
        l.price = p.v; l.priceSrc = p.src; l.priceDate = p.date || '';
        delete l.est0; delete l.src0; delete l.date0; /* yeni anlık görüntü: geri dönüş noktası bu */
        l.cost = p.v != null ? r2(l.buy * p.v) : 0; if (p.v == null) miss++; tot += l.cost;
      });
      t.total = r2(tot); t.missing = miss; t.priceRefDate = ri.ok ? ri.updated : ''; t.priceRefStale = !!(ri.ok && ri.stale); t.priceAt = ri.ok ? (REF.fetchedAt || '') : ''; t.repricedAt = today();
    });
  }
  /** Kayıtlı açık talebe elle kalem ekle (Talep ayrıntısında «Kalem ekle»): toplam / fiyatsız sayısı yeniden hesaplanır */
  function addTalepLine(id, o) {
    var c = cleanManual(o || {}); if (c.error) return { ok: false, error: c.error };
    var t0 = talepById(id); if (!t0) return { ok: false, error: 'Talep bulunamadı.' };
    var st0 = statusOf(t0); if (st0 === 'iptal' || st0 === 'tamam') return { ok: false, error: 'Kapalı talebe kalem eklenemez.' };
    var key = 'el:m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (c.p != null) setPrice(key, c.p);
    var t = updateTalep(id, function (t) {
      t.lines.push({ apiaryId: '', apiaryName: t.apiaryId ? t.apiaryName : 'Tümü', key: key, group: groupOfCat(c.cat), cat: c.cat, manual: true, name: c.name, unit: c.unit, need: c.q, have: 0, buy: c.q, src: 'elle',
        price: c.p, priceSrc: c.p != null ? 'user' : null, priceDate: c.p != null ? today() : '', cost: c.p != null ? r2(c.q * c.p) : 0 });
      t.total = r2(t.lines.reduce(function (a, l) { return a + (Number(l.cost) || 0); }, 0));
      t.missing = t.lines.filter(function (l) { return l.price == null || !(Number(l.price) > 0); }).length; t.buyN = t.lines.length;
    });
    return t ? { ok: true, talep: t } : { ok: false, error: 'Talep güncellenemedi.' };
  }
  /** Açık talepte tahmini birim fiyatı elle değiştir: talep satırı + sizin fiyatınız (kendi fiyatınız her zaman önce gelir) */
  function setTalepLinePrice(id, i, v) {
    var n = typeof v === 'number' ? v : parseNum(v); if (!(n > 0)) return null;
    var key = null;
    var t = updateTalep(id, function (t) {
      var st = statusOf(t); if (st === 'iptal' || st === 'tamam') return;
      var l = t.lines[i]; if (!l) return;
      if (!('est0' in l)) { l.est0 = l.price != null ? l.price : null; l.src0 = l.priceSrc || ''; l.date0 = l.priceDate || ''; }
      key = l.key; l.price = Math.round(n * 100) / 100; l.priceSrc = 'user'; l.priceDate = today(); l.cost = r2(l.buy * l.price);
      t.total = r2(t.lines.reduce(function (a, x) { return a + (x.cost || 0); }, 0)); t.missing = t.lines.filter(function (x) { return x.price == null; }).length;
    });
    if (key) setPrice(key, n);
    return t;
  }
  /** Açık talepte tahmini fiyat alanı boşaltıldı: talebin kayıttaki (anlık görüntü) tahmini fiyatına dön. Ödenen fiyatlara dokunmaz. */
  function clearTalepLinePrice(id, i) {
    var done = false, edited = null;
    var t = updateTalep(id, function (t) {
      var st = statusOf(t); if (st === 'iptal' || st === 'tamam') return;
      var l = t.lines[i]; if (!l || !('est0' in l)) return;
      edited = { key: l.key, v: l.price };
      l.price = l.est0; l.priceSrc = l.src0 || (l.est0 != null ? 'ref' : null); l.priceDate = l.date0 || '';
      delete l.est0; delete l.src0; delete l.date0;
      l.cost = l.price != null ? r2(l.buy * l.price) : 0; done = true;
      t.total = r2(t.lines.reduce(function (a, x) { return a + (x.cost || 0); }, 0)); t.missing = t.lines.filter(function (x) { return x.price == null; }).length;
    });
    /* bu düzenlemenin yazdığı «sizin fiyatınız» da geri alınır (başka bir değer girilmişse dokunulmaz) */
    if (done && edited) { var u = userPrice(edited.key); if (u && Math.abs(u.v - edited.v) < 0.005) setPrice(edited.key, ''); }
    return done ? t : null;
  }
  /** İptal (tekrar çağrılırsa değişmez): durum İptal; talep kaydında stoğa giren Mevcut miktarlar geri alınıp Mevcut alanlarına döner. */
  function cancelTalep(id) {
    var t0 = talepById(id); if (!t0) return null;
    if (t0.status === 'iptal') return t0;
    var rev = t0.mevcutAdded && t0.mevcutAdded.length && !t0.mevcutReverted ? revertMevcut(t0) : null;
    return updateTalep(id, function (t) {
      t.status = 'iptal'; t.cancelledAt = today();
      if (rev) t.mevcutReverted = { date: today(), items: rev };
    });
  }
  function deleteTalep(id) {
    var a = talepler(), t = a.filter(function (x) { return x && x.id === id; })[0];
    if (!t || statusOf(t) !== 'iptal') return false;   /* yalnız iptal edilen silinir */
    writeTalepler(a.filter(function (x) { return x && x.id !== id; }));
    return true;
  }
  /* Satırın stok kalemi: stok:<id> → o kalem; yoksa katalog anahtarıyla eşleşen (şurup hariç, aynı / çevrilebilir birim); yoksa doğru türde yeni kalem */
  var NEW_CAT = { seker: 'seker', kek: 'kek', polen: 'polen', vitamin: 'polen', cerceve: 'cerceve', temel_petek: 'temelPetek', kat: 'kovan' };
  function newCatFor(l) { if (l.cat) return l.cat; var c = BY[l.key]; if (NEW_CAT[l.key]) return NEW_CAT[l.key]; if (!c) return 'ekipman'; return c.g === 'ilac' ? 'ilac' : (c.g === 'besleme' ? 'polen' : 'ekipman'); }
  function stockTarget(l, create) {
    var S = D.stock, list = []; try { list = S.list(); } catch (e) { list = []; }
    var m = /^stok:(.+)$/.exec(String(l.key || ''));
    if (m) { var it0 = list.filter(function (x) { return x.id === m[1]; })[0]; return it0 ? { id: it0.id, f: conv(1, l.unit, it0.unit) || 1, name: it0.name } : null; }
    var best = null;
    if (/^el:/.test(String(l.key || ''))) {
      /* elle eklenen kalem: aynı ad (+ kategori) ve çevrilebilir birimdeki stok kalemi, yoksa yeni kalem */
      var nn = norm(l.name);
      list.forEach(function (x) { if (norm(x.name) !== nn || (l.cat && x.category !== l.cat)) return; var f = conv(1, l.unit, x.unit); if (f == null) return; if (!best || (best.f !== 1 && f === 1)) best = { id: x.id, f: f, name: x.name }; });
      if (best || !create) return best;
      var itm = S.save({ name: String(l.name || 'Kalem').slice(0, 80), category: newCatFor(l), unit: l.unit, qty: 0, threshold: 0, note: 'Alım talebinden oluşturuldu', demo: !live() || undefined });
      return itm ? { id: itm.id, f: 1, name: itm.name, created: true } : null;
    }
    list.forEach(function (x) {
      if (x.feedType === 'surup21' || x.feedType === 'surup11') return;
      var c = matchCat(x); if (!c || c.key !== l.key) return;
      var f = conv(1, l.unit, x.unit); if (f == null) return;
      if (!best || (best.f !== 1 && f === 1)) best = { id: x.id, f: f, name: x.name };
    });
    if (best || !create) return best;
    var c = BY[l.key], it = S.save({ name: (c ? c.name : l.name).slice(0, 80), category: newCatFor(l), unit: l.unit, qty: 0, threshold: 0, note: 'Alım talebinden oluşturuldu', demo: !live() || undefined });
    return it ? { id: it.id, f: 1, name: it.name, created: true } : null;
  }
  /**
   * Alım kaydı. entries: [{ i, q, p }] (q boş/0 → alınmadı). opts: { stock: true, savePrice: true }.
   * Stok: daha önce stoğa eklenen miktar değişirse yalnız fark işlenir (çift ekleme yok); ilk ekleme yalnız «Stoğa ekle» açıkken.
   */
  function recordPurchase(id, entries, opts) {
    opts = opts || {};
    var t0 = talepById(id); if (!t0 || statusOf(t0) === 'iptal') return null;
    var res = { moves: [], created: [], prices: 0, lines: 0 }, d = today(), tag = ' · ' + dShortT(t0.date) + ')';
    var R_IN = 'Giriş (alım talebi' + tag, R_FIX = 'Düzeltme (alım talebi' + tag;
    var t = updateTalep(id, function (t) {
      entries.forEach(function (e) {
        var l = t.lines[e.i]; if (!l) return;
        var q = Math.max(0, Math.round((Number(e.q) || 0) * 100) / 100), p = Number(e.p) > 0 ? Math.round(Number(e.p) * 100) / 100 : null;
        var prevQ = gotQ(l), prevP = l.got ? l.got.p : null;
        if (q > 0) l.got = { q: q, p: p, d: (l.got && l.got.d && prevQ === q && prevP === p) ? l.got.d : d }; else delete l.got;
        if (q !== prevQ || p !== prevP) res.lines++;
        /* stok */
        var added = l.stk && Number(l.stk.a) > 0 ? Number(l.stk.a) : 0;
        var want = added > 0 || opts.stock ? q : added, delta = Math.round((want - added) * 100) / 100;
        if (delta) {
          var tg = l.stk && l.stk.id ? { id: l.stk.id, f: Number(l.stk.f) || 1 } : null;
          var out = tg ? D.stock.adjust(tg.id, delta * tg.f, delta > 0 ? R_IN : R_FIX, d) : null;
          if (!out && delta > 0) { tg = stockTarget(l, true); out = tg ? D.stock.adjust(tg.id, delta * tg.f, R_IN, d) : null; if (tg && tg.created) res.created.push(tg.name); }
          if (out) { l.stk = { id: tg.id, a: Math.max(0, Math.round((added + delta) * 100) / 100), f: tg.f }; res.moves.push({ name: out.name, delta: delta * tg.f, unit: out.unit }); if (!l.stk.a) delete l.stk; }
        }
        if (opts.savePrice && q > 0 && p != null) { setPrice(l.key, p); res.prices++; }
      });
    });
    res.talep = t;
    return res;
  }

  /* ---------------- Fiyatı bulunamayan kalemler → yönetici ----------------
   * Kullanıcıya uyarı gösterilmez. Alım talebinde alınacak olup fiyatı olmayan kalem anahtarları
   * cihazda (superari.stok.fiyatsiz.v1, çevrimdışı yedek) toplanır ve oturum açıksa buluta
   * (Supabase sa_report_fiyat_eksik → public.fiyat_eksik) gönderilir; yonetici.html listeler.
   * Aynı kalem günde bir kez sayılır; fiyat kaynağı hiç yüklenemediyse kayıt yapılmaz. */
  var MISS_KEY = 'superari.stok.fiyatsiz.v1';
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function missLog() { var m = readJ(MISS_KEY, null); return m && typeof m === 'object' && m.items && typeof m.items === 'object' ? m : { items: {} }; }
  /** Fiyatsız satırları kaydeder; dönüş: bugün yeni sayılan anahtar sayısı. */
  function noteMissing(lines, scopeName) {
    var ri = refInfo(); if (!ri.ok) return 0;
    var m = missLog(), now = new Date().toISOString(), day = todayIso(), n = 0;
    (lines || []).forEach(function (l) {
      if (!l || !l.key || !(l.buy > 0) || (l.price && l.price.v != null) || /^el:/.test(l.key)) return; /* elle eklenen kalem: kaynak fiyatı beklenmez */
      var e = m.items[l.key] || { key: l.key, first: now, count: 0 };
      e.name = String(l.name || l.key).slice(0, 120); e.unit = String(l.unit || '').slice(0, 20); e.scope = String(scopeName || '').slice(0, 80);
      if (e.day !== day) { e.count = (Number(e.count) || 0) + 1; e.day = day; e.last = now; n++; }
      m.items[l.key] = e;
    });
    if (n) { writeJ(MISS_KEY, m); flushMissing(); }
    return n;
  }
  /** Buluta gönderilmemiş kayıtlar (sayım gönderilenden fazla). */
  function missPending() { var m = missLog(); return Object.keys(m.items).map(function (k) { return m.items[k]; }).filter(function (e) { return e && (Number(e.count) || 0) > (Number(e.sentN) || 0); }); }
  var flushing = false, flushTry = 0;
  function flushMissing() {
    var B = global.SuperAriBulut, items = missPending();
    if (!items.length || flushing || global.navigator.onLine === false) return Promise.resolve(false);
    if (!B || !B.client) { /* bulut.js pwa.js ile sonradan yüklenebilir */ if (flushTry++ < 3) setTimeout(flushMissing, 6000); return Promise.resolve(false); }
    flushing = true;
    var payload = items.slice(0, 60).map(function (e) { return { n: Number(e.count) || 0, key: e.key, name: e.name, unit: e.unit, scope: e.scope, first: e.first, last: e.last }; });
    var v = (global.document && global.document.querySelector && (global.document.querySelector('script[src*="stok-talep.js"]') || {}).src || '').replace(/^.*[?&]v=/, '').slice(0, 40);
    return B.session().then(function (s) {
      if (!s) return false;
      return B.client().then(function (c) { return c.rpc('sa_report_fiyat_eksik', { p_items: payload, p_version: v || null }); }).then(function (r) {
        var m = missLog();
        if (r && r.error) {
          /* fiyat_eksik migration uygulandı: gün boyu atlama yok; hata olursa kayıt cihazda bekler, sonraki talepte yeniden denenir */
          m.cloud = 'error'; m.cloudErr = String(r.error.code || r.error.message || 'hata').slice(0, 80); delete m.cloudDay; writeJ(MISS_KEY, m);
          return false;
        }
        payload.forEach(function (p) { var e = m.items[p.key]; if (e) e.sentN = Math.max(Number(e.sentN) || 0, p.n); });
        m.cloud = 'ok'; m.cloudAt = new Date().toISOString(); delete m.cloudErr; delete m.cloudDay; writeJ(MISS_KEY, m);
        return true;
      });
    }).catch(function () { return false; }).then(function (ok) { flushing = false; return ok; });
  }

  global.SuperAriTalep = {
    CAT: CAT, GROUPS: GROUPS, BY: BY, groupList: groupList, groupLabel: groupLabel, groupOfCat: groupOfCat, manual: manual, addManual: addManual, removeManual: removeManual, addTalepLine: addTalepLine, build: build, loadRef: loadRef, refInfo: refInfo, priceFor: priceFor, tol: tol, setTol: setTol,
    userPrice: userPrice, setPrice: setPrice, talepler: talepler, saveTalep: saveTalep, clearTalepLinePrice: clearTalepLinePrice, mevcut: mevcut, setMevcut: setMevcut, clearMevcut: clearMevcut, applyMevcut: applyMevcut, norm: norm, REF: REF,
    RULES: { INSPECT_DAYS: INSPECT_DAYS, BEE_DEFAULT: BEE_DEFAULT, VISITS: VISITS, UNKNOWN_STORE_FRAC: UNKNOWN_STORE_FRAC },
    setTalepLinePrice: setTalepLinePrice, offerRef: offerRef, applyPending: applyPending, dismissPending: dismissPending, withRef: withRef, diffRef: diffRef, priceChangeText: priceChangeText, talepPriceDiff: talepPriceDiff, repriceTalep: repriceTalep,
    refItem: function (k) { return REF.byKey[k] || null; }, noteMissing: noteMissing, missLog: missLog, missPending: missPending, flushMissing: flushMissing, MISS_KEY: MISS_KEY, parseNum: parseNum, talepForLog: talepForLog, dShortT: dShortT, STATUS: STATUS, statusOf: statusOf, talepSums: talepSums, talepById: talepById, cancelTalep: cancelTalep, deleteTalep: deleteTalep, recordPurchase: recordPurchase, stockTarget: stockTarget,
    tolOn: tolOn, glovePairs: glovePairs, gloveWhy: gloveWhy, GLOVE: { PER_VISIT: GLOVE_PAIRS_PER_VISIT, ACID: GLOVE_PAIRS_ACID, DISEASE_HIVE: GLOVE_PAIRS_DISEASE_HIVE, PER_BOX: GLOVE_PAIRS_PER_BOX },
    FEED: FEED, HIVE_CAP: HIVE_CAP, feedFromDeficit: feedFromDeficit, syrupSugar: syrupSugar, capHive: capHive
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.SuperAriTalep;
})(typeof window !== 'undefined' ? window : globalThis);
