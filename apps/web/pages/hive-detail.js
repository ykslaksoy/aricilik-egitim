/** kovan detay — grafik + tüm sensörler */
export function renderHiveDetail(container, hive) {
  if (!container) return;
  container.textContent = `kovan ${hive?.hiveId ?? "?"} — TODO`;
}
