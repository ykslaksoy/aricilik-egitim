/** kovan detay — birincil UI: apps/web/kovan.html?id= */
export function renderHiveDetail(container, hive) {
  if (!container) return;
  var id = hive?.id ?? hive?.hiveId ?? "";
  container.innerHTML =
    '<p class="muted">Kovan detayı için ' +
    '<a href="kovan.html?id=' + encodeURIComponent(id) + '">kovan.html?id=' + id + "</a>" +
    " sayfasını açın.</p>";
}
