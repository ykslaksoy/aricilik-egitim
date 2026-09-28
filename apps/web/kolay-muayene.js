/**
 * SüperArı — Kolay muayene: adım adım hızlı kovan muayenesi.
 * Her ekranda tek soru, büyük seçenek düğmeleri, ilerleme çubuğu, Atla / Geri, isteğe bağlı 🎤 not ve 📷 fotoğraf.
 * Kayıtlar mevcut depolara yazılır (yeni depo yok): koloni gücü (muayene) + yavru durumu (ana memesi dahil) kayıtları,
 * kovan sakinliği, bal katı durumu (Bakım planı), görevler. Oğul riski ve sağlık durumu bu kayıtlardan yeniden hesaplanır.
 * Kayıtlı muayenesi olmayan kovanda «İlk muayene» (15 adım) açılır.
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoOf(new Date()); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }
  var VER = (function () { var s = document.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || ''); return m ? '?v=' + m[1] : ''; })();
  var loading = {};
  function need(file, name) {
    if (global[name]) return Promise.resolve(global[name]);
    if (loading[file]) return loading[file];
    loading[file] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = file + VER;
      s.onload = function () { global[name] ? res(global[name]) : rej(new Error(name)); };
      s.onerror = function () { loading[file] = null; rej(new Error(name)); };
      document.head.appendChild(s);
    });
    return loading[file];
  }
  /** Bağımlılıklar (sayfada yoksa): Bakım planı (besleme hesabı, bal katı), koloni.js (sesle not). */
  function deps() {
    return need('ilac-katalog.js', 'SuperAriIlac').catch(function () { return null; })
      .then(function () { return need('bakim-plan.js', 'SuperAriPlan').catch(function () { return null; }); })
      .then(function () { return need('koloni.js', 'SuperAriKoloni').catch(function () { return null; }); });
  }

  /* ---------------- Adımlar ---------------- */
  var S = {
    giris: { id: 'giris', icon: '🚪', q: 'Uçuş deliği / giriş nasıl?', help: 'Kovanı açmadan önce 1 dakika girişe bakın.', opts: [
      ['yogun', 'Yoğun trafik, polen taşıyor'], ['normal', 'Normal'], ['zayif', 'Zayıf / sessiz'], ['olu', 'Ölü veya sürünen arı var'], ['yagma', 'Yağma / kavga var']] },
    ana: { id: 'ana', icon: '👑', q: 'Ana arı veya yumurta görüldü mü?', help: 'Yumurta görmek anayı görmek kadar iyidir (son 3 gün ana vardı).', opts: [
      ['anaYumurta', 'Ana + yumurta'], ['yumurta', 'Yumurta var (ana görülmedi)'], ['ana', 'Ana var, yumurta yok'], ['larva', 'Yalnız larva / kapalı yavru'], ['hicbiri', 'Ne ana ne yumurta']] },
    yavru: { id: 'yavru', icon: '🥚', q: 'Yavru düzeni', help: 'Yavrulu çerçevenin ortasına bakın.', opts: [
      ['duzenli', 'Düzenli, dolu'], ['biraz', 'Biraz boşluklu'], ['daginik', 'Dağınık (çok boşluk)'], ['yok', 'Yavru yok']] },
    kapali: { id: 'kapali', icon: '🟫', q: 'Kapalı yavru kapakları', help: 'Kapakların rengi ve şekli.', opts: [
      ['iyi', 'Düzgün, hafif kubbeli'], ['birkac', 'Birkaç delikli / çökük'], ['cok', 'Çok sayıda delikli / çökük']] },
    cerceve: { id: 'cerceve', icon: '🖼', q: 'Arı ile kaplı çerçeve sayısı', help: 'Her iki yüzü çoğunlukla arıyla kaplı çerçeveleri sayın.', stepper: true },
    /* Bal ve oğul memesi: tam çerçeve sayısı (Az/Çok yok) — büyük +/− ve sesle sayı */
    stok: { id: 'stok', icon: '🍯', q: 'Ballı çerçeve sayısı', help: 'Balla dolu (çoğu kapalı) çerçeveleri tek tek sayın.', count: { max: 30, label: 'Ballı çerçeve', unit: 'çerçeve' } },
    ogul: { id: 'ogul', icon: '🐝', q: 'Oğul memeli çerçeve sayısı', help: 'Alt kenarında oğul memesi olan çerçeveleri sayın. Yoksa 0.', count: { max: 20, label: 'Oğul memeli çerçeve', unit: 'çerçeve', zero: 'Yok (0)' } },
    meme: { id: 'meme', icon: '🏺', q: 'Başka ana memesi var mı?', help: 'Petek ortasında (sessiz değiştirme) veya genç larvadan acil meme.', opts: [
      ['yok', 'Yok'], ['yenileme', 'Petek ortası — sessiz ana değiştirme'], ['acil', 'Acil — genç larvadan (anasız)']] },
    varroa: { id: 'varroa', icon: '🕷', q: 'Varroa', help: 'Arıların sırtında akar veya bozuk kanatlı arı.', opts: [
      ['yok', 'Görülmedi'], ['az', 'Birkaç akar'], ['cok', 'Çok akar / bozuk kanatlı arılar'], ['sayim', 'Sayım yapacağım']] },
    hastalik: { id: 'hastalik', icon: '🔍', q: 'Hastalık belirtisi var mı?', help: 'Çökük/delikli kapak, kötü koku, mumya, ishal lekesi, güve.', opts: [
      ['yok', 'Yok'], ['var', 'Var / şüpheli']] },
    huy: { id: 'huy', icon: '🐝', q: 'Huy (muayenede)', help: 'Arılar nasıl davrandı?', opts: [
      ['5', 'Çok sakin'], ['4', 'Sakin'], ['3', 'Orta'], ['2', 'Sinirli'], ['1', 'Çok sinirli']] },
    yer: { id: 'yer', icon: '📦', q: 'Yer durumu / kat', help: 'Kovanda boş çerçeve kaldı mı? Altta kovanın gövde / kat sayısını düzeltin.', opts: [
      ['bol', 'Bol yer var'], ['dolmak', 'Dolmak üzere'], ['dolu', 'Dolu / sıkışık'], ['kat', 'Bal katı takılı, yer var']] },
    kutu: { id: 'kutu', icon: '🏠', q: 'Kovan kutusu ve yeri', help: 'Kutu, kapak, taban ve kovanın durduğu yer.', opts: [
      ['iyi', 'İyi'], ['catlak', 'Çatlak / aralık var'], ['nem', 'Nemli / küflü'], ['yer', 'Güneş / rüzgâr / su baskını sorunu']] },
    anayas: { id: 'anayas', icon: '🎨', q: 'Ana arı yaşı', help: 'Biliyorsanız seçin; kayda yazılır.', opts: [
      ['0', 'Bu yıl'], ['1', 'Geçen yıl'], ['2', '2 yaş ve üstü'], ['?', 'Bilinmiyor']] },
    petek: { id: 'petek', icon: '🟨', q: 'Petek durumu', help: 'Peteklerin rengi ve yaşı.', opts: [
      ['yeni', 'Yeni / açık renkli'], ['orta', 'Orta'], ['eski', 'Eski / koyu (yenilenmeli)']] },
    genel: { id: 'genel', icon: '⭐', q: 'Genel izlenim', help: 'Kovan için kısa değerlendirmeniz.', opts: [
      ['iyi', 'İyi'], ['orta', 'Orta'], ['kotu', 'Kötü — yakında tekrar bakılmalı']] }
  };
  var ROUTINE = ['ana', 'yavru', 'cerceve', 'stok', 'ogul', 'meme', 'huy', 'hastalik', 'yer'];
  var FIRST = ['giris', 'ana', 'yavru', 'kapali', 'cerceve', 'stok', 'ogul', 'meme', 'varroa', 'hastalik', 'huy', 'yer', 'kutu', 'anayas', 'petek', 'genel'];
  function optLabel(id, v) { var s = S[id]; if (s && s.count) return v == null ? '' : (Number(v) === 0 && s.count.zero ? 'yok' : v + ' ' + (s.count.unit || 'çerçeve')); if (!s || !s.opts) return ''; var o = s.opts.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }

  function isFirst(h) {
    try {
      var r = D.records.status(h.id).records;
      return !r.strength.length && !r.brood.length && !r.disease.length && !r.feed.length;
    } catch (e) { return false; }
  }

  /* ---------------- Kayıt ve öneriler ---------------- */
  function build(h, st) {
    var a = st.ans, last = null; try { last = D.records.status(h.id).strength; } catch (e) { last = null; }
    var out = { strength: null, brood: null, calm: null, superOn: null, queenYear: null, lines: [] };
    var parts = [];
    st.steps.forEach(function (id) {
      if (id === 'cerceve') { if (a.cerceve) parts.push(a.cerceve.bee + ' arılı' + (a.cerceve.brood != null ? ', ' + a.cerceve.brood + ' yavrulu' : '') + ' çerçeve'); return; }
      if (S[id].count) { if (a[id] != null) parts.push((id === 'stok' ? 'Bal' : 'Oğul memesi') + ': ' + a[id] + ' çerçeve'); return; }
      if (a[id] != null) parts.push(S[id].q.replace(/\?$/, '').split(' (')[0] + ': ' + optLabel(id, a[id]).toLocaleLowerCase('tr'));
    });
    var notes = st.steps.map(function (id) { return st.notes[id] ? S[id].icon + ' ' + st.notes[id] : ''; }).filter(Boolean);
    var note = ('Kolay muayene' + (st.first ? ' (ilk muayene)' : '') + (notes.length ? ' · ' + notes.join(' · ') : '') + (mode() === 'demo' ? ' · Demo' : '')).slice(0, 300);
    out.lines = parts;
    var bee = a.cerceve ? a.cerceve.bee : (last ? last.beeFrames : null);
    if (bee != null && (a.cerceve || a.stok != null || a.yer)) {
      out.strength = { date: today(), beeFrames: bee, broodFrames: a.cerceve && a.cerceve.brood != null ? a.cerceve.brood : (last ? last.broodFrames : 0),
        honeyFrames: a.stok != null ? Number(a.stok) : (last ? last.honeyFrames : 0), pollenFrames: last ? last.pollenFrames : 0, inspection: true, note: note };
      if (a.yer) out.strength.space = a.yer;
      if (mode() === 'demo') out.strength.demo = true;
    }
    if (a.ana || a.yavru || a.meme || a.ogul != null) {
      var eggs = a.ana ? (a.ana === 'anaYumurta' || a.ana === 'yumurta') : true;
      var noQueen = a.ana === 'hicbiri' && (a.yavru === 'yok' || a.yavru == null);
      out.brood = { date: today(), eggs: eggs, pattern: a.yavru === 'daginik' || a.yavru === 'yok' ? 'daginik' : 'duzenli', queenCell: Number(a.ogul) > 0 ? 'ogul' : (a.meme || 'yok'), queenless: noQueen, note: note };
      if (a.ogul != null) out.brood.swarmCellFrames = Number(a.ogul);
      if (mode() === 'demo') out.brood.demo = true;
    }
    var insp = out.brood || out.strength;
    if (insp) {
      if (a.varroa === 'az' || a.varroa === 'cok') insp.varroaSeen = a.varroa;
      if (a.hastalik === 'var') insp.diseaseSign = true;
    }
    if (a.huy) out.calm = Number(a.huy);
    if (a.yer === 'kat') out.superOn = true;
    if (st.box && (st.boxTouched || (a.yer === 'kat' && !st.box.kat))) {
      var bx = { body: st.box.body, kat: st.box.kat, ballik: st.box.ballik };
      if (a.yer === 'kat' && !bx.kat) { bx.kat = 1; bx.ballik = true; }
      out.boxes = bx;
    }
    if (a.anayas && a.anayas !== '?' && h.queenYear == null) out.queenYear = new Date().getFullYear() - Number(a.anayas);
    return out;
  }
  function suggestions(h, st, plan) {
    var a = st.ans, T = [];
    function t(title, p, d, why) { T.push({ title: title, priority: p, due: plusDays(d), why: why || '' }); }
    var bee = a.cerceve ? a.cerceve.bee : null, P = global.SuperAriPlan;
    var bxS = st.box || null;
    var hasSup = a.yer === 'kat' || (bxS ? (bxS.kat > 0 || bxS.ballik) : (P && P.hasSuper && P.hasSuper(h.id)));
    if (a.ana === 'hicbiri') {
      if (a.yavru === 'yok' || a.yavru == null) t('Anasız görünüyor: ana ver veya güçlü bir kovanla birleştir', 1, 1, 'Ne ana ne yumurta, yavru yok');
      else t('Ana kontrolü: 3–4 gün sonra yumurta var mı bak (anasız olabilir)', 2, 4, 'Ana ve yumurta görülmedi');
    }
    if (a.ana === 'ana' && a.yavru === 'yok') t('Ana yumurtlamıyor: 1 hafta içinde tekrar kontrol et, gerekirse ana değiştir', 2, 7);
    if (Number(a.ogul) > 0) t('Oğul memesi (' + a.ogul + ' çerçeve): bölme yap veya yer aç (kat / boş çerçeve)', 1, 1, a.ogul + ' çerçevede oğul memesi');
    if (a.meme === 'yenileme') t('Sessiz ana değiştirme: memelere dokunma, 2–3 hafta sonra yumurta kontrolü', 3, 18);
    var cap = bxS ? 10 * (bxS.body + Math.max(bxS.kat, a.yer === 'kat' ? 1 : 0)) : (hasSup ? 20 : 10);
    if (a.yer === 'dolu' || (bee != null && bee / cap >= 0.9)) t(hasSup ? 'Yer dar: ikinci kat / boş çerçeve ver' : 'Yer dar: kat at (bal katı ver)', 1, 1, 'Kovan dolu');
    else if (a.yer === 'dolmak' || (bee != null && bee / cap >= 0.8)) t(hasSup ? 'Kovan dolmak üzere: boş çerçeve hazırla' : 'Kovan dolmak üzere: kat atmaya hazırlan', 2, 5);
    if (a.stok != null && Number(a.stok) < 2 && plan && plan.feed && P) {
      var fp = plan.feed;
      if (fp.need) t('Besleme: ' + P.feedText(fp), 1, 1, 'Stok az · besleme hesabı (tahmin)');
      else t('Stok az: 1 hafta içinde stoğu tekrar kontrol et', 2, 7, P.feedText(fp));
    } else if (a.stok != null && Number(a.stok) < 2) t('Stok az: beslemeyi planla (Bakım yap › Besleme)', 1, 2, 'Stok az');
    if (a.varroa === 'cok') t('Varroa: akar sayımı yap ve ilaçlamayı planla (Bakım yap › Varroa)', 1, 2);
    else if (a.varroa === 'sayim' || a.varroa === 'az') t('Varroa sayımı yap (≈300 arı)', 2, 3);
    if (a.hastalik === 'var' || a.kapali === 'cok') t('Hastalık belirtisi: Hastalık tahmini yap, gerekirse numune gönder', 1, 1);
    if (a.giris === 'yagma') t('Yağma: uçuş deliğini daralt, açıkta bal/şurup bırakma', 1, 0);
    if (a.giris === 'olu') t('Kovan önünde ölü/sürünen arı: zehirlenme ve hastalık kontrolü', 1, 1);
    if (a.huy === '1') t('Çok sinirli koloni: ana değişimini değerlendir', 3, 14);
    if (a.kutu && a.kutu !== 'iyi') t(a.kutu === 'catlak' ? 'Kovan kutusunu onar (çatlak / aralık)' : a.kutu === 'nem' ? 'Nem: havalandırmayı artır, kovanı yerden yükselt' : 'Kovanın yerini düzelt (güneş / rüzgâr / su)', 2, 7);
    if (a.petek === 'eski') t('Eski petekleri yenile (ilkbahar / bal akımında)', 3, 30);
    if (a.genel === 'kotu') t('Kovanı yakında tekrar muayene et', 2, 7);
    if (bee != null && bee <= 3 && !a.hastalik) t('Zayıf koloni: birleştirmeyi veya çerçeve azaltmayı değerlendir', 2, 7);
    return T;
  }

  /* ---------------- Arayüz ---------------- */
  var css = '.km-back{position:fixed;inset:0;background:rgba(30,20,10,.5);z-index:8990;display:flex;align-items:stretch;justify-content:center;}' +
    '.km{background:#fffaf2;width:100%;max-width:560px;height:100%;display:flex;flex-direction:column;box-sizing:border-box;color:#3d2616;overflow-wrap:anywhere;}' +
    '.km-head{padding:10px 12px 8px;border-bottom:1px solid #eadfcd;background:#fff6e6;}.km-top{display:flex;align-items:center;gap:8px;}' +
    '.km-top b{font-size:16px;flex:1;min-width:0;}.km-mic{flex:none;border:1px solid #e56f1c;background:#fff;color:#b4530a;border-radius:999px;padding:6px 10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;min-height:36px;white-space:nowrap;}.km-x{flex:none;border:0;background:#efe4d2;border-radius:999px;width:36px;height:36px;font-size:20px;cursor:pointer;}' +
    '.km-sub{font-size:12px;color:#6b5a48;margin-top:2px;}.km-bar{height:8px;background:#efe4d2;border-radius:99px;overflow:hidden;margin-top:8px;}.km-bar i{display:block;height:100%;background:linear-gradient(90deg,#f0a202,#e56f1c);transition:width .2s;}' +
    '.km-body{flex:1;overflow:auto;padding:14px 12px;}.km-q{font-size:20px;font-weight:800;margin:4px 0 4px;line-height:1.25;}.km-help{font-size:13px;color:#6b5a48;margin:0 0 12px;}' +
    '.km-opts{display:grid;gap:8px;}.km-opt{font:inherit;font-size:17px;font-weight:700;text-align:left;min-height:56px;padding:12px 14px;border-radius:14px;border:2px solid #e0cfb3;background:#fff;color:#3d2616;cursor:pointer;}' +
    '.km-opt.on{border-color:#e56f1c;background:#fff1de;box-shadow:inset 0 0 0 1px #e56f1c;}.km-opt:active{transform:scale(.99);}' +
    '.km-step{display:flex;align-items:center;justify-content:center;gap:14px;margin:8px 0 4px;}.km-step button{font:inherit;font-size:30px;font-weight:800;width:64px;height:64px;border-radius:16px;border:2px solid #e0cfb3;background:#fff;color:#3d2616;cursor:pointer;}' +
    '.km-step output{font-size:40px;font-weight:900;min-width:64px;text-align:center;}.km-step.sm button{width:48px;height:48px;font-size:24px;}.km-step.sm output{font-size:28px;}' +
    '.km-lbl{text-align:center;font-size:13px;font-weight:700;color:#6b5a48;margin-top:10px;}' +
    '.km-tools{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}.km-tool{font:inherit;font-size:14px;font-weight:700;border-radius:12px;padding:9px 12px;border:1px solid #c9b79c;background:#fff;color:#3d2616;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}' +
    '.km-note{margin-top:10px;}.km-note textarea{width:100%;box-sizing:border-box;min-height:64px;font:inherit;font-size:15px;border-radius:10px;border:1px solid #c9b79c;padding:8px;}' +
    '.km-foot{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eadfcd;background:#fffdf8;}' +
    '.km-foot button{flex:1;font:inherit;font-size:16px;font-weight:800;min-height:50px;border-radius:14px;border:1px solid #c9b79c;background:#fff;color:#3d2616;cursor:pointer;}' +
    '.km-foot button.pri{background:#3d2616;color:#fff;border-color:#3d2616;}.km-foot button:disabled{opacity:.45;}' +
    '.km-sum{border:1px solid #eadfcd;background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;}.km-sum h3{margin:0 0 6px;font-size:15px;}' +
    '.km-row{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;padding:6px 0;border-top:1px solid #f1e8da;font-size:14px;}.km-row:first-of-type{border-top:0;}' +
    '.km-row button{flex:none;font:inherit;font-size:12px;border:0;background:none;color:#2b6cb0;text-decoration:underline;cursor:pointer;padding:0;}' +
    '.km-task{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-top:1px solid #f1e8da;font-size:14px;cursor:pointer;}.km-task:first-of-type{border-top:0;}' +
    '.km-task input{width:20px !important;height:20px;flex:none;margin:1px 0 0;}.km-task span{flex:1;min-width:0;}.km-task small{display:block;color:#6b5a48;font-size:12px;}' +
    '.km-ok{background:#ebfbee;border:1px solid #b2f2bb;color:#1b5e20;border-radius:12px;padding:10px;font-size:14px;margin-bottom:10px;}' +
    '.km-warn{background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;border-radius:10px;padding:8px;font-size:13px;margin:8px 0;}' +
    '.km-link{font:inherit;font-size:15px;font-weight:800;width:100%;min-height:48px;border-radius:12px;border:2px solid #e56f1c;background:#fff;color:#b3470b;cursor:pointer;margin-top:10px;}' +
    '.km-akis .km-opts{gap:12px;}.km-akis .km-opt{min-height:64px;font-size:18px;}.km-akis .km-foot{gap:12px;}.km-akis .km-foot button{min-height:64px;font-size:17px;}' +
    '.km-step.km-count{gap:18px;}.km-step.km-count button{width:88px;height:88px;font-size:44px;border-color:#1c5fa8;color:#0d3d73;}.km-step.km-count output{font-size:60px;min-width:90px;}' +
    '.km-akis .km-step button{width:72px;height:72px;}.km-akis .km-step.km-count button{width:88px;height:88px;}.km-akis .km-step.sm button{width:64px;height:64px;}.km-akis .km-x{width:48px;height:48px;}.km-akis .km-mic{min-height:48px;}.km-akis .km-tool{min-height:48px;}' +
    '.km-thumbs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}.km-thumbs img{width:56px;height:56px;object-fit:cover;border-radius:8px;}';
  function ensureCss() { if (document.getElementById('kmCss')) return; var s = document.createElement('style'); s.id = 'kmCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { try { if (global.SuperAriSesle) global.SuperAriSesle.stop(); } catch (e) { /* ignore */ } var b = document.getElementById('kmSheet'); if (b) { b.remove(); document.body.style.overflow = ''; } }

  function open(hiveId, opts) {
    opts = opts || {}; D = global.SuperAriDemo;
    var h = D && D.hiveById(hiveId); if (!h) return;
    ensureCss(); close();
    var first = opts.first != null ? !!opts.first : isFirst(h);
    var last = null; try { last = D.records.status(h.id).strength; } catch (e) { last = null; }
    var st = { first: first, steps: (first ? FIRST : ROUTINE).slice(), i: 0, ans: {}, cnt: {}, notes: {}, photos: {}, noteOpen: {}, done: null, t0: Date.now(),
      bee: last ? last.beeFrames : 5, brood: last ? last.broodFrames : 3, sel: {} };
    try { var b0 = D.colony.boxes ? D.colony.boxes(h) : null; if (b0) st.box = { body: b0.body, kat: b0.kat, ballik: b0.ballik, known: b0.known }; } catch (e) { st.box = null; }
    var back = document.createElement('div'); back.className = 'km-back'; back.id = 'kmSheet';
    back.innerHTML = '<div class="km' + (opts.akis ? ' km-akis' : '') + '" role="dialog" aria-modal="true" aria-label="Kolay muayene"><div class="km-head"><div class="km-top"><b data-km-title></b><button type="button" class="km-mic" data-km-voice-start aria-label="Sesle başlat">🎙 Sesle başlat</button><button type="button" class="km-x" data-km-close aria-label="Kapat">×</button></div>' +
      '<div class="km-sub" data-km-sub></div><div class="km-bar"><i data-km-bar></i></div></div><div class="km-voice" data-km-voice hidden></div><form class="km-body" data-km-body autocomplete="off" onsubmit="return false"></form><div class="km-foot" data-km-foot></div></div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var body = back.querySelector('[data-km-body]'), foot = back.querySelector('[data-km-foot]');
    deps().then(function () { if (st.i < st.steps.length) render(); });

    function cntVal(id) {
      if (st.cnt[id] != null) return st.cnt[id];
      if (st.ans[id] != null) return Number(st.ans[id]);
      if (id === 'stok' && last && last.honeyFrames != null) return Number(last.honeyFrames) || 0;
      return 0;
    }
    function head() {
      var n = st.steps.length, fin = st.i >= n;
      back.querySelector('[data-km-title]').textContent = (opts.akis ? 'Hızlı muayene' : (st.first ? 'İlk muayene' : 'Kolay muayene')) + ' · ' + h.name;
      back.querySelector('[data-km-sub]').innerHTML = fin ? 'Özet' + (mode() === 'demo' ? ' · Demo' : '') :
        'Adım ' + (st.i + 1) + ' / ' + n + (mode() === 'demo' ? ' · Demo' : '') + (st.i === 0 ? ' · <a href="#" data-km-variant style="color:#2b6cb0;">' + (st.first ? 'Kısa muayeneye geç (' + ROUTINE.length + ' adım)' : 'İlk muayene (' + FIRST.length + ' adım)') + '</a>' : '');
      back.querySelector('[data-km-bar]').style.width = Math.round((fin ? 1 : st.i / n) * 100) + '%';
    }
    function tools(id) {
      var ph = st.photos[id] || [];
      return '<div class="km-tools"><button type="button" class="km-tool" data-km-note>🎤 Not' + (st.notes[id] ? ' ✓' : '') + '</button>' +
        '<label class="km-tool">📷 Fotoğraf' + (ph.length ? ' (' + ph.length + ')' : '') + '<input type="file" accept="image/*" capture="environment" data-km-photo hidden></label></div>' +
        (ph.length ? '<div class="km-thumbs">' + ph.map(function (p) { return '<img alt="" src="' + p.url + '">'; }).join('') + '</div>' : '') +
        (st.noteOpen[id] || st.notes[id] ? '<div class="km-note"><textarea name="note" maxlength="200" placeholder="Kısa not (isteğe bağlı)" data-km-notetext>' + esc(st.notes[id] || '') + '</textarea></div>' : '');
    }
    /* Sesle muayene (sesle-muayene.js) için denetim arayüzü */
    var vKey = null;
    var vapi = {
      bar: function () { return back.querySelector('[data-km-voice]'); },
      cur: function () { var n = st.steps.length; if (st.i >= n) return { summary: true, done: !!st.done }; var id = st.steps[st.i]; return { id: id, def: S[id], i: st.i, n: n, ans: st.ans[id] }; },
      answer: function (id, v) {
        if (S[id] && S[id].count) { v = Math.max(0, Math.min(S[id].count.max, Math.round(Number(v) || 0))); st.cnt[id] = v; }
        st.ans[id] = v; st.sugg = null; st.selInit = false;
        if (id === 'yer' && v === 'kat' && st.box && !st.box.kat) { st.box.kat = 1; st.box.ballik = true; st.boxTouched = true; }
        advance();
      },
      frames: function (bee, brood) {
        if (bee != null) st.bee = Math.max(0, Math.min(30, bee));
        if (brood != null) st.brood = Math.max(0, Math.min(20, brood));
        if (st.brood > st.bee) st.bee = st.brood;
        st.ans.cerceve = { bee: st.bee, brood: st.brood }; st.sugg = null; st.selInit = false; advance();
      },
      back: function () { if (st.i > 0 && !st.done) { st.i = Math.min(st.i, st.steps.length) - 1; render(); } else { vKey = null; render(); } },
      skip: function () { advance(); },
      save: function (andNext) { if (st.done) return; vapi.viaVoice = true; save(!!andNext && !!nextHive()); },
      goNext: function () { vapi.viaVoice = true; goNext(); },
      note: function (txt) { var id = st.steps[Math.min(st.i, st.steps.length - 1)]; st.notes[id] = ((st.notes[id] ? st.notes[id] + ' ' : '') + txt).slice(0, 200); },
      optLabel: optLabel, onRender: null, viaVoice: false
    };
    function voiceStart(resume) {
      need('sesle-muayene.js', 'SuperAriSesle').then(function (V) { V.start(vapi, { resume: !!resume }); })
        .catch(function () { var b = vapi.bar(); if (b) { b.hidden = false; b.className = 'km-voice unsup'; b.textContent = 'Sesle muayene yüklenemedi; dokunarak devam edin.'; } });
    }
    function render() {
      renderCore();
      var k = st.i + '|' + (st.done ? 1 : 0) + '|' + st.steps.length;
      if (vapi.onRender && k !== vKey) { vKey = k; setTimeout(function () { if (vapi.onRender) vapi.onRender(); }, 0); }
      else vKey = k;
    }
    function renderCore() {
      head();
      var n = st.steps.length;
      if (st.i >= n) return renderSum();
      var id = st.steps[st.i], s = S[id], H = '<div class="km-q">' + s.icon + ' ' + esc(s.q) + '</div><p class="km-help">' + esc(s.help) + '</p>';
      if (s.stepper) {
        H += '<div class="km-lbl">Arılı çerçeve</div><div class="km-step"><button type="button" data-km-inc="bee" data-d="-1" aria-label="Azalt">−</button><output data-km-out="bee">' + st.bee + '</output><button type="button" data-km-inc="bee" data-d="1" aria-label="Artır">+</button></div>' +
          '<div class="km-lbl">Yavrulu çerçeve</div><div class="km-step sm"><button type="button" data-km-inc="brood" data-d="-1" aria-label="Azalt">−</button><output data-km-out="brood">' + st.brood + '</output><button type="button" data-km-inc="brood" data-d="1" aria-label="Artır">+</button></div>' +
          (last ? '<p class="km-help" style="text-align:center;">Son kayıt: ' + last.beeFrames + ' arılı, ' + last.broodFrames + ' yavrulu</p>' : '');
      } else if (s.count) {
        var cv = cntVal(id);
        H += '<div class="km-lbl">' + esc(s.count.label) + '</div><div class="km-step km-count" role="group" aria-label="' + esc(s.count.label) + '"><button type="button" data-km-cnt="' + id + '" data-d="-1" aria-label="Azalt">−</button><output data-km-out="cnt" aria-live="polite">' + cv + '</output><button type="button" data-km-cnt="' + id + '" data-d="1" aria-label="Artır">+</button></div>' +
          '<p class="km-help" style="text-align:center;">' + (id === 'stok' && last ? 'Son kayıt: ' + last.honeyFrames + ' ballı çerçeve · ' : '') + 'Sesle sayıyı söyleyin: «' + (id === 'stok' ? 'dört' : 'iki') + '»' + (s.count.zero ? ' · yoksa «yok»' : '') + '</p>';
      } else {
        H += '<div class="km-opts">' + s.opts.map(function (o) { return '<button type="button" class="km-opt' + (st.ans[id] === o[0] ? ' on' : '') + '" data-km-opt="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>';
        if (id === 'hastalik' && st.ans.hastalik === 'var') H += '<button type="button" class="km-link" data-km-hz>🔍 Hastalık tahminini aç (rehberli fotoğraf)</button>';
        if (id === 'ana' && st.ans.ana === 'hicbiri') H += '<div class="km-warn">Ana ve yumurta görülmedi. Sonraki adımda yavru durumuna göre öneri verilir.</div>';
        if (id === 'yer' && st.box) H += boxEditor();
      }
      H += tools(id);
      body.innerHTML = H;
      if (st.noteOpen[id] && global.SuperAriKoloni && global.SuperAriKoloni.addMicButtons) global.SuperAriKoloni.addMicButtons(body);
      foot.innerHTML = '<button type="button" data-km-back' + (st.i === 0 ? ' disabled' : '') + '>← Geri</button>' +
        (s.stepper || s.count ? '<button type="button" data-km-skip>Atla</button><button type="button" class="pri" data-km-next>İleri →</button>' : '<button type="button" data-km-skip>' + (st.ans[id] != null ? 'İleri →' : 'Atla →') + '</button>');
    }
    function boxEditor() {
      var b = st.box;
      return '<div class="km-sum" style="margin-top:12px;"><h3>🏠 Kovan kutusu' + (b.known || st.boxTouched ? '' : ' <small style="font-weight:400;color:#6b5a48;">(kayıtlı değil — kontrol edin)</small>') + '</h3>' +
        '<div class="km-lbl">Gövde (kuluçkalık)</div><div class="km-step sm"><button type="button" data-km-box="body" data-d="-1" aria-label="Gövde azalt">−</button><output data-km-bout="body">' + b.body + '</output><button type="button" data-km-box="body" data-d="1" aria-label="Gövde artır">+</button></div>' +
        '<div class="km-lbl">Kat</div><div class="km-step sm"><button type="button" data-km-box="kat" data-d="-1" aria-label="Kat azalt">−</button><output data-km-bout="kat">' + b.kat + '</output><button type="button" data-km-box="kat" data-d="1" aria-label="Kat artır">+</button></div>' +
        '<label class="km-task" style="border:0;justify-content:center;"><input type="checkbox" data-km-ballik' + (b.ballik ? ' checked' : '') + '><span style="flex:none;">Ballık takılı (ana ızgaralı bal katı)</span></label>' +
        '<p class="km-help" style="text-align:center;margin:4px 0 0;" data-km-blabel>' + esc(boxText(b)) + '</p></div>';
    }
    function boxText(b) { return b.body + ' gövde' + (b.kat ? ' + ' + b.kat + ' kat' : '') + (b.ballik ? ' (ballık takılı)' : '') + ' · ' + (10 * (b.body + b.kat)) + ' çerçeve yer'; }
    function planFor() {
      var P = global.SuperAriPlan; if (!P) return null;
      var out = {};
      try {
        var hs = P.hiveState(h);
        var b = build(h, st);
        if (b.strength) { hs.honeyFrames = b.strength.honeyFrames; hs.beeFrames = b.strength.beeFrames; }
        out.feed = P.feedPlan(h, hs);
      } catch (e) { out.feed = null; }
      return out;
    }
    function renderSum() {
      var b = build(h, st), plan = planFor(), sug = st.sugg || (st.sugg = suggestions(h, st, plan));
      if (!st.selInit) { sug.forEach(function (x, i) { st.sel[i] = true; }); st.selInit = true; }
      var secs = Math.round((Date.now() - st.t0) / 1000);
      var H = '';
      if (st.done) H += '<div class="km-ok">' + st.done + '</div>' + (st.result || '');
      H += '<div class="km-sum"><h3>Özet' + (secs < 600 ? ' · ' + (secs < 60 ? secs + ' sn' : Math.floor(secs / 60) + ' dk ' + (secs % 60) + ' sn') : '') + '</h3>' +
        st.steps.map(function (id, i) {
          var v = id === 'cerceve' ? (st.ans.cerceve ? st.ans.cerceve.bee + ' arılı · ' + st.ans.cerceve.brood + ' yavrulu' : '') : (S[id].count ? (st.ans[id] != null ? st.ans[id] + ' çerçeve' : '') : optLabel(id, st.ans[id]));
          return '<div class="km-row"><span>' + S[id].icon + ' ' + esc(S[id].q.replace(/\?$/, '')) + ': <b>' + esc(v || 'atlandı') + '</b>' + (st.notes[id] ? '<br><small>📝 ' + esc(st.notes[id]) + '</small>' : '') + ((st.photos[id] || []).length ? ' <small>📷 ' + st.photos[id].length + '</small>' : '') + '</span>' +
            (st.done ? '' : '<button type="button" data-km-goto="' + i + '">Değiştir</button>') + '</div>';
        }).join('') + '</div>';
      H += '<div class="km-sum"><h3>' + (st.done ? 'Kaydedilenler' : 'Kaydedilecekler') + '</h3>' +
        (b.strength ? '<div class="km-row"><span>💪 Koloni gücü / muayene: ' + b.strength.beeFrames + ' arılı, ' + b.strength.broodFrames + ' yavrulu, ' + b.strength.honeyFrames + ' bal çerçevesi' + (b.strength.space ? ' · yer: ' + esc(optLabel('yer', b.strength.space).toLocaleLowerCase('tr')) : '') + '</span></div>' : '') +
        (b.brood ? '<div class="km-row"><span>🥚 Yavru durumu: ' + (b.brood.eggs ? 'yumurta var' : 'yumurta yok') + ', ' + (b.brood.pattern === 'duzenli' ? 'düzenli' : 'dağınık') + (b.brood.queenCell !== 'yok' ? ' · ana memesi: ' + esc(optLabel('meme', b.brood.queenCell).toLocaleLowerCase('tr')) : '') + (b.brood.queenless ? ' · anasız' : '') + '</span></div>' : '') +
        (b.calm ? '<div class="km-row"><span>🐝 Sakinlik: ' + esc(optLabel('huy', String(b.calm))) + '</span></div>' : '') +
        (b.boxes ? '<div class="km-row"><span>🏠 Kovan kutusu: ' + esc(boxText(b.boxes)) + '</span></div>' : (b.superOn ? '<div class="km-row"><span>📦 Bal katı takılı olarak işaretlenir</span></div>' : '')) +
        (b.queenYear ? '<div class="km-row"><span>🎨 Ana yılı: ' + b.queenYear + '</span></div>' : '') +
        (!b.strength && !b.brood && !b.calm && !b.boxes ? '<p class="km-help">Kaydedilecek bilgi yok; en az bir adımı yanıtlayın.</p>' : '<p class="km-help" style="margin:6px 0 0;">Oğul riski, sağlık durumu ve görevler bu kayıtlardan yeniden hesaplanır.</p>') + '</div>';
      if (!opts.akis) H += '<div class="km-sum"><h3>Önerilen görevler</h3>' + (sug.length ? sug.map(function (x, i) {
        return '<label class="km-task"><input type="checkbox" data-km-sel="' + i + '"' + (st.sel[i] ? ' checked' : '') + (st.done ? ' disabled' : '') + '><span>' + esc(x.title) + (x.why ? '<small>' + esc(x.why) + '</small>' : '') + '</span></label>';
      }).join('') : '<p class="km-help" style="margin:0;">Ek görev önerisi yok.</p>') + '</div>';
      if (st.ans.hastalik === 'var' || st.ans.kapali === 'cok') H += '<button type="button" class="km-link" data-km-hz>🔍 Hastalık tahminini aç</button>';
      body.innerHTML = H;
      if (opts.akis) {
        H += '<p class="km-help" style="margin:6px 0 0;">Kaydettikten sonra bu muayeneye göre öneriler adım adım gelir.</p>';
        body.innerHTML = H;
        if (st.done) { foot.innerHTML = '<button type="button" disabled>Kaydediliyor…</button>'; return; }
        foot.innerHTML = '<button type="button" data-km-back style="min-height:64px;">← Geri</button><button type="button" class="pri" data-km-save style="min-height:64px;flex:2;">Kaydet ve önerilere geç →</button>';
        return;
      }
      var nx = nextHive();
      foot.innerHTML = st.done ? '<button type="button" data-km-close>Kapat</button>' + (nx ? '<button type="button" class="pri" data-km-gonext>Sıradaki: ' + esc(nx.name) + ' →</button>' : '')
        : '<button type="button" data-km-back>← Geri</button><button type="button" class="pri" data-km-save>Kaydet</button>' + (nx ? '<button type="button" class="pri" data-km-save="next">Kaydet + Sıradaki</button>' : '');
    }
    function nextHive() {
      if (typeof opts.next === 'function') return opts.next();
      var P = global.SuperAriPlan;
      try { return P && P.tourNext ? P.tourNext(String(opts.apiary || h.apiaryId), h.id) : null; } catch (e) { return null; }
    }
    function goNext() {
      var nx = nextHive(); var P = global.SuperAriPlan, ap = String(opts.apiary || h.apiaryId);
      try { if (P && P.tourMarkDone && String(h.apiaryId) === ap) P.tourMarkDone(ap, h.id); } catch (e) { /* ignore */ }
      if (typeof opts.onNext === 'function') { close(); opts.onNext(nx); return; }
      if (nx) location.href = 'bakim-yap.html?id=' + encodeURIComponent(nx.id) + '&apiary=' + encodeURIComponent(ap) + '&km=1' + (vapi.onRender || vapi.viaVoice ? '&ses=1' : '');
      else close();
    }
    function save(andNext) {
      var b = build(h, st), R = D.records, ids = [], msgs = [];
      if (!b.strength && !b.brood && !b.calm && !b.boxes) { global.alert && global.alert('Kaydedilecek bilgi yok; en az bir adımı yanıtlayın.'); return; }
      var s1 = b.strength ? R.add(h.id, 'strength', b.strength) : null; if (s1) { ids.push({ id: s1.id, kind: 'strength' }); msgs.push('muayene'); }
      var s2 = b.brood ? R.add(h.id, 'brood', b.brood) : null; if (s2) { ids.push({ id: s2.id, kind: 'brood' }); msgs.push('yavru durumu'); }
      var patch = {};
      if (b.calm) patch.calmness = b.calm;
      if (b.queenYear) patch.queenYear = b.queenYear;
      if (Object.keys(patch).length) { try { D.colony.updateHive(h.id, patch, 'correct'); msgs.push(b.queenYear ? 'sakinlik / ana yılı' : 'sakinlik'); } catch (e) { /* ignore */ } }
      var P = global.SuperAriPlan;
      if (b.boxes && D.colony.setBoxes) { D.colony.setBoxes(h.id, b.boxes); msgs.push('kovan kutusu'); }
      else if (b.superOn && P && P.setSuper) { P.setSuper(h.id, true); msgs.push('bal katı'); }
      var open = []; try { open = D.taskStore.open().map(function (x) { return x.title; }); } catch (e) { open = []; }
      var nt = 0;
      (opts.akis ? [] : (st.sugg || [])).forEach(function (x, i) {
        if (!st.sel[i]) return;
        var title = x.title + ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : '');
        if (open.indexOf(title) >= 0) return;
        if (D.taskStore.add({ title: title, hiveId: h.id, priority: x.priority, due: x.due, note: '[kolay-muayene]' })) nt++;
      });
      var h2 = D.hiveById(h.id), res = [];
      try { var cs = D.records.status(h.id); if (cs.strengthClass) res.push('Koloni: <b>' + esc(cs.strengthClass) + '</b>'); if (cs.queenless) res.push('<b>Anasız</b>'); } catch (e) { /* ignore */ }
      try { var sw = D.colony.swarm(h2); if (sw && sw.level) res.push('Oğul riski: <b>' + esc(sw.level) + '</b>'); } catch (e) { /* ignore */ }
      try { var SH = global.SuperAriSensorHealth; var ev = SH && SH.evaluateHive ? SH.evaluateHive(h2) : null; if (ev && ev.band) res.push('Sağlık: <b>' + esc(ev.band.label) + '</b>'); } catch (e) { /* ignore */ }
      st.result = res.length ? '<div class="km-sum"><h3>Güncel durum</h3><p style="margin:0;font-size:14px;line-height:1.5;">' + res.join(' · ') + '</p></div>' : '';
      var files = []; st.steps.forEach(function (id) { (st.photos[id] || []).forEach(function (p) { files.push(p.file); }); });
      st.done = '✓ Kaydedildi: ' + (msgs.join(', ') || '—') + (nt ? ' · ' + nt + ' görev' : '') + (files.length ? ' · fotoğraflar kaydediliyor…' : '') + '.';
      try { global.dispatchEvent(new Event('superari-records-changed')); } catch (e) { /* ignore */ }
      if (typeof opts.onSaved === 'function') { try { opts.onSaved(); } catch (e) { /* ignore */ } }
      function finish(np) {
        if (files.length) st.done = st.done.replace(' · fotoğraflar kaydediliyor…', np ? ' · ' + np + ' fotoğraf' : ' · fotoğraflar kaydedilemedi');
        if (typeof opts.afterSave === 'function') {
          var info = { ans: st.ans, notes: st.notes, lines: b.lines, strength: b.strength, brood: b.brood, calm: b.calm, boxes: b.boxes, msg: st.done, photos: np || 0, voice: !!vapi.onRender };
          close(); opts.afterSave(info); return;
        }
        if (andNext) goNext(); else render();
      }
      if (typeof opts.afterSave === 'function' && files.length && ids.length) { st.done = st.done.replace(' · fotoğraflar kaydediliyor…', ''); }
      if (!files.length || !ids.length) { finish(0); return; }
      render();
      need('foto.js', 'SuperAriFoto').then(function (F) {
        return files.reduce(function (p, f) { return p.then(function (acc) { return F.compress(f).then(function (c) { acc.push(c); return acc; }, function () { return acc; }); }); }, Promise.resolve([]))
          .then(function (items) { return F.attach(ids.map(function (x) { return x.id; }), items); })
          .then(function (rows) { ids.forEach(function (x) { try { R.setPhotoCount(h.id, x.kind, x.id, rows.length); } catch (e) { /* ignore */ } }); finish(rows.length); });
      }).catch(function () { finish(0); });
    }
    function advance() { st.i++; render(); body.scrollTop = 0; }
    back.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button,[data-km-variant]') : null;
      if (!t) return;
      var id = st.steps[st.i];
      if (t.hasAttribute('data-km-close')) { close(); return; }
      if (t.hasAttribute('data-km-voice-start')) { voiceStart(false); return; }
      if (t.hasAttribute('data-km-variant')) { e.preventDefault(); st.first = !st.first; st.steps = (st.first ? FIRST : ROUTINE).slice(); st.i = 0; st.sugg = null; st.selInit = false; render(); return; }
      if (t.hasAttribute('data-km-opt')) {
        st.ans[id] = t.getAttribute('data-km-opt'); st.sugg = null; st.selInit = false;
        if ((id === 'hastalik' && st.ans[id] === 'var') || (id === 'ana' && st.ans[id] === 'hicbiri') || (id === 'yer' && st.box)) {
          if (id === 'yer' && st.ans.yer === 'kat' && st.box && !st.box.kat) { st.box.kat = 1; st.box.ballik = true; st.boxTouched = true; }
          render(); return;
        }
        setTimeout(advance, 120); return;
      }
      if (t.hasAttribute('data-km-inc')) {
        var k = t.getAttribute('data-km-inc'), d = Number(t.getAttribute('data-d'));
        st[k] = Math.max(0, Math.min(k === 'bee' ? 30 : 20, (Number(st[k]) || 0) + d));
        if (k === 'bee' && st.brood > st.bee) st.brood = st.bee;
        if (k === 'brood' && st.brood > st.bee) st.bee = st.brood;
        back.querySelector('[data-km-out="bee"]').textContent = st.bee; back.querySelector('[data-km-out="brood"]').textContent = st.brood;
        return;
      }
      if (t.hasAttribute('data-km-box')) {
        var bk = t.getAttribute('data-km-box'), bd = Number(t.getAttribute('data-d'));
        st.box[bk] = Math.max(bk === 'body' ? 1 : 0, Math.min(bk === 'body' ? 3 : 4, st.box[bk] + bd));
        if (bk === 'kat' && !st.box.kat) st.box.ballik = false;
        st.boxTouched = true; st.sugg = null; st.selInit = false;
        back.querySelector('[data-km-bout="' + bk + '"]').textContent = st.box[bk];
        var bl = back.querySelector('[data-km-blabel]'); if (bl) bl.textContent = boxText(st.box);
        var cb = back.querySelector('[data-km-ballik]'); if (cb) cb.checked = st.box.ballik;
        return;
      }
      if (t.hasAttribute('data-km-cnt')) {
        var ci = t.getAttribute('data-km-cnt'), cd = Number(t.getAttribute('data-d'));
        st.cnt[ci] = Math.max(0, Math.min(S[ci].count.max, cntVal(ci) + cd));
        back.querySelector('[data-km-out="cnt"]').textContent = st.cnt[ci];
        return;
      }
      if (t.hasAttribute('data-km-next') && S[id] && S[id].count) { st.ans[id] = cntVal(id); st.sugg = null; st.selInit = false; advance(); return; }
      if (t.hasAttribute('data-km-next')) { if (id === 'cerceve') { st.ans.cerceve = { bee: st.bee, brood: st.brood }; st.sugg = null; st.selInit = false; } advance(); return; }
      if (t.hasAttribute('data-km-skip')) { advance(); return; }
      if (t.hasAttribute('data-km-back')) { if (st.i > 0) { st.i--; render(); } return; }
      if (t.hasAttribute('data-km-goto')) { st.i = Number(t.getAttribute('data-km-goto')); render(); return; }
      if (t.hasAttribute('data-km-note')) { st.noteOpen[id] = true; render(); var ta = body.querySelector('[data-km-notetext]'); if (ta) ta.focus(); return; }
      if (t.hasAttribute('data-km-hz')) {
        need('hastalik-tahmin.js', 'SuperAriHastalik').then(function (Hz) { Hz.open(h.id, {}); }).catch(function () { global.alert && global.alert('Hastalık tahmini yüklenemedi.'); });
        return;
      }
      if (t.hasAttribute('data-km-save')) { t.disabled = true; save(t.getAttribute('data-km-save') === 'next'); return; }
      if (t.hasAttribute('data-km-gonext')) { goNext(); return; }
    });
    back.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-km-notetext')) { st.notes[st.steps[st.i]] = e.target.value.trim(); }
    });
    back.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-km-sel')) { st.sel[Number(t.getAttribute('data-km-sel'))] = t.checked; return; }
      if (t.hasAttribute('data-km-ballik')) {
        st.box.ballik = t.checked; if (t.checked && !st.box.kat) st.box.kat = 1;
        st.boxTouched = true; st.sugg = null; st.selInit = false;
        var ko = back.querySelector('[data-km-bout="kat"]'); if (ko) ko.textContent = st.box.kat;
        var bl2 = back.querySelector('[data-km-blabel]'); if (bl2) bl2.textContent = boxText(st.box);
        return;
      }
      if (t.hasAttribute('data-km-photo') && t.files && t.files[0]) {
        var id = st.steps[st.i];
        (st.photos[id] = st.photos[id] || []).push({ file: t.files[0], url: URL.createObjectURL(t.files[0]) });
        render();
      }
    });
    render();
    if (opts.voice) setTimeout(function () { voiceStart(opts.voice === 'resume'); }, 50);
  }
  global.SuperAriKolayMuayene = { open: open, close: close, build: build, suggestions: suggestions, isFirst: isFirst, ROUTINE: ROUTINE, FIRST: FIRST, STEPS: S };
})(window);
