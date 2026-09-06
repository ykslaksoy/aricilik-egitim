/**
 * ML model yükleme — ONNX varsa kullan, yoksa kural tabanlı fallback.
 * Model dosyası: data/models/acoustic_v1.onnx (ileride)
 */

const fs = require("fs");
const path = require("path");

const MODELS_DIR = path.join(__dirname, "../../../../data/models");
const ACOUSTIC_MODEL = path.join(MODELS_DIR, "acoustic_v1.onnx");

let onnxRuntime = null;
let acousticSession = null;

function getConfig() {
  const acousticExists = fs.existsSync(ACOUSTIC_MODEL);
  return {
    modelsDir: MODELS_DIR,
    acoustic: {
      path: ACOUSTIC_MODEL,
      loaded: Boolean(acousticSession),
      fileExists: acousticExists,
      mode: acousticSession ? "onnx" : "rules_fallback",
    },
    doc: "Eğitim: ml/train_acoustic.py · Export: GET /api/export/dataset",
  };
}

/** Lazy ONNX load — paket yoksa sessiz fallback */
function loadAcousticModel() {
  if (acousticSession) return acousticSession;
  if (!fs.existsSync(ACOUSTIC_MODEL)) return null;
  try {
    // eslint-disable-next-line import/no-unresolved, global-require
    onnxRuntime = require("onnxruntime-node");
    // async load handled on first predict; sync stub for now
    return null;
  } catch {
    return null;
  }
}

/**
 * ONNX tahmin — henüz model yoksa null (caller kural tabanlı kullanır).
 * @param {number[]} features
 */
async function predictAcoustic(features) {
  loadAcousticModel();
  if (!acousticSession || !features?.length) return null;
  // Placeholder — gerçek tensor shape model eğitilince doldurulacak
  return null;
}

module.exports = {
  getConfig,
  predictAcoustic,
  ACOUSTIC_MODEL,
  MODELS_DIR,
};
