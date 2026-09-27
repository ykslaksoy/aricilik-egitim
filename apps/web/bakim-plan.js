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

  global.SuperAriPlan = {
    PROFILES: PROFILES, JOBS: JOBS, profileKey: profileKey, autoProfile: autoProfile, setProfile: setProfile,
    camBali: camBali, setCamBali: setCamBali, hasSuper: hasSuper, setSuper: setSuper,
    phases: phases, phaseStatus: phaseStatus, flowAt: flowAt, nextFlowStart: nextFlowStart, addPhaseTasks: addPhaseTasks,
    esc: esc, fmt: fmt, num: num, mode: mode, today: today, addDays: addDays, loadSt: loadSt, saveSt: saveSt
  };
})(window);
