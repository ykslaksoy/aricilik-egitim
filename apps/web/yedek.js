/**
 * SüperArı — cihaz yedeği (JSON): Canlı moddaki tüm yerel veriler; geri yüklemede önizleme + birleştirme.
 * Demo verileri, bulut oturum/durum bilgisi ve yeniden indirilebilen önbellekler (hava, harita) yedeğe girmez.
 * Fotoğraflar (cihazdaki resim dosyaları) yedeğe girmez; bulutta ayrıca saklanır.
 */
(function (global) {
  var LS = global.localStorage;
  var FORMAT = 'superari-cihaz-yedegi';
  var SKIP = [/\.demo(\.|$)/i, /demo/i, /seed/i, /^superari\.bulut\./, /^superari\.session\./, /^superari\.account/, /^superari\.push\./,
    /^superari\.hava\./, /^superari\.harita/, /^superari\.waterSources/, /^superari\.discovered/, /^superari\.workMode\.ping/,
    /^superari\.saglikKick/, /^superari\.davet\./, /^superari\.hataLog\./, /^superari\.sartlar\./, /^superari\.bildirimGonderildi/,
    /Mig(\.|ration)|migrated|orphanPurge|canliTemizlik\.v1$/];
  var LABELS = {
    'superari.ariliklar.v1': 'Arılıklar', 'superari.kovanlar.v1': 'Kovanlar', 'superari.anaArilar.v1': 'Ana arılar',
    'superari.koloniKayit.v1': 'Muayene / bakım kayıtları', 'superari.koloniIslem.v1': 'Koloni işlemleri', 'superari.gorevler.v1': 'Görevler',
    'superari.gorevTamam.v1': 'Tamamlanan görevler', 'superari.stok.v1': 'Stok', 'superari.malzemeler.v1': 'Malzemeler',
    'superari.giderler.v1': 'Giderler', 'superari.tasimalar.v1': 'Taşımalar', 'superari.goc.v1': 'Göç kayıtları',
    'superari.satislar.v1': 'Satışlar', 'superari.musteriler.v1': 'Müşteriler', 'superari.rapor.gelir.live.v1': 'Gelirler',
    'superari.hasat.v2': 'Hasat', 'superari.rapor.hasat.v1': 'Hasat (rapor)', 'superari.tartiElle.v1': 'Elle tartım',
    'superari.bakimPlan.v1': 'Bakım planı ayarları', 'superari.bakimTur.v1': 'Bakım turu', 'superari.devices': 'Cihazlar / sensörler',
    'superari.etiketAnaYili.v1': 'Ana arı yılı etiketi', 'superari.rapor.muayene.v1': 'Muayene raporu', 'superari.workMode': 'Çalışma modu'
  };
  function label(k) { return LABELS[k] || ('Ayar: ' + k.replace(/^superari\./, '')); }
  function keep(k) { return k && k.indexOf('superari.') === 0 && !SKIP.some(function (re) { return re.test(k); }); }
  /* Nesne / dizi JSON ise çözülür; diğer her şey (düz metin, sayı) ham metin olarak kalır ve aynen geri yazılır. */
  function parse(v) { if (v == null) return null; try { var o = JSON.parse(v); return o && typeof o === 'object' ? o : v; } catch (e) { return v; } }
  function ser(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
  function localKeys() { var out = []; for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (keep(k)) out.push(k); } return out.sort(); }
  function collect() {
    var data = {};
    localKeys().forEach(function (k) { data[k] = parse(LS.getItem(k)); });
    var ver = ''; try { var s = document.querySelector('script[src*="pwa.js?v="]'); ver = s ? /v=([^&]+)/.exec(s.src)[1] : ''; } catch (e) { /* ignore */ }
    return { format: FORMAT, formatVersion: 1, app: 'SüperArı', appVersion: ver, createdAt: new Date().toISOString(), keys: data };
  }
  function count(v) {
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === 'object') return Object.keys(v).length;
    return v == null ? 0 : 1;
  }
  function idOf(x) { return x && typeof x === 'object' && (x.id != null ? String(x.id) : (x.key != null ? String(x.key) : null)); }
  function isIdArray(a) { return Array.isArray(a) && a.length > 0 && a.every(function (x) { return idOf(x) != null; }); }
  /** Yedek dosyasını denetler: { ok, backup, error } */
  function read(text) {
    var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'Dosya okunamadı (JSON değil).' }; }
    if (!o || o.format !== FORMAT || !o.keys || typeof o.keys !== 'object') return { ok: false, error: 'Bu dosya SüperArı cihaz yedeği değil. (Buluttan indirilen dosya geri yüklenmez; giriş yapınca bulut zaten eşitlenir.)' };
    var keys = {}; Object.keys(o.keys).forEach(function (k) { if (keep(k)) keys[k] = o.keys[k]; });
    o.keys = keys;
    return { ok: true, backup: o };
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  /* Özyinelemeli birleştirme: cihazdaki korunur; yedekte olup cihazda olmayan (id'li dizi öğesi / nesne anahtarı) eklenir. */
  function merge(l, b) {
    var r = { out: l, add: 0, differ: 0, changed: false };
    if (JSON.stringify(l) === JSON.stringify(b)) return r;
    if (Array.isArray(l) && Array.isArray(b) && (isIdArray(b) || !b.length) && (isIdArray(l) || !l.length)) {
      var have = {}; l.forEach(function (x) { have[idOf(x)] = x; });
      var extra = [];
      b.forEach(function (x) { var id = idOf(x); if (!(id in have)) extra.push(x); else if (JSON.stringify(have[id]) !== JSON.stringify(x)) r.differ++; });
      if (extra.length) { r.out = l.concat(extra); r.add = extra.length; r.changed = true; }
      return r;
    }
    if (isObj(l) && isObj(b)) {
      var o = {}; Object.keys(l).forEach(function (k) { o[k] = l[k]; });
      Object.keys(b).forEach(function (k) {
        if (!(k in o)) { o[k] = b[k]; r.add += Array.isArray(b[k]) ? b[k].length : (isObj(b[k]) ? Math.max(1, deepCount(b[k])) : 1); r.changed = true; return; }
        var m = merge(o[k], b[k]);
        r.add += m.add; r.differ += m.differ;
        if (m.changed) { o[k] = m.out; r.changed = true; }
      });
      r.out = o;
      return r;
    }
    r.differ = 1;
    return r;
  }
  function deepCount(v) {
    if (Array.isArray(v)) return v.length;
    if (isObj(v)) { var n = 0; Object.keys(v).forEach(function (k) { n += Array.isArray(v[k]) ? v[k].length : (isObj(v[k]) ? deepCount(v[k]) : 0); }); return n; }
    return 0;
  }
  /** Birleştirme planı: her anahtar için ne olacağı. */
  function plan(backup) {
    return Object.keys(backup.keys).sort().map(function (k) {
      var b = backup.keys[k], raw = LS.getItem(k), l = raw == null ? null : parse(raw);
      var row = { key: k, label: label(k), local: size(l), backup: size(b), add: 0, differ: 0, action: 'ayni' };
      if (l == null) { row.action = 'yeni'; row.add = size(b); return row; }
      var m = merge(l, b);
      row.add = m.add; row.differ = m.differ;
      row.action = m.changed ? 'ekle' : (m.differ ? 'farkli' : 'ayni');
      return row;
    });
  }
  function size(v) { var n = deepCount(v); return n || count(v); }
  /** mode: 'birlestir' (cihazdakiler korunur, yedekte olup cihazda olmayanlar eklenir) | 'degistir' (yedekteki anahtarlar aynen yazılır) */
  function apply(backup, mode) {
    var changed = 0;
    Object.keys(backup.keys).forEach(function (k) {
      var b = backup.keys[k], raw = LS.getItem(k), l = raw == null ? null : parse(raw), out = null;
      if (mode === 'degistir' || l == null) out = b;
      else { var m = merge(l, b); if (m.changed) out = m.out; }
      if (out != null) {
        var txt = ser(out);
        if (txt !== raw) { LS.setItem(k, txt); changed++; }
      }
    });
    try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
    return { changed: changed };
  }
  function download() {
    var b = collect();
    var blob = new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'superari-cihaz-yedegi-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return { keys: Object.keys(b.keys).length, bytes: blob.size };
  }
  global.SuperAriYedek = { FORMAT: FORMAT, collect: collect, read: read, plan: plan, apply: apply, download: download, label: label, keep: keep };
})(window);
