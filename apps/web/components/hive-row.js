import { scoreBadge } from "./score-badge.js";

export function hiveRow(h) {
  const c = h.colony || {};
  return `
    <li class="row" data-id="${h.hiveId}">
      <span class="no">${h.hiveId}</span>
      <span class="kg">${h.weightKg}</span>
      ${scoreBadge(c.score)}
    </li>`;
}
