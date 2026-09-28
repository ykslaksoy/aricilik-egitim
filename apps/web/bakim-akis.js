/**
 * SüperArı — Bakım akışı: kovan başına rehberli bakım.
 * 1) Muayene (kolay-muayene / sesle muayene; normal muayene kaydı)
 * 2+) Muayene + mevsim + mevcut hesaplardan öneri kartları: Besleme, Varroa / İlaçlama, Çerçeve / kat, Ana, Kışlık hazırlık, Hastalık, Not.
 * Her kartta: öneri, «✓ Tamam (önerilen)», Az | Uygun | Çok (veya seçenekler), «✎ Kendim gireyim» (büyük +/−), «Atla».
 * Seçilen gerçek değer mevcut kayıt türüne yazılır (besleme, hastalık/ilaç, kışlık, kovan geçmişi) ve öneri kabul/değişti bilgisi saklanır.
 * Sesli mod: öneriyi okur, «tamam / az / uygun / çok / atla / geri» veya «bir buçuk kilo» gibi miktarı dinler, kaydı sesle onaylar.
 * İlaç: yalnız ilac-katalog.js'deki ruhsatlı ürünlerin etiket dozu; doğrulanmamış üründe doz önerilmez.
 */
(function (global) {
  'use strict';

  /* ================= Ses çözümleyici (saf; node testinde de çalışır) ================= */
  function fold(s) {
    return String(s == null ? '' : s).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase()
      .replace(/[çğıöşüâîû]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]; })
      .replace(/(\d)[,.](\d)/g, '$1d$2').replace(/[^a-z0-9 ]+/g, ' ').replace(/(\d)d(\d)/g, '$1.$2').replace(/\s+/g, ' ').trim();
  }
  var ONES = { sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
  var TENS = { on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90 };
  var UNITW = { kilo: 'kg', kg: 'kg', kilogram: 'kg', kiloluk: 'kg', litre: 'L', lt: 'L', l: 'L', litrelik: 'L', gram: 'g', gr: 'g', g: 'g', gramlik: 'g',
    serit: 'serit', seridi: 'serit', seritlik: 'serit', cerceve: 'cerceve', cerceveyi: 'cerceve', ml: 'ml', mililitre: 'ml', cc: 'ml', adet: 'adet', tane: 'adet', akar: 'adet' };
  var ORD = { birinci: 1, ikinci: 2, ucuncu: 3, dorduncu: 4, besinci: 5 };
  /** Metindeki ilk miktar: «bir buçuk kilo» → { n: 1.5, unit: 'kg' }, «2,5 litre», «yarım kilo», «yüz gram», «bir virgül beş». */
  function parseAmount(text) {
    var t = fold(text).split(' '), n = null, unit = '', i, used = false;
    for (i = 0; i < t.length; i++) {
      var w = t[i];
      if (/^\d+(\.\d+)?$/.test(w)) { if (used) break; n = Number(w); used = true; continue; }
      if (ONES[w] != null) { if (n != null && n % 10 !== 0) break; n = (n || 0) + ONES[w]; used = true; continue; }
      if (TENS[w] != null) { if (n != null && n % 100 !== 0) break; n = (n || 0) + TENS[w]; used = true; continue; }
      if (w === 'yuz') { n = (n == null || n === 0 ? 1 : n) * 100; used = true; continue; }
      if (w === 'bin') { n = (n == null || n === 0 ? 1 : n) * 1000; used = true; continue; }
      if (w === 'bucuk' && n != null) { n += 0.5; continue; }
      if (w === 'yarim') { n = n == null ? 0.5 : n + 0.5; used = true; continue; }
      if (w === 'virgul' && n != null && i + 1 < t.length) {
        var d = t[i + 1], dv = /^\d+$/.test(d) ? d : (ONES[d] != null ? String(ONES[d]) : null);
        if (dv != null) { n = Number(Math.floor(n) + '.' + dv); i++; continue; }
      }
      if (UNITW[w] && n != null) { unit = UNITW[w]; break; }
      if (n != null) break;
    }
    if (n == null) return null;
    return { n: Math.round(n * 1000) / 1000, unit: unit };
  }
  var CMDS = [
    ['sonraki kovan', 'sonraki'], ['siradaki kovan', 'sonraki'], ['diger kovan', 'sonraki'],
    ['kendim girecegim', 'kendim'], ['kendim', 'kendim'],
    ['daha az', 'az'], ['daha fazla', 'cok'], ['daha cok', 'cok'],
    ['geri', 'geri'], ['onceki', 'geri'],
    ['atla', 'atla'], ['gec', 'atla'], ['pas', 'atla'], ['gecelim', 'atla'], ['yapmadim', 'atla'],
    ['tekrar', 'tekrar'], ['tekrarla', 'tekrar'], ['anlamadim', 'tekrar'], ['bir daha', 'tekrar'],
    ['dur', 'dur'], ['durdur', 'dur'], ['sus', 'dur'],
    ['hayir', 'hayir'], ['istemiyorum', 'hayir'],
    ['tamam', 'tamam'], ['tamamdir', 'tamam'], ['evet', 'tamam'], ['olur', 'tamam'], ['kabul', 'tamam'], ['onayla', 'tamam'], ['peki', 'tamam'], ['kaydet', 'tamam'], ['yaptim', 'tamam'],
    ['az', 'az'], ['azalt', 'az'], ['uygun', 'uygun'], ['normal', 'uygun'], ['orta', 'uygun'], ['onerilen', 'uygun'], ['etiket', 'uygun'],
    ['cok', 'cok'], ['fazla', 'cok'], ['ileri', 'ileri'], ['bitir', 'bitir']
  ];
  function hasPhrase(f, ph) { return (' ' + f + ' ').indexOf(' ' + ph + ' ') >= 0; }
  /** Sesli komut: { cmd } | { n, unit } | { ord } | { none, text } */
  function parseCmd(text) {
    var f = fold(text); if (!f) return { none: true, text: '' };
    var toks = f.split(' ');
    for (var k = 0; k < toks.length; k++) if (ORD[toks[k]]) return { ord: ORD[toks[k]], text: text };
    var first = null;
    CMDS.forEach(function (c) { if (first) return; if (hasPhrase(f, c[0])) first = c[1]; });
    if (first === 'sonraki' || first === 'geri' || first === 'dur' || first === 'kendim' || first === 'tekrar') return { cmd: first, text: text };
    var a = parseAmount(f);
    if (a) return { n: a.n, unit: a.unit, cmd: first || undefined, text: text };
    if (first) return { cmd: first, text: text };
    return { none: true, text: text };
  }
  /** Sesli okuma için sayı: 1.5 → «1 buçuk», 0.5 → «yarım». */
  function sayNum(v) {
    v = Math.round(Number(v) * 10) / 10;
    var w = Math.floor(v), fr = Math.round((v - w) * 10);
    if (fr === 5) return w ? w + ' buçuk' : 'yarım';
    if (!fr) return String(w);
    return w + ' virgül ' + fr;
  }
  var UNIT_SAY = { kg: 'kilo', L: 'litre', g: 'gram', ml: 'mililitre', serit: 'şerit', cerceve: 'çerçeve', adet: 'adet' };
  var UNIT_TXT = { kg: 'kg', L: 'L', g: 'g', ml: 'ml', serit: 'şerit', cerceve: 'çerçeve', adet: 'adet' };
  /** Söylenen birimi adımın birimine çevir (gram → kg, ml → L). Uymuyorsa null. */
  function convert(n, from, to) {
    if (!from || from === to) return n;
    if (from === 'g' && to === 'kg') return n / 1000;
    if (from === 'kg' && to === 'g') return n * 1000;
    if (from === 'ml' && to === 'L') return n / 1000;
    if (from === 'L' && to === 'ml') return n * 1000;
    if (from === 'adet' && (to === 'serit' || to === 'cerceve')) return n;
    return null;
  }

  var API = { fold: fold, parseAmount: parseAmount, parseCmd: parseCmd, sayNum: sayNum, convert: convert };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = API; return; }

  /* ================= Uygulama ================= */
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function demo() { return mode() === 'demo'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoOf(new Date()); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }
  function num(v) { v = Math.round(Number(v) * 10) / 10; return String(v).replace('.', ','); }
  function r05(v) { return Math.round(v * 2) / 2; }
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
  function deps() {
    return need('ilac-katalog.js', 'SuperAriIlac').catch(function () { return null; })
      .then(function () { return need('bakim-plan.js', 'SuperAriPlan').catch(function () { return null; }); })
      .then(function () { return need('kolay-muayene.js', 'SuperAriKolayMuayene').catch(function () { return null; }); });
  }
  var VOICE_KEY = 'superari.akisSes.v1';
  function voicePref() { try { return localStorage.getItem(VOICE_KEY) === '1'; } catch (e) { return false; } }
  function setVoicePref(on) { try { localStorage.setItem(VOICE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ } }

  /* ---------------- Sıra: önce sensör uyarısı / kritik, sonra geciken muayene ---------------- */
  function order(hives) {
    D = global.SuperAriDemo; var R = D.records, P = global.SuperAriPlan, SH = global.SuperAriSensorHealth, t = today();
    var all = null; try { all = R.loadAll(); } catch (e) { all = null; }
    var alerts = {}; try { (D.alerts || []).forEach(function (a) { if (a && a.severity === 'high' && a.hiveId != null && !(mode() === 'live' && a.demo) && !/^kra-anasiz-/.test(String(a.id))) alerts[String(a.hiveId)] = a; }); } catch (e) { /* ignore */ }
    var rows = (hives || []).filter(function (h) { return h && h.colonyState !== 'birlestirildi'; }).map(function (h) {
      var why = [], pri = 4, st = null;
      try { st = R.status(h.id, all || undefined); } catch (e) { st = null; }
      var band = null; try { var ev = SH && SH.evaluateHive ? SH.evaluateHive(h) : null; band = ev && ev.band ? ev.band.key : null; } catch (e) { band = null; }
      var al = alerts[String(h.id)];
      if (al) { why.push(/hastal/i.test(String(al.type || '')) ? 'Hastalık uyarısı' : (/sens|cihaz|tart|isi|ses|nem/i.test(String(al.type || '') + ' ' + String(al.source || '')) ? 'Sensör uyarısı' : 'Kritik uyarı')); pri = 0; }
      if (band === 'act') { why.push('Müdahale'); pri = 0; }
      if (st && st.queenless) { why.push('Anasız'); pri = Math.min(pri, 1); }
      if (st && (st.dueChecks || []).some(function (c) { return c.date < t; })) { why.push('Kontrol gecikti'); pri = Math.min(pri, 1); }
      var ws = null; try { ws = P && P.winterSeasonNow() ? P.winterStock(h) : null; } catch (e) { ws = null; }
      if (ws && ws.key === 'kritik') { why.push('Kışlık stok kritik'); pri = Math.min(pri, 1); }
      var last = st && st.strength ? st.strength.date : null, age = last ? Math.round((new Date(t) - new Date(last)) / 86400000) : null;
      if (!last) { why.push('Muayene yok'); pri = Math.min(pri, 2); }
      else if (age > 21) { why.push('Muayene ' + age + ' gün önce'); pri = Math.min(pri, 2); }
      var nd = []; try { nd = P ? P.needs(h) : []; } catch (e) { nd = []; }
      if (nd.length) { var nt = nd[0].text.split(' (')[0].split(' — ')[0]; if (why.length < 3 && !why.some(function (w) { return fold(nt).indexOf(fold(w).split(' ')[0]) >= 0; })) why.push(nt); pri = Math.min(pri, nd[0].u <= 1 ? 1 : 3); }
      if (band === 'check' && pri > 2) { why.push('Kontrol'); pri = 2; }
      return { hive: h, pri: pri, why: why, age: age == null ? 999 : age };
    });
    rows.sort(function (a, b) { return (a.pri - b.pri) || (b.age - a.age) || (Number(a.hive.id) - Number(b.hive.id)); });
    return rows;
  }
  /* Günlük akış kuyruğu (bugün biten kovanlar) */
  function qKey() { return mode() === 'live' ? 'superari.bakimAkis.v1' : 'superari.bakimAkis.demo.v1'; }
  function qLoad() { try { var s = JSON.parse(localStorage.getItem(qKey()) || 'null'); return s && s.date === today() ? s : { date: today(), done: {} }; } catch (e) { return { date: today(), done: {} }; } }
  function markDone(id) { var s = qLoad(); s.done[String(id)] = true; try { localStorage.setItem(qKey(), JSON.stringify(s)); } catch (e) { /* ignore */ } }
  function isDone(id) { return !!qLoad().done[String(id)]; }
  function nextInOrder(hives, curId) {
    var rows = order(hives).filter(function (r) { return !isDone(r.hive.id) && String(r.hive.id) !== String(curId); });
    return rows.length ? rows[0].hive : null;
  }

  /* ---------------- Kayıt yardımcıları (geri alınabilir) ---------------- */
  function sugFields(res, step) {
    var o = { akis: true, sug: res.sug };
    if (step.kind === 'amount' && step.rec != null) o.sugVal = step.rec;
    o.sugText = step.kind === 'amount' && step.fmt ? step.fmt(step.rec, step.type) : (step.recLabel || '');
    if (demo()) o.demo = true;
    return o;
  }
  function addRec(h, kind, rec, undo) {
    var r = D.records.add(h.id, kind, rec);
    if (r) undo.push(function () { D.records.remove(h.id, kind, r.id); });
    return r;
  }
  function addTask(h, title, due, pri, undo) {
    var tt = title + ' — ' + h.name + (demo() ? ' · Demo' : '');
    var open = []; try { open = D.taskStore.open().map(function (x) { return x.title; }); } catch (e) { open = []; }
    if (open.indexOf(tt) >= 0) return null;
    var tk = D.taskStore.add({ title: tt, hiveId: h.id, due: due, priority: pri || 2, note: '[bakım akışı]' });
    if (tk && tk.id) undo.push(function () { try { D.taskStore.remove(tk.id); } catch (e) { /* ignore */ } });
    return tk;
  }
  function addEvent(h, type, text, res, step, undo) {
    if (!D.colony || !D.colony.addEvent) return null;
    var id = D.colony.addEvent(h.id, { type: type, text: 'Bakım akışı · ' + text, sug: res.sug, sugText: step.kind === 'amount' && step.fmt ? step.fmt(step.rec, step.type) : (step.recLabel || '') });
    if (id) undo.push(function () { D.colony.removeEvent(h.id, id); });
    return id;
  }
  function stockUse(item, qty, reason, undo) {
    if (!item || !(qty > 0) || !D.stock) return null;
    var after = D.stock.adjust(item.id, -qty, reason, today());
    if (after) undo.push(function () { try { D.stock.adjust(item.id, qty, 'Geri alındı · ' + reason, today()); } catch (e) { /* ignore */ } });
    return after;
  }
  function changed(res) { return res.sug === 'kabul' ? '' : (res.sug === 'az' ? ' (az)' : res.sug === 'cok' ? ' (çok)' : ' (kendi seçiminiz)'); }
  var SEASON_TXT = { ilkbahar: 'İlkbahar', yaz: 'Yaz', akim: 'Bal akımı', sonbahar: 'Sonbahar', kis: 'Kış' };
  function amountPresets(v, inc, min) {
    var az = Math.max(min, Math.round(v * 0.5 / inc) * inc), cok = Math.round(v * 1.5 / inc) * inc;
    if (az >= v) az = Math.max(min, v - inc);
    if (cok <= v) cok = v + inc;
    return [{ id: 'az', v: az }, { id: 'uygun', v: v }, { id: 'cok', v: cok }];
  }

  /* ---------------- Öneri adımları ---------------- */
  function buildSteps(h, info) {
    var P = global.SuperAriPlan, I = global.SuperAriIlac, R = D.records, a = (info && info.ans) || {};
    var steps = [], st = P ? P.hiveState(h) : { beeFrames: null }, sk = P ? P.seasonKind(h.apiaryId) : 'yaz';
    var bee = a.cerceve ? a.cerceve.bee : st.beeFrames;
    var growing = sk === 'ilkbahar' || sk === 'akim' || sk === 'yaz';
    var box = null; try { box = D.colony.boxes(D.hiveById(h.id)); } catch (e) { box = null; }
    if (!box) box = { body: 1, kat: P && P.hasSuper && P.hasSuper(h.id) ? 1 : 0, ballik: false };

    /* 1) Besleme (Bakım planı besleme hesabı; mevsime göre kek / şurup 1:1 / 2:1) */
    if (P) {
      var fp = null; try { fp = P.feedPlan(h, st); } catch (e) { fp = null; }
      if (fp && fp.need) {
        var ftype = fp.type, v, feedings = fp.feedings || 1;
        if (ftype === 'kek') v = fp.perFeedKg;
        else if (fp.cold) { ftype = 'kek'; v = Math.min(2, Math.max(1, r05(fp.deficitKg || 1))); feedings = 1; }
        else v = fp.perFeedL;
        v = Math.max(0.5, r05(v));
        var FT = { kek: { label: 'Kek (fondan)', unit: 'kg' }, surup11: { label: 'Şurup 1:1', unit: 'L' }, surup21: { label: 'Şurup 2:1', unit: 'L' } };
        var fmtF = function (x, t) { t = t || ftype; return t === 'kek' ? 'Kek ' + num(x) + ' kg' : FT[t].label + ' ' + num(x) + ' L'; };
        var subF = function (x, t) { t = t || ftype; if (t === 'kek') return 'Fondan kek, çerçevelerin üstüne'; var S = P.SYRUP[t]; return '= ' + num(x * S.sugarKg) + ' kg şeker + ' + num(x * S.waterL) + ' L su'; };
        var sayF = function (x, t) { t = t || ftype; if (t === 'kek') return sayNum(x) + ' kilo kek'; var S = P.SYRUP[t]; return sayNum(x) + ' litre ' + (t === 'surup21' ? 'ikiye bir' : 'bire bir') + ' şurup, yani ' + sayNum(x * S.sugarKg) + ' kilo şeker ve ' + sayNum(x * S.waterL) + ' litre su'; };
        steps.push({ key: 'besleme', icon: '🍯', title: 'Besleme', kind: 'amount', type: ftype, unit: FT[ftype].unit, rec: v, inc: 0.5, min: 0.5, max: 20,
          presets: amountPresets(v, 0.5, 0.5), fmt: fmtF, sub: subF, sayV: sayF,
          why: SEASON_TXT[sk] + ' · stok ≈ ' + num(fp.storesKg) + ' kg' + (fp.targetKg ? ', hedef ' + fp.targetKg + ' kg' : '') + (feedings > 1 ? ' · ' + feedings + ' beslemenin 1.si; kalanlar görev olur' : '') + (fp.cold ? ' · kış ortası: şurup yerine kek' : '') + (fp.weak ? ' · zayıf koloni: birleştirmeyi düşünün' : ''),
          types: ['kek', 'surup11', 'surup21'], typeInfo: FT,
          save: function (res, step) {
            var undo = [], t = res.type || step.type, amt = res.v;
            var rec = addRec(h, 'feed', Object.assign({ date: today(), type: t, amount: amt, note: 'Bakım akışı' + changed(res) + (demo() ? ' · Demo' : '') }, sugFields(res, step)), undo);
            var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
            var msg = fmtF(amt, t);
            if (t === 'kek') { var kk = list.filter(function (x) { return (x.category === 'kek' || x.feedType === 'kek') && x.unit === 'kg'; })[0]; if (kk && stockUse(kk, amt, 'Besleme · ' + h.name, undo)) msg += ' · stoktan düşüldü'; }
            else {
              var syr = list.filter(function (x) { return x.feedType === t && x.unit === 'L'; })[0], sug = list.filter(function (x) { return x.category === 'seker' && x.unit === 'kg'; })[0];
              if (syr) { if (stockUse(syr, amt, 'Besleme · ' + h.name, undo)) msg += ' · stoktan düşüldü'; }
              else if (sug) { if (stockUse(sug, Math.round(amt * P.SYRUP[t].sugarKg * 10) / 10, 'Besleme · ' + h.name, undo)) msg += ' · şeker stoktan düşüldü'; }
            }
            if (feedings > 1 && t === step.type) {
              var every = (P.SYRUP[t] && P.SYRUP[t].everyDays) || 3;
              for (var i = 1; i < feedings; i++) addTask(h, 'Besleme ' + (i + 1) + '/' + feedings + ': ' + fmtF(amt, t), plusDays(i * every), 2, undo);
              msg += ' · ' + (feedings - 1) + ' besleme görevi';
            }
            return rec ? { text: msg, say: t === 'kek' ? sayNum(amt) + ' kilo kek' : sayNum(amt) + ' litre ' + (t === 'surup21' ? 'ikiye bir' : 'bire bir') + ' şurup', undo: undo } : null;
          } });
      }
    }

    /* 2) Varroa / İlaçlama (yalnız ruhsatlı etiket dozu) */
    function countStep() {
      return { key: 'sayim', icon: '🕷', title: 'Varroa sayımı', kind: 'choice', okCustom: true,
        recLabel: 'Varroa sayımı yapın (≈300 arı, alkol yıkama) ve akar sayısını girin',
        why: 'Sayım yoksa ilaç dozu önerilmez.', say: 'Varroa sayımı yok. Önerim: yaklaşık üç yüz arıyla alkol yıkama yapıp akar sayısını söyleyin. Sonra sayacaksanız sonra deyin, yapmadıysanız atla deyin.',
        opts: [{ id: 'gorev', label: 'Sonra sayacağım (görev ekle)', say: ['sonra', 'gorev'] }],
        custom: { unit: 'adet', min: 0, max: 300, inc: 1, big: 5, init: 3, label: 'Akar sayısı (≈300 arı)' },
        save: function (res) {
          var undo = [];
          if (res.opt === 'gorev') { addTask(h, 'Varroa sayımı (≈300 arı, alkol yıkama)', plusDays(3), 2, undo); return { text: 'Varroa sayımı görevi eklendi', say: 'varroa sayımı görevi', undo: undo }; }
          var c = Math.round(res.v);
          var rec = addRec(h, 'disease', Object.assign({ date: today(), disease: 'varroa', count: c, method: 'alkol', note: 'Bakım akışı · ≈300 arı' + (demo() ? ' · Demo' : ''), akis: true, sug: 'kabul', sugText: 'Varroa sayımı yapın' }, demo() ? { demo: true } : {}), undo);
          var inf = Math.round(c / 300 * 1000) / 10;
          var out = { text: c + ' akar (≈ %' + num(inf) + ' bulaşma)', say: c + ' akar', undo: undo };
          /* Sayım girildiyse ilaç önerisini yeniden hesapla ve sıradaki adım olarak ekle */
          try { var mp2 = P.medPlan(D.hiveById(h.id)); if (mp2.level === 'tedavi' || mp2.level === 'planla') out.insert = treatStep(mp2, P.hiveState(D.hiveById(h.id))); } catch (e) { /* ignore */ }
          return rec ? out : null;
        } };
    }
    function treatStep(mp, st2) {
      var best = mp.best, lvl = mp.level === 'tedavi' ? 'Tedavi önerilir' : 'Tedavi planlayın';
      var ver = I.LIST.filter(function (p) { return p.dose; });
      var custom = { unit: 'serit', min: 1, max: 50, inc: 1, init: best ? best.dose.qty : 2, label: 'Uyguladığınız miktar', units: ['serit', 'g', 'ml'],
        products: ver.map(function (p) { return { id: p.id, label: p.name.split(' ')[0] }; }).concat([{ id: 'diger', label: 'Başka ürün' }]),
        product: best ? best.id : 'diger', warn: 'Etiket dışı miktar önerilmez; yalnız uyguladığınızı kaydedin.' };
      var saveT = function (res, step) {
        var undo = [], pid = res.product || (best && best.id), p = pid && pid !== 'diger' ? I.byId(pid) : null, unit = res.unit || 'serit', qty = res.v, t = today();
        var dur = p && p.durationDays ? p.durationDays[1] : 0, vr = (st2 || st).varroa || {};
        var rec = addRec(h, 'disease', Object.assign({ date: t, disease: 'varroa', count: vr.count != null ? vr.count : null, method: vr.method || 'alkol', infestation: mp.infestation,
          treatment: p ? p.name + ' (' + p.active + ')' : 'Başka ürün (Bakım akışı)', dose: qty, doseUnit: unit, withdrawalDays: p && p.withdrawal === 'tedaviBoyunca' ? dur : 0,
          checkDate: dur ? plusDays(dur) : plusDays(21), note: 'Bakım akışı' + changed(res) + (p && p.dose ? ' · etiket: ' + p.dose.note.slice(0, 160) : '') + (demo() ? ' · Demo' : '') }, sugFields(res, step)), undo);
        var msg = (p ? p.name : 'Başka ürün') + ' ' + num(qty) + ' ' + UNIT_TXT[unit];
        if (p && dur) { addTask(h, 'Şeritleri çıkar (' + p.name + ') ve varroa sayımı yap', plusDays(dur), 1, undo); msg += ' · çıkarma görevi ' + dur + ' gün sonra'; }
        if (p && unit === 'serit') {
          var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
          var nm = p.name.toLocaleLowerCase('tr').split(' ')[0];
          var it = list.filter(function (x) { return x.category === 'ilac' && x.unit === 'şerit' && x.name.toLocaleLowerCase('tr').indexOf(nm) >= 0; })[0];
          if (it && stockUse(it, qty, 'İlaçlama · ' + h.name, undo)) msg += ' · stoktan düşüldü';
        }
        return rec ? { text: msg, say: (p ? p.name : 'başka ürün') + ', ' + sayNum(qty) + ' ' + UNIT_SAY[unit], undo: undo } : null;
      };
      if (mp.blocks.length) {
        return { key: 'ilac', icon: '💊', title: 'İlaçlama', kind: 'choice', recLabel: 'Şimdi ilaç uygulamayın', why: mp.blocks[0],
          say: 'Varroa: ' + lvl.toLocaleLowerCase('tr') + ', ama şimdi ilaç uygulanmaz. ' + mp.blocks[0].split(' — ')[0].split(' (')[0] + '. Tamam deyin.',
          opts: [], custom: Object.assign({}, custom, { warn: '⛔ ' + mp.blocks[0].split(' — ')[0] + ' — ilaç önerilmez. Yalnız uyguladıysanız kaydedin.' }), save: function (res, step) { if (res.custom) return saveT(res, step); var u = []; addEvent(h, 'bakim', 'İlaç uygulanmadı: ' + mp.blocks[0].slice(0, 120), res, step, u); return { text: 'İlaç uygulanmadı', say: 'ilaç uygulanmadı', undo: u }; } };
      }
      if (!best) {
        var why0 = (mp.products.filter(function (x) { return x.verified; })[0] || {}).dose;
        return { key: 'ilac', icon: '💊', title: 'İlaçlama', kind: 'choice', recLabel: 'Etiket dozu bulunamadı — veteriner hekime danışın',
          why: (why0 && why0.reason ? why0.reason + ' ' : '') + 'Uygulama doz uydurmaz.', say: 'Varroa: ' + lvl.toLocaleLowerCase('tr') + '. Bu kovan için ruhsatlı etiket dozu bulunamadı, doz önermiyorum. Veteriner hekime danışın. Tamam deyin.',
          opts: [], custom: custom, save: function (res, step) { if (res.custom) return saveT(res, step); var u = []; addTask(h, 'Varroa: veteriner hekime danış (etiket dozu yok)', plusDays(2), 1, u); return { text: 'Veteriner görevi eklendi', say: 'veteriner hekime danışma görevi', undo: u }; } };
      }
      var alts = mp.products.filter(function (x) { return x.verified && x.dose.ok && !x.blocks.length && x.id !== best.id; }).slice(0, 2);
      var pb = I.byId(best.id);
      return { key: 'ilac', icon: '💊', title: 'İlaçlama (etiket dozu)', kind: 'amount', noPresets: true, unit: 'serit', rec: best.dose.qty, product: best.id, inc: 1, min: 1, max: 50,
        fmt: function (x) { return best.name + ' · ' + (x === best.dose.qty ? best.dose.text : num(x)) + ' şerit'; },
        sub: function () { return 'Etiket: ' + (pb.durationDays ? pb.durationDays[0] + (pb.durationDays[1] !== pb.durationDays[0] ? '–' + pb.durationDays[1] : '') + ' gün kovanda' : '') + (best.warns.length ? ' · ' + best.warns[0] : ''); },
        sayV: function () { return best.name + ', ' + best.dose.text.replace('–', ' ile ') + ' şerit'; },
        why: lvl + ' (%' + num(mp.infestation) + ' bulaşma) · yalnız ruhsatlı ürün, etiket dozu',
        opts: alts.map(function (x) { return { id: x.id, label: x.name + ' · ' + x.dose.text + ' şerit (etiket)', v: x.dose.qty, say: [fold(x.name).split(' ')[0]] }; }),
        custom: custom,
        save: function (res, step) { if (res.opt) { res.product = res.opt; res.unit = 'serit'; } return saveT(res, step); } };
    }
    if (P && I) {
      var mp = null; try { mp = P.medPlan(h, st); } catch (e) { mp = null; }
      if (mp && mp.level === 'sayim' && sk !== 'akim' && sk !== 'kis') steps.push(countStep());
      else if (mp && (mp.level === 'tedavi' || mp.level === 'planla')) steps.push(treatStep(mp, st));
    }

    /* 3) Çerçeve / kat */
    if (bee != null) {
      var cap = 10 * (box.body + box.kat), ratio = bee / cap;
      var setKat = function (d, undo) {
        var hb = null; try { hb = D.colony.boxes(D.hiveById(h.id)); } catch (e) { hb = null; }
        if (!hb || !D.colony.setBoxes) return;
        var prev = { body: hb.body, kat: hb.kat, ballik: hb.ballik };
        var nk = Math.max(0, Math.min(4, hb.kat + d));
        D.colony.setBoxes(h.id, { body: hb.body, kat: nk, ballik: nk ? (d > 0 ? true : hb.ballik) : false });
        undo.push(function () { D.colony.setBoxes(h.id, prev); });
      };
      var boxWhy = bee + ' arılı çerçeve · ' + cap + ' çerçeve yer';
      if (growing && (a.yer === 'dolu' || ratio >= 0.9)) {
        steps.push({ key: 'cerceve', icon: '📦', title: 'Çerçeve / kat', kind: 'choice', recLabel: box.kat ? '1 kat daha ekleyin (yer dar)' : '1 kat (bal katı) ekleyin — yer dar',
          why: boxWhy, say: 'Kovan dolu. Önerim: bir kat ekleyin. Tamam deyin, ya da boş çerçeve verdim deyin.',
          opts: [{ id: 'cer2', label: '2 boş çerçeve / temel petek verdim', say: ['cerceve', 'bos'] }, { id: 'yok', label: 'Şimdilik ekleme yapmadım (görev)', say: ['yok', 'sonra'] }],
          save: function (res, step) {
            var u = [];
            if (res.opt === 'yok') { addEvent(h, 'bakim', 'Yer dar; ekleme yapılmadı', res, step, u); addTask(h, 'Yer dar: kat / boş çerçeve ver', plusDays(3), 1, u); return { text: 'Ekleme yapılmadı · görev eklendi', say: 'ekleme yapılmadı, görev eklendi', undo: u }; }
            if (res.opt === 'cer2') { addEvent(h, 'bakim', '2 boş çerçeve verildi', res, step, u); return { text: '2 boş çerçeve verildi', say: 'iki boş çerçeve', undo: u }; }
            setKat(1, u); addEvent(h, 'bakim', '1 kat eklendi', res, step, u); return { text: '1 kat eklendi', say: 'bir kat eklendi', undo: u };
          } });
      } else if (growing && (a.yer === 'dolmak' || ratio >= 0.75)) {
        steps.push({ key: 'cerceve', icon: '🖼', title: 'Çerçeve ekle', kind: 'amount', unit: 'cerceve', rec: 2, inc: 1, min: 1, max: 10, presets: [{ id: 'az', v: 1 }, { id: 'uygun', v: 2 }, { id: 'cok', v: 3 }],
          fmt: function (x) { return x + ' boş çerçeve / temel petek verin'; }, sub: function () { return 'Kovan dolmak üzere; kuluçkalığın kenarına'; }, sayV: function (x) { return x + ' boş çerçeve verin'; },
          why: boxWhy,
          save: function (res, step) { var u = []; addEvent(h, 'bakim', res.v + ' boş çerçeve verildi' + changed(res), res, step, u); return { text: res.v + ' boş çerçeve verildi', say: res.v + ' boş çerçeve', undo: u }; } });
      } else if ((sk === 'sonbahar' || sk === 'kis') && box.kat > 0 && bee <= 10 * box.body) {
        steps.push({ key: 'cerceve', icon: '📦', title: 'Kat / daraltma', kind: 'choice', recLabel: 'Bal katını alın (kışa gövdeyle girsin)', why: bee + ' arılı çerçeve · ' + box.kat + ' kat takılı',
          say: 'Arı kat için az. Önerim: bal katını alın. Tamam ya da bırakıyorum deyin.',
          opts: [{ id: 'birak', label: 'Katı bırakıyorum', say: ['birak', 'birakiyorum'] }],
          save: function (res, step) { var u = []; if (res.opt === 'birak') { addEvent(h, 'bakim', 'Kat bırakıldı', res, step, u); return { text: 'Kat bırakıldı', say: 'kat bırakıldı', undo: u }; } setKat(-1, u); addEvent(h, 'bakim', 'Bal katı alındı', res, step, u); return { text: 'Bal katı alındı', say: 'bal katı alındı', undo: u }; } });
      } else if (bee <= 5 && cap - bee >= 3) {
        var keep = Math.max(3, bee + 1);
        steps.push({ key: 'cerceve', icon: '🪵', title: 'Daraltma', kind: 'amount', unit: 'cerceve', rec: keep, inc: 1, min: 2, max: 10, presets: [{ id: 'az', v: Math.max(2, keep - 1) }, { id: 'uygun', v: keep }, { id: 'cok', v: keep + 1 }],
          fmt: function (x) { return 'Bölme tahtasıyla ' + x + ' çerçeveye daraltın'; }, sub: function () { return 'Zayıf koloni ısısını korusun; uçuş deliğini de daraltın'; }, sayV: function (x) { return 'bölme tahtasıyla ' + x + ' çerçeveye daraltın'; },
          why: boxWhy,
          save: function (res, step) { var u = []; addEvent(h, 'bakim', res.v + ' çerçeveye daraltıldı' + changed(res), res, step, u); return { text: res.v + ' çerçeveye daraltıldı', say: res.v + ' çerçeveye daraltıldı', undo: u }; } });
      }
    }

    /* 4) Ana arı */
    var AM = {
      anaVer: { text: 'Ana verildi (hazır ana / kapalı meme)', task: 'Ana kabul kontrolü: kafesi aç, yumurta var mı bak', days: 7, pri: 1 },
      birlestir: { text: 'Güçlü kovanla birleştirilecek', task: 'Anasız kovanı güçlü kovanla birleştir (gazete yöntemi)', days: 0, pri: 1 },
      yumurtaCer: { text: 'Yumurtalı çerçeve verildi', task: 'Ana memesi var mı bak (test çerçevesi)', days: 5, pri: 1 },
      kontrol: { text: '3–4 gün sonra yumurta kontrolü', task: 'Ana kontrolü: yumurta var mı bak', days: 4, pri: 2 },
      kontrol7: { text: '1 hafta sonra yumurta kontrolü', task: 'Ana yumurtluyor mu: yumurta kontrolü', days: 7, pri: 2 },
      degistir: { text: 'Ana değişimi planlandı', task: 'Ana değiştir', days: 14, pri: 2 },
      izle: { text: 'Ana izlemede' },
      bolme: { text: 'Bölme yapıldı (memeli çerçeveyle)', task: 'Bölmede ana çıktı mı: yumurta kontrolü', days: 21, pri: 2 },
      yer: { text: 'Oğul önlemi: yer açıldı', task: 'Oğul memesi tekrar kontrol', days: 7, pri: 1 },
      kir: { text: 'Oğul memeleri kırıldı', task: 'Oğul memesi tekrar kontrol', days: 7, pri: 1 },
      bekle: { text: 'Memelere dokunulmadı', task: 'Yeni ana yumurtluyor mu: yumurta kontrolü', days: 21, pri: 2 }
    };
    var anaStep = null;
    function ana(recId, recLabel, why, say, opts) {
      anaStep = { key: 'ana', icon: '👑', title: 'Ana arı', kind: 'choice', recId: recId, recLabel: recLabel, why: why, say: say, opts: opts,
        save: function (res, step) { var id = res.opt || recId, m = AM[id], u = []; addEvent(h, 'ana', m.text, res, step, u); if (m.task) addTask(h, m.task, plusDays(m.days || 0), m.pri || 2, u); return { text: m.text + (m.task ? ' · görev eklendi' : ''), say: m.text.toLocaleLowerCase('tr'), undo: u }; } };
    }
    var queenless = (info && info.brood && info.brood.queenless) || (a.ana === 'hicbiri' && (a.yavru === 'yok' || a.yavru == null));
    if (queenless) {
      var weak = (bee != null && bee <= 4) || sk === 'sonbahar' || sk === 'kis';
      var recA = weak ? 'birlestir' : 'anaVer';
      var o = [{ id: 'anaVer', label: 'Ana verdim (hazır ana / kapalı meme)', say: ['ana verdim', 'ana ver'] }, { id: 'birlestir', label: 'Güçlü kovanla birleştireceğim', say: ['birlestir', 'birlestirecegim'] }];
      if (growing) o.push({ id: 'yumurtaCer', label: 'Yumurtalı çerçeve verdim', say: ['yumurtali'] });
      ana(recA, weak ? 'Güçlü bir kovanla birleştirin (anasız, zayıf)' : 'Ana verin (hazır ana veya kapalı ana memesi)', 'Ne ana ne yumurta, yavru yok',
        'Kovan anasız görünüyor. Önerim: ' + (weak ? 'güçlü bir kovanla birleştirin.' : 'ana verin.') + ' Tamam deyin ya da başka seçeneği söyleyin.', o.filter(function (x) { return x.id !== recA; }));
    } else if (a.ana === 'hicbiri') {
      ana('kontrol', '3–4 gün sonra yumurta kontrolü yapın', 'Ana ve yumurta görülmedi, yavru var', 'Ana ve yumurta görülmedi. Önerim: üç dört gün sonra yumurta kontrolü. Tamam deyin.',
        [{ id: 'yumurtaCer', label: 'Test çerçevesi verdim (yumurtalı)', say: ['test', 'yumurtali'] }]);
    } else if (a.meme === 'ogul') {
      ana(growing ? 'bolme' : 'kir', growing ? 'Bölme yapın (memeli çerçeveyle)' : 'Oğul memelerini kırın', 'Alt kenarda oğul memesi', 'Oğul memesi var. Önerim: ' + (growing ? 'bölme yapın.' : 'memeleri kırın.') + ' Tamam deyin ya da yer açtım deyin.',
        [{ id: 'yer', label: 'Yer açtım (kat / boş çerçeve)', say: ['yer'] }, growing ? { id: 'kir', label: 'Memeleri kırdım', say: ['kirdim', 'kir'] } : { id: 'bolme', label: 'Bölme yaptım', say: ['bolme'] }]);
    } else if (a.meme === 'acil') {
      ana('bekle', 'Memelere dokunmayın; 3 hafta sonra yumurta kontrolü', 'Acil ana memesi (genç larvadan)', 'Acil ana memesi var. Önerim: memelere dokunmayın, üç hafta sonra yumurta kontrolü. Tamam deyin.',
        [{ id: 'anaVer', label: 'Ana verdim', say: ['ana verdim', 'ana ver'] }]);
    } else if (a.ana === 'ana' && a.yavru === 'yok') {
      ana('kontrol7', '1 hafta sonra yumurta kontrolü yapın', 'Ana var, yavru yok', 'Ana var ama yavru yok. Önerim: bir hafta sonra yumurta kontrolü. Tamam deyin.',
        [{ id: 'degistir', label: 'Anayı değiştireceğim', say: ['degistir'] }]);
    } else if (a.huy === '1') {
      ana('degistir', 'Ana değişimini planlayın (çok sinirli)', 'Muayenede çok sinirli', 'Koloni çok sinirli. Önerim: ana değişimini planlayın. Tamam ya da izle deyin.',
        [{ id: 'izle', label: 'Şimdilik izleyeceğim', say: ['izle'] }]);
    }
    if (anaStep) steps.push(anaStep);

    /* 5) Kışlık hazırlık */
    if (P && P.winterSeasonNow() && (sk === 'sonbahar' || sk === 'kis')) {
      var ws = null, wst = null; try { ws = P.winterStock(D.hiveById(h.id)); wst = R.winterStatus(h.id); } catch (e) { ws = null; }
      var wr = wst && wst.rec ? wst.rec : null;
      if (!(wr && wr.narrowed && wr.insulation)) {
        var stockTxt = ws && ws.kg != null ? 'Kışlık stok ' + ws.label.toLocaleLowerCase('tr') + ' (≈ ' + num(ws.kg) + ' / ' + ws.target + ' kg)' : 'Kışlık stok: veri yok';
        var saySt = ws && ws.kg != null ? 'Kışlık stok ' + ws.label.toLocaleLowerCase('tr') + ', yaklaşık ' + sayNum(ws.kg) + ' kilo, hedef ' + ws.target + ' kilo' : 'Kışlık stok verisi yok';
        var saveW = function (res, step, flags) {
          var u = [], old = wr;
          var rec = Object.assign({}, old || {}, { date: today(), narrowed: flags.n, entrance: flags.n, insulation: flags.i,
            storesKg: res.custom ? res.v : (old && old.storesKg != null ? old.storesKg : (ws && ws.kg != null ? ws.kg : null)),
            strongEnough: bee != null ? (bee >= 5 ? 'evet' : 'hayir') : (old ? old.strongEnough : ''), note: 'Bakım akışı' + changed(res) + (demo() ? ' · Demo' : '') }, sugFields(res, step));
          delete rec.id;
          var r = D.records.add(h.id, 'winter', rec);
          if (r) u.push(function () { D.records.remove(h.id, 'winter', r.id); if (old) D.records.add(h.id, 'winter', old); });
          return r ? u : null;
        };
        steps.push({ key: 'kislik', icon: '❄️', title: 'Kışlık hazırlık', kind: 'choice', recLabel: 'Uçuş deliğini daraltın ve üstten yalıtım yapın', why: stockTxt,
          say: saySt + '. Önerim: uçuş deliğini daraltın ve yalıtım yapın. Tamam deyin, ya da yalnız daralttım deyin.',
          opts: [{ id: 'daralt', label: 'Yalnız uçuş deliğini daralttım', say: ['yalniz', 'daralttim'] }, { id: 'sonra', label: 'Sonra yapacağım (görev ekle)', say: ['sonra'] }],
          custom: { unit: 'kg', min: 0, max: 60, inc: 1, big: 5, init: ws && ws.kg != null ? Math.round(ws.kg) : (ws ? ws.target : 15), label: 'Ölçtüğünüz kışlık stok (kg)' },
          save: function (res, step) {
            if (res.opt === 'sonra') { var u0 = []; addTask(h, 'Kışlık: uçuş deliğini daralt, yalıtım yap', plusDays(7), 2, u0); return { text: 'Kışlık hazırlık görevi eklendi', say: 'kışlık hazırlık görevi', undo: u0 }; }
            if (res.custom) { var uc = saveW(res, step, { n: !!(wr && wr.narrowed), i: !!(wr && wr.insulation) }); return uc ? { text: 'Kışlık stok ' + num(res.v) + ' kg kaydedildi', say: 'kışlık stok ' + sayNum(res.v) + ' kilo', undo: uc } : null; }
            var both = res.opt !== 'daralt', u = saveW(res, step, { n: true, i: both });
            return u ? { text: both ? 'Uçuş deliği daraltıldı + yalıtım' : 'Uçuş deliği daraltıldı', say: both ? 'uçuş deliği daraltıldı ve yalıtım yapıldı' : 'uçuş deliği daraltıldı', undo: u } : null;
          } });
      }
    }

    /* 6) Hastalık belirtisi */
    if (a.hastalik === 'var') {
      steps.push({ key: 'hastalik', icon: '🔍', title: 'Hastalık belirtisi', kind: 'choice', recLabel: 'Fotoğrafla hastalık tahmini yapın', why: 'Muayenede belirti işaretlendi',
        say: 'Hastalık belirtisi işaretlediniz. Önerim: fotoğrafla hastalık tahmini. Tamam, numune ya da izle deyin.',
        opts: [{ id: 'numune', label: 'Numune alıp laboratuvara göndereceğim', say: ['numune', 'laboratuvar'] }, { id: 'izle', label: '1 hafta sonra tekrar bakacağım', say: ['izle', 'hafta'] }],
        save: function (res) {
          var u = [];
          if (res.opt === 'numune') { addTask(h, 'Hastalık: numune al, laboratuvara gönder', plusDays(1), 1, u); return { text: 'Numune görevi eklendi', say: 'numune görevi', undo: u }; }
          if (res.opt === 'izle') { addTask(h, 'Hastalık belirtisi: tekrar bak', plusDays(7), 2, u); return { text: '1 hafta sonra kontrol görevi', say: 'bir hafta sonra kontrol görevi', undo: u }; }
          addTask(h, 'Hastalık tahmini yap (fotoğraf)', today(), 1, u);
          need('hastalik-tahmin.js', 'SuperAriHastalik').then(function (Hz) { Hz.open(h.id, {}); }).catch(function () { /* ignore */ });
          return { text: 'Hastalık tahmini açıldı · görev eklendi', say: 'hastalık tahmini görevi', undo: u };
        } });
    }

    /* 7) Not */
    steps.push({ key: 'not', icon: '📝', title: 'Not', kind: 'note', recLabel: 'Eklemek istediğiniz bir not var mı?', why: 'İsteğe bağlı · kovan geçmişine yazılır',
      say: 'Son olarak not eklemek ister misiniz? Notu söyleyin ya da atla deyin.',
      save: function (res, step) { var u = []; if (!res.text) return null; addEvent(h, 'not', res.text.slice(0, 250), { sug: '' }, step, u); return { text: '“' + res.text.slice(0, 80) + '”', say: 'not', undo: u }; } });
    return steps;
  }

  /* ---------------- Arayüz (eldivenle: düğmeler ≥64px, aralık ≥12px) ---------------- */
  var css = '.ba-back{position:fixed;inset:0;background:rgba(20,14,8,.55);z-index:8995;display:flex;justify-content:center;}' +
    '.ba{background:#fffaf2;width:100%;max-width:560px;height:100%;display:flex;flex-direction:column;box-sizing:border-box;color:#2a1a0e;overflow-wrap:anywhere;font-family:inherit;}' +
    '.ba *{box-sizing:border-box;}' +
    '.ba-head{padding:10px 12px;border-bottom:1px solid #eadfcd;background:#fff3de;}.ba-t{display:flex;gap:12px;align-items:center;}' +
    '.ba-t b{flex:1;min-width:0;font-size:18px;line-height:1.2;}.ba-sub{font-size:14px;color:#5b4631;font-weight:700;margin-top:4px;}' +
    '.ba-bar{height:10px;background:#efe4d2;border-radius:99px;overflow:hidden;margin-top:6px;}.ba-bar i{display:block;height:100%;background:linear-gradient(90deg,#f0a202,#e56f1c);}' +
    '.ba-x{flex:none;width:64px;height:64px;border-radius:16px;border:2px solid #c9b79c;background:#fff;font-size:30px;font-weight:800;color:#2a1a0e;cursor:pointer;}' +
    '.ba-vt{flex:none;min-height:64px;padding:0 12px;border-radius:16px;border:2px solid #c9b79c;background:#fff;color:#2a1a0e;font:inherit;font-size:16px;font-weight:800;cursor:pointer;line-height:1.15;}' +
    '.ba-vt.on{background:#1b5e20;border-color:#1b5e20;color:#fff;}' +
    '.ba-body{flex:1;overflow:auto;padding:14px 12px 18px;display:flex;flex-direction:column;gap:12px;}' +
    '.ba-kick{font-size:17px;font-weight:800;color:#8a4b00;}.ba-sug{font-size:26px;font-weight:900;line-height:1.2;color:#2a1a0e;}' +
    '.ba-sub2{font-size:18px;font-weight:800;color:#3d2616;}.ba-why{font-size:15px;color:#4a3826;font-weight:600;line-height:1.35;}' +
    '.ba-done{background:#ebfbee;border:2px solid #69db7c;color:#1b5e20;border-radius:14px;padding:12px;font-size:17px;font-weight:800;}' +
    '.ba-btn{display:block;width:100%;min-height:64px;border-radius:16px;border:2px solid #b8a386;background:#fff;color:#2a1a0e;font:inherit;font-size:19px;font-weight:800;cursor:pointer;padding:10px 14px;text-align:center;line-height:1.2;}' +
    '.ba-btn:active{transform:scale(.99);}.ba-btn:disabled{opacity:.45;}' +
    '.ba-ok{min-height:80px;font-size:23px;background:#1b5e20;border-color:#1b5e20;color:#fff;}' +
    '.ba-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}.ba-3 .ba-btn{padding:8px 4px;font-size:17px;min-height:76px;}.ba-3 .ba-btn b{display:block;font-size:19px;font-weight:900;margin-top:2px;}' +
    '.ba-3 .ba-btn.u{border-color:#1b5e20;border-width:3px;}.ba-alt{text-align:left;}' +
    '.ba-own{border-color:#1c5fa8;color:#0d3d73;}.ba-skip{background:#f1ebe2;border-color:#a8977e;color:#2a1a0e;}' +
    '.ba-pnl{border:2px solid #1c5fa8;border-radius:16px;padding:12px;background:#f3f8ff;display:flex;flex-direction:column;gap:12px;}' +
    '.ba-lbl{font-size:16px;font-weight:800;text-align:center;}' +
    '.ba-step{display:grid;grid-template-columns:76px minmax(0,1fr) 76px;gap:12px;align-items:center;}.ba-step button{height:76px;border-radius:16px;border:2px solid #1c5fa8;background:#fff;font:inherit;font-size:38px;font-weight:900;color:#0d3d73;cursor:pointer;}' +
    '.ba-step output{font-size:32px;font-weight:900;text-align:center;}.ba-step2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}.ba-step2 button{min-height:64px;border-radius:14px;border:2px solid #1c5fa8;background:#fff;font:inherit;font-size:20px;font-weight:800;color:#0d3d73;cursor:pointer;}' +
    '.ba-seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:12px;}.ba-seg button,.ba-prods button{min-height:64px;border-radius:14px;border:2px solid #7f9cc4;background:#fff;font:inherit;font-size:16px;font-weight:800;color:#0d3d73;cursor:pointer;padding:4px;}' +
    '.ba-seg button.on,.ba-prods button.on{background:#1c5fa8;color:#fff;border-color:#1c5fa8;}.ba-prods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}' +
    '.ba-warn{background:#fff4e6;border:2px solid #ffc078;color:#7a3e00;border-radius:12px;padding:10px;font-size:15px;font-weight:700;}' +
    '.ba-note{width:100%;min-height:120px;font:inherit;font-size:18px;border-radius:14px;border:2px solid #b8a386;padding:10px;}' +
    '.ba-foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eadfcd;background:#fffdf8;}' +
    '.ba-vbar{background:#10381a;color:#fff;border-radius:14px;padding:10px 12px;font-size:15px;font-weight:700;display:flex;gap:10px;align-items:center;}.ba-vbar[hidden]{display:none;}.ba-vbar i{width:14px;height:14px;border-radius:50%;background:#8a8a8a;flex:none;}.ba-vbar i.on{background:#ff4d4d;box-shadow:0 0 0 4px rgba(255,77,77,.3);}' +
    '.ba-sum{border:2px solid #eadfcd;background:#fff;border-radius:14px;padding:4px 12px;}.ba-row{display:flex;gap:10px;padding:10px 0;border-top:1px solid #f1e8da;font-size:16px;line-height:1.35;font-weight:700;}.ba-row:first-child{border-top:0;}.ba-row>span{flex:none;font-size:20px;}.ba-row small{display:block;color:#5b4631;font-size:14px;font-weight:600;}' +
    '.ba-tag{display:inline-block;font-size:13px;font-weight:800;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle;}.ba-tag.k{background:#d3f9d8;color:#1b5e20;}.ba-tag.d{background:#dbe9ff;color:#0d3d73;}.ba-tag.s{background:#eee;color:#555;}';
  function ensureCss() { if (document.getElementById('baCss')) return; var s = document.createElement('style'); s.id = 'baCss'; s.textContent = css; document.head.appendChild(s); }

  var cur = null;
  function close() {
    if (cur && cur.voice) cur.voice.off(true);
    var b = document.getElementById('baSheet'); if (b) b.remove();
    document.body.style.overflow = '';
    cur = null;
  }

  /* ---------------- Ses motoru (doğal ses: sesle-muayene ses seçici) ---------------- */
  function Voice(onText, onState) {
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition, self = this, rec = null, fails = 0;
    this.on = false; this.speaking = false; this.listening = false; this.canListen = !!SR; this.canSpeak = !!global.speechSynthesis;
    function stopRec() { try { if (rec) rec.abort(); } catch (e) { /* ignore */ } rec = null; self.listening = false; }
    this.say = function (text, then) {
      if (!self.on) return;
      stopRec();
      self.lastText = text;
      if (!self.canSpeak) { onState('say', text); if (then) then(); else self.listen(); return; }
      self.speaking = true; onState('say', text);
      var done = false, fin = function () { if (done) return; done = true; self.speaking = false; if (!self.on) return; if (then) then(); else self.listen(); };
      try {
        global.speechSynthesis.cancel();
        var u = new global.SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 1.0;
        var VS = global.SuperAriSesle, v = VS && VS.pickVoice ? VS.pickVoice() : null; if (v) { u.voice = v; u.lang = v.lang; }
        u.onend = fin; u.onerror = fin;
        global.speechSynthesis.speak(u);
        setTimeout(fin, Math.min(25000, 2000 + text.length * 90));
      } catch (e) { fin(); }
    };
    this.listen = function () {
      if (!self.on || self.speaking) return;
      if (!SR || !self.canListen) { onState(SR ? 'denied' : 'nolisten'); return; }
      stopRec();
      var r = new SR(); rec = r; r.lang = 'tr-TR'; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
      var got = false;
      r.onstart = function () { self.listening = true; onState('listen'); };
      r.onresult = function (e) {
        got = true; fails = 0;
        var res = e.results[e.results.length - 1], alts = [];
        for (var i = 0; i < res.length; i++) alts.push(res[i].transcript);
        onText(alts);
      };
      r.onerror = function (e) { if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) { self.canListen = false; onState('denied'); } };
      r.onend = function () {
        self.listening = false; if (rec === r) rec = null;
        if (!self.on || got || self.speaking || !self.canListen) return;
        fails++;
        if (fails >= 8) { onState('idle'); return; }
        setTimeout(function () { if (self.on && !self.speaking && !self.listening) self.listen(); }, 300);
      };
      try { r.start(); } catch (e) { self.listening = false; }
    };
    this.start = function () { self.on = true; fails = 0; };
    this.off = function (silent) { self.on = false; stopRec(); try { global.speechSynthesis.cancel(); } catch (e) { /* ignore */ } if (!silent) onState('off'); };
    this.resetFails = function () { fails = 0; };
  }

  /* ---------------- Akış ---------------- */
  /**
   * open(hiveId, opts): opts.apiary (sıra kapsamı: arılık id veya 'all'), opts.hives, opts.voice, opts.skipInspection, opts.onClose()
   */
  function open(hiveId, opts) {
    opts = opts || {}; D = global.SuperAriDemo;
    var h = D && D.hiveById(hiveId); if (!h) return;
    deps().then(function () {
      var K = global.SuperAriKolayMuayene;
      var voiceOn = opts.voice != null ? !!opts.voice : voicePref();
      if (voiceOn) need('sesle-muayene.js', 'SuperAriSesle').catch(function () { return null; });
      if (opts.skipInspection || !K) { run(h, opts, null, voiceOn); return; }
      K.open(h.id, { akis: true, apiary: opts.apiary, voice: voiceOn ? true : false,
        afterSave: function (info) { run(D.hiveById(h.id), opts, info, voiceOn || !!info.voice); } });
    });
  }
  function run(h, opts, info, voiceOn) {
    ensureCss(); close();
    var st = { h: h, info: info, steps: buildSteps(h, info), i: 0, res: {}, own: false, ownVal: null, ownType: null, ownUnit: null, ownProd: null, noteText: '', done: false, prefix: '' };
    var back = document.createElement('div'); back.className = 'ba-back'; back.id = 'baSheet';
    back.innerHTML = '<div class="ba" role="dialog" aria-modal="true" aria-label="Bakım akışı"><div class="ba-head"><div class="ba-t"><b data-ba-title></b><button type="button" class="ba-vt" data-ba-voice aria-pressed="false">🔈 Sesli<br>Kapalı</button><button type="button" class="ba-x" data-ba-close aria-label="Kapat">×</button></div>' +
      '<div class="ba-sub" data-ba-sub></div><div class="ba-bar"><i data-ba-bar></i></div></div><div class="ba-body" data-ba-body></div><div class="ba-foot" data-ba-foot></div></div>';
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    var body = back.querySelector('[data-ba-body]'), foot = back.querySelector('[data-ba-foot]');
    var vstate = { txt: '', mode: '' };
    var V = new Voice(function (alts) { handleVoice(alts); }, function (m, txt) {
      if (m === 'say') vstate = { txt: '🔊 ' + txt, mode: '' };
      else if (m === 'listen') vstate = { txt: '🎙 Dinliyorum… «tamam», «az», «uygun», «çok», miktar, «atla», «geri»', mode: 'on' };
      else if (m === 'nolisten') vstate = { txt: 'Bu tarayıcıda dinleme yok; öneriler okunur, dokunarak seçin.', mode: '' };
      else if (m === 'denied') vstate = { txt: 'Mikrofon izni yok; dokunarak seçin.', mode: '' };
      else if (m === 'idle') vstate = { txt: 'Sizi duyamadım. Devam için «Sesli»ye iki kez dokunun.', mode: '' };
      else vstate = { txt: '', mode: '' };
      var vb = back.querySelector('[data-ba-vbar]'); if (vb) { vb.hidden = !V.on && !vstate.txt; vb.querySelector('span').textContent = vstate.txt; vb.querySelector('i').className = vstate.mode === 'on' ? 'on' : ''; }
    });
    cur = { voice: V };
    function setVoice(on) {
      var b = back.querySelector('[data-ba-voice]');
      if (on) { V.start(); b.classList.add('on'); b.innerHTML = '🔊 Sesli<br>Açık'; b.setAttribute('aria-pressed', 'true'); }
      else { V.off(); b.classList.remove('on'); b.innerHTML = '🔈 Sesli<br>Kapalı'; b.setAttribute('aria-pressed', 'false'); }
      setVoicePref(on);
    }
    function step() { return st.steps[st.i]; }
    function head() {
      var n = st.steps.length, fin = st.i >= n;
      back.querySelector('[data-ba-title]').textContent = 'Bakım akışı · ' + st.h.name;
      back.querySelector('[data-ba-sub]').textContent = (fin ? 'Özet' : 'Öneri ' + (st.i + 1) + ' / ' + n + (st.info ? ' · muayene kaydedildi' : '')) + (demo() ? ' · Demo' : '');
      back.querySelector('[data-ba-bar]').style.width = Math.round(((fin ? n : st.i) + 1) / (n + 1) * 100) + '%';
    }
    function fmtRec(s) { return s.kind === 'amount' ? s.fmt(s.rec, s.type) : s.recLabel; }
    function presetLabel(id) { return { az: 'Az', uygun: 'Uygun', cok: 'Çok' }[id]; }
    function vbarHtml() { return '<div class="ba-vbar" data-ba-vbar' + (V.on || vstate.txt ? '' : ' hidden') + '><i class="' + (vstate.mode === 'on' ? 'on' : '') + '"></i><span>' + esc(vstate.txt) + '</span></div>'; }
    function render(speak) {
      head();
      if (st.i >= st.steps.length) return renderSum(speak);
      var s = step(), r = st.res[s.key], H = vbarHtml();
      H += '<div class="ba-kick">' + s.icon + ' ' + esc(s.title) + '</div>';
      if (s.kind === 'note') {
        H += '<div class="ba-sug">' + esc(s.recLabel) + '</div><div class="ba-why">' + esc(s.why) + '</div>' + (r && r.out ? '<div class="ba-done">✓ Kaydedildi: ' + esc(r.out.text) + '</div>' : '') +
          '<textarea class="ba-note" data-ba-note maxlength="250" placeholder="Kısa not (yazın veya 🎤 ile söyleyin)">' + esc(st.noteText) + '</textarea>' +
          '<button type="button" class="ba-btn ba-ok" data-ba-savenote>✓ Notu kaydet</button><button type="button" class="ba-btn ba-skip" data-ba-skip>Not yok · Atla</button>';
        body.innerHTML = H;
        if (global.SuperAriKoloni && global.SuperAriKoloni.addMicButtons) { try { global.SuperAriKoloni.addMicButtons(body); } catch (e) { /* ignore */ } }
      } else {
        H += '<div class="ba-sug">' + esc(fmtRec(s)) + '</div>';
        if (s.sub) H += '<div class="ba-sub2">' + esc(s.sub(s.rec, s.type)) + '</div>';
        if (s.why) H += '<div class="ba-why">' + esc(s.why) + '</div>';
        if (r && r.out) H += '<div class="ba-done">✓ Kaydedildi: ' + esc(r.out.text) + (r.res.sug && r.res.sug !== 'kabul' ? ' <span class="ba-tag d">değiştirildi</span>' : ' <span class="ba-tag k">öneri</span>') + '<br><small style="font-weight:600;">Yeniden seçerseniz önceki kayıt silinir.</small></div>';
        H += '<button type="button" class="ba-btn ba-ok" data-ba-ok>✓ Tamam (önerilen)</button>';
        if (s.kind === 'amount' && s.presets && !s.noPresets) {
          H += '<div class="ba-3" role="group" aria-label="Miktar seçenekleri">' + s.presets.map(function (p) {
            return '<button type="button" class="ba-btn' + (p.id === 'uygun' ? ' u' : '') + '" data-ba-pre="' + p.id + '">' + presetLabel(p.id) + '<b>' + esc(num(p.v) + ' ' + UNIT_TXT[s.unit]) + '</b></button>';
          }).join('') + '</div>';
        }
        if (s.noPresets) H += '<div class="ba-why">İlaçta Az / Çok yok: yalnız etiket dozu önerilir.</div>';
        (s.opts || []).forEach(function (o, k) { H += '<button type="button" class="ba-btn ba-alt" data-ba-opt="' + k + '">' + esc(o.label) + '</button>'; });
        if (s.custom || s.kind === 'amount') H += st.own ? ownPanel(s) : '<button type="button" class="ba-btn ba-own" data-ba-own>✎ Kendim gireyim</button>';
        H += '<button type="button" class="ba-btn ba-skip" data-ba-skip>Atla (yapmadım)</button>';
        body.innerHTML = H;
      }
      foot.innerHTML = '<button type="button" class="ba-btn" data-ba-back' + (st.i === 0 ? ' disabled' : '') + '>← Geri</button><button type="button" class="ba-btn" data-ba-fwd>İleri →</button>';
      if (speak !== 'keep') body.scrollTop = 0;
      if (speak !== false && speak !== 'keep' && V.on) promptVoice();
    }
    function ownDef(s) {
      var c = s.custom || {};
      return { unit: st.ownUnit || c.unit || s.unit, min: c.min != null ? c.min : (s.min || 0), max: c.max || s.max || 100, inc: c.inc || s.inc || 1, big: c.big, label: c.label || 'Uyguladığınız miktar' };
    }
    function ownPanel(s) {
      var d = ownDef(s), c = s.custom || {};
      if (st.ownVal == null) st.ownVal = c.init != null ? c.init : s.rec;
      var H = '<div class="ba-pnl">';
      if (s.types) H += '<div class="ba-seg" role="group" aria-label="Tür">' + s.types.map(function (t) { return '<button type="button" data-ba-type="' + t + '" class="' + ((st.ownType || s.type) === t ? 'on' : '') + '">' + esc(t === 'kek' ? 'Kek' : s.typeInfo[t].label) + '</button>'; }).join('') + '</div>';
      if (c.products) {
        H += '<div class="ba-lbl">Ürün</div><div class="ba-prods">' + c.products.map(function (p) { return '<button type="button" data-ba-prod="' + p.id + '" class="' + ((st.ownProd || c.product) === p.id ? 'on' : '') + '">' + esc(p.label) + '</button>'; }).join('') + '</div>';
        H += '<div class="ba-seg" role="group" aria-label="Birim">' + c.units.map(function (u) { return '<button type="button" data-ba-unit="' + u + '" class="' + (d.unit === u ? 'on' : '') + '">' + UNIT_TXT[u] + '</button>'; }).join('') + '</div>';
      }
      H += '<div class="ba-lbl">' + esc(d.label) + '</div><div class="ba-step"><button type="button" data-ba-inc="-1" aria-label="Azalt">−</button><output data-ba-out>' + esc(num(st.ownVal) + ' ' + (UNIT_TXT[d.unit] || '')) + '</output><button type="button" data-ba-inc="1" aria-label="Artır">+</button></div>';
      if (d.big) H += '<div class="ba-step2"><button type="button" data-ba-inc="-' + d.big + '">−' + d.big + '</button><button type="button" data-ba-inc="' + d.big + '">+' + d.big + '</button></div>';
      if (s.types && s.sub) H += '<div class="ba-why" data-ba-ownsub>' + esc(s.sub(st.ownVal, st.ownType || s.type)) + '</div>';
      if (c.warn) H += '<div class="ba-warn">' + esc(c.warn) + '</div>';
      H += '<button type="button" class="ba-btn ba-ok" data-ba-ownsave style="min-height:64px;font-size:20px;">✓ Bunu kaydet</button></div>';
      return H;
    }
    function incOwn(d) {
      var s = step(), o = ownDef(s), inc = Math.abs(d) === 1 ? o.inc : 1;
      st.ownVal = Math.max(o.min, Math.min(o.max, Math.round((Number(st.ownVal) + d * inc) * 100) / 100));
      var out = back.querySelector('[data-ba-out]'); if (out) out.textContent = num(st.ownVal) + ' ' + (UNIT_TXT[o.unit] || '');
      var sb = back.querySelector('[data-ba-ownsub]'); if (sb && s.sub) sb.textContent = s.sub(st.ownVal, st.ownType || s.type);
    }
    /* Kaydet: önceki kayıt varsa geri al, yenisini yaz, sesle onayla, ilerle */
    function commit(res) {
      var s = step(); if (!s) return;
      var prev = st.res[s.key];
      if (prev && prev.out && prev.out.undo) prev.out.undo.slice().reverse().forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
      if (prev && prev.inserted) st.steps = st.steps.filter(function (x) { return x !== prev.inserted; });
      var out = null;
      try { out = s.save(res, s); } catch (e) { out = null; if (global.console) global.console.error(e); }
      if (!out) { delete st.res[s.key]; if (V.on) V.say('Kaydedemedim. Dokunarak deneyin.'); return; }
      var entry = { res: res, out: out };
      if (out.insert) { st.steps.splice(st.i + 1, 0, out.insert); entry.inserted = out.insert; }
      st.res[s.key] = entry;
      try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
      st.own = false; st.ownVal = null; st.ownType = null; st.ownUnit = null; st.ownProd = null; st.pendingOwn = false;
      st.i++;
      if (V.on) st.prefix = 'Kaydettim: ' + out.say + '.';
      render();
    }
    function skip(tap) {
      var s = step(); if (!s) return;
      if (!st.res[s.key]) st.res[s.key] = { skipped: true };
      st.own = false; st.ownVal = null; st.pendingOwn = false;
      st.i++;
      if (V.on) st.prefix = tap ? '' : 'Geçtim.';
      render();
    }
    function goBack() {
      if (st.i === 0) { if (V.on) V.say('İlk öneri bu.'); return; }
      st.i--; st.own = false; st.ownVal = null; st.pendingOwn = false; render();
    }
    function choose(kind, x) {
      var s = step(); if (!s) return;
      if (kind === 'ok') {
        if (st.pendingOwn) { choose('own'); return; }
        if (s.okCustom) { st.own = true; render(false); if (V.on) V.say('Akar sayısını söyleyin.'); return; }
        if (s.kind === 'amount') commit({ sug: 'kabul', v: s.rec, type: s.type, product: s.product, unit: s.unit });
        else commit({ sug: 'kabul', opt: s.recId || null });
        return;
      }
      if (kind === 'pre') { var p = s.presets.filter(function (q) { return q.id === x; })[0]; commit({ sug: x === 'uygun' ? 'kabul' : x, v: p.v, type: s.type, unit: s.unit }); return; }
      if (kind === 'opt') { var o = s.opts[x]; commit({ sug: 'alternatif', opt: o.id, v: o.v }); return; }
      if (kind === 'own') {
        var d = ownDef(s), t = st.ownType || s.type, c = s.custom || {}, v = Number(st.ownVal);
        var same = s.kind === 'amount' && v === s.rec && t === s.type && (!c.products || ((st.ownProd || c.product) === s.product && d.unit === s.unit));
        commit({ sug: same ? 'kabul' : 'degisti', v: v, type: t, custom: true, unit: d.unit, product: st.ownProd || c.product });
      }
    }
    /* ---- Ses ---- */
    function promptVoice() {
      var s = step(), pre = st.prefix || ''; st.prefix = '';
      var text;
      if (!s) text = sumSpeech();
      else if (s.kind === 'note') text = s.say;
      else if (s.say) text = s.title.split(' (')[0] + '. ' + s.say + (s.key === 'ana' && s.opts.length ? ' Seçenekler: ' + s.opts.map(function (o) { return o.label.split(' (')[0]; }).join(', ') + '.' : '');
      else {
        var u = UNIT_SAY[s.unit] || '';
        text = s.title.split(' (')[0] + '. Önerim: ' + s.sayV(s.rec, s.type) + '.';
        if (s.presets && !s.noPresets) text += ' Az: ' + sayNum(s.presets[0].v) + ' ' + u + ', çok: ' + sayNum(s.presets[2].v) + ' ' + u + '.';
        if (s.opts && s.opts.length) text += ' Diğer seçenek: ' + s.opts.map(function (o) { return o.label.split(' · ')[0]; }).join(', ') + '.';
        text += ' Tamam deyin' + (s.presets && !s.noPresets ? ', az ya da çok deyin,' : '') + ' ya da miktar söyleyin.';
      }
      V.say(pre ? pre + ' ' + text : text);
    }
    function handleVoice(alts) {
      var s = step(), r = null, raw = alts[0] || '';
      for (var i = 0; i < alts.length; i++) { var p = parseCmd(alts[i]); if (!p.none) { r = p; raw = alts[i]; break; } }
      if (!r) r = { none: true, text: raw };
      vstate = { txt: '🗣 «' + raw + '»', mode: '' };
      if (r.cmd === 'dur') { V.say('Sesli modu kapatıyorum.', function () { setVoice(false); }); return; }
      if (r.cmd === 'tekrar') { promptVoice(); return; }
      if (!s) {
        if (r.cmd === 'sonraki' || r.cmd === 'tamam' || r.cmd === 'ileri') { var nx = nextHive(); if (nx) V.say('Sıradaki kovan: ' + nx.name + '.', function () { goNextHive(); }); else V.say('Sırada başka kovan yok. Bitti.', function () { setVoice(false); }); return; }
        if (r.cmd === 'geri') { st.i = Math.max(0, st.steps.length - 1); render(); return; }
        if (r.cmd === 'bitir') { V.say('Tamam, bitiriyorum.', function () { finish(); }); return; }
        V.say('Sonraki kovan ya da bitir deyin.'); return;
      }
      if (s.kind === 'note') {
        if (r.cmd === 'atla' || r.cmd === 'hayir' || r.cmd === 'ileri') { skip(); return; }
        if (r.cmd === 'geri') { goBack(); return; }
        if (raw && !((r.cmd === 'tamam' || r.cmd === 'bitir') && fold(raw).split(' ').length <= 2)) { st.noteText = raw; commit({ text: raw }); return; }
        skip(); return;
      }
      if (r.cmd === 'geri') { goBack(); return; }
      if (r.cmd === 'atla' || r.cmd === 'ileri') { skip(); return; }
      if (r.cmd === 'sonraki') { st.i = st.steps.length; render(); return; }
      if (r.cmd === 'kendim') { st.own = true; render(false); V.say('Miktarı söyleyin ya da artı eksiyle girin.'); return; }
      if (st.own && r.n != null) {
        var d0 = ownDef(s), cv0 = convert(r.n, r.unit, d0.unit); if (cv0 == null) cv0 = r.n;
        st.ownVal = Math.max(d0.min, Math.min(d0.max, cv0)); choose('own'); return;
      }
      if (r.n != null && (s.kind === 'amount' || s.custom) && !(r.cmd === 'tamam' && !r.unit && r.n === 1 && fold(raw).split(' ').length === 1)) {
        var d = ownDef(s), to = s.kind === 'amount' ? s.unit : d.unit, cv = convert(r.n, r.unit, to);
        if (cv == null) { V.say('Bu adımın birimi ' + UNIT_SAY[to] + '. Tekrar söyler misiniz?'); return; }
        if (s.noPresets && cv !== s.rec) { st.own = true; st.ownVal = cv; render(false); st.pendingOwn = true; V.say(sayNum(cv) + ' şerit, etiket dozundan farklı. Yine de kaydetmek için tamam deyin, yapmadıysanız atla deyin.'); return; }
        if (s.kind === 'amount') { cv = Math.max(s.min || 0, Math.min(s.max || 100, cv)); commit({ sug: cv === s.rec ? 'kabul' : 'degisti', v: cv, type: s.type, unit: s.unit, product: s.product, custom: true }); return; }
        st.ownVal = Math.max(d.min, Math.min(d.max, cv)); choose('own'); return;
      }
      if (r.cmd === 'tamam') { choose('ok'); return; }
      if (r.ord && s.opts) { if (r.ord === 1) { choose('ok'); return; } if (s.opts[r.ord - 2]) { choose('opt', r.ord - 2); return; } }
      if ((r.cmd === 'az' || r.cmd === 'uygun' || r.cmd === 'cok') && s.presets && !s.noPresets) { choose('pre', r.cmd); return; }
      if (r.cmd === 'uygun') { choose('ok'); return; }
      var f = fold(raw);
      if (s.opts) for (var j = 0; j < s.opts.length; j++) { if ((s.opts[j].say || []).some(function (w) { return hasPhrase(f, fold(w)); })) { choose('opt', j); return; } }
      if ((r.cmd === 'az' || r.cmd === 'cok') && s.noPresets) { V.say('İlaçta az ya da çok önermiyorum; yalnız etiket dozu. Tamam ya da atla deyin.'); return; }
      if (r.cmd === 'hayir') { V.say((s.presets && !s.noPresets ? 'Az, çok ya da miktar söyleyin. ' : (s.opts && s.opts.length ? 'Seçenekler: ' + s.opts.map(function (o) { return o.label.split(' · ')[0].split(' (')[0]; }).join(', ') + '. ' : '')) + 'Yapmadıysanız atla deyin.'); return; }
      V.say('Anlamadım. Tamam, atla ya da miktar söyleyin.');
    }
    function sumLines() {
      var L = [];
      if (st.info) L.push({ ic: '🔍', t: 'Muayene kaydedildi', s: (st.info.lines || []).slice(0, 4).join(' · '), tag: '' });
      st.steps.forEach(function (s) {
        var r = st.res[s.key], recTxt = s.kind === 'amount' ? s.fmt(s.rec, s.type) : s.recLabel;
        if (!r || r.skipped) { if (s.kind !== 'note') L.push({ ic: s.icon, t: s.title + ': atlandı', s: 'Öneri: ' + recTxt, tag: 's' }); return; }
        L.push({ ic: s.icon, t: s.title + ': ' + r.out.text, s: r.res.sug && r.res.sug !== 'kabul' && s.kind !== 'note' ? 'Öneri: ' + recTxt : '', tag: s.kind === 'note' ? '' : (r.res.sug === 'kabul' ? 'k' : 'd') });
      });
      return L;
    }
    function sumSpeech() {
      var did = st.steps.filter(function (s) { var r = st.res[s.key]; return r && r.out; }).map(function (s) { return st.res[s.key].out.say; });
      var nx = nextHive();
      return st.h.name + ' tamam. ' + (did.length ? 'Yapılanlar: ' + did.join(', ') + '. ' : '') + (nx ? 'Sıradaki kovan ' + nx.name + '. Geçmek için sonraki kovan deyin.' : 'Sırada başka kovan yok.');
    }
    function renderSum(speak) {
      if (!st.done) { st.done = true; markDone(st.h.id); try { var P = global.SuperAriPlan; if (P && P.tourMarkDone && (!opts.apiary || String(opts.apiary) === String(st.h.apiaryId))) P.tourMarkDone(String(st.h.apiaryId), st.h.id); } catch (e) { /* ignore */ } }
      var L = sumLines(), nx = nextHive(), cs = null;
      try { cs = D.records.status(st.h.id); } catch (e) { cs = null; }
      var H = vbarHtml() + '<div class="ba-sug">✓ ' + esc(st.h.name) + ' tamam</div>' +
        (cs && (cs.strengthClass || cs.queenless) ? '<div class="ba-why">' + (cs.strengthClass ? 'Koloni: <b>' + esc(cs.strengthClass) + '</b>' : '') + (cs.queenless ? ' · <b>Anasız</b>' : '') + '</div>' : '') +
        (nx ? '<button type="button" class="ba-btn ba-ok" data-ba-nexthive>Sonraki kovan: ' + esc(nx.name) + ' →</button>' : '<div class="ba-done">Sırada bakım bekleyen kovan kalmadı.</div>') +
        '<div class="ba-sum">' + L.map(function (x) {
          return '<div class="ba-row"><span>' + x.ic + '</span><div>' + esc(x.t) + (x.tag === 'k' ? '<span class="ba-tag k">öneri kabul</span>' : x.tag === 'd' ? '<span class="ba-tag d">değiştirildi</span>' : x.tag === 's' ? '<span class="ba-tag s">atlandı</span>' : '') + (x.s ? '<small>' + esc(x.s) + '</small>' : '') + '</div></div>';
        }).join('') + '</div>';
      H += '<button type="button" class="ba-btn" data-ba-hive>Kovan detayı</button>';
      body.innerHTML = H;
      foot.innerHTML = '<button type="button" class="ba-btn" data-ba-back>← Geri</button><button type="button" class="ba-btn ba-skip" data-ba-finish>Bitir</button>';
      body.scrollTop = 0;
      if (speak !== false && V.on) promptVoice();
    }
    function hivesScope() {
      if (opts.hives) return typeof opts.hives === 'function' ? opts.hives() : opts.hives;
      var ap = opts.apiary || st.h.apiaryId;
      return String(ap) === 'all' ? D.loadHives() : D.hivesForApiary(ap);
    }
    function nextHive() { try { return nextInOrder(hivesScope(), st.h.id); } catch (e) { return null; } }
    function goNextHive() {
      var nx = nextHive(); if (!nx) return;
      var von = V.on; close();
      if (typeof opts.onNextHive === 'function') opts.onNextHive(nx);
      open(nx.id, Object.assign({}, opts, { voice: von, skipInspection: false }));
    }
    function finish() { close(); if (typeof opts.onClose === 'function') opts.onClose(); }
    back.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
      if (V.on) V.resetFails();
      if (t.hasAttribute('data-ba-close')) { finish(); return; }
      if (t.hasAttribute('data-ba-voice')) { var on = !V.on; setVoice(on); render(false); if (on) need('sesle-muayene.js', 'SuperAriSesle').catch(function () { return null; }).then(function () { promptVoice(); }); return; }
      if (t.hasAttribute('data-ba-ok')) { choose('ok'); return; }
      if (t.hasAttribute('data-ba-pre')) { choose('pre', t.getAttribute('data-ba-pre')); return; }
      if (t.hasAttribute('data-ba-opt')) { choose('opt', Number(t.getAttribute('data-ba-opt'))); return; }
      if (t.hasAttribute('data-ba-own')) { st.own = true; render('keep'); var pn = back.querySelector('.ba-pnl'); if (pn && pn.scrollIntoView) pn.scrollIntoView({ block: 'center' }); return; }
      if (t.hasAttribute('data-ba-inc')) { incOwn(Number(t.getAttribute('data-ba-inc'))); return; }
      if (t.hasAttribute('data-ba-type')) { var s0 = step(); st.ownType = t.getAttribute('data-ba-type'); st.ownUnit = s0.typeInfo ? s0.typeInfo[st.ownType].unit : null; render('keep'); return; }
      if (t.hasAttribute('data-ba-prod')) { st.ownProd = t.getAttribute('data-ba-prod'); render('keep'); return; }
      if (t.hasAttribute('data-ba-unit')) { st.ownUnit = t.getAttribute('data-ba-unit'); render('keep'); return; }
      if (t.hasAttribute('data-ba-ownsave')) { choose('own'); return; }
      if (t.hasAttribute('data-ba-savenote')) { var ta = back.querySelector('[data-ba-note]'); st.noteText = ta ? ta.value.trim() : ''; if (!st.noteText) { skip(true); return; } commit({ text: st.noteText }); return; }
      if (t.hasAttribute('data-ba-skip')) { skip(true); return; }
      if (t.hasAttribute('data-ba-fwd')) { var s1 = step(); if (s1 && st.res[s1.key]) { st.i++; st.own = false; st.ownVal = null; render(); } else skip(true); return; }
      if (t.hasAttribute('data-ba-back')) { goBack(); return; }
      if (t.hasAttribute('data-ba-nexthive')) { goNextHive(); return; }
      if (t.hasAttribute('data-ba-hive')) { var id = st.h.id; close(); location.href = 'kovan.html?id=' + encodeURIComponent(id); return; }
      if (t.hasAttribute('data-ba-finish')) { finish(); return; }
    });
    back.addEventListener('input', function (e) { if (e.target.hasAttribute('data-ba-note')) st.noteText = e.target.value; });
    if (voiceOn) setVoice(true);
    if (st.info) st.prefix = 'Muayeneyi kaydettim. Şimdi öneriler.';
    render();
  }

  API.open = open;
  API.close = close;
  API.order = order;
  API.buildSteps = buildSteps;
  API.nextInOrder = nextInOrder;
  API.isDone = isDone;
  API.voicePref = voicePref;
  API.setVoicePref = setVoicePref;
  global.SuperAriBakimAkis = API;
})(typeof window !== 'undefined' ? window : this);
