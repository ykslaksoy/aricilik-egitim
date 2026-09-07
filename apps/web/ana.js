/**
 * SüperArı Ana — kilitli IA + tek kovan şablonu.
 * Koloni kartı diğer 8 ile aynı siluet; simge bees-3 (Oğul bee-1).
 * Hardal Arıcılık yalnız #brand-strip içinde.
 */
(function () {
  const IA = JSON.parse(document.getElementById("ana-ia-lock").textContent);

  const CARDS = [
    { id: "tarti", label: "Tartı", icon: "scale", chip: "+1.2kg", tone: "ok", dest: "kovanlar" },
    { id: "saglik", label: "Sağlık", icon: "heart", chip: "İyi", tone: "ok", dest: "kovanlar" },
    { id: "ogul", label: "Oğul", icon: "bee-1", chip: "Düşük", tone: "ok", dest: "kovanlar" },
    { id: "kovanlar", label: "Kovanlar", icon: "boxes", chip: "100", tone: "tan", dest: "kovanlar" },
    { id: "koloni", label: "Koloni", icon: "bees-3", chip: "12 grup", tone: "tan", dest: "kovanlar" },
    { id: "ariliklar", label: "Arılıklar", icon: "pin", chip: "3", tone: "tan", dest: "kovanlar" },
    { id: "gorevler", label: "Görevler", icon: "clipboard", chip: "5", tone: "blue", dest: "gorevler" },
    { id: "uyarilar", label: "Uyarılar", icon: "bell", chip: "2", tone: "red", dest: "uyarilar" },
    { id: "raporlar", label: "Raporlar", icon: "bars", chip: "—", tone: "purple", dest: "ana" },
  ];

  const WEEK = [
    { d: "Pzt", ico: "sun", hi: 24, lo: 12 },
    { d: "Sal", ico: "cloud", hi: 22, lo: 11 },
    { d: "Çar", ico: "sun", hi: 23, lo: 12 },
    { d: "Per", ico: "rain", hi: 18, lo: 10 },
    { d: "Cum", ico: "cloud", hi: 20, lo: 11 },
    { d: "Cmt", ico: "sun", hi: 22, lo: 12 },
    { d: "Paz", ico: "sun", hi: 24, lo: 13 },
  ];

  const ICONS = {
    scale:
      '<path d="M12 4.5v3.2M8 8.2h8"/><path d="M7 11.2 5.2 16.2h3.6L7 11.2zm10 0-1.8 5h3.6L17 11.2z"/><path d="M7 8.2 12 20M17 8.2 12 20"/>',
    heart:
      '<path d="M12 18s-6.2-3.8-6.2-8A3.5 3.5 0 0 1 12 8.2 3.5 3.5 0 0 1 18.2 10c0 4.2-6.2 8-6.2 8z"/>',
    "bee-1":
      '<ellipse cx="12" cy="13" rx="3.1" ry="4.1"/><path d="M12 9.2V16.8M9.4 11.4h5.2M9.6 13.6h4.8"/><path d="M8.2 9.4C6 8 5.4 6.2 6.2 5.4M15.8 9.4C18 8 18.6 6.2 17.8 5.4"/><path d="M12 17.2l-1.3 2.3M12 17.2l1.3 2.3"/>',
    "bees-3":
      '<g transform="translate(0,-1.2)">' +
        beeMark(12, 7.2, 0.72) +
        beeMark(8.1, 14.1, 0.72) +
        beeMark(15.9, 14.1, 0.72) +
      "</g>",
    boxes:
      '<rect x="6" y="5.2" width="12" height="5.2" rx="0.8"/><rect x="6" y="11.2" width="12" height="5.2" rx="0.8"/><path d="M9 21h6"/>',
    pin:
      '<path d="M12 20.4s6-6.1 6-10.2A6 6 0 1 0 6 10.2c0 4.1 6 10.2 6 10.2z"/><circle cx="12" cy="10.1" r="2"/>',
    clipboard:
      '<rect x="6.4" y="5.4" width="11.2" height="14.2" rx="1.4"/><path d="M9 5.2V4.4h6v.8M8.8 10h6.4M8.8 13h6.4M8.8 16h4"/>',
    bell:
      '<path d="M12 4.4a5.4 5.4 0 0 1 5.4 5.4c0 3.6 1.1 4.7 1.6 5.4H5c.5-.7 1.6-1.8 1.6-5.4A5.4 5.4 0 0 1 12 4.4z"/><path d="M10 18.6a2 2 0 0 0 4 0"/>',
    bars:
      '<path d="M6.4 16.6V11M12 16.6V7.4M17.6 16.6v-3.4M5 18.4h14"/>',
  };

  function beeMark(cx, cy, s) {
    return (
      `<g transform="translate(${cx},${cy}) scale(${s}) translate(-12,-12)">` +
      `<ellipse cx="12" cy="13" rx="3.1" ry="4.1"/>` +
      `<path d="M12 9.2V16.8M9.4 11.4h5.2"/>` +
      `<path d="M8.4 9.6C6.4 8.4 6 6.8 6.6 6.2M15.6 9.6C17.6 8.4 18 6.8 17.4 6.2"/>` +
      `</g>`
    );
  }

  function hiveArt(icon) {
    return `
      <div class="hive-art" aria-hidden="true">
        <div class="hive-lid"></div>
        <div class="hive-face">
          <div class="hive-box hive-box-top"></div>
          <div class="hive-box hive-box-bot"></div>
          <span class="hive-icon" data-icon="${icon}">
            <svg viewBox="0 0 24 24">${ICONS[icon] || ""}</svg>
          </span>
        </div>
        <div class="hive-floor">
          <span class="hive-leg"></span>
          <span class="hive-entrance"></span>
          <span class="hive-leg"></span>
        </div>
      </div>`;
  }

  function weatherIco(kind) {
    if (kind === "rain") {
      return `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 12h11a4 4 0 0 0 .3-8 5.2 5.2 0 0 0-10 1.3A3.6 3.6 0 0 0 6 12z" fill="#9aafbf" stroke="none"/><path d="M9 14.2v3M12 14.6v3M15 14.2v3" fill="none" stroke="#5b7c9a" stroke-width="1.4"/></svg>`;
    }
    if (kind === "cloud") {
      return `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M6.2 15.2h11.2a4.2 4.2 0 0 0 .3-8.4 5.4 5.4 0 0 0-10.4 1.4 3.7 3.7 0 0 0-1.1 7z" fill="#c5d2dc" stroke="none"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="4.2" fill="#f0b429"/><path d="M12 4.2v1.8M12 18v1.8M4.2 12h1.8M18 12h1.8M6.4 6.4l1.2 1.2M16.4 16.4l1.2 1.2M17.6 6.4l-1.2 1.2M7.6 16.4l-1.2 1.2" stroke="#f0b429" fill="none" stroke-width="1.3"/></svg>`;
  }

  function renderWeek() {
    document.getElementById("weather-week").innerHTML = WEEK.map(
      (d) => `<li class="weather-day">
        <span>${d.d}</span>
        ${weatherIco(d.ico)}
        <span class="hi-lo"><b>${d.hi}°</b>/${d.lo}°</span>
      </li>`
    ).join("");
  }

  function renderCards() {
    const labels = CARDS.map((c) => c.label);
    if (labels.join(",") !== IA.cards.join(",")) {
      console.error("Ana IA kart sırası kilit bozuldu", labels, IA.cards);
    }
    const grid = document.getElementById("ana-grid");
    grid.innerHTML = CARDS.map(
      (c) => `<button type="button" class="ana-card" data-card="${c.id}" data-icon="${c.icon}" data-dest="${c.dest}">
        ${hiveArt(c.icon)}
        <span class="ana-card-label">${c.label}</span>
        <span class="ana-card-chip chip-${c.tone}" data-chip="${c.id}">${c.chip}</span>
      </button>`
    ).join("");

    grid.querySelectorAll(".ana-card").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.dest || "ana"));
    });
  }

  function showView(name) {
    const allowed = IA.nav.map((n) => n.toLocaleLowerCase("tr"));
    const key = String(name || "ana").toLocaleLowerCase("tr");
    const view = allowed.includes(key) ? key : "ana";
    document.querySelectorAll(".ana-view").forEach((el) => {
      const on = el.dataset.view === view;
      el.classList.toggle("is-active", on);
      el.hidden = !on;
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.nav === view);
    });
  }

  function row(title, sub) {
    return `<li><strong>${title}</strong><span>${sub}</span></li>`;
  }

  async function hydrate() {
    try {
      const [hivesR, alertsR, tasksR, locR] = await Promise.all([
        fetch("/api/hives").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/alerts").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/tasks").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/locations").then((r) => (r.ok ? r.json() : null)),
      ]);
      const hives = hivesR?.hives || [];
      const alerts = (alertsR?.alerts || []).filter((a) => !a.read);
      const tasks = tasksR?.tasks || [];
      const locs = locR?.locations || [];

      setChip("kovanlar", String(hives.length || 100));
      setChip("uyarilar", String(alerts.length || 2));
      setChip("gorevler", String(tasks.length || 5));
      if (locs.length) setChip("ariliklar", String(locs.length));

      const hiveList = document.getElementById("list-kovanlar");
      hiveList.innerHTML = hives.length
        ? hives
            .slice(0, 40)
            .map((h) => {
              const loc = h.konumEtiket || h.apiaryLocation?.konumEtiket || "—";
              return row(`#${h.hiveId} · ${loc}`, `${h.weightKg ?? "—"} kg · skor ${h.colony?.score ?? "—"}`);
            })
            .join("")
        : `<li class="empty-row">Kovan listesi yüklenemedi — demo sayılar kartlarda.</li>`;

      document.getElementById("list-uyarilar").innerHTML = alerts.length
        ? alerts
            .slice(0, 20)
            .map((a) => row(a.title || a.type || "Uyarı", `Kovan ${a.hiveId ?? "—"}`))
            .join("")
        : `<li class="empty-row">Açık uyarı yok</li>`;

      document.getElementById("list-gorevler").innerHTML = tasks.length
        ? tasks
            .slice(0, 20)
            .map((t) => row(t.title || t.type || "Görev", `Kovan ${t.hiveId ?? "—"}`))
            .join("")
        : `<li class="empty-row">Görev yok</li>`;
    } catch {
      document.getElementById("list-kovanlar").innerHTML =
        `<li class="empty-row">API yok — kilitli demo rozetleri kullanılıyor.</li>`;
    }
  }

  function setChip(id, text) {
    const el = document.querySelector(`[data-chip="${id}"]`);
    if (el) el.textContent = text;
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.nav));
  });

  document.getElementById("brand-org").textContent = IA.org;
  document.getElementById("settings-org").textContent = IA.org;
  document.getElementById("weather-place").textContent = IA.weatherLabel;

  renderWeek();
  renderCards();
  hydrate();
})();
