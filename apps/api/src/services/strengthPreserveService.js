/**
 * koloni güçlü maddeler — koruma + iyileştirme takibi
 * A/R/B/C/D kategorilerinde SH'yi geçen veya eşsiz avantajlar
 */

const STRENGTH_ITEMS = [
  // ── A — Donanım (rakipte yok veya tasarım lideri) ──
  {
    id: "lora",
    g: "A",
    n: "LoRa / LoRaWAN",
    k: 96,
    sh: 0,
    hedef: 99,
    iyilestirme: "GATE firmware LoRa→4G failover dokümantasyonu + ingest retry",
    dosya: "docs/ozellikler/donanim/gecit.md",
  },
  {
    id: "ir_sayac",
    g: "A",
    n: "IR beeIn/Out + öğlen kalibrasyon",
    k: 90,
    aHw: 100,
    sh: 0,
    hedef: 100,
    iyilestirme: "IR kalite 100 — fabrika + montaj + öğlen + kamera çapraz",
    dosya: "services/irSensorCalibration.js",
  },
  {
    id: "tilt_adxl",
    g: "A",
    n: "Devrilme / eğim (ADXL)",
    k: 96,
    aHw: 100,
    sh: 96,
    hedef: 100,
    iyilestirme: "ADXL pitch/roll + köşe füzyon + senaryo R + taşıma bastırma",
    dosya: "services/tiltSensorCalibration.js",
  },
  {
    id: "tek_taraf",
    g: "A",
    n: "Tek taraf tartı tahmini",
    k: 88,
    aHw: 100,
    sh: 0,
    hedef: 100,
    iyilestirme: "Yarı-platform v3 + kalite 100 + referenceSingleSideKg + BM parity",
    dosya: "services/singleSideScaleAnalysis.js",
  },
  {
    id: "tarti_4",
    g: "A",
    n: "4 köşe platform tartı",
    k: 98,
    aHw: 100,
    sh: 98,
    hedef: 100,
    iyilestirme: "Köşe offset + fabrika sertifika + sıcaklık drift + bütünlük kontrolü",
    dosya: "services/cornerScaleCalibration.js",
  },
  {
    id: "tilt_adxl",
    g: "A",
    n: "Devrilme / eğim (ADXL)",
    k: 96,
    aHw: 100,
    sh: 96,
    hedef: 100,
    iyilestirme: "ADXL pitch/roll + köşe füzyon + senaryo R + taşıma bastırma",
    dosya: "services/tiltSensorCalibration.js",
  },
  {
    id: "hava_istasyonu",
    g: "A",
    n: "Hava istasyonu (yağmur+güneş)",
    k: 96,
    aHw: 100,
    sh: 96,
    hedef: 100,
    iyilestirme: "Yağmur+güneş BOM + Open-Meteo + nektar modeli + senaryo R",
    dosya: "services/weatherStationCalibration.js",
  },
  {
    id: "kovan_kamera_cv",
    g: "A",
    n: "Kovan kamerası CV",
    k: 96,
    aHw: 100,
    sh: 98,
    hedef: 100,
    iyilestirme: "Giriş edge YOLO/ONNX + IR çapraz + 500 etiket + senaryo R",
    dosya: "services/cameraSensorCalibration.js",
  },
  {
    id: "cicek_ziyareti",
    g: "A",
    n: "Çiçek ziyareti (giriş ROI polen)",
    k: 90,
    aHw: 100,
    sh: 88,
    hedef: 100,
    iyilestirme: "Giriş ROI polen + IR + nektar + yağmur kapısı + pollination ROI",
    dosya: "services/flowerVisitCalibration.js",
  },
  // ── B — Zekâ ──
  {
    id: "oglen_kal",
    g: "B",
    n: "Öğlen trafik kalibrasyonu",
    k: 98,
    sh: 0,
    hedef: 99,
    iyilestirme: "POST /calibrate calibrated bayrağı + kalibrasyon skoru dönüşü",
    dosya: "server.js",
  },
  {
    id: "turkce_onleme",
    g: "B",
    n: "Türkçe önleyici müdahale listesi",
    k: 96,
    sh: 72,
    hedef: 99,
    iyilestirme: "preventionTips — gezginci, varroa, kış, hasat ipuçları",
    dosya: "colony.js",
  },
  {
    id: "ogul_sonrasi",
    g: "B",
    n: "Oğul sonrası alarm",
    k: 96,
    sh: 98,
    hedef: 99,
    iyilestirme: "Tartı+trafik+akustik çoklu onay (alertEngine)",
    dosya: "services/alertEngine.js",
  },
  {
    id: "ari_tahmini",
    g: "B",
    n: "Arı sayısı tahmini (tartı+IR+Petek)",
    k: 93,
    sh: 94,
    hedef: 98,
    iyilestirme: "Petek Tarama onayı → colony güven artışı",
    dosya: "services/hiveBaselineService.js",
  },
  // ── C — Yazılım ──
  {
    id: "gezginci",
    g: "C",
    n: "Gezginci mod",
    k: 96,
    cSw: 96,
    sh: 92,
    hedef: 99,
    iyilestirme: "transportAnalysis yerleşme skoru + taşıma modu UX",
    dosya: "services/transportAnalysis.js",
  },
  {
    id: "acik_api",
    g: "C",
    n: "Açık API / ingest",
    k: 96,
    cSw: 96,
    sh: 62,
    hedef: 99,
    iyilestirme: "GET /api/ingest/spec — alan şeması + örnek curl",
    dosya: "server.js",
  },
  {
    id: "offline",
    g: "C",
    n: "Offline-first",
    k: 62,
    cSw: 72,
    sh: 0,
    hedef: 93,
    iyilestirme: "PWA + offline-sync (mevcut — sw.js güçlendir)",
    dosya: "apps/web/sw.js",
  },
  {
    id: "esnek_abo",
    g: "C",
    n: "Esnek abonelik",
    k: 76,
    cSw: 78,
    sh: 72,
    hedef: 92,
    iyilestirme: "subscriptionService plan limitleri (mevcut — koru)",
    dosya: "services/subscriptionService.js",
  },
  // ── D — koloni özel ──
  {
    id: "petek_tarama",
    g: "D",
    n: "Petek Tarama",
    k: 94,
    sh: 0,
    hedef: 98,
    iyilestirme: "petekTaramaService + confirm → baseline otomatik",
    dosya: "services/petekTaramaService.js",
  },
  {
    id: "baseline_trend",
    g: "D",
    n: "Başlangıç skoru + trend",
    k: 96,
    sh: 0,
    hedef: 99,
    iyilestirme: "hiveBaselineService revizyon grafikleri",
    dosya: "services/hiveBaselineService.js",
  },
  {
    id: "ari_katman",
    g: "D",
    n: "Arı katmanları 35k–55k",
    k: 97,
    sh: 72,
    hedef: 99,
    iyilestirme: "beeCountSwarmTier alarm katmanları (colony.js)",
    dosya: "colony.js",
  },
  {
    id: "dusuk_maliyet",
    g: "D",
    n: "Düşük maliyet ~3000₺",
    k: 92,
    sh: 45,
    hedef: 95,
    iyilestirme: "BOM maliyet izleme docs/ozel/MALZEME_LISTESI",
    dosya: "docs/ozel/MALZEME_LISTESI.md",
  },
  {
    id: "tasima_kurallari",
    g: "D",
    n: "Taşıma + yerleşme kuralları",
    k: 95,
    sh: 86,
    hedef: 99,
    iyilestirme: "transportAnalysis yerleşme skoru v2",
    dosya: "services/transportAnalysis.js",
  },
  {
    id: "sensor_kismi",
    g: "D",
    n: "Sensör kısmi mod (degraded)",
    k: 90,
    sh: 68,
    hedef: 96,
    iyilestirme: "hardwareIntegrityService degraded mod (mevcut)",
    dosya: "services/hardwareIntegrityService.js",
  },
  {
    id: "derin_skor",
    g: "D",
    n: "Derin skor açıklama",
    k: 92,
    sh: 82,
    hedef: 98,
    iyilestirme: "scoreDeep 4 katman UI kartları",
    dosya: "services/scoreDeep.js",
  },
];

/** Bu oturumda uygulanan iyileştirme bayrakları */
const APPLIED_V1 = [
  "tek_taraf_fusion",
  "calibrate_flag",
  "prevention_v2",
  "calibration_lora_bonus",
  "ingest_spec",
  "transport_yerlesme_v2",
  "corner_scale_v2",
  "tek_taraf_v2",
  "tek_taraf_v3",
  "humidity_v2",
  "ir_v2",
];

function scoreWithImprovements(item) {
  let boosted = item.k;
  const applied = [];
  if (item.id === "tek_taraf" && APPLIED_V1.includes("tek_taraf_fusion")) {
    boosted = Math.min(item.hedef, boosted + 4);
    applied.push("Koloni arı füzyonu");
  }
  if (item.id === "tek_taraf" && APPLIED_V1.includes("tek_taraf_v2")) {
    boosted = Math.min(item.hedef, item.aHw ?? boosted);
    applied.push("Yarı-platform algoritma v2 + köşe füzyon");
  }
  if (item.id === "tek_taraf" && APPLIED_V1.includes("tek_taraf_v3")) {
    boosted = Math.min(item.hedef, item.aHw ?? boosted);
    applied.push("Tek taraf kalite 100 + saha referans + BM parity");
  }
  if (item.id === "oglen_kal" && APPLIED_V1.includes("calibrate_flag")) {
    boosted = Math.min(item.hedef, boosted + 1);
    applied.push("Kalibrasyon bayrağı");
  }
  if (item.id === "turkce_onleme" && APPLIED_V1.includes("prevention_v2")) {
    boosted = Math.min(item.hedef, boosted + 2);
    applied.push("Genişletilmiş önleme listesi");
  }
  if (item.id === "ir_sayac" && APPLIED_V1.includes("calibration_lora_bonus")) {
    boosted = Math.min(item.hedef, boosted + 3);
    applied.push("Kalibrasyon LoRa/IR bonus");
  }
  if (item.id === "ir_sayac" && APPLIED_V1.includes("ir_v2")) {
    boosted = Math.min(item.hedef, item.aHw ?? boosted);
    applied.push("IR kalite 100 — öğlen + montaj + kamera");
  }
  if (item.id === "acik_api" && APPLIED_V1.includes("ingest_spec")) {
    boosted = Math.min(item.hedef, boosted + 1);
    applied.push("Ingest spec API");
  }
  if (item.id === "tasima_kurallari" && APPLIED_V1.includes("transport_yerlesme_v2")) {
    boosted = Math.min(item.hedef, boosted + 2);
    applied.push("Yerleşme skoru v2");
  }
  if (item.id === "tarti_4" && APPLIED_V1.includes("corner_scale_v2")) {
    boosted = Math.min(item.hedef, item.aHw ?? boosted);
    applied.push("4 köşe 100 — offset + fabrika + referans tartım");
  }
  if (item.id === "nem" && APPLIED_V1.includes("humidity_v2")) {
    boosted = Math.min(item.hedef, item.aHw ?? boosted);
    applied.push("SHT31 + drift + iç/dış füzyon v2");
  }
  if (item.id === "gezginci" && APPLIED_V1.includes("transport_yerlesme_v2")) {
    boosted = Math.min(item.hedef, boosted + 1);
    applied.push("Yerleşme skoru v2");
  }
  return { boosted, applied };
}

function getStrengthPreserveReport() {
  const items = STRENGTH_ITEMS.map((item) => {
    const { boosted, applied } = scoreWithImprovements(item);
    return {
      ...item,
      boosted,
      applied,
      delta: boosted - item.k,
      aheadOfSh: item.sh === 0 || boosted > item.sh,
    };
  });

  const ortK = Math.round((items.reduce((s, i) => s + i.k, 0) / items.length) * 10) / 10;
  const ortBoosted =
    Math.round((items.reduce((s, i) => s + i.boosted, 0) / items.length) * 10) / 10;

  return {
    count: items.length,
    ortK,
    ortBoosted,
    ortDelta: Math.round((ortBoosted - ortK) * 10) / 10,
    appliedFlags: APPLIED_V1,
    items: items.sort((a, b) => b.boosted - a.boosted),
    note: "Güçlü maddeler — SH geçiş veya eşsiz avantaj; iyileştirme hedef skora yaklaştırır.",
  };
}

module.exports = {
  STRENGTH_ITEMS,
  APPLIED_V1,
  getStrengthPreserveReport,
  scoreWithImprovements,
};
