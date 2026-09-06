export function scoreBadge(score, label) {
  const cls = score == null ? "" : score < 40 ? "low" : score < 70 ? "mid" : "high";
  return `<span class="score ${cls}">${score ?? "—"}</span>`;
}
