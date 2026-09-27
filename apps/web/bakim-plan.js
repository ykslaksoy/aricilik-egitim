/**
 * SüperArı — Bakım planı (yıllık yol haritası + kovan başına öneri).
 * Bölge takvimleri ve kışlık hedefler TAHMİNDİR (arıcılık rehberlerindeki genel aralıklar); arılığa göre düzeltilebilir.
 * İlaç dozları yalnız ilac-katalog.js'deki etiket kurallarından gelir.
 * Durum: superari.bakimPlan.v1 (canlı) / superari.bakimPlan.demo.v1 (demo).
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function stKey() { return mode() === 'live' ? 'superari.bakimPlan.v1' : 'superari.bakimPlan.demo.v1'; }
  function loadSt() {
    var s; try { s = JSON.parse(localStorage.getItem(stKey()) || '{}'); } catch (e) { s = {}; }
    if (!s || typeof s !== 'object') s = {};
    ['profiles', 'camBali', 'supers'].forEach(function (k) { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    return s;
  }
  function saveSt(s) { try { localStorage.setItem(stKey(), JSON.stringify(s)); } catch (e) { /* ignore */ } }
  function today() { return D.records.todayLocal(); }
  function addDays(d, n) { return D.records.addDays(d, n); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? Number(m[3]) + ' ' + AY[Number(m[2]) - 1] : ''; }
  var AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function num(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }

  /* ---------------- bölge profilleri (tahmin) ----------------
   * Tarihler 'AA-GG'. flow:true → bal akımı (ilaç yok, bal katı takılı olabilir). */
  var PROFILES = {
    sicak: {
      label: 'Sıcak / alçak (Akdeniz kıyısı)', winterKg: 15, springMinKg: 5,
      desc: 'Kısa ve ılık kış; erken ilkbahar. Çam balı akımı varsa sonbahar ilaçlaması akımdan sonraya kalır.',
      phases: [
        { key: 'ilkbahar', label: 'İlkbahar gelişimi', from: '02-01', to: '03-20' },
        { key: 'ogul', label: 'Oğul önleme', from: '03-15', to: '05-10' },
        { key: 'akim', label: 'Bal akımı (bahar)', from: '04-01', to: '06-15', flow: true },
        { key: 'hasat', label: 'Hasat', from: '06-15', to: '07-10' },
        { key: 'yaz', label: 'Yaz varroa kontrolü', from: '07-10', to: '08-10' },
        { key: 'cam', label: 'Çam balı akımı', from: '08-15', to: '11-15', flow: true, optional: 'camBali' },
        { key: 'sonbahar', label: 'Sonbahar ilaçlama + besleme', from: '09-01', to: '10-15', alt: { from: '11-15', to: '12-15' } },
        { key: 'kis', label: 'Kışlatma', from: '11-01', to: '12-31', alt: { from: '12-01', to: '12-31' } }
      ]
    },
    iliman: {
      label: 'Ilıman / iç bölge', winterKg: 20, springMinKg: 6,
      desc: 'Genel takvim; arılığınıza göre profil seçin.',
      phases: [
        { key: 'ilkbahar', label: 'İlkbahar gelişimi', from: '03-15', to: '04-30' },
        { key: 'ogul', label: 'Oğul önleme', from: '04-20', to: '05-31' },
        { key: 'akim', label: 'Bal akımı', from: '05-15', to: '07-15', flow: true },
        { key: 'hasat', label: 'Hasat', from: '07-15', to: '08-10' },
        { key: 'sonbahar', label: 'Sonbahar ilaçlama + besleme', from: '08-15', to: '09-30' },
        { key: 'kis', label: 'Kışlatma', from: '10-01', to: '11-15' }
      ]
    },
    yayla: {
      label: 'Yayla (≈1500 m, Tortum gibi)', winterKg: 22, springMinKg: 7,
      desc: 'Uzun kış, geç ilkbahar; kısa ve yoğun bal akımı.',
      phases: [
        { key: 'ilkbahar', label: 'İlkbahar gelişimi', from: '04-15', to: '05-31' },
        { key: 'ogul', label: 'Oğul önleme', from: '05-25', to: '06-30' },
        { key: 'akim', label: 'Bal akımı', from: '06-20', to: '08-15', flow: true },
        { key: 'hasat', label: 'Hasat', from: '08-15', to: '09-05' },
        { key: 'sonbahar', label: 'Sonbahar ilaçlama + besleme', from: '08-20', to: '09-20' },
        { key: 'kis', label: 'Kışlatma', from: '09-20', to: '10-31' }
      ]
    },
    yuksek: {
      label: 'Yüksek yayla (≈2000 m+, Palandöken, Cimil, Baluğundüzü)', winterKg: 25, springMinKg: 8,
      desc: 'Çok kısa sezon; sonbahar işleri erken biter. Konaklamalı arıcılıkta kışlatma yerine göre profil değiştirin.',
      phases: [
        { key: 'ilkbahar', label: 'İlkbahar gelişimi', from: '05-01', to: '06-10' },
        { key: 'ogul', label: 'Oğul önleme', from: '06-05', to: '07-05' },
        { key: 'akim', label: 'Bal akımı', from: '07-01', to: '08-20', flow: true },
        { key: 'hasat', label: 'Hasat', from: '08-20', to: '09-05' },
        { key: 'sonbahar', label: 'Sonbahar ilaçlama + besleme', from: '08-25', to: '09-15' },
        { key: 'kis', label: 'Kışlatma', from: '09-15', to: '10-20' }
      ]
    }
  };
  var JOBS = {
    ilkbahar: ['İlkbahar muayenesi: ana, yavru, stok', 'Varroa sayımı (ilkbahar)'],
    ogul: ['Oğul kontrolü: ana hücresi, yer açma / kat verme'],
    akim: ['Bal katı ver — bal akımında ilaç uygulanmaz'],
    hasat: ['Hasat öncesi ilaç bekleme süresini kontrol et'],
    yaz: ['Varroa sayımı (hasat sonrası)'],
    cam: ['Çam balı katı ver — akımda ilaç uygulanmaz'],
    sonbahar: ['Varroa sayımı ve etiketli ilaçlama', 'Kışlık stok kontrolü ve 2:1 besleme'],
    kis: ['Kışlatma: daraltma, giriş küçültme, yalıtım']
  };
  var SEED_PROFILE = { a1: 'sicak', a2: 'yayla', a3: 'yuksek', a4: 'yuksek', a5: 'yuksek' };
  var WARM_IL = ['Muğla', 'Antalya', 'Aydın', 'İzmir', 'Mersin', 'Adana', 'Hatay', 'Balıkesir', 'Çanakkale'];
  var HIGH_IL = ['Erzurum', 'Kars', 'Ardahan', 'Ağrı', 'Bayburt', 'Gümüşhane', 'Muş', 'Bitlis', 'Van', 'Hakkari', 'Sivas'];

  function autoProfile(a) {
    if (!a) return 'iliman';
    if (SEED_PROFILE[a.id] && D.isSeedApiaryId && D.isSeedApiaryId(a.id)) return SEED_PROFILE[a.id];
    var nm = String((a.name || '') + ' ' + (a.place || '') + ' ' + (a.koy || '')).toLocaleLowerCase('tr');
    var alt = Number(a.altitude || a.elevation || a.rakim);
    if (isFinite(alt) && alt > 0) return alt >= 1800 ? 'yuksek' : (alt >= 1100 ? 'yayla' : (alt < 400 && WARM_IL.indexOf(a.il) >= 0 ? 'sicak' : 'iliman'));
    if (/yayla/.test(nm)) return 'yayla';
    if (HIGH_IL.indexOf(a.il) >= 0) return 'yayla';
    if (WARM_IL.indexOf(a.il) >= 0) return 'sicak';
    return 'iliman';
  }
  function profileKey(apId) {
    var s = loadSt(); if (s.profiles[apId] && PROFILES[s.profiles[apId]]) return s.profiles[apId];
    return autoProfile(D.apiaryById ? D.apiaryById(apId) : null);
  }
  function setProfile(apId, key) { var s = loadSt(); if (PROFILES[key]) s.profiles[apId] = key; else delete s.profiles[apId]; saveSt(s); }
  function camBali(apId) { var s = loadSt(); return s.camBali[apId] !== false; }
  function setCamBali(apId, on) { var s = loadSt(); s.camBali[apId] = !!on; saveSt(s); }
  function hasSuper(hiveId) { return !!loadSt().supers[String(hiveId)]; }
  function setSuper(hiveId, on) { var s = loadSt(); if (on) s.supers[String(hiveId)] = today(); else delete s.supers[String(hiveId)]; saveSt(s); }

  /** Arılığın yıl içi evreleri (tarihleri ile). */
  function phases(apId, year) {
    year = year || Number(today().slice(0, 4));
    var p = PROFILES[profileKey(apId)], cam = camBali(apId);
    return p.phases.filter(function (x) { return !x.optional || cam; }).map(function (x) {
      var r = (x.alt && cam && p.phases.some(function (y) { return y.optional === 'camBali'; })) ? x.alt : x;
      return { key: x.key, label: x.label, flow: !!x.flow, from: year + '-' + r.from, to: year + '-' + r.to, jobs: JOBS[x.key] || [] };
    });
  }
  function phaseStatus(ph, d) { d = d || today(); return d < ph.from ? 'yaklasan' : (d > ph.to ? 'gecti' : 'simdi'); }
  /** Bal akımında mı? { flow, phase } */
  function flowAt(apId, d) {
    d = d || today();
    var hit = phases(apId).filter(function (x) { return x.flow && d >= x.from && d <= x.to; })[0];
    return { flow: !!hit, phase: hit || null };
  }
  /** Sonraki bal akımı başlangıcı (bugünden sonra). */
  function nextFlowStart(apId, d) {
    d = d || today();
    var y = Number(d.slice(0, 4)), list = phases(apId, y).concat(phases(apId, y + 1));
    var n = list.filter(function (x) { return x.flow && x.from > d; })[0];
    return n ? n.from : null;
  }

  /* ---------------- evre işlerini kovan görevlerine çevir ---------------- */
  function planTag(apId, ph, job) { return '[plan:' + apId + ':' + ph.key + ':' + ph.from.slice(0, 4) + ':' + job + ']'; }
  function existingTags() {
    var tags = {};
    try { D.taskStore.all().forEach(function (t) { var m = /\[plan:[^\]]+\]/.exec(t.note || ''); if (m) tags[m[0] + '|' + t.hiveId] = 1; }); } catch (e) { /* ignore */ }
    return tags;
  }
  /** { hives, created, skipped } */
  function addPhaseTasks(apId, phaseKey) {
    var ph = phases(apId).filter(function (x) { return x.key === phaseKey; })[0];
    if (!ph) return { created: 0, skipped: 0 };
    var hs = D.hivesForApiary ? D.hivesForApiary(apId) : D.loadHives().filter(function (h) { return String(h.apiaryId) === String(apId); });
    var tags = existingTags(), t = today(), due = ph.from > t ? ph.from : t, created = 0, skipped = 0;
    hs.forEach(function (h) {
      ph.jobs.forEach(function (job, i) {
        var tag = planTag(apId, ph, i);
        if (tags[tag + '|' + h.id]) { skipped++; return; }
        var r = D.taskStore.add({ title: job + ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id, due: due, priority: ph.key === 'sonbahar' ? 1 : 2,
          note: 'Bakım planı · ' + ph.label + ' (' + fmt(ph.from) + '–' + fmt(ph.to) + ') ' + tag });
        if (r) created++;
      });
    });
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { hives: hs.length, created: created, skipped: skipped };
  }

  /* ---------------- kovan durumu ---------------- */
  var KG_PER_HONEY_FRAME = 2; /* dolu Langstroth bal çerçevesi ≈ 2 kg (tahmin) */
  var SYRUP = { /* 1 L şurup içeriği (ağırlıkça oran; yoğunluk ≈ 1,33 / 1,23) ve kışlık stoğa katkısı (uygulamadaki katsayı) */
    surup21: { label: 'Şurup 2:1', sugarKg: 0.89, waterL: 0.44, storeKg: 0.8, perFeedL: 3, everyDays: 3 },
    surup11: { label: 'Şurup 1:1', sugarKg: 0.62, waterL: 0.62, storeKg: 0.5, perFeedL: 1, everyDays: 3 }
  };
  function hiveState(h) {
    var R = D.records, rec = R.recordsFor(h.id);
    var s = rec.strength[0] || null, vr = null, lastTreat = null;
    rec.disease.forEach(function (d) {
      if (d.disease !== 'varroa') return;
      if (!vr && (d.infestation != null || d.count != null)) vr = d;
      if (!lastTreat && d.treatment) lastTreat = d;
    });
    var w = null; try { w = R.winterStatus(h.id); } catch (e) { w = null; }
    return { hive: h, strength: s, beeFrames: s ? s.beeFrames : null, honeyFrames: s ? s.honeyFrames : null, cls: s ? R.strengthClass(s) : null,
      varroa: vr, lastTreat: lastTreat, winter: w, disease: rec.disease };
  }
  function seasonKind(apId, d) {
    d = d || today();
    if (flowAt(apId, d).flow) return 'akim';
    var ph = phases(apId, Number(d.slice(0, 4)));
    var cur = ph.filter(function (x) { return d >= x.from && d <= x.to && !x.flow; }).map(function (x) { return x.key; });
    if (cur.indexOf('sonbahar') >= 0 || cur.indexOf('kis') >= 0) return 'sonbahar';
    var son = ph.filter(function (x) { return x.key === 'sonbahar'; })[0];
    if (son && d >= addDays(son.from, -14) && d <= son.to) return 'sonbahar';
    var kis = ph.filter(function (x) { return x.key === 'kis'; })[0];
    if (kis && d > kis.to) return 'kis';
    if (cur.indexOf('ilkbahar') >= 0 || cur.indexOf('ogul') >= 0) return 'ilkbahar';
    var ilk = ph.filter(function (x) { return x.key === 'ilkbahar'; })[0];
    if (ilk && d < ilk.from) return 'kis';
    return 'yaz';
  }
  /** Besleme hesabı (tahmin). */
  function feedPlan(h, st) {
    st = st || hiveState(h);
    var apId = h.apiaryId, pr = PROFILES[profileKey(apId)], sk = seasonKind(apId);
    var out = { season: sk, hive: h, estimate: true };
    if (st.honeyFrames == null) { out.need = false; out.reason = 'Bal çerçevesi sayısı yok — önce muayene (güç) kaydı girin.'; return out; }
    var frameKg = st.honeyFrames * KG_PER_HONEY_FRAME;
    var measured = st.winter && st.winter.rec && st.winter.rec.storesKg != null ? st.winter.rec.storesKg : null;
    var fedKg = st.winter ? (st.winter.suggestedKg || 0) : 0;
    if (measured != null) {
      var md = st.winter.rec.date, FAC = { surup11: 0.5, surup21: 0.8, kek: 1, balli: 1 };
      D.records.recordsFor(h.id).feed.forEach(function (f) { if (f.date > md || (f.date === md && /Bakım planı/.test(f.note || ''))) measured += (Number(f.amount) || 0) * (FAC[f.type] || 0); });
      measured = Math.round(measured * 10) / 10;
    }
    out.storesKg = measured != null ? measured : Math.round((frameKg + (sk === 'sonbahar' || sk === 'kis' ? fedKg : 0)) * 10) / 10;
    out.storesSrc = measured != null ? 'kışlık kaydındaki ölçüm + sonraki beslemeler' : st.honeyFrames + ' bal çerçevesi × ' + KG_PER_HONEY_FRAME + ' kg' + (fedKg && (sk === 'sonbahar' || sk === 'kis') ? ' + bu sonbahar verilen besin' : '');
    if (sk === 'akim') { out.need = false; out.reason = 'Bal akımında şurup verilmez (bala karışır).'; return out; }
    var type, target;
    if (sk === 'sonbahar' || sk === 'kis') {
      type = 'surup21';
      target = pr.winterKg;
      if (st.cls === 'Zayıf') { out.weak = true; }
      if (sk === 'kis') { out.cold = true; }
    } else {
      type = 'surup11';
      target = pr.springMinKg;
    }
    out.type = type; out.targetKg = target;
    var deficit = Math.max(0, Math.round((target - out.storesKg) * 10) / 10);
    out.deficitKg = deficit;
    if (!deficit) { out.need = false; out.reason = 'Stok hedefte (' + num(out.storesKg) + ' / ' + target + ' kg).'; return out; }
    var S = SYRUP[type];
    var L = Math.ceil(deficit / S.storeKg * 2) / 2;
    if (type === 'surup11') L = Math.min(L, 6); /* uyarıcı besleme küçük dozlarla */
    var n = Math.max(1, Math.ceil(L / S.perFeedL));
    out.need = true; out.liters = L; out.sugarKg = Math.round(L * S.sugarKg * 10) / 10; out.waterL = Math.round(L * S.waterL * 10) / 10;
    out.feedings = n; out.perFeedL = Math.round(L / n * 10) / 10; out.everyDays = S.everyDays;
    if (out.cold) out.note = 'Kış ortası: şurup yerine kek (fondan) tercih edin; hesap yalnız bilgi amaçlıdır.';
    out.stock = feedStock(type, out);
    return out;
  }
  function feedStock(type, fp) {
    var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
    var syr = list.filter(function (x) { return x.feedType === type && x.unit === 'L'; })[0] || null;
    var sug = list.filter(function (x) { return x.category === 'seker' && x.unit === 'kg'; })[0] || null;
    var o = { syrup: syr, sugar: sug };
    if (syr) { o.use = 'syrup'; o.item = syr; o.perFeed = fp.perFeedL; o.unit = 'L'; o.total = fp.liters; }
    else if (sug) { o.use = 'sugar'; o.item = sug; o.perFeed = Math.round(fp.sugarKg / fp.feedings * 10) / 10; o.unit = 'kg'; o.total = fp.sugarKg; }
    if (o.item) o.short = o.item.qty < o.total;
    return o;
  }
  /** Tek beslemeyi kaydet: besleme kaydı + stoktan düş + kalan beslemeler için görev. */
  function saveFeeding(hiveId) {
    var h = D.hiveById(hiveId); if (!h) return { ok: false, msg: 'Kovan bulunamadı' };
    var fp = feedPlan(h);
    if (!fp.need) return { ok: false, msg: fp.reason || 'Besleme gerekmiyor.' };
    var t = today();
    var rec = D.records.add(h.id, 'feed', { date: t, type: fp.type, amount: fp.perFeedL, note: 'Bakım planı · ' + fp.feedings + ' beslemenin 1.si (tahmini açık ' + num(fp.deficitKg) + ' kg)' });
    var msg = SYRUP[fp.type].label + ' ' + num(fp.perFeedL) + ' L kaydedildi.', low = null;
    var s = fp.stock;
    if (s && s.item) {
      var after = D.stock.adjust(s.item.id, -s.perFeed, 'Besleme · ' + h.name, t);
      if (after) { msg += ' Stoktan ' + num(s.perFeed) + ' ' + s.unit + ' düşüldü (' + after.name + ': ' + num(after.qty) + ' ' + after.unit + ').'; if (after.low) low = after; }
    } else msg += ' Stokta şurup/şeker kalemi yok; düşülmedi.';
    for (var i = 1; i < fp.feedings; i++) {
      D.taskStore.add({ title: 'Besleme ' + (i + 1) + '/' + fp.feedings + ': ' + SYRUP[fp.type].label + ' ' + num(fp.perFeedL) + ' L — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id,
        due: addDays(t, i * fp.everyDays), priority: 2, note: 'Bakım planı besleme' });
    }
    if (fp.feedings > 1) msg += ' Kalan ' + (fp.feedings - 1) + ' besleme görevlere eklendi.';
    if (low) msg += ' ⚠️ Stok azaldı: ' + low.name + '.';
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: !!rec, msg: msg, low: low };
  }
  function feedText(fp) {
    if (!fp.need) return fp.reason;
    return (fp.weak ? 'Zayıf koloni: önce birleştirmeyi düşünün. ' : '') + SYRUP[fp.type].label + ': ' + num(fp.liters) + ' L (≈ ' + num(fp.sugarKg) + ' kg şeker + ' + num(fp.waterL) + ' L su), ' + fp.feedings + ' seferde ' + num(fp.perFeedL) + ' L · açık ≈ ' + num(fp.deficitKg) + ' kg';
  }
  /** Bakım planı ekranı için kovan listesi (HTML). */
  function hiveSummary(apId) {
    var hs = D.hivesForApiary(apId);
    if (!hs.length) return '<p class="muted" style="margin:0;">Bu arılıkta kovan yok.</p>';
    return hs.map(function (h) {
      var st = hiveState(h), fp = feedPlan(h, st), mp = global.SuperAriPlan.medPlan ? global.SuperAriPlan.medPlan(h, st) : null;
      var tag = fp.need ? '<em class="o">Besleme</em>' : '<em class="g">Stok iyi</em>';
      if (fp.honeyFrames == null && st.honeyFrames == null) tag = '<em>Veri yok</em>';
      if (mp && mp.level === 'tedavi') tag = '<em class="r">Varroa: tedavi</em>';
      return '<a class="bp-hv" href="kovan.html?id=' + encodeURIComponent(h.id) + '#oneri"><b>' + esc(h.name) + (st.cls ? ' · ' + esc(st.cls) : '') + '</b>' + tag +
        '<small>🍯 ' + esc(feedText(fp)) + (mp ? '<br>💊 ' + esc(mp.summary) : '') + '</small></a>';
    }).join('');
  }

  global.SuperAriPlan = {
    SYRUP: SYRUP, KG_PER_HONEY_FRAME: KG_PER_HONEY_FRAME, hiveState: hiveState, seasonKind: seasonKind, feedPlan: feedPlan, saveFeeding: saveFeeding, feedText: feedText, hiveSummary: hiveSummary,
    PROFILES: PROFILES, JOBS: JOBS, profileKey: profileKey, autoProfile: autoProfile, setProfile: setProfile,
    camBali: camBali, setCamBali: setCamBali, hasSuper: hasSuper, setSuper: setSuper,
    phases: phases, phaseStatus: phaseStatus, flowAt: flowAt, nextFlowStart: nextFlowStart, addPhaseTasks: addPhaseTasks,
    esc: esc, fmt: fmt, num: num, mode: mode, today: today, addDays: addDays, loadSt: loadSt, saveSt: saveSt
  };
})(window);
