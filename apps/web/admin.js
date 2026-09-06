const KEY_STORAGE = "koloni_admin_key";
const DEFAULT_KEY = "koloni-admin";

let adminKey = localStorage.getItem(KEY_STORAGE) || DEFAULT_KEY;

const authEl = document.getElementById("admin-auth");
const mainEl = document.getElementById("admin-main");
const keyInput = document.getElementById("admin-key");

function headers() {
  return { "X-Admin-Key": adminKey, Accept: "application/json" };
}

async function adminFetch(path) {
  const res = await fetch(path, { headers: headers() });
  if (res.status === 403) {
    authEl.classList.remove("hidden");
    mainEl.classList.add("hidden");
    throw new Error("auth");
  }
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function necBar(score) {
  const cls = score >= 60 ? "" : score >= 30 ? "warn" : "low";
  return `<span class="nec-bar"><i class="${cls}" style="width:${Math.min(100, score)}%"></i></span>`;
}

function renderNecessity(scores) {
  if (!scores) return "—";
  const rows = Object.entries(scores)
    .map(([id, s]) => {
      const obj = typeof s === "object" ? s : { necessity: s, label: id };
      return `<tr>
        <td>${obj.label || id}</td>
        <td>${obj.necessity ?? "—"}${necBar(obj.necessity ?? 0)}</td>
        <td>${obj.operational ?? obj.mlValue ?? "—"}</td>
        <td>${obj.mlValue ?? "—"}</td>
        <td class="muted">${(obj.ariciya || "").slice(0, 55)}</td>
      </tr>`;
    })
    .join("");
  return `<table class="admin-table">
    <thead><tr><th>Sensör</th><th>Gereklilik</th><th>Operasyon</th><th>ML değer</th><th>Not</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderCameraDecision(dec) {
  if (!dec) return "—";
  const cls = `camera-decision action-${dec.action || "izle"}`;
  return `<div class="${cls}">
    <div class="action-label">${dec.actionLabel || dec.action}</div>
    <p>${dec.ariciya || "—"}</p>
    <p class="muted">Gereklilik ${dec.necessity ?? dec.operationalNecessity ?? "—"} · ML katkı ${dec.mlLearningGain ?? "—"}</p>
  </div>`;
}

function renderHardwareImpact(bySensor) {
  if (!bySensor?.length) return "<p class='muted'>Henüz veri yok — öğrenme döngüsü çalıştırın</p>";
  let html = "";
  for (const s of bySensor) {
    const top = (s.analyses || [])
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5)
      .map((a) => `<li>${a.analysisId}: <strong>${a.impactScore}</strong> (${a.samples} örnek)</li>`)
      .join("");
    html += `<div style="margin-bottom:0.75rem"><strong>${s.label || s.sensorId}</strong><ul class="admin-list">${top || "<li>—</li>"}</ul></div>`;
  }
  return html;
}

function renderFleetIntegrity(fi) {
  if (!fi) return "<p class='muted'>Veri yok</p>";
  const rows = (fi.hives || [])
    .slice(0, 15)
    .map(
      (h) => `<tr>
      <td>${h.hiveId}</td>
      <td>${h.score}%</td>
      <td>${h.band || "—"}</td>
      <td>${h.mode}</td>
      <td class="muted">${(h.down || []).join(", ") || "—"}</td>
    </tr>`
    )
    .join("");
  return `<div>Ortalama bütünlük: <strong>${fi.averageScore ?? "—"}%</strong>
    · kısmi mod: ${fi.degradedCount ?? 0} · kritik: ${fi.criticalCount ?? 0}</div>
    <table class="admin-table" style="margin-top:0.5rem">
      <thead><tr><th>Kovan</th><th>Skor</th><th>Band</th><th>Mod</th><th>Arızalı</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>—</td></tr>"}</tbody>
    </table>`;
}

function renderIntegrityMatrix(matrix) {
  if (!matrix?.length) return "<p class='muted'>Matris yüklenemedi</p>";
  const rows = matrix
    .map(
      (r) => `<tr>
      <td><strong>${r.sensorLabel}</strong>${r.critical ? " ⚠" : ""}</td>
      <td class="muted">${r.fallback || "—"}</td>
      <td>${r.durur || "—"}</td>
      <td class="muted">${r.duser || "—"}</td>
    </tr>`
    )
    .join("");
  return `<table class="admin-table">
    <thead><tr><th>Sensör arızası</th><th>Yedek</th><th>Durur</th><th>Düşer</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderReferences(records) {
  if (!records?.length) return "<p class='muted'>Kayıt yok</p>";
  const rows = records
    .slice(0, 40)
    .map(
      (r) => `<tr>
      <td>${r.hiveId}</td>
      <td>${r.domain}</td>
      <td>${r.method?.slice(0, 28) || "—"}</td>
      <td>${r.label?.eventType || "—"}</td>
      <td class="muted">${(r.situation || "").slice(0, 24)}</td>
      <td>${r.ts?.slice(0, 16) || "—"}</td>
    </tr>`
    )
    .join("");
  return `<table class="admin-table">
    <thead><tr><th>Kovan</th><th>Alan</th><th>Yöntem</th><th>Etiket</th><th>Durum</th><th>Zaman</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderApprovals(proposals) {
  const badge = document.getElementById("pending-badge");
  const list = document.getElementById("approval-list");
  const n = proposals?.length || 0;
  badge.textContent = n ? `${n} onay bekliyor` : "Onay bekleyen yok";
  badge.classList.toggle("clear", n === 0);

  if (!n) {
    list.innerHTML =
      "<p class='muted'>Yeni sensör okuması veya etiket geldiğinde burada onay isteyecek.</p>";
    return;
  }

  list.innerHTML = proposals
    .map(
      (p) => `
    <div class="approval-item" data-id="${p.id}">
      <strong>${p.title}</strong>
      <p class="approval-msg">${p.message}</p>
      <p class="approval-improve">${p.improvement?.summary || p.improvement?.ariciya || "—"}</p>
      <p class="muted">${p.recordCount} kayıt · ${(p.domains || []).join(", ")} · ${p.ts?.slice(0, 16) || ""}</p>
      <div class="approval-actions">
        <button type="button" class="btn-approve" data-approve="${p.id}">Onayla</button>
        <button type="button" class="btn-reject" data-reject="${p.id}">Reddet</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", () => approveProposal(Number(btn.dataset.approve)));
  });
  list.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => rejectProposal(Number(btn.dataset.reject)));
  });
}

async function approveProposal(id) {
  await fetch(`/api/admin/ml/proposals/${id}/approve`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedBy: "admin" }),
  });
  await loadDashboard();
}

async function rejectProposal(id) {
  await fetch(`/api/admin/ml/proposals/${id}/reject`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedBy: "admin" }),
  });
  await loadDashboard();
}

function renderDashboard(d) {
  const L = d.learning?.learning || d.learning;
  document.getElementById("learning-badge").textContent = L?.active
    ? "ÖĞRENME AKTİF"
    : "PASİF";
  document.getElementById("learning-badge").classList.toggle("off", !L?.active);

  document.getElementById("learning-status").innerHTML = `
    <div>Mod: <strong>${L?.mode || "—"}</strong> · sürüm ${L?.version || "1"}</div>
    <div>Onay gerekli: <strong>${d.requiresApproval !== false ? "evet" : "hayır"}</strong> · bekleyen: ${d.pendingCount ?? 0}</div>
    <div>Ingest yakalama: ${L?.captureOnIngest ? "açık" : "kapalı"} · analiz: ${L?.captureOnAnalysis ? "açık" : "kapalı"}</div>
    <div>Referans kayıt: <strong>${L?.ml?.referenceRecords ?? 0}</strong> · günlük: ${L?.ml?.learningLogEntries ?? 0}</div>
    <div>Akustik model: ${L?.model?.acoustic?.mode || "—"}</div>`;

  const tq = d.trainingQueue || {};
  document.getElementById("training-queue").innerHTML = `
    Akustik: ${tq.acoustic?.status || "—"} · eksik etiket ~${tq.acoustic?.labelsNeeded ?? "?"}
    · Kamera CV: ${tq.camera_cv?.status || "—"} (${tq.camera_cv?.labeledRefs ?? 0} etiketli ref)`;

  const dq = d.dataQuality || {};
  document.getElementById("data-quality").innerHTML = `
    Okuma: <strong>${dq.readings ?? 0}</strong> · Etiket: <strong>${dq.labels ?? 0}</strong>
    · Oran %${dq.labelRatio ?? 0} · Kovan: ${dq.hives ?? "—"}`;

  document.getElementById("model-status").innerHTML = `
    ONNX: ${L?.model?.acoustic?.fileExists ? "dosya var" : "yok — kural tabanlı"}
    · Yüklü: ${L?.model?.acoustic?.loaded ? "evet" : "hayır"}`;

  renderApprovals(d.pendingProposals || []);
  document.getElementById("necessity-table").innerHTML = renderNecessity(
    d.fleetNecessity?.scores
  );
  document.getElementById("camera-decision").innerHTML = renderCameraDecision(
    d.fleetNecessity?.cameraDecision
  );
  document.getElementById("fleet-integrity").innerHTML = renderFleetIntegrity(
    d.hardwareIntegrity
  );
  document.getElementById("integrity-matrix").innerHTML = renderIntegrityMatrix(
    d.hardwareIntegrity?.impactMatrix
  );
  document.getElementById("hardware-impact").innerHTML = renderHardwareImpact(
    d.hardwareImpact
  );
  document.getElementById("reference-records").innerHTML = renderReferences(
    d.referenceRecords?.recent
  );

  const cov = d.labelCoverage || {};
  document.getElementById("label-coverage").innerHTML = Object.entries(cov)
    .map(([k, v]) => `<div>${k}: <strong>${v}</strong></div>`)
    .join("");

  const log = d.learningLog || [];
  document.getElementById("learning-log").innerHTML = log
    .slice(0, 25)
    .map((e) => `<div>[${e.kind}] ${e.message?.slice(0, 80)}</div>`)
    .join("") || "—";

  const domains = L?.domains || d.referenceRecords?.byDomain || [];
  const sel = document.getElementById("ref-domain");
  if (sel.options.length <= 1 && domains.length) {
    for (const dom of domains) {
      const id = dom.id || dom.domain;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = dom.label || id;
      sel.appendChild(opt);
    }
  }

  document.getElementById("extra-metrics").innerHTML = `
    <li>Filo ortalama bütünlük: ${d.hardwareIntegrity?.averageScore ?? "—"}%</li>
    <li>Filo kamera kararı: ${d.fleetNecessity?.cameraDecision?.actionLabel || "—"}</li>
    <li>Donanım etki satırı: ${d.hardwareImpactMatrix?.length ?? 0}</li>
    <li>Referans alan sayısı: ${(d.referenceRecords?.byDomain || []).length}</li>
    <li>Son güncelleme: ${d.generatedAt?.slice(0, 19) || "—"}</li>
    <li>Otomatik yenileme: 60 sn</li>
  `.replace(/<\/?li>/g, (m) => (m === "<li>" ? "<li>" : "</li>"));
}

async function loadDashboard() {
  try {
    const d = await adminFetch("/api/admin/ml/dashboard");
    renderDashboard(d);
    authEl.classList.add("hidden");
    mainEl.classList.remove("hidden");
  } catch (e) {
    if (e.message !== "auth") console.error(e);
  }
}

async function loadReferences() {
  const domain = document.getElementById("ref-domain").value;
  const q = domain ? `?domain=${encodeURIComponent(domain)}&limit=50` : "?limit=50";
  const d = await adminFetch(`/api/admin/ml/references${q}`);
  document.getElementById("reference-records").innerHTML = renderReferences(d.records);
}

document.getElementById("btn-refresh").addEventListener("click", async () => {
  await adminFetch("/api/admin/ml/learning/refresh");
  await loadDashboard();
});

document.getElementById("btn-ref-load").addEventListener("click", loadReferences);

document.getElementById("btn-auth").addEventListener("click", () => {
  adminKey = keyInput.value.trim() || DEFAULT_KEY;
  localStorage.setItem(KEY_STORAGE, adminKey);
  loadDashboard();
});

if (!localStorage.getItem(KEY_STORAGE)) {
  authEl.classList.remove("hidden");
} else {
  loadDashboard();
}

setInterval(loadDashboard, 60000);
