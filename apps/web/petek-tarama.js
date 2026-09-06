/**
 * Kovan Petek Tarama — rehberli telefon kalibrasyon sihirbazı
 */

const GAP_COUNT = 10;
const SIDES = ["left", "right"];
const SIDE_LABEL = { left: "sol", right: "sağ" };
const SEGMENT_TARGET_SEC = 3;

const params = new URLSearchParams(location.search);
const state = {
  hiveId: Number(params.get("hiveId")) || 1,
  sessionId: null,
  gap: 1,
  sideIdx: 0,
  stream: null,
  recording: false,
  analysis: null,
  audioRmsSamples: [],
  audioCtx: null,
};

const el = (id) => document.getElementById(id);

function showStep(n) {
  [1, 2, 3, 4].forEach((i) => {
    el(`step-${i}`)?.classList.toggle("hidden", i !== n);
    document.querySelector(`.pt-step[data-step="${i}"]`)?.classList.toggle("active", i === n);
    document.querySelector(`.pt-step[data-step="${i}"]`)?.classList.toggle("done", i < n);
  });
}

function showError(id, msg) {
  const node = el(id);
  if (!node) return;
  if (!msg) {
    node.classList.add("hidden");
    node.textContent = "";
    return;
  }
  node.textContent = msg;
  node.classList.remove("hidden");
}

function currentSegment() {
  return { gap: state.gap, side: SIDES[state.sideIdx] };
}

function segLabel() {
  const { gap, side } = currentSegment();
  return `Aralık ${gap} / ${GAP_COUNT} — ${SIDE_LABEL[side]}`;
}

function buildMap(cells) {
  const mapEl = el("petek-map");
  if (!mapEl) return;
  let html = '<div class="petek-map-head"><span>Petek haritası</span><span>Sol | Sağ</span></div>';
  for (let g = 1; g <= GAP_COUNT; g++) {
    html += `<div class="petek-map-row"><span class="petek-gap-no">${g}</span>`;
    for (const side of SIDES) {
      const cell = cells?.find((c) => c.gap === g && c.side === side);
      const st = cell?.status || "pending";
      html += `<button type="button" class="petek-cell ${st}" data-gap="${g}" data-side="${side}" title="Aralık ${g} ${SIDE_LABEL[side]}">${st === "done" ? "✓" : st === "retry" ? "↻" : st === "active" ? "●" : "·"}</button>`;
    }
    html += "</div>";
  }
  mapEl.innerHTML = html;
  mapEl.querySelectorAll(".petek-cell").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.gap = Number(btn.dataset.gap);
      state.sideIdx = SIDES.indexOf(btn.dataset.side);
      updateScanUi();
    });
  });
}

function updateProgress(progress) {
  if (!progress) return;
  el("progress-fill").style.width = `${progress.percent}%`;
  el("progress-label").textContent = `Petek haritası ${progress.done} / ${progress.total} (${progress.percent}%)`;
  buildMap(progress.cells);
}

function updateScanUi() {
  el("scan-title").textContent = segLabel();
  const { gap, side } = currentSegment();
  el("scan-hint").textContent =
    side === "left"
      ? `${gap}. aralığın sol tarafından yakın çekim — petek arasını hizalayın`
      : `${gap}. aralığın sağ tarafından yakın çekim — petek arasını hizalayın`;
}

function nextSegment() {
  if (state.sideIdx < SIDES.length - 1) {
    state.sideIdx++;
  } else if (state.gap < GAP_COUNT) {
    state.gap++;
    state.sideIdx = 0;
  }
  updateScanUi();
}

function firstIncomplete(cells) {
  for (let g = 1; g <= GAP_COUNT; g++) {
    for (const side of SIDES) {
      const c = cells?.find((x) => x.gap === g && x.side === side);
      if (!c || c.status !== "done") {
        state.gap = g;
        state.sideIdx = SIDES.indexOf(side);
        return;
      }
    }
  }
}

/** Görüntü kalite metrikleri (0–1) */
function analyzeFrameQuality(video, canvas) {
  const w = 160;
  const h = Math.round((video.videoHeight / video.videoWidth) * w) || 120;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let sum = 0;
  let sumSq = 0;
  let edge = 0;
  const cx0 = Math.floor(w * 0.25);
  const cx1 = Math.floor(w * 0.75);
  let centerSum = 0;
  let centerN = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 765;
      sum += lum;
      sumSq += lum * lum;
      const gx = Math.abs(d[i] - d[i + 4]);
      const gy = Math.abs(d[i] - d[(y + 1) * w * 4]);
      edge += gx + gy;
      if (x >= cx0 && x <= cx1) {
        centerSum += lum;
        centerN++;
      }
    }
  }
  const n = (w - 2) * (h - 2);
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const brightness = Math.min(1, Math.max(0, mean));
  const blur = Math.min(1, edge / (n * 40));
  const framing = centerN ? Math.min(1, (centerSum / centerN) * 1.15) : 0.5;
  return { brightness, blur, motion: 0.15, framing, variance };
}

async function startCamera() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    const video = el("camera");
    video.srcObject = state.stream;
    el("scan-status").textContent = "Kamera hazır — çekime başlayın";
    setupAudioMeter();
  } catch (e) {
    el("scan-status").textContent = "Kamera yok — Demo doldur veya HTTPS kullanın";
  }
}

function setupAudioMeter() {
  if (!state.stream) return;
  try {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = state.audioCtx.createMediaStreamSource(state.stream);
    const analyser = state.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    setInterval(() => {
      analyser.getByteFrequencyData(data);
      let s = 0;
      for (let i = 0; i < data.length; i++) s += data[i];
      state.audioRmsSamples.push(s / data.length / 255);
      if (state.audioRmsSamples.length > 120) state.audioRmsSamples.shift();
    }, 200);
  } catch (_) {
    /* sessiz */
  }
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || res.statusText);
  return data;
}

async function startSession() {
  showError("step1-error", null);
  state.hiveId = Number(el("hive-id").value) || 1;
  const tareKg = Number(el("tare-kg").value);
  const weightKg = Number(el("weight-kg").value);
  try {
    const data = await api(`/api/hives/${state.hiveId}/petek-tarama/session`, {
      method: "POST",
      body: JSON.stringify({ tareKg, weightKg }),
    });
    state.sessionId = data.session.sessionId;
    el("pt-subtitle").textContent = `Kovan ${state.hiveId} · oturum ${state.sessionId.slice(0, 8)}…`;
    state.gap = 1;
    state.sideIdx = 0;
    buildMap(data.session.progress.cells);
    updateProgress(data.session.progress);
    updateScanUi();
    showStep(2);
    startCamera();
  } catch (e) {
    showError("step1-error", e.message);
  }
}

async function submitSegment(quality, durationSec) {
  const { gap, side } = currentSegment();
  const video = el("camera");
  const canvas = el("overlay");
  let previewBase64;
  if (video.videoWidth) {
    canvas.width = 120;
    canvas.height = 68;
    canvas.getContext("2d").drawImage(video, 0, 0, 120, 68);
    previewBase64 = canvas.toDataURL("image/jpeg", 0.5);
  }
  return api(
    `/api/hives/${state.hiveId}/petek-tarama/session/${state.sessionId}/segment`,
    {
      method: "POST",
      body: JSON.stringify({ gap, side, durationSec, quality, previewBase64 }),
    }
  );
}

async function recordSegment() {
  if (state.recording || !state.sessionId) return;
  showError("step2-error", null);
  state.recording = true;
  el("btn-record").disabled = true;
  el("scan-status").textContent = "Kayıt… telefonu sabit tutun";

  const video = el("camera");
  const canvas = el("overlay");
  const frames = [];
  const interval = setInterval(() => {
    if (video.videoWidth) frames.push(analyzeFrameQuality(video, canvas));
  }, 200);

  await new Promise((r) => setTimeout(r, SEGMENT_TARGET_SEC * 1000));
  clearInterval(interval);
  state.recording = false;
  el("btn-record").disabled = false;

  let motion = 0.12;
  if (frames.length > 2) {
    let diff = 0;
    for (let i = 1; i < frames.length; i++) {
      diff += Math.abs(frames[i].brightness - frames[i - 1].brightness);
      diff += Math.abs(frames[i].blur - frames[i - 1].blur);
    }
    motion = Math.min(1, diff / frames.length);
  }
  const last = frames[frames.length - 1] || {
    brightness: 0.55,
    blur: 0.65,
    framing: 0.7,
  };
  const quality = {
    brightness: last.brightness,
    blur: last.blur,
    motion,
    framing: last.framing,
  };

  try {
    const data = await submitSegment(quality, SEGMENT_TARGET_SEC);
    updateProgress(data.progress);
    el("scan-status").textContent = data.ariciya;

    if (data.accepted) {
      el("btn-skip-retry").classList.add("hidden");
      if (data.progress.complete) {
        el("scan-status").textContent = "Petek haritası tamam — analiz adımına geçin";
        await uploadAudio();
        setTimeout(() => showStep(3), 800);
      } else {
        nextSegment();
        firstIncomplete(data.progress.cells);
        updateScanUi();
      }
    } else {
      el("btn-skip-retry").classList.remove("hidden");
      showError("step2-error", data.issues?.join(" · ") || "Tekrar çekin");
    }
  } catch (e) {
    showError("step2-error", e.message);
  }
}

async function uploadAudio() {
  const samples = state.audioRmsSamples;
  const rms = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0.32;
  try {
    await api(`/api/hives/${state.hiveId}/petek-tarama/session/${state.sessionId}/audio`, {
      method: "POST",
      body: JSON.stringify({
        durationSec: Math.max(SEGMENT_TARGET_SEC * 4, samples.length * 0.2),
        rms,
        peak: Math.max(...samples, 0.4),
      }),
    });
  } catch (_) {
    /* opsiyonel */
  }
}

async function demoFillAll() {
  if (!state.sessionId) {
    showError("step2-error", "Önce oturum başlatın (Adım 1)");
    return;
  }
  showError("step2-error", null);
  el("scan-status").textContent = "Demo segmentler yükleniyor…";
  for (let g = 1; g <= GAP_COUNT; g++) {
    for (const side of SIDES) {
      state.gap = g;
      state.sideIdx = SIDES.indexOf(side);
      const quality = {
        brightness: 0.58 + g * 0.01,
        blur: 0.72 + (side === "left" ? 0.05 : 0.03),
        motion: 0.12,
        framing: 0.75,
      };
      const data = await submitSegment(quality, SEGMENT_TARGET_SEC);
      updateProgress(data.progress);
    }
  }
  await uploadAudio();
  el("scan-status").textContent = "Demo harita tamam";
  showStep(3);
}

async function runAnalyze() {
  showError("step3-error", null);
  el("analysis-loading").classList.remove("hidden");
  el("analysis-result").classList.add("hidden");
  try {
    const data = await api(
      `/api/hives/${state.hiveId}/petek-tarama/session/${state.sessionId}/analyze`,
      { method: "POST", body: "{}" }
    );
    state.analysis = data.analysis;
    renderAnalysis(data.analysis);
    el("analysis-result").classList.remove("hidden");
    prepareConfirm(data.analysis);
    showStep(4);
  } catch (e) {
    showError("step3-error", e.message);
  } finally {
    el("analysis-loading").classList.add("hidden");
  }
}

function renderAnalysis(a) {
  el("analysis-result").innerHTML = `
    <dl class="pt-dl">
      <dt>Arı (AI)</dt><dd>${a.referenceBeeCount.toLocaleString("tr-TR")} <span class="muted">(${a.referenceBeeCountMin.toLocaleString("tr-TR")} – ${a.referenceBeeCountMax.toLocaleString("tr-TR")})</span></dd>
      <dt>Bal tahmini</dt><dd>~${a.honeyKgEstimate} kg</dd>
      <dt>Petek + bal (combKg)</dt><dd>${a.combKg} kg</dd>
      <dt>Arı kütlesi</dt><dd>${a.beeKg} kg</dd>
      <dt>Harita kalitesi</dt><dd>${a.mapQualityScore}/100</dd>
      <dt>Güven</dt><dd>%${a.confidence}</dd>
      <dt>Başlangıç koloni skoru</dt><dd>${a.colonyScore} — ${a.strengthLabel}</dd>
      <dt>Ses</dt><dd>${a.audio?.ariciya || "—"}</dd>
    </dl>
    <p>${a.ariciya}</p>
    ${a.oneriler?.length ? `<ul class="pt-tips">${a.oneriler.map((o) => `<li>${o}</li>`).join("")}</ul>` : ""}
  `;
}

function prepareConfirm(a) {
  el("confirm-bees").value = a.referenceBeeCount;
  el("confirm-comb").value = a.combKg;
  el("confirm-summary").innerHTML = el("analysis-result").innerHTML;
}

async function confirmCalibration() {
  showError("step4-error", null);
  showError("step4-success", null);
  try {
    const data = await api(
      `/api/hives/${state.hiveId}/petek-tarama/session/${state.sessionId}/confirm`,
      {
        method: "POST",
        body: JSON.stringify({
          referenceBeeCount: Number(el("confirm-bees").value),
          combKg: Number(el("confirm-comb").value),
        }),
      }
    );
    el("step4-success").textContent =
      (data.ariciya || "Kalibrasyon kaydedildi") +
      (data.baseline ? " · Başlangıç skoru tüm grafiklere işlendi." : "");
    el("step4-success").classList.remove("hidden");
    el("btn-confirm").disabled = true;
  } catch (e) {
    showError("step4-error", e.message);
  }
}

function init() {
  el("hive-id").value = state.hiveId;
  el("pt-subtitle").textContent = `Kovan ${state.hiveId} · telefon kalibrasyonu`;

  el("btn-start-session").addEventListener("click", startSession);
  el("btn-record").addEventListener("click", recordSegment);
  el("btn-skip-retry").addEventListener("click", () => {
    el("btn-skip-retry").classList.add("hidden");
    showError("step2-error", null);
    el("scan-status").textContent = "Tekrar çekin";
  });
  el("btn-demo-fill").addEventListener("click", demoFillAll);
  el("btn-analyze").addEventListener("click", runAnalyze);
  el("btn-confirm").addEventListener("click", confirmCalibration);

  buildMap([]);
  updateScanUi();
}

init();
