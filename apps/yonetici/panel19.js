/* koloni-297: Yönetici › Rakip arşivi — ekran görüntüleri (yalnız yönetici). */
(function () {
  'use strict';
  var host = document.getElementById('panel');
  if (!host || document.getElementById('s-rakip')) return;
  var nav = host.querySelector('nav.nav');
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var MAIL = 'ykslaksoy@gmail.com';
  var TR = {
    apiari: 'arılık', arnie: 'kovan', arnia: 'kovan', dashboard: 'gösterge paneli', grafico: 'grafik', temp: 'sıcaklık', interna: 'iç', esterna: 'dış',
    umidita: 'nem', intensita: 'yoğunluk', sonora: 'ses', batteria: 'pil', spostamenti: 'hareket', andamento: 'eğilim', stagione: 'sezon', dispositivi: 'cihazlar',
    allarmi: 'alarmlar', soglie: 'eşikler', galleria: 'galeri', condivisioni: 'paylaşımlar', export: 'dışa aktarma', novita: 'yenilikler', assistenza: 'destek',
    confronto: 'karşılaştırma', attivita: 'görev', note: 'notlar', registri: 'kayıtlar', dettaglio: 'ayrıntı', fondo: 'alt', form: 'form', nuovo: 'yeni',
    nuova: 'yeni', apiario: 'arılık', labels: 'etiketler', reports: 'raporlar', queens: 'ana arılar', todo: 'yapılacaklar', feedings: 'besleme', treatments: 'ilaçlama',
    inventory: 'envanter', harvest: 'hasat', migration: 'göç', finance: 'finans', varroa: 'varroa', mites: 'akar', queen: 'ana arı', rearing: 'yetistirme',
    stock: 'stok', events: 'olaylar', checklist: 'kontrol listesi', collaboration: 'işbirliği', research: 'araştırma', alert: 'uyarı', rules: 'kurallar',
    hive: 'kovan', hives: 'kovanlar', add: 'ekle', detail: 'ayrıntı', modal: 'pencere', whiteboard: 'beyaz tahta', map: 'harita', masaustu: 'masaüstü', mobil: 'mobil',
    arilik: 'arılık', ozet: 'özet', tablosu: 'tablosu', come: 'nasıl', funziona: 'çalışır', tour: 'tur', demo: 'demo', euromakeup: 'örnek', anno: 'yıl', grafico: 'grafik'
  };
  function capFromFile(file) {
    var base = file.replace(/^.*\//, '').replace(/\.[a-z]+$/i, '').replace(/^\d+-/, '');
    var parts = base.split(/[-_]+/).filter(Boolean);
    var out = parts.map(function (w) {
      var lw = w.toLowerCase();
      if (TR[lw]) return TR[lw];
      if (/^[a-z]{2}$/i.test(w) && w === w.toUpperCase()) return w;
      return lw.charAt(0).toLocaleUpperCase('tr') + lw.slice(1);
    });
    var s = out.join(' ').replace(/\be\s+/g, 've ').replace(/\bi\s+/g, 've ');
    return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
  }
  var APPS = [
    { id: 'beep', ad: 'BEEP', platform: 'Web', ucret: 'Ücretsiz, açık kaynak', hesap: 'kayitli', eksik: ['Kontrol listesi şablonları', 'İşbirliği grubu', 'Araştırma projeleri', 'Uyarı kuralı kopyalama'] },
    { id: '3bee', ad: '3Bee', platform: 'Web', ucret: 'Ücretsiz; Hive-Tech donanım ayrı satılır', hesap: 'kayitli', arsivMetin: 'Görsel arşivde tutulmuyor (kullanım şartları: tutulmamalı).', eksik: ['Kovan karşılaştırma', 'Sezon özeti', 'Galeri', 'Dışa aktarma', 'Ses yoğunluğu grafiği'] },
    { id: 'apiarybook', ad: 'Apiary Book', platform: 'Web', ucret: 'Ücretsiz BASIC; PRO 6,66 €/ay', hesap: 'kayitli', eksik: ['Varroa sayımı', 'İlaçlama / veteriner kaydı', 'Ana arı yetiştirme', 'Etiketler', 'Stok', 'Olay raporu (zehirlenme, Asya eşek arısı vb. 15 kategori)'] },
    { id: 'hivetracks', ad: 'HiveTracks', platform: 'Web + mobil', ucret: 'Mobil ücretsiz; web Pro 6,99 $/ay (30 gün deneme)', hesap: 'kayitli', arsivMetin: 'Görsel arşivde tutulmuyor (kullanım şartları: tutulmamalı).', eksik: ['Sezon trendi', 'Arılıklar arası karşılaştırma', 'Verim raporu', 'Çok kullanıcı', 'Dışa aktarma (Pro)'] },
    { id: 'mybroodminder', ad: 'MyBroodMinder', platform: 'Web + mobil', ucret: 'Ücretsiz (≤5 kovan); Premium 50–200 $/yıl', hesap: 'kayitli', eksik: ['Paylaşım bağlantısı', 'Özel panel', 'Tarlacı / nektar endeksi', 'Çiftleşme uçuşu saatleri', 'Cihaz geçmişi'] },
    { id: 'beehero', ad: 'BeeHero', platform: 'Mobil + web panel', ucret: 'Donanım satışı; açık kayıt yok', hesap: 'yok', eksik: ['Koloni gücü sensör tahmini', 'Tozlaşma paneli', 'Öncelik listesi', 'Arılık haritası'] },
    { id: 'beewise', ad: 'Beewise', platform: 'Web / mobil', ucret: 'BeeHome donanım müşterisi', hesap: 'yok', eksik: ['Robotik kovan uzaktan kontrol', 'Kamera çerçeve analizi', 'Otomatik besleme / ilaçlama'] },
    { id: 'nectar', ad: 'Nectar', platform: 'Web + mobil', ucret: 'RFID + aylık abonelik', hesap: 'yok', eksik: ['Tozlaşma lojistiği (göç)', 'Whiteboard / harita', 'Ana arı hattı analizi', 'Kayıp / sigorta raporu'] },
    { id: 'arnia', ad: 'Arnia', platform: '—', ucret: 'Kapanmış (2022)', hesap: 'yok', eksik: ['Canlı ürün yok (arşiv görseli)'] },
    { id: 'apisprotect', ad: 'ApisProtect', platform: '—', ucret: 'Kapanıyor', hesap: 'yok', eksik: ['Canlı ürün yok (arşiv görseli)'] },
    { id: 'hivekeeper', ad: 'HiveKeeper', platform: 'Web', ucret: 'Ücretsiz (5 kovan) + Pro deneme', hesap: 'yok', eksik: ['Sesli kontrol', 'AI sohbet', 'Asya eşek arısı tanıma', 'Nektar takvimi'] },
    { id: 'pasika', ad: 'Pasika', platform: 'Mobil', ucret: 'Ücretsiz (10 kovan)', hesap: 'yok', eksik: ['AI çerçeve analizi', 'Bal verimi tahmini', 'NFC etiket'] },
    { id: 'kovaniq', ad: 'Kovan IQ', platform: 'Mobil', ucret: 'Sınırlı ücretsiz + Premium', hesap: 'yok', eksik: ['Bakanlık plaka yönetimi', 'Tartım takibi', 'Çevrimdışı kayıt'] },
    { id: 'kovania', ad: 'Kovania', platform: 'Mobil (Android)', ucret: 'Ücretsiz indirme', hesap: 'yok', eksik: ['Beepedia rehberi (166 rehber)', '81 il flora verisi', 'QR / çevrimdışı kayıt', 'Sesli not'] },
    { id: 'kovan-defteri', ad: 'Kovan Defteri', platform: 'Mobil (Android)', ucret: 'Bilinmiyor', hesap: 'yok', eksik: ['Temel kovan defteri'] },
    { id: 'beescanning', ad: 'BeeScanning', platform: 'Mobil', ucret: '14 gün deneme, sonra abonelik', hesap: 'yok', eksik: ['Fotoğraftan varroa tespiti'] },
    { id: 'beeplus', ad: 'BeePlus', platform: 'iOS', ucret: 'Tek seferlik satın alma', hesap: 'yok', eksik: ['Gelir-gider', 'Harita / yayılım alanı'] },
    { id: 'apiarist', ad: 'Apiarist', platform: 'Apple', ucret: 'Mağaza', hesap: 'yok', eksik: ['Finans', 'iCloud senkron'] },
    { id: 'beetrack', ad: 'BeeTrack', platform: 'Mobil + panel', ucret: '150–200 ₺/kovan/ay', hesap: 'yok', eksik: ['Oğul erken uyarısı', 'Hasat zamanı tahmini', 'LoRa tartı'] },
    { id: 'apisdigital', ad: 'Apis Digital 501B', platform: 'Web + donanım', ucret: 'Tartı satın alımı', hesap: 'yok', eksik: ['GSM kovan terazisi uzaktan izleme'] },
    { id: 'hexasense', ad: 'Hexasense', platform: 'Mobil / web', ucret: 'Donanım', hesap: 'yok', eksik: ['NB-IoT sensör paketi'] },
    { id: '4bee', ad: '4B Arıcılık Teknolojileri', platform: '—', ucret: 'Bilinmiyor', hesap: 'yok', eksik: ['Görüntü analizi', 'Uzaktan yönetim'] },
    { id: 'pollenity', ad: 'Pollenity / Beebot', platform: 'Web', ucret: 'Beebot sensörü gerekir', hesap: 'yok', eksik: ['Akıllı kovan sensör paketi'] }
  ];
  if (!document.getElementById('rk-css')) {
    var st = document.createElement('style');
    st.id = 'rk-css';
    st.textContent = '#s-rakip{font-size:15px;line-height:1.45}#s-rakip .rk-cards{display:grid;gap:.55rem;margin-top:.5rem}#s-rakip .rk-card{border:1px solid #e0d4c2;border-radius:14px;padding:.65rem .75rem;background:#fffdfb;cursor:pointer;text-align:left;width:100%;font:inherit;color:inherit}#s-rakip .rk-card:focus-visible{outline:2px solid #c98a00;outline-offset:2px}#s-rakip .rk-card h3{margin:0 0 .25rem;font-size:1rem}#s-rakip .rk-meta{font-size:.8rem;color:#6b5d4a;margin:.15rem 0}#s-rakip .rk-meta b{color:#3d3428}#s-rakip .rk-eksik{margin:.35rem 0 0;padding-left:1.1rem;font-size:.78rem;color:#4a4034}#s-rakip .rk-eksik li{margin:.12rem 0}#s-rakip .rk-badge{display:inline-block;font-size:.7rem;font-weight:700;padding:.1rem .45rem;border-radius:999px;background:#eef6ee;color:#1f7a3d;margin-left:.35rem}#s-rakip .rk-badge.off{background:#f3ece2;color:#8a7358}#s-rakip .rk-gal-head{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin:.35rem 0 .5rem}#s-rakip .rk-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.45rem;max-height:70vh;overflow:auto;padding:.15rem 0}#s-rakip .rk-thumb{border:1px solid #e5d9c6;border-radius:10px;padding:0;background:#fff;cursor:pointer;overflow:hidden;text-align:left;font:inherit}#s-rakip .rk-thumb-box{aspect-ratio:16/10;background:#f3ece2;position:relative;width:100%}#s-rakip .rk-thumb-box img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}#s-rakip .rk-cap{display:block;font-size:.72rem;line-height:1.3;padding:.35rem .4rem;color:#3d3428;min-height:2.6em}#s-rakip .rk-lb{position:fixed;inset:0;z-index:9999;background:rgba(20,16,10,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:.75rem;box-sizing:border-box}#s-rakip .rk-lb[hidden]{display:none!important}#s-rakip .rk-lb img{max-width:min(1280px,100%);max-height:calc(100vh - 5rem);object-fit:contain;border-radius:8px}#s-rakip .rk-lb-cap{color:#fff;text-align:center;font-size:.9rem;margin:.5rem 0 0;max-width:36rem}#s-rakip .rk-lb-nav{position:absolute;top:50%;transform:translateY(-50%);border:0;background:rgba(255,255,255,.15);color:#fff;font-size:1.6rem;width:2.5rem;height:2.5rem;border-radius:999px;cursor:pointer}#s-rakip .rk-lb-nav.prev{left:.5rem}#s-rakip .rk-lb-nav.next{right:.5rem}#s-rakip .rk-lb-close{position:absolute;top:.5rem;right:.5rem;border:0;background:rgba(255,255,255,.2);color:#fff;border-radius:10px;padding:.35rem .65rem;cursor:pointer;font:inherit}@media(min-width:640px){#s-rakip .rk-cards{grid-template-columns:1fr 1fr}}';
    document.head.appendChild(st);
  }
  var s = document.createElement('section');
  s.className = 'card fe mk';
  s.id = 's-rakip';
  host.appendChild(s);
  if (nav) nav.insertAdjacentHTML('beforeend', '<a class="chip" href="#s-rakip">Rakip arşivi</a>');
  var imgMap = {}, kaynakMap = {}, galId = null, galIdx = 0, lbOpen = false;
  function rk() { return document.getElementById('s-rakip'); }
  function hesapTxt(h) {
    if (h === 'kayitli') return '<span class="rk-badge">Kayıtlı</span> ' + esc(MAIL);
    return '<span class="rk-badge off">Kayıt yok</span>';
  }
  function cardHtml(a, nImg) {
    var eks = (a.eksik || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    return '<button type="button" class="rk-card" data-rk-id="' + esc(a.id) + '"' + (nImg ? '' : ' disabled style="opacity:.75;cursor:default"') + '>' +
      '<h3>' + esc(a.ad) + (nImg ? ' <span class="fe-meta">(' + nImg + ' görsel)</span>' : '') + '</h3>' +
      '<p class="rk-meta"><b>Platform:</b> ' + esc(a.platform) + '</p>' +
      '<p class="rk-meta"><b>Ücret:</b> ' + esc(a.ucret) + '</p>' +
      '<p class="rk-meta"><b>Hesap:</b> ' + hesapTxt(a.hesap) + '</p>' +
      (a.arsivMetin ? '<p class="rk-meta">' + esc(a.arsivMetin) + '</p>' : '') +
      (kaynakMap[a.id] ? '<p class="rk-meta"><b>Kaynak:</b> <a href="' + esc(kaynakMap[a.id]) + '" target="_blank" rel="noopener">' + esc(kaynakMap[a.id].replace(/^https?:\/\/(www\.)?/, '').slice(0, 56)) + '</a></p>' : '') +
      (eks ? '<ul class="rk-eksik"><li><b>Bizde olmayan:</b></li>' + eks + '</ul>' : '') +
      '</button>';
  }
  function paintList() {
    var H = '<h2>Rakip arşivi</h2><p class="fe-sub">21 rakip uygulama özeti ve ekran görüntüleri. Şifre veya kart bilgisi saklanmaz; kayıtlı hesaplarda yalnızca yönetici e-postası gösterilir.</p><div class="rk-cards">';
    APPS.forEach(function (a) {
      var imgs = imgMap[a.id] || [];
      H += cardHtml(a, imgs.length);
    });
    H += '</div><div id="rk-gal-wrap" hidden></div>';
    H += '<div class="rk-lb" id="rk-lb" hidden role="dialog" aria-modal="true"><button type="button" class="rk-lb-close" data-rk-lb-x>Kapat</button><button type="button" class="rk-lb-nav prev" data-rk-lb-p aria-label="Önceki">‹</button><button type="button" class="rk-lb-nav next" data-rk-lb-n aria-label="Sonraki">›</button><img alt="" id="rk-lb-img" width="1280" height="800" decoding="async"><p class="rk-lb-cap" id="rk-lb-cap"></p></div>';
    var el = rk(); if (el) el.innerHTML = H;
  }
  function paintGal(id) {
    var el = rk(); if (!el) return;
    var a = APPS.filter(function (x) { return x.id === id; })[0];
    var imgs = imgMap[id] || [];
    var w = el.querySelector('#rk-gal-wrap');
    if (!w || !a) return;
    var cards = el.querySelector('.rk-cards');
    if (cards) cards.hidden = true;
    var h2 = el.querySelector(':scope > h2');
    if (h2) h2.textContent = a.ad + ' — galeri';
    var sub = el.querySelector(':scope > .fe-sub');
    if (sub) sub.textContent = imgs.length ? 'Küçük resme dokunun; tam ekranda sol/sağ ile gezinin.' : 'Bu uygulama için arşiv görseli yok.';
    var thumbs = imgs.map(function (src, i) {
      var cap = capFromFile(src);
      return '<button type="button" class="rk-thumb" data-rk-g="' + esc(id) + '" data-rk-i="' + i + '"><span class="rk-thumb-box"><img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" width="320" height="200"></span><span class="rk-cap">' + esc(cap) + '</span></button>';
    }).join('');
    w.hidden = false;
    w.innerHTML = '<div class="rk-gal-head"><button type="button" class="btn secondary" data-rk-back>← Kart listesi</button><span class="fe-meta">' + imgs.length + ' görsel</span></div><div class="rk-thumbs">' + thumbs + '</div>';
    galId = id;
    location.hash = 's-rakip';
  }
  function backList() {
    galId = null;
    closeLb();
    var el = rk(); if (!el) return;
    var w = el.querySelector('#rk-gal-wrap');
    if (w) { w.hidden = true; w.innerHTML = ''; }
    var cards = el.querySelector('.rk-cards');
    if (cards) cards.hidden = false;
    var h2 = el.querySelector(':scope > h2');
    if (h2) h2.textContent = 'Rakip arşivi';
    var sub = el.querySelector(':scope > .fe-sub');
    if (sub) sub.textContent = '21 rakip uygulama özeti ve ekran görüntüleri. Şifre veya kart bilgisi saklanmaz; kayıtlı hesaplarda yalnızca yönetici e-postası gösterilir.';
  }
  function openLb(id, idx) {
    var imgs = imgMap[id] || [];
    if (!imgs.length) return;
    galIdx = idx;
    galId = id;
    var el = rk(); if (!el) return;
    var lb = el.querySelector('#rk-lb');
    var im = el.querySelector('#rk-lb-img');
    var cp = el.querySelector('#rk-lb-cap');
    if (!lb || !im) return;
    im.src = imgs[galIdx];
    im.alt = capFromFile(imgs[galIdx]);
    if (cp) cp.textContent = im.alt;
    lb.hidden = false;
    lbOpen = true;
    document.body.style.overflow = 'hidden';
  }
  function closeLb() {
    var el = rk(); var lb = el && el.querySelector('#rk-lb');
    if (lb) lb.hidden = true;
    lbOpen = false;
    document.body.style.overflow = '';
  }
  function stepLb(d) {
    if (!galId) return;
    var imgs = imgMap[galId] || [];
    if (!imgs.length) return;
    galIdx = (galIdx + d + imgs.length) % imgs.length;
    openLb(galId, galIdx);
  }
  host.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#s-rakip')) return;
    var t = e.target;
    if (t.hasAttribute('data-rk-back')) { backList(); return; }
    if (t.hasAttribute('data-rk-lb-x')) { closeLb(); return; }
    if (t.hasAttribute('data-rk-lb-p')) { stepLb(-1); return; }
    if (t.hasAttribute('data-rk-lb-n')) { stepLb(1); return; }
    var card = t.closest('.rk-card[data-rk-id]');
    if (card && !card.disabled) { paintGal(card.getAttribute('data-rk-id')); return; }
    var th = t.closest('[data-rk-g]');
    if (th) { openLb(th.getAttribute('data-rk-g'), parseInt(th.getAttribute('data-rk-i'), 10) || 0); }
  });
  document.addEventListener('keydown', function (e) {
    if (!lbOpen) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') stepLb(-1);
    if (e.key === 'ArrowRight') stepLb(1);
  });
  function mergeManifest(data) {
    (data.apps || []).forEach(function (row) {
      imgMap[row.slug] = row.images || [];
      if (row.kaynak) kaynakMap[row.slug] = row.kaynak;
    });
    APPS.forEach(function (a) {
      if (!imgMap[a.id]) imgMap[a.id] = [];
    });
    paintList();
  }
  paintList();
  fetch('rakip-manifest.json?v=koloni-297').then(function (r) { return r.json(); }).then(mergeManifest).catch(function () {
    mergeManifest({ apps: [] });
  });
})();
