/* koloni-267 (önizleme): Tartı sayfası kategori döşemeleri — Bal · Hedef · Nektar akımı · Ani düşüş · Kış stoğu · Hasada hazır.
   Hesaplar tek kaynaklardan:
   - Kovandaki bal: bal-agirlik.js › hiveHoneyNow (kovan sayfası Tartı kartıyla aynı).
   - Hedef: bal-hedef.js › arilikHedef (yönetici › Bal hedefi; uzman tahmini).
   - Nektar akımı: son nektarGun günde ortalama günlük artış ≥ ORS_SENSOR.nektarKg (yönetici › Ölçüm kuralları › Ağırlık (tartı) › Nektar).
   - Ani düşüş: uyarılarla birebir — SuperAriKritik.aniKayip (aniKayipKg / aniKayipSaat) ya da colony.genelAgirlikKaybi (genelKayipKat / genelKayipMinKg); yalnız cihaz tartı okumaları.
   - Kış stoğu / Hasada hazır: bal-hedef.js kisStokKg (NBU Fact 19) ve hasatFazlaKg (uzman tahmini); ilaç bekleme süresindeki kovan hasada hazır sayılmaz.
   - koloni-274: bal sezonu (bal-hedef.js › hasatSezonu = colony.ucusSezon; çam balı 30 Kas, arılık başına elle dönem) kapanmış arılıklarda kovandaki bal
     hasat edilmez (kış stoğu): «Bal (tahmin)» rozeti yalnız sezonda olan arılıklar; Hedef ve Hasada hazır yalnız sezondaki kovanlar. */
(function (global) {
  'use strict';
  var KEYS = ['bal', 'hedef', 'nektar', 'ani', 'kis', 'hasat'];
  var LABEL = { bal: 'Bal (tahmin)', hedef: 'Hedef', nektar: 'Nektar akımı', ani: 'Ani düşüş', kis: 'Kış stoğu', hasat: 'Hasada hazır' };
  var ICON = {
    bal: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 11h14l-1.5 15a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z" fill="#f7b731" stroke="#8a6030"/><rect x="8" y="7" width="16" height="4" rx="1.4" fill="#e8c48e" stroke="#8a6030"/></svg>',
    hedef: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="#fff" stroke="#b8860b" stroke-width="2"/><circle cx="16" cy="16" r="6.5" fill="#fde9b0" stroke="#b8860b" stroke-width="2"/><circle cx="16" cy="16" r="2.4" fill="#b8860b"/></svg>',
    nektar: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 23l7-7 5 4 9-10" fill="none" stroke="#2e7d32" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 10h5v5" fill="none" stroke="#2e7d32" stroke-width="2.6" stroke-linecap="round"/></svg>',
    ani: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 9l7 7 5-4 9 10" fill="none" stroke="#c62828" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 22h5v-5" fill="none" stroke="#c62828" stroke-width="2.6" stroke-linecap="round"/></svg>',
    kis: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v24M6 10l20 12M26 10L6 22" stroke="#1565c0" stroke-width="2.2" stroke-linecap="round"/></svg>',
    hasat: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="6" width="18" height="20" rx="2" fill="#e8c48e" stroke="#8a6030"/><path d="M11 12h10M11 16h10M11 20h10" stroke="#b8860b" stroke-width="1.6"/><path d="M19 23l3 3 6-7" fill="none" stroke="#2e7d32" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function num1(n) { return String(Math.round(Number(n) * 10) / 10).replace('.', ','); }
  function kgInt(n) { return Math.round(Number(n)).toLocaleString('tr-TR') + ' kg'; }
  function todayLocal() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /** Kovan başına sınıflandırma + kapsam özeti. hives: kapsamdaki kovanlar. */
  function compute(hives) { var TEb = global.SuperAriTarti; if (TEb && TEb.batch && !compute._in) { compute._in = 1; try { var self = this, args = arguments; return TEb.batch(function () { return compute.apply(self, args); }); } finally { compute._in = 0; } }
    var D = global.SuperAriDemo, BA = global.SuperAriBalAgirlik, BH = global.SuperAriBalHedef, TE = global.SuperAriTarti, K = global.SuperAriKritik;
    var C = D && D.colony, A = BH ? BH.get() : null, live = false;
    try { live = global.localStorage.getItem('superari.workMode') === 'live'; } catch (e) { live = false; }
    var T = {}; try { T = Object.assign({}, (C && C.ORS_SENSOR) || {}, ((C && C.ogulSkor && C.ogulSkor()) || {}).sensor || {}); } catch (e) { T = {}; }
    var nektarKg = Number(T.nektarKg) > 0 ? Number(T.nektarKg) : 1;
    var now = Date.now(), today = todayLocal(), apHedef = {}, wdBy = {}, szBy = {};
    /* koloni-277: bölgesi bilinmeyen arılık (il / rakım / elle dönem yok) «Sezon kapandı» sayılmaz → null (Veri yok) */
    function sezonAcik(apId) { if (!szBy.hasOwnProperty(apId)) { var z = BH && BH.hasatSezonu ? BH.hasatSezonu(apId) : { acik: true }; szBy[apId] = z && z.bilinmiyor ? null : !!(z && z.acik); } return szBy[apId]; }
    function hedefOf(apId) {
      if (apHedef.hasOwnProperty(apId)) return apHedef[apId];
      var ap = null; try { ap = D.apiaryById ? D.apiaryById(apId) : null; } catch (e) { ap = null; }
      apHedef[apId] = ap && BH ? BH.arilikHedef(ap, { ayar: A }) : null; return apHedef[apId];
    }
    function withdrawal(apId) {
      if (wdBy.hasOwnProperty(apId)) return wdBy[apId];
      var l = []; try { l = (D.records && D.records.withdrawalConflicts) ? D.records.withdrawalConflicts(apId, today) : []; } catch (e) { l = []; }
      var m = {}; l.forEach(function (c) { m[String(c.hiveId)] = c; }); wdBy[apId] = m; return m;
    }
    var out = { per: {}, sum: { bal: 0, w: 0, n: 0, lastAt: '', sample: 0, balSz: 0, wSz: 0, nSz: 0, balKs: 0, wKs: 0, nKs: 0, nBil: 0, wBil: 0, tartili: 0, hedefKg: 0, hedefW: 0, hedefN: 0, hedefte: 0, nektar: 0, nektarData: 0, ani: 0, aniData: 0, kis: 0, hasat: 0, wd: 0 }, live: live, A: A, nektarKg: nektarKg };
    var S = out.sum;
    (hives || []).forEach(function (h) {
      var p = { cats: {} }; out.per[String(h.id)] = p; S.n++;
      var acik = sezonAcik(String(h.apiaryId)); p.sezon = acik; if (acik === null) S.nBil++; else if (acik) S.nSz++; else S.nKs++;
      /* koloni-277: tartılı = elle / cihaz tartım kaydı (canlı) ya da örnek ağırlık (demo) — kovan listesiyle aynı kaynak */
      var lw = TE && TE.latest ? TE.latest(h.id) : null; if ((lw && Number(lw.kg) > 0) || (!live && Number(h.weightKg) > 0)) S.tartili++;
      var hn = BA && BA.hiveHoneyNow ? BA.hiveHoneyNow(h, { live: live }) : null;
      if (hn && !hn.none) {
        p.netKg = hn.netKg; p.source = hn.source; S.w++; S.bal += hn.netKg; p.cats.bal = true;
        if (hn.source === 'ornek') S.sample++;
        if (acik === null) S.wBil++; else if (acik) { S.balSz += hn.netKg; S.wSz++; } else { S.balKs += hn.netKg; S.wKs++; p.kisStogu = true; }
        if (hn.at && String(hn.at) > S.lastAt) S.lastAt = String(hn.at);
        var hd = hedefOf(String(h.apiaryId));
        if (acik && hd && hd.perHiveKg > 0) { S.hedefKg += hd.perHiveKg; S.hedefW += hn.netKg; S.hedefN++; p.hedefKg = hd.perHiveKg; if (hn.netKg >= hd.perHiveKg) { p.cats.hedef = true; S.hedefte++; } }
        if (A) {
          if (hn.netKg < A.kisStokKg) { p.cats.kis = true; S.kis++; }
          else if (acik && hn.netKg >= A.kisStokKg + A.hasatFazlaKg) {
            if (withdrawal(String(h.apiaryId))[String(h.id)]) { p.wd = true; S.wd++; }
            else { p.cats.hasat = true; S.hasat++; }
          }
        }
      }
      /* Nektar akımı: canlıda tartım kayıtlarından (düzeltilmiş net eğri), demoda örnek günlük değişim (deltaKg) */
      var gain = null;
      if (live) {
        var se = TE && TE.series ? TE.series(h.id, A ? A.nektarGun : 7) : [];
        if (se.length >= 2) {
          var a = se[0], b = se[se.length - 1], days = (Date.parse(String(b.at).length <= 16 ? b.at + ':00' : b.at) - Date.parse(String(a.at).length <= 16 ? a.at + ':00' : a.at)) / 86400000;
          if (days >= 0.8) gain = (Number(b.net) - Number(a.net)) / days;
        }
      } else if (isFinite(Number(h.deltaKg))) gain = Number(h.deltaKg);
      if (gain != null) { S.nektarData++; p.gain = gain; if (gain >= nektarKg) { p.cats.nektar = true; S.nektar++; } }
      /* Ani düşüş: uyarılarla aynı fonksiyonlar, yalnız cihaz tartı okumaları */
      try {
        var hasDev = !(TE && TE.scaleDevice) || !!TE.scaleDevice(h.id);
        var SH = hasDev && C && C.hiveSens ? C.hiveSens(h.id, now) : null, W = SH && SH.tarti ? SH.tarti : [];
        if (W.length >= 2) {
          S.aniData++;
          var TL = W.map(function (x) { return { t: x.t, kg: Number(x.kg != null ? x.kg : x.deger) }; });
          var ani = !!(K && K.aniKayip && K.aniKayip(TL));
          var gen = !!(C.genelAgirlikKaybi && C.genelAgirlikKaybi(SH, Object.assign({}, ((C.ogulSkor && C.ogulSkor()) || {}).sensor || {}), now));
          if (ani || gen) { p.cats.ani = true; p.aniNeden = ani ? 'ani' : 'genel'; S.ani++; }
        }
      } catch (eA) { /* yoksay */ }
    });
    S.bal = Math.round(S.bal * 10) / 10; S.balSz = Math.round(S.balSz * 10) / 10; S.balKs = Math.round(S.balKs * 10) / 10;
    return out;
  }
  function agoTxt(at) {
    if (!at) return '';
    var d = String(at).slice(0, 10), t = todayLocal();
    var n = Math.round((Date.parse(t) - Date.parse(d)) / 86400000);
    return n <= 0 ? 'bugün' : (n === 1 ? 'dün' : n + ' gün önce');
  }
  /** Döşeme bilgileri: { key, label, badge, tone, sub, aria, empty } */
  function tiles(r) {
    var S = r.sum, A = r.A || {}, VY = 'Veri yok';
    var o = {};
    var ornek = S.sample ? ' · örnek' : (S.lastAt ? ' · son tartım ' + agoTxt(S.lastAt) : '');
    /* koloni-277: eşikler (kg, günde artış) kullanıcıya gösterilmez — yalnız yönetici panelinde */
    var tartiliTxt = function (w, n) { return w + '/' + n + ' tartılı'; };
    /* koloni-278: Bal ve Hedef kapsamı gösterir («X/N kovan tartılı»); tartılı pay yönetici › Bal hedefi › kapsamAzYuzde altındaysa «az tartım»
       (eşik uzman tahmini, kullanıcıya gösterilmez). Tek tartılı kovanın balı arılığın balı gibi görünmesin. */
    var azYuzde = Number(A.kapsamAzYuzde) >= 0 ? Number(A.kapsamAzYuzde) : 50;
    var az = function (w, n) { return n > 0 && w * 100 < n * azYuzde; };
    var karisik = (S.nSz && (S.nKs || S.nBil)) ? 'sezonda ' : '';
    var kapsamTxt = function (w, n, onek) { return (onek || '') + w + '/' + n + ' kovan tartılı' + (az(w, n) ? ' · az\u00a0tartım' : ''); };
    if (S.nSz) o.bal = S.wSz ? { badge: '~' + kgInt(S.balSz), tone: az(S.wSz, S.nSz) ? 'tan' : 'yellow', sub: kapsamTxt(S.wSz, S.nSz, karisik), az: az(S.wSz, S.nSz), aria2: 'sezondaki arılıklar, ' + S.wSz + ' tartılı kovanın toplamı' + ornek } : { badge: VY, tone: 'gray', sub: 'sezonda · ' + tartiliTxt(0, S.nSz), empty: true };
    else if (S.nKs) o.bal = S.wKs ? { badge: '~' + kgInt(S.balKs), tone: 'tan', sub: 'kış stoğu · ' + S.wKs + '/' + S.nKs + ' tartılı', az: az(S.wKs, S.nKs), aria2: 'sezon kapandı, ' + S.wKs + ' tartılı kovanın toplamı' + ornek } : { badge: VY, tone: 'gray', sub: 'sezon kapandı · ' + tartiliTxt(0, S.nKs), empty: true };
    else if (S.nBil) o.bal = { badge: VY, tone: 'gray', sub: 'bölge bilinmiyor', empty: true };
    else o.bal = { badge: VY, tone: 'gray', sub: 'kovan yok', empty: true };
    var kapali = !S.nSz && !S.nBil && S.nKs, bilinmez = !S.nSz && S.nBil;
    /* koloni-278: Hedef % = tartılı (sezondaki) kovanların net balı ÷ yalnız o kovanların hedefi; alt yazıda kapsam X/N kovan */
    o.hedef = S.hedefKg > 0 ? { badge: '%' + Math.round(S.hedefW / S.hedefKg * 100), tone: az(S.hedefN, S.nSz) ? 'tan' : 'yellow', sub: S.hedefN + '/' + S.nSz + ' kovan · ' + (az(S.hedefN, S.nSz) ? 'az\u00a0tartım' : S.hedefte + '\u00a0hedefte'), az: az(S.hedefN, S.nSz), aria2: S.hedefte + ' kovan hedefte, yalnız tartılı kovanların hedefi' } : (kapali ? { badge: 'Sezon kapandı', tone: 'gray', sub: 'bu arılıkta sezon bitti', empty: true } : bilinmez ? { badge: VY, tone: 'gray', sub: 'bölge bilinmiyor', empty: true } : { badge: VY, tone: 'gray', sub: 'tartı / hedef yok', empty: true });
    o.nektar = S.nektarData ? { badge: S.nektar + ' kovan', tone: S.nektar ? 'green' : 'gray', sub: S.nektar ? 'ağırlık artıyor' : 'akım yok' } : { badge: VY, tone: 'gray', sub: 'tartım az', empty: true };
    o.ani = S.aniData ? { badge: S.ani + ' kovan', tone: S.ani ? 'red' : 'gray', sub: S.ani ? 'yağma / oğul şüphesi' : 'düşüş yok' } : { badge: VY, tone: 'gray', sub: 'tartı cihazı yok', empty: true };
    /* koloni-278: Kış stoğu da diğer döşemeler gibi sayı gösterir (önceden «✓», iPhone'da ＋ düğmesinin altında kalıyordu) */
    o.kis = S.w ? { badge: S.kis + ' kovan', tone: S.kis ? 'orange' : 'gray', sub: 'stok yetersiz', aria2: S.kis ? '' : 'tüm tartılı kovanlarda stok yeterli' } : { badge: VY, tone: 'gray', sub: 'elle / cihaz tartım yok', empty: true };
    o.hasat = kapali ? { badge: 'Sezon kapandı', tone: 'gray', sub: 'kış stoğu hasat edilmez', empty: true } : S.wSz ? { badge: S.hasat + ' kovan', tone: S.hasat ? 'green' : 'gray', sub: S.wd ? S.wd + ' ilaç beklemede' : 'hasat edilebilir' } : bilinmez ? { badge: VY, tone: 'gray', sub: 'bölge bilinmiyor', empty: true } : { badge: VY, tone: 'gray', sub: 'tartı yok', empty: true };
    return KEYS.map(function (k) { var t = o[k]; t.key = k; t.label = LABEL[k]; t.icon = ICON[k]; t.aria = LABEL[k] + ', ' + t.badge + ', ' + t.sub + (t.aria2 ? ', ' + t.aria2 : ''); return t; });
  }
  /** koloni-278: Bal seçiliyken kovan kutucuğu rozeti net bal (brüt değil) */
  function hiveNetBadge(p) { return p && p.netKg != null ? '~' + num1(p.netKg) + ' kg' : null; }
  function hiveBadge(p) {
    if (!p || p.netKg == null) return null;
    return '~' + num1(p.netKg) + (p.kisStogu ? ' kg kış stoğu' : ' kg bal');
  }
  /** koloni-277: Tartı sayfası başlığı ile döşemeler aynı tartım kaynağı (elle + cihaz; demoda örnek ağırlık) */
  function weighedCount(r) { return r && r.sum ? r.sum.tartili : 0; }
  global.SuperAriTartiDoseme = { weighedCount: weighedCount, hiveNetBadge: hiveNetBadge, KEYS: KEYS, LABEL: LABEL, compute: compute, tiles: tiles, hiveBadge: hiveBadge, agoTxt: agoTxt };
})(typeof window !== 'undefined' ? window : globalThis);
