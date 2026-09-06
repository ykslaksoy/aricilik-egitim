const listEl = document.getElementById("list");
const summaryEl = document.getElementById("summary");
const alarmEl = document.getElementById("alarm");
const careEl = document.getElementById("care");
const sensorsEl = document.getElementById("sensors");
const filtersEl = document.getElementById("filters");
const analizEl = document.getElementById("analiz");
const tasksEl = document.getElementById("tasks");
const mlStatsEl = document.getElementById("ml-stats");

let selectedId = null;
let allHives = [];
let allTasks = [];
let allLocations = [];
let allGroups = [];
let analysisCatalog = null;
let hiveAnalysisCache = new Map();
let trendCache = new Map();
let filter = "all";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const HIVE_STATUS_TR = {
  ok: "Normal",
  normal: "Normal",
  watch: "İzle",
  alert: "Uyarı",
  fault: "Arıza",
  offline: "Çevrimdışı",
  weak: "Zayıf",
  degraded: "Kısmi mod",
  low_battery: "Düşük pil",
};
const FAULT_TR = {
  offline: "çevrimdışı",
  scale: "tartı",
  temp: "sıcaklık",
  humidity: "nem",
  ir: "IR sensör",
  vibration: "titreşim",
  camera: "kamera",
  audio: "mikrofon",
  battery: "pil",
  gps: "GPS",
};
function hiveStatusTr(status) {
  if (!status) return "—";
  return HIVE_STATUS_TR[status] || String(status);
}
function faultTr(fault) {
  if (!fault) return "";
  return FAULT_TR[fault] || String(fault);
}

function renderScoreRevision(hive) {
  const rev = hive?.scoreRevision;
  const base = hive?.baseline;
  if (!rev?.hasBaseline && !base) {
    return `<div class="score-revision muted">
      <strong>Başlangıç skoru</strong>
      <p>Henüz yok — <a href="/petek-tarama.html?hiveId=${hive.hiveId}">Kovan Petek Tarama</a> ile kalibrasyon yapın.</p>
    </div>`;
  }
  const dims = (rev?.dimensions || [])
    .filter((d) => d.delta != null && Math.abs(d.delta) >= 0.1)
    .slice(0, 6)
    .map(
      (d) =>
        `<span class="rev-chip ${d.trend}">${d.label} ${d.deltaLabel}${d.unit ? " " + d.unit : ""}</span>`
    )
    .join("");
  const baseDate = base?.ts ? new Date(base.ts).toLocaleDateString("tr-TR") : "—";
  return `<div class="score-revision">
    <strong>Başlangıç skoru</strong>
    <span class="muted tip-inline">Petek Tarama · ${baseDate}</span>
    <p>${rev?.ariciya || "Sensörler başlangıç skoruna göre izleniyor"}</p>
    ${dims ? `<div class="rev-chips">${dims}</div>` : ""}
  </div>`;
}

function svgSparkline(points, baseline, opts = {}) {
  const w = opts.width || 280;
  const h = opts.height || 56;
  const pad = 4;
  if (!points?.length) {
    return `<svg width="${w}" height="${h}" class="spark"><text x="8" y="28" fill="#888" font-size="11">Veri yok</text></svg>`;
  }
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (baseline != null) {
    min = Math.min(min, baseline);
    max = Math.max(max, baseline);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const scaleX = (i) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
  const scaleY = (v) => pad + (1 - (v - min) / (max - min)) * (h - pad * 2);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(p.value).toFixed(1)}`)
    .join(" ");
  let baselineLine = "";
  if (baseline != null && Number.isFinite(baseline)) {
    const y = scaleY(baseline);
    baselineLine = `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#c97820" stroke-dasharray="4 3" stroke-width="1" opacity="0.85"/>
      <text x="${w - pad}" y="${y - 2}" text-anchor="end" fill="#c97820" font-size="9">başlangıç</text>`;
  }
  const last = points[points.length - 1];
  return `<svg width="${w}" height="${h}" class="spark" viewBox="0 0 ${w} ${h}">
    ${baselineLine}
    <path d="${line}" fill="none" stroke="${opts.color || "#2d6a4f"}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${scaleX(points.length - 1)}" cy="${scaleY(last.value)}" r="3" fill="${opts.color || "#2d6a4f"}"/>
  </svg>`;
}

const TREND_LABELS = {
  weightKg: "Tartı (kg)",
  colonyScore: "Koloni skoru",
  healthScore: "Sağlık",
  beeEstimate: "Arı tahmini",
  honeyKgEstimate: "Bal (kg)",
  swarmRiskScore: "Oğul riski",
};

function renderTrendCharts(data) {
  if (!data) return "";
  const keys = Object.keys(TREND_LABELS);
  const cards = keys
    .map((key) => {
      const pts = data.series?.[key] || [];
      const base = data.baselineLines?.[key];
      const last = pts.length ? pts[pts.length - 1].value : null;
      const colors =
        key === "swarmRiskScore" ? "#b5451b" : key === "healthScore" || key === "colonyScore" ? "#2d6a4f" : "#3a6ea5";
      return `<div class="trend-card">
        <div class="trend-card-head">
          <span>${TREND_LABELS[key]}</span>
          <strong>${last != null ? (key === "beeEstimate" && last >= 1000 ? Math.round(last / 1000) + "k" : last) : "—"}</strong>
        </div>
        ${svgSparkline(pts, base, { color: colors })}
      </div>`;
    })
    .join("");
  const src = data.source === "memory_fallback" ? " · demo geçmiş" : "";
  const pts = data.pointCount || 0;
  return `<div class="trend-analysis">
    <div class="trend-head">
      <strong>Grafik analiz</strong>
      <span class="muted">${pts} kayıt${src}</span>
    </div>
    <p class="muted tip-inline">Turuncu kesik çizgi = Petek Tarama başlangıç skoru · sensörler revize eder</p>
    <div class="trend-grid">${cards}</div>
  </div>`;
}

async function loadTrendCharts(hiveId) {
  const box = document.getElementById("trend-analysis");
  if (!box) return;
  try {
    let data = trendCache.get(hiveId);
    if (!data) {
      const res = await fetch(`/api/hives/${hiveId}/trends?days=90`);
      data = await res.json();
      trendCache.set(hiveId, data);
    }
    box.outerHTML = renderTrendCharts(data);
  } catch (e) {
    box.innerHTML = `<p class="muted">Grafik yüklenemedi: ${e.message}</p>`;
  }
}

function beeTierClass(tier) {
  if (tier == null || tier < 1) return "";
  if (tier >= 4) return "critical";
  if (tier >= 3) return "high";
  if (tier >= 2) return "mid";
  return "low";
}

function fmtBees(n, tierLabel) {
  if (n == null) return "—";
  const count = n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  return tierLabel && tierLabel !== "Normal" ? `${count} · ${tierLabel}` : count;
}

function scoreClass(score) {
  if (score == null) return "";
  if (score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

function riskClass(risk, phase) {
  if (phase === "occurred") return "critical";
  if (risk == null) return "";
  if (risk >= 75) return "critical";
  if (risk >= 50) return "high";
  if (risk >= 28) return "mid";
  return "low";
}

function cornerImbalance(cornerKg) {
  if (!Array.isArray(cornerKg) || cornerKg.length < 4) return null;
  return Math.round((Math.max(...cornerKg) - Math.min(...cornerKg)) * 100) / 100;
}

function matchesDurum(h, filterKey) {
  const d = h.evaluation?.durumlar;
  if (!d) return false;
  switch (filterKey) {
    case "durum:saglik_kritik":
      return d.saglik?.seviye <= 1;
    case "durum:hastalik":
      return d.hastalikRiski?.seviye <= 2;
    case "durum:sicaklik":
      return (d.sicaklik?.seviye ?? 5) <= 2;
    case "durum:nem":
      return (d.nem?.seviye ?? 5) <= 2;
    case "durum:ogul_acil":
      return d.ogulRiski?.key === "acil" || d.ogulDurumu?.key === "hemen_mudahale";
    case "durum:ogul_oldu":
      return d.ogulDurumu?.occurred === true;
    case "durum:ana_suphe":
      return d.ana?.key !== "var";
    case "durum:zayif":
      return d.koloni?.key === "zayif" || d.koloniGucu?.key === "weak";
    case "durum:besleme":
      return d.besleme?.key === "acil" || d.besleme?.key === "onerilir";
    case "durum:ariza":
      return d.sensor?.key === "ariza" || d.sensor?.key === "offline";
    case "durum:ari_kritik":
      return (d.ariSayisi?.tier ?? 0) >= 4;
    case "durum:risk_yuksek":
      return (h.evaluation?.riskKategorileri?.enKotuSeviye ?? 5) <= 2;
    default:
      return false;
  }
}

function seviyeClass(seviye) {
  if (seviye <= 1) return "s1";
  if (seviye === 2) return "s2";
  if (seviye === 3) return "s3";
  return "s5";
}

function renderRiskKategorileri(hive) {
  const rk = hive?.evaluation?.riskKategorileri;
  if (!rk?.kategoriler) return "";
  const cats = Object.values(rk.kategoriler);
  const blocks = cats
    .map((cat) => {
      const rows = (cat.maddeler || [])
        .map(
          (m) => `<div class="risk-row ${seviyeClass(m.seviye)}">
        <span class="risk-mod muted">${m.mod}</span>
        <span class="risk-title">${m.label}</span>
        <span class="risk-ozet">${m.ozet || ""}</span>
      </div>`
        )
        .join("");
      return `<div class="risk-cat ${seviyeClass(cat.seviye)}">
      <div class="risk-cat-head">
        <strong>${cat.label}</strong>
        <span class="muted">${cat.ozet}</span>
      </div>
      ${rows}
    </div>`;
    })
    .join("");
  const highlights = (rk.oneCikan || [])
    .map((h) => `<li>${h.label} — ${h.ozet}</li>`)
    .join("");
  return `<div class="risk-kategorileri">
    <strong>Risk kategorileri</strong>
    <p class="durum-ozet">${rk.ozet || "—"}</p>
    ${highlights ? `<ul class="durum-highlights">${highlights}</ul>` : ""}
    <div class="risk-grid">${blocks}</div>
  </div>`;
}

function renderDurumlar(hive) {
  const ev = hive?.evaluation;
  if (!ev?.durumlar) return "";
  const rows = [
    ["saglik", "Sağlık"],
    ["sicaklik", "Sıcaklık"],
    ["nem", "Nem"],
    ["ir", "IR trafik"],
    ["tarti", "Tartı"],
    ["fusion", "Birleşik"],
    ["hastalikRiski", "Hastalık riski"],
    ["koloni", "Koloni skoru"],
    ["koloniGucu", "Koloni gücü"],
    ["ariSayisi", "Arı sayısı"],
    ["ogulRiski", "Oğul riski"],
    ["ogulDurumu", "Oğul durumu"],
    ["ana", "Ana"],
    ["anaOgul", "Ana × oğul"],
    ["yavru", "Yavru çıkışı"],
    ["besleme", "Besleme"],
    ["sensor", "Sensör"],
    ["operasyon", "Operasyon"],
  ];
  const items = rows
    .map(([key, title]) => {
      const s = ev.durumlar[key];
      if (!s) return "";
      return `<div class="durum-row ${seviyeClass(s.seviye)}">
        <span class="durum-title">${title}</span>
        <span class="durum-label">${s.label}</span>
        <span class="durum-ozet muted">${s.ozet || ""}</span>
      </div>`;
    })
    .join("");
  const highlights = (ev.oneCikan || [])
    .map((h) => `<li>${h.label}${h.ozet ? ` — ${h.ozet}` : ""}</li>`)
    .join("");
  return `<div class="durumlar">
    <strong>Durum değerlendirmesi</strong>
    <p class="durum-ozet">${ev.ozet || "—"}</p>
    ${highlights ? `<ul class="durum-highlights">${highlights}</ul>` : ""}
    <div class="durum-grid">${items}</div>
    ${renderRiskKategorileri(hive)}
  </div>`;
}

function matchesFilter(h) {
  const c = h.colony || {};
  const d = h.evaluation?.durumlar;
  switch (filter) {
    case "all":
      return true;
    case "fault":
      return (
        h.status === "fault" ||
        h.status === "offline" ||
        h.sensorHealth?.mode === "critical" ||
        d?.sensor?.key === "ariza" ||
        d?.sensor?.key === "offline"
      );
    case "degraded":
      return h.status === "degraded" || h.sensorHealth?.mode === "degraded";
    case "queenless":
      return d ? d.ana?.key !== "var" : h.queenlessSuspect || h.anaDurum === "supheli" || h.anaDurum === "yok";
    case "swarm1":
      return d
        ? d.ogulRiski?.key === "acil" || d.ogulDurumu?.occurred
        : c.swarmPhase === "critical" || c.swarmPhase === "occurred" || (c.swarmRiskScore ?? 0) >= 75;
    case "swarm2":
      return d
        ? d.ogulRiski?.key === "yuksek" || d.ogulRiski?.key === "acil"
        : (c.swarmRiskScore ?? 0) >= 50;
    case "health":
      return d ? d.saglik?.seviye <= 1 : (c.healthScore ?? 100) < 45;
    case "temp":
      return h.tempC >= 38 || h.tempC <= 28;
    case "battery":
      return (h.battery ?? 100) < 20;
    case "offline":
      return h.status === "offline" || d?.sensor?.key === "offline";
    case "konum:Ev":
      return (h.konumEtiket || "Ev") === "Ev";
    case "konum:Yayla Tortum":
      return h.konumEtiket === "Yayla Tortum";
    case "konum:Yayla 2":
      return h.konumEtiket === "Yayla 2";
    case "besleme":
      return d
        ? d.besleme?.key === "acil" || d.besleme?.key === "onerilir"
        : allTasks.some((t) => t.hiveId === h.hiveId && t.type === "feeding");
    case "durum:zayif":
      return matchesDurum(h, "durum:zayif");
    case "durum:ogul_oldu":
      return matchesDurum(h, "durum:ogul_oldu");
    case "durum:ari_kritik":
      return matchesDurum(h, "durum:ari_kritik");
    default:
      if (filter.startsWith("durum:")) return matchesDurum(h, filter);
      if (filter.startsWith("capraz:")) {
        return h.capraz === filter.slice(7);
      }
      return true;
  }
}

function renderFilters() {
  const caprazSet = [...new Set(allHives.map((h) => h.capraz).filter(Boolean))];
  const buttons = [
    { id: "all", label: "Tümü" },
    { id: "fault", label: "Arıza", danger: true },
    { id: "degraded", label: "Kısmi mod" },
    { id: "queenless", label: "Ana kaybı", danger: true },
    { id: "swarm1", label: "Oğul acil", danger: true },
    { id: "swarm2", label: "Oğul yüksek" },
    { id: "health", label: "Sağlık kritik", danger: true },
    { id: "durum:hastalik", label: "Hastalık riski", danger: true },
    { id: "durum:sicaklik", label: "Sıcaklık", danger: true },
    { id: "durum:nem", label: "Nem", danger: true },
    { id: "durum:risk_yuksek", label: "Yüksek risk", danger: true },
    { id: "temp", label: "Sıcak/soğuk" },
    { id: "battery", label: "Düşük pil" },
    { id: "offline", label: "Çevrimdışı" },
    { id: "konum:Ev", label: "Ev" },
    { id: "konum:Yayla Tortum", label: "Yayla Tortum" },
    { id: "konum:Yayla 2", label: "Yayla 2" },
    { id: "besleme", label: "Besleme" },
    { id: "durum:zayif", label: "Zayıf koloni" },
    { id: "durum:ogul_oldu", label: "Oğul oldu", danger: true },
    { id: "durum:ari_kritik", label: "Arı kritik" },
    ...caprazSet.slice(0, 6).map((c) => ({ id: `capraz:${c}`, label: c })),
  ];

  filtersEl.innerHTML = buttons
    .map(
      (b) =>
        `<button type="button" data-f="${b.id}" class="${filter === b.id ? "active" : ""} ${b.danger ? "danger" : ""}">${b.label}</button>`
    )
    .join("");

  filtersEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.f;
      renderFilters();
      renderList();
    });
  });
}

function renderTasks() {
  const top = allTasks.filter((t) => t.priority <= 3).slice(0, 12);
  if (!top.length) {
    tasksEl.innerHTML = "<h2>Görevler</h2><p class='meta'>Görev yok</p>";
    return;
  }
  tasksEl.innerHTML =
    `<h2>Görevler (Öncelik 1–5)</h2>` +
    top
      .map(
        (t) => `
      <div class="task ${t.type === "feeding" ? "task-feed" : ""}" data-id="${t.hiveId}">
        <span class="code p${t.priority}">${t.code}</span>
        ${t.type === "feeding" ? '<span class="kind">Besleme</span>' : ""}
        Kovan ${t.hiveId} — ${t.title}
        <div class="meta">${t.konumEtiket ? t.konumEtiket + " · " : ""}${t.capraz || ""} ${t.scenarioLabel ? "· " + t.scenarioLabel : ""}</div>
      </div>`
      )
      .join("");

  tasksEl.querySelectorAll(".task").forEach((el) => {
    el.addEventListener("click", () => {
      selectedId = Number(el.dataset.id);
      filter = "all";
      renderFilters();
      renderList();
      const hive = allHives.find((h) => h.hiveId === selectedId);
      renderCare(hive);
      renderSensors(hive);
    });
  });
}

function renderCare(hive) {
  if (!hive?.colony) {
    careEl.classList.add("hidden");
    return;
  }
  const c = hive.colony;
  const parts = [];
  if (hive.evaluation?.ozet) parts.push(hive.evaluation.ozet);
  if (hive.capraz) parts.push(hive.capraz);
  if (c.prevention?.length) parts.push(c.prevention[0]);
  else if (c.care?.length) parts.push(c.care[0]);
  if (c.swarmSignals?.length && (c.swarmRiskScore ?? 0) >= 28) {
    parts.push(c.swarmSignals[0]);
  }
  if (hive.weather?.tips?.[0]) parts.push(hive.weather.tips[0]);
  if (hive.colony?.broodEmergence?.active) {
    const b = hive.colony.broodEmergence;
    parts.push(`Yavru çıkışı ~${b.emergePerDay >= 1000 ? Math.round(b.emergePerDay / 100) / 10 + "k" : b.emergePerDay}/gün`);
  }
  if (!parts.length) {
    careEl.classList.add("hidden");
    return;
  }
  careEl.textContent = `Kovan ${hive.hiveId}: ${parts.join(" · ")}`;
  careEl.classList.remove("hidden");
}

function fmtBrood(b) {
  if (!b?.active) return "—";
  const k =
    b.emergePerDay >= 1000
      ? `${(b.emergePerDay / 1000).toFixed(1).replace(".0", "")}k`
      : String(b.emergePerDay);
  const range =
    b.emergePerDayMin != null ? ` (${b.emergePerDayMin}–${b.emergePerDayMax})` : "";
  const total21 =
    b.estimatedNewBees21d != null
      ? ` · 21 günde ~${Math.round(b.estimatedNewBees21d / 1000)}k`
      : "";
  const kg =
    b.weightGain21dKg != null ? ` · tartı +${b.weightGain21dKg} kg (21g)` : "";
  return `${k}/gün${range}${total21}${kg}`;
}

function weatherLine(w) {
  if (!w) return "—";
  const cam =
    w.camera?.present && w.camera?.hint
      ? ` · kamera: ${w.camera.hint.replace(/_/g, " ")}`
      : "";
  return `${w.label} · ${w.tempC}°C · yağış ${w.precipMm} mm · rüzgâr ${w.windKmh} km/s${cam}`;
}

async function setHiveKapi(hiveId, mod, hedef) {
  const res = await fetch(`/api/hives/${hiveId}/kapi`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mod, hedef }),
  });
  if (!res.ok) return;
  await load();
  selectedId = hiveId;
  renderList();
}

function renderGate(hive) {
  const g = hive?.entranceGate;
  if (!g) return "";
  const nedenler = (g.nedenler || [])
    .map((n) => `<li>${n.label}</li>`)
    .join("");
  const yapilacaklar = (g.yapilacaklar || [])
    .map(
      (y) =>
        `<li><span class="gate-pri p${y.oncelik}">Ö${y.oncelik}</span> ${y.ne}<span class="muted"> · ${y.neZaman}</span></li>`
    )
    .join("");
  const sensorler = (g.analiz?.sensorler || [])
    .map(
      (s) =>
        `<li><strong>${s.sensor}</strong> ${s.deger} <span class="muted">(${s.durum})</span> — ${s.yorum}</li>`
    )
    .join("");
  const hipotezler = (g.analiz?.hipotezler || [])
    .slice(0, 3)
    .map(
      (h) =>
        `<li>${h.label} <span class="muted">${h.skor}p</span>${h.destek?.[0] ? ` — ${h.destek[0]}` : ""}</li>`
    )
    .join("");
  const pos = ["acik", "orta", "dar", "kapali"]
    .map((p) => {
      const sel = g.hedef === p ? "selected" : "";
      const labels = { acik: "Açık", orta: "Orta", dar: "Dar", kapali: "Kapalı" };
      return `<option value="${p}" ${sel}>${labels[p]}</option>`;
    })
    .join("");
  const modSel = g.mod === "manuel" ? "manuel" : "otomatik";
  return `<div class="gate-block">
    <strong>Giriş kapısı</strong>
    <span class="gate-badge ${g.donanim === "plan" ? "muted" : ""}">${g.donanim === "plan" ? "simülasyon" : "canlı"}</span>
    <p>${g.yapilacakOzet || g.ariciya || "—"}</p>
    <p class="gate-meta muted">
      Analiz: ${g.analiz?.ozet || "—"} · güven <strong>${g.analiz?.guven || "—"}</strong>
    </p>
    <p class="gate-meta muted">
      Şu an: <strong>${g.mevcutLabel || g.mevcut}</strong>
      ${g.hedef !== g.mevcut ? ` → hedef ${g.hedefLabel}` : ""}
      ${g.hareket !== "sabit" ? ` · ${g.hareket}` : ""}
    </p>
    ${nedenler ? `<p class="muted gate-sub">Karar:</p><ul class="wx-tips">${nedenler}</ul>` : ""}
    ${sensorler ? `<p class="muted gate-sub"><strong>Sensörler</strong></p><ul class="wx-tips gate-sensors">${sensorler}</ul>` : ""}
    ${hipotezler ? `<p class="muted gate-sub"><strong>Hipotezler</strong></p><ul class="wx-tips">${hipotezler}</ul>` : ""}
    ${yapilacaklar ? `<p class="muted gate-sub"><strong>Yapılacaklar</strong></p><ul class="wx-tips gate-todo">${yapilacaklar}</ul>` : ""}
    <div class="gate-controls">
      <label>Mod
        <select id="kapi-mod" aria-label="Kapı modu">
          <option value="otomatik" ${modSel === "otomatik" ? "selected" : ""}>Otomatik</option>
          <option value="manuel" ${modSel === "manuel" ? "selected" : ""}>Manuel</option>
        </select>
      </label>
      <label>Pozisyon
        <select id="kapi-hedef" aria-label="Kapı pozisyonu" ${modSel === "otomatik" ? "disabled" : ""}>${pos}</select>
      </label>
      <button type="button" id="kapi-apply" class="btn-small">Uygula</button>
    </div>
  </div>`;
}

function renderCamera(hive) {
  const hc = hive?.hiveCamera;
  const ac = hive?.apiaryCamera;
  if (!hc?.present && !ac?.mod) return "";

  let blocks = "";

  if (hc?.present) {
    const sec = hive?.securityCamera;
    const secLine =
      sec?.mod === "calisiyor" && sec.seviye !== "normal"
        ? `<p class="cam-meta warn-text">Güvenlik: ${sec.ariciya}</p>`
        : "";
    const ir = hc.irComparison || {};
    const alerts = (hc.alerts || [])
      .map((a) => `<li class="cam-alert ${a.level}">${a.title}</li>`)
      .join("");
    const oneriler = (hc.oneriler || []).map((o) => `<li>${o}</li>`).join("");
    blocks += `<div class="cam-block cam-hive">
      <strong>Kovan kamerası</strong>
      <span class="cam-badge">${hc.mod === "live" ? "canlı CV" : hc.mod}</span>
      <div class="cam-frame">
        <img src="${hc.snapshotUrl}" alt="Kovan ${hive.hiveId} giriş görüntüsü" width="400" height="225" loading="lazy"/>
        <span class="cam-live">CANLI · ${hc.refreshSec}s</span>
      </div>
      <p>${hc.ariciya || "—"}</p>
      <p class="cam-meta muted">
        CV in/out <strong>${hc.counts?.inPerInterval ?? "—"} / ${hc.counts?.outPerInterval ?? "—"}</strong>
        · yoğunluk ${hc.cv?.densityLabel || "—"}
        · güven ${hc.cv?.confidence ?? "—"}%
        · IR ${ir.irIn}/${ir.irOut}
        ${ir.agrees ? " · uyumlu" : ` · sapma ±${ir.maxDelta}%`}
      </p>
      ${hive.colony?.cameraBoost ? `<p class="cam-meta muted">Arı tahmini CV ile güçlendirildi (${hive.colony.beeEstimateSource || "cv"})</p>` : ""}
      ${secLine}
      ${alerts ? `<ul class="wx-tips cam-alerts">${alerts}</ul>` : ""}
      ${oneriler ? `<ul class="wx-tips">${oneriler}</ul>` : ""}
    </div>`;
  }

  if (ac?.mod) {
    const a = ac.analiz || {};
    const notlar = (ac.notlar || []).map((n) => `<li>${n}</li>`).join("");
    const badge =
      ac.mod === "live"
        ? "canlı"
        : ac.mod === "degraded"
          ? "arıza — yedek mod"
          : "opsiyonel — IR izleme";
    const imgBlock =
      ac.snapshotUrl && ac.mod === "live"
        ? `<div class="cam-frame">
        <img src="${ac.snapshotUrl}" alt="${ac.konumEtiket} arılık görüntüsü" width="400" height="225" loading="lazy"/>
        <span class="cam-live">CANLI · ${ac.refreshSec}s</span>
      </div>`
        : ac.mod === "degraded"
          ? `<p class="cam-meta muted">Canlı görüntü yok — IR + kovan kameraları yedek</p>`
          : `<p class="cam-meta muted">Ana kamera takılı değil — arılık sensör fusion aktif</p>`;
    blocks += `<div class="cam-block cam-apiary cam-${ac.mod}">
      <strong>Arılık kamerası</strong>
      <span class="cam-badge">${badge}</span>
      ${imgBlock}
      <p>${ac.ariciya || "—"}</p>
      <p class="cam-meta muted">
        ${a.kovanSayisi ?? "—"} kovan · ort. çıkış ${a.ortalamaIrOut ?? "—"}
        · trafik ${a.trafikLabel || "—"}
        · hava ${a.hava?.note || "—"}
        ${a.kaynak ? ` · kaynak ${a.kaynak}` : ""}
      </p>
      ${a.guvenlik?.hareket ? `<p class="cam-meta warn-text">Güvenlik: ${a.guvenlik.not}</p>` : ""}
      ${hive?.securityCamera?.uyari ? `<p class="cam-meta warn-text">${hive.securityCamera.ariciya}</p>` : ""}
      ${notlar ? `<ul class="wx-tips">${notlar}</ul>` : ""}
    </div>`;
  }

  return blocks;
}

function renderHumidity(hive) {
  const hum = hive?.colony?.humidity;
  if (hum?.humScore == null && !hum?.zone) return "";
  const nedenler = (hum.nedenler || [])
    .map((n) => `<li><strong>${n.tip === "artis" ? "↑" : n.tip === "dusus" ? "↓" : "·"}</strong> ${n.label}</li>`)
    .join("");
  const oneriler = (hum.oneriler || []).map((o) => `<li>${o}</li>`).join("");
  return `<div class="hum-block">
    <strong>Nem değerlendirmesi</strong>
    <p>${hum.ariciya || `${hive.humidity} %`}</p>
    <div class="hum-meta muted">
      Skor ${hum.humScore ?? "—"} · ${hum.trendLabel || "—"}
      ${hum.delta6hPct != null ? ` · Δ6s ${hum.delta6hPct > 0 ? "+" : ""}${hum.delta6hPct}%` : ""}
      ${hum.disHumidityPct != null ? ` · dış %${hum.disHumidityPct}` : ""}
      ${hum.condensationRisk ? " · yoğuşma riski" : ""}
      ${hum.quality?.score != null ? ` · kalite ${hum.quality.score}/100` : ""}
    </div>
    ${nedenler ? `<ul class="wx-tips">${nedenler}</ul>` : ""}
    ${oneriler ? `<p class="muted">Öneri:</p><ul class="wx-tips">${oneriler}</ul>` : ""}
  </div>`;
}

function renderSensorAnalyses(hive) {
  const s = hive?.colony?.sensors;
  if (!s) return "";
  const rows = [
    ["ir", "IR trafik", s.ir],
    ["weight", "Tartı", s.weight],
    ["audio", "Mikrofon", s.audio],
    ["vibration", "Titreşim", s.vibration],
    ["connectivity", "Bağlantı", s.connectivity],
    ["corner", "4 köşe", s.corner],
  ]
    .filter(([, , data]) => data?.ariciya)
    .map(
      ([, title, data]) =>
        `<div class="sensor-row"><strong>${title}</strong><span>${data.ariciya}${data.quality?.score != null && title === "Titreşim" ? ` · SH %${data.quality.shParityPct}` : ""}</span></div>`
    )
    .join("");
  const pairs = (s.pairs?.pairs || [])
    .map((p) => `<li><strong>${p.label}</strong> — ${p.yorum}</li>`)
    .join("");
  const celiskiler = (s.pairs?.celiskiler || [])
    .map((c) => `<li class="warn-text">${c.label} → ${c.cozum}</li>`)
    .join("");
  if (!rows && !pairs) return "";
  return `<div class="sensors-block">
    <strong>Sensör analizleri</strong>
    ${rows ? `<div class="sensor-grid">${rows}</div>` : ""}
    ${pairs ? `<p class="muted gate-sub">İki sensör birleşimi</p><ul class="wx-tips">${pairs}</ul>` : ""}
    ${celiskiler ? `<p class="muted gate-sub">Çelişkiler</p><ul class="wx-tips">${celiskiler}</ul>` : ""}
  </div>`;
}

function renderFusion(hive) {
  const f = hive?.sensorFusion;
  if (!f || f.mod === "off") return "";
  const kanitlar = (f.kanitlar || [])
    .map((k) => `<li><strong>${k.kaynak}:</strong> ${k.metin}</li>`)
    .join("");
  const yapilacaklar = (f.yapilacaklar || [])
    .map((y) => `<li><span class="gate-pri p${y.oncelik}">Ö${y.oncelik}</span> ${y.ne} <span class="muted">(${y.kaynak})</span></li>`)
    .join("");
  const celiskiler = (f.celiskiler || [])
    .map((c) => `<li class="warn-text">${c.label} — ${c.cozum}</li>`)
    .join("");
  const oz = f.sensorOzeti || {};
  const ozetLine = Object.entries(oz)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return `<div class="fusion-block">
    <strong>Kovan özeti (tüm sensörler)</strong>
    <span class="fusion-badge">güven: ${f.guven || "—"}</span>
    <p>${f.ariciya || f.ozet || "—"}</p>
    ${ozetLine ? `<p class="fusion-meta muted">${ozetLine}</p>` : ""}
    ${kanitlar ? `<p class="muted gate-sub">Kanıtlar</p><ul class="wx-tips">${kanitlar}</ul>` : ""}
    ${celiskiler ? `<p class="muted gate-sub">Çelişkiler</p><ul class="wx-tips">${celiskiler}</ul>` : ""}
    ${yapilacaklar ? `<p class="muted gate-sub"><strong>Yapılacaklar</strong></p><ul class="wx-tips gate-todo">${yapilacaklar}</ul>` : ""}
  </div>`;
}

function renderDeepScores(hive) {
  const d = hive?.colony?.scoresDeep;
  const blocks = [];
  if (d) {
    for (const [key, title] of [
      ["swarm", "Oğul (derin)"],
      ["disease", "Hastalık (derin)"],
      ["health", "Sağlık (derin)"],
      ["brood", "Yavru / nektar"],
    ]) {
      const s = d[key];
      if (!s?.ariciya) continue;
      const kat = (s.katkilar || s.muayene || [])
        .slice(0, 3)
        .map((k) => `<li>${k.label || k}</li>`)
        .join("");
      const on = (s.oneriler || []).map((o) => `<li>${o}</li>`).join("");
      blocks.push(`<div class="deep-block">
        <strong>${title}</strong>
        <p>${s.ariciya}</p>
        ${s.tahminGun ? `<p class="muted">Tahmin penceresi: ${s.tahminGun} gün</p>` : ""}
        ${kat ? `<ul class="wx-tips">${kat}</ul>` : ""}
        ${on ? `<ul class="wx-tips">${on}</ul>` : ""}
      </div>`);
    }
  }
  const cal = hive.colony?.calibration;
  const pred = hive.colony?.predictive;
  const wx = hive.colony?.weatherIndices;
  const meta = hive.colony?.metaInsights;
  const tr = hive.colony?.transport;
  if (cal?.ariciya) {
    blocks.push(`<div class="deep-block"><strong>Kalibrasyon</strong><p>${cal.ariciya}</p></div>`);
  }
  if (pred?.ariciya) {
    blocks.push(`<div class="deep-block"><strong>Tahmin</strong><p>${pred.ariciya}</p></div>`);
  }
  if (wx?.ariciya) {
    blocks.push(`<div class="deep-block"><strong>Hava indeksleri</strong><p>${wx.ariciya}</p></div>`);
  }
  if (meta?.ariciya) {
    blocks.push(`<div class="deep-block"><strong>Kayıt / meta</strong><p>${meta.ariciya}</p></div>`);
  }
  if (tr?.mod !== "sabit" && tr?.ariciya) {
    blocks.push(`<div class="deep-block"><strong>Taşıma</strong><p>${tr.ariciya}</p></div>`);
  }
  blocks.push(renderExtendedAnalyses(hive));
  if (!blocks.filter(Boolean).length) return "";
  return `<div class="deep-scores">${blocks.filter(Boolean).join("")}</div>`;
}

function renderExtendedAnalyses(hive) {
  const c = hive?.colony || {};
  const parts = [];
  const add = (title, obj, warn) => {
    if (!obj?.ariciya || obj?.mod === "off") return;
    parts.push(`<div class="deep-block ${warn ? "warn-block" : ""}">
      <strong>${title}</strong>
      <p>${obj.ariciya}</p>
      ${obj.oneriler?.length ? `<ul class="wx-tips">${obj.oneriler.map((o) => `<li>${o}</li>`).join("")}</ul>` : ""}
    </div>`);
  };
  add("Akustik ML", c.acousticMl, ["queenless", "swarm_prep", "robbing"].includes(c.acousticMl?.baskin?.key));
  if (c.acousticMl?.quality?.score != null) {
    parts.push(`<div class="deep-block muted tip-inline">
      SH parity %${c.acousticMl.quality.shParityPct ?? "—"} · etiket ${c.acousticMl.quality.acousticLabeledSamples ?? 0} · ${c.acousticMl.method ?? "—"}
    </div>`);
  }
  add("Hasat zamanı", c.harvest, c.harvest?.durum === "hazir");
  add("GPS / eğim", c.gpsTilt, c.gpsTilt?.devrilme);
  add("Muayene günlüğü", c.inspectionJournal, ["kritik", "gecikmis"].includes(c.inspectionJournal?.durum));
  add("Pollination ROI", c.pollination?.mod === "calisiyor" ? c.pollination : null, c.pollination?.durum === "dusuk");
  add("Healthy Hive", c.healthyHive, (c.healthyHive?.healthyHiveIndex ?? 100) < 55);
  add("Yavru alanı", c.broodZone, (c.broodZone?.quality?.score ?? c.broodZone?.skor ?? 100) < 75);
  const bz = c.broodZone;
  if (bz?.quality?.score != null) {
    parts.push(`<div class="deep-block muted tip-inline">
      SH parity %${bz.quality.shParityPct ?? "—"} · ${bz.olcum ?? "—"} · prob ${bz.probTempC ?? "—"}°C / model ${bz.modelTempC ?? "—"}°C
    </div>`);
  }
  add("Kış store", c.winterStore, c.winterStore?.durum === "kritik");
  add("Queenless füzyon", c.queenlessFusion, (c.queenlessFusion?.queenlessSkoru ?? 0) >= 45);
  add("Varroa proxy", c.varroa, (c.varroa?.varroaSkoru ?? 0) >= 45);
  add("Yağma", c.robbing, c.robbing?.durum === "aktif" || c.robbing?.durum === "suphe");
  add("Çiçek ziyareti", c.flowerVisit, (c.flowerVisit?.flowerVisitIndex ?? 100) < 40);
  add("Tek taraf tartı", c.singleSideScale, (c.singleSideScale?.quality?.score ?? 0) < 90);
  const ss = c.singleSideScale;
  if (ss?.quality?.score != null && ss?.sides) {
    parts.push(`<div class="deep-block muted tip-inline">
      BM parity %${ss.quality.bmParityPct ?? "—"} · ön ${ss.sides.on} / arka ${ss.sides.arka} kg · ref ${ss.quality.referenceSingleSideKg ?? "—"} kg
    </div>`);
  }
  add("Hava istasyonu", c.weatherStation);
  if (hive?.apiaryPollination?.present) {
    parts.push(`<div class="deep-block"><strong>Arılık pollination</strong><p>${hive.apiaryPollination.ariciya}</p></div>`);
  }
  return parts.join("");
}

function runtimeClass(runtime) {
  if (runtime === "calisti") return "rt-ok";
  if (runtime === "uyari") return "rt-warn";
  if (runtime === "atlandi") return "rt-skip";
  if (runtime === "ariza") return "rt-fault";
  if (runtime === "degraded") return "rt-degraded";
  if (runtime === "veri_yok") return "rt-miss";
  return "rt-plan";
}

function runtimeLabel(runtime) {
  const map = {
    calisti: "Çalıştı",
    atlandi: "Atlandı",
    veri_yok: "Veri yok",
    ariza: "Arıza",
    degraded: "Kısmi mod",
    plan: "Plan",
  };
  return map[runtime] || runtime;
}

function durumBadge(durum) {
  const map = {
    calisiyor: "Çalışıyor",
    demo: "Demo",
    plan: "Plan",
    kapali: "Kapalı",
  };
  return map[durum] || durum;
}

function renderAnalizCatalog() {
  if (!analysisCatalog) {
    analizEl.classList.add("hidden");
    return;
  }
  const c = analysisCatalog;
  const katmanLabel = c.katmanLabel || {};
  const durumLabel = c.durumLabel || {};
  const rows = (c.analizler || [])
    .map((a) => {
      const kat = katmanLabel[a.katman] || a.katman;
      const dur = durumLabel[a.durum] || a.durum;
      return `<tr class="analiz-row durum-${a.durum}">
        <td class="analiz-id">${a.id}</td>
        <td>${a.ad}</td>
        <td>${kat}</td>
        <td class="muted">${a.kaynak}</td>
        <td><span class="analiz-badge ${a.durum}">${dur}</span></td>
        <td class="muted mono">${a.modul}</td>
      </tr>`;
    })
    .join("");

  const fleet = c.fleet || {};
  analizEl.innerHTML = `
    <div class="analiz-head">
      <h2>Analiz kataloğu</h2>
      <p class="analiz-summary">
        <strong>${c.toplam}</strong> analiz ·
        <span class="ok">${c.calisiyor} çalışıyor</span> ·
        <span class="demo">${c.demo} demo</span> ·
        <span class="plan">${c.plan} plan</span>
        ${fleet.kovanSayisi ? ` · filoda ort. <strong>${fleet.ortalamaCalisti}</strong> analiz/kovan · <strong>${fleet.toplamUyari}</strong> uyarı` : ""}
      </p>
      <p class="muted analiz-hint">Yeni analiz: <code>packages/shared/analysisRegistry.js</code> · API: <code>/api/analyses</code></p>
    </div>
    <details class="analiz-details" open>
      <summary>Tüm analizler (${c.toplam})</summary>
      <table class="analiz-table">
        <thead><tr><th>ID</th><th>Ad</th><th>Katman</th><th>Kaynak</th><th>Durum</th><th>Modül</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </details>
    <div id="hive-analiz" class="hive-analiz hidden"></div>`;
  analizEl.classList.remove("hidden");
}

function renderHiveAnalyses(status) {
  const host = document.getElementById("hive-analiz");
  if (!host) return;
  if (!status?.analizler?.length) {
    host.classList.add("hidden");
    return;
  }
  const rows = status.analizler
    .map((a) => {
      const rt = a.uyari ? "uyari" : a.runtime;
      return `<tr class="analiz-row ${runtimeClass(rt)}">
        <td>${a.ad}</td>
        <td><span class="analiz-badge ${a.katman}">${a.katman}</span></td>
        <td><span class="analiz-badge ${a.durum}">${durumBadge(a.durum)}</span></td>
        <td>${runtimeLabel(a.runtime)}${a.uyari ? " ⚠" : ""}</td>
        <td class="muted analiz-ozet">${a.ozet || "—"}</td>
      </tr>`;
    })
    .join("");
  host.innerHTML = `
    <h3>Kovan ${status.hiveId} — analiz durumu</h3>
    <p class="analiz-summary">
      <strong>${status.calisti}</strong> / ${status.toplam} çalıştı ·
      ${status.atlandi} atlandı ·
      <span class="warn-text">${status.uyari} uyarı</span>
    </p>
    <table class="analiz-table hive-analiz-table">
      <thead><tr><th>Analiz</th><th>Katman</th><th>Katalog</th><th>Runtime</th><th>Özet</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  host.classList.remove("hidden");
}

async function loadHiveAnalyses(hiveId) {
  if (hiveAnalysisCache.has(hiveId)) {
    renderHiveAnalyses(hiveAnalysisCache.get(hiveId));
    return;
  }
  try {
    const status = await fetch(`/api/hives/${hiveId}/analyses`).then((r) => r.json());
    hiveAnalysisCache.set(hiveId, status);
    renderHiveAnalyses(status);
  } catch {
    renderHiveAnalyses(null);
  }
}

function renderApiaryFusion(hive) {
  const af = hive?.apiaryFusion;
  if (!af?.present) return "";
  const bulgular = (af.bulgular || []).map((b) => `<li>${b}</li>`).join("");
  const yap = (af.yapilacaklar || [])
    .map((y) => `<li><span class="gate-pri p${y.oncelik}">Ö${y.oncelik}</span> ${y.ne}</li>`)
    .join("");
  return `<div class="apiary-fusion-block">
    <strong>Arılık birleşik analizi</strong>
    <span class="fusion-badge">${af.konumEtiket} · ${af.kovanSayisi} kovan</span>
    <p>${af.ariciya || af.yapilacakOzet}</p>
    <p class="fusion-meta muted">Ort. skor ${af.ortalama?.skor} · ort. çıkış ${af.ortalama?.irOut} · oğul ${af.ortalama?.ogulRisk}</p>
    ${bulgular ? `<ul class="wx-tips">${bulgular}</ul>` : ""}
    ${yap ? `<p class="muted gate-sub">Arılık yapılacaklar</p><ul class="wx-tips gate-todo">${yap}</ul>` : ""}
  </div>`;
}

async function setHiveKonum(hiveId, konumId) {
  const res = await fetch(`/api/hives/${hiveId}/konum`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ konumId }),
  });
  if (!res.ok) return;
  await load();
  selectedId = hiveId;
  renderList();
}

function selectedHiveIds() {
  return [...document.querySelectorAll(".hive-pick:checked")].map((el) =>
    Number(el.dataset.id)
  );
}

function renderApiaryLocBar() {
  const sumEl = document.getElementById("apiary-loc-summary");
  const sel = document.getElementById("bulk-konum-select");
  const gsel = document.getElementById("bulk-group-select");
  if (!sumEl || !sel) return;
  const moving = allLocations.filter((l) => l.durum === "tasiniyor");
  const gpsN = allLocations.filter((l) => l.gpsModulePresent).length;
  const grpGps = allGroups.filter((g) => g.gpsModulePresent).length;
  sumEl.textContent = `${allLocations.length} merkez · ${allGroups.length} grup (${grpGps} GPS) · ${gpsN} arılık GPS · zincir: kovan→grup→arılık→manuel`;
  sel.innerHTML = allLocations
    .map(
      (l) =>
        `<option value="${l.id}">${l.etiket}${l.gpsModulePresent ? " ·GPS" : ""}${l.durum === "tasiniyor" ? " ·taşınıyor" : ""}</option>`
    )
    .join("");
  if (gsel) {
    gsel.innerHTML =
      `<option value="">— grup —</option>` +
      allGroups
        .map(
          (g) =>
            `<option value="${g.id}">${g.etiket} (${g.uyeSayisi || 0})${g.gpsModulePresent ? " ·GPS" : ""}${g.durum === "tasiniyor" ? " ·taşınıyor" : ""}</option>`
        )
        .join("");
  }
}

async function bulkAssignKonum() {
  const hiveIds = selectedHiveIds();
  const konumId = document.getElementById("bulk-konum-select")?.value;
  const groupId = document.getElementById("bulk-group-select")?.value || undefined;
  if (!hiveIds.length || !konumId) {
    const s = document.getElementById("apiary-loc-summary");
    if (s) s.textContent = "Önce listeden kovan seç + konum seç";
    return;
  }
  await fetch("/api/hives/konum/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hiveIds, konumId, ...(groupId ? { groupId } : {}) }),
  });
  await load();
}

async function bulkAssignGroup() {
  const hiveIds = selectedHiveIds();
  const groupId = document.getElementById("bulk-group-select")?.value;
  if (!hiveIds.length || !groupId) {
    const s = document.getElementById("apiary-loc-summary");
    if (s) s.textContent = "Kovan seç + grup seç";
    return;
  }
  await fetch(`/api/groups/${groupId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hiveIds }),
  });
  await load();
}

async function startTransportUi() {
  const hiveIds = selectedHiveIds();
  const hedefId = document.getElementById("bulk-konum-select")?.value;
  const groupId = document.getElementById("bulk-group-select")?.value;
  if (!hiveIds.length || !hedefId) {
    const s = document.getElementById("apiary-loc-summary");
    if (s) s.textContent = "Taşıma için kovan + hedef merkez seç";
    return;
  }
  const first = allHives.find((h) => hiveIds.includes(h.hiveId));
  const fromId = first?.konumId || first?.apiaryLocation?.konumId || "ev";
  const fromLoc = allLocations.find((l) => l.id === fromId);
  const toLoc = allLocations.find((l) => l.id === hedefId);
  const guzergah = [fromLoc?.etiket || fromId, toLoc?.etiket || hedefId];
  if (groupId) {
    await fetch(`/api/groups/${groupId}/transport/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hedefKonumId: hedefId,
        guzergah,
        not: "UI grup taşıma",
      }),
    });
  } else {
    await fetch(`/api/apiaries/${fromId}/transport/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hedefKonumId: hedefId,
        guzergah,
        hiveIds,
        not: "UI taşıma",
      }),
    });
  }
  await fetch("/api/hives/konum/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hiveIds, konumId: fromId, ...(groupId ? { groupId } : {}) }),
  });
  await load();
  const s = document.getElementById("apiary-loc-summary");
  if (s) s.textContent = `TAŞINIYOR: ${guzergah.join(" → ")} · ${hiveIds.length} kovan`;
}

function renderSensorHealth(hive) {
  const sh = hive?.sensorHealth || hive?.colony?.sensorHealth;
  if (!sh || sh.mode === "full") return "";
  const cls = sh.mode === "critical" ? "critical" : "degraded";
  const down = (sh.down || []).map((d) => d.label || d.id).join(", ");
  const fb = (sh.fallbacks || []).join(" · ");
  return `<div class="sensor-health ${cls}">
    <strong>${sh.mode === "critical" ? "Kritik arıza" : "Kısmi mod — izleme devam"}</strong>
    <p>${sh.ariciya || "—"}</p>
    ${down ? `<p class="muted">Devre dışı: ${down}</p>` : ""}
    ${fb ? `<p class="muted">Yedek kaynak: ${fb}</p>` : ""}
  </div>`;
}

function renderHardwareIntegrity(hive) {
  const ig = hive?.hardwareIntegrity;
  if (!ig) return "";
  const sensorBars = (ig.sensors || [])
    .map((s) => {
      const cls = s.ok ? "ok" : "bad";
      return `<span class="hw-sensor ${cls}" title="${s.label}: ${s.status}">${s.label}</span>`;
    })
    .join("");
  const impacts = (ig.impacts || [])
    .slice(0, 3)
    .map(
      (imp) => `<li><strong>${imp.sensorLabel}</strong> → ${imp.analyses
        .slice(0, 4)
        .map((a) => a.ad)
        .join(", ")}${imp.analyses.length > 4 ? "…" : ""} <span class="muted">(${imp.fallback})</span></li>`
    )
    .join("");
  return `<div class="hw-integrity ${ig.bandClass}">
    <div class="hw-head">
      <strong>Donanım bütünlüğü</strong>
      <span class="hw-score">${ig.score}%</span>
      <span class="hw-band">${ig.bandLabel}</span>
      <span class="hw-pkg muted">${ig.packageLabel}</span>
    </div>
    <p class="hw-msg">${ig.ariciya}</p>
    <div class="hw-sensors">${sensorBars}</div>
    <p class="muted hw-meta">Sensör ${ig.sensorScore}% · Analiz ${ig.analysisScore}% · ${ig.analysisSummary?.calisti ?? "—"} aktif / ${ig.analysisSummary?.degraded ?? "—"} kısmi</p>
    ${impacts ? `<ul class="hw-impact">${impacts}</ul>` : ""}
  </div>`;
}

function renderSensors(hive) {
  if (!hive) {
    sensorsEl.classList.add("hidden");
    return;
  }
  const c = hive.colony || {};
  const w = hive.weather || {};
  const imb = cornerImbalance(hive.cornerKg);
  const cs = hive.cornerScale || hive.colony?.calibration?.cornerScale;
  const corners = Array.isArray(hive.cornerKg)
    ? hive.cornerKg.map((x) => Number(x).toFixed(2)).join(" / ")
    : "—";
  const cornerMeta = cs
    ? `<span class="muted"> · kal ${cs.score}/100${cs.factoryCalibCert ? " · fabrika sert." : ""}${cs.integrity?.ok ? " · bütünlük OK" : ""}</span>`
    : "";
  const cornerBtn =
    cs?.suggestOffsets && !hive.hiveConfig?.cornerOffsetsKg
      ? `<button type="button" class="btn-ml btn-corner-cal" data-hive="${hive.hiveId}">Köşe kalibre et</button>`
      : hive.hiveConfig?.cornerOffsetsKg
        ? `<span class="muted tip-inline">offset kalibre</span>`
        : "";
  const cam = hive.hiveCamera?.mod === "degraded"
    ? `arıza · ${hive.hiveCamera?.ariciya?.slice(0, 40) || "—"}`
    : hive.cameraPresent
      ? `var · CV ${hive.hiveCamera?.counts?.inPerInterval ?? hive.cameraBeeIn ?? "—"}/${hive.hiveCamera?.counts?.outPerInterval ?? hive.cameraBeeOut ?? "—"}`
      : "veri yok";
  const mainCam = hive.mainCameraPresent || hive.apiaryCamera?.mod === "live"
    ? `var · ${hive.apiaryCamera?.konumEtiket || hive.konumEtiket}`
    : hive.apiaryCamera?.mod === "degraded"
      ? "arıza · yedek mod"
      : hive.apiaryCamera?.mod === "optional"
        ? "yok · IR izleme"
        : "yok";
  const locOptions = (
    allLocations.length
      ? allLocations
      : [
          { id: "ev", etiket: "Ev" },
          { id: "yayla-tortum", etiket: "Yayla Tortum" },
          { id: "yayla-2", etiket: "Yayla 2" },
        ]
  )
    .map((l) => {
      const sel =
        hive.konumId === l.id || hive.konumEtiket === l.etiket ? "selected" : "";
      return `<option value="${l.id}" ${sel}>${l.etiket}</option>`;
    })
    .join("");
  const tips = (w.tips || []).map((t) => `<li>${t}</li>`).join("");
  const brood = c.broodEmergence || {};
  const temp = c.temperature || {};
  const tempNedenler = (temp.nedenler || [])
    .map((n) => `<li><strong>${n.tip === "artis" ? "↑" : n.tip === "dusus" ? "↓" : "·"}</strong> ${n.label}</li>`)
    .join("");
  const tempOneriler = (temp.oneriler || []).map((o) => `<li>${o}</li>`).join("");
  const tempBlock = temp.tempC != null
    ? `<div class="temp-block">
      <strong>Sıcaklık değerlendirmesi</strong>
      <p>${temp.ariciya || `${hive.tempC} °C`}</p>
      <div class="temp-meta muted">
        Skor ${temp.tempScore ?? "—"} · ${temp.trendLabel || "—"}
        ${temp.delta6hC != null ? ` · Δ6s ${temp.delta6hC > 0 ? "+" : ""}${temp.delta6hC}°C` : ""}
        ${temp.disTempC != null ? ` · dış ${temp.disTempC}°C` : ""}
      </div>
      ${tempNedenler ? `<ul class="wx-tips">${tempNedenler}</ul>` : ""}
      ${tempOneriler ? `<p class="muted">Öneri:</p><ul class="wx-tips">${tempOneriler}</ul>` : ""}
    </div>`
    : "";
  const broodBlock =
    brood.active || brood.weightGain21dKg > 0.3
      ? `<div class="brood">
      <strong>Yavru çıkışı (yaz)</strong>
      <div>${fmtBrood(brood)}</div>
      ${brood.note ? `<p class="muted brood-note">${brood.note}</p>` : ""}
    </div>`
      : "";

  sensorsEl.innerHTML = `
    <h2>Kovan ${hive.hiveId}${hive.scenarioLabel ? " — " + hive.scenarioLabel : ""}</h2>
    <div class="pt-launch">
      <a class="pt-launch-btn" href="/petek-tarama.html?hiveId=${hive.hiveId}">Kovan Petek Tarama — kalibrasyon</a>
      <span class="muted tip-inline">Telefon ile 10 aralık · başlangıç skoru</span>
    </div>
    ${renderScoreRevision(hive)}
    <div id="trend-analysis" class="trend-analysis loading"><p class="muted">Grafik analiz yükleniyor…</p></div>
    ${renderHardwareIntegrity(hive)}
    ${renderSensorHealth(hive)}
    ${renderDurumlar(hive)}
    ${tempBlock}
    ${renderHumidity(hive)}
    ${renderCamera(hive)}
    ${renderSensorAnalyses(hive)}
    ${renderFusion(hive)}
    ${renderDeepScores(hive)}
    ${renderApiaryFusion(hive)}
    ${renderGate(hive)}
    ${broodBlock}
    <div class="weather">
      <strong>Hava (${w.konumEtiket || hive.konumEtiket || "Ev"})</strong>
      <div>${weatherLine(w)}</div>
      ${tips ? `<ul class="wx-tips">${tips}</ul>` : ""}
    </div>
    <dl>
      <dt>Çapraz</dt><dd>${hive.capraz || "—"}</dd>
      <dt>Konum</dt>
      <dd>
        <select id="konum-select" aria-label="Kovan konumu">${locOptions}</select>
        <span class="muted tip-inline">${hive.konumTipi || "ev"} · ${hive.apiaryLocation?.konumKaynak || "manuel"}${hive.apiaryLocation?.gpsModulePresent ? " · GPS" : " · GPS yok"}${hive.apiaryLocation?.group ? ` · ${hive.apiaryLocation.group.etiket}` : ""}</span>
        ${hive.apiaryLocation?.apiaryDurum === "tasiniyor" ? `<span class="warn-text"> · TAŞINIYOR ${Array.isArray(hive.apiaryLocation.guzergah) ? hive.apiaryLocation.guzergah.join(" → ") : ""}</span>` : ""}
        ${hive.apiaryLocation?.needManual ? `<span class="warn-text"> · manuel lat/lon gerekli</span>` : ""}
      </dd>
      ${c.gpsTilt?.ariciya ? `<dt>Merkez konum</dt><dd>${c.gpsTilt.ariciya}</dd>` : ""}
      ${hive.apiaryLocation?.chain ? `<dt>Konum zinciri</dt><dd class="muted tip-inline">${hive.apiaryLocation.chain.join(" → ")} · şu an <strong>${hive.apiaryLocation.konumKaynak}</strong></dd>` : ""}
      <dt>Ana durumu</dt><dd>${hive.anaDurum || "var"}${hive.queenlessSuspect ? " · şüphe" : ""}</dd>
      <dt>Durum</dt><dd>${hiveStatusTr(hive.status)}${hive.sensorHealth?.mode === "degraded" ? " · kısmi mod" : ""}${hive.fault && hive.status !== "degraded" ? " · arıza: " + faultTr(hive.fault) : ""}</dd>
      <dt>Tartı</dt><dd>${hive.weightKg} kg</dd>
      <dt>4 köşe</dt><dd>${corners}${imb != null ? ` · fark ${imb} kg` : ""}${cornerMeta} ${cornerBtn}</dd>
      <dt>Kovan sıcaklık</dt><dd>${hive.tempC} °C <span class="muted">(iç)</span>${c.temperature?.tempLabel ? ` · ${c.temperature.tempLabel}` : ""}${c.temperature?.trendLabel ? ` · ${c.temperature.trendLabel}` : ""}</dd>
      <dt>Nem</dt><dd>%${hive.humidity}</dd>
      <dt>IR in / out</dt><dd>${hive.beeIn} / ${hive.beeOut}${hive.colony?.sensors?.ir?.quality?.score != null ? ` · kalite ${hive.colony.sensors.ir.quality.score}/100` : ""}</dd>
      <dt>Mikrofon</dt><dd>RMS ${hive.audioRms ?? "—"}${hive.colony?.acousticMl?.quality?.score != null ? ` · kalite ${hive.colony.acousticMl.quality.score}/100` : ""}</dd>
      <dt>Titreşim</dt><dd>${hive.vibration ?? "—"}${hive.colony?.sensors?.vibration?.quality?.score != null ? ` · kalite ${hive.colony.sensors.vibration.quality.score}/100` : ""}</dd>
      <dt>Pil</dt><dd>%${hive.battery}</dd>
      <dt>LoRa RSSI</dt><dd>${hive.rssi ?? "—"} dBm</dd>
      <dt>Kamera (kovan)</dt><dd class="${hive.cameraPresent ? "" : "muted"}">${cam}</dd>
      <dt>Ana kamera (arılık)</dt><dd class="${hive.mainCameraPresent || hive.apiaryCamera?.present ? "" : "muted"}">${mainCam}</dd>
      <dt>Skor / sağlık / hastalık / oğul</dt>
      <dd>${c.score ?? "—"} / ${c.healthScore ?? "—"} / ${c.diseaseRiskScore ?? "—"} / ${c.swarmRiskScore ?? "—"}</dd>
      <dt>Arı</dt><dd>${fmtBees(c.beeEstimate, c.beeSwarmTierLabel)}</dd>
      <dt>Yavru çıkışı</dt><dd>${fmtBrood(brood)}</dd>
    </dl>
    <div class="journal-panel">
      <strong>Muayene / ilaç / besleme günlüğü</strong>
      <p class="muted tip-inline">${c.inspectionJournal?.ariciya || "Kayıt ekle — saha verisi olmadan skor artışı"}</p>
      <div class="journal-form">
        <select id="journal-tip" aria-label="Kayıt tipi">
          <option value="muayene">Muayene</option>
          <option value="ilac">İlaç</option>
          <option value="besleme">Besleme</option>
        </select>
        <input type="text" id="journal-not" placeholder="Not" maxlength="200" />
        <input type="text" id="journal-extra" placeholder="İlaç / besleme adı" maxlength="80" />
        <button type="button" id="journal-save" class="btn-ml">Günlüğe ekle</button>
      </div>
      <ul id="journal-list" class="journal-list muted"><li>Yükleniyor…</li></ul>
    </div>
    <div class="ml-label-panel">
      <strong>Muayene etiketi (ML)</strong>
      <p class="muted tip-inline">Saha gözlemini kaydet — model eğitimi için hedef değişken.</p>
      <div class="ml-label-row">
        <select id="ml-event-type" aria-label="Olay tipi">
          <option value="inspection">Muayene</option>
          <option value="normal">Normal</option>
          <option value="queen_present">Ana var</option>
          <option value="queenless">Ana kaybı şüphesi</option>
          <option value="swarm_risk">Oğul riski</option>
          <option value="swarm_occurred">Oğul gerçekleşti</option>
          <option value="varroa">Varroa</option>
          <option value="robbing">Yağma</option>
          <option value="sensor_fault">Sensör arızası</option>
          <option value="harvest">Hasat</option>
          <option value="other">Diğer</option>
        </select>
        <input type="text" id="ml-notes" placeholder="Not (opsiyonel)" maxlength="200" />
        <button type="button" id="ml-save-label" class="btn-ml">Kaydet</button>
      </div>
      <p id="ml-label-status" class="ml-label-status muted"></p>
    </div>`;
  sensorsEl.classList.remove("hidden");

  const selEl = document.getElementById("konum-select");
  if (selEl) {
    selEl.addEventListener("change", () => {
      setHiveKonum(hive.hiveId, selEl.value);
    });
  }
  const kapiMod = document.getElementById("kapi-mod");
  const kapiHedef = document.getElementById("kapi-hedef");
  const kapiApply = document.getElementById("kapi-apply");
  if (kapiMod && kapiHedef) {
    kapiMod.addEventListener("change", () => {
      kapiHedef.disabled = kapiMod.value === "otomatik";
    });
  }
  if (kapiApply && kapiMod && kapiHedef) {
    kapiApply.addEventListener("click", () => {
      setHiveKapi(hive.hiveId, kapiMod.value, kapiHedef.value);
    });
  }
  const mlSave = document.getElementById("ml-save-label");
  if (mlSave) {
    mlSave.addEventListener("click", () => saveMlLabel(hive.hiveId));
  }
  loadJournalPanel(hive.hiveId);
  loadHiveAnalyses(hive.hiveId);
  trendCache.delete(hive.hiveId);
  loadTrendCharts(hive.hiveId);

  const cornerCalBtn = sensorsEl.querySelector(".btn-corner-cal");
  if (cornerCalBtn && !cornerCalBtn.dataset.bound) {
    cornerCalBtn.dataset.bound = "1";
    cornerCalBtn.addEventListener("click", async () => {
      cornerCalBtn.disabled = true;
      cornerCalBtn.textContent = "Kalibre ediliyor…";
      try {
        await fetch(`/api/hives/${hive.hiveId}/calibrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoCornerCalibrate: true }),
        });
        await load();
        const updated = allHives.find((h) => h.hiveId === hive.hiveId);
        if (updated) renderSensors(updated);
        loadMasterScore();
      } catch {
        cornerCalBtn.textContent = "Hata — tekrar dene";
        cornerCalBtn.disabled = false;
      }
    });
  }
}

function renderList() {
  const sorted = allHives.filter(matchesFilter).sort((a, b) => a.hiveId - b.hiveId);
  if (selectedId == null && sorted[0]) selectedId = sorted[0].hiveId;

  if (!sorted.length) {
    listEl.innerHTML = '<li class="empty">Bu süzgeçte kovan yok</li>';
    return;
  }

  const head = `
    <li class="row head">
      <span></span>
      <span>#</span>
      <span>kg</span>
      <span>Skor</span>
      <span>Sağlık</span>
      <span>Oğul</span>
      <span>Arı</span>
      <span></span>
    </li>`;

  const rows = sorted
    .map((h) => {
      const c = h.colony || {};
      const degraded = h.status === "degraded" || h.sensorHealth?.mode === "degraded";
      const hwScore = h.hardwareIntegrity?.score;
      const hwBand = h.hardwareIntegrity?.bandClass;
      const warn =
        h.status === "alert" ||
        h.status === "fault" ||
        h.status === "offline" ||
        h.status === "low_battery" ||
        h.status === "weak" ||
        c.swarmPhase === "critical" ||
        c.swarmPhase === "occurred" ||
        (c.beeSwarmTier ?? 0) >= 4;
      const sel = h.hiveId === selectedId ? " selected" : "";
      const dotClass = warn ? "warn" : degraded ? "degraded" : hwBand === "low" || hwBand === "critical" ? "degraded" : "";
      const hwTip = hwScore != null ? ` · bütünlük %${hwScore}` : "";
      const moving = h.apiaryLocation?.apiaryDurum === "tasiniyor" ? " · taşınıyor" : "";
      return `
    <li class="row${sel}" data-id="${h.hiveId}" title="${h.capraz || ""}${hwTip}${moving}">
      <span class="chk"><input type="checkbox" class="hive-pick" data-id="${h.hiveId}" aria-label="Kovan ${h.hiveId} seç" /></span>
      <span class="no">${h.hiveId}</span>
      <span class="kg">${h.weightKg}</span>
      <span class="score ${scoreClass(c.score)}">${c.score ?? "—"}</span>
      <span class="score ${scoreClass(c.healthScore)}">${c.healthScore ?? "—"}</span>
      <span class="risk ${riskClass(c.swarmRiskScore, c.swarmPhase)}">${c.swarmRiskScore ?? "—"}</span>
      <span class="bees ${beeTierClass(c.beeSwarmTier)}" title="${h.capraz || ""}">${fmtBees(c.beeEstimate, c.beeSwarmTierLabel)}</span>
      <span class="dot ${dotClass}"></span>
    </li>`;
    })
    .join("");

  listEl.innerHTML = head + rows;

  listEl.querySelectorAll(".row:not(.head)").forEach((row) => {
    row.addEventListener("click", (ev) => {
      if (ev.target.closest(".hive-pick") || ev.target.closest(".chk")) return;
      selectedId = Number(row.dataset.id);
      const hive = allHives.find((x) => x.hiveId === selectedId);
      renderCare(hive);
      renderSensors(hive);
      listEl.querySelectorAll(".row").forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
    });
  });

  const sel = allHives.find((h) => h.hiveId === selectedId);
  if (sel) {
    renderCare(sel);
    renderSensors(sel);
  }
}

const pushEnableBtn = document.getElementById("push-enable");
const pushStatusEl = document.getElementById("push-status");
const pushInboxEl = document.getElementById("push-inbox");

const PUSH_DEVICE_KEY = "koloni_push_device_id";
let pushDeviceId = localStorage.getItem(PUSH_DEVICE_KEY);
let pushEnabled = false;
let pushPollTimer = null;

function loadSeenPushIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem("koloni_push_seen") || "[]"));
  } catch {
    return new Set();
  }
}

let seenPushIds = loadSeenPushIds();

function saveSeenPushIds() {
  localStorage.setItem("koloni_push_seen", JSON.stringify([...seenPushIds].slice(-200)));
}

function renderPushInbox(messages) {
  if (!pushInboxEl || !messages?.length) {
    if (pushInboxEl) pushInboxEl.classList.add("hidden");
    return;
  }
  const rows = messages
    .slice(0, 8)
    .map(
      (m) =>
        `<div class="push-item ${m.read ? "" : "unread"}" data-id="${m.id}" data-hive="${m.hiveId ?? ""}">
          <strong>${m.title}</strong> — ${m.body}
          <span class="push-time">Ö${m.priority}</span>
        </div>`
    )
    .join("");
  pushInboxEl.innerHTML = rows;
  pushInboxEl.classList.remove("hidden");
  pushInboxEl.querySelectorAll(".push-item").forEach((el) => {
    el.addEventListener("click", () => {
      const id = Number(el.dataset.hive);
      if (id) {
        selectedId = id;
        filter = "all";
        renderFilters();
        renderList();
      }
      if (pushDeviceId) {
        fetch(`/api/push/inbox/${el.dataset.id}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: pushDeviceId }),
        });
      }
      el.classList.remove("unread");
    });
  });
}

async function pollPush(showBrowserNotification = true) {
  if (!pushDeviceId || !pushEnabled) return;
  try {
    const res = await fetch(
      `/api/push/inbox?deviceId=${encodeURIComponent(pushDeviceId)}`
    ).then((r) => r.json());
    const newOnes = (res.messages || []).filter((m) => !seenPushIds.has(m.id));
    for (const m of newOnes) {
      seenPushIds.add(m.id);
      if (showBrowserNotification && Notification.permission === "granted") {
        try {
          new Notification(m.title, { body: m.body, tag: m.id });
        } catch {
          /* sessiz */
        }
      }
    }
    if (newOnes.length) saveSeenPushIds();
    if ((res.unread ?? 0) > 0 || (res.messages || []).length) {
      renderPushInbox(res.messages);
    }
    if (pushStatusEl && pushEnabled) {
      pushStatusEl.textContent = `Aktif · ${res.unread ?? 0} okunmamış push`;
    }
  } catch {
    /* sessiz */
  }
}

async function enablePush() {
  if (!("Notification" in window)) {
    if (pushStatusEl) pushStatusEl.textContent = "Tarayıcı desteklemiyor";
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    if (pushStatusEl) pushStatusEl.textContent = "Bildirim izni reddedildi";
    return;
  }
  const reg = await fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: pushDeviceId || undefined,
      platform: "web",
      label: "Web panel",
      minPriority: 2,
    }),
  }).then((r) => r.json());

  if (!reg.device) return;

  pushDeviceId = reg.device.deviceId;
  localStorage.setItem(PUSH_DEVICE_KEY, pushDeviceId);
  pushEnabled = true;
  if (pushEnableBtn) {
    pushEnableBtn.textContent = "Push açık";
    pushEnableBtn.classList.add("active");
  }

  await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: pushDeviceId }),
  });

  await pollPush(true);

  if (!pushPollTimer) {
    pushPollTimer = setInterval(() => pollPush(true), 15000);
  }
}

if (pushEnableBtn) {
  pushEnableBtn.addEventListener("click", () => {
    if (pushEnabled) {
      pollPush(false);
      return;
    }
    enablePush();
  });
}

if (pushDeviceId && typeof Notification !== "undefined" && Notification.permission === "granted") {
  pushEnabled = true;
  if (pushEnableBtn) {
    pushEnableBtn.textContent = "Push açık";
    pushEnableBtn.classList.add("active");
  }
  fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: pushDeviceId, platform: "web", minPriority: 2 }),
  }).then(() => {
    pollPush(false);
    if (!pushPollTimer) pushPollTimer = setInterval(() => pollPush(true), 15000);
  });
}

async function saveMlLabel(hiveId) {
  const eventType = document.getElementById("ml-event-type")?.value || "inspection";
  const notes = document.getElementById("ml-notes")?.value?.trim() || "";
  const statusEl = document.getElementById("ml-label-status");
  try {
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiveId, eventType, notes }),
    }).then((r) => r.json());
    if (res.error) {
      if (statusEl) statusEl.textContent = `Hata: ${res.error}`;
      return;
    }
    if (statusEl) {
      statusEl.textContent = `Kaydedildi · ${res.label.eventType} · kovan ${hiveId}`;
    }
    loadMlStats();
  } catch {
    if (statusEl) statusEl.textContent = "Kayıt başarısız";
  }
}

async function loadJournalPanel(hiveId) {
  const listEl = document.getElementById("journal-list");
  const saveBtn = document.getElementById("journal-save");
  if (!listEl) return;
  try {
    const data = await fetch(`/api/hives/${hiveId}/journal`).then((r) => r.json());
    const entries = data.entries || [];
    listEl.innerHTML = entries.length
      ? entries
          .slice(0, 8)
          .map(
            (e) =>
              `<li><time>${new Date(e.tarih).toLocaleDateString("tr-TR")}</time> · ${e.tip}${e.ilac ? " · " + e.ilac : ""}${e.besleme ? " · " + e.besleme : ""}${e.not ? " — " + e.not : ""}</li>`
          )
          .join("")
      : "<li>Henüz kayıt yok</li>";
  } catch {
    listEl.innerHTML = "<li>Günlük yüklenemedi</li>";
  }
  if (saveBtn && !saveBtn.dataset.bound) {
    saveBtn.dataset.bound = "1";
    saveBtn.addEventListener("click", async () => {
      const tip = document.getElementById("journal-tip")?.value || "muayene";
      const not = document.getElementById("journal-not")?.value || "";
      const extra = document.getElementById("journal-extra")?.value || "";
      const body = { tip, not, tarih: new Date().toISOString() };
      if (tip === "ilac") body.ilac = extra || "Varroa tedavisi";
      if (tip === "besleme") body.besleme = extra || "Şurup";
      try {
        await fetch(`/api/hives/${hiveId}/journal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await load();
        const hive = allHives.find((h) => h.hiveId === hiveId);
        if (hive) renderSensors(hive);
        loadProLigScore();
      } catch {
        /* ignore */
      }
    });
  }
}

async function loadProLigScore() {
  const scoreEl = document.getElementById("pro-lig-score");
  const bandEl = document.getElementById("pro-lig-band");
  if (!scoreEl) return;
  try {
    const data = await fetch("/api/pro-lig/score").then((r) => r.json());
    scoreEl.textContent = `${data.overall ?? "—"}/100`;
    if (bandEl) {
      const applied = (data.applied || []).map((a) => a.label).join(" · ");
      bandEl.textContent = applied ? `${data.band} · ${applied}` : data.band || "";
    }
  } catch {
    scoreEl.textContent = "—";
  }
  if (window.koloniOffline) window.koloniOffline.updateBadge();
}

async function loadStrengthPreserve() {
  const summaryEl = document.getElementById("strength-summary");
  const listEl = document.getElementById("strength-list");
  if (!listEl) return;
  try {
    const data = await fetch("/api/strength/preserve").then((r) => r.json());
    if (summaryEl) {
      summaryEl.textContent = `${data.count} madde · ort ${data.ortK}→${data.ortBoosted} (+${data.ortDelta})`;
    }
    listEl.innerHTML = (data.items || [])
      .map((item, i) => {
        const shTxt = item.sh ? item.sh : "—";
        const scoreTxt =
          item.delta > 0
            ? `<span class="boost">${item.k}→${item.boosted}</span>`
            : String(item.boosted);
        const sub = item.applied?.length
          ? `<span class="sub">✓ ${item.applied.join(" · ")}</span>`
          : "";
        const not = item.iyilestirme || "—";
        return `<tr class="durum-koru">
          <td>${i + 1}</td>
          <td>${item.g}</td>
          <td title="${escHtml(item.n)}">${escHtml(item.n)}</td>
          <td>${scoreTxt}</td>
          <td>${shTxt}</td>
          <td title="${escHtml(not)}">${escHtml(not)}</td>
        </tr>`;
      })
      .join("");
  } catch {
    if (summaryEl) summaryEl.textContent = "yüklenemedi";
    listEl.innerHTML = "";
  }
}

async function loadMasterScore() {
  const summaryEl = document.getElementById("master-summary");
  const listEl = document.getElementById("master-list");
  if (!listEl) return;
  try {
    const data = await fetch("/api/master/score").then((r) => r.json());
    const koru = (data.items || []).filter((i) => i.durum === "koru" || i.durum === "onde").length;
    const geride = (data.items || []).filter((i) => i.durum === "geride" || i.durum === "kritik").length;
    if (summaryEl) {
      summaryEl.textContent = `${data.count} madde · ${koru} koru/önde · ${geride} iyileştir`;
    }
    listEl.innerHTML = (data.items || [])
      .map((item) => {
        const shTxt = item.sh > 0 ? item.sh : "—";
        const durumClass = item.durum ? `durum-${item.durum}` : "";
        return `<tr class="${durumClass}">
          <td>${item.no}</td>
          <td>${item.g}</td>
          <td title="${escHtml(item.n)}">${escHtml(item.n)}</td>
          <td>${item.k}</td>
          <td>${shTxt}</td>
          <td title="${escHtml(item.not || "—")}">${escHtml(item.not || "—")}</td>
        </tr>`;
      })
      .join("");
  } catch {
    if (summaryEl) summaryEl.textContent = "yüklenemedi";
    listEl.innerHTML = "";
  }
}

async function loadMlStats() {
  if (!mlStatsEl) return;
  try {
    const cfg = await fetch("/api/ml/config").then((r) => r.json());
    const r = cfg.db?.readings?.total ?? 0;
    const l = cfg.db?.labels?.total ?? 0;
    mlStatsEl.textContent = `${r} okuma · ${l} etiket · ${cfg.acoustic?.mode || "rules"}`;
  } catch {
    mlStatsEl.textContent = "ML veri —";
  }
}

async function load() {
  try {
    const [{ hives }, { alerts }, { tasks }, locRes, groupRes, catalogRes] = await Promise.all([
      fetch("/api/hives").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()).catch(() => ({ locations: [] })),
      fetch("/api/groups").then((r) => r.json()).catch(() => ({ groups: [] })),
      fetch("/api/analyses").then((r) => r.json()).catch(() => null),
    ]);

    allHives = hives;
    allTasks = tasks || [];
    allLocations = locRes.locations || [];
    allGroups = groupRes.groups || [];
    analysisCatalog = catalogRes;
    hiveAnalysisCache.clear();

    const unread = alerts.filter((a) => !a.read);
    const faults = alerts.filter((a) => a.type === "sensor_fault");
    if (unread.length) {
      const first = unread[0];
      alarmEl.textContent = `${unread.length} uyarı · ${faults.length} arıza — ${first.message}`;
      alarmEl.classList.remove("hidden");
    } else {
      alarmEl.classList.add("hidden");
    }

    const p1 = allTasks.filter((t) => t.priority === 1).length;
    const analizTxt = analysisCatalog
      ? ` · ${analysisCatalog.aktif} analiz aktif`
      : "";
    summaryEl.textContent = `${hives.length} kovan · ${unread.length} uyarı · ${p1} Öncelik 1 görev · ${faults.length} arıza${analizTxt}`;

    renderFilters();
    renderApiaryLocBar();
    renderAnalizCatalog();
    renderTasks();
    renderList();
    loadMlStats();
    loadProLigScore();
    loadStrengthPreserve();
    loadMasterScore();
  } catch {
    summaryEl.textContent = "Bağlantı yok";
    if (window.koloniOffline?.queueSize?.()) {
  summaryEl.textContent += ` · çevrimdışı kuyruk ${window.koloniOffline.queueSize()}`;
    }
    listEl.innerHTML = '<li class="empty">Sunucuya ulaşılamıyor</li>';
  }
}

load();
setInterval(load, 30000);

document.getElementById("bulk-konum-btn")?.addEventListener("click", () => bulkAssignKonum());
document.getElementById("bulk-group-btn")?.addEventListener("click", () => bulkAssignGroup());
document.getElementById("transport-start-btn")?.addEventListener("click", () => startTransportUi());
