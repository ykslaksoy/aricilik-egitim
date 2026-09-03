/**
 * 35 geride madde — derin analiz + toplam skor karşılaştırması
 * Çalıştır: node scripts/gap-deep-analysis.js
 */
const { FEATURES } = require("./superhero-score-data.js");

const std = FEATURES.filter((f) => f.g !== "D");
const behind = std.filter((f) => f.k < f.sh).sort((a, b) => b.sh - b.k - (a.sh - a.k));

function sum(arr, key) {
  return arr.reduce((s, f) => s + f[key], 0);
}
function avg(arr, key) {
  return Math.round((sum(arr, key) / arr.length) * 10) / 10;
}

behind.forEach((f) => {
  f.gap = f.sh - f.k;
  f.surpass = Math.min(99, f.sh + 1);
});

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  35 GERİDE MADDE — TOPLAM SKOR KARŞILAŞTIRMASI              ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("Metrik                    | koloni | SüperHero | Gap");
console.log("--------------------------|--------|-----------|------");
console.log(
  `35 madde TOPLAM           | ${String(sum(behind, "k")).padStart(6)} | ${String(sum(behind, "sh")).padStart(9)} | ${sum(behind, "sh") - sum(behind, "k")}`
);
console.log(
  `35 madde ORTALAMA         | ${String(avg(behind, "k")).padStart(6)} | ${String(avg(behind, "sh")).padStart(9)} | ${(avg(behind, "sh") - avg(behind, "k")).toFixed(1)}`
);

console.log("\n44 TAM LİG:");
console.log(
  `44 madde TOPLAM           | ${String(sum(std, "k")).padStart(6)} | ${String(sum(std, "sh")).padStart(9)} | ${sum(std, "sh") - sum(std, "k")}`
);
console.log(
  `44 madde ORTALAMA         | ${String(avg(std, "k")).padStart(6)} | ${String(avg(std, "sh")).padStart(9)} | ${(avg(std, "sh") - avg(std, "k")).toFixed(1)}`
);

const ahead = std.filter((f) => f.k > f.sh);
console.log("\n9 ÖNDE MADDE (avantaj):");
console.log(`koloni toplam: ${sum(ahead, "k")} | SH toplam: ${sum(ahead, "sh")} | Net +${sum(ahead, "k") - sum(ahead, "sh")}`);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  GRUP BAZLI (35 geride)                                      ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");
["A", "B", "C"].forEach((g) => {
  const arr = behind.filter((f) => f.g === g);
  console.log(
    `${g}: ${arr.length} madde | K toplam ${sum(arr, "k")} | SH toplam ${sum(arr, "sh")} | gap ${sum(arr, "sh") - sum(arr, "k")} | ort K ${avg(arr, "k")} / SH ${avg(arr, "sh")}`
  );
});

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  MADDE DETAY — gap | geçiş planı                             ║");
console.log("╚══════════════════════════════════════════════════════════════╝");

const PLANS = {
  "Hava istasyonu": "Önde 100 — yağmur+güneş BOM + firmware ingest + Open-Meteo çapraz + nektar modeli + senaryo R",
  "Devrilme / eğim": "Önde 100 — ADXL pitch/roll + köşe füzyon + taşıma bastırma + senaryo R",
  "GPS konum": "HW: opsiyonel kovan/grup/arılık GPS | SW: zincir miras + manuel + taşınma | GPS yokken çalışır · K=100",
  "Kovan kamerası CV": "Önde 100 — giriş kamera+edge BOM + YOLO/ONNX + IR çapraz + 500 etiket + senaryo R",
  "Titreşim / ivme": "HW: ADXL345 fabrika + firmware prod | SW: yağma/kavga/taşıma sınıf + kalite 100 | SAHA: 50+ etiket",
  "Çiçek ziyareti sensörü": "Önde 100 — giriş ROI polen (ek tuzak yok) + IR + nektar + yağmur kapısı + pollination ROI + senaryo R",
  "Akustik / mikrofon": "HW: izole MEMS + fabrika sert. | SW: 5 sınıf fusion + kalite 100 | SAHA: 200+ etiket arşivi",
  "Yavru alanı prob (petek)": "HW: DS18B20 BOM | SW: prob+model füzyon kalite 100 | SAHA: referenceBroodTempC + R #24",
  "Güneş + uzun pil": "Önde 100 — 6W panel+LiFePO4 + uyku + şarj tahmini | SAHA R: 12 ay pil logu",
  "4 köşe platform tartı": "HW: fabrika sertifika + köşe offset | SW: otomatik sıfırlama + bütünlük | SAHA: #16 mevsimsel referans",
  "Tek taraf tartı tahmini": "SW: yarı-platform v3 + kalite 100 | Füzyon: #1 köşe + arı + platform | SAHA: referenceSingleSideKg",
  "4G / GSM": "Önde 100 — A7670E GATE + offline buffer + LoRa failover | SAHA R: kırsal kapsama",
  "LoRa / LoRaWAN": "Önde 100 — NODE+GATE LoRa + retry + 4G failover (SH 0, eşsiz)",
  "Nem sensörü": "HW: SHT31 fabrika sert. | SW: iç/dış + yoğuşma + kalite 100 | SAHA: referenceHumidityPct drift",
  "ML / büyük veri": "SAHA: 30-100 kovan×1yıl etiket | SW: fleet ONNX eğitim+A/B | HW: güvenilir sensör akışı",
  "Varroa / hastalık": "SAHA: alkol yıkama etiket | SW: trend model+tedavi skoru | HW: opsiyonel sticky board",
  "Yağma tespiti": "HW: giriş IR+kamera sync | SW: çok kovan yayılım modeli | SAHA: yağma olay etiketleri",
  "Akustik 24-48h": "SAHA: 48h queenless/oğul etiket | SW: LSTM/CNN seri model | HW: sürekli mikrofon stream",
  Queenless: "SAHA: queen present/absent GT | SW: precision iyileştirme | HW: mikrofon+IR kalite",
  "Kış store uyarısı": "SAHA: kış tartı+besleme kayıtları | SW: ırk/iklim katsayıları | HW: stabil tartı",
  "Hasat zamanı": "SAHA: gerçek hasat tarihi etiket | SW: bal nem/şurup ayrımı | HW: hassas tartı",
  "Oğul öncesi risk": "SW: akustik 48h→risk skoru bağla | SAHA: oğul öncesi 72h dataset | HW: mikrofon+tartı sync",
  "Oğul sonrası alarm": "SW: ses+tartı+trafik çoklu onay | SAHA: false alarm ölçümü",
  "Sağlık skoru": "SAHA: muayene sonucu kalibrasyon | SW: bölgesel eşik profilleri",
  "Arı sayısı tahmini": "SAHA: Petek Tarama referans artır | SW: IR drift düzeltme | HW: IR montaj standardı",
  "Koloni güç skoru": "SW: çiftçi PDF rapor | SAHA: sezon boyu doğrulama",
  "Bal / nektar grafik": "SW: Chart.js nektar overlay+zoom | SAHA: bal tartımı kalibrasyon",
  "Kurulum / SLA": "SAHA: teknisyen ağı+checklist | SW: ticket+uptime dashboard | HW: kurulum sensör testi",
  "Native iOS/Android app": "SW: React Native/Flutter+FCM/APNs | SAHA: TestFlight/Play beta",
  "Takım / çok kullanıcı": "SW: OAuth+RBAC+audit log | SAHA: kooperatif pilot",
  "Hava entegrasyonu": "SW: hyperlocal forecast+arilik agregasyon | HW: istasyon öncelik | SAHA: mikroiklim haritası",
  "Muayene kaydı": "SW: foto/video eki+offline sync UI | SAHA: arıcı muayene şablonları",
  "İlaç / besleme günlüğü": "SW: ilaç takvimi+withdrawal uyarı | SAHA: TR kayıtlı ilaç listesi",
  "Healthy Hive indeksi": "SAHA: sezon korelasyonu | SW: çiftçi dashboard+underperform alarm",
  "Pollination ROI": "SW: PDF ROI raporu+kontrat UI | SAHA: çiftçi pilot",
  "Push / SMS": "SW: Twilio/Netgsm SMS+FCM prod | SAHA: 5dk acil alarm SLA",
  "Web panel": "SW: takım/SLA dashboard+rol bazlı görünüm | SAHA: 100+ kovan UX testi",
};

behind.forEach((f, i) => {
  const plan = PLANS[f.n] || "—";
  console.log(
    `\n${String(i + 1).padStart(2)}. [${f.g}] ${f.n}\n    Şimdi K ${f.k} | SH ${f.sh} | gap −${f.gap} | Geçmek için ≥${f.surpass}\n    → ${plan}`
  );
});
