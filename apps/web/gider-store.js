/**
 * Shared Giderler + taşıma kaydı (localStorage).
 * Nakliye = üçüncü taraf; Kendi araç = zorunlu Yakıt gideri.
 * Her gider bir arılığa bağlıdır (apiaryId).
 */
(function (global) {
  var STORAGE_KEY = 'superari.giderler.v1';
  var TRANSPORT_KEY = 'superari.tasimalar.v1';
  var MATERIALS_KEY = 'superari.malzemeler.v1';

  /* Soft Hardal-warm palette — muted (no loud green/red/purple). */
  var CATEGORIES = [
    { id: 'yem', label: 'Yem', color: '#c9a84a' },
    { id: 'ilac', label: 'İlaç', color: '#c4887a' },
    { id: 'ekipman', label: 'Ekipman', color: '#8a97a8' },
    { id: 'iscilik', label: 'İşçilik', color: '#b8957a' },
    { id: 'ambalaj', label: 'Ambalaj', color: '#8a9e96' },
    { id: 'nakliye', label: 'Nakliye', color: '#8f9b72' },
    { id: 'yakit', label: 'Yakıt', color: '#c48a55' },
    { id: 'yayla_kira', label: 'Yayla/kira', color: '#8a9eab' },
    { id: 'diger', label: 'Diğer', color: '#9a8b7a' }
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

  function loadExpenses() {
    var parsed = readJson(STORAGE_KEY);
    if (Array.isArray(parsed) && parsed.length) {
      return ensureApiaryLinks(
        ensureDemoCategoriesVisible(parsed.map(normalizeExpense).filter(Boolean))
      );
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
      transportsForApiary: transportsForApiary
    }
  });
})(window);
