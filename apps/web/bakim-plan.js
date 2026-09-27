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
  function boxesOf(hiveId) { try { return D.colony.boxes ? D.colony.boxes(D.hiveById(hiveId)) : null; } catch (e) { return null; } }
  function hasSuper(hiveId) {
    var b = boxesOf(hiveId);
    if (b && b.known) return b.kat > 0 || b.ballik;
    return !!loadSt().supers[String(hiveId)];
  }
  function setSuper(hiveId, on) {
    var s = loadSt(); if (on) s.supers[String(hiveId)] = today(); else delete s.supers[String(hiveId)]; saveSt(s);
    /* Kutu bilgisi kayıtlıysa onu da güncelle (kat / ballık). */
    var b = boxesOf(hiveId);
    if (b && b.known && D.colony.setBoxes) {
      if (on && !b.kat && !b.ballik) D.colony.setBoxes(hiveId, { body: b.body, kat: 1, ballik: true });
      else if (!on && (b.kat || b.ballik)) D.colony.setBoxes(hiveId, { body: b.body, kat: 0, ballik: false });
    }
  }

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
    surup11: { label: 'Şurup 1:1', sugarKg: 0.62, waterL: 0.62, storeKg: 0.5, perFeedL: 1, everyDays: 3 },
    kek: { label: 'Kek (fondan)', sugarKg: 1, waterL: 0, storeKg: 1, perFeedL: 2, everyDays: 7, unit: 'kg' }
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
  /* Ağustos sonu – Ekim: kışlık besleme dönemi (bölgeden bağımsız; akım varsa akım önce gelir). */
  function isAutumn(d) { var md = String(d || today()).slice(5); return md >= '08-20' && md <= '10-31'; }
  function seasonKind(apId, d) {
    d = d || today();
    if (flowAt(apId, d).flow) return 'akim';
    if (isAutumn(d)) return 'sonbahar';
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
    var type, target;
    if (sk === 'akim') {
      var fl = flowAt(apId).phase, sup = hasSuper(h.id), autumnFlow = isAutumn(today());
      var tgt = autumnFlow ? pr.winterKg : pr.springMinKg;
      var def0 = Math.max(0, Math.round((tgt - out.storesKg) * 10) / 10);
      out.flow = fl; out.targetKg = tgt; out.deficitKg = def0;
      var flTxt = (fl ? fl.label + ', bitiş ' + fmt(fl.to) : 'bal akımı');
      if (!sup) {
        /* Bal katı / ballık yok: şurup hasat edilecek bala karışmaz → normal (kışlık) hesap. */
        out.flowNote = 'Bölgede ' + flTxt + ', ancak bu kovanda bal katı yok: besleme bala karışmaz. Hasat edilecek bal çerçevesi varsa önce onları alın.';
        sk = autumnFlow ? 'sonbahar' : 'yaz'; out.season = sk;
      } else {
        var emerg = pr.springMinKg;
        if (out.storesKg >= emerg) {
          out.need = false;
          out.reason = 'Bal akımında (' + flTxt + ') bal katı takılı kovana şurup verilmez (bala karışır). ' + (def0 ? 'Akım bitince kışlık hedef ' + tgt + ' kg: açık ≈ ' + num(def0) + ' kg (≈ ' + num(Math.ceil(def0 / SYRUP.surup21.storeKg * 2) / 2) + ' L 2:1 şurup).' : 'Stok hedefte.');
          return out;
        }
        /* Açlık riski: akımda bile kek (fondan) verilir; bala geçmesi çok azdır. */
        var kg = Math.min(4, Math.max(1, Math.ceil((emerg - out.storesKg) * 2) / 2));
        out.need = true; out.type = 'kek'; out.kekKg = kg; out.feedings = Math.max(1, Math.ceil(kg / 2)); out.perFeedKg = Math.round(kg / out.feedings * 10) / 10; out.everyDays = 7;
        out.liters = kg; out.perFeedL = out.perFeedKg; out.sugarKg = kg; out.waterL = 0;
        out.stock = feedStock('kek', out);
        out.reason = 'Bal akımı (' + flTxt + '): şurup yerine kek.';
        out.note = 'Stok çok az (≈ ' + num(out.storesKg) + ' kg): akımda şurup verilmez ama açlık riskine karşı kek verin. Akım bitince kışlık hedef ' + tgt + ' kg için 2:1 şurupla tamamlayın.';
        return out;
      }
    }
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
    if (type === 'kek') {
      var kk = list.filter(function (x) { return (x.category === 'kek' || x.feedType === 'kek') && x.unit === 'kg'; })[0] || null;
      return kk ? { use: 'syrup', item: kk, perFeed: fp.perFeedKg, unit: 'kg', total: fp.kekKg, short: kk.qty < fp.kekKg } : {};
    }
    var syr = list.filter(function (x) { return x.feedType === type && x.unit === 'L'; })[0] || null;
    var sug = list.filter(function (x) { return x.category === 'seker' && x.unit === 'kg'; })[0] || null;
    var o = { syrup: syr, sugar: sug };
    if (syr) { o.use = 'syrup'; o.item = syr; o.perFeed = fp.perFeedL; o.unit = 'L'; o.total = fp.liters; }
    else if (sug) { o.use = 'sugar'; o.item = sug; o.perFeed = Math.round(fp.sugarKg / fp.feedings * 10) / 10; o.unit = 'kg'; o.total = fp.sugarKg; }
    if (o.item) o.short = o.item.qty < o.total;
    return o;
  }
  /** Tek beslemeyi kaydet: besleme kaydı + stoktan düş + kalan beslemeler için görev. */
  function saveFeeding(hiveId, amountL) {
    var h = D.hiveById(hiveId); if (!h) return { ok: false, msg: 'Kovan bulunamadı' };
    var fp = feedPlan(h);
    if (!fp.need) return { ok: false, msg: fp.reason || 'Besleme gerekmiyor.' };
    var t = today();
    var ov = Number(String(amountL == null ? '' : amountL).replace(',', '.'));
    if (isFinite(ov) && ov > 0 && ov <= 20) { fp.perFeedL = Math.round(ov * 10) / 10; if (fp.stock && fp.stock.use === 'syrup') fp.stock.perFeed = fp.perFeedL; else if (fp.stock && fp.stock.use === 'sugar') fp.stock.perFeed = Math.round(fp.perFeedL * SYRUP[fp.type].sugarKg * 10) / 10; }
    var U = SYRUP[fp.type].unit || 'L';
    var rec = D.records.add(h.id, 'feed', { date: t, type: fp.type, amount: fp.perFeedL, note: 'Bakım planı · ' + fp.feedings + ' beslemenin 1.si (tahmini açık ' + num(fp.deficitKg) + ' kg)' });
    var msg = SYRUP[fp.type].label + ' ' + num(fp.perFeedL) + ' ' + U + ' kaydedildi.', low = null;
    var s = fp.stock;
    if (s && s.item) {
      var after = D.stock.adjust(s.item.id, -s.perFeed, 'Besleme · ' + h.name, t);
      if (after) { msg += ' Stoktan ' + num(s.perFeed) + ' ' + s.unit + ' düşüldü (' + after.name + ': ' + num(after.qty) + ' ' + after.unit + ').'; if (after.low) low = after; }
    } else msg += ' Stokta şurup/şeker kalemi yok; düşülmedi.';
    for (var i = 1; i < fp.feedings; i++) {
      D.taskStore.add({ title: 'Besleme ' + (i + 1) + '/' + fp.feedings + ': ' + SYRUP[fp.type].label + ' ' + num(fp.perFeedL) + ' ' + U + ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id,
        due: addDays(t, i * fp.everyDays), priority: 2, note: 'Bakım planı besleme' });
    }
    if (fp.feedings > 1) msg += ' Kalan ' + (fp.feedings - 1) + ' besleme görevlere eklendi.';
    if (low) msg += ' ⚠️ Stok azaldı: ' + low.name + '.';
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: !!rec, msg: msg, low: low };
  }
  function feedText(fp) {
    if (!fp.need) return fp.reason;
    if (fp.type === 'kek') return 'Kek (fondan): ' + num(fp.kekKg) + ' kg, ' + fp.feedings + ' seferde ' + num(fp.perFeedKg) + ' kg (7 günde bir) · ' + fp.reason;
    return (fp.weak ? 'Zayıf koloni: önce birleştirmeyi düşünün. ' : '') + SYRUP[fp.type].label + ': ' + num(fp.liters) + ' L (≈ ' + num(fp.sugarKg) + ' kg şeker + ' + num(fp.waterL) + ' L su), ' + fp.feedings + ' seferde ' + num(fp.perFeedL) + ' L · açık ≈ ' + num(fp.deficitKg) + ' kg';
  }
  /* ---------------- ilaç önerisi (yalnız etiket kuralı) ---------------- */
  function daysBetween(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((new Date(+pb[0], pb[1] - 1, +pb[2]) - new Date(+pa[0], pa[1] - 1, +pa[2])) / 86400000);
  }
  /* Genel eşikler (tahmin; uygulamadaki hastalık seviyesiyle aynı): %2 altı izle, %2–3 planla, %3 üstü tedavi. */
  function medPlan(h, st) {
    var I = global.SuperAriIlac; st = st || hiveState(h);
    var t = today(), out = { hive: h, blocks: [], warns: [], products: [] };
    var v = st.varroa;
    if (!v) { out.level = 'sayim'; out.summary = 'Varroa sayımı yok — önce sayım girin (alkol yıkama / pudra şekeri).'; }
    else if (v.infestation == null) { out.level = 'sayim'; out.summary = 'Son sayım (' + fmt(v.date) + ') yapışkan tabla: bulaşma yüzdesi için alkol yıkama veya pudra şekeri sayımı girin.'; }
    else {
      var p = v.infestation, age = daysBetween(v.date, t);
      out.infestation = p; out.countDate = v.date;
      out.level = p > 3 ? 'tedavi' : (p >= 2 ? 'planla' : 'izle');
      out.summary = '%' + num(p) + ' bulaşma (' + fmt(v.date) + ') → ' + (out.level === 'tedavi' ? 'tedavi önerilir' : out.level === 'planla' ? 'tedavi planlayın' : 'izleyin, 2–3 hafta sonra tekrar sayın');
      if (age > 30) out.warns.push('Son sayım ' + age + ' gün önce; tedaviden önce yeniden sayın.');
    }
    var fl = flowAt(h.apiaryId, t);
    if (fl.flow) out.blocks.push('Bal akımı sürüyor (' + fl.phase.label + ') — ilaç uygulanmaz.');
    if (hasSuper(h.id)) out.blocks.push('Bal katı takılı — önce bal katını alın.');
    /* süren tedavi / bekleme */
    var lt = st.lastTreat, lastGroup = null;
    if (lt) {
      var det = I.detect(lt.treatment), prod = det && det.id ? I.byId(det.id) : null;
      lastGroup = det ? det.group : null;
      var dur = prod && prod.durationDays ? prod.durationDays[1] : 0;
      var until = lt.checkDate && lt.checkDate > t ? lt.checkDate : (dur ? addDays(lt.date, dur) : null);
      if (lt.withdrawalDays) { var wu = addDays(lt.date, lt.withdrawalDays); if (wu >= t && (!until || wu > until)) until = wu; }
      if (until && until >= t) out.blocks.push('Önceki tedavi sürüyor: ' + lt.treatment + ' (' + fmt(lt.date) + ' → ' + fmt(until) + '). Aynı anda başka varroa ilacı kullanmayın.');
      out.lastTreat = { text: lt.treatment, date: lt.date, group: lastGroup };
    }
    var nf = nextFlowStart(h.apiaryId, t);
    var yr = t.slice(0, 4);
    I.LIST.forEach(function (p) {
      var dz = I.doseFor(p.id, st.beeFrames);
      var o = { id: p.id, name: p.name, group: p.group, verified: !!p.dose, dose: dz, warns: [], blocks: [] };
      if (p.dose) {
        if (nf && p.preFlowDays && daysBetween(t, nf) < p.preFlowDays) o.blocks.push('Bal akımına ' + daysBetween(t, nf) + ' gün var; etiket en az ' + p.preFlowDays + ' gün önce bitmiş olmasını ister.');
        else if (nf && p.durationDays && daysBetween(t, nf) < p.durationDays[0]) o.blocks.push('Tedavi (' + p.durationDays[0] + ' gün) bal akımından önce bitmez.');
        if (lastGroup && lastGroup === p.group) o.warns.push('Son tedavi de aynı gruptan (' + I.GROUPS[p.group].label + '): rotasyon için farklı grup seçin.');
        if (p.maxPerYear) {
          var n = st.disease.filter(function (d) { return d.treatment && d.date.slice(0, 4) === yr && (I.detect(d.treatment) || {}).id === p.id; }).length;
          if (n >= p.maxPerYear) o.blocks.push('Bu yıl ' + n + ' kez kullanıldı; etiket yılda en çok ' + p.maxPerYear + ' kez.');
        }
      }
      out.products.push(o);
    });
    out.products.sort(function (a, b) {
      function sc(x) { return (x.verified ? 0 : 100) + (x.blocks.length ? 10 : 0) + (x.warns.length ? 1 : 0) + (x.dose.ok ? 0 : 5); }
      return sc(a) - sc(b);
    });
    var best = out.products.filter(function (x) { return x.verified && x.dose.ok && !x.blocks.length; })[0] || null;
    out.best = best;
    out.canTreat = !out.blocks.length && out.level !== 'sayim';
    if (out.blocks.length) out.summary += ' · ⛔ ' + out.blocks[0];
    else if (best && (out.level === 'tedavi' || out.level === 'planla')) out.summary += ' · Öneri: ' + best.name + ' ' + best.dose.text + ' şerit (etiket)';
    return out;
  }
  /** Tedaviyi kaydet: hastalık kaydı + şerit çıkarma görevi + stoktan düş. */
  function saveTreatment(hiveId, productId) {
    var I = global.SuperAriIlac, h = D.hiveById(hiveId), p = I.byId(productId);
    if (!h || !p) return { ok: false, msg: 'Kovan veya ürün bulunamadı' };
    if (!p.dose) return { ok: false, msg: 'Doz doğrulanmadı; bu ürün için kayıt hesaplanmaz.' };
    var mp = medPlan(h), po = mp.products.filter(function (x) { return x.id === p.id; })[0];
    if (mp.blocks.length) return { ok: false, msg: mp.blocks[0] };
    if (po.blocks.length) return { ok: false, msg: po.blocks[0] };
    if (!po.dose.ok) return { ok: false, msg: po.dose.reason };
    var t = today(), dur = p.durationDays[1], qty = po.dose.qty;
    var rec = D.records.add(h.id, 'disease', { date: t, disease: 'varroa', count: mp.varroa ? mp.varroa.count : null, method: mp.varroa ? mp.varroa.method : 'alkol',
      infestation: mp.infestation, treatment: p.name + ' (' + p.active + ')', dose: qty, doseUnit: 'serit',
      withdrawalDays: p.withdrawal === 'tedaviBoyunca' ? dur : 0, checkDate: addDays(t, dur), note: 'Bakım planı · etiket: ' + p.dose.note.slice(0, 200) });
    D.taskStore.add({ title: 'Şeritleri çıkar (' + p.name + ') ve varroa sayımı yap — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id,
      due: addDays(t, dur), priority: 1, note: 'Bakım planı ilaç · ' + p.durationDays[0] + '–' + dur + ' gün' });
    var msg = p.name + ' ' + po.dose.text + ' şerit kaydedildi; çıkarma görevi ' + fmt(addDays(t, dur)) + ' tarihine eklendi.', low = null;
    var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
    var nm = p.name.toLocaleLowerCase('tr').split(' ')[0], act = p.active.toLocaleLowerCase('tr').split(' ')[0];
    var it = list.filter(function (x) { return x.category === 'ilac' && x.unit === 'şerit' && x.name.toLocaleLowerCase('tr').indexOf(nm) >= 0; })[0] ||
      list.filter(function (x) { return x.category === 'ilac' && x.unit === 'şerit' && x.name.toLocaleLowerCase('tr').indexOf(act) >= 0; })[0];
    if (it) {
      var after = D.stock.adjust(it.id, -qty, 'İlaçlama · ' + h.name, t);
      if (after) { msg += ' Stoktan ' + qty + ' şerit düşüldü (' + after.name + ': ' + num(after.qty) + ').'; if (after.low) { low = after; msg += ' ⚠️ Stok azaldı.'; } }
    } else msg += ' Stokta bu ilaç için şerit kalemi yok; düşülmedi.';
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: !!rec, msg: msg, low: low };
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
      return '<a class="bp-hv" href="kovan.html?id=' + encodeURIComponent(h.id) + '#oneri"><b>' + queenDot(h) + esc(h.name) + (st.cls ? ' · ' + esc(st.cls) : '') + '</b>' + tag +
        '<small>🍯 ' + esc(feedText(fp)) + (mp ? '<br>💊 ' + esc(mp.summary) : '') + '</small></a>';
    }).join('');
  }

  /* ---------------- saha: bakım listesi + «Bakım yap» ---------------- */
  function hiveTasks(hId, horizonDays) {
    var t = today(), lim = addDays(t, horizonDays == null ? 3 : horizonDays), out = [];
    try { D.taskStore.open().forEach(function (x) { if (String(x.hiveId) === String(hId) && (!x.due || x.due <= lim)) out.push(x); }); } catch (e) { /* ignore */ }
    return out.sort(function (a, b) { return String(a.due || '9') < String(b.due || '9') ? -1 : 1; });
  }
  /** Kovanın şu an yapılması gereken işleri: [{ kind, text, amount, u }] (u: 1 acil, 2 bu hafta, 3 izle) */
  function needs(h) {
    var t = today(), st = hiveState(h), out = [];
    hiveTasks(h.id, 3).forEach(function (x) {
      if (!x.due) return;
      out.push({ kind: 'gorev', id: x.id, text: x.title.replace(/ — [^—]+$/, ''), amount: x.due < t ? 'gecikti' : (x.due === t ? 'bugün' : fmt(x.due)), u: x.due < t ? 1 : 2 });
    });
    var mp = medPlan(h, st), sk = seasonKind(h.apiaryId);
    if (mp.canTreat && mp.level === 'tedavi' && mp.best) out.push({ kind: 'ilac', text: 'Varroa tedavisi (%' + num(mp.infestation) + ')', amount: mp.best.name + ' ' + mp.best.dose.text + ' şerit (etiket)', u: 1 });
    else if (mp.canTreat && mp.level === 'planla' && mp.best) out.push({ kind: 'ilac', text: 'Varroa tedavisi planla (%' + num(mp.infestation) + ')', amount: mp.best.name + ' ' + mp.best.dose.text + ' şerit (etiket)', u: 2 });
    else if (mp.level === 'sayim' && sk !== 'akim' && sk !== 'kis') out.push({ kind: 'sayim', text: 'Varroa sayımı', amount: 'alkol yıkama / pudra şekeri', u: 3 });
    else if (mp.countDate && t > addDays(mp.countDate, 30) && sk !== 'akim' && sk !== 'kis') out.push({ kind: 'sayim', text: 'Varroa sayımını yenile', amount: 'son ' + fmt(mp.countDate), u: 3 });
    var fp = feedPlan(h, st);
    if (fp.need) out.push({ kind: 'besleme', text: 'Besleme' + (fp.weak ? ' (zayıf: birleştirmeyi düşünün)' : ''), amount: SYRUP[fp.type].label + ' ' + num(fp.perFeedL) + ' ' + (SYRUP[fp.type].unit || 'L') + ' × ' + fp.feedings, u: sk === 'sonbahar' ? 2 : 3 });
    out.sort(function (a, b) { return a.u - b.u; });
    return out;
  }
  function tourKey() { return mode() === 'live' ? 'superari.bakimTur.v1' : 'superari.bakimTur.demo.v1'; }
  function tourLoad() { try { return JSON.parse(localStorage.getItem(tourKey()) || 'null'); } catch (e) { return null; } }
  function tourSave(s) { try { localStorage.setItem(tourKey(), JSON.stringify(s)); } catch (e) { /* ignore */ } }
  /** Arılığın saha listesi (gün içinde sabit; yeni gün veya «Yeni liste» ile yenilenir). */
  function tour(apId, reset) {
    var s = tourLoad(), t = today();
    var hs = D.hivesForApiary(apId), byId = {}; hs.forEach(function (h) { byId[String(h.id)] = h; });
    var nd = {}; hs.forEach(function (h) { nd[String(h.id)] = needs(h); });
    if (reset || !s || s.apId !== String(apId) || s.date !== t) {
      s = { apId: String(apId), date: t, ids: hs.filter(function (h) { return nd[String(h.id)].length; }).map(function (h) { return String(h.id); }), done: {} };
      tourSave(s);
    }
    var rows = s.ids.filter(function (id) { return byId[id]; }).map(function (id) {
      var n = nd[id], done = !!s.done[id] || !n.length;
      return { hive: byId[id], needs: n, done: done, u: n.length ? n[0].u : 9 };
    });
    rows.sort(function (a, b) { return (a.done - b.done) || (a.u - b.u) || (b.needs.length - a.needs.length) || (Number(a.hive.id) - Number(b.hive.id)); });
    var doneN = rows.filter(function (r) { return r.done; }).length;
    return { apId: String(apId), rows: rows, total: rows.length, done: doneN, state: s };
  }
  function tourMarkDone(apId, hiveId) { var s = tourLoad(); if (!s || s.apId !== String(apId)) { tour(apId); s = tourLoad(); } s.done[String(hiveId)] = true; tourSave(s); }
  function tourNext(apId, curId) {
    var tr = tour(apId), open = tr.rows.filter(function (r) { return !r.done && String(r.hive.id) !== String(curId); });
    return open.length ? open[0].hive : null;
  }
  function completeMatching(hId, re) {
    var n = 0;
    hiveTasks(hId, 0).forEach(function (x) { if (re.test(x.title)) { D.taskStore.complete(x.id, { note: 'Bakım planından kaydedildi' }); n++; } });
    return n;
  }
  function saveCount(hiveId, count, method) {
    var h = D.hiveById(hiveId); if (!h) return { ok: false, msg: 'Kovan bulunamadı' };
    var c = Math.round(Number(count)); if (!isFinite(c) || c < 0 || c > 5000) return { ok: false, msg: 'Akar sayısını yazın.' };
    var rec = D.records.add(h.id, 'disease', { date: today(), disease: 'varroa', count: c, method: method === 'seker' ? 'seker' : 'alkol', note: 'Bakım planı · ≈300 arı örneği' });
    var n = completeMatching(h.id, /^Varroa sayımı \(/);
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: !!rec, msg: 'Sayım kaydedildi (' + c + ' akar).' + (n ? ' ' + n + ' görev tamamlandı.' : '') };
  }

  /* ---------------- «Bu kovan için öneri» kartı ---------------- */
  var CSS = '.bo{display:grid;gap:.55rem;font-size:.85rem;min-width:0}.bo *{box-sizing:border-box}.bo-chips{display:flex;flex-wrap:wrap;gap:.3rem}.bo-chip{font-size:.72rem;font-weight:800;padding:.18rem .5rem;border-radius:999px;background:#f1f3f5;color:#343a40}' +
    '.bo-chip.demo{background:#fff3bf;color:#7a5b00}.bo-sec{border:1px solid #ead9b3;border-radius:12px;padding:.55rem .6rem;background:#fff;display:grid;gap:.4rem;min-width:0}.bo-sec h3{margin:0;font-size:.9rem}' +
    '.bo-sec p{margin:0;overflow-wrap:anywhere}.bo-mut{color:#6b7280;font-size:.78rem}.bo-warn{background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;border-radius:10px;padding:.4rem .5rem;font-size:.78rem}' +
    '.bo-block{background:#fff5f5;border:1px solid #ffc9c9;color:#a61e1e;border-radius:10px;padding:.4rem .5rem;font-size:.78rem}.bo-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}' +
    '.bo-row select,.bo-row input{font:inherit;font-size:.85rem;padding:.45rem .5rem;border:1px solid #ead9b3;border-radius:10px;background:#fff;min-width:0;max-width:100%}.bo-row input[type=number]{width:5.5rem}.bo-row select{flex:1 1 12rem}' +
    '.bo-btn{font:inherit;font-size:.82rem;font-weight:800;padding:.5rem .75rem;border-radius:10px;border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#fff3bf);color:#5c4813;cursor:pointer}' +
    '.bo-btn.ok{border-color:#b2f2bb;background:#ebfbee;color:#2b8a3e}.bo-task{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem;align-items:center;border-top:1px dashed #ead9b3;padding-top:.35rem}' +
    '.bo-task:first-of-type{border-top:0;padding-top:0}.bo-msg{font-size:.8rem;font-weight:700;color:#2b8a3e;margin:0}.bo-msg.err{color:#c92a2a}';
  function ensureCss() { if (document.getElementById('bo-css')) return; var s = document.createElement('style'); s.id = 'bo-css'; s.textContent = CSS; document.head.appendChild(s); }
  function renderHiveCard(el, hiveId, opts) {
    opts = opts || {}; ensureCss();
    var I = global.SuperAriIlac, h = D.hiveById(hiveId);
    if (!el) return;
    if (!h) { el.innerHTML = '<p class="bo-mut">Kovan bulunamadı.</p>'; return; }
    var st = hiveState(h), fp = feedPlan(h, st), mp = medPlan(h, st), tasks = hiveTasks(h.id, 7);
    var H = [];
    H.push('<div class="bo-chips">' + (mode() === 'demo' ? '<span class="bo-chip demo">Demo</span>' : '') +
      '<span class="bo-chip">' + esc(PROFILES[profileKey(h.apiaryId)].label.split(' (')[0]) + '</span>' +
      (st.beeFrames != null ? '<span class="bo-chip">' + st.beeFrames + ' arılı çerçeve</span>' : '') +
      (st.honeyFrames != null ? '<span class="bo-chip">' + st.honeyFrames + ' bal çerçevesi</span>' : '') +
      (mp.infestation != null ? '<span class="bo-chip">Varroa %' + num(mp.infestation) + '</span>' : '') + '</div>');
    var firstInsp = false; try { var rr0 = D.records.status(h.id).records; firstInsp = !rr0.strength.length && !rr0.brood.length && !rr0.disease.length && !rr0.feed.length; } catch (eF) { firstInsp = false; }
    H.push('<button type="button" class="bo-btn" data-bo-km style="width:100%;min-height:50px;font-size:1rem;margin:.1rem 0 .5rem;">🐝 ' + (firstInsp ? 'İlk muayene (adım adım)' : 'Kolay muayene (≈1 dk)') + '</button>');
    H.push('<label class="bo-row" style="font-size:.8rem;"><input type="checkbox" data-bo-super' + (hasSuper(h.id) ? ' checked' : '') + '> Bal katı takılı (ilaç engellenir)</label>');
    if (tasks.length) {
      H.push('<div class="bo-sec"><h3>📌 Görevler</h3>' + tasks.map(function (x) {
        return '<div class="bo-task"><span>' + esc(x.title) + (x.due ? ' <span class="bo-mut">· ' + (x.due < today() ? 'gecikti ' : '') + fmt(x.due) + '</span>' : '') + '</span><button type="button" class="bo-btn ok" data-bo-done="' + esc(x.id) + '">✓ Bitti</button></div>';
      }).join('') + '</div>');
    }
    /* ana memesi (yavru muayenesi kaydı) */
    var lastB = null; try { lastB = D.records.status(h.id).brood; } catch (eB) { lastB = null; }
    H.push('<div class="bo-sec"><h3>👑 Ana memesi</h3>' +
      (lastB && lastB.queenCell && lastB.queenCell !== 'yok' ? '<p class="bo-mut">Son kayıt ' + esc(fmt(lastB.date)) + ': ' + esc((lastB.cellCount ? lastB.cellCount + ' ' : '') + (lastB.cellCapped ? D.records.CELL_CAP_LABEL[lastB.cellCapped] + ' · ' : '') + D.records.QUEEN_CELL_LABEL[lastB.queenCell].toLocaleLowerCase('tr')) + '</p>' : '') +
      '<div class="bo-row"><select data-bo-cell aria-label="Ana memesi yeri"><option value="yok">Meme yok</option><option value="ogul">Alt kenar — oğul memesi</option><option value="yenileme">Petek ortası — sessiz ana değiştirme</option><option value="acil">Acil — genç larvadan (anasız)</option></select></div>' +
      '<div class="bo-row"><input type="number" inputmode="numeric" min="1" max="60" placeholder="Sayı" data-bo-celln aria-label="Meme sayısı" style="max-width:5.5rem">' +
      '<select data-bo-cellcap aria-label="Kapalı mı açık mı"><option value="">Kapalı/açık —</option><option value="kapali">Kapalı</option><option value="acik">Açık</option></select>' +
      '<select data-bo-eggs aria-label="Yumurta"><option value="1">Yumurta var</option><option value="0">Yumurta yok</option></select></div>' +
      '<div class="bo-row"><button type="button" class="bo-btn" data-bo-savecell>Muayeneyi kaydet</button></div></div>');
    /* hastalık tahmini (kesin değil) */
    H.push('<div class="bo-sec"><h3>🔍 Hastalık tahmini <span class="bo-mut">(kesin değil)</span></h3><p class="bo-mut">Rehberli fotoğraf + belirti listesi → muhtemel hastalıklar, yapılacaklar ve tek dokunuşla şüpheli kayıt.</p>' +
      '<div class="bo-row"><button type="button" class="bo-btn" data-bo-hz>Hastalık tahmini başlat</button></div></div>');
    /* varroa */
    var V = '<div class="bo-sec"><h3>💊 Varroa</h3><p>' + esc(mp.summary.split(' · ⛔')[0].split(' · Öneri')[0]) + '</p>';
    mp.warns.forEach(function (w) { V += '<p class="bo-warn">' + esc(w) + '</p>'; });
    mp.blocks.forEach(function (b) { V += '<p class="bo-block">⛔ ' + esc(b) + '</p>'; });
    V += '<div class="bo-row"><input type="number" inputmode="numeric" min="0" max="5000" placeholder="Akar" data-bo-count aria-label="Akar sayısı">' +
      '<select data-bo-method aria-label="Sayım yöntemi"><option value="alkol">Alkol yıkama (≈300 arı)</option><option value="seker">Pudra şekeri (≈300 arı)</option></select>' +
      '<button type="button" class="bo-btn" data-bo-savecount>Sayımı kaydet</button></div>';
    if (mp.canTreat && (mp.level === 'tedavi' || mp.level === 'planla')) {
      var opt = mp.products.filter(function (x) { return x.verified; }).map(function (x) {
        var dis = !x.dose.ok || x.blocks.length;
        return '<option value="' + x.id + '"' + (dis ? ' disabled' : '') + (mp.best && mp.best.id === x.id ? ' selected' : '') + '>' + esc(x.name + ' — ' + (x.dose.ok ? x.dose.text + ' şerit' : 'doz yok') + (x.blocks.length ? ' (uygun değil)' : x.warns.length ? ' (rotasyon uyarısı)' : '')) + '</option>';
      }).join('');
      V += '<div class="bo-row"><select data-bo-prod aria-label="İlaç">' + opt + '</select><button type="button" class="bo-btn" data-bo-treat>İlaçlamayı kaydet</button></div><div data-bo-prodinfo></div>';
    }
    V += '<p class="bo-warn"><b>Etiket dozunu kontrol edin.</b> Doz yalnız Bakanlık ürün belgesindeki kurala göre hesaplanır.</p></div>';
    H.push(V);
    /* besleme */
    var F = '<div class="bo-sec"><h3>🍯 Besleme <span class="bo-mut">(tahmin)</span></h3><p>' + esc(feedText(fp)) + '</p>';
    if (fp.storesKg != null) F += '<p class="bo-mut">Stok ≈ ' + num(fp.storesKg) + ' kg (' + esc(fp.storesSrc) + ')' + (fp.targetKg ? ' · hedef ' + fp.targetKg + ' kg' : '') + '</p>';
    if (fp.note) F += '<p class="bo-warn">' + esc(fp.note) + '</p>';
    if (fp.flowNote) F += '<p class="bo-mut">' + esc(fp.flowNote) + '</p>';
    if (fp.need) {
      var s = fp.stock || {};
      if (s.item && s.short) F += '<p class="bo-warn">Stok yetersiz: ' + esc(s.item.name) + ' ' + num(s.item.qty) + ' ' + esc(s.item.unit) + ', toplam gereken ' + num(s.total) + ' ' + esc(s.unit) + '.</p>';
      if (!s.item) F += '<p class="bo-mut">Stokta şurup/şeker kalemi yok; kayıt stoktan düşmez.</p>';
      F += '<div class="bo-row"><input type="number" inputmode="decimal" step="0.5" min="0.5" max="20" value="' + fp.perFeedL + '" data-bo-feedl aria-label="Miktar"> ' + (SYRUP[fp.type].unit || 'L') + ' ' + esc(SYRUP[fp.type].label) +
        '<button type="button" class="bo-btn" data-bo-feed>Beslemeyi kaydet</button></div>';
    }
    F += '</div>';
    H.push(F);
    H.push('<p class="bo-msg" data-bo-msg role="status"></p>');
    el.innerHTML = '<div class="bo">' + H.join('') + '</div>';
    function info() {
      var sel = el.querySelector('[data-bo-prod]'), box = el.querySelector('[data-bo-prodinfo]');
      if (!sel || !box) return;
      var po = mp.products.filter(function (x) { return x.id === sel.value; })[0], p = I.byId(sel.value);
      if (!po || !p) { box.innerHTML = ''; return; }
      box.innerHTML = '<p class="bo-mut">' + esc(p.dose.note) + ' Süre ' + p.durationDays[0] + (p.durationDays[1] !== p.durationDays[0] ? '–' + p.durationDays[1] : '') + ' gün. ' + esc(p.withdrawalText) + ' <a href="' + esc(p.source) + '" target="_blank" rel="noopener" style="color:#2b6cb0;text-decoration:underline;">Etiket (PDF)</a></p>' +
        po.warns.map(function (w) { return '<p class="bo-warn">' + esc(w) + '</p>'; }).join('');
    }
    info();
    function say(r) {
      var m = el.querySelector('[data-bo-msg]');
      if (!r.ok) { if (m) { m.textContent = r.msg; m.className = 'bo-msg err'; } return; }
      renderHiveCard(el, hiveId, opts);
      var m2 = el.querySelector('[data-bo-msg]'); if (m2) m2.textContent = '✓ ' + r.msg;
      if (opts.onChange) opts.onChange(r);
    }
    el.onchange = function (e) {
      if (e.target.hasAttribute('data-bo-super')) { setSuper(h.id, e.target.checked); renderHiveCard(el, hiveId, opts); if (opts.onChange) opts.onChange({}); }
      else if (e.target.hasAttribute('data-bo-prod')) info();
    };
    el.onclick = function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-bo-km')) { openKM(h.id, { apiary: opts.apiary, onChange: opts.onChange, onNext: opts.onNext, rerender: function () { renderHiveCard(el, hiveId, opts); } }); return; }
      if (b.hasAttribute('data-bo-hz')) {
        var go = function () { global.SuperAriHastalik.open(h.id, { onSaved: function () { say({ ok: true, msg: 'Şüpheli hastalık kaydedildi; görevler eklendi.' }); } }); };
        if (global.SuperAriHastalik) go();
        else {
          var sc = document.createElement('script'), cur = document.querySelector('script[src*="bakim-plan.js"]'), mv = cur && /[?&]v=([^&]+)/.exec(cur.src);
          sc.src = 'hastalik-tahmin.js' + (mv ? '?v=' + mv[1] : ''); sc.onload = go; document.head.appendChild(sc);
        }
      } else if (b.hasAttribute('data-bo-done')) { D.taskStore.complete(b.getAttribute('data-bo-done'), { note: 'Bakım planından' }); say({ ok: true, msg: 'Görev tamamlandı.' }); }
      else if (b.hasAttribute('data-bo-savecell')) say(saveCell(h.id, el.querySelector('[data-bo-cell]').value, el.querySelector('[data-bo-celln]').value, el.querySelector('[data-bo-cellcap]').value, el.querySelector('[data-bo-eggs]').value === '1'));
      else if (b.hasAttribute('data-bo-savecount')) say(saveCount(h.id, el.querySelector('[data-bo-count]').value, el.querySelector('[data-bo-method]').value));
      else if (b.hasAttribute('data-bo-treat')) {
        var r = saveTreatment(h.id, el.querySelector('[data-bo-prod]').value);
        if (r.ok) { var n = completeMatching(h.id, /ilaçlama|Varroa sayımı ve/i); if (n) r.msg += ' ' + n + ' görev tamamlandı.'; }
        say(r);
      } else if (b.hasAttribute('data-bo-feed')) {
        var r2 = saveFeeding(h.id, el.querySelector('[data-bo-feedl]').value);
        if (r2.ok) { var n2 = completeMatching(h.id, /besleme|stok kontrol/i); if (n2) r2.msg += ' ' + n2 + ' görev tamamlandı.'; }
        say(r2);
      }
    };
  }

  /** Kolay muayene sihirbazını aç (kolay-muayene.js gerektiğinde yüklenir). */
  function openKM(hiveId, opts) {
    opts = opts || {};
    var o = { apiary: opts.apiary, onSaved: opts.onChange ? function () { opts.onChange({}); } : null, onNext: opts.onNext };
    var go = function () {
      global.SuperAriKolayMuayene.open(hiveId, {
        apiary: o.apiary, onNext: o.onNext,
        onSaved: function () { if (o.onSaved) o.onSaved(); if (opts.rerender) opts.rerender(); }
      });
    };
    if (global.SuperAriKolayMuayene) { go(); return; }
    var sc = document.createElement('script'), cur = document.querySelector('script[src*="bakim-plan.js"]'), mv = cur && /[?&]v=([^&]+)/.exec(cur.src);
    sc.src = 'kolay-muayene.js' + (mv ? '?v=' + mv[1] : ''); sc.onload = go; document.head.appendChild(sc);
  }
  /** Bakım yap › ana memesi: yavru muayenesi kaydı (yer, sayı, kapalı/açık, tarih = bugün). */
  function saveCell(hiveId, where, n, cap, eggs) {
    var last = null; try { last = D.records.status(hiveId).brood; } catch (e) { last = null; }
    var rec = { date: today(), eggs: !!eggs, pattern: last ? last.pattern : 'duzenli', queenCell: where || 'yok',
      cellCount: where && where !== 'yok' ? n : '', cellCapped: where && where !== 'yok' ? cap : '', note: 'Bakım yap' + (mode() === 'demo' ? ' · Demo' : '') };
    if (mode() === 'demo') rec.demo = true;
    var saved = D.records.add(hiveId, 'brood', rec);
    if (!saved) return { ok: false, msg: 'Kaydedilemedi.' };
    var m = where === 'ogul' ? 'Oğul memesi kaydedildi; oğul riski güncellendi.' : where === 'yenileme' ? 'Sessiz ana değiştirme kaydedildi; memelere dokunmayın.' :
      where === 'acil' ? 'Acil ana memesi kaydedildi; anasız akışı açıldı.' : 'Muayene kaydedildi (meme yok).';
    return { ok: true, msg: m };
  }

  /** Ana arı yıl rengi noktası (uluslararası kod; yıl yoksa gri/boş). */
  function queenDot(h) {
    var col = h && D.colony && D.colony.queenColor ? D.colony.queenColor(h.queenYear) : null;
    var st = 'display:inline-block;width:.75em;height:.75em;border-radius:50%;margin-right:.3em;vertical-align:-.05em;';
    return col ? '<span style="' + st + 'background:' + col.hex + ';border:1px solid rgba(0,0,0,.3);" title="Ana ' + esc(h.queenYear + ' · ' + col.name) + '"></span>'
      : '<span style="' + st + 'background:#e9ecef;border:1.5px dashed #868e96;" title="Ana yılı bilinmiyor"></span>';
  }
  global.SuperAriPlan = {
    queenDot: queenDot,
    needs: needs, tour: tour, tourMarkDone: tourMarkDone, tourNext: tourNext, saveCount: saveCount, renderHiveCard: renderHiveCard, hiveTasks: hiveTasks,
    SYRUP: SYRUP, KG_PER_HONEY_FRAME: KG_PER_HONEY_FRAME, hiveState: hiveState, seasonKind: seasonKind, feedPlan: feedPlan, saveFeeding: saveFeeding, feedText: feedText, hiveSummary: hiveSummary, medPlan: medPlan, saveTreatment: saveTreatment,
    PROFILES: PROFILES, JOBS: JOBS, profileKey: profileKey, autoProfile: autoProfile, setProfile: setProfile,
    camBali: camBali, setCamBali: setCamBali, hasSuper: hasSuper, setSuper: setSuper, openKolayMuayene: openKM,
    phases: phases, phaseStatus: phaseStatus, flowAt: flowAt, nextFlowStart: nextFlowStart, addPhaseTasks: addPhaseTasks,
    esc: esc, fmt: fmt, num: num, mode: mode, today: today, addDays: addDays, loadSt: loadSt, saveSt: saveSt
  };
})(window);
