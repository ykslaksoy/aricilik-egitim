/**
 * koloni i18n iskeleti
 * Varsayılan: tr. Yeni dil: i18n/<kod>.js ekle + catalogs'a kaydet.
 */

const tr = require("./tr");
const en = require("./en");

const catalogs = { tr, en };
let locale = process.env.KOLONI_LANG || "tr";

function setLocale(code) {
  if (!catalogs[code]) throw new Error(`unknown_locale:${code}`);
  locale = code;
  return locale;
}

function getLocale() {
  return locale;
}

function listLocales() {
  return Object.values(catalogs).map((c) => ({ code: c.code, name: c.name }));
}

function pack(code = locale) {
  return catalogs[code] || catalogs.tr;
}

function t(section, key, fallback) {
  const p = pack();
  const bag = p[section] || {};
  if (key != null && bag[key] != null) return bag[key];
  const trBag = catalogs.tr[section] || {};
  if (key != null && trBag[key] != null) return trBag[key];
  return fallback != null ? fallback : key != null ? String(key) : "";
}

function alertTypeTr(type) {
  return t("alertType", type, t("ui", "alert_fallback", "Uyarı"));
}

function hiveStatusTr(status) {
  return t("hiveStatus", status, status || "—");
}

function faultTr(fault) {
  if (!fault) return t("fault", "_unknown", "bilinmiyor");
  return t("fault", fault, String(fault));
}

function roleTr(rol) {
  return t("role", rol, rol || "—");
}

module.exports = {
  catalogs,
  setLocale,
  getLocale,
  listLocales,
  t,
  pack,
  alertTypeTr,
  hiveStatusTr,
  faultTr,
  roleTr,
};
