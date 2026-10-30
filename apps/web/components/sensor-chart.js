/** Basit SVG çizgi grafiği (bağımlılıksız). series: [{t, [field]: sayı}] */
export function sensorChart(series, field, opts = {}) {
  const w = opts.width || 300, h = opts.height || 80, pad = 4;
  const pts = (series || []).map((p) => Number(p?.[field])).filter((v) => Number.isFinite(v));
  if (pts.length < 2) return `<div class="chart" data-field="${field}">Yeterli veri yok</div>`;
  const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const xy = pts.map((v, i) => `${(pad + (i * (w - 2 * pad)) / (pts.length - 1)).toFixed(1)},${(h - pad - ((v - min) * (h - 2 * pad)) / span).toFixed(1)}`).join(' ');
  return `<div class="chart" data-field="${field}"><svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${field}: ${min}–${max}"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${xy}"/></svg></div>`;
}
