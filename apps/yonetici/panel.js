/* k130: Oğul skorları (yalnız yönetici) — Supabase public.ogul_skor_ayar · kaydet: sa_ogul_skor_kaydet (onaylı). */
(function () {
  var sec = document.getElementById('osSec'), D = window.SuperAriDemo, B = window.SuperAriBulut;
  if (!sec || !D || !D.colony || !D.colony.ogulSkorDefaults || !B) return;
  var C = D.colony, MIG = 'supabase/migrations/20261013190000_ogul_skor_ayar.sql';
  var WL = { genetik: 'Genetik (w<sub>g</sub>)', sikisiklik: 'Sıkışıklık (w<sub>s</sub>)', mevsim: 'Mevsim (w<sub>m</sub>)', anaYasi: 'Ana yaşı (w<sub>a</sub>)' };
  var cur = C.ogulSkor(), base = JSON.stringify(cur);
  function stat(t) { document.getElementById('osStat').innerHTML = t; }
  function row(lb, gk, gv, k) { return '<label><span>' + lb + '</span><span style="display:flex;gap:.35rem;align-items:center;"><small>Genetik</small>' + inp(gk, gv, '1', 100) + (k ? '<small>piping süresi (dk)</small>' + inp('piping.' + k, pg[k] != null ? pg[k] : 1, 'any', 600) : '') + '</span></label>'; }
  var pg = {};
  var AYS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function md(x) { var p = String(x || '').split('-'); return p.length === 2 ? Number(p[1]) + ' ' + AYS[Number(p[0]) - 1] : '—'; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* k177: Hz alt/üst, dB Uyarı/Kritik çiftleri tek satırda. Dönüş: eş anahtar | false (ikinci üye, atla) | null */
  function esPair(k, S) {
    if (k === 'saglikUyariDb' && 'saglikKritikDb' in S) return 'saglikKritikDb'; if (k === 'saglikKritikDb' && 'saglikUyariDb' in S) return false;
    var m = /^(.*)Min(Ms|Kg)?$/.exec(k); if (m && (m[1] + 'Max' + (m[2] || '')) in S) return m[1] + 'Max' + (m[2] || '');
    var x = /^(.*)Max(Ms|Kg)?$/.exec(k); if (x && (x[1] + 'Min' + (x[2] || '')) in S) return false; return null;
  }
  function esPairAd(ad, pk) { return pk === 'saglikKritikDb' ? 'Kovan sağlığı: taban sapması (dB, uzman tahmini)' : String(ad).replace(/ (alt|en kısa)( frekans| sınırı)?/, '').replace(/ alt /, ' '); }
  function inp(name, v, step, max) { return '<input name="' + name + '" type="number" inputmode="decimal" min="0" max="' + max + '" step="' + step + '" value="' + v + '">'; }
  function paint(o) {
    pg = o.piping || {};
    var A = C.GENETIK_ADLAR, h = '<fieldset><legend>Ağırlıklar (toplam 1)</legend>' + Object.keys(WL).map(function (k) { return '<label><span>' + WL[k] + '</span>' + inp('w.' + k, o.weights[k], '0.01', 1) + '</label>'; }).join('') + '</fieldset>' + ebAlan(o);
    h += '<fieldset><legend>Saf hatlar — Genetik</legend>' + Object.keys(o.saf).map(function (k) { return row(A[k] || k, 'saf.' + k, o.saf[k], k); }).join('') + '</fieldset>';
    var iki = Object.keys(o.melez).filter(function (k) { return k.split('+').length === 2; }), uc = Object.keys(o.melez).filter(function (k) { return k.split('+').length > 2; });
    h += '<fieldset><legend>İkili melezler — Genetik</legend>' + iki.map(function (k) { return row(A[k] || k, 'melez.' + k, o.melez[k], k); }).join('') +
      '<label><span>Buckfast melezleri (diğer)</span>' + inp('buckfastIkili', o.buckfastIkili, '1', 100) + '</label></fieldset>';
    h += '<fieldset><legend>Üçlü melezler — Genetik</legend>' + uc.map(function (k) { return row(A[k] || k, 'melez.' + k, o.melez[k], k); }).join('') + '</fieldset>';
    var SA = C.ORS_SENSOR_ADLAR || {};
    h += '<fieldset><legend>Sensörlü mod — eşikler</legend><p class="fe-sub" style="margin:.2rem 0;">Kovanda sensör verisi varsa: piping (Hz aralığı + ritmik desen + kesintisiz süre, üçü birden) → 100; ısı / nem tek başına alarm vermez, yalnız Sıkışıklığa stres eki; sert kilo artışı + arı yoğunluğu zirvede → Sıkışıklık 100; günlük kilo artışı nektar eşiğini geçerse Mevsim 100. Sensör yoksa formül aynen kalır.</p>' +
      Object.keys(o.sensor || {}).map(function (k) { if (k === 'nemHigh' || k === 'kirecNemYuksek') return ''; /* koloni-205: nem tek kaynak (Nem kademeleri) */ var pk = esPair(k, o.sensor); if (pk === false) return ''; if (pk) { var t = pk === 'saglikKritikDb' ? ['Uyarı', 'Kritik'] : ['alt', 'üst']; return '<label class="os-pair"><span>' + esPairAd(SA[k] || k, pk) + '</span><span class="os-pv"><small>' + t[0] + '</small>' + inp('sensor.' + k, o.sensor[k], 'any', 100000) + '<small>' + t[1] + '</small>' + inp('sensor.' + pk, o.sensor[pk], 'any', 100000) + '</span></label>'; } if (k === 'suUzakMod') return '<label><span>Su çok uzaksa (uzman tahmini)</span><select name="sensor.suUzakMod"><option value="alta"' + (o.sensor[k] !== 'cikar' ? ' selected' : '') + '>En alta indir</option><option value="cikar"' + (o.sensor[k] === 'cikar' ? ' selected' : '') + '>Listeden çıkar</option></select></label>'; return '<label><span>' + (SA[k] || k) + '</span>' + inp('sensor.' + k, o.sensor[k], 'any', 100000) + '</label>'; }).join('') + '</fieldset>';
    h += '<fieldset><legend>Taşınma / rota motoru — formül</legend><p class="fe-sub" style="margin:.2rem 0;">' +
      'rota_puan(ilçe) = 100 × [wH·(H / Hmax) + wT·(T / Tmax)] ÷ (var olan bileşenlerin ağırlık toplamı). H: o ilçedeki arılıkların kovan başına yıllık ortalama hasatı (kg). ' +
      'T: günlük net tartı artışının kayan ortalamasının (pencere = rotaPencere gün) en yüksek değeri. Hmax/Tmax: kullanıcının kayıtlı ilçeleri arasındaki en yüksek değer. Geçmiş yoksa puan üretilmez ("Henüz kayıt yok"). ' +
      'Gün eşikleri: en az rotaMinGun günlük tartı kaydı varsa pozitif kayan ortalamaların 20. yüzdeliğinin ¼\'ü "artış bitti" eşiği, eşik altı serilerin medyan uzunluğu (2–7) gün eşiği olur; kayıt yetersizse yalnız resmi ay aralığı kullanılır. ' +
      'Yönlendirme: artış bitince önce kullanıcının kayıtlı arılıkları (artışı süren / ayı çiçeklenme aralığında), yoksa güncel ayı resmi aralıkta olan harici ilçe önerilir; karar onay kartıyla. Rakım: arılık koordinatından Open-Meteo Elevation API. ' +
      'Çiçeklenme takvimi kaynağı: Cınbırtoğlu (haz.), İl ve İlçelere Göre Çiçeklenme Dönemi, TAGEM Ordu Arıcılık Araştırma Enstitüsü, 2022 (AAEM/51). Ağırlıklar ve eşikler uzman tahminidir (Sensörlü mod — eşikler bölümünde ayarlanır).</p>' +
      '<p class="fe-sub" id="takvimEksik" style="margin:.2rem 0;">Takvim istekleri yükleniyor…</p></fieldset>';
    /* k175: talep edilen iller ve durumları (bekliyor / hazırlandı / kaynak bekleniyor); kaynak yalnız burada */
    setTimeout(function () { var el = document.getElementById('takvimEksik'), B = window.SuperAriBulut; if (!el) return; if (!B || !B.client) { el.textContent = 'Takvim istekleri: bulut yok.'; return; }
      var DL = { bekliyor: 'bekliyor', hazirlandi: 'hazırlandı', kaynak_yok: 'kaynak bekleniyor' };
      Promise.resolve(B.client()).then(function (c) { return c.rpc('sa_takvim_talepleri'); }).then(function (r) {
        if (r.error) { el.textContent = 'Takvim istekleri alınamadı: ' + (/42501|Yalnız yönetici/.test(r.error.message || '') ? 'yönetici değil.' : (r.error.message || 'hata')); return; }
        var L = r.data || []; if (!L.length) { el.textContent = 'Talep edilen il yok. (Takvimi olan iller: uygulama verisi + Supabase cicek_takvimi)'; return; }
        el.innerHTML = '<b>Talep edilen iller</b><table class="fe-tbl"><tr><th>İl</th><th>Durum</th><th>İstek</th><th>Son istek</th><th>Not / kaynak</th></tr>' + L.map(function (x) {
          return '<tr><td>' + esc(x.il) + '</td><td><b>' + esc(DL[x.durum] || x.durum) + '</b></td><td>' + esc(x.istek_sayisi) + '</td><td>' + esc(new Date(x.son_istek).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })) + '</td><td><small>' + esc(x.kaynak_not || '') + (x.kaynak ? ' · ' + esc(x.kaynak) : '') + '</small></td></tr>'; }).join('') + '</table>';
      }).catch(function () { el.textContent = 'Takvim istekleri alınamadı (bulut kapalı ya da oturum yok).'; }); }, 0);
    var aps = []; try { aps = (D.loadApiaries ? D.loadApiaries() : []) || []; } catch (e) { aps = []; }
    var yr = new Date().getFullYear(), dn = o.donem || {};
    h += '<fieldset><legend>Arılık oğul dönemleri</legend><p class="fe-sub" style="margin:.2rem 0;">Otomatik dönem bölge profilinden (rakım / il) hesaplanır. Tarih aralığı seçilirse ORS Mevsim bu dönemi kullanır (her yıl aynı gün/ay).</p>' +
      (aps.length ? aps.map(function (a) {
        var au = C.autoSwarmWindow(a.id), cp = dn[a.id] && dn[a.id].isCustomPeriod ? dn[a.id] : null;
        return '<div class="os-dn" data-ap="' + esc(a.id) + '" data-custom="' + (cp ? '1' : '0') + '"><b>' + esc(a.name || a.place || a.id) + '</b>' +
          '<small class="fe-meta">Otomatik: ' + esc(au.label) + ' · ' + md(au.from) + ' – ' + md(au.to) + (cp ? ' · <b>elle: ' + md(cp.from) + ' – ' + md(cp.to) + '</b>' : '') + '</small>' +
          '<span class="os-dr"><span class="rng"><input type="date" name="dn-from" value="' + yr + '-' + (cp || au).from + '"><span class="rng-a">–</span><input type="date" name="dn-to" value="' + yr + '-' + (cp || au).to + '"></span> ' +
          '<button type="button" class="btn secondary" data-dn-reset' + (cp ? '' : ' disabled') + '>Otomatik hesaplamaya dön</button></span></div>';
      }).join('') : '<p class="fe-empty">Arılık yok.</p>') + '</fieldset>';
    /* koloni-249: arılık başına uçuş mevsimi (Hava › uçuş etiketi). Otomatik: bölge profili (Ölçüm kuralları › Uçuş havası › Mevsim). */
    var us = o.ucusSezon || {};
    h += '<fieldset><legend>Arılık uçuş mevsimi</legend><p class="fe-sub" style="margin:.2rem 0;">Mevsim dışında Hava sayfası sıcak günde «Uçuş uygun» demez; kuru ve yeterince sıcak günde «Temizlik uçuşu olabilir», değilse «Uçuş yok» yazar. Otomatik dönem bölge profilinden (uzman tahmini).</p>' +
      (aps.length ? aps.map(function (a) {
        var au = C.ucusSezon ? C.ucusSezon(a.id, null, true) : null, cp = us[a.id] && us[a.id].from ? us[a.id] : null; if (!au) return '';
        return '<div class="os-us" data-ap="' + esc(a.id) + '" data-custom="' + (cp ? '1' : '0') + '"><b>' + esc(a.name || a.place || a.id) + '</b>' +
          '<small class="fe-meta">' + 'Otomatik: ' + esc(au.profileLabel || '') + ' · ' + md(au.from) + ' – ' + md(au.to) + (cp ? ' · <b>elle: ' + md(cp.from) + ' – ' + md(cp.to) + '</b>' : '') + '</small>' +
          '<span class="os-dr"><span class="rng"><input type="date" name="us-from" value="' + yr + '-' + (cp || au).from + '"><span class="rng-a">–</span><input type="date" name="us-to" value="' + yr + '-' + (cp || au).to + '"></span> ' +
          '<button type="button" class="btn secondary" data-us-reset' + (cp ? '' : ' disabled') + '>Otomatik hesaplamaya dön</button></span></div>';
      }).join('') : '<p class="fe-empty">Arılık yok.</p>') + '</fieldset>';
    h += '<fieldset><legend>Bilinmeyen</legend><label><span>Tabloda olmayan melez / ırk</span>' + inp('bilinmeyen', o.bilinmeyen, '1', 100) + '</label></fieldset>';
    document.getElementById('osForm').innerHTML = h;
  }
  function read() {
    var o = { weights: {}, saf: {}, melez: {}, sensor: {}, piping: {} }, bad = [];
    o.donem = {};
    [].forEach.call(document.querySelectorAll('#osForm .os-dn'), function (row) {
      if (row.getAttribute('data-custom') !== '1') return;
      var f = row.querySelector('[name=dn-from]').value.slice(5), t = row.querySelector('[name=dn-to]').value.slice(5);
      if (!/^\d\d-\d\d$/.test(f) || !/^\d\d-\d\d$/.test(t) || f > t) { bad.push(row.querySelector('[name=dn-from]')); return; }
      o.donem[row.getAttribute('data-ap')] = { from: f, to: t, isCustomPeriod: true };
    });
    o.ucusSezon = {};
    [].forEach.call(document.querySelectorAll('#osForm .os-us'), function (row) {
      if (row.getAttribute('data-custom') !== '1') return;
      var f = row.querySelector('[name=us-from]').value.slice(5), t = row.querySelector('[name=us-to]').value.slice(5);
      if (!/^\d\d-\d\d$/.test(f) || !/^\d\d-\d\d$/.test(t) || f >= t) { bad.push(row.querySelector('[name=us-from]')); return; }
      o.ucusSezon[row.getAttribute('data-ap')] = { from: f, to: t };
    });
    [].forEach.call(document.querySelectorAll('#osForm input:not([type=date]):not([type=checkbox])'), function (el) {
      var v = Number(String(el.value).replace(',', '.')), n = el.name.split('.'), mx = n[0] === 'w' ? 1 : (n[0] === 'sensor' ? 100000 : (n[0] === 'piping' ? 600 : 100));
      if (!isFinite(v) || v < 0 || v > mx || el.value === '') bad.push(el);
      if (n[0] === 'w') o.weights[n[1]] = v; else if (n.length === 2) o[n[0]][n[1]] = v; else o[n[0]] = v;
    });
    o.ekipBildirim = [].map.call(document.querySelectorAll('#osForm input[name=eb]:checked'), function (x) { return x.value; });
    var sm = document.querySelector('#osForm select[name="sensor.suUzakMod"]'); if (sm) o.sensor.suUzakMod = sm.value;
    return { o: o, bad: bad };
  }
  document.getElementById('osForm').addEventListener('input', function (e) {
    if (e.target.tagName !== 'INPUT') return; e.target.classList.add('chg');
    var row = e.target.closest('.os-dn'); if (row) { row.setAttribute('data-custom', '1'); row.querySelector('[data-dn-reset]').disabled = false; }
    var ur = e.target.closest('.os-us'); if (ur) { ur.setAttribute('data-custom', '1'); ur.querySelector('[data-us-reset]').disabled = false; }
  });
  document.getElementById('osForm').addEventListener('click', function (e) {
    var ub = e.target.closest('[data-us-reset]');
    if (ub) { var ur = ub.closest('.os-us'), y0 = new Date().getFullYear(), au0 = C.ucusSezon(ur.getAttribute('data-ap'), null, true);
      ur.setAttribute('data-custom', '0'); ur.querySelector('[name=us-from]').value = y0 + '-' + au0.from; ur.querySelector('[name=us-to]').value = y0 + '-' + au0.to;
      ur.querySelector('[name=us-from]').classList.add('chg'); ub.disabled = true; stat('Otomatik uçuş mevsimine dönüldü — kaydedince geçerli olur.'); return; }
    var b = e.target.closest('[data-dn-reset]'); if (!b) return;
    var row = b.closest('.os-dn'), au = C.autoSwarmWindow(row.getAttribute('data-ap')), yr = new Date().getFullYear();
    row.setAttribute('data-custom', '0'); /* isCustomPeriod false → kayıtta silinir */
    row.querySelector('[name=dn-from]').value = yr + '-' + au.from; row.querySelector('[name=dn-to]').value = yr + '-' + au.to;
    row.querySelector('[name=dn-from]').classList.add('chg'); b.disabled = true;
    stat('Otomatik döneme dönüldü — kaydedince geçerli olur.');
  });
  document.getElementById('osReset').addEventListener('click', function () { paint(C.ogulSkorDefaults()); [].forEach.call(document.querySelectorAll('#osForm input'), function (el) { el.classList.add('chg'); }); stat('Varsayılanlar yüklendi — kaydetmeden geçerli olmaz.'); });
  document.getElementById('osSave').addEventListener('click', function () {
    var r = read();
    if (r.bad.length) { r.bad[0].focus(); stat('<b>Geçersiz değer</b>: puanlar 0–100, ağırlıklar 0–1, eşikler 0 veya üstü olmalı.'); return; }
    var w = r.o.weights, sum = w.genetik + w.sikisiklik + w.mevsim + w.anaYasi;
    if (Math.abs(sum - 1) > 0.001) { stat('<b>Ağırlıkların toplamı 1 olmalı</b> (şu an ' + Math.round(sum * 1000) / 1000 + ').'); return; }
    if (C.nemSiraGecerli && !C.nemSiraGecerli(Object.assign({}, C.ogulSkor().sensor, r.o.sensor))) { stat('<b>Nem eşikleri sırası hatalı.</b> Kritik &lt; erken uyarı (normal alt) &lt; normal üst ≤ kireç olmalı ve değerler %0–100 arasında kalmalı.'); return; }
    var nChg = document.querySelectorAll('#osForm input.chg').length;
    if (JSON.stringify(C.ogulSkorMerge(r.o)) === base) { stat('Değişiklik yok.'); return; }
    if (!window.confirm('Taslak yayınlansın mı?\n' + nChg + ' alan değişti. Yeni ayar sürümü tüm uygulamalarda sessizce uygulanır (ORS, Sıkışıklık, rota, batarya, Varroa yeniden hesaplanır).')) { stat('Kaydedilmedi.'); return; }
    stat('Kaydediliyor…');
    B.client().then(function (c) { return c.rpc('sa_ayar_yayinla', { p_data: r.o, p_not: nChg + ' alan' }); }).then(function (res) {
      if (res.error) { var m = String(res.error.message || '') + ' ' + String(res.error.code || ''); stat(/PGRST202|42883|does not exist|schema cache/i.test(m) ? 'Veritabanı güncellemesi gerekli (' + MIG + ').' : 'Kaydedilemedi: ' + (res.error.message || 'hata')); return; }
      C.ogulSkorSet(r.o, { at: new Date().toISOString() }); cur = C.ogulSkor(); base = JSON.stringify(cur); paint(cur);
      stat('Yayınlandı · sürüm ' + res.data + '.'); surumGoster();
      try { window.dispatchEvent(new CustomEvent('sa-ayar-degisti', { detail: { from: 'ogul' } })); } catch (x) {}
    }).catch(function () { stat('Kaydedilemedi (bağlantı yok olabilir).'); });
  });
  /* koloni-196: Ölçüm kuralları / Cihazlar kaydedince yenile (tek kaynak) */
  window.addEventListener('sa-ayar-degisti', function (e) { if (e.detail && e.detail.from === 'ogul') return; cur = C.ogulSkor(); base = JSON.stringify(cur); paint(cur); });
  /* k161 EK12: ekibe bildirim gidecek uyarılar (ilk oluşum + kapatma) */
  function ebAlan(o) {
    var K = window.SuperAriKritik, AD = (K && K.AD) || {}, sec = o.ekipBildirim || [];
    return '<fieldset><legend>Ekip bildirimi gönderilen uyarılar</legend><p class="fe-sub">İşaretli uyarıların ilk oluşumu ve “[Kişi] kontrol etti, kapattı” bildirimi tüm ekibe gider. Diğerlerinde yalnız kartta “Kapatan: kişi, saat” yazar. Oğul riski orta: yalnız Düşük→Orta ilk geçişte, kovan başına günde en çok bir.</p>' +
      Object.keys(AD).map(function (k) { return '<label style="display:block;"><input type="checkbox" name="eb" value="' + esc(k) + '"' + (sec.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(AD[k][0]) + '</label>'; }).join('') + '</fieldset>';
  }
  /* k161 EK10: son yayın + sürüm geçmişi + geri alma */
  function surumGoster() {
    var el = document.getElementById('osSurum'); if (!el) { el = document.createElement('div'); el.id = 'osSurum'; el.className = 'fe-sub'; var bt = document.getElementById('osSave'); bt.parentNode.parentNode.insertBefore(el, bt.parentNode.nextSibling); }
    B.client().then(function (c) { return c.from('ayar_surumleri').select('surum,at,yayinlayan_eposta,not_,fark,geri_alinan').order('surum', { ascending: false }).limit(10); }).then(function (r) {
      var L = (r && r.data) || []; if (!L.length) { el.textContent = 'Henüz yayın yok.'; return; }
      var f = function (t) { return new Date(t).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }); };
      el.innerHTML = '<p><b>Son yayın: ' + esc(f(L[0].at)) + ' · sürüm ' + L[0].surum + '</b></p><details><summary>Değişiklik günlüğü</summary>' + L.map(function (x, i) {
        return '<div style="margin:.3rem 0;">#' + x.surum + ' · ' + esc(f(x.at)) + ' · ' + esc(x.yayinlayan_eposta || '') + ' · ' + esc(x.not_ || '') + (x.fark ? ' · değişen: ' + esc(Object.keys(x.fark).join(', ') || '—') : '') +
          (i > 0 ? ' <button type="button" class="btn secondary" data-geri="' + x.surum + '">Bu sürüme geri al</button>' : '') + '</div>';
      }).join('') + '</details>';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-geri]'); if (!b) return;
    var v = Number(b.getAttribute('data-geri'));
    if (!window.confirm('Sürüm ' + v + ' değerleri yeni sürüm olarak yayınlansın mı?')) return;
    B.client().then(function (c) { return c.rpc('sa_ayar_geri_al', { p_surum: v }); }).then(function (r) { if (r.error) { stat('Geri alınamadı.'); return; } C.ogulSkorSync && C.ogulSkorSync(); stat('Geri alındı · sürüm ' + r.data + '.'); surumGoster(); });
  });
  /* Yalnız yöneticiye göster: oturum + sa_is_admin() */
  B.loadConfig().then(function (cfg) {
    if (!cfg || !cfg.enabled) return;
    return B.session().then(function (s) {
      if (!s) return;
      return B.client().then(function (c) { return c.rpc('sa_is_admin'); }).then(function (r) {
        if (r.error || r.data !== true) return;
        sec.hidden = false; paint(cur); surumGoster();
        return C.ogulSkorSync().then(function (ch) { if (ch) { cur = C.ogulSkor(); base = JSON.stringify(cur); paint(cur); } stat(ch ? 'Buluttaki son kayıt yüklendi.' : ''); });
      });
    });
  }).catch(function () {});
})();

/* Fiyatı bulunamayan kalemler: Alım talebinde alınacak olup fiyatı olmayan kalemler (kullanıcıya uyarı gösterilmez).
   Bulut: sa_fiyat_eksik_list (yalnız yönetici) · Çevrimdışı yedek: bu cihazın superari.stok.fiyatsiz.v1 kaydı.
   Tekilleştirilmiş (kalem anahtarı), en yeni önce. Kaynak dosyasında şimdi fiyatı olanlar işaretlenir. */
(function () {
  'use strict';
  var MIG = 'supabase/migrations/20261003230000_fiyat_eksik.sql';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dt(iso) { var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function money(v) { return Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺'; }
  function local() {
    try { var m = JSON.parse(localStorage.getItem('superari.stok.fiyatsiz.v1') || 'null'); var it = m && m.items || {};
      return Object.keys(it).map(function (k) { var e = it[k]; return { key: k, name: e.name, unit: e.unit, last_scope: e.scope, first_seen: e.first, last_seen: e.last, seen_count: e.count, local: true }; });
    } catch (e) { return []; }
  }
  function cloud() {
    var B = window.SuperAriBulut; if (!B) return Promise.resolve({ msg: 'Bulut modülü yüklenemedi.' });
    return B.loadConfig().then(function (cfg) {
      if (!cfg || !cfg.enabled) return { msg: 'Bulut kapalı.' };
      return B.session().then(function (s) {
        if (!s) return { msg: 'Tüm kullanıcılardan gelen liste için yönetici hesabıyla oturum açın.' };
        return B.client().then(function (c) { return c.rpc('sa_fiyat_eksik_list', { p_limit: 200 }); }).then(function (r) {
          if (!r.error) return { rows: r.data || [] };
          var m = String(r.error.message || '') + ' ' + String(r.error.code || '');
          if (/42501|Yalnız yönetici/.test(m)) return { msg: 'Bu hesap yönetici değil; bulut listesi yalnız yöneticiye açıktır.' };
          if (/Could not find the function|schema cache|does not exist|PGRST202|42883/i.test(m)) return { msg: 'Veritabanı güncellemesi gerekli (' + esc(MIG) + ').' };
          return { msg: 'Bulut listesi alınamadı: ' + esc(r.error.message || 'hata') };
        });
      });
    }).catch(function () { return { msg: 'Bulut listesi alınamadı (bağlantı yok olabilir).' }; });
  }
  function refFile() { return fetch('data/fiyat-ref.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function paint(c, ref) {
    var by = {}, refBy = {};
    ((ref && ref.items) || []).forEach(function (x) { if (x && x.key) refBy[x.key] = x; });
    (c.rows || []).forEach(function (r) { by[r.key] = r; });
    local().forEach(function (r) { if (!by[r.key]) by[r.key] = r; });
    var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return String(b.last_seen || '').localeCompare(String(a.last_seen || '')); });
    var nLocal = rows.filter(function (r) { return r.local; }).length;
    $('feSub').innerHTML = (c.rows ? 'Buluttan ' + c.rows.length + ' kalem' + (nLocal ? ' + yalnız bu cihazda görülen ' + nLocal : '') + '. ' : (c.msg ? c.msg + ' ' : '') + (rows.length ? 'Aşağıda yalnız bu cihazda görülenler var. ' : '')) +
      'Alım talebinde alınacak olup fiyatı bulunamayan kalemler; kullanıcıya uyarı gösterilmez. Fiyatı <code>data/fiyat-ref.json</code> kaynaklarına eklenince bir sonraki talepte görünür.';
    if (!rows.length) { $('feList').innerHTML = '<li class="fe-empty">Kayıt yok.</li>'; return; }
    $('feList').innerHTML = rows.map(function (r) {
      var rf = refBy[r.key], has = rf && rf.ref != null && Number(rf.ref) > 0;
      var why = has ? '' : (rf ? (rf.note || 'kaynak dosyasında var, fiyatı yok') : (/^stok:/.test(r.key) ? 'kullanıcının kendi stok kalemi (katalogda yok)' : 'kaynak dosyasında yok'));
      return '<li><div class="fe-top"><b>' + esc(r.name || r.key) + (has ? '<span class="fe-tag">şimdi fiyatı var ≈ ' + esc(money(rf.ref)) + (r.unit ? ' / ' + esc(r.unit) : '') + '</span>' : '') + (r.local ? '<span class="fe-tag dev">bu cihaz</span>' : '') + '</b>' +
        '<span>' + (Number(r.seen_count) || 1) + ' kez' + (r.users ? ' · ' + r.users + ' kişi' : '') + '</span></div>' +
        '<small class="fe-meta">Anahtar <code>' + esc(r.key) + '</code>' + (r.unit ? ' · birim ' + esc(r.unit) : '') + (r.last_scope ? ' · son: ' + esc(r.last_scope) : '') + (r.last_email ? ' · ' + esc(r.last_email) : '') + '</small>' +
        '<small class="fe-meta">Son görülme ' + esc(dt(r.last_seen)) + ' · ilk ' + esc(dt(r.first_seen)) + (why ? ' · ' + esc(why) : '') + '</small></li>';
    }).join('');
  }
  paint({ msg: 'Bulut kontrol ediliyor…' }, null);
  Promise.all([cloud(), refFile()]).then(function (a) { paint(a[0], a[1]); });
})();

/* k126: oğul verisi eksik melezler — Bulut: sa_irk_ogul_eksik_list (yalnız yönetici) · Çevrimdışı yedek: superari.irk.ogulVeriEksik.v1 (demo-data.js yazar). */
(function () {
  var L = document.getElementById('ieList'); if (!L) return;
  var MIG = 'supabase/migrations/20261013140000_irk_ogul_veri_eksik.sql';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dt(iso) { var d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function local() { var it = {}; try { it = (JSON.parse(localStorage.getItem('superari.irk.ogulVeriEksik.v1') || 'null') || {}).items || {}; } catch (e) {}
    return Object.keys(it).map(function (k) { var e = it[k]; return { key: k, name: e.name, first_seen: e.first, last_seen: e.last, seen_count: e.count, local: true }; }); }
  function cloud() {
    var B = window.SuperAriBulut; if (!B) return Promise.resolve({ msg: 'Bulut modülü yüklenemedi.' });
    return B.loadConfig().then(function (cfg) {
      if (!cfg || !cfg.enabled) return { msg: 'Bulut kapalı.' };
      return B.session().then(function (s) {
        if (!s) return { msg: 'Tüm kullanıcılardan gelen liste için yönetici hesabıyla oturum açın.' };
        return B.client().then(function (c) { return c.rpc('sa_irk_ogul_eksik_list', { p_limit: 200 }); }).then(function (r) {
          if (!r.error) return { rows: r.data || [] };
          var m = String(r.error.message || '') + ' ' + String(r.error.code || '');
          if (/42501|Yalnız yönetici/.test(m)) return { msg: 'Bu hesap yönetici değil; bulut listesi yalnız yöneticiye açıktır.' };
          if (/Could not find the function|schema cache|does not exist|PGRST202|42883/i.test(m)) return { msg: 'Veritabanı güncellemesi gerekli (' + esc(MIG) + ').' };
          return { msg: 'Bulut listesi alınamadı: ' + esc(r.error.message || 'hata') };
        });
      });
    }).catch(function () { return { msg: 'Bulut listesi alınamadı (bağlantı yok olabilir).' }; });
  }
  function paint(c) {
    var by = {}; (c.rows || []).forEach(function (r) { by[r.key] = r; }); local().forEach(function (r) { if (!by[r.key]) by[r.key] = r; });
    var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return String(b.last_seen || '').localeCompare(String(a.last_seen || '')); });
    var sub = document.getElementById('ieCloud'), nL = rows.filter(function (r) { return r.local; }).length;
    if (sub) sub.innerHTML = c.rows ? 'Buluttan ' + c.rows.length + ' melez' + (nL ? ' + yalnız bu cihazda görülen ' + nL : '') + '.' : (c.msg || '') + (rows.length ? ' Aşağıda yalnız bu cihazda görülenler var.' : '');
    L.innerHTML = rows.length ? rows.map(function (r) { return '<li><div class="fe-top"><b>' + esc(r.name || r.key) + (r.local ? '<span class="fe-tag dev">bu cihaz</span>' : '') + '</b><span>' + (Number(r.seen_count) || 1) + ' kez' + (r.users ? ' · ' + r.users + ' kişi' : '') + '</span></div><small class="fe-meta">Anahtar <code>' + esc(r.key) + '</code>' + (r.last_email ? ' · ' + esc(r.last_email) : '') + ' · son ' + esc(dt(r.last_seen)) + ' · ilk ' + esc(dt(r.first_seen)) + '</small></li>'; }).join('') : '<li class="fe-empty">Kayıt yok. (Oğul sayfası açıldığında melezler kontrol edilir.)</li>';
  }
  paint({ msg: 'Bulut kontrol ediliyor…' });
  cloud().then(paint);
})();

