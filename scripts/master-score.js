/**
 * Tüm maddeler — master karşılaştırma + iyileştirme planı
 * node scripts/master-score.js
 */
const { FEATURES } = require("./superhero-score-data.js");
const { IMPROVE, getMasterNote } = require("./master-notes.js");

function koloniScore(f) {
  if (f.g === "A") return f.aHw;
  if (f.g === "C") return f.cSw;
  return f.k;
}

function tier(score, sh) {
  if (sh === 0 && score >= 70) return "🟢 YÜKSEK";
  if (score >= sh) return "🟢 YÜKSEK";
  if (score >= 85) return "🟢 YÜKSEK";
  if (score >= 65) return "🟡 ORTA";
  if (score >= 40) return "🟠 DÜŞÜK";
  return "🔴 KRİTİK";
}

const rows = FEATURES.map((f) => {
  const k = koloniScore(f);
  const sh = f.sh;
  const imp = IMPROVE[f.n] || { tip: "?", aksiyon: "—" };
  const not = getMasterNote(f.n, k, sh);
  return { ...f, kCol: k, not, tier: tier(k, sh), ...imp };
});

console.log("╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║  MASTER SKOR — 78 MADDE (A15 + R12 + B15 + C14 + O10 + D12)            ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

["A", "R", "B", "C", "O", "D"].forEach((g) => {
  const items = rows.filter((r) => r.g === g);
  const kKey = g === "A" ? "aHw" : g === "C" ? "cSw" : "k";
  const ort = Math.round(items.reduce((s, f) => s + f.kCol, 0) / items.length * 10) / 10;
  const shOrt = Math.round(items.reduce((s, f) => s + f.sh, 0) / items.length * 10) / 10;
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${g} — ${items.length} madde | koloni ort: ${ort} | SH ort: ${shOrt}`);
  console.log(`${"═".repeat(70)}`);
  console.log("Seviye    | K    | SH   | Not");
  console.log("-".repeat(70));
  items
    .sort((a, b) => a.kCol - b.kCol)
    .forEach((f) => {
      const notShort = f.not.length > 42 ? `${f.not.slice(0, 40)}…` : f.not;
      console.log(
        `${f.tier.padEnd(9)} | ${String(f.kCol).padStart(4)} | ${String(f.sh).padStart(4)} | ${notShort}`
      );
    });
});

// Öncelik grupları
console.log("\n\n╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║  İYİLEŞTİRME ÖNCELİK GRUPLARI                                            ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

const kritik = rows.filter((r) => r.kCol < 40).sort((a, b) => a.kCol - b.kCol);
const dusuk = rows.filter((r) => r.kCol >= 40 && r.kCol < 65).sort((a, b) => a.kCol - b.kCol);
const orta = rows.filter((r) => r.kCol >= 65 && r.kCol < 85).sort((a, b) => a.kCol - b.kCol);
const yuksek = rows.filter((r) => r.kCol >= 85).sort((a, b) => b.kCol - a.kCol);

function printGroup(title, arr) {
  console.log(`\n── ${title} (${arr.length} madde) ──`);
  arr.forEach((f) => {
    console.log(`  [${f.g}] K ${f.kCol} | ${f.tip} | ${f.n}`);
    console.log(`       → ${f.aksiyon}`);
  });
}

printGroup("🔴 KRİTİK (<40)", kritik);
printGroup("🟠 DÜŞÜK (40–64)", dusuk);
printGroup("🟡 ORTA (65–84)", orta);
printGroup("🟢 YÜKSEK (85+)", yuksek);

// Faz planı
console.log("\n\n╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║  FAZ PLANI — birlikte iyileştirme sırası                                 ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝");
console.log(`
FAZ 1 — Yazılım (saha verisi yok)     → C/O hızlı kazanım
  • Chart.js nektar overlay, journal foto UI, ilaç takvimi
  • OAuth/RBAC iskelet, SLA dashboard, Capacitor shell
  • openMeteo hyperlocal, akustik kural v3

FAZ 2 — Saha serisi başlangıç (30 kovan) → R yükselişi
  • IR montaj + öğlen kalibrasyon serisi
  • ADXL + mikrofon montaj + ilk etiket seti
  • Alkol yıkama GT, yağma/queenless etiket

FAZ 3 — Donanım kararları              → A gerçek eksikler
  • GPS modül? Hava istasyonu? Çiçek sensörü?
  • GATE 4G seri üretim, kamera aşama 3

FAZ 4 — Prod operasyon                 → O yükselişi
  • App Store/Play, Twilio/Netgsm, faturalama
  • Saha kurulum ekibi, çiftçi pilot

FAZ 5 — Filo ML (100 kovan×1 yıl)      → R+B sıçrama
  • mlFleetAnalysis ONNX, varroa/queenless model eğitim
`);
