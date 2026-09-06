/**
 * Giriş kapısı — çoklu sensör analizi + otomatik aç-kapa.
 * Tartı, IR, titreşim, sıcaklık, nem, ses, hava ve koloni skorları birlikte değerlendirilir.
 */

const {
  SENSOR,
  SCORE,
  WEATHER,
  RISK,
  SWARM,
  SWARM_DROP_6H_KG,
  DISEASE,
} = require("../../../../packages/shared/constants");

/** @typedef {'acik'|'orta'|'dar'|'kapali'} GatePosition */

const LABELS = {
  acik: "Açık (geniş)",
  orta: "Orta",
  dar: "Dar (koruma)",
  kapali: "Kapalı (minimal)",
};

const ORDER = { kapali: 0, dar: 1, orta: 2, acik: 3 };

/** Hipotez → giriş hedefi */
const HEDEF_MAP = {
  tasima: "kapali",
  fiziksel_hasar: "dar",
  yagma: "dar",
  kg_dusus: "dar",
  pestisit: "dar",
  don: "dar",
  zayif: "dar",
  sonbahar_gece: "dar",
  ogul: "acik",
  sicak: "acik",
  trafik: "acik",
  rutin: "orta",
};

/** Hipotez → öncelik (1 acil) */
const ONCELIK_MAP = {
  tasima: 1,
  fiziksel_hasar: 1,
  yagma: 1,
  kg_dusus: 2,
  pestisit: 1,
  don: 2,
  zayif: 2,
  ogul: 2,
  sicak: 3,
  trafik: 4,
  sonbahar_gece: 3,
  rutin: 5,
};

const HIPOTEZ_LABEL = {
  tasima: "Taşıma",
  fiziksel_hasar: "Fiziksel darbe / devrilme",
  yagma: "Yağmacılık",
  kg_dusus: "Tartı kaybı (yağma?)",
  pestisit: "Pestisit / ilaçlama",
  don: "Soğuk / don",
  zayif: "Zayıf koloni",
  ogul: "Oğul / kalabalık",
  sicak: "Sıcaklık stresi",
  trafik: "Yoğun uçuş",
  sonbahar_gece: "Sonbahar gecesi",
  rutin: "Rutin",
};

const YAPILACAKLAR = {
  tasima: [
    { oncelik: 1, ne: "Girişi tamamen kapat veya taşıma kelepçesini tak", neZaman: "hemen" },
    { oncelik: 1, ne: "Kovanı sabitle; titreşim sensörünü izle", neZaman: "taşıma öncesi" },
    { oncelik: 2, ne: "Varışta otomatik moda al; 1 saat sonra girişi kontrol et", neZaman: "varışta" },
  ],
  fiziksel_hasar: [
    { oncelik: 1, ne: "Kovan devrilmiş mi / ayı-tilki hasarı var mı kontrol et", neZaman: "hemen" },
    { oncelik: 1, ne: "Platform dengesini düzelt; köşe tartıları eşitle", neZaman: "hemen" },
    { oncelik: 2, ne: "Girişi daralt; arılar streste — acele açma", neZaman: "stabil olunca" },
  ],
  yagma: [
    { oncelik: 1, ne: "Girişi daralt (sistem hedefi: dar)", neZaman: "hemen" },
    { oncelik: 1, ne: "Önünde ölü arı, sarı arı veya eşek arısı var mı bak", neZaman: "bugün" },
    { oncelik: 2, ne: "Kovan kokusu sızıyorsa giriş bandını ve çatlakları kapat", neZaman: "bugün" },
    { oncelik: 2, ne: "Zayıfsa besle; komşu kovanları da kontrol et", neZaman: "bu hafta" },
  ],
  kg_dusus: [
    { oncelik: 1, ne: "Tartı + IR birlikte oku — oğul mu yağma mı ayır", neZaman: "hemen" },
    { oncelik: 1, ne: "Oğul değilse girişi daralt; bal hırsızlığı ara", neZaman: "bugün" },
    { oncelik: 2, ne: "Akşamüstü tekrar tartı kaydı al", neZaman: "akşam" },
  ],
  pestisit: [
    { oncelik: 1, ne: "Girişi dar tut; öğlen uçuşu kısıtla", neZaman: "hemen" },
    { oncelik: 1, ne: "Önünde anormal ölü arı var mı say", neZaman: "24 saat" },
    { oncelik: 2, ne: "İlaçlama takvimini not et", neZaman: "plan" },
  ],
  don: [
    { oncelik: 2, ne: "Giriş daraltıcıyı kış aralığına al", neZaman: "bugün" },
    { oncelik: 2, ne: "Üst yalıtım ve rüzgâr tarafını kontrol et", neZaman: "bugün" },
    { oncelik: 2, ne: "İç sıcaklık + dış hava birlikte — besleme gerekir mi bak", neZaman: "gerekirse" },
  ],
  zayif: [
    { oncelik: 2, ne: "Girişi daralt — zayıf kovan savunmasız", neZaman: "bugün" },
    { oncelik: 2, ne: "Tartı + IR + sağlık skoru — besleme / ana kontrolü", neZaman: "bu hafta" },
    { oncelik: 3, ne: "Varroa ve hastalık muayenesi", neZaman: "bu hafta" },
  ],
  ogul: [
    { oncelik: 1, ne: "Girişi genişlet; tartı + IR kalabalık gösteriyor", neZaman: "hemen" },
    { oncelik: 1, ne: "Süper ekle veya kat böl — oğul önleme", neZaman: "48 saat" },
    { oncelik: 2, ne: "Oğul hücresi ve ana kontrolü", neZaman: "bugün" },
  ],
  sicak: [
    { oncelik: 2, ne: "Giriş açık + gölge; iç/dış sıcaklık birlikte izle", neZaman: "bugün" },
    { oncelik: 2, ne: "Üst havalandırmayı aç", neZaman: "sıcak günler" },
    { oncelik: 3, ne: "Su kaynağı kontrol et", neZaman: "gerekirse" },
  ],
  trafik: [
    { oncelik: 4, ne: "IR yoğun — girişi geniş tut", neZaman: "sezon" },
    { oncelik: 4, ne: "Tıkanma yoksa rutin izle", neZaman: "haftalık" },
  ],
  sonbahar_gece: [
    { oncelik: 2, ne: "Akşam girişi daralt — titreşim + mevsim", neZaman: "akşam" },
    { oncelik: 3, ne: "Sabah trafik artınca biraz aç", neZaman: "sabah" },
  ],
  rutin: [
    { oncelik: 5, ne: "Sensörler dengeli — otomatik mod yeterli", neZaman: "haftalık" },
  ],
};

const HEDEF_EK = {
  acik: [{ oncelik: 3, ne: "Giriş daraltıcıyı geniş konuma getir", neZaman: "şimdi" }],
  orta: [{ oncelik: 4, ne: "Girişi orta aralığa ayarla", neZaman: "gerekirse" }],
  dar: [{ oncelik: 2, ne: "Giriş daraltıcıyı dar konuma getir", neZaman: "şimdi" }],
  kapali: [{ oncelik: 1, ne: "Girişi kapat veya minimal delik bırak", neZaman: "hemen" }],
};

function cornerImbalance(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length < 4) return 0;
  return Math.max(...cornerKg) - Math.min(...cornerKg);
}

function isRaining(weather) {
  return (
    (weather?.precipMm ?? 0) >= WEATHER.PRECIP_MM ||
    weather?.condition === "yagmur"
  );
}

/**
 * Tüm sensörlerden hipotez skorları üret.
 */
function fuseSensorEvidence(reading, colony, weather, meta) {
  const traffic = colony?.middayTraffic || { samples: 0, beeOut: 0, beeIn: 0 };
  const raining = isRaining(weather);
  const drop6h = colony?.weightDrop6hKg;
  const drop24h = colony?.weightDrop24hKg;
  const imb = cornerImbalance(reading?.cornerKg);
  const hipotezler = {};
  const sensorler = [];

  function bump(key, pts, destek) {
    if (!hipotezler[key]) hipotezler[key] = { skor: 0, destek: [], celiski: [] };
    hipotezler[key].skor += pts;
    if (destek) hipotezler[key].destek.push(destek);
  }
  function celis(key, note) {
    if (!hipotezler[key]) hipotezler[key] = { skor: 0, destek: [], celiski: [] };
    hipotezler[key].celiski.push(note);
  }

  // —— Titreşim ——
  const vib = reading?.vibration ?? 0;
  if (vib >= SENSOR.VIBRATION_HIGH) {
    sensorler.push({
      sensor: "titresim",
      deger: vib,
      durum: "yuksek",
      yorum: "Kavga, yağma veya fiziksel darbe",
    });
    bump("yagma", 28, `Titreşim ${vib} — giriş kavgası / yağma`);
    bump("fiziksel_hasar", 18, `Titreşim ${vib} — darbe veya devrilme`);
  } else if (vib >= RISK.ROBBING_VIBRATION_MIN) {
    sensorler.push({
      sensor: "titresim",
      deger: vib,
      durum: "orta",
      yorum: "Artmış aktivite",
    });
    bump("yagma", 12, `Titreşim ${vib} — izle`);
  } else {
    sensorler.push({
      sensor: "titresim",
      deger: vib,
      durum: "normal",
      yorum: "Sakin",
    });
  }

  // —— Tartı ——
  if (drop6h != null && drop6h <= SWARM_DROP_6H_KG) {
    sensorler.push({
      sensor: "tarti",
      deger: `${drop6h} kg / 6s`,
      durum: "ani_dusus",
      yorum: "Oğul düşüşü eşiği",
    });
    bump("ogul", 45, `6 saatte ${drop6h} kg — oğul`);
    celis("yagma", "Ani düşüş — oğul; yağma değil");
  } else if (drop6h != null && drop6h <= RISK.ROBBING_WEIGHT_DROP_KG) {
    sensorler.push({
      sensor: "tarti",
      deger: `${drop6h} kg / 6s`,
      durum: "kayip",
      yorum: "Yavaş kayıp — yağma veya sızıntı",
    });
    bump("yagma", 22, `6 saatte ${drop6h} kg`);
    bump("kg_dusus", 22, "Tartı kaybı");
  } else if (reading?.weightKg > 0 && reading.weightKg < SCORE.COLONY_WEAK) {
    sensorler.push({
      sensor: "tarti",
      deger: `${reading.weightKg} kg`,
      durum: "dusuk",
      yorum: "Zayıf stok",
    });
    bump("zayif", 14, `Tartı ${reading.weightKg} kg düşük`);
  } else if (reading?.weightKg > 0) {
    sensorler.push({
      sensor: "tarti",
      deger: `${reading.weightKg} kg`,
      durum: "normal",
      yorum: "Stok yeterli görünüyor",
    });
  }

  // —— IR trafik ——
  if (traffic.samples > 0) {
    const beeOut = traffic.beeOut;
    if (beeOut < SCORE.TRAFFIC_WEAK && !raining) {
      sensorler.push({
        sensor: "ir",
        deger: `out ${beeOut}`,
        durum: "dusuk",
        yorum: "Hava açıkken düşük — zayıflık veya zehirlenme?",
      });
      bump("zayif", 20, `IR out ${beeOut} (hava açık)`);
      bump("pestisit", 12, "Düşük trafik + açık hava");
      if ((colony?.healthScore ?? 100) < SCORE.HEALTH_ATTENTION) {
        bump("pestisit", 10, `Sağlık ${colony.healthScore} + düşük IR`);
      }
    } else if (beeOut < DISEASE.TRAFFIC_LOW && raining) {
      sensorler.push({
        sensor: "ir",
        deger: `out ${beeOut}`,
        durum: "dusuk_yagmur",
        yorum: "Yağmurda düşük trafik normal",
      });
      celis("zayif", "Yağmur — düşük IR beklenen");
      celis("pestisit", "Yağmur maskesi");
    } else if (beeOut >= SCORE.TRAFFIC_STRONG) {
      sensorler.push({
        sensor: "ir",
        deger: `out ${beeOut}`,
        durum: "yogun",
        yorum: "Kalabalık uçuş",
      });
      bump("trafik", 22, `IR out ${beeOut}`);
      bump("ogul", 10, "Yoğun trafik — oğul baskısı");
    } else {
      sensorler.push({
        sensor: "ir",
        deger: `out ${beeOut}`,
        durum: "normal",
        yorum: "Orta trafik",
      });
    }
  }

  // —— Sıcaklık / nem ——
  const tempC = reading?.tempC;
  const hum = reading?.humidity;
  if (tempC != null) {
    if (tempC >= SENSOR.TEMP_HIGH_C) {
      sensorler.push({
        sensor: "sicaklik",
        deger: `${tempC}°C`,
        durum: "yuksek",
        yorum: "İç ısı stresi — havalandır",
      });
      bump("sicak", 22, `İç ${tempC}°C`);
    } else if (tempC <= SENSOR.TEMP_LOW_C) {
      sensorler.push({
        sensor: "sicaklik",
        deger: `${tempC}°C`,
        durum: "dusuk",
        yorum: "İç soğuk — zayıf ısıtma",
      });
      bump("don", 14, `İç ${tempC}°C düşük`);
      bump("zayif", 8, "Kovan ısısı düşük");
    } else {
      sensorler.push({
        sensor: "sicaklik",
        deger: `${tempC}°C`,
        durum: "ideal",
        yorum: "32–36 bandına yakın",
      });
    }
  }
  if (hum != null && hum >= SENSOR.HUM_HIGH_PCT) {
    sensorler.push({
      sensor: "nem",
      deger: `%${hum}`,
      durum: "yuksek",
      yorum: "Nem yüksek — yağma tek başına düşünme",
    });
    celis("yagma", "Yüksek nem — chalkbrood riski ayrı");
  }

  // —— Mikrofon ——
  const audio = reading?.audioRms;
  if (audio != null) {
    if (audio >= SENSOR.AUDIO_HIGH) {
      sensorler.push({
        sensor: "mikrofon",
        deger: audio,
        durum: "yuksek",
        yorum: "Kavga / panik uğultusu",
      });
      bump("yagma", 14, `Ses RMS ${audio} — kavga`);
      bump("ogul", 8, "Panik uğultusu — oğul öncesi?");
    } else if (audio <= SENSOR.AUDIO_LOW) {
      sensorler.push({
        sensor: "mikrofon",
        deger: audio,
        durum: "dusuk",
        yorum: "Sessiz kovan",
      });
      bump("zayif", 10, `Ses düşük ${audio}`);
    } else {
      sensorler.push({
        sensor: "mikrofon",
        deger: audio,
        durum: "normal",
        yorum: "Normal uğultu",
      });
    }
  }

  // —— Köşe dengesi ——
  if (imb >= SENSOR.CORNER_IMBALANCE_KG) {
    sensorler.push({
      sensor: "kose_tarti",
      deger: `${imb.toFixed(1)} kg fark`,
      durum: "dengesiz",
      yorum: "Devrilme veya platform eğik",
    });
    bump("fiziksel_hasar", 32, `Köşe farkı ${imb.toFixed(1)} kg`);
    if (hipotezler.yagma) hipotezler.yagma.skor = Math.max(0, hipotezler.yagma.skor - 15);
    celis("yagma", "Dengesizlik — yağmadan çok fiziksel");
  }

  // —— Dış hava ——
  const dis = weather?.tempC;
  if (dis != null) {
    sensorler.push({
      sensor: "hava",
      deger: `${dis}°C · ${weather?.label || weather?.condition || "—"}`,
      durum:
        dis <= WEATHER.FROST_TEMP_C
          ? "soguk"
          : dis >= WEATHER.HEAT_OUTDOOR_C
            ? "sicak"
            : "normal",
      yorum: weather?.label || "Konum havası",
    });
    if (dis <= WEATHER.FROST_TEMP_C || weather?.condition === "don") {
      bump("don", 28, `Dış ${dis}°C don riski`);
    }
    if (dis >= WEATHER.HEAT_OUTDOOR_C) {
      bump("sicak", 16, `Dış ${dis}°C sıcak`);
    }
    if (raining) {
      celis("trafik", "Yağmur — dış uçuş azalır");
    }
  }

  // —— Koloni skorları ——
  if (colony?.beeEstimate != null && colony.beeEstimate < SCORE.BEE_WEAK) {
    bump("zayif", 18, `~${Math.round(colony.beeEstimate / 1000)}k arı zayıf`);
  }
  if ((colony?.swarmRiskScore ?? 0) >= SWARM.RISK_CRITICAL) {
    bump("ogul", 26, `Oğul riski ${colony.swarmRiskScore}`);
  }
  if (colony?.swarmPhase === "occurred") {
    bump("ogul", 50, "Oğul gerçekleşti");
    celis("yagma", "Oğul sonrası — yağma öncelikli değil");
  }
  if ((colony?.healthScore ?? 100) < SCORE.HEALTH_CRITICAL) {
    bump("zayif", 12, `Sağlık ${colony.healthScore} kritik`);
  }

  // —— Kayıt / mod ——
  if (meta.transportMode || reading?.transportMode) {
    bump("tasima", 100, "Taşıma modu aktif");
  }
  if (meta.yagmacilikSuphesi) bump("yagma", 30, "Kayıt: yağma şüphesi");
  if (meta.pestisitSuphesi) bump("pestisit", 28, "Kayıt: ilaçlama");

  // Sonbahar gece
  const hour = reading?.ts
    ? (new Date(reading.ts).getUTCHours() + 3 + 24) % 24
    : 12;
  const month = reading?.ts ? new Date(reading.ts).getMonth() + 1 : 6;
  if (
    month >= RISK.AUTUMN_MONTH_START &&
    month <= RISK.AUTUMN_MONTH_END &&
    (hour >= 20 || hour < 6)
  ) {
    bump("sonbahar_gece", 14, "Sonbahar gecesi");
  }

  if (!Object.keys(hipotezler).length) {
    hipotezler.rutin = { skor: 5, destek: ["Sensörler dengeli"], celiski: [] };
  }

  const siralama = Object.entries(hipotezler)
    .map(([key, h]) => ({
      key,
      label: HIPOTEZ_LABEL[key] || key,
      skor: Math.round(h.skor),
      destek: h.destek.slice(0, 3),
      celiski: h.celiski.slice(0, 2),
    }))
    .sort((a, b) => b.skor - a.skor);

  const birincil = siralama[0];
  const ikincil = siralama[1];
  let guven = "dusuk";
  if (birincil.skor >= 35 && birincil.skor >= (ikincil?.skor ?? 0) * 1.5) {
    guven = "yuksek";
  } else if (birincil.skor >= 20 && birincil.skor > (ikincil?.skor ?? 0)) {
    guven = "orta";
  }

  return {
    sensorler,
    hipotezler: siralama,
    birincil: birincil.key,
    birincilLabel: birincil.label,
    birincilSkor: birincil.skor,
    ikincil: ikincil?.key || null,
    guven,
    ozet: `${birincil.label} (${birincil.skor} puan, güven ${guven})${ikincil ? ` · 2. ${ikincil.label}` : ""}`,
  };
}

function buildYapilacaklar(hedef, hipotezKey, fusion, degisecek, mode, meta) {
  const list = [...(YAPILACAKLAR[hipotezKey] || YAPILACAKLAR.rutin)];

  if (degisecek && mode === "otomatik") {
    list.unshift({
      oncelik: 1,
      ne: `Sistem girişi ${LABELS[meta.kapiMevcut || "orta"]} → ${LABELS[hedef]} yapıyor — hareketi izle`,
      neZaman: "şimdi",
    });
  } else if (mode === "manuel") {
    list.unshift({
      oncelik: 2,
      ne: `Manuel mod — hedef: ${LABELS[hedef]}; servo/klepçeyi elle doğrula`,
      neZaman: "şimdi",
    });
  }

  const primary = fusion.hipotezler[0];
  if (primary?.destek?.[0]) {
    list.push({
      oncelik: 3,
      ne: `Sensör özeti: ${primary.destek.slice(0, 2).join(" · ")}`,
      neZaman: "referans",
    });
  }
  if (fusion.guven === "dusuk") {
    list.push({
      oncelik: 3,
      ne: "Güven düşük — yerinde doğrula; yağmur veya arıza sensörü yanıltabilir",
      neZaman: "bugün",
    });
  }

  const hedefEk = HEDEF_EK[hedef];
  if (hedefEk && !list.some((x) => x.ne.includes(LABELS[hedef]))) {
    list.push(...hedefEk);
  }

  const seen = new Set();
  const unique = [];
  for (const item of list.sort((a, b) => a.oncelik - b.oncelik)) {
    if (seen.has(item.ne)) continue;
    seen.add(item.ne);
    unique.push(item);
  }
  return unique.slice(0, 6);
}

function buildNedenler(fusion, hedef) {
  const primary = fusion.hipotezler[0];
  const tip = hedef === "acik" ? "ac" : hedef === "kapali" || hedef === "dar" ? "kapat" : "durum";
  const nedenler = [
    {
      key: primary.key,
      label: `${primary.label} — ${primary.destek[0] || "sensör birleşimi"}`,
      tip,
      skor: primary.skor,
    },
  ];
  for (const h of fusion.hipotezler.slice(1, 3)) {
    if (h.skor >= 15) {
      nedenler.push({
        key: h.key,
        label: `${h.label}: ${h.destek[0] || ""}`,
        tip: "destek",
        skor: h.skor,
      });
    }
  }
  return nedenler;
}

function buildAriciya(fusion, hedef, hedefLabel) {
  const p = fusion.hipotezler[0];
  const destek = p.destek.slice(0, 2).join(" · ");
  return `Giriş ${hedefLabel} — ${p.label} (${fusion.guven} güven). ${destek}`;
}

/**
 * @param {object} reading
 * @param {object} colony
 * @param {object} meta
 * @param {object} [weather]
 */
function evaluateEntranceGate(reading, colony, meta = {}, weather = {}) {
  const mode = meta.kapiMod || "otomatik";
  const mevcut = meta.kapiMevcut || "orta";
  const fusion = fuseSensorEvidence(reading, colony, weather, meta);

  let hipotezKey = fusion.birincil;
  let hedef = /** @type {GatePosition} */ (HEDEF_MAP[hipotezKey] || "orta");
  let oncelik = ONCELIK_MAP[hipotezKey] ?? 5;

  if (mode === "manuel" && meta.kapiHedef) {
    hedef = meta.kapiHedef;
    hipotezKey = "manuel";
  }

  const nedenler = buildNedenler(fusion, hedef);
  const ariciya = buildAriciya(fusion, hedef, LABELS[hedef]);

  const kurallar = [
    { kosul: "Taşıma + titreşim", hedef: "kapali" },
    { kosul: "Titreşim + tartı kaybı + IR", hedef: "dar (yağma)" },
    { kosul: "Köşe dengesizliği", hedef: "dar (fiziksel)" },
    { kosul: "Don + düşük iç ısı", hedef: "dar" },
    { kosul: "IR yoğun + güçlü koloni", hedef: "acik" },
    { kosul: "Ani tartı düşüşü", hedef: "acik (oğul sonrası kontrol)" },
  ];

  const degisecek = mevcut !== hedef;
  let hareket = "sabit";
  if (degisecek) {
    hareket = ORDER[hedef] > ORDER[mevcut] ? "açılıyor" : "kapanıyor";
  }

  const uyari =
    oncelik <= 2 && degisecek
      ? {
          type: "gate_auto",
          priority: oncelik,
          message: `Giriş ${hareket}: ${LABELS[mevcut]} → ${LABELS[hedef]} — ${fusion.ozet}`,
        }
      : null;

  const yapilacaklar = buildYapilacaklar(
    hedef,
    fusion.birincil,
    fusion,
    degisecek,
    mode,
    meta
  );
  const ilkYapilacak = yapilacaklar[0];

  return {
    mod: mode,
    mevcut,
    hedef,
    mevcutLabel: LABELS[mevcut],
    hedefLabel: LABELS[hedef],
    hareket,
    degisecek,
    oncelik,
    nedenler,
    kurallar,
    ariciya,
    yapilacaklar,
    yapilacakOzet: ilkYapilacak
      ? `${ilkYapilacak.ne}${ilkYapilacak.neZaman !== "—" ? ` (${ilkYapilacak.neZaman})` : ""}`
      : ariciya,
    analiz: {
      birincil: fusion.birincil,
      birincilLabel: fusion.birincilLabel,
      guven: fusion.guven,
      ozet: fusion.ozet,
      hipotezler: fusion.hipotezler.slice(0, 4),
      sensorler: fusion.sensorler,
    },
    uyari,
    donanim: meta.kapiDonanim ?? "plan",
    evaluatedAt: reading?.ts || new Date().toISOString(),
  };
}

function applyGateState(meta, gate) {
  if (!gate || gate.mod !== "otomatik") return meta;
  if (gate.degisecek) {
    meta.kapiMevcut = gate.hedef;
    meta.kapiSonDegisim = new Date().toISOString();
    meta.kapiSonNeden = gate.analiz?.ozet || gate.nedenler[0]?.label || null;
  }
  return meta;
}

module.exports = {
  evaluateEntranceGate,
  applyGateState,
  fuseSensorEvidence,
  LABELS,
};
