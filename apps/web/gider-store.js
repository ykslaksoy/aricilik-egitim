/**
 * Shared Giderler + taşıma kaydı (localStorage).
 * Nakliye = üçüncü taraf; Kendi araç = zorunlu Yakıt gideri.
 * Her gider bir arılığa bağlıdır (apiaryId).
 */
(function (global) {
  var STORAGE_KEY = 'superari.giderler.v1';
  var TRANSPORT_KEY = 'superari.tasimalar.v1';
  var MATERIALS_KEY = 'superari.malzemeler.v1';

  /* Soft pastel-vivid Hardal-friendly — light but lively (not muddy, not neon). */
  var CATEGORIES = [
    { id: 'yem', label: 'Yem', color: '#f0c43a' },
    { id: 'ilac', label: 'İlaç', color: '#f08a8a' },
    { id: 'ekipman', label: 'Ekipman', color: '#7eb8e8' },
    { id: 'iscilik', label: 'İşçilik', color: '#e8a878' },
    { id: 'ambalaj', label: 'Ambalaj', color: '#7ec8b0' },
    { id: 'nakliye', label: 'Nakliye', color: '#9bc46a' },
    { id: 'yakit', label: 'Yakıt', color: '#f0a04a' },
    { id: 'yayla_kira', label: 'Yayla/kira', color: '#8eb8d8' },
    { id: 'diger', label: 'Diğer', color: '#c4b09a' }
  ];

  /**
   * Tipik mevsimlik / yıllık arılık masraf kalemleri (kovan başı birim × hiveCount).
   * ensureDefaultExpensesForApiary eksik olanları kalem kalem ekler.
   */
  var DEFAULT_KALEM_TEMPLATES = [
    { key: 'yem_seker', title: 'Şeker şurubu (sezon)', category: 'yem', perHive: 120,
      aliases: ['şeker şurubu (25 kg)', 'şeker şurubu', 'fondan'] },
    { key: 'yem_polen', title: 'Polen ikamesi', category: 'yem', perHive: 45,
      aliases: ['polen ikamesi'] },
    { key: 'ilac_varroa', title: 'Varroa mücadelesi', category: 'ilac', perHive: 55,
      aliases: ['varroa damlatma', 'varroa'] },
    { key: 'ilac_asit', title: 'Organik asit / şerit', category: 'ilac', perHive: 35,
      aliases: ['organik asit seti', 'organik asit'] },
    { key: 'ekipman_cerceve', title: 'Çerçeve / mum / tel', category: 'ekipman', perHive: 40,
      aliases: ['çerçeve teli + mum', 'petek temeli', 'çerçeve'] },
    { key: 'ekipman_bakim', title: 'Kovan bakımı malzeme', category: 'ekipman', perHive: 25,
      aliases: ['maske / eldiven', 'arılık bakım malzemesi', 'kovan boyası'] },
    { key: 'iscilik_sezon', title: 'Bakım işçiliği (sezon)', category: 'iscilik', perHive: 80,
      aliases: ['yevmiye — yardımcı', 'yevmiye', 'işçilik'] },
    { key: 'ambalaj_bal', title: 'Bal ambalaj / kap', category: 'ambalaj', perHive: 30,
      aliases: ['kavanoz + etiket seti', 'ambalaj'] },
    { key: 'nakliye_yayla', title: 'Yayla nakliye payı', category: 'nakliye', perHive: 70,
      aliases: ['yayla taşıma (nakliye)', 'nakliye'] },
    { key: 'yakit_sezon', title: 'Sezon yakıt payı', category: 'yakit', perHive: 50,
      aliases: ['yakıt'] },
    { key: 'yayla_kira', title: 'Yayla / kira payı', category: 'yayla_kira', perHive: 40,
      aliases: ['arılık yeri ücreti', 'yayla', 'kira'] },
    { key: 'diger_sigorta', title: 'Sigorta / diğer', category: 'diger', perHive: 20,
      aliases: ['sigorta'] }
  ];

  var SEED_EXPENSES = [
    {
      id: 'g1',
      title: 'Şeker şurubu (25 kg)',
      category: 'yem',
      amount: 2800,
      date: '2026-09-02',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      note: 'Sonbahar besleme'
    },
    {
      id: 'g2',
      title: 'Polen ikamesi',
      category: 'yem',
      amount: 1400,
      date: '2026-08-28',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık'
    },
    {
      id: 'g3',
      title: 'Varroa damlatma',
      category: 'ilac',
      amount: 1680,
      date: '2026-09-05',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık'
    },
    {
      id: 'g4',
      title: 'Organik asit seti',
      category: 'ilac',
      amount: 1200,
      date: '2026-08-20',
      apiaryId: 'a3',
      apiaryName: 'Palandöken Yayla Arılığı'
    },
    {
      id: 'g5',
      title: 'Çerçeve teli + mum',
      category: 'ekipman',
      amount: 1450,
      date: '2026-09-01',
      apiaryId: 'a3',
      apiaryName: 'Palandöken Yayla Arılığı'
    },
    {
      id: 'g6',
      title: 'Maske / eldiven',
      category: 'ekipman',
      amount: 950,
      date: '2026-08-15',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık'
    },
    {
      id: 'g10',
      title: 'Yevmiye — yardımcı',
      category: 'iscilik',
      amount: 1500,
      date: '2026-09-03',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      note: 'Günlük işçilik'
    },
    {
      id: 'g11',
      title: 'Kavanoz + etiket seti',
      category: 'ambalaj',
      amount: 820,
      date: '2026-08-30',
      apiaryId: 'a1',
      apiaryName: 'Kayaköy Ana Arılık',
      note: 'Paketleme'
    },
    {
      id: 'g7',
      title: 'Yayla taşıma (nakliye)',
      category: 'nakliye',
      amount: 1560,
      date: '2026-08-10',
      transportMode: 'nakliye',
      transportId: 't-seed-1',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      note: 'Üçüncü taraf nakliye'
    },
    {
      id: 'g9',
      title: 'Yakıt — Tortum taşıma',
      category: 'yakit',
      amount: 1850,
      date: '2026-08-22',
      transportMode: 'kendi_arac',
      transportId: 't-seed-2',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      note: 'Kendi araç'
    },
    {
      id: 'g12',
      title: 'Arılık yeri ücreti',
      category: 'yayla_kira',
      amount: 2500,
      date: '2026-08-05',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      note: 'Yayla / kira'
    },
    {
      id: 'g8',
      title: 'Arılık bakım malzemesi',
      category: 'diger',
      amount: 960,
      date: '2026-09-08',
      apiaryId: 'a3',
      apiaryName: 'Palandöken Yayla Arılığı'
    },
    {
      id: 'g13',
      title: 'Yayla nakliye payı',
      category: 'nakliye',
      amount: 1400,
      date: '2026-08-18',
      apiaryId: 'a4',
      apiaryName: 'Yanıkdağ Baluğundüzü Arılığı',
      note: 'Baluğundüzü çıkışı'
    },
    {
      id: 'g14',
      title: 'Şeker şurubu (sezon)',
      category: 'yem',
      amount: 1100,
      date: '2026-09-01',
      apiaryId: 'a4',
      apiaryName: 'Yanıkdağ Baluğundüzü Arılığı'
    },
    {
      id: 'g15',
      title: 'Yayla / kira payı',
      category: 'yayla_kira',
      amount: 1800,
      date: '2026-07-20',
      apiaryId: 'a5',
      apiaryName: 'Cimil Yaylası Arılığı',
      note: 'Cimil yayla dönemi'
    },
    {
      id: 'g16',
      title: 'Varroa mücadelesi',
      category: 'ilac',
      amount: 975,
      date: '2026-08-25',
      apiaryId: 'a5',
      apiaryName: 'Cimil Yaylası Arılığı'
    }
  ];

  var SEED_TRANSPORTS = [
    {
      id: 't-seed-1',
      mode: 'nakliye',
      date: '2026-08-10',
      amount: 1560,
      giderId: 'g7',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      title: 'Yayla taşıma (nakliye)',
      note: 'Üçüncü taraf nakliye'
    },
    {
      id: 't-seed-2',
      mode: 'kendi_arac',
      date: '2026-08-22',
      amount: 1850,
      giderId: 'g9',
      apiaryId: 'a2',
      apiaryName: 'Tortum Yayla Arılığı',
      title: 'Yakıt — Tortum taşıma',
      note: 'Kendi araç'
    }
  ];

  var SEED_APIARY_BY_ID = {};
  SEED_EXPENSES.forEach(function (e) {
    if (e.apiaryId) SEED_APIARY_BY_ID[e.id] = { id: e.apiaryId, name: e.apiaryName || '' };
  });

  /* Common beekeeping materials + prior gider titles (Turkish). */
  var SEED_MATERIALS = [
    'Şeker şurubu',
    'Polen ikamesi',
    'Varroa damlatma',
    'Organik asit seti',
    'Çerçeve teli + mum',
    'Maske / eldiven',
    'Kavanoz + etiket seti',
    'Yevmiye — yardımcı',
    'Yayla taşıma (nakliye)',
    'Yakıt',
    'Arılık yeri ücreti',
    'Arılık bakım malzemesi',
    'Fondan',
    'Petek temeli',
    'Kovan boyası'
  ];

  function normalizeMaterialName(name) {
    return String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function materialKey(name) {
    return normalizeMaterialName(name).toLocaleLowerCase('tr');
  }

  function mergeMaterialNames(lists) {
    var seen = {};
    var out = [];
    lists.forEach(function (list) {
      if (!list || !list.length) return;
      list.forEach(function (raw) {
        var name = normalizeMaterialName(raw);
        if (!name) return;
        var key = materialKey(name);
        if (seen[key]) return;
        seen[key] = true;
        out.push(name);
      });
    });
    out.sort(function (a, b) {
      return a.localeCompare(b, 'tr');
    });
    return out;
  }

  function titlesFromExpenses(list) {
    return (list || []).map(function (e) {
      return e && e.title;
    });
  }

  function loadMaterials() {
    var stored = readJson(MATERIALS_KEY);
    var custom = Array.isArray(stored) ? stored : [];
    var expenseTitles = titlesFromExpenses(loadExpenses());
    return mergeMaterialNames([SEED_MATERIALS, expenseTitles, custom]);
  }

  function saveMaterials(list) {
    if (!Array.isArray(list)) return loadMaterials();
    var cleaned = mergeMaterialNames([list]);
    /* Persist only names beyond seed defaults (custom + user-added). */
    var seedKeys = {};
    SEED_MATERIALS.forEach(function (n) {
      seedKeys[materialKey(n)] = true;
    });
    var custom = cleaned.filter(function (n) {
      return !seedKeys[materialKey(n)];
    });
    writeJson(MATERIALS_KEY, custom);
    return loadMaterials();
  }

  function addMaterial(name) {
    var clean = normalizeMaterialName(name);
    if (!clean) throw new Error('Malzeme adı gerekli.');
    if (clean.length > 80) clean = clean.slice(0, 80);
    var stored = readJson(MATERIALS_KEY);
    var custom = Array.isArray(stored) ? stored.slice() : [];
    var key = materialKey(clean);
    var exists = custom.some(function (n) {
      return materialKey(n) === key;
    });
    if (!exists) {
      var inSeed = SEED_MATERIALS.some(function (n) {
        return materialKey(n) === key;
      });
      var inExpenses = titlesFromExpenses(loadExpenses()).some(function (n) {
        return materialKey(n) === key;
      });
      if (!inSeed && !inExpenses) custom.push(clean);
      writeJson(MATERIALS_KEY, custom);
    }
    return loadMaterials();
  }

  function ensureMaterial(name) {
    try {
      return addMaterial(name);
    } catch (e) {
      return loadMaterials();
    }
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function todayIso() {
    var d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* ignore */ }
  }


  var GIDER_NAME_A1 = 'Kayaköy Ana Arılık';
  var GIDER_NAME_YANIK = 'Yanıkdağ Baluğundüzü Arılığı';

  function looksLikeYanikBalugName(s) {
    var lower = String(s || '').toLocaleLowerCase('tr');
    return lower.indexOf('yanıkdağ') !== -1 && (lower.indexOf('baluğundüzü') !== -1 || lower.indexOf('balığındüzü') !== -1);
  }

  function migrateExpenseApiaryNames(list) {
    var changed = false;
    var out = (list || []).map(function (e) {
      if (!e) return e;
      var n = String(e.apiaryName || '').trim();
      var id = String(e.apiaryId || '');
      var next = n;
      var nextId = id;
      if (id === 'a1' && looksLikeYanikBalugName(n)) next = GIDER_NAME_A1;
      else if (n === 'Yanıkdağ' || n === 'Yanıkdağ Arılığı' || n === 'Yanıkdağ Ana Arılık') next = GIDER_NAME_YANIK;
      else if (/^Yanıkdağ(\s|$)/i.test(n) && !looksLikeYanikBalugName(n) && n.toLocaleLowerCase('tr').indexOf('kayaköy') === -1) {
        next = GIDER_NAME_YANIK;
      }
      /* Duplicate Yanıkdağ Baluğundüzü expenses → seed a4 (prefer one apiary). */
      if (id !== 'a1' && id !== 'a4' && (looksLikeYanikBalugName(n) || looksLikeYanikBalugName(next))) {
        nextId = 'a4';
        next = GIDER_NAME_YANIK;
      } else if (id === 'a4' && looksLikeYanikBalugName(n) && n !== GIDER_NAME_YANIK) {
        next = GIDER_NAME_YANIK;
      }
      if (next === n && nextId === id) return e;
      changed = true;
      e.apiaryName = next;
      e.apiaryId = nextId;
      return e;
    });
    return { list: out, changed: changed };
  }

  /**
   * Remap expense apiaryIds (and Yanıkdağ-by-name orphans) onto target (default a4).
   * remappedIds: { oldId: 'a4', ... }. Also merges any non-a1 expense whose name
   * looks like Yanıkdağ Baluğundüzü onto a4.
   */
  function repointApiaryIds(remappedIds, target) {
    target = target || { id: 'a4', name: GIDER_NAME_YANIK };
    var targetId = String(target.id || 'a4');
    var targetName = target.name || GIDER_NAME_YANIK;
    remappedIds = remappedIds || {};
    var list = loadExpenses();
    var changed = false;
    list = list.map(function (e) {
      if (!e) return e;
      var id = String(e.apiaryId || '');
      var n = String(e.apiaryName || '').trim();
      var nextId = id;
      var nextName = n;
      if (remappedIds[id]) {
        nextId = String(remappedIds[id]);
        nextName = targetName;
      } else if (id !== 'a1' && id !== targetId && looksLikeYanikBalugName(n)) {
        nextId = targetId;
        nextName = targetName;
      } else if (id === targetId && looksLikeYanikBalugName(n) && n !== targetName) {
        nextName = targetName;
      }
      if (nextId === id && nextName === n) return e;
      changed = true;
      var copy = Object.assign({}, e, { apiaryId: nextId, apiaryName: nextName });
      return normalizeExpense(copy) || copy;
    });
    if (changed) saveExpenses(list);
    return changed;
  }

  function normalizeExpense(e) {
    if (!e || typeof e !== 'object') return null;
    var cat = String(e.category || 'diger');
    if (cat === 'fuel') cat = 'yakit';
    return {
      id: String(e.id || ('g' + Date.now())),
      title: String(e.title || '').trim() || 'Gider',
      category: cat,
      amount: Math.max(0, Number(e.amount) || 0),
      date: String(e.date || todayIso()),
      note: e.note != null ? String(e.note) : '',
      apiaryId: e.apiaryId != null ? String(e.apiaryId) : '',
      apiaryName: e.apiaryName != null ? String(e.apiaryName) : '',
      templateKey: e.templateKey != null ? String(e.templateKey) : '',
      transportMode: e.transportMode === 'nakliye' || e.transportMode === 'kendi_arac'
        ? e.transportMode
        : '',
      transportId: e.transportId != null ? String(e.transportId) : ''
    };
  }

  /** Old seeds may lack newer categories — inject one demo row each. */
  var ENSURE_DEMO_CATS = ['yakit', 'iscilik', 'ambalaj', 'yayla_kira'];

  function seedExpenseForCategory(catId) {
    for (var i = 0; i < SEED_EXPENSES.length; i++) {
      if (SEED_EXPENSES[i].category === catId) {
        return normalizeExpense(SEED_EXPENSES[i]);
      }
    }
    return null;
  }

  function ensureDemoCategoriesVisible(list) {
    var added = [];
    ENSURE_DEMO_CATS.forEach(function (catId) {
      var has = list.some(function (e) {
        return e && e.category === catId;
      });
      if (has) return;
      var seed = seedExpenseForCategory(catId);
      if (seed) added.push(seed);
    });
    if (!added.length) return list;
    list = list.concat(added);
    writeJson(STORAGE_KEY, list);

    var needYakitTransport = added.some(function (e) {
      return e.category === 'yakit';
    });
    if (needYakitTransport) {
      var transports = readJson(TRANSPORT_KEY);
      if (!Array.isArray(transports)) transports = [];
      var seedYakit = seedExpenseForCategory('yakit');
      var hasT = transports.some(function (t) {
        return t && (t.id === 't-seed-2' || (seedYakit && t.giderId === seedYakit.id));
      });
      if (!hasT) {
        for (var j = 0; j < SEED_TRANSPORTS.length; j++) {
          if (SEED_TRANSPORTS[j].id === 't-seed-2') {
            transports = transports.concat([SEED_TRANSPORTS[j]]);
            break;
          }
        }
        writeJson(TRANSPORT_KEY, transports);
      }
    }
    return list;
  }

  /** Backfill apiaryId on known demo rows that predate per-arılık linking. */
  function ensureApiaryLinks(list) {
    var changed = false;
    list = list.map(function (e) {
      if (!e) return e;
      if (e.apiaryId) return e;
      var hint = SEED_APIARY_BY_ID[e.id];
      if (!hint) return e;
      changed = true;
      e.apiaryId = hint.id;
      e.apiaryName = hint.name || e.apiaryName || '';
      return e;
    });
    if (changed) writeJson(STORAGE_KEY, list);
    return list;
  }

  function ensureSeedExpenseRows(list) {
    var byId = {};
    (list || []).forEach(function (e) {
      if (e && e.id) byId[String(e.id)] = true;
    });
    var added = false;
    var out = (list || []).slice();
    SEED_EXPENSES.forEach(function (seed) {
      if (byId[seed.id]) return;
      /* Only top-up rows for new demo apiaries a4/a5 (and any future seed ids). */
      if (seed.apiaryId !== 'a4' && seed.apiaryId !== 'a5') return;
      out.push(normalizeExpense(seed));
      added = true;
    });
    if (added) writeJson(STORAGE_KEY, out);
    return out;
  }

  function loadExpenses() {
    var parsed = readJson(STORAGE_KEY);
    if (Array.isArray(parsed) && parsed.length) {
      var list = ensureApiaryLinks(
        ensureDemoCategoriesVisible(parsed.map(normalizeExpense).filter(Boolean))
      );
      var mig = migrateExpenseApiaryNames(list);
      if (mig.changed) writeJson(STORAGE_KEY, mig.list);
      return ensureSeedExpenseRows(mig.list);
    }
    writeJson(STORAGE_KEY, SEED_EXPENSES);
    return SEED_EXPENSES.map(normalizeExpense);
  }

  function saveExpenses(list) {
    if (!Array.isArray(list)) return;
    writeJson(STORAGE_KEY, list.map(normalizeExpense).filter(Boolean));
  }

  function loadTransports() {
    var parsed = readJson(TRANSPORT_KEY);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
    var expenses = readJson(STORAGE_KEY);
    if (!expenses || !Array.isArray(expenses) || !expenses.length) {
      writeJson(TRANSPORT_KEY, SEED_TRANSPORTS);
      return SEED_TRANSPORTS.slice();
    }
    var hasSeedLink = expenses.some(function (e) {
      return e && (e.id === 'g7' || e.id === 'g9') && e.transportId;
    });
    if (hasSeedLink || !expenses.length) {
      writeJson(TRANSPORT_KEY, SEED_TRANSPORTS);
      return SEED_TRANSPORTS.slice();
    }
    writeJson(TRANSPORT_KEY, []);
    return [];
  }

  function saveTransports(list) {
    if (!Array.isArray(list)) return;
    writeJson(TRANSPORT_KEY, list);
  }

  function syncLinkedTransport(gider) {
    if (!gider || !gider.transportId) return;
    var transports = loadTransports();
    var found = false;
    transports = transports.map(function (t) {
      if (!t || String(t.id) !== String(gider.transportId)) return t;
      found = true;
      return {
        id: t.id,
        mode: gider.transportMode || t.mode,
        date: gider.date,
        amount: gider.amount,
        giderId: gider.id,
        apiaryId: gider.apiaryId,
        apiaryName: gider.apiaryName,
        title: gider.title,
        note: gider.note
      };
    });
    if (found) saveTransports(transports);
  }

  function removeLinkedTransport(gider) {
    if (!gider || !gider.transportId) return;
    var tid = String(gider.transportId);
    var transports = loadTransports().filter(function (t) {
      return t && String(t.id) !== tid && String(t.giderId) !== String(gider.id);
    });
    saveTransports(transports);
  }

  /**
   * Record a taşıma event and linked gider.
   * mode: 'nakliye' | 'kendi_arac'
   * kendi_arac → category Yakıt (zorunlu tutar)
   * nakliye → category Nakliye
   */
  function recordTransport(input) {
    var mode = input && input.mode === 'kendi_arac' ? 'kendi_arac' : 'nakliye';
    var amount = Number(input && input.amount);
    if (!(amount > 0)) {
      throw new Error(
        mode === 'kendi_arac'
          ? 'Kendi araçta yakıt tutarı zorunludur.'
          : 'Nakliye tutarı girilmeli.'
      );
    }
    var date = String((input && input.date) || todayIso());
    var note = String((input && input.note) || '').trim();
    var apiaryId = input && input.apiaryId != null ? String(input.apiaryId) : '';
    var apiaryName = input && input.apiaryName != null ? String(input.apiaryName) : '';
    if (!apiaryId) {
      throw new Error('Arılık seçilmeli.');
    }
    var title = String((input && input.title) || '').trim();
    if (!title) {
      title =
        mode === 'kendi_arac'
          ? (apiaryName ? 'Yakıt — ' + apiaryName : 'Yakıt masrafı (kendi araç)')
          : (apiaryName ? 'Nakliye — ' + apiaryName : 'Nakliye');
    }

    var transportId = 't' + Date.now();
    var giderId = 'g' + Date.now();
    var category = mode === 'kendi_arac' ? 'yakit' : 'nakliye';

    var gider = normalizeExpense({
      id: giderId,
      title: title,
      category: category,
      amount: amount,
      date: date,
      note: note || (mode === 'kendi_arac' ? 'Kendi araç yakıt' : 'Nakliye'),
      apiaryId: apiaryId,
      apiaryName: apiaryName,
      transportMode: mode,
      transportId: transportId
    });

    var transport = {
      id: transportId,
      mode: mode,
      date: date,
      amount: amount,
      giderId: giderId,
      apiaryId: apiaryId,
      apiaryName: apiaryName,
      title: title,
      note: note
    };

    var expenses = loadExpenses();
    expenses.push(gider);
    saveExpenses(expenses);
    ensureMaterial(gider.title);

    var transports = loadTransports();
    transports.push(transport);
    saveTransports(transports);

    return { gider: gider, transport: transport };
  }

  function resolveApiary(input) {
    var apiaryId = input && input.apiaryId != null ? String(input.apiaryId) : '';
    var apiaryName = input && input.apiaryName != null ? String(input.apiaryName) : '';
    if (!apiaryId) {
      throw new Error('Arılık seçilmeli.');
    }
    return { apiaryId: apiaryId, apiaryName: apiaryName };
  }

  function addExpense(input) {
    var mode = input && input.transportMode;
    if (mode === 'nakliye' || mode === 'kendi_arac') {
      return recordTransport({
        mode: mode,
        amount: input.amount,
        date: input.date,
        note: input.note,
        apiaryId: input.apiaryId,
        apiaryName: input.apiaryName,
        title: input.title
      }).gider;
    }
    var ap = resolveApiary(input);
    var expenses = loadExpenses();
    var gider = normalizeExpense({
      id: 'g' + Date.now(),
      title: input && input.title,
      category: input && input.category,
      amount: input && input.amount,
      date: input && input.date,
      note: input && input.note,
      apiaryId: ap.apiaryId,
      apiaryName: ap.apiaryName
    });
    if (!(gider.amount > 0) || !gider.title) {
      throw new Error('Başlık ve tutar gerekli.');
    }
    expenses.push(gider);
    saveExpenses(expenses);
    ensureMaterial(gider.title);
    return gider;
  }

  function updateExpense(id, input) {
    var key = String(id || '');
    if (!key) throw new Error('Gider bulunamadı.');
    var expenses = loadExpenses();
    var idx = -1;
    for (var i = 0; i < expenses.length; i++) {
      if (expenses[i] && expenses[i].id === key) {
        idx = i;
        break;
      }
    }
    if (idx < 0) throw new Error('Gider bulunamadı.');

    var prev = expenses[idx];
    var mode = input && input.transportMode;
    if (mode !== 'nakliye' && mode !== 'kendi_arac') mode = '';
    var ap = resolveApiary(input);
    var category = input && input.category;
    if (mode === 'kendi_arac') category = 'yakit';
    else if (mode === 'nakliye') category = 'nakliye';

    var gider = normalizeExpense({
      id: prev.id,
      title: input && input.title,
      category: category || prev.category,
      amount: input && input.amount,
      date: input && input.date,
      note: input && input.note,
      apiaryId: ap.apiaryId,
      apiaryName: ap.apiaryName,
      transportMode: mode,
      transportId: prev.transportId || ''
    });
    if (!(gider.amount > 0) || !gider.title) {
      throw new Error('Başlık ve tutar gerekli.');
    }
    ensureMaterial(gider.title);

    if (mode && !gider.transportId) {
      gider.transportId = 't' + Date.now();
      var transports = loadTransports();
      transports.push({
        id: gider.transportId,
        mode: mode,
        date: gider.date,
        amount: gider.amount,
        giderId: gider.id,
        apiaryId: gider.apiaryId,
        apiaryName: gider.apiaryName,
        title: gider.title,
        note: gider.note
      });
      saveTransports(transports);
    } else if (!mode && prev.transportId) {
      removeLinkedTransport(prev);
      gider.transportId = '';
    } else if (mode && gider.transportId) {
      syncLinkedTransport(gider);
    }

    expenses[idx] = gider;
    saveExpenses(expenses);
    return gider;
  }

  function deleteExpense(id) {
    var key = String(id || '');
    if (!key) return false;
    var expenses = loadExpenses();
    var removed = null;
    var next = expenses.filter(function (e) {
      if (e && e.id === key) {
        removed = e;
        return false;
      }
      return true;
    });
    if (!removed) return false;
    removeLinkedTransport(removed);
    saveExpenses(next);
    return true;
  }

  function expensesForApiary(apiaryId) {
    var key = String(apiaryId || '');
    return loadExpenses()
      .filter(function (e) {
        if (!key || key === 'all') return true;
        if (key === 'none') return !e.apiaryId;
        return String(e.apiaryId) === key;
      })
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  }

  function totalsByApiary(list) {
    var rows = list || loadExpenses();
    var map = {};
    rows.forEach(function (e) {
      var id = e.apiaryId || 'none';
      if (!map[id]) {
        map[id] = {
          apiaryId: id,
          apiaryName: e.apiaryName || (id === 'none' ? 'Atanmamış' : id),
          amount: 0,
          count: 0
        };
      }
      if (e.apiaryName && id !== 'none') map[id].apiaryName = e.apiaryName;
      map[id].amount += Number(e.amount) || 0;
      map[id].count += 1;
    });
    return Object.keys(map)
      .map(function (k) { return map[k]; })
      .sort(function (a, b) {
        return b.amount - a.amount;
      });
  }

  function transportsForApiary(apiaryId) {
    var key = String(apiaryId || '');
    return loadTransports()
      .filter(function (t) {
        return !key || String(t.apiaryId) === key;
      })
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
  }

  function hiveCountOf(apiary) {
    return Math.max(0, Number(apiary && apiary.hiveCount) || 0);
  }

  function apiaryDisplayName(apiary) {
    if (!apiary) return '';
    return String(apiary.name || apiary.place || apiary.id || '').trim();
  }

  /**
   * Split total ₺ by hive counts (largest-remainder so parts sum to total).
   * Apiaries with 0 kovan are skipped. If all zero, equal split among all given.
   */
  function allocateByHiveCounts(totalAmount, apiaries) {
    var total = Math.max(0, Math.round(Number(totalAmount) || 0));
    var list = Array.isArray(apiaries) ? apiaries.filter(Boolean) : [];
    if (!list.length || !(total > 0)) return [];

    var weights = list.map(function (a) {
      return { apiary: a, hives: hiveCountOf(a) };
    });
    var hiveSum = weights.reduce(function (s, w) { return s + w.hives; }, 0);
    if (hiveSum <= 0) {
      weights.forEach(function (w) { w.hives = 1; });
      hiveSum = weights.length;
    }

    var parts = weights.map(function (w) {
      var exact = (total * w.hives) / hiveSum;
      var floor = Math.floor(exact);
      return {
        apiaryId: String(w.apiary.id),
        apiaryName: apiaryDisplayName(w.apiary),
        hiveCount: hiveCountOf(w.apiary),
        weight: w.hives,
        amount: floor,
        frac: exact - floor
      };
    });

    var used = parts.reduce(function (s, p) { return s + p.amount; }, 0);
    var rem = total - used;
    parts
      .slice()
      .sort(function (a, b) {
        if (b.frac !== a.frac) return b.frac - a.frac;
        return String(a.apiaryId).localeCompare(String(b.apiaryId));
      })
      .forEach(function (p, i) {
        if (i < rem) p.amount += 1;
      });

    return parts
      .filter(function (p) { return p.amount > 0; })
      .map(function (p) {
        return {
          apiaryId: p.apiaryId,
          apiaryName: p.apiaryName,
          hiveCount: p.hiveCount,
          amount: p.amount,
          share: p.weight + '/' + hiveSum
        };
      });
  }

  function expensesForMaterial(title, list) {
    var key = materialKey(title);
    if (!key) return [];
    return (list || loadExpenses()).filter(function (e) {
      return e && materialKey(e.title) === key;
    });
  }

  /**
   * Materials present on some arılıklar but missing on others (with hiveCount).
   * Uses latest/largest expense as source for proportional fill.
   */
  function findMissingMaterialGaps(apiaries) {
    var list = Array.isArray(apiaries) ? apiaries.filter(Boolean) : [];
    if (list.length < 2) return [];
    var expenses = loadExpenses();
    var byMaterial = {};
    expenses.forEach(function (e) {
      if (!e || !e.title || e.transportMode) return;
      var key = materialKey(e.title);
      if (!key) return;
      if (!byMaterial[key]) {
        byMaterial[key] = { title: normalizeMaterialName(e.title), items: [] };
      }
      byMaterial[key].items.push(e);
    });

    var gaps = [];
    Object.keys(byMaterial).forEach(function (key) {
      var pack = byMaterial[key];
      var presentIds = {};
      pack.items.forEach(function (e) {
        if (e.apiaryId) presentIds[String(e.apiaryId)] = true;
      });
      var present = list.filter(function (a) { return presentIds[String(a.id)]; });
      var missing = list.filter(function (a) {
        return !presentIds[String(a.id)] && hiveCountOf(a) > 0;
      });
      if (!present.length || !missing.length) return;

      var source = pack.items.slice().sort(function (a, b) {
        var amt = (Number(b.amount) || 0) - (Number(a.amount) || 0);
        if (amt) return amt;
        return String(b.date).localeCompare(String(a.date));
      })[0];

      gaps.push({
        title: pack.title,
        category: source.category || 'diger',
        sourceExpense: source,
        present: present.map(function (a) {
          return {
            apiaryId: String(a.id),
            apiaryName: apiaryDisplayName(a),
            hiveCount: hiveCountOf(a)
          };
        }),
        missing: missing.map(function (a) {
          return {
            apiaryId: String(a.id),
            apiaryName: apiaryDisplayName(a),
            hiveCount: hiveCountOf(a)
          };
        })
      });
    });

    gaps.sort(function (a, b) {
      return a.title.localeCompare(b.title, 'tr');
    });
    return gaps;
  }

  function proportionalAmountFromSource(sourceAmount, sourceHives, targetHives) {
    var srcAmt = Math.max(0, Number(sourceAmount) || 0);
    var srcH = Math.max(0, Number(sourceHives) || 0);
    var tgtH = Math.max(0, Number(targetHives) || 0);
    if (!(srcAmt > 0) || !(tgtH > 0)) return 0;
    if (srcH <= 0) return Math.max(1, Math.round(srcAmt));
    return Math.max(1, Math.round((srcAmt * tgtH) / srcH));
  }

  /**
   * Add one shared material as proportional gider rows across apiaries.
   * `amount` is the TOTAL; split by hive counts.
   */
  function addDistributedExpense(input, apiaries) {
    var mode = input && input.transportMode;
    if (mode === 'nakliye' || mode === 'kendi_arac') {
      throw new Error('Taşıma gideri kovan oranına dağıtılamaz.');
    }
    var title = normalizeMaterialName(input && input.title);
    var amount = Number(input && input.amount);
    if (!title || !(amount > 0)) {
      throw new Error('Başlık ve tutar gerekli.');
    }
    var targets = Array.isArray(apiaries) ? apiaries.filter(Boolean) : [];
    if (targets.length < 2) {
      throw new Error('Dağıtım için en az iki arılık gerekir.');
    }
    var parts = allocateByHiveCounts(amount, targets);
    if (!parts.length) {
      throw new Error('Dağıtılacak arılık / kovan bulunamadı.');
    }

    var date = String((input && input.date) || todayIso());
    var category = (input && input.category) || 'diger';
    var baseNote = String((input && input.note) || '').trim();
    var expenses = loadExpenses();
    var created = [];
    var stamp = Date.now();

    parts.forEach(function (part, i) {
      var noteParts = [];
      if (baseNote) noteParts.push(baseNote);
      noteParts.push(
        'Kovan oranına dağıtıldı (' +
          part.hiveCount +
          ' kovan · pay ' +
          part.share +
          ')'
      );
      var gider = normalizeExpense({
        id: 'g' + stamp + '-' + i,
        title: title,
        category: category,
        amount: part.amount,
        date: date,
        note: noteParts.join(' · '),
        apiaryId: part.apiaryId,
        apiaryName: part.apiaryName
      });
      expenses.push(gider);
      created.push(gider);
    });

    saveExpenses(expenses);
    ensureMaterial(title);
    return created;
  }

  /**
   * Create proportional records for apiaries missing a material that others have.
   */
  function fillMissingMaterialShares(gap, apiaries) {
    if (!gap || !gap.sourceExpense || !gap.missing || !gap.missing.length) {
      return [];
    }
    var source = gap.sourceExpense;
    var apiaryMap = {};
    (apiaries || []).forEach(function (a) {
      if (a && a.id) apiaryMap[String(a.id)] = a;
    });
    var sourceAp = apiaryMap[String(source.apiaryId)] || null;
    var sourceHives = sourceAp ? hiveCountOf(sourceAp) : 0;
    if (sourceHives <= 0 && gap.present && gap.present[0]) {
      sourceHives = Number(gap.present[0].hiveCount) || 0;
    }

    var expenses = loadExpenses();
    var existingKeys = {};
    expenses.forEach(function (e) {
      if (!e) return;
      existingKeys[materialKey(e.title) + '::' + String(e.apiaryId || '')] = true;
    });

    var created = [];
    var stamp = Date.now();
    gap.missing.forEach(function (miss, i) {
      var id = String(miss.apiaryId);
      var key = materialKey(gap.title) + '::' + id;
      if (existingKeys[key]) return;
      var ap = apiaryMap[id];
      var hives = ap ? hiveCountOf(ap) : Number(miss.hiveCount) || 0;
      var amt = proportionalAmountFromSource(source.amount, sourceHives, hives);
      if (!(amt > 0)) return;
      var gider = normalizeExpense({
        id: 'g' + stamp + '-m' + i,
        title: normalizeMaterialName(gap.title || source.title),
        category: gap.category || source.category || 'diger',
        amount: amt,
        date: source.date || todayIso(),
        note:
          'Eksik malzeme · kovan oranına eklendi (' +
          hives +
          ' kovan, kaynak ' +
          (source.apiaryName || source.apiaryId || '') +
          ')',
        apiaryId: id,
        apiaryName: (ap && apiaryDisplayName(ap)) || miss.apiaryName || id
      });
      expenses.push(gider);
      existingKeys[key] = true;
      created.push(gider);
    });

    if (created.length) {
      saveExpenses(expenses);
      ensureMaterial(gap.title || source.title);
    }
    return created;
  }


  function isProtectedExpense(e) {
    if (!e) return true;
    if (e.transportMode === 'nakliye' || e.transportMode === 'kendi_arac') return true;
    if (e.transportId) return true;
    return false;
  }

  function matchKalemTemplate(e) {
    if (!e) return null;
    var i;
    if (e.templateKey) {
      for (i = 0; i < DEFAULT_KALEM_TEMPLATES.length; i++) {
        if (DEFAULT_KALEM_TEMPLATES[i].key === String(e.templateKey)) {
          return DEFAULT_KALEM_TEMPLATES[i];
        }
      }
    }
    var mk = materialKey(e.title);
    if (!mk) return null;
    for (i = 0; i < DEFAULT_KALEM_TEMPLATES.length; i++) {
      var t = DEFAULT_KALEM_TEMPLATES[i];
      if (mk === materialKey(t.title)) return t;
      var aliases = t.aliases || [];
      for (var a = 0; a < aliases.length; a++) {
        var al = materialKey(aliases[a]);
        if (!al) continue;
        if (mk === al || mk.indexOf(al) === 0 || al.indexOf(mk) === 0) return t;
      }
    }
    return null;
  }

  function expectedKalemAmount(t, hives) {
    return Math.max(1, Math.round(Number(t.perHive) * Math.max(0, Number(hives) || 0)));
  }

  /**
   * Tek arılık: şablon × hiveCount ile karşılaştır.
   * - Eksik kalem → ekle
   * - Fazla tutar / mükerrer şablon satırı → beklenen tutara indir / tekilleştir
   * - Taşıma bağlı ve kullanıcı özel (şablona uymayan) satırlar korunur
   */
  function reconcileApiaryExpenses(apiary) {
    var empty = { added: [], updated: [], removed: [], expectedTotal: 0 };
    var hives = hiveCountOf(apiary);
    if (!apiary || apiary.id == null || !(hives > 0)) return empty;
    var apiaryId = String(apiary.id);
    var name = apiaryDisplayName(apiary);
    var expenses = loadExpenses();
    var result = { added: [], updated: [], removed: [], expectedTotal: 0 };

    DEFAULT_KALEM_TEMPLATES.forEach(function (t) {
      result.expectedTotal += expectedKalemAmount(t, hives);
    });

    var byKey = {};
    expenses.forEach(function (e) {
      if (String(e.apiaryId || '') !== apiaryId) return;
      if (isProtectedExpense(e)) return;
      var t = matchKalemTemplate(e);
      if (!t) return;
      if (!byKey[t.key]) byKey[t.key] = [];
      byKey[t.key].push(e);
    });

    var removeIds = {};
    var patchById = {};

    DEFAULT_KALEM_TEMPLATES.forEach(function (t) {
      var expected = expectedKalemAmount(t, hives);
      var group = (byKey[t.key] || []).slice();
      if (!group.length) return;

      group.sort(function (a, b) {
        var ak = a.templateKey ? 1 : 0;
        var bk = b.templateKey ? 1 : 0;
        if (bk !== ak) return bk - ak;
        var ad = String(a.id || '').indexOf('g-tpl-') === 0 ? 1 : 0;
        var bd = String(b.id || '').indexOf('g-tpl-') === 0 ? 1 : 0;
        if (bd !== ad) return bd - ad;
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      });

      var primary = group[0];
      for (var i = 1; i < group.length; i++) {
        removeIds[String(group[i].id)] = true;
        result.removed.push(group[i]);
      }

      var amt = Number(primary.amount) || 0;
      var needPatch = false;
      var patch = {};
      if (amt !== expected) {
        patch.amount = expected;
        needPatch = true;
      }
      if (String(primary.templateKey || '') !== t.key) {
        patch.templateKey = t.key;
        needPatch = true;
      }
      if (materialKey(primary.title) !== materialKey(t.title)) {
        patch.title = t.title;
        needPatch = true;
      }
      if (primary.category !== t.category) {
        patch.category = t.category;
        needPatch = true;
      }
      var stdNote = hives + ' kovan × ₺' + t.perHive + ' (standart kalem)';
      var note = String(primary.note || '');
      if (!note || note.indexOf('standart kalem') >= 0 || note.indexOf('kovan ×') >= 0) {
        if (note !== stdNote) {
          patch.note = stdNote;
          needPatch = true;
        }
      }
      if (name && primary.apiaryName !== name) {
        patch.apiaryName = name;
        needPatch = true;
      }
      if (needPatch) patchById[String(primary.id)] = patch;
    });

    var next = [];
    expenses.forEach(function (e) {
      var id = String(e.id || '');
      if (removeIds[id]) return;
      if (patchById[id] && String(e.apiaryId || '') === apiaryId) {
        var merged = normalizeExpense(Object.assign({}, e, patchById[id]));
        next.push(merged);
        result.updated.push(merged);
      } else {
        next.push(e);
      }
    });

    var haveKeys = {};
    next.forEach(function (e) {
      if (String(e.apiaryId || '') !== apiaryId) return;
      if (isProtectedExpense(e)) return;
      var t = matchKalemTemplate(e);
      if (t) haveKeys[t.key] = true;
    });

    DEFAULT_KALEM_TEMPLATES.forEach(function (t) {
      if (haveKeys[t.key]) return;
      var amount = expectedKalemAmount(t, hives);
      var gider = normalizeExpense({
        id: 'g-tpl-' + apiaryId + '-' + t.key,
        title: t.title,
        category: t.category,
        amount: amount,
        date: todayIso(),
        note: hives + ' kovan × ₺' + t.perHive + ' (standart kalem)',
        apiaryId: apiaryId,
        apiaryName: name,
        templateKey: t.key
      });
      if (!gider) return;
      next.push(gider);
      result.added.push(gider);
      haveKeys[t.key] = true;
    });

    if (result.added.length || result.updated.length || result.removed.length) {
      saveExpenses(next);
      result.added.forEach(function (g) { ensureMaterial(g.title); });
    }
    return result;
  }

  function reconcileAllApiaries(apiaries) {
    var list = Array.isArray(apiaries) ? apiaries : [];
    var summary = { added: 0, updated: 0, removed: 0, apiaries: 0 };
    list.forEach(function (a) {
      if (!a || !(hiveCountOf(a) > 0)) return;
      var r = reconcileApiaryExpenses(a);
      if (r.added.length || r.updated.length || r.removed.length) summary.apiaries += 1;
      summary.added += r.added.length;
      summary.updated += r.updated.length;
      summary.removed += r.removed.length;
    });
    return summary;
  }

  /** Geriye dönük: eksikleri ekle (reconcile ile aynı, sadece added döner). */
  function ensureDefaultExpensesForApiary(apiary) {
    return reconcileApiaryExpenses(apiary).added;
  }

  function ensureDefaultExpensesForAll(apiaries) {
    var list = Array.isArray(apiaries) ? apiaries : [];
    var all = [];
    list.forEach(function (a) {
      all = all.concat(ensureDefaultExpensesForApiary(a));
    });
    return all;
  }

  Object.defineProperty(global, 'SuperAriGider', {
    configurable: true,
    enumerable: true,
    value: {
      STORAGE_KEY: STORAGE_KEY,
      TRANSPORT_KEY: TRANSPORT_KEY,
      MATERIALS_KEY: MATERIALS_KEY,
      CATEGORIES: CATEGORIES,
      SEED_EXPENSES: SEED_EXPENSES,
      SEED_MATERIALS: SEED_MATERIALS,
      catById: catById,
      todayIso: todayIso,
      loadExpenses: loadExpenses,
      saveExpenses: saveExpenses,
      loadTransports: loadTransports,
      saveTransports: saveTransports,
      loadMaterials: loadMaterials,
      saveMaterials: saveMaterials,
      addMaterial: addMaterial,
      ensureMaterial: ensureMaterial,
      recordTransport: recordTransport,
      addExpense: addExpense,
      updateExpense: updateExpense,
      deleteExpense: deleteExpense,
      expensesForApiary: expensesForApiary,
      totalsByApiary: totalsByApiary,
      transportsForApiary: transportsForApiary,
      hiveCountOf: hiveCountOf,
      allocateByHiveCounts: allocateByHiveCounts,
      expensesForMaterial: expensesForMaterial,
      findMissingMaterialGaps: findMissingMaterialGaps,
      addDistributedExpense: addDistributedExpense,
      fillMissingMaterialShares: fillMissingMaterialShares,
      DEFAULT_KALEM_TEMPLATES: DEFAULT_KALEM_TEMPLATES,
      matchKalemTemplate: matchKalemTemplate,
      reconcileApiaryExpenses: reconcileApiaryExpenses,
      reconcileAllApiaries: reconcileAllApiaries,
      ensureDefaultExpensesForApiary: ensureDefaultExpensesForApiary,
      ensureDefaultExpensesForAll: ensureDefaultExpensesForAll,
      repointApiaryIds: repointApiaryIds,
      looksLikeYanikBalugName: looksLikeYanikBalugName
    }
  });
})(window);
