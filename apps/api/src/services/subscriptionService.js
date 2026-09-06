/**
 * Abonelik planları — geçmiş gün limiti + özellik kapıları.
 */

const { PLAN_HISTORY_DAYS } = require("../../../../packages/shared/constants");
const dbService = require("./dbService");

const PLANS = {
  starter: {
    id: "starter",
    ad: "Başlangıç",
    historyDays: PLAN_HISTORY_DAYS.starter,
    maxHives: 5,
    features: ["web", "push", "ingest"],
  },
  pro: {
    id: "pro",
    ad: "Pro",
    historyDays: PLAN_HISTORY_DAYS.pro,
    maxHives: 50,
    features: ["web", "push", "ingest", "ml", "journal", "team"],
  },
  enterprise: {
    id: "enterprise",
    ad: "Enterprise",
    historyDays: PLAN_HISTORY_DAYS.enterprise,
    maxHives: Infinity,
    features: ["web", "push", "ingest", "ml", "journal", "team", "sla", "api_unlimited"],
  },
};

function getPlan(accountId = "default") {
  const stored = dbService.getSubscription(accountId);
  const planId = stored?.planId || "pro";
  return { ...(PLANS[planId] || PLANS.pro), accountId, active: stored?.active !== false };
}

function setPlan(accountId, planId) {
  if (!PLANS[planId]) throw new Error("Geçersiz plan");
  dbService.saveSubscription(accountId, planId);
  return getPlan(accountId);
}

function canAccess(accountId, feature) {
  const plan = getPlan(accountId);
  return plan.features.includes(feature);
}

function historyCutoff(accountId) {
  const plan = getPlan(accountId);
  if (plan.historyDays === Infinity) return null;
  const d = new Date();
  d.setDate(d.getDate() - plan.historyDays);
  return d.toISOString();
}

module.exports = { PLANS, getPlan, setPlan, canAccess, historyCutoff };
