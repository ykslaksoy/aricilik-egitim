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
  "Güneş + uzun pil": { tip: "R", aksiyon: "12 ay pil tüketim saha logu" },
  "4G / GSM": { tip: "O+R", aksiyon: "GATE A7670 seri üretim + kırsal kapsama R matrisi" },
  "LoRa / LoRaWAN": { tip: "—", aksiyon: "Önde — koru" },
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
  "Sağlık skoru": { tip: "R", aksiyon: "Muayene sonucu → sağlık skoru kalibrasyon" },
  "ML / büyük veri": { tip: "R", aksiyon: "mlFleetAnalysis + 100 kovan×1y R verisi → ONNX" },
  "Oğul öncesi risk": { tip: "SW", aksiyon: "Akustik 48h → swarm risk skoru bağla" },
  "Oğul sonrası alarm": { tip: "R", aksiyon: "False alarm oranı R ölçümü + çoklu sensör onay" },
  "Akustik 24-48h": { tip: "R", aksiyon: "queenlessFusionAnalysis + R etiket seti" },
  "Arı sayısı tahmini": { tip: "R", aksiyon: "Petek Tarama referans sayımları artır" },
  "Öğlen kalibrasyon": { tip: "—", aksiyon: "Önde — koru" },
  "Koloni güç skoru": { tip: "SW", aksiyon: "Çiftçi PDF rapor + sezon R doğrulama" },
  Queenless: { tip: "R", aksiyon: "Queen GT + queenlessFusion precision" },
  "Varroa / hastalık": { tip: "R", aksiyon: "varroaAnalysis + alkol yıkama R korelasyonu" },
  "Hasat zamanı": { tip: "R", aksiyon: "Gerçek hasat tarihi etiket + harvestAnalysis kalibrasyon" },
  "Kış store uyarısı": { tip: "R", aksiyon: "Kış tartı+besleme R kayıtları → winterStoreAnalysis" },
  "Yağma tespiti": { tip: "R", aksiyon: "robbingAnalysis + yağma R etiket + IR sync" },
  "Bal / nektar grafik": { tip: "SW", aksiyon: "Chart.js nektar overlay + zoom/export" },
  "Türkçe önleme listesi": { tip: "—", aksiyon: "Önde — koru" },
  "Native iOS/Android app": { tip: "O", aksiyon: "Capacitor/React Native + TestFlight/Play beta" },
  "Web panel": { tip: "O", aksiyon: "Takım/SLA dashboard + 100 kovan UX testi" },
  "Push / SMS": { tip: "O", aksiyon: "Twilio/Netgsm prod + FCM/APNs anahtarları" },
  "Gezginci mod": { tip: "—", aksiyon: "Önde — koru" },
  "Takım / çok kullanıcı": { tip: "O", aksiyon: "OAuth + RBAC prod (teamService genişlet)" },
  "Muayene kaydı": { tip: "SW+O", aksiyon: "Foto/video eki + offline sync saha formu" },
  "İlaç / besleme günlüğü": { tip: "O", aksiyon: "TR ilaç listesi + withdrawal + ilaç takvimi UI" },
  "Pollination ROI": { tip: "O", aksiyon: "PDF ROI raporu + çiftçi pilot kontrat" },
  "Healthy Hive indeksi": { tip: "R", aksiyon: "Sezon korelasyon R + healthyHiveAnalysis" },
  "Hava entegrasyonu": { tip: "SW", aksiyon: "openMeteoService hyperlocal + istasyon öncelik" },
  "Açık API / ingest": { tip: "—", aksiyon: "Önde — koru" },
  "Offline-first": { tip: "O", aksiyon: "PWA service worker prod + offline-sync tamamlama" },
  "Esnek abonelik": { tip: "O", aksiyon: "Faturalama/ödeme entegrasyonu" },
  "Kurulum / SLA": { tip: "O", aksiyon: "Saha teknisyen ağı + uptime SLA dashboard" },
  "App Store / Play Store yayını": { tip: "O", aksiyon: "Mağaza binary + FCM/APNs" },
  "Prod OAuth + RBAC + audit log": { tip: "O", aksiyon: "Auth prod + audit log" },
  "Saha kurulum ekibi + uptime SLA": { tip: "O", aksiyon: "Kurulum checklist + ticket sistemi" },
  "FCM/APNs + SMS prod (Twilio/Netgsm)": { tip: "O", aksiyon: "Prod credential + 5dk acil alarm SLA" },
  "Faturalama / ödeme entegrasyonu": { tip: "O", aksiyon: "Stripe/iyzico veya manuel fatura" },
  "Çiftçi pilot + kontrat operasyonu": { tip: "O", aksiyon: "1 çiftçi pilot + pollination kontrat UI" },
  "Saha muayene (foto + offline sync)": { tip: "O", aksiyon: "Journal foto eki + offline saha form" },
  "PWA service worker prod dağıtım": { tip: "O", aksiyon: "sw.js prod hardening + cache stratejisi" },
  "Enterprise UX (100+ kovan test)": { tip: "O", aksiyon: "100+ kovan arılık UX testi" },
  "TR ilaç listesi + withdrawal uyarı prod": { tip: "O", aksiyon: "Kayıtlı ilaç DB + withdrawal uyarı" },
  "Petek Tarama": { tip: "—", aksiyon: "Önde — petek-tarama.js saha genişlet" },
  "Başlangıç skoru + trend": { tip: "—", aksiyon: "Önde — koru" },
  "Taşıma + yerleşme kuralları": { tip: "—", aksiyon: "Önde — transportAnalysis saha test" },
  "Giriş kapısı fusion": { tip: "SW", aksiyon: "entranceGate + kamera sync" },
  "Sensör kısmi mod": { tip: "—", aksiyon: "Önde — koru" },
  "Donanım bütünlük matrisi": { tip: "SW", aksiyon: "hardwareIntegrityService saha genişlet" },
  "ML etiket / export admin": { tip: "R", aksiyon: "Admin ML panel + dataset export büyüt" },
  "Derin skor açıklama": { tip: "—", aksiyon: "Önde — scoreDeep genişlet" },
  "Arı katmanları 35k-55k": { tip: "—", aksiyon: "Önde — koru" },
  "4 risk kategorisi": { tip: "—", aksiyon: "Önde — koru" },
  "Arılık birleşik + güvenlik kam": { tip: "SW+O", aksiyon: "securityCameraAnalysis + arılık fusion saha" },
  "Düşük maliyet ~3000₺": { tip: "—", aksiyon: "Önde — BOM maliyet takibi" },
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
