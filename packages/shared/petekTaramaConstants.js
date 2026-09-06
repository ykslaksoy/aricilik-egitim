/** Kovan Petek Tarama — rehberli telefon kalibrasyonu */

module.exports = {
  GAP_COUNT: 10,
  SIDES: ["left", "right"],
  SIDE_LABEL: { left: "sol", right: "sağ" },

  /** Segment başına hedef süre (sn) */
  SEGMENT_TARGET_SEC: 3,
  SEGMENT_MIN_SEC: 1.5,
  SEGMENT_MAX_SEC: 8,

  /** İstemci kalite metrikleri (0–1) */
  QUALITY: {
    BLUR_MIN: 0.52,
    BRIGHTNESS_MIN: 0.22,
    BRIGHTNESS_MAX: 0.96,
    MOTION_MAX: 0.38,
    FRAMING_MIN: 0.58,
  },

  /** Petek / arı modeli */
  BEE_MASS_KG: 0.0001,
  /** Orta süper petek mumu (10 petek ≈ 1,8 kg) */
  WAX_KG_DEFAULT: 1.8,
  WAX_KG_PER_GAP: 0.18,

  SESSION_TTL_MS: 4 * 3600 * 1000,
};
