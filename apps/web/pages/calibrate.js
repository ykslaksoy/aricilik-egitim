/** Kovan Petek Tarama — panelden yönlendirme */
export function petekTaramaUrl(hiveId) {
  return `/petek-tarama.html?hiveId=${hiveId}`;
}

/** @deprecated use petek-tarama.html */
export function renderCalibrate(container, hiveId) {
  if (!container) return;
  container.innerHTML = `<a href="${petekTaramaUrl(hiveId)}">Kovan Petek Tarama</a>`;
}
