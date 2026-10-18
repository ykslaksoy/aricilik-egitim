/* koloni-182: Yönetici · Yapılacaklar (tablo yapilacaklar; RLS yalnız admin) */
(function () {
  'use strict';
  var B = window.SuperAriBulut, host = document.getElementById('panel'); if (!B || !host) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DA = { acik: 'Açık', yapiliyor: 'Yapılıyor', tamam: 'Tamam' }, RENK = { acik: '#b54708', yapiliyor: '#1d4ed8', tamam: '#15803d' };
  var nav = host.querySelector('nav.nav');
  var s = document.createElement('section'); s.className = 'card fe'; s.id = 's-yapilacak';
  s.innerHTML = '<h2>Yapılacaklar</h2><p class="fe-sub">Açık işler ve kararlar. Yalnız yönetici görür.</p>' +
    '<form id="yaEkle" style="display:grid;gap:.4rem;margin:.5rem 0"><input name="b" placeholder="Başlık" required maxlength="160"><textarea name="a" rows="2" placeholder="Açıklama"></textarea><button class="btn" type="submit" style="justify-self:end">Ekle</button></form><div class="bd">Yükleniyor…</div>';
  host.appendChild(s); if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-yapilacak">Yapılacaklar</a>');
  var bd = s.querySelector('.bd');
  var acikYapilan = false;
  function yukle() {
    B.client().then(function (c) { return c.from('yapilacaklar').select('id,baslik,aciklama,durum,olusturma,guncelleme').order('id'); }).then(function (r) {
      if (r.error) { bd.innerHTML = '<p class="fe-empty">Yetki yok ya da veritabanı güncellemesi gerekli.</p>'; return; }
      var A = r.data || [], L = A.filter(function (x) { return x.durum !== 'tamam'; }), T = A.filter(function (x) { return x.durum === 'tamam'; });
      function tr(d) { return d ? new Date(d).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'; }
      function sat(x) {
        return '<div style="border-top:1px solid #eee;padding:.5rem 0;display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:.5rem;align-items:start">' +
          '<div><b>' + x.id + '. ' + esc(x.baslik) + '</b><div style="font-size:.85rem;color:#555">' + esc(x.aciklama) + '</div><small style="color:#888">' + (x.durum === 'tamam' ? 'Tamamlandı: ' + tr(x.guncelleme || x.olusturma) : tr(x.olusturma)) + '</small></div>' +
          '<select data-ya="' + x.id + '" style="color:' + RENK[x.durum] + ';font-weight:700">' + Object.keys(DA).map(function (k) { return '<option value="' + k + '"' + (k === x.durum ? ' selected' : '') + '>' + DA[k] + '</option>'; }).join('') + '</select></div>';
      }
      T.sort(function (a, b) { return String(b.guncelleme || '').localeCompare(String(a.guncelleme || '')); });
      bd.innerHTML = '<p class="fe-sub">' + L.length + ' açık iş</p>' + (L.length ? L.map(sat).join('') : '<p class="fe-empty">Açık iş yok.</p>') +
        '<details id="yaYapilan" style="margin-top:1rem"' + (acikYapilan ? ' open' : '') + '><summary style="font-weight:700;cursor:pointer">Yapılanlar (' + T.length + ')</summary>' + (T.length ? T.map(sat).join('') : '<p class="fe-empty">Henüz yok.</p>') + '</details>';
      bd.querySelector('#yaYapilan').addEventListener('toggle', function (e) { acikYapilan = e.target.open; });
    }, function () { bd.innerHTML = '<p class="fe-empty">Bağlantı yok.</p>'; });
  }
  s.addEventListener('change', function (e) {
    var t = e.target.closest('[data-ya]'); if (!t) return;
    B.client().then(function (c) { return c.from('yapilacaklar').update({ durum: t.value, guncelleme: new Date().toISOString() }).eq('id', +t.getAttribute('data-ya')); }).then(function (r) { if (r.error) alert('Kaydedilemedi'); yukle(); });
  });
  s.querySelector('#yaEkle').addEventListener('submit', function (e) {
    e.preventDefault(); var f = e.target, b = f.b.value.trim(); if (!b) return;
    B.client().then(function (c) { return c.from('yapilacaklar').insert({ baslik: b, aciklama: f.a.value.trim() }); }).then(function (r) { if (r.error) { alert('Eklenemedi'); return; } f.reset(); yukle(); });
  });
  yukle();
})();

/* k171: ırk/melez ayrıntı kartları (Efe + 3 melez; k289: + Muğla × Kafkas iki yön) — kaynak, gerekçe ve rakamlar YALNIZ yönetici panelinde; uygulamada yalnız puan. */
(function () {
  var L = document.getElementById('ipList'), D = window.SuperAriDemo; if (!L) return;
  var C = (D && D.colony) || {}, S = C.GENETIK_SAF || {}, M = C.GENETIK_MELEZ || {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lnk(k) { return esc(k).replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  var RG = 'https://www.resmigazete.gov.tr/eskiler/2019/05/20190516-14-1.pdf', TG = 'https://www.tarimorman.gov.tr/TAGEM/Haber/478/Gokceada-Ve-Efe-Arisi-Ekotipleri-Tescil-Edildi',
    YU = 'https://dergipark.org.tr/tr/pub/anadolu/article/1782244', UL = 'https://dergipark.org.tr/tr/download/article-file/143543', AK = 'https://tezara.org/theses/77039', AH = 'https://hdl.handle.net/11480/5761';
  var K = [
    { ad: 'Efe arısı (saf ekotip)', puan: S.efe, olcek: '2–3 (2,5)', etiket: 'uzman tahmini', eb: null,
      gerekce: 'Kaynakta sayısal oğul puanı yok; «oğul eğilimi düşük / çok düşük» → Buckfast (15) ile Karadeniz (35) arası, orta değer 25. Anadolu (75) uygulanmadı: oğul eğilimi seleksiyonla azaltıldı.',
      kaynak: ['Resmî Gazete 16.05.2019 sa. 30776 EK-1 — ' + RG + ' · «Oğul eğilimi düşüktür» · «Orta derecede uysaldır» · kuluçka performansı yüksek, ilkbaharda gelişme hızı çok yüksek · kışlama iyi · Nosemaya dayanıklı · yağmacılık çok düşük · dil uzunluğu 6,05 ± 0,21 mm',
        'TAGEM 20.05.2019 — ' + TG + ' · bölge arılarına göre bal verimi %25, koloni indeksi %20 yüksek (2008–2018 ıslah) · oğul verme eğilimi çok düşük',
        'Yücel B. 2025, ANADOLU 35(2) — ' + YU + ' · Efe F1, 20 koloni, iğneleme (pin-killed) testi; hijyen–Varroa negatif korelasyon (özette yüzde yok)'] },
    { ad: 'Kafkas × Muğla', puan: M['kafkas+mugla'], olcek: '3', etiket: 'kaynağa dayalı tahmin', eb: ['Kafkas', S.kafkas, 'Muğla', S.mugla],
      gerekce: 'Melezin oğul eğilimi ebeveynler arasında; Kafkas analı melez Kafkas düzeyinde. Ölçek 3 (35) iki ucun ortası; uygulama ana/erkek yönünü ayırmaz.',
      kaynak: ['Uludağ Arıcılık Dergisi 5(4), 2005 — ' + UL + ' · oğul eğilimi: Kafkas %10 · Muğla %30 · Kafkas ana × Muğla erkek %10 · Muğla ana × Kafkas erkek %20 · ana arı yüksüğü (ort.): Kafkas 6,50 ± 3,5 · Muğla 9,40 ± 2,5 · Kafkas ana × Muğla erkek 7,50 ± 1,5 · Muğla ana × Kafkas erkek 10,80 ± 2,4 · genotipler arası fark önemsiz (P>0,05)'] },
    /* k289: yönlü Muğla × Kafkas melezleri — Genetik puanı kilitli Kafkas × Muğla basamağı (35) yeniden kullanıldı (yönlü puan: uzman tahmini) */
    { ad: 'Muğla ana × Kafkas baba (2’li melez)', puan: M['kafkas+mugla'], olcek: '3', etiket: 'uzman tahmini', eb: ['Kafkas', S.kafkas, 'Muğla', S.mugla],
      gerekce: 'Genetik puanı: kilitli tablodaki Kafkas × Muğla basamağı (35) yeniden kullanıldı; yöne özel oğul puanı yok → uzman tahmini. Uygulamada sade özellik: yüksek bal verimi · daha hırçın · F1, ana her yıl yenilenmeli. Rota / bölge performansı (ör. Antalya → Tekman → Muğla): uzman tahmini.',
      kaynak: ['Akyol E. 1998, doktora tezi (Çukurova Üniv.), gezginci arıcılık — ' + AK + ' · bal verimi 1996: 16,15 kg · 1997: 65,00 kg / koloni (en yüksek) · karşılaştırma: saf Muğla 53,9 kg · saf Kafkas 33,0 kg (1997) · kışlama farkı önemsiz · denemedeki en hırçın grup',
        'Akyol E. & Kaftanoğlu O. 2001 (karşılıklı melezler, gezginci, Çukurova) — ' + AH] },
    { ad: 'Kafkas ana × Muğla baba (2’li melez)', puan: M['kafkas+mugla'], olcek: '3', etiket: 'uzman tahmini', eb: ['Kafkas', S.kafkas, 'Muğla', S.mugla],
      gerekce: 'Genetik puanı: kilitli tablodaki Kafkas × Muğla basamağı (35) yeniden kullanıldı; yöne özel oğul puanı yok → uzman tahmini. Uygulamada sade özellik: denemede bal verimi düşük kaldı. Rota / bölge performansı: uzman tahmini.',
      kaynak: ['Akyol E. 1998, doktora tezi (Çukurova Üniv.), gezginci arıcılık — ' + AK + ' · bal verimi 1996: 9,55 kg · 1997: 32,25 kg / koloni · karşılaştırma: saf Muğla 53,9 kg · saf Kafkas 33,0 kg (1997) · kışlama farkı önemsiz',
        'Akyol E. & Kaftanoğlu O. 2001 (karşılıklı melezler, gezginci, Çukurova) — ' + AH] },
    { ad: 'Karadeniz × Muğla', puan: M['karadeniz+mugla'], olcek: '4', etiket: 'uzman tahmini', eksik: true, eb: ['Karadeniz', S.karadeniz, 'Muğla', S.mugla],
      gerekce: 'Karadeniz kodda Kafkas ekotipi; Kafkas × Muğla bulgusu (melez ebeveynler arası) Karadeniz tabanına (35) uygulandı; tablo örüntüsü ortalamanın bir üst basamağı → 55.', kaynak: [] },
    { ad: 'Karadeniz × Anadolu', puan: M['anadolu+karadeniz'], olcek: '4–5 (4,5)', etiket: 'uzman tahmini', eksik: true, eb: ['Karadeniz', S.karadeniz, 'Anadolu', S.anadolu],
      gerekce: 'En yakın tablo karşılığı Kafkas × Anadolu = 55; Karadeniz Kafkas’tan bir basamak yüksek (35 > 5) → 65.', kaynak: [] }
  ];
  L.innerHTML = K.map(function (x) {
    var eb = x.eb ? '<br>Ebeveynler: ' + esc(x.eb[0]) + ' ' + esc(x.eb[1]) + ' · ' + esc(x.eb[2]) + ' ' + esc(x.eb[3]) + ' · ortalama ' + esc((x.eb[1] + x.eb[3]) / 2) : '';
    var ks = x.eksik ? '<p><span class="fe-badge" style="background:#fde68a;color:#78350f;padding:1px 6px;border-radius:8px">Veri eksik</span> <small>Sayısal çalışma bulunamadı; aranan kaynaklar: TAGEM, Muğla AAE, DergiPark.</small></p>'
      : '<ul>' + x.kaynak.map(function (k) { return '<li><small>' + lnk(k) + '</small></li>'; }).join('') + '</ul>';
    return '<li><b>' + esc(x.ad) + '</b> — Genetik <b>' + esc(x.puan == null ? 'Veri yok' : x.puan) + '</b> · oğul ölçeği <b>' + esc(x.olcek) + '</b> · <i>' + esc(x.etiket) + '</i>' + eb + '<br><small>Gerekçe: ' + esc(x.gerekce) + '</small>' + ks + '</li>';
  }).join('');
})();
