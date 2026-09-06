/** alarm listesi */
export function renderAlerts(container, alerts) {
  if (!container) return;
  container.textContent = `${alerts?.length ?? 0} alarm — TODO`;
}
