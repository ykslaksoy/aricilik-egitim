/**
 * Gezginci taşıma — hangi alarm kapalı kalır.
 * Doküman: docs/ozellikler/gezginci/tasima-kurallari.md
 */
const TRANSPORT_SUPPRESS = [
  "swarm_occurred",
  "swarm_risk",
  "bee_swarm_tier",
  "bee_estimate",
  "traffic_low",
  "harvest",
];

/**
 * @param {boolean} active
 * @returns {{ suppressAlerts: string[], label: string }}
 */
function transportRules(active) {
  if (!active) {
    return { suppressAlerts: [], label: "normal" };
  }
  return {
    suppressAlerts: TRANSPORT_SUPPRESS,
    label: "transport",
  };
}

module.exports = { transportRules, TRANSPORT_SUPPRESS };
