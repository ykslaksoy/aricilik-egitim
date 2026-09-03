/**
 * SüperHero vs koloni — paylaşılan özellik verisi
 *
 * A  = Donanım tasarımı (BOM + firmware/ingest; saha hariç) → aHw
 * R  = Saha referans verisi (montaj + etiketli kayıt + kalibrasyon GT)
 * C  = Ürün / yazılım (API + UI + PWA; prod operasyon hariç) → cSw
 * O  = Operasyon / prod (mağaza, auth, saha ekibi, SMS prod, faturalama)
 * B/D = mevcut lig maddeleri → k (bileşik lig skoru)
 *
 * SH = max(BeeHero, Arnia, ApisProtect, Beewise)
 */

const FEATURES = [
  // ── A — Donanım tasarımı (15) ─────────────────────────────────────────
  // aHw = BOM'da var mı + ingest/firmware hazır mı (saha montajı sayılmaz)
  { g: "A", n: "4 köşe platform tartı", bh: 95, ar: 95, ap: 45, bw: 98, aHw: 100, k: 98, bom: true },
  { g: "A", n: "Tek taraf tartı tahmini", bh: 0, ar: 0, ap: 0, bw: 0, aHw: 100, k: 88, bom: true },
  { g: "A", n: "Yavru alanı prob (petek)", bh: 92, ar: 96, ap: 90, bw: 95, aHw: 100, k: 88, bom: true },
  { g: "A", n: "Nem sensörü", bh: 95, ar: 95, ap: 95, bw: 95, aHw: 100, k: 96, bom: true },
  { g: "A", n: "Akustik / mikrofon", bh: 94, ar: 98, ap: 92, bw: 88, aHw: 100, k: 88, bom: true },
  { g: "A", n: "Titreşim / ivme", bh: 0, ar: 0, ap: 88, bw: 92, aHw: 100, k: 85, bom: true },
  { g: "A", n: "IR beeIn/Out", bh: 0, ar: 0, ap: 0, bw: 0, aHw: 100, k: 90, bom: true },
  { g: "A", n: "GPS konum", bh: 90, ar: 62, ap: 0, bw: 94, aHw: 100, k: 98, bom: "group|hive|apiary" },
  { g: "A", n: "Devrilme / eğim", bh: 0, ar: 0, ap: 0, bw: 96, aHw: 100, k: 96, bom: true },
  { g: "A", n: "Hava istasyonu", bh: 0, ar: 96, ap: 0, bw: 0, aHw: 100, k: 96, bom: true },
  { g: "A", n: "Kovan kamerası CV", bh: 0, ar: 0, ap: 0, bw: 98, aHw: 68, k: 65, bom: "optional" },
  { g: "A", n: "Çiçek ziyareti sensörü", bh: 88, ar: 0, ap: 0, bw: 0, aHw: 32, k: 58, bom: false },
  { g: "A", n: "Güneş + uzun pil", bh: 90, ar: 92, ap: 90, bw: 94, aHw: 93, k: 90, bom: true },
  { g: "A", n: "4G / GSM", bh: 95, ar: 95, ap: 95, bw: 95, aHw: 85, k: 93, bom: "stage2" },
  { g: "A", n: "LoRa / LoRaWAN", bh: 0, ar: 0, ap: 0, bw: 0, aHw: 96, k: 96, bom: true },

  // ── R — Saha referans verisi (12) ───────────────────────────────────────
  // İlgili A/B maddesinin saha montaj + etiketli kayıt seviyesi
  { g: "R", n: "Tartı saha kalibrasyonu", ref: "A:tartı", bh: 95, ar: 95, ap: 45, bw: 98, k: 88 },
  { g: "R", n: "IR montaj + öğlen kalibrasyon serisi", ref: "A:IR", bh: 0, ar: 0, ap: 0, bw: 0, k: 55 },
  { g: "R", n: "Akustik saha ses kayıtları", ref: "A:akustik", bh: 94, ar: 98, ap: 92, bw: 88, k: 42 },
  { g: "R", n: "Titreşim saha etiket seti", ref: "A:titreşim", bh: 0, ar: 0, ap: 88, bw: 92, k: 38 },
  { g: "R", n: "Yavru prob saha kalibrasyon serisi", ref: "A:yavru", bh: 92, ar: 96, ap: 90, bw: 95, k: 48 },
  { g: "R", n: "Pil 12 ay saha tüketim logu", ref: "A:pil", bh: 90, ar: 92, ap: 90, bw: 94, k: 52 },
  { g: "R", n: "4G kırsal kapsama test matrisi", ref: "A:4G", bh: 95, ar: 95, ap: 95, bw: 95, k: 45 },
  { g: "R", n: "Kamera etiketli kare veri seti", ref: "A:kamera", bh: 0, ar: 0, ap: 0, bw: 98, k: 35 },
  { g: "R", n: "ML filo etiketli veri (100 kovan×1y)", ref: "B:ML", bh: 97, ar: 72, ap: 96, bw: 97, k: 15 },
  { g: "R", n: "Varroa alkol yıkama ground-truth", ref: "B:varroa", bh: 68, ar: 72, ap: 70, bw: 92, k: 28 },
  { g: "R", n: "Queenless / oğul 48h etiket seti", ref: "B:akustik48h", bh: 94, ar: 97, ap: 91, bw: 90, k: 40 },
  { g: "R", n: "Yağma olay saha etiketleri", ref: "B:yağma", bh: 68, ar: 93, ap: 72, bw: 94, k: 35 },

  // ── B — Zekâ (15) ─────────────────────────────────────────────────────
  { g: "B", n: "Sağlık skoru", bh: 92, ar: 78, ap: 94, bw: 94, k: 93 },
  { g: "B", n: "ML / büyük veri", bh: 97, ar: 72, ap: 96, bw: 97, k: 40 },
  { g: "B", n: "Oğul öncesi risk", bh: 78, ar: 96, ap: 80, bw: 97, k: 91 },
  { g: "B", n: "Oğul sonrası alarm", bh: 95, ar: 95, ap: 65, bw: 98, k: 96 },
  { g: "B", n: "Akustik 24-48h", bh: 94, ar: 97, ap: 91, bw: 90, k: 68 },
  { g: "B", n: "Arı sayısı tahmini", bh: 72, ar: 0, ap: 0, bw: 94, k: 93 },
  { g: "B", n: "Öğlen kalibrasyon", bh: 0, ar: 0, ap: 0, bw: 0, k: 98 },
  { g: "B", n: "Koloni güç skoru", bh: 92, ar: 76, ap: 91, bw: 94, k: 93 },
  { g: "B", n: "Queenless", bh: 92, ar: 95, ap: 90, bw: 93, k: 70 },
  { g: "B", n: "Varroa / hastalık", bh: 68, ar: 72, ap: 70, bw: 92, k: 54 },
  { g: "B", n: "Hasat zamanı", bh: 0, ar: 93, ap: 0, bw: 97, k: 86 },
  { g: "B", n: "Kış store uyarısı", bh: 72, ar: 96, ap: 74, bw: 95, k: 76 },
  { g: "B", n: "Yağma tespiti", bh: 68, ar: 93, ap: 72, bw: 94, k: 60 },
  { g: "B", n: "Bal / nektar grafik", bh: 94, ar: 92, ap: 72, bw: 94, k: 93 },
  { g: "B", n: "Türkçe önleme listesi", bh: 0, ar: 0, ap: 0, bw: 72, k: 96 },

  // ── C — Ürün / yazılım (14) ─────────────────────────────────────────────
  // cSw = API + UI + PWA hazır mı (App Store / saha ekibi / prod SMS hariç)
  { g: "C", n: "Native iOS/Android app", bh: 96, ar: 78, ap: 95, bw: 98, cSw: 74, k: 58 },
  { g: "C", n: "Web panel", bh: 92, ar: 90, ap: 92, bw: 94, cSw: 94, k: 93 },
  { g: "C", n: "Push / SMS", bh: 95, ar: 95, ap: 95, bw: 95, cSw: 90, k: 91 },
  { g: "C", n: "Gezginci mod", bh: 92, ar: 68, ap: 90, bw: 88, cSw: 96, k: 96 },
  { g: "C", n: "Takım / çok kullanıcı", bh: 95, ar: 93, ap: 95, bw: 95, cSw: 76, k: 60 },
  { g: "C", n: "Muayene kaydı", bh: 90, ar: 0, ap: 0, bw: 92, cSw: 82, k: 78 },
  { g: "C", n: "İlaç / besleme günlüğü", bh: 90, ar: 0, ap: 0, bw: 92, cSw: 80, k: 76 },
  { g: "C", n: "Pollination ROI", bh: 98, ar: 0, ap: 0, bw: 98, cSw: 92, k: 90 },
  { g: "C", n: "Healthy Hive indeksi", bh: 95, ar: 0, ap: 93, bw: 94, cSw: 84, k: 80 },
  { g: "C", n: "Hava entegrasyonu", bh: 72, ar: 94, ap: 74, bw: 91, cSw: 78, k: 72 },
  { g: "C", n: "Açık API / ingest", bh: 62, ar: 0, ap: 0, bw: 0, cSw: 96, k: 96 },
  { g: "C", n: "Offline-first", bh: 0, ar: 0, ap: 0, bw: 0, cSw: 72, k: 62 },
  { g: "C", n: "Esnek abonelik", bh: 42, ar: 72, ap: 45, bw: 48, cSw: 78, k: 76 },
  { g: "C", n: "Kurulum / SLA", bh: 95, ar: 95, ap: 95, bw: 95, cSw: 70, k: 50 },

  // ── O — Operasyon / prod (10) ───────────────────────────────────────────
  // Mağaza, prod auth, saha ekibi, canlı SMS, faturalama, pilot operasyon
  { g: "O", n: "App Store / Play Store yayını", ref: "C:native", bh: 96, ar: 78, ap: 95, bw: 98, k: 28 },
  { g: "O", n: "Prod OAuth + RBAC + audit log", ref: "C:takım", bh: 95, ar: 93, ap: 95, bw: 95, k: 35 },
  { g: "O", n: "Saha kurulum ekibi + uptime SLA", ref: "C:sla", bh: 95, ar: 95, ap: 95, bw: 95, k: 22 },
  { g: "O", n: "FCM/APNs + SMS prod (Twilio/Netgsm)", ref: "C:push", bh: 95, ar: 95, ap: 95, bw: 95, k: 42 },
  { g: "O", n: "Faturalama / ödeme entegrasyonu", ref: "C:abonelik", bh: 42, ar: 72, ap: 45, bw: 48, k: 30 },
  { g: "O", n: "Çiftçi pilot + kontrat operasyonu", ref: "C:pollination", bh: 98, ar: 0, ap: 0, bw: 98, k: 48 },
  { g: "O", n: "Saha muayene (foto + offline sync)", ref: "C:muayene", bh: 90, ar: 0, ap: 0, bw: 92, k: 52 },
  { g: "O", n: "PWA service worker prod dağıtım", ref: "C:offline", bh: 0, ar: 0, ap: 0, bw: 0, k: 45 },
  { g: "O", n: "Enterprise UX (100+ kovan test)", ref: "C:web", bh: 92, ar: 90, ap: 92, bw: 94, k: 58 },
  { g: "O", n: "TR ilaç listesi + withdrawal uyarı prod", ref: "C:ilac", bh: 90, ar: 0, ap: 0, bw: 92, k: 38 },

  // ── D — koloni özel (12) ────────────────────────────────────────────────
  { g: "D", n: "Petek Tarama", bh: 0, ar: 0, ap: 0, bw: 0, k: 94 },
  { g: "D", n: "Başlangıç skoru + trend", bh: 0, ar: 0, ap: 0, bw: 0, k: 96 },
  { g: "D", n: "Taşıma + yerleşme kuralları", bh: 82, ar: 55, ap: 86, bw: 78, k: 95 },
  { g: "D", n: "Giriş kapısı fusion", bh: 0, ar: 0, ap: 0, bw: 86, k: 78 },
  { g: "D", n: "Sensör kısmi mod", bh: 58, ar: 52, ap: 62, bw: 68, k: 90 },
  { g: "D", n: "Donanım bütünlük matrisi", bh: 62, ar: 58, ap: 68, bw: 72, k: 86 },
  { g: "D", n: "ML etiket / export admin", bh: 55, ar: 48, ap: 58, bw: 50, k: 84 },
  { g: "D", n: "Derin skor açıklama", bh: 70, ar: 68, ap: 76, bw: 82, k: 92 },
  { g: "D", n: "Arı katmanları 35k-55k", bh: 62, ar: 58, ap: 55, bw: 72, k: 97 },
  { g: "D", n: "4 risk kategorisi", bh: 68, ar: 65, ap: 72, bw: 78, k: 90 },
  { g: "D", n: "Arılık birleşik + güvenlik kam", bh: 72, ar: 0, ap: 76, bw: 80, k: 82 },
  { g: "D", n: "Düşük maliyet ~3000₺", bh: 45, ar: 40, ap: 35, bw: 15, k: 92 },
];

FEATURES.forEach((f) => {
  f.sh = Math.max(f.bh, f.ar, f.ap, f.bw);
});

module.exports = { FEATURES };
