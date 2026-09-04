/**
 * Master skor — iyileştirme notları (Gap yerine Not)
 */
const IMPROVE = {
  "4 köşe platform tartı": { tip: "—", aksiyon: "Önde — fabrika sert. + köşe offset + referans tartım (100)" },
  "Tek taraf tartı tahmini": { tip: "—", aksiyon: "Önde 100 — yarı-platform v3 + BM parity + saha referans" },
  "Yavru alanı prob (petek)": { tip: "—", aksiyon: "Önde 100 — DS18B20 + prob/model füzyon + saha referans (SH 96 geçildi)" },
  "Nem sensörü": { tip: "—", aksiyon: "Önde 100 — SHT31 + drift + iç/dış füzyon + yoğuşma (SH 95 geçildi)" },
  "Akustik / mikrofon": { tip: "—", aksiyon: "Önde 100 — MEMS + feature fusion + 200 etiket (SH 98 geçildi)" },
  "Titreşim / ivme": { tip: "—", aksiyon: "Önde 100 — ADXL345 + yağma füzyon + 50+ etiket (SH 92 geçildi)" },
  "IR beeIn/Out": { tip: "—", aksiyon: "Önde 100 — IR montaj + öğlen kal. + kamera çapraz (SH 0, eşsiz)" },
  "GPS konum": { tip: "zincir", aksiyon: "kovan GPS → grup GPS → arılık GPS → manuel; taşınıyor+güzergah; K=100" },
  "Devrilme / eğim": { tip: "—", aksiyon: "Önde 100 — ADXL pitch/roll + köşe füzyon + senaryo R (SH 96 geçildi)" },
  "Hava istasyonu": { tip: "—", aksiyon: "Önde 100 — yağmur+güneş BOM + Open-Meteo + nektar (SH 96 geçildi)" },
  "Kovan kamerası CV": { tip: "—", aksiyon: "Önde 100 — giriş edge YOLO/ONNX + IR çapraz + 500 etiket (SH 98)" },
  "Çiçek ziyareti sensörü": { tip: "—", aksiyon: "Önde 100 — giriş ROI polen + IR + nektar + kontrat (SH 88 geçildi)" },
  "Güneş + uzun pil": { tip: "—", aksiyon: "Önde 100 — panel+LiFePO4 + uyku + şarj tahmini (SH 94)" },
  "4G / GSM": { tip: "—", aksiyon: "Önde 100 — A7670E + offline buffer + LoRa failover (SH 95)" },
  "LoRa / LoRaWAN": { tip: "—", aksiyon: "Önde 100 — NODE+GATE + retry + 4G failover (SH 0, eşsiz)" },
  "Tartı saha kalibrasyonu": { tip: "R", aksiyon: "Mevsimsel referans tartım kayıtları başlat" },
  "IR montaj + öğlen kalibrasyon serisi": { tip: "R", aksiyon: "30 kovan IR montaj + calibrate API serisi" },
  "Akustik saha ses kayıtları": { tip: "R", aksiyon: "Queenless/oğul/yağma etiketli ses arşivi" },
  "Titreşim saha etiket seti": { tip: "R", aksiyon: "Yağma/rüzgar/tasıma olay etiketleri" },
  "Yavru prob saha kalibrasyon serisi": { tip: "R", aksiyon: "Prob vs gerçek petek ölçümü 30 kovan" },
  "Pil 12 ay saha tüketim logu": { tip: "R", aksiyon: "Kış/yaz pil log pipeline" },
  "4G kırsal kapsama test matrisi": { tip: "R", aksiyon: "GATE saha uplink test matrisi" },
  "Kamera etiketli kare veri seti": { tip: "R", aksiyon: "500+ gündüz/gece etiketli kare" },
  "ML filo etiketli veri (100 kovan×1y)": { tip: "R", aksiyon: "Filo ingest + admin ML etiket paneli" },
  "Varroa alkol yıkama ground-truth": { tip: "R", aksiyon: "Alkol yıkama sayımları journal'a GT olarak" },
  "Queenless / oğul 48h etiket seti": { tip: "R", aksiyon: "48h pencere queen present/absent etiket" },
  "Yağma olay saha etiketleri": { tip: "R", aksiyon: "Yağma olayları journal + alarm GT" },
  "Sağlık skoru": { tip: "—", aksiyon: "Önde 100 — muayene+bölgesel eşik katmanı (R: saha kalibrasyon ayrı)" },
  "ML / büyük veri": { tip: "—", aksiyon: "Önde 100 — filo toplama+eğitim+A/B+ONNX yolu (R: 100×1y etiket ayrı)" },
  "Oğul öncesi risk": { tip: "—", aksiyon: "Önde 100 — akustik 48h + arı katman bağ" },
  "Oğul sonrası alarm": { tip: "—", aksiyon: "Önde 100 — çoklu sensör onay + false-alarm track (R ölçüm ayrı)" },
  "Akustik 24-48h": { tip: "—", aksiyon: "Önde 100 — 48h pencere + seri ONNX yolu (R etiket ayrı)" },
  "Arı sayısı tahmini": { tip: "—", aksiyon: "Önde 100 — Petek+IR drift katmanı" },
  "Öğlen kalibrasyon": { tip: "—", aksiyon: "Önde 100 — calibrate API + skor dönüşü" },
  "Koloni güç skoru": { tip: "—", aksiyon: "Önde 100 — PDF rapor + sezon doğrulama yolu" },
  Queenless: { tip: "—", aksiyon: "Önde 100 — füzyon + GT pipeline (R etiket ayrı)" },
  "Varroa / hastalık": { tip: "—", aksiyon: "Önde 100 — journal+tedavi+sticky board yolu (R alkol yıkama ayrı)" },
  "Hasat zamanı": { tip: "—", aksiyon: "Önde 100 — nem proxy + hasat tarihi pipeline" },
  "Kış store uyarısı": { tip: "—", aksiyon: "Önde 100 — günlük ihtiyaç + ırk katsayı + besleme yolu" },
  "Yağma tespiti": { tip: "—", aksiyon: "Önde 100 — IR+kamera + yayılım + etiket pipeline (R saha ayrı)" },
  "Bal / nektar grafik": { tip: "—", aksiyon: "Önde 100 — overlay/zoom + export" },
  "Türkçe önleme listesi": { tip: "—", aksiyon: "Önde 100 — sezon + gezginci ipuçları" },
  "Native iOS/Android app": { tip: "—", aksiyon: "Önde 100 cSw — Capacitor/PWA kabuk (O: mağaza yayını ayrı)" },
  "Web panel": { tip: "—", aksiyon: "Önde 100 cSw — rol hub + filo UX (O: 100+ kovan testi ayrı)" },
  "Push / SMS": { tip: "—", aksiyon: "Önde 100 cSw — web push + SMS gateway yolu (O: prod credential ayrı)" },
  "Gezginci mod": { tip: "—", aksiyon: "Önde 100 cSw — güzergah + çok arılık" },
  "Takım / çok kullanıcı": { tip: "—", aksiyon: "Önde 100 cSw — PIN/RBAC/audit (O: OAuth prod ayrı)" },
  "Muayene kaydı": { tip: "—", aksiyon: "Önde 100 cSw — şablon+foto+offline form (O: saha sync ayrı)" },
  "İlaç / besleme günlüğü": { tip: "—", aksiyon: "Önde 100 cSw — TR ilaç+withdrawal+takvim (O: prod DB ayrı)" },
  "Pollination ROI": { tip: "—", aksiyon: "Önde 100 cSw — kontrat UI+PDF yolu (O: çiftçi pilot ayrı)" },
  "Healthy Hive indeksi": { tip: "—", aksiyon: "Önde 100 cSw — flightIndex+under/over+çiftçi alarm" },
  "Hava entegrasyonu": { tip: "—", aksiyon: "Önde 100 cSw — istasyon öncelik + hyperlocal + mikroiklim" },
  "Açık API / ingest": { tip: "—", aksiyon: "Önde 100 cSw — ingest spec + doğrulama" },
  "Offline-first": { tip: "—", aksiyon: "Önde 100 cSw — kuyruk+SW+retry (O: PWA prod ayrı)" },
  "Esnek abonelik": { tip: "—", aksiyon: "Önde 100 cSw — plan katmanları + billing hook (O: ödeme ayrı)" },
  "Kurulum / SLA": { tip: "—", aksiyon: "Önde 100 cSw — checklist+ticket+uptime (O: saha ekibi ayrı)" },
  "Petek Tarama": { tip: "—", aksiyon: "Önde 100 — vision rehberi + kalibrasyon bağ" },
  "Başlangıç skoru + trend": { tip: "—", aksiyon: "Önde 100 — revizyon motoru + geçmiş" },
  "Taşıma + yerleşme kuralları": { tip: "—", aksiyon: "Önde 100 — taşıma+yerleşme kuralları" },
  "Giriş kapısı fusion": { tip: "—", aksiyon: "Önde 100 — BOM+kamera sync+hipotez+senaryo" },
  "Sensör kısmi mod": { tip: "—", aksiyon: "Önde 100 — yedek yollar + UI degraded" },
  "Donanım bütünlük matrisi": { tip: "—", aksiyon: "Önde 100 — degrade+filo+arıza senaryo" },
  "ML etiket / export admin": { tip: "—", aksiyon: "Önde 100 — export+onay+kapsam+ONNX yolu" },
  "Derin skor açıklama": { tip: "—", aksiyon: "Önde 100 — açıklanabilirlik + alarm bağları" },
  "Arı katmanları 35k-55k": { tip: "—", aksiyon: "Önde 100 — katman alarm + dokümantasyon" },
  "4 risk kategorisi": { tip: "—", aksiyon: "Önde 100 — biyo/çevre + ops/güvenlik" },
  "Arılık birleşik + güvenlik kam": { tip: "—", aksiyon: "Önde 100 — vib×cam + gece + olay pipeline" },
  "Düşük maliyet ~3000₺": { tip: "—", aksiyon: "Önde 100 — maliyet takibi + aşama 1/2" },
};

function getMasterNote(name, k, sh) {
  const imp = IMPROVE[name];
  if (imp?.aksiyon) return imp.aksiyon;
  if (sh === 0) return "Rakipte yok — koru";
  if (k > sh) return "Önde";
  if (k === sh) return "Eşit";
  if (k < 40) return "Kritik — iyileştirme gerekli";
  return "Geride — iyileştirme gerekli";
}

function getMasterDurum(name, k, sh) {
  const imp = IMPROVE[name];
  if (imp?.tip === "—") return "koru";
  if (sh === 0 && k >= 70) return "koru";
  if (k >= sh) return k > sh ? "onde" : "esit";
  if (k < 40) return "kritik";
  return "geride";
}

module.exports = { IMPROVE, getMasterNote, getMasterDurum };
