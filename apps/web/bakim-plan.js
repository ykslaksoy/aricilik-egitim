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
    var inName = function (list) { return list.some(function (il) { return nm.indexOf(il.toLocaleLowerCase('tr')) >= 0; }); };
    if (!a.il && inName(HIGH_IL)) return 'yayla';
    if (!a.il && inName(WARM_IL)) return 'sicak';
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
  /* ---------------- Kışlık stok takibi (Beslenme bölümü) ----------------
   * Elle girilen kayıtlardan tahmin: kışlık kaydındaki ölçüm → yoksa son muayenedeki bal çerçeveleri; sonraki sonbahar beslemeleri eklenir.
   * Hedef: bölge profili (sıcak kıyı / ılıman / yayla / yüksek) + ırk (yerli, tutumlu ırklar biraz daha az). Sensör gerekmez. */
  var WS_FAC = { surup11: 0.5, surup21: 0.8, kek: 1, balli: 1, polen: 0 };
  var THRIFTY = /kafkas|karniyol|carnica|anadolu|yerli|muğla|mugla|karadeniz|trakya|iran|yığılca|gökçeada|kars|ardahan/i;
  var PROLIFIC = /italyan|ligustica|buckfast/i;
  function winterSeasonNow(d) { var m = Number(String(d || today()).slice(5, 7)); return m >= 9 || m <= 2; }
  function winterTarget(h) {
    var pk = profileKey(h.apiaryId), pr = PROFILES[pk] || PROFILES.iliman;
    var breed = String(h.breed || h.irk || '');
    var adj = THRIFTY.test(breed) ? -2 : (PROLIFIC.test(breed) ? 2 : 0);
    var kg = Math.max(10, pr.winterKg + adj);
    return { kg: kg, profile: pk, profileLabel: pr.label, breed: breed, breedNote: adj < 0 ? 'tutumlu / yerli ırk' : (adj > 0 ? 'tüketimi yüksek ırk' : '') };
  }
  var WS_LABEL = { yeterli: 'Yeterli', az: 'Az', kritik: 'Kritik', yok: 'Veri yok' };
  function winterStock(h) {
    var R = D.records, rec = R.recordsFor(h.id), t = today();
    var season = R.currentSeason ? R.currentSeason() : Number(t.slice(0, 4));
    var autumnFrom = season + '-08-15';
    var tg = winterTarget(h);
    var ws = null; try { ws = R.winterStatus(h.id); } catch (e) { ws = null; }
    var base = null, baseDate = null, src = null, s = rec.strength[0] || null;
    if (ws && ws.rec && ws.rec.storesKg != null && ws.rec.storesKg !== '') { base = Number(ws.rec.storesKg); baseDate = ws.rec.date; src = 'olcum'; }
    else if (s && s.honeyFrames != null && s.honeyFrames !== '' && s.date >= addDays(t, -120)) { base = Number(s.honeyFrames) * KG_PER_HONEY_FRAME; baseDate = s.date; src = 'muayene'; }
    var fed = 0, nFeeds = 0;
    rec.feed.forEach(function (f) {
      if (!f.date || f.date < autumnFrom) return;
      if (baseDate && f.date <= baseDate && !(f.date === baseDate && src === 'muayene' && /Bakım planı/.test(f.note || ''))) return;
      var add = (Number(f.amount) || 0) * (WS_FAC[f.type] || 0);
      if (add > 0) { fed += add; nFeeds++; }
    });
    var out = { hive: h, target: tg.kg, targetInfo: tg, src: src, baseDate: baseDate, feeds: nFeeds, inSeason: winterSeasonNow(t) };
    if (base == null && !nFeeds) { out.kg = null; out.key = 'yok'; out.label = WS_LABEL.yok; out.srcText = 'Muayene (bal çerçevesi) veya kışlık kayıt yok'; return out; }
    if (base == null) src = out.src = 'besleme';
    out.kg = Math.round(((base || 0) + fed) * 10) / 10;
    out.needKg = Math.max(0, Math.ceil((tg.kg - out.kg) * 2) / 2);
    out.key = out.kg >= tg.kg ? 'yeterli' : (out.kg >= tg.kg * 0.65 ? 'az' : 'kritik');
    out.label = WS_LABEL[out.key];
    out.srcText = (src === 'olcum' ? 'kışlık kayıttaki ölçüm (' + fmt(baseDate) + ')' : (src === 'muayene' ? 'muayene ' + fmt(baseDate) + ' · ' + s.honeyFrames + ' ballı çerçeve' : 'yalnız sonbahar beslemeleri (muayene yok)')) +
      (nFeeds && src !== 'besleme' ? ' + sonraki ' + nFeeds + ' besleme' : (src === 'besleme' ? ' · ' + nFeeds + ' kayıt' : ''));
    return out;
  }
  function winterStockAll(hives) {
    var rows = (hives || []).filter(function (h) { return h && h.colonyState !== 'birlestirildi'; }).map(winterStock);
    var c = { yeterli: 0, az: 0, kritik: 0, yok: 0 };
    rows.forEach(function (x) { c[x.key]++; });
    return { rows: rows, counts: c };
  }
  function besHref(apId) {
    return 'kovanlar.html?view=koloni&topic=besleme&sub=stok' + (apId ? '&mode=apiary&apiary=' + encodeURIComponent(apId) : '&mode=all');
  }
  /** Eylül–Şubat: stok az/kritikse kısa bilgi notu (Beslenme bölümüne bağlantı). Değilse ''. opts: { apiary, force } */
  function winterNoteHtml(hives, opts) {
    opts = opts || {};
    if (!opts.force && !winterSeasonNow()) return '';
    var list = hives || [];
    var single = list.length === 1;
    var a = winterStockAll(list), c = a.counts;
    if (!c.az && !c.kritik) return '';
    var red = c.kritik > 0;
    var ap = opts.apiary || (single ? list[0].apiaryId : '');
    var txt;
    if (single) {
      var x = a.rows[0];
      txt = 'Kışlık stok ' + (red ? 'kritik' : 'az') + ' (≈ ' + num(x.kg) + ' kg / hedef ' + x.target + ' kg)';
    } else {
      txt = 'Kışlık stok ' + (red ? 'kritik: ' + c.kritik + ' kovan' + (c.az ? ', az: ' + c.az + ' kovan' : '') : 'az: ' + c.az + ' kovan');
    }
    return '<a class="sa-winter-note" href="' + besHref(ap) + '" style="display:block;text-decoration:none;margin:0 0 .6rem;padding:.55rem .7rem;border-radius:12px;font-size:.84rem;font-weight:700;line-height:1.35;' +
      (red ? 'background:#fff5f5;border:1px solid #ffc9c9;color:#a61e1e;' : 'background:#fff8df;border:1px solid #f1d98b;color:#6b5314;') + '">' +
      'ℹ️ ' + esc(txt) + ' — <span style="text-decoration:underline;">Beslenme bölümünden takip edin →</span></a>';
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
  /* ---------------- Varroa eşikleri (kaynaklı; formül arayüzde gösterilmez) ----------------
   * Yıkama / pudra şekeri (akar ÷ ergin arı × 100 = %): Honey Bee Health Coalition, «Tools for Varroa Management», 9. baskı (2026), Tablo 1:
   *   kış/dinlenme ≥ %1 · ilkbahar/nüfus artışı ≥ %1 · yaz/akım/nüfus zirvesi ≥ %2 · sonbahar/nüfus azalışı ≥ %2 → hemen tedavi (etikete göre).
   *   Eşik altı → ayda bir tekrar sayım (HBHC). «İzle» bandı (eşiğin yarısı ≤ % < eşik, 2 hafta sonra tekrar sayım) uygulamanın kararıdır.
   * Yapışkan altlık (doğal düşüş): UK National Bee Unit, «Managing Varroa» + Fact sheet 13: günlük düşüş × (Kas–Şub 400; Mar–Nis, Eyl–Eki 100; May–Ağu 30)
   *   ≈ kolonideki akar; 1000 akara varmadan tedavi. Altlık en az 7 gün kalır (NBU). İzle bandı 500–999 (uygulama kararı).
   * Örnek büyüklüğü: ½ bardak ≈ 300 arı (HBHC). */
  var VARROA = {
    SAMPLE_BEES: 300, DROP_DAYS: 7, DROP_LIMIT: 1000, RECOUNT_OK: 30, RECOUNT_WATCH: 14, STALE_DAYS: 30,
    PHASE: { kis: { label: 'kış (dinlenme)', thr: 1 }, ilkbahar: { label: 'ilkbahar (nüfus artışı)', thr: 1 }, akim: { label: 'bal akımı (nüfus zirvesi)', thr: 2 },
      yaz: { label: 'yaz (nüfus zirvesi)', thr: 2 }, sonbahar: { label: 'sonbahar (nüfus azalışı)', thr: 2 } },
    SRC: { wash: 'Honey Bee Health Coalition — Tools for Varroa Management, 9. baskı (2026), Tablo 1', drop: 'UK National Bee Unit — Managing Varroa; Fact sheet 13 (doğal akar düşüşü)' }
  };
  function dropFactor(d) { var m = Number(String(d).slice(5, 7)); return (m >= 11 || m <= 2) ? 400 : (m >= 5 && m <= 8 ? 30 : 100); }
  /** Sayım → seviye. rec: { count, method, infestation?, days? }. { band: 'alti'|'izle'|'tedavi', pct, metric, thr, phase, text } */
  function varroaBand(apId, rec, d) {
    d = d || today();
    var sk = 'yaz'; try { sk = seasonKind(apId, d); } catch (e) { sk = 'yaz'; }
    var ph = VARROA.PHASE[sk] || VARROA.PHASE.yaz, out = { phase: ph.label, season: sk, thr: ph.thr, method: rec.method };
    if (rec.method === 'tabla') {
      var days = Number(rec.days) > 0 ? Number(rec.days) : VARROA.DROP_DAYS, daily = Math.round(Number(rec.count) / days * 10) / 10, est = Math.round(daily * dropFactor(d));
      out.daily = daily; out.est = est; out.pct = null;
      out.band = est >= VARROA.DROP_LIMIT ? 'tedavi' : (est >= VARROA.DROP_LIMIT / 2 ? 'izle' : 'alti');
      out.metric = 'günde ' + num(daily) + ' akar düşüş';
      out.limitTxt = 'günde ' + num(Math.round(VARROA.DROP_LIMIT / dropFactor(d) * 10) / 10) + ' akar';
    } else {
      var p = rec.infestation != null ? Number(rec.infestation) : Math.round(Number(rec.count) / VARROA.SAMPLE_BEES * 1000) / 10;
      out.pct = p; out.metric = '%' + num(p) + ' bulaşma';
      out.band = p >= ph.thr ? 'tedavi' : (p >= ph.thr / 2 ? 'izle' : 'alti');
      out.limitTxt = '%' + num(ph.thr);
    }
    out.text = out.band === 'tedavi' ? 'Tedavi gerekli: ' + out.metric + ' — ' + ph.label + ' eşiği ' + out.limitTxt
      : out.band === 'izle' ? 'İzle: ' + out.metric + ' — eşiğe yakın (' + ph.label + ' eşiği ' + out.limitTxt + ')'
      : 'Eşik altı: ' + out.metric + ' (' + ph.label + ' eşiği ' + out.limitTxt + ')';
    return out;
  }
  /** Kovanda açık «Şeritleri çıkar» görevi */
  function openRemovalTask(hId) {
    var o = []; try { o = D.taskStore.open(); } catch (e) { o = []; }
    return o.filter(function (x) { return String(x.hiveId) === String(hId) && /^Şeritleri çıkar/i.test(String(x.title || '')); })[0] || null;
  }
  function medPlan(h, st) {
    var I = global.SuperAriIlac; st = st || hiveState(h);
    var t = today(), out = { hive: h, blocks: [], warns: [], products: [] };
    var v = st.varroa;
    if (!v) { out.level = 'sayim'; out.summary = 'Varroa sayımı yok — önce sayım girin (½ bardak ≈ 300 arı: alkol yıkama / pudra şekeri).'; }
    else {
      var vb = varroaBand(h.apiaryId, v, t), age = daysBetween(v.date, t);
      out.band = vb; out.metric = vb.metric; out.infestation = vb.pct; out.countDate = v.date; out.countAge = age;
      out.level = vb.band === 'tedavi' ? 'tedavi' : 'izle';
      out.summary = vb.metric + ' (' + fmt(v.date) + ') → ' + (vb.band === 'tedavi' ? 'tedavi gerekli' : vb.band === 'izle' ? 'izle, 2 hafta sonra tekrar sayın' : 'eşik altı, ayda bir sayın');
      if (age > VARROA.STALE_DAYS) out.warns.push('Son sayım ' + age + ' gün önce; tedaviden önce yeniden sayın.');
    }
    var fl = flowAt(h.apiaryId, t);
    if (fl.flow) out.blocks.push('Bal akımı sürüyor (' + fl.phase.label + ') — ilaç uygulanmaz.');
    if (hasSuper(h.id)) out.blocks.push('Bal katı takılı — önce bal katını alın.');
    /* süren tedavi / bekleme / süresi dolmuş şerit */
    var lt = st.lastTreat, lastGroup = null;
    if (lt) {
      var det = I.detect(lt.treatment), prod = det && det.id ? I.byId(det.id) : null;
      lastGroup = det ? det.group : null;
      var dur = prod && prod.durationDays ? prod.durationDays[1] : 0;
      var until = lt.checkDate && lt.checkDate > t ? lt.checkDate : (dur ? addDays(lt.date, dur) : null);
      if (lt.withdrawalDays) { var wu = addDays(lt.date, lt.withdrawalDays); if (wu >= t && (!until || wu > until)) until = wu; }
      var rem = openRemovalTask(h.id);
      if (until && until >= t) out.blocks.push('Önceki tedavi sürüyor: ' + lt.treatment + ' (' + fmt(lt.date) + ' → ' + fmt(until) + '). Aynı anda başka varroa ilacı kullanmayın.');
      else if (rem && (lt.doseUnit === 'serit' || (prod && prod.dose && prod.dose.unit === 'serit'))) {
        out.removeOld = { name: prod ? prod.name : String(lt.treatment).split(' (')[0], date: lt.date, due: dur ? addDays(lt.date, dur) : (lt.checkDate || t), taskId: rem.id, qty: lt.dose };
      }
      out.lastTreat = { text: lt.treatment, date: lt.date, group: lastGroup, groupLabel: lastGroup && I.GROUPS[lastGroup] ? I.GROUPS[lastGroup].label : '' };
    }
    var nf = nextFlowStart(h.apiaryId, t);
    var yr = t.slice(0, 4);
    I.LIST.forEach(function (p) {
      var dz = I.doseFor(p.id, st.beeFrames);
      var o = { id: p.id, name: p.name, group: p.group, verified: !!p.dose, dose: dz, warns: [], blocks: [] };
      if (p.dose) {
        if (nf && p.preFlowDays && daysBetween(t, nf) < p.preFlowDays) o.blocks.push('Bal akımına ' + daysBetween(t, nf) + ' gün var; etiket en az ' + p.preFlowDays + ' gün önce bitmiş olmasını ister.');
        else if (nf && p.durationDays && daysBetween(t, nf) < p.durationDays[0]) o.blocks.push('Tedavi (' + p.durationDays[0] + ' gün) bal akımından önce bitmez.');
        if (lastGroup && lastGroup === p.group) { o.sameGroup = true; o.warns.push('Son tedavi de aynı gruptan (' + I.GROUPS[p.group].label + '): rotasyon için farklı grup seçin.'); }
        if (p.maxPerYear) {
          var n = st.disease.filter(function (d) { return d.treatment && d.date.slice(0, 4) === yr && (I.detect(d.treatment) || {}).id === p.id; }).length;
          if (n >= p.maxPerYear) o.blocks.push('Bu yıl ' + n + ' kez kullanıldı; etiket yılda en çok ' + p.maxPerYear + ' kez.');
        }
        var it = treatItem(p);
        o.stockItem = it ? { id: it.id, name: it.name, qty: it.qty } : null;
        o.inStock = !!(it && dz.ok && Number(it.qty) >= dz.qty);
      }
      out.products.push(o);
    });
    out.products.sort(function (a, b) {
      function sc(x) { return (x.verified ? 0 : 100) + (x.blocks.length ? 10 : 0) + (x.sameGroup ? 4 : 0) + (x.dose.ok ? 0 : 5) + (x.inStock ? 0 : 2) + (x.warns.length ? 1 : 0); }
      return sc(a) - sc(b);
    });
    /* Rotasyon: aynı etken madde grubu art arda önerilmez; farklı gruptan stokta olan öne. */
    var cands = out.products.filter(function (x) { return x.verified && x.dose.ok && !x.blocks.length; });
    var diff = cands.filter(function (x) { return !x.sameGroup; });
    var best = diff.filter(function (x) { return x.inStock; })[0] || diff[0] || null;
    out.best = best;
    if (!best && cands.length) out.buyNote = 'Farklı etken maddeli ilaç alınmalı (son tedavi: ' + (out.lastTreat.groupLabel || 'aynı grup') + ').';
    else if (best && !best.inStock) out.buyNote = 'Stokta ' + (lastGroup ? 'farklı etken maddeli ' : '') + 'uygun şerit yok — ' + best.name + ' (veya ' + I.GROUPS[best.group].label + ' grubundan ruhsatlı ilaç) alınmalı.';
    out.canTreat = !out.blocks.length && out.level !== 'sayim';
    if (out.blocks.length) out.summary += ' · ⛔ ' + out.blocks[0];
    else if (best && out.level === 'tedavi') out.summary += ' · Öneri: ' + best.name + ' ' + best.dose.text + ' şerit (etiket)';
    return out;
  }
  /** Varroa adımları (kısa liste) — kovanın son tedavisi, rotasyon, stok, etiket dozu/yerleşim/süre/bal uyarısı. Formül gösterilmez. */
  function varroaSteps(h, mp) {
    var I = global.SuperAriIlac, L = [], t = today(), sk = 'yaz';
    try { sk = seasonKind(h.apiaryId, t); } catch (e) { sk = 'yaz'; }
    if (mp.removeOld) L.push('Önce önceki şeritleri çıkarın: ' + mp.removeOld.name + (mp.removeOld.qty ? ' ' + num(mp.removeOld.qty) + ' şerit' : '') + ' (konma ' + fmt(mp.removeOld.date) + ', etiket süresi ' + fmt(mp.removeOld.due) + ' doldu).');
    if (mp.level === 'sayim' || (mp.countAge != null && mp.countAge > VARROA.STALE_DAYS)) {
      if (sk === 'kis') L.push('Kış salkımını bozmayın: yapışkan altlık koyun, ' + VARROA.DROP_DAYS + ' gün sonra düşen akarları sayın.');
      else L.push('Sayım yapın: yavrulu çerçeveden ½ bardak (≈300 arı) alın, alkol / sabunlu su ile yıkayın veya pudra şekeriyle çalkalayın; düşen akar sayısını yazın.');
      if (mp.level === 'sayim') return L;
    }
    var b = mp.band ? mp.band.band : null;
    if (b === 'alti') { L.push('Tedavi gerekmez. ' + VARROA.RECOUNT_OK + ' gün sonra tekrar sayın (görev).'); return L; }
    if (b === 'izle') { L.push('Şimdilik tedavi yok. ' + VARROA.RECOUNT_WATCH + ' gün sonra tekrar sayın (görev).'); return L; }
    if (mp.blocks.length) {
      mp.blocks.forEach(function (x) { L.push('⛔ Şimdi ilaç yok: ' + x); });
      L.push('Engel kalkınca yeniden sayın; eşik üstündeyse etiket dozuyla tedavi edin.');
      return L;
    }
    if (mp.lastTreat) L.push('Son tedavi: ' + String(mp.lastTreat.text).split(' (')[0] + (mp.lastTreat.groupLabel ? ' · ' + mp.lastTreat.groupLabel : '') + ' · ' + fmt(mp.lastTreat.date) + ' → direnç için farklı etken madde.');
    var best = mp.best;
    if (!best) { L.push(mp.buyNote || 'Bu kovan için ruhsatlı etiket dozu bulunamadı — veteriner hekime danışın.'); return L; }
    var p = I.byId(best.id), d1 = p.durationDays[0], d2 = p.durationDays[1];
    L.push('Şerit koy: ' + best.dose.text + ' adet ' + best.name + ' (etiket dozu' + (p.dose.type === 'frames' ? ', arılı çerçeveye göre' : '') + ').');
    var pl = I.placementFor ? I.placementFor(p.id, best.dose.qty) : ''; if (pl) L.push('Yerleşim: ' + pl);
    L.push('Süre: ' + d1 + (d2 !== d1 ? '–' + d2 : '') + ' gün kovanda; şerit çıkarma ve kontrol sayımı ' + fmt(addDays(t, d2)) + ' (görev).');
    if (p.withdrawalText) L.push('Bal: ' + p.withdrawalText);
    if (best.inStock) L.push('Stokta var: ' + best.stockItem.name + ' (' + num(best.stockItem.qty) + ' şerit).');
    else if (mp.buyNote) L.push(mp.buyNote);
    return L;
  }
  /** Girilen (henüz kaydedilmemiş) sayım için öneri: { text, band, steps } */
  function varroaAdvice(hiveId, count, method) {
    var h = D.hiveById(hiveId), c = Number(count);
    if (!h || !isFinite(c) || c < 0 || String(count).trim() === '') return null;
    var st = hiveState(h), v = { date: today(), disease: 'varroa', count: Math.round(c), method: method === 'tabla' ? 'tabla' : (method === 'seker' ? 'seker' : 'alkol') };
    var mp = medPlan(h, Object.assign({}, st, { varroa: v }));
    return { text: mp.band.text, band: mp.band.band, steps: varroaSteps(h, Object.assign({}, mp, { countAge: 0 })), mp: mp };
  }
  /** Sayım kaydı sonrası tekrar sayım görevi (mükerrer yok). Dönüş: eklenen görev ya da null. */
  function ensureTask(hId, title, due, pri, re, note) {
    var h = D.hiveById(hId); if (!h) return null;
    var o = []; try { o = D.taskStore.open(); } catch (e) { o = []; }
    if (o.some(function (x) { return String(x.hiveId) === String(hId) && (re ? re.test(String(x.title || '')) || re.test(String(x.note || '')) : String(x.title).indexOf(title) === 0); })) return null;
    return D.taskStore.add({ title: title + ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id, due: due, priority: pri || 2, note: note || '[varroa]' });
  }
  var RE_COUNT_TASK = /^Varroa sayım|^Kontrol sayımı|^Yapışkan altlık|^Altlığı çıkar|\[muayene-oto:varroa\]/i;
  function recountTask(hId, mp) {
    var b = mp && mp.band ? mp.band.band : null;
    if (b === 'alti') return ensureTask(hId, 'Varroa sayımı (aylık kontrol)', addDays(today(), VARROA.RECOUNT_OK), 3, RE_COUNT_TASK);
    if (b === 'izle') return ensureTask(hId, 'Varroa sayımı (2 hafta sonra tekrar)', addDays(today(), VARROA.RECOUNT_WATCH), 2, RE_COUNT_TASK);
    return null;
  }
  /** Sayım yok / eski: «Varroa sayımı» ya da kışın «Yapışkan altlık koy» görevi (mükerrer yok). */
  function countTask(h, mp) {
    mp = mp || medPlan(h);
    if (mp.level !== 'sayim' && !(mp.countAge > VARROA.STALE_DAYS)) return null;
    var sk = 'yaz'; try { sk = seasonKind(h.apiaryId); } catch (e) { sk = 'yaz'; }
    if (sk === 'kis') {
      var a = ensureTask(h.id, 'Yapışkan altlık koy (varroa doğal düşüş)', today(), 2, RE_COUNT_TASK, '[varroa-altlik:koy]');
      if (a) ensureTask(h.id, 'Altlığı çıkar, akarları say (' + VARROA.DROP_DAYS + ' gün)', addDays(today(), VARROA.DROP_DAYS), 2, /^Altlığı çıkar/i, '[varroa-altlik:say]');
      return a;
    }
    return ensureTask(h.id, mp.level === 'sayim' ? 'Varroa sayımı (½ bardak ≈300 arı)' : 'Varroa sayımını yenile (son sayım ' + mp.countAge + ' gün önce)', addDays(today(), 3), 2, RE_COUNT_TASK);
  }
  /** Tedavi sonrası görevler: şerit çıkarma (etiket süresi) + kontrol sayımı (tedavi süresi sonunda). */
  function treatTasks(h, p, startIso) {
    var d2 = p.durationDays ? p.durationDays[1] : 21, due = addDays(startIso || today(), d2), out = [];
    var sfx = ' — ' + h.name + (mode() === 'demo' ? ' · Demo' : '');
    if (p.dose && p.dose.unit === 'serit') out.push(D.taskStore.add({ title: 'Şeritleri çıkar (' + p.name + ', etiket ' + p.durationDays[0] + (d2 !== p.durationDays[0] ? '–' + d2 : '') + ' gün)' + sfx, hiveId: h.id, due: due, priority: 1, note: '[varroa-serit] Bakım · ilaç ' + p.name }));
    out.push(D.taskStore.add({ title: 'Kontrol sayımı (tedavi sonrası, ' + p.name + ')' + sfx, hiveId: h.id, due: due, priority: 1, note: '[varroa-kontrol] Tedavi etkisi: ½ bardak ≈300 arı yıkama' }));
    return out.filter(Boolean);
  }
  /** Tedaviyi kaydet: hastalık kaydı + şerit çıkarma görevi + stoktan düş. */
  /** Ürünün stoktaki şerit kalemi (ad → etken madde eşleşmesi) */
  function treatItem(p) {
    var list = []; try { list = D.stock.list(); } catch (e) { list = []; }
    var nm = p.name.toLocaleLowerCase('tr').split(' ')[0], act = p.active.toLocaleLowerCase('tr').split(' ')[0];
    return list.filter(function (x) { return x.category === 'ilac' && x.unit === 'şerit' && x.name.toLocaleLowerCase('tr').indexOf(nm) >= 0; })[0] ||
      list.filter(function (x) { return x.category === 'ilac' && x.unit === 'şerit' && x.name.toLocaleLowerCase('tr').indexOf(act) >= 0; })[0] || null;
  }
  /** qty: uygulanan GERÇEK şerit/kovan (boşsa etiket dozu). Stoktan bu miktar düşülür; uygulama etiket dışı miktar önermez. */
  function saveTreatment(hiveId, productId, qtyIn) {
    var I = global.SuperAriIlac, h = D.hiveById(hiveId), p = I.byId(productId);
    if (!h || !p) return { ok: false, msg: 'Kovan veya ürün bulunamadı' };
    if (!p.dose) return { ok: false, msg: p.label ? 'Tütsü ürünü: şerit kaydı hesaplanmaz; uygulamayı Koloni › tedavi kaydından girin (etiket: ' + (p.label.puffsPerHive ? p.label.puffsPerHive + ' duman darbesi/kovan' : p.label.perHive + ' şerit yakılır/kovan') + ', ' + p.label.intervalDays + ' gün ara ile ' + p.label.repeats + ' kez).' : 'Doz doğrulanmadı; bu ürün için kayıt hesaplanmaz.' };
    var mp = medPlan(h), po = mp.products.filter(function (x) { return x.id === p.id; })[0];
    if (mp.blocks.length) return { ok: false, msg: mp.blocks[0] };
    if (po.blocks.length) return { ok: false, msg: po.blocks[0] };
    if (!po.dose.ok) return { ok: false, msg: po.dose.reason };
    var t = today(), dur = p.durationDays[1], lab = po.dose.qty, qn = Number(String(qtyIn == null ? '' : qtyIn).replace(',', '.'));
    var qty = qn > 0 && qn <= 50 ? Math.round(qn * 10) / 10 : lab;
    var rec = D.records.add(h.id, 'disease', { date: t, disease: 'varroa', count: mp.varroa ? mp.varroa.count : null, method: mp.varroa ? mp.varroa.method : 'alkol',
      infestation: mp.infestation, treatment: p.name + ' (' + p.active + ')', dose: qty, doseUnit: 'serit', labelDose: lab,
      withdrawalDays: p.withdrawal === 'tedaviBoyunca' ? dur : 0, checkDate: addDays(t, dur), note: 'Bakım planı · etiket: ' + p.dose.note.slice(0, 200) });
    treatTasks(h, p, t);
    var msg = p.name + ' ' + num(qty) + ' şerit' + (qty !== lab ? ' (etiket dozu: ' + num(lab) + ')' : '') + ' kaydedildi; şerit çıkarma ve kontrol sayımı görevi ' + fmt(addDays(t, dur)) + ' tarihine eklendi.', low = null;
    var it = treatItem(p);
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
    if (mp.removeOld) out.push({ kind: 'ilac', text: 'Önceki şeritleri çıkar (' + mp.removeOld.name + ')', amount: 'etiket süresi ' + fmt(mp.removeOld.due) + ' doldu', u: 1 });
    if (mp.canTreat && mp.level === 'tedavi' && mp.best) out.push({ kind: 'ilac', text: 'Varroa tedavisi (' + mp.metric + ')', amount: mp.best.name + ' ' + mp.best.dose.text + ' şerit (etiket)', u: 1 });
    else if (mp.canTreat && mp.level === 'planla' && mp.best) out.push({ kind: 'ilac', text: 'Varroa tedavisi planla (' + mp.metric + ')', amount: mp.best.name + ' ' + mp.best.dose.text + ' şerit (etiket)', u: 2 });
    else if (mp.level === 'sayim') out.push({ kind: 'sayim', text: sk === 'kis' ? 'Varroa: yapışkan altlık' : 'Varroa sayımı', amount: sk === 'kis' ? VARROA.DROP_DAYS + ' gün sonra say' : '½ bardak ≈300 arı · yıkama / pudra şekeri', u: 3 });
    else if (mp.countDate && t > addDays(mp.countDate, VARROA.STALE_DAYS)) out.push({ kind: 'sayim', text: 'Varroa sayımını yenile', amount: 'son ' + fmt(mp.countDate), u: 3 });
    /* Göç sonrası ilk 7 gün: taşıma stresi — uçuş deliği, su, ana/yavru kontrolü */
    var gc = null; try { gc = D.goc && D.goc.recentForHive(h.id, 7); } catch (eG) { gc = null; }
    if (gc) out.push({ kind: 'goc', text: 'Göç sonrası kontrol', amount: 'uçuş deliği · su · ana/yavru (göç ' + fmt(gc.date) + ')', u: 2 });
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
    var c = Math.round(Number(count)); if (String(count == null ? '' : count).trim() === '' || !isFinite(c) || c < 0 || c > 5000) return { ok: false, msg: 'Akar sayısını yazın.' };
    var rec = D.records.add(h.id, 'disease', { date: today(), disease: 'varroa', count: c, method: method === 'seker' ? 'seker' : 'alkol', note: 'Bakım planı · ½ bardak ≈300 arı örneği' });
    var n = completeMatching(h.id, /^Varroa sayım|^Kontrol sayımı/i);
    var mp = medPlan(D.hiveById(h.id)), tk = recountTask(h.id, mp);
    try { global.dispatchEvent(new CustomEvent('superari-records-changed')); } catch (e) { /* ignore */ }
    return { ok: !!rec, msg: 'Sayım kaydedildi (' + c + ' akar · ' + mp.band.text + ').' + (n ? ' ' + n + ' görev tamamlandı.' : '') + (tk ? ' Tekrar sayım görevi: ' + fmt(tk.due) + '.' : '') };
  }

  /* ---------------- «Bu kovan için öneri» kartı ---------------- */
  var CSS = '.bo{display:grid;gap:.55rem;font-size:.85rem;min-width:0}.bo *{box-sizing:border-box}.bo-chips{display:flex;flex-wrap:wrap;gap:.3rem}.bo-chip{font-size:.72rem;font-weight:800;padding:.18rem .5rem;border-radius:999px;background:#f1f3f5;color:#343a40}' +
    '.bo-chip.demo{background:#fff3bf;color:#7a5b00}.bo-sec{border:1px solid #ead9b3;border-radius:12px;padding:.55rem .6rem;background:#fff;display:grid;gap:.4rem;min-width:0}.bo-sec h3{margin:0;font-size:.9rem}' +
    '.bo-sec p{margin:0;overflow-wrap:anywhere}.bo-mut{color:#6b7280;font-size:.78rem}.bo-warn{background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;border-radius:10px;padding:.4rem .5rem;font-size:.78rem}' +
    '.bo-block{background:#fff5f5;border:1px solid #ffc9c9;color:#a61e1e;border-radius:10px;padding:.4rem .5rem;font-size:.78rem}.bo-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}' +
    '.bo-row select,.bo-row input{font:inherit;font-size:.85rem;padding:.45rem .5rem;border:1px solid #ead9b3;border-radius:10px;background:#fff;min-width:0;max-width:100%}.bo-row input[type=number]{width:5.5rem}.bo-row select{flex:1 1 12rem}' +
    '.bo-btn{font:inherit;font-size:.82rem;font-weight:800;padding:.5rem .75rem;border-radius:10px;border:1.5px solid #e0c56a;background:linear-gradient(180deg,#fff6df,#fff3bf);color:#5c4813;cursor:pointer}' +
    '.bo-dz{display:grid;gap:6px;font-size:.8rem;font-weight:800;color:#5c4813}.bo-dzs{display:grid;grid-template-columns:72px minmax(0,1fr) 72px;gap:10px;align-items:center}' +
    '.bo-dzs button{min-height:72px;border-radius:16px;border:2px solid #1c5fa8;background:#fff;font:inherit;font-size:36px;font-weight:900;color:#0d3d73;cursor:pointer;touch-action:manipulation}' +
    '.bo-dzs output{font-size:30px;font-weight:900;text-align:center}.bo-dzn{margin:0;font-size:.85rem;line-height:1.35}.bo-dzn.note{color:#5c4813;font-weight:700}' +
    '.bo-dzn.warn{background:#fff0f0;border:3px solid #c92a2a;color:#8a1c1c;border-radius:12px;padding:10px;font-size:1rem;font-weight:900}.bo-dzn.age{background:#f6f1e4;border:1px solid #e3d3a8;color:#5c4813;border-radius:10px;padding:8px;font-weight:700}' +
    '.bo-btn.bo-big{min-height:64px;font-size:1.05rem;width:100%}' +
    '.bo-vc{display:grid;gap:14px;margin:4px 0}.bo-vsel{font:inherit;font-size:18px;font-weight:700;min-height:64px;width:100%;padding:0 14px;border:2px solid #d8b75a;border-radius:16px;background:#fff;color:#3d2616}' +
    '.bo-vstep{display:grid;grid-template-columns:72px minmax(0,1fr) 72px;gap:12px;align-items:stretch}.bo-vstep button{min-height:72px;border-radius:16px;border:2px solid #1c5fa8;background:#fff;font:inherit;font-size:36px;font-weight:900;color:#0d3d73;cursor:pointer;touch-action:manipulation}' +
    '.bo-vstep input{min-height:72px;width:100%;min-width:0;box-sizing:border-box;font:inherit;font-size:30px;font-weight:900;text-align:center;border:2px solid #d8b75a;border-radius:16px;background:#fff;color:#3d2616;padding:0 6px}' +
    '.bo-steps{margin:0;padding-left:1.2rem;display:grid;gap:.25rem;font-size:.84rem;line-height:1.35;overflow-wrap:anywhere}.bo-hint{margin:0;font-size:.8rem;line-height:1.35;color:#5c4813;background:#fffaf0;border:1px dashed #e3d3a8;border-radius:10px;padding:.4rem .5rem}' +
    '.bo-adv:empty{display:none}.bo-adv{border-radius:12px;padding:.5rem .6rem;font-size:.86rem;line-height:1.35;border:2px solid #b2f2bb;background:#ebfbee;color:#1b5e20}.bo-adv.izle{border-color:#ffd8a8;background:#fff4e6;color:#8a4b00}.bo-adv.tedavi{border-color:#ffa8a8;background:#fff5f5;color:#8a1c1c}' +
    '.bo-adv b{display:block;font-size:.95rem;margin-bottom:.2rem}.bo-adv ol{margin:.2rem 0 0;padding-left:1.15rem;display:grid;gap:.2rem}' +
    '.bo-btn.ok{border-color:#b2f2bb;background:#ebfbee;color:#2b8a3e}.bo-task{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.4rem;align-items:center;border-top:1px dashed #ead9b3;padding-top:.35rem}' +
    '.bo-task:first-of-type{border-top:0;padding-top:0}.bo-msg{font-size:.8rem;font-weight:700;color:#2b8a3e;margin:0}.bo-msg.err{color:#c92a2a}';
  function ensureCss() { if (document.getElementById('bo-css')) return; var s = document.createElement('style'); s.id = 'bo-css'; s.textContent = CSS; document.head.appendChild(s); }
  function renderHiveCard(el, hiveId, opts) {
    opts = opts || {}; ensureCss();
    var I = global.SuperAriIlac, h = D.hiveById(hiveId);
    if (!el) return;
    if (!h) { el.innerHTML = '<p class="bo-mut">Kovan bulunamadı.</p>'; return; }
    var st = hiveState(h), fp = feedPlan(h, st), mp = medPlan(h, st);
    try { countTask(h, mp); } catch (eC) { /* ignore */ }
    var tasks = hiveTasks(h.id, 3650);
    var H = [];
    H.push('<div class="bo-chips">' + (mode() === 'demo' ? '<span class="bo-chip demo">Demo</span>' : '') +
      '<span class="bo-chip">' + esc(PROFILES[profileKey(h.apiaryId)].label.split(' (')[0]) + '</span>' +
      (st.beeFrames != null ? '<span class="bo-chip">' + st.beeFrames + ' arılı çerçeve</span>' : '') +
      (st.honeyFrames != null ? '<span class="bo-chip">' + st.honeyFrames + ' bal çerçevesi</span>' : '') +
      (mp.metric ? '<span class="bo-chip">Varroa ' + esc(mp.metric.replace(' bulaşma', '')) + '</span>' : '') + '</div>');
    var firstInsp = false; try { var rr0 = D.records.status(h.id).records; firstInsp = !rr0.strength.length && !rr0.brood.length && !rr0.disease.length && !rr0.feed.length; } catch (eF) { firstInsp = false; }
    H.push('<div style="display:flex;gap:.4rem;margin:.1rem 0 .5rem;"><button type="button" class="bo-btn" data-bo-km style="flex:1;min-width:0;min-height:50px;font-size:1rem;">🐝 ' + (firstInsp ? 'İlk muayene (adım adım)' : 'Kolay muayene (≈1 dk)') + '</button><button type="button" class="bo-btn" data-bo-km data-voice="1" style="flex:none;min-height:50px;font-size:.95rem;">🎙 Sesle başlat</button></div>');
    H.push('<label class="bo-row" style="font-size:.8rem;"><input type="checkbox" data-bo-super' + (hasSuper(h.id) ? ' checked' : '') + '> Bal katı takılı (ilaç engellenir)</label>');
    if (tasks.length) {
      H.push('<div class="bo-sec"><h3>📌 Yapılacaklar (bu kovan, tam liste)</h3>' + tasks.map(function (x) {
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
    var V = '<div class="bo-sec"><h3>💊 Varroa</h3><p>' + esc(mp.band ? mp.band.text + ' · ' + fmt(mp.countDate) : mp.summary.split(' · ⛔')[0].split(' · Öneri')[0]) + '</p>';
    mp.warns.forEach(function (w) { V += '<p class="bo-warn">' + esc(w) + '</p>'; });
    mp.blocks.forEach(function (b) { V += '<p class="bo-block">⛔ ' + esc(b) + '</p>'; });
    var vsteps = varroaSteps(h, mp).filter(function (x) { return x.indexOf('⛔') !== 0; });
    if (vsteps.length) V += '<ol class="bo-steps">' + vsteps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    V += '<p class="bo-hint"><b>Akar sayısı ne?</b> Yavrulu çerçeveden ½ bardak (≈300 arı) alın; alkol / sabunlu su ile yıkayın veya pudra şekeriyle çalkalayın. Düşen akarların <b>sayısını</b> yazın (yüzde değil) — uygulama 300 arıya göre bulaşma yüzdesini çıkarır.</p>';
    /* saha: eldiven boyu (≥64px, tam genişlik, geniş aralık) — yöntem, büyük −/+ sayı, kaydet */
    V += '<div class="bo-vc"><select class="bo-vsel" data-bo-method aria-label="Sayım yöntemi"><option value="alkol">Alkol yıkama (≈300 arı)</option><option value="seker">Pudra şekeri (≈300 arı)</option></select>' +
      '<div class="bo-vstep"><button type="button" data-bo-vinc="-1" aria-label="Akar azalt">−</button>' +
      '<input type="number" inputmode="numeric" min="0" max="5000" placeholder="Akar" data-bo-count aria-label="Akar sayısı (300 arıda)">' +
      '<button type="button" data-bo-vinc="1" aria-label="Akar artır">+</button></div>' +
      '<button type="button" class="bo-btn bo-big" data-bo-savecount>Sayımı kaydet</button></div><div class="bo-adv" data-bo-vadv aria-live="polite"></div>';
    if (mp.canTreat && (mp.level === 'tedavi' || mp.level === 'planla')) {
      var opt = mp.products.filter(function (x) { return x.verified; }).map(function (x) {
        var dis = !x.dose.ok || x.blocks.length;
        return '<option value="' + x.id + '"' + (dis ? ' disabled' : '') + (mp.best && mp.best.id === x.id ? ' selected' : '') + '>' + esc(x.name + ' — ' + (x.dose.ok ? x.dose.text + ' şerit' : 'doz yok') + (x.blocks.length ? ' (uygun değil)' : x.warns.length ? ' (rotasyon uyarısı)' : '')) + '</option>';
      }).join('');
      V += '<div class="bo-row"><select data-bo-prod aria-label="İlaç">' + opt + '</select></div><div data-bo-prodinfo></div>' +
        '<div class="bo-dz"><span id="boDzL' + esc(h.id) + '">Uyguladığınız şerit / kovan (gerçek sayı)</span><div class="bo-dzs"><button type="button" data-bo-dz="-1" aria-label="Şerit azalt">−</button>' +
        '<output data-bo-dzv aria-labelledby="boDzL' + esc(h.id) + '" aria-live="polite"></output><button type="button" data-bo-dz="1" aria-label="Şerit artır">+</button></div><div data-bo-dzchk></div></div>' +
        '<button type="button" class="bo-btn bo-big" data-bo-treat>İlaçlamayı kaydet</button>';
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
    var dz = { pid: null, v: null };
    function dzChk() {
      var sel = el.querySelector('[data-bo-prod]'), out = el.querySelector('[data-bo-dzv]'), box = el.querySelector('[data-bo-dzchk]');
      var res = { level: 'none', text: '', age: '' };
      if (!sel || !out) return res;
      var po = mp.products.filter(function (x) { return x.id === sel.value; })[0], p = I.byId(sel.value);
      var lab = po && po.dose && po.dose.ok ? po.dose.qty : null;
      if (dz.pid !== sel.value) { dz.pid = sel.value; dz.v = lab; }
      out.textContent = dz.v != null ? num(dz.v) + ' şerit' : '—';
      if (lab != null && I.doseCheck) { var c = I.doseCheck(dz.v, lab, 'serit'); res.level = c.level; res.text = c.text; }
      var it = p ? treatItem(p) : null;
      if (it && I.ageNote) res.age = I.ageNote(I.productOfItem(it) || p.id, it, lab, 'serit', today());
      if (box) box.innerHTML = (res.level === 'warn' || res.level === 'note' ? '<p class="bo-dzn ' + res.level + '" role="' + (res.level === 'warn' ? 'alert' : 'status') + '">' + (res.level === 'warn' ? '⚠ ' : '') + esc(res.text) + '</p>' : '') +
        (res.age ? '<p class="bo-dzn age">ℹ ' + esc(res.age) + '</p>' : '');
      return res;
    }
    function info() {
      dzChk();
      var sel = el.querySelector('[data-bo-prod]'), box = el.querySelector('[data-bo-prodinfo]');
      if (!sel || !box) return;
      var po = mp.products.filter(function (x) { return x.id === sel.value; })[0], p = I.byId(sel.value);
      if (!po || !p) { box.innerHTML = ''; return; }
      box.innerHTML = '<p class="bo-mut">' + esc(p.dose.note) + ' Süre ' + p.durationDays[0] + (p.durationDays[1] !== p.durationDays[0] ? '–' + p.durationDays[1] : '') + ' gün. ' + esc(p.withdrawalText) + ' <a href="' + esc(p.source) + '" target="_blank" rel="noopener" style="color:#2b6cb0;text-decoration:underline;">' + (p.labelSource ? 'Etiket (üretici)' : 'Etiket (PDF)') + '</a></p>' +
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
    function vadv() {
      var box = el.querySelector('[data-bo-vadv]'), inp = el.querySelector('[data-bo-count]'), ms = el.querySelector('[data-bo-method]');
      if (!box || !inp) return;
      var a = inp.value === '' ? null : varroaAdvice(h.id, inp.value, ms ? ms.value : 'alkol');
      if (!a) { box.className = 'bo-adv'; box.innerHTML = ''; return; }
      box.className = 'bo-adv ' + a.band;
      box.innerHTML = '<b>' + esc(a.text) + '</b><ol>' + a.steps.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    }
    el.oninput = function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-bo-count')) vadv(); };
    el.onchange = function (e) {
      if (e.target.hasAttribute('data-bo-method')) vadv();
      else if (e.target.hasAttribute('data-bo-super')) { setSuper(h.id, e.target.checked); renderHiveCard(el, hiveId, opts); if (opts.onChange) opts.onChange({}); }
      else if (e.target.hasAttribute('data-bo-prod')) info();
    };
    el.onclick = function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-bo-km')) { openKM(h.id, { apiary: opts.apiary, voice: b.hasAttribute('data-voice'), onChange: opts.onChange, onNext: opts.onNext, rerender: function () { renderHiveCard(el, hiveId, opts); } }); return; }
      if (b.hasAttribute('data-bo-hz')) {
        var go = function () { global.SuperAriHastalik.open(h.id, { onSaved: function () { say({ ok: true, msg: 'Şüpheli hastalık kaydedildi; görevler eklendi.' }); } }); };
        if (global.SuperAriHastalik) go();
        else {
          var sc = document.createElement('script'), cur = document.querySelector('script[src*="bakim-plan.js"]'), mv = cur && /[?&]v=([^&]+)/.exec(cur.src);
          sc.src = 'hastalik-tahmin.js' + (mv ? '?v=' + mv[1] : ''); sc.onload = go; document.head.appendChild(sc);
        }
      } else if (b.hasAttribute('data-bo-done')) { D.taskStore.complete(b.getAttribute('data-bo-done'), { note: 'Bakım planından' }); say({ ok: true, msg: 'Görev tamamlandı.' }); }
      else if (b.hasAttribute('data-bo-savecell')) say(saveCell(h.id, el.querySelector('[data-bo-cell]').value, el.querySelector('[data-bo-celln]').value, el.querySelector('[data-bo-cellcap]').value, el.querySelector('[data-bo-eggs]').value === '1'));
      else if (b.hasAttribute('data-bo-vinc')) { var ci = el.querySelector('[data-bo-count]'); var cv = Math.round(Number(ci.value) || 0) + Number(b.getAttribute('data-bo-vinc')); ci.value = String(Math.max(0, Math.min(5000, cv))); vadv(); }
      else if (b.hasAttribute('data-bo-savecount')) say(saveCount(h.id, el.querySelector('[data-bo-count]').value, el.querySelector('[data-bo-method]').value));
      else if (b.hasAttribute('data-bo-dz')) { if (dz.v == null) return; dz.v = Math.max(1, Math.min(50, dz.v + Number(b.getAttribute('data-bo-dz')))); dzChk(); }
      else if (b.hasAttribute('data-bo-treat')) {
        var doTreat = function () {
          var r = saveTreatment(h.id, el.querySelector('[data-bo-prod]').value, dz.v);
          if (r.ok) { var n = completeMatching(h.id, /ilaçlama|Varroa sayımı ve/i); if (n) r.msg += ' ' + n + ' görev tamamlandı.'; }
          say(r);
        };
        var ck = dzChk();
        if (ck.level === 'warn' && I.askHighDose) I.askHighDose(ck.text, ck.age).then(function (ok) { if (ok) doTreat(); });
        else doTreat();
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
        apiary: o.apiary, onNext: o.onNext, voice: opts.voice,
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
    needs: needs, VARROA: VARROA, varroaBand: varroaBand, varroaSteps: varroaSteps, varroaAdvice: varroaAdvice, recountTask: recountTask, countTask: countTask, treatTasks: treatTasks, ensureTask: ensureTask, openRemovalTask: openRemovalTask, tour: tour, tourMarkDone: tourMarkDone, tourNext: tourNext, saveCount: saveCount, renderHiveCard: renderHiveCard, hiveTasks: hiveTasks,
    SYRUP: SYRUP, KG_PER_HONEY_FRAME: KG_PER_HONEY_FRAME, hiveState: hiveState, seasonKind: seasonKind, feedPlan: feedPlan, saveFeeding: saveFeeding, feedText: feedText, hiveSummary: hiveSummary, medPlan: medPlan, saveTreatment: saveTreatment,
    PROFILES: PROFILES, JOBS: JOBS, profileKey: profileKey, autoProfile: autoProfile, setProfile: setProfile,
    camBali: camBali, setCamBali: setCamBali, hasSuper: hasSuper, setSuper: setSuper, openKolayMuayene: openKM,
    phases: phases, phaseStatus: phaseStatus, flowAt: flowAt, nextFlowStart: nextFlowStart, addPhaseTasks: addPhaseTasks,
    winterStock: winterStock, winterStockAll: winterStockAll, winterTarget: winterTarget, winterNoteHtml: winterNoteHtml, winterSeasonNow: winterSeasonNow, besHref: besHref,
    esc: esc, fmt: fmt, num: num, mode: mode, today: today, addDays: addDays, loadSt: loadSt, saveSt: saveSt
  };
})(window);
