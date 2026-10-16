/* k160: Batarya planlayıcı + taşınma/konaklama planı (tek kaynak). Eşikler yönetici panelinde (ORS_SENSOR, uzman tahmini).
 * Kural: veri yoksa öneri yok («Hesaplanıyor» / «Veri yok»); onaysız ölçüm sıklığı ve plan tarihi değişmez. */
(function (global) {
  var KON_KEY = 'superari.konaklama.v1', CMD_KEY = 'superari.gateway.komut.v1', DAY = 86400000;
  var ARALIK = [900000, 1800000, 3600000, 7200000, 14400000];
  var ARALIK_AD = { 900000: '15 dakikada bir', 1800000: '30 dakikada bir', 3600000: 'saatte bir', 7200000: '2 saatte bir', 14400000: '4 saatte bir' };
  function D() { return global.SuperAriDemo; }
  function T() { var d = D(), s = d && d.colony && d.colony.ogulSkor ? d.colony.ogulSkor() : null; var base = (d && d.colony && d.colony.ORS_SENSOR) || {}; return Object.assign({}, base, s && s.sensor ? s.sensor : {}); }
  function rj(k, def) { try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } }
  function wj(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function iso(d) { var x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function daysTo(isoDate, now) { var t = Date.parse(String(isoDate).slice(0, 10) + 'T00:00:00'); return isFinite(t) ? Math.round((t - (now || today()).getTime()) / DAY) : null; }
  function trD(isoDate) { var t = Date.parse(String(isoDate).slice(0, 10) + 'T12:00:00'); return isFinite(t) ? new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : ''; }

  /* ---------- Konaklama planı (arılık başına: varış, ayrılış) ---------- */
  function konAll() { var o = rj(KON_KEY, {}); return o && typeof o === 'object' ? o : {}; }
  function konGet(apiaryId) { return apiaryId ? (konAll()[String(apiaryId)] || null) : null; }
  function konSet(apiaryId, patch) {
    if (!apiaryId) return null; var all = konAll(), cur = all[String(apiaryId)] || {};
    all[String(apiaryId)] = Object.assign({}, cur, patch, { guncel: new Date().toISOString() }); wj(KON_KEY, all);
    hazirlikGorevi(apiaryId);
    try { global.dispatchEvent(new CustomEvent('superari:konaklama', { detail: { apiaryId: apiaryId } })); } catch (e) { /* ignore */ }
    return all[String(apiaryId)];
  }
  /** Arılıkta kalma bitişi: plan ayrılışı (yoksa boş) */
  function kalmaBitis(apiaryId) { var k = konGet(apiaryId); return k && k.ayrilis ? k.ayrilis : null; }
  function hazirlikGorevi(apiaryId) {
    var k = konGet(apiaryId), d = D(), TS = d && d.taskStore; if (!k || !k.ayrilis || !TS || !TS.add) return;
    var due = new Date(Date.parse(k.ayrilis + 'T00:00:00') - (Number(T().tasHazirlikGun) || 3) * DAY), mark = '[tasinma:' + apiaryId + ']';
    try {
      (TS.all ? TS.all() : []).forEach(function (t) { if (t && String(t.note || '').indexOf(mark) >= 0 && TS.remove) TS.remove(t.id); });
      TS.add({ title: 'Taşınma hazırlığı — kovanları kapat, yüklemeyi planla (ayrılış ' + trD(k.ayrilis) + ')', apiaryId: apiaryId, due: iso(due), priority: 2, note: mark });
    } catch (e) { /* ignore */ }
  }

  /* ---------- Batarya planlayıcı ---------- */
  function pilGecmis(deviceId) {
    var P = global.SuperAriSensorPolling; if (!P || !P.readBatteryStore) return [];
    return P.readBatteryStore().filter(function (x) { return x && String(x.deviceId) === String(deviceId) && x.batteryPct != null && x.at; })
      .map(function (x) { return { t: Date.parse(String(x.at).length <= 16 ? x.at + ':00' : x.at), p: Number(x.batteryPct) }; })
      .filter(function (x) { return isFinite(x.t) && isFinite(x.p); }).sort(function (a, b) { return a.t - b.t; });
  }
  function aralikMs(device) { var P = global.SuperAriSensorPolling; try { return P && P.resolveIntervalMs ? P.resolveIntervalMs(device) : 3600000; } catch (e) { return 3600000; } }
  /* koloni-225: değerler yönetici panelinden (ORS_SENSOR, uzman tahmini); tek model SuperAriPilModel (sunucu da aynısını kullanır) */
  function PM() { return global.SuperAriPilModel; }
  function pilEsik() { var th = T(); try { var E = global.SuperAriEsikler && global.SuperAriEsikler.get(); if (E && E.uyari && E.uyari.dusukPilYuzde > 0) th = Object.assign({}, th, { dusukPilYuzde: E.uyari.dusukPilYuzde }); } catch (e) { /* */ } return th; }
  function kuralAcik(aid) { try { var C = D() && D().colony; return !(C && C.kuralAcik) || C.kuralAcik('pil', aid); } catch (e) { return true; } }
  /** Pilin yetmesi gereken hedef tarih: ayrılış → yoksa bal sezonu sonu + batSezonArtiGun → yoksa yok. */
  function hedefTarih(apiaryId, now) {
    var k = konGet(apiaryId); if (k && k.ayrilis) return { tarih: k.ayrilis, kaynak: 'ayrilis' };
    var ap = D() && D().apiaryById ? D().apiaryById(apiaryId) : null, don = null;
    try { don = ap && ap.ilce ? nektarDonemi({ il: ap.il, ilce: ap.ilce }) : null; } catch (e) { don = null; }
    if (!don || don.durum !== 'var' || !don.ay2) return null;
    now = now || today(); var y = now.getFullYear(), son = new Date(y, don.ay2, 0);
    if (son < now) return null; /* sezon bitti: bilinen hedef yok */
    var a = PM() ? PM().ayar(T()) : { batSezonArtiGun: 7 };
    return { tarih: iso(new Date(son.getTime() + a.batSezonArtiGun * DAY)), kaynak: 'sezon' };
  }
  function pilGorevi(device, r, a) {
    var d = D(), TS = d && d.taskStore; if (!TS || !TS.add || !device) return;
    var mark = '[pil:' + device.id + ']', L = []; try { L = TS.all ? TS.all() : []; } catch (e) { L = []; }
    var eski = L.filter(function (t) { return t && String(t.note || '').indexOf(mark) >= 0 && !t.done; });
    var gerek = r && r.kalanGun != null && r.severity && !device.disabled && kuralAcik(device.apiaryId);
    if (!gerek) { eski.forEach(function (t) { if (TS.remove) TS.remove(t.id); }); return; }
    var bos = new Date(today().getTime() + r.kalanGun * DAY), due = iso(new Date(Math.max(today().getTime(), bos.getTime() - a.batGorevOnceGun * DAY)));
    r.bosTarih = iso(bos); r.gorevTarih = due;
    if (eski.length === 1 && eski[0].due === due) return;
    eski.forEach(function (t) { if (TS.remove) TS.remove(t.id); });
    try { TS.add({ title: 'Pili değiştir / şarj et — ' + (device.name || device.typeLabel || 'Cihaz') + (device.hiveName ? ' (' + device.hiveName + ')' : '') + ' · tahmini bitiş ' + trD(r.bosTarih), apiaryId: device.apiaryId, hiveId: device.hiveId, due: due, priority: r.severity === 'high' ? 1 : 2, note: mark }); } catch (e) { /* */ }
  }
  /** Plan: veri yoksa öneri yok; sıklık yalnız «Onayla» ile değişir (aralikOnayla). */
  function bataryaPlan(device, opts) {
    opts = opts || {}; var th = pilEsik(), M = PM(), a = M.ayar(th), h = opts.gecmis || pilGecmis(device && device.id);
    if (device && device.disabled) return { durum: 'devre_disi', metin: 'Devre dışı' };
    if (!h.length) return { durum: 'veri_yok', metin: 'Veri yok' };
    var gw = !!(device && (device.tip === 'gateway' || device.tip === 'aku_merkez'));
    var ms = opts.aralikMs || aralikMs(device), t = M.tahmin(h, ms, th), son = h[h.length - 1];
    var sessiz = device && device.status && device.status !== 'bagli' && son.p <= a.batBittiPct;
    /* şarj sonrası: önceden düşürülen sıklığa geri dönmeyi öner (yalnız onayla) */
    var cmd = device ? komutlar().filter(function (c) { return c.deviceId === device.id; })[0] : null, geri = null;
    if (t && t.sarj && cmd && cmd.eskiMs && cmd.eskiMs !== ms && Date.parse(cmd.at) < t.sarj.t) geri = cmd.eskiMs;
    if (t && t.hesaplaniyor) {
      var r0 = { durum: 'hesaplaniyor', metin: 'Hesaplanıyor (veri topluyor)', pct: son.p };
      if (geri) { r0.oneriMs = geri; r0.geri = true; r0.soru = 'Pil şarj edildi (%' + Math.round(son.p) + '). Ölçümü yine ' + ARALIK_AD[geri] + ' yapayım mı?'; }
      if (sessiz) r0.bitmis = 'Pil bitmiş olabilir';
      return r0;
    }
    var kalan = t.kalan, hd = opts.kalmaBitis !== undefined ? (opts.kalmaBitis ? { tarih: opts.kalmaBitis, kaynak: 'ayrilis' } : null) : hedefTarih(device && device.apiaryId, opts.now);
    var kalma = hd ? daysTo(hd.tarih, opts.now) : null, hedefGun = kalma, oneri = null;
    if ((hedefGun == null || hedefGun <= 0) && kalan < a.batErkenGun) hedefGun = a.batErkenGun, hd = { kaynak: 'yok' };
    if (hedefGun != null && hedefGun > 0 && kalan < hedefGun) {
      var aday = ARALIK.filter(function (m) { return m > ms; });
      for (var i = 0; i < aday.length; i++) if (t.kalanFor(aday[i]) >= hedefGun) { oneri = aday[i]; break; }
      if (!oneri && aday.length) oneri = aday[aday.length - 1];
    }
    var acik = kuralAcik(device && device.apiaryId);
    var sev = acik ? M.seviye(isFinite(kalan) ? kalan : null, gw, th) : null;
    var r = { durum: 'tamam', pct: Math.round(t.pct), tuketimGun: Math.round(t.rate * 100) / 100, kalanGun: isFinite(kalan) ? Math.floor(kalan) : null, kalmaGun: kalma, hedefKaynak: hd ? hd.kaynak : null, aralikMs: ms, oneriMs: oneri, severity: sev, gateway: gw };
    if (sessiz) r.bitmis = 'Pil bitmiş olabilir';
    var neden = hd && hd.kaynak === 'ayrilis' ? 'Ayrılışa ' + kalma + ' gün var' : (hd && hd.kaynak === 'sezon' ? 'Bal sezonu sonuna göre ' + kalma + ' gün yetmeli' : 'Taşınma tarihi girilmedi');
    if (geri) { r.oneriMs = geri; r.geri = true; r.soru = 'Pil şarj edildi (%' + r.pct + '). Ölçümü yine ' + ARALIK_AD[geri] + ' yapayım mı?'; }
    else if (oneri) {
      var yeter = Math.floor(t.kalanFor(oneri)), tam = yeter >= hedefGun;
      r.soru = 'Pil %' + r.pct + ', mevcut sıklıkla ' + r.kalanGun + ' gün yeter. ' + neden + '. ' + cap(ARALIK_AD[ms] || 'mevcut sıklık') + ' yerine ' + ARALIK_AD[oneri] + ' ölçersem ' + (isFinite(yeter) ? yeter + ' gün' : 'yeterince') + ' yeter' + (tam ? '' : ' (yine de pili şarj etmen gerekecek)') + '. Onaylıyor musun?';
    } else if (kalma != null && r.kalanGun != null && r.kalanGun < kalma) r.not = 'Pil %' + r.pct + ', ' + r.kalanGun + ' gün yeter; en seyrek ölçümle de yetmiyor — pili şarj et veya değiştir.';
    if (!opts.gecmis && device) {
      pilGorevi(device, r, a);
      if (global.SuperAriKritik) { if (sev === 'high') global.SuperAriKritik.ac({ kod: 'batarya_7', anahtar: device.id, apiaryId: device.apiaryId, metin: (device.name || 'Cihaz') + ': pil ' + r.kalanGun + ' gün içinde bitebilir. ' + (gw ? 'Gateway durursa bütün sensörler susar. ' : '') + 'Değiştirmeyi planla.' }); else global.SuperAriKritik.iyilesti('batarya_7', device.id); }
    }
    return r;
  }
  function cap(s) { return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1); }
  /** Onaylanan aralık: ölçüm sıklığı + gateway komut alanı (donanım yoksa «beklemede») + bulut değişiklik kaydı (cihaz_aralik) */
  function aralikOnayla(device, ms, opts) {
    var P = global.SuperAriSensorPolling, onceki = aralikMs(device); if (P && P.setDeviceInterval) P.setDeviceInterval(device.id, ms);
    var gw = false; try { var Dv = global.SuperAriDevices; gw = !!(Dv && Dv.listDevices().some(function (d) { return d.tip === 'gateway' && d.apiaryId === device.apiaryId && d.status === 'bagli'; })); } catch (e) { gw = false; }
    var L = rj(CMD_KEY, []); if (!Array.isArray(L)) L = [];
    var es = L.filter(function (c) { return c.deviceId === device.id; })[0];
    var eskiMs = opts && opts.geri ? null : (es && es.eskiMs ? es.eskiMs : onceki);
    L = L.filter(function (c) { return c.deviceId !== device.id; }); L.push({ deviceId: device.id, apiaryId: device.apiaryId, komut: 'olcum_araligi', aralikMs: ms, eskiMs: eskiMs, durum: gw ? 'gonderildi' : 'beklemede', at: new Date().toISOString() });
    wj(CMD_KEY, L); aralikBulut(device, ms, onceki); return L[L.length - 1];
  }
  var UUIDRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function aralikBulut(device, ms, onceki) {
    var B = global.SuperAriBulut; if (!B || !B.client || device.source === 'demo') return;
    try { Promise.resolve(B.client()).then(function (c) { if (!c) return; return c.rpc('sa_cihaz_aralik_yaz', { p_apiary: UUIDRE.test(String(device.apiaryId || '')) ? String(device.apiaryId) : null, p_device: String(device.id), p_ms: ms, p_onceki: onceki || null, p_cihaz_ad: device.name || device.typeLabel || null, p_kovan_ad: device.hiveName || null }); }).catch(function () { /* */ }); } catch (e) { /* */ }
  }
  /** Bulut → yerel: geri alınan (sa_degisiklik_geri_al) veya başka telefondan onaylanan aralıklar */
  function aralikTazele() {
    var B = global.SuperAriBulut, P = global.SuperAriSensorPolling; if (!B || !B.client || !P || !P.setDeviceInterval) return;
    try { Promise.resolve(B.client()).then(function (c) { if (!c) return; return c.from('cihaz_aralik').select('device_id,aralik_ms').then(function (r) { (r && r.data || []).forEach(function (x) { if (x.aralik_ms) P.setDeviceInterval(x.device_id, Number(x.aralik_ms)); }); }); }).catch(function () { /* */ }); } catch (e) { /* */ }
  }
  try { if (global.addEventListener) { global.addEventListener('load', function () { setTimeout(aralikTazele, 1500); }); global.addEventListener('focus', aralikTazele); } } catch (e) { /* */ }
  function komutlar() { var L = rj(CMD_KEY, []); return Array.isArray(L) ? L : []; }

  /* ---------- Nektar değerlendirmesi (taşınma önerisi) ---------- */
  /** Arılık günlük net tartı artışı (kg/gün): elle + cihaz tartımlarından, kovan ortalaması. */
  function netArtis(apiaryId, gunSay) {
    var d = D(), TE = global.SuperAriTarti, hs = d && d.loadHives ? d.loadHives().filter(function (h) { return String(h.apiaryId) === String(apiaryId); }) : [];
    var byDay = {};
    hs.forEach(function (h) {
      var l = []; try { l = TE && TE.list ? TE.list(h.id) : []; } catch (e) { l = []; }
      l = l.slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      for (var i = 1; i < l.length; i++) {
        var dd = (Date.parse(l[i].at) - Date.parse(l[i - 1].at)) / DAY; if (!(dd > 0) || dd > 4) continue;
        var g = (Number(l[i].kg) - Number(l[i - 1].kg)) / dd, k = String(l[i].at).slice(0, 10);
        (byDay[k] = byDay[k] || []).push(g);
      }
    });
    return Object.keys(byDay).sort().slice(-(gunSay || 14)).map(function (k) { var a = byDay[k]; return { gun: k, kg: Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 100) / 100 }; });
  }
  /** Çiçek takvimi: { ay1, ay2 } nektar dönemi (ilçe). Kaynak: veritabanı (cicek_takvimi), istemci yalnız ilgili ilçeyi alır. */
  function nektarDonemi(ilce) { var C = global.SuperAriCicek; return C && C.donem ? C.donem(ilce) : null; }
  /** Öneri: { durum: 'veri_yok'|'erken'|'ertele'|'uygun', tarih, guven (0–1), metin } */
  function tasinmaOneri(apiaryId, opts) {
    opts = opts || {}; var th = T(), k = konGet(apiaryId); if (!k || !k.ayrilis) return { durum: 'plan_yok', metin: 'Ayrılış tarihi yok' };
    var now = opts.now || today(), kalan = daysTo(k.ayrilis, now);
    if (kalan == null || kalan < 0) return { durum: 'gecti', metin: '' };
    var seri = opts.seri || netArtis(apiaryId, 14), ap = D() && D().apiaryById ? D().apiaryById(apiaryId) : null;
    var don = opts.donem !== undefined ? opts.donem : nektarDonemi(ap && ap.ilce ? { il: ap.il, ilce: ap.ilce } : null);
    if (don && don.durum && don.durum !== 'var') don = null;
    /* k160 rota motoru: eşikler kayıtlardan öğrenilir; öğrenilemezse yalnız ay aralığı */
    var R = global.SuperAriRota, ogr = opts.esik !== undefined ? opts.esik : (R && !opts.seri ? R.esikOgren(apiaryId) : null);
    if (!ogr && !opts.seri) seri = [];
    if (ogr) { th = Object.assign({}, th, { tasNegGun: ogr.gun, tasNetEsikKg: ogr.esikKg }); }
    if (seri.length < (th.tasNegGun || 3) && !don) return { durum: 'veri_yok', metin: 'Veri yok' };
    var n = th.tasNegGun || 3, esik = th.tasNetEsikKg || 0, son = seri.slice(-n);
    var bitiyor = son.length >= n && son.every(function (x) { return x.kg <= esik; });
    var suruyor = son.length >= n && son.every(function (x) { return x.kg > esik; });
    var ayAyrilis = new Date(Date.parse(k.ayrilis + 'T00:00:00')).getMonth() + 1, ayNow = now.getMonth() + 1;
    var takvimBitti = don ? ayNow > don.ay2 : null, takvimSurer = don ? ayAyrilis <= don.ay2 && ayAyrilis >= don.ay1 : null;
    var kanit = (seri.length >= n ? 1 : 0) + (don ? 1 : 0), guven = Math.min(1, 0.35 + 0.25 * kanit + (seri.length >= 7 ? 0.15 : 0) + (kalan <= 10 ? 0.1 : 0));
    if (kalan > (th.tasErkenGun || 30)) return { durum: 'uygun', metin: '' };
    if ((bitiyor && takvimSurer !== true) || (!ogr && !opts.seri && don && don.aktif === false && takvimSurer === false)) {
      var t = iso(new Date(now.getTime() + 2 * DAY)); if (t >= k.ayrilis) return { durum: 'uygun', metin: '' };
      var hd = R && R.yonlendir ? R.yonlendir(apiaryId) : null;
      return { durum: 'erken', tarih: t, guven: guven, hedef: hd && hd.hedef ? hd : null, metin: 'Nektar bitiyor, taşınmayı ' + trD(t) + ' tarihine erkene çek.' + (hd && hd.hedef ? ' ' + hd.metin : '') };
    }
    if ((suruyor && takvimBitti !== true) || (seri.length < n && takvimSurer && kalan <= 10)) {
      var y = don ? iso(new Date(now.getFullYear(), don.ay2, 0)) : iso(new Date(Date.parse(k.ayrilis) + 7 * DAY));
      if (y <= k.ayrilis) return { durum: 'uygun', metin: '' };
      return { durum: 'ertele', tarih: y, guven: guven, metin: 'Nektar devam ediyor, taşınmayı ' + trD(y) + ' tarihine ertele.' };
    }
    return { durum: 'uygun', metin: '' };
  }
  function tasinmaOnayla(apiaryId, tarih) { var r = konSet(apiaryId, { ayrilis: String(tarih).slice(0, 10), oneriOnay: new Date().toISOString() }); try { global.dispatchEvent(new CustomEvent('superari-tasindi', { detail: { apiaryId: apiaryId } })); } catch (e) { /* */ } return r; }

  global.SuperAriPlan2 = { konGet: konGet, konSet: konSet, kalmaBitis: kalmaBitis, bataryaPlan: bataryaPlan, aralikOnayla: aralikOnayla, komutlar: komutlar, netArtis: netArtis, tasinmaOneri: tasinmaOneri, tasinmaOnayla: tasinmaOnayla, ARALIK_AD: ARALIK_AD, pilGecmis: pilGecmis, hedefTarih: hedefTarih, aralikTazele: aralikTazele };
})(typeof window !== 'undefined' ? window : globalThis);
