/** canvas veya basit SVG grafik — TODO */
export function sensorChart(series, field) {
  return `<div class="chart" data-field="${field}">${series?.length ?? 0} nokta</div>`;
}
