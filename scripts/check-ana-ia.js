#!/usr/bin/env node
/** Ana IA + kovan şablonu kilit kontrolü — raster/Koloni sapması / watermark. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "apps/web/ana.html"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/web/ana.css"), "utf8");
const js = fs.readFileSync(path.join(root, "apps/web/ana.js"), "utf8");

const lockMatch = html.match(/<script type="application\/json" id="ana-ia-lock">([\s\S]*?)<\/script>/);
if (!lockMatch) fail("ana-ia-lock JSON yok");
const IA = JSON.parse(lockMatch[1]);

function fail(msg) {
  console.error("check-ana-ia FAIL:", msg);
  process.exit(1);
}

const assert = {
  ok(cond, msg) {
    if (!cond) fail(msg);
  },
  eq(a, b, msg) {
    if (a !== b) fail(`${msg}: ${a} !== ${b}`);
  },
};

const expectCards = ["Tartı", "Sağlık", "Oğul", "Kovanlar", "Koloni", "Arılıklar", "Görevler", "Uyarılar", "Raporlar"];
const expectNav = ["Ana", "Kovanlar", "Uyarılar", "Görevler", "Ayarlar"];

assert.eq(IA.cards.join("|"), expectCards.join("|"), "kart sırası");
assert.eq(IA.nav.join("|"), expectNav.join("|"), "alt menü sırası");
assert.eq(IA.org, "Hardal Arıcılık", "işletme adı");
assert.eq(IA.lock, "LOCKED-FINAL", "kilit adı");
assert.eq(IA.orgPlacement, "brand-strip", "işletme yerleşimi");
assert.eq(IA.orgAlign, "left", "Hardal sola hizalı");
assert.eq(IA.hardalRail, "left", "hardal sol şerit");
assert.eq(IA.koloniIcon, "bees-3", "Koloni simgesi");
assert.eq(IA.ogulIcon, "bee-1", "Oğul simgesi");
assert.eq(IA.beeTour, true, "bee tour kilidi");
assert.eq(IA.beeTourSteps, 4, "bee tour 4 adım kilidi");

assert.ok(html.includes('id="brand-strip"'), "marka şeridi");
assert.ok(html.includes('id="weather-strip"'), "hava şeridi");
assert.ok(html.includes('class="hardal-rail"'), "sol hardal ray");
assert.ok(html.includes('id="bee-tour"') && html.includes('id="bee-mascot"'), "arı turu kabuğu");
assert.ok(html.indexOf('id="brand-org"') < html.indexOf("brand-product"), "Hardal solda (org önce)");
assert.ok(html.indexOf("brand-strip") < html.indexOf("weather-strip"), "şerit hava üstünde");
assert.ok(/data-ia="Tartı,Sağlık,Oğul,Kovanlar,Koloni,Arılıklar,Görevler,Uyarılar,Raporlar"/.test(html), "grid data-ia");

assert.ok(js.includes('icon: "bees-3"') && js.includes('label: "Koloni"'), "Koloni 3 arı");
assert.ok(js.includes('icon: "bee-1"') && js.includes('label: "Oğul"'), "Oğul 1 arı");
assert.ok(js.includes("hive-box-top") && js.includes("hive-box-bot"), "iki kat şablon");
assert.ok(js.includes("hive-slot") && js.includes("burn-ring"), "orta slot + yakma halkası");
assert.ok(js.includes("TOUR_STEPS") && js.includes("bee-mascot"), "arı turu adımları");
const tourBlock = js.match(/const TOUR_STEPS = \[([\s\S]*?)\];/);
assert.ok(tourBlock, "TOUR_STEPS bloğu");
assert.eq((tourBlock[1].match(/sel:/g) || []).length, 4, "bee tour tam 4 adım");
assert.ok(!/Hardal Arıcılık/.test(js.split("hiveArt")[1]?.split("function weatherIco")[0] || ""), "kovan SVG içinde işletme yok");

assert.ok(css.includes("translate(-50%, -50%)"), "simge tam orta");
assert.ok(css.includes(".hive-slot") && css.includes("justify-content: center"), "kovan kartta ortalı");
assert.ok(css.includes(".hardal-rail") && css.includes("justify-content: flex-start"), "Hardal sol şerit");
assert.ok(css.includes(".bee-mascot") && css.includes(".bee-tour"), "arı turu stili");
assert.ok(css.includes("hive-icon-burn") && css.includes(".burn-ring"), "yakma damga stili");
assert.ok(!/\.hive-icon[\s\S]{0,280}radial-gradient/.test(css), "simge halo/radial yok");
assert.ok(!/stroke:\s*#f4e4c8/.test(css), "flat açık çizgi ikon yok");
assert.ok(!/background:\s*var\(--ana-brown\)/.test(css), "dolu kahve rozet yok");
assert.ok(/\.hive-box-top|\.hive-box\s*\{[\s\S]*height:\s*30px/.test(css), "eşit kat yüksekliği");
assert.ok(css.includes("width: 100%") && css.includes(".hive-box"), "katlar aynı genişlik");
assert.ok(!/object-fit:\s*cover/.test(css), "object-fit:cover yok (crop kayması)");
assert.ok(css.includes(".ana-card [data-watermark]"), "kart watermark gizleme");

const cardsBlock = js.slice(js.indexOf("const CARDS"), js.indexOf("const WEEK"));
assert.ok(cardsBlock.includes('label: "Oğul"') && !/Hardal/.test(cardsBlock), "Oğul kartında Hardal yok");

console.log("check-ana-ia: OK — LOCKED-FINAL, Hardal solda, yakma, 3 arı, bee tour");
