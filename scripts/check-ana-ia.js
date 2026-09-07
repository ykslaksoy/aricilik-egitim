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
assert.eq(IA.orgPlacement, "brand-strip", "işletme yerleşimi");
assert.eq(IA.koloniIcon, "bees-3", "Koloni simgesi");
assert.eq(IA.ogulIcon, "bee-1", "Oğul simgesi");

assert.ok(html.includes('id="brand-strip"'), "marka şeridi");
assert.ok(html.includes('id="weather-strip"'), "hava şeridi");
assert.ok(html.indexOf("brand-strip") < html.indexOf("weather-strip"), "şerit hava üstünde");
assert.ok(/data-ia="Tartı,Sağlık,Oğul,Kovanlar,Koloni,Arılıklar,Görevler,Uyarılar,Raporlar"/.test(html), "grid data-ia");

assert.ok(js.includes('icon: "bees-3"') && js.includes('label: "Koloni"'), "Koloni 3 arı");
assert.ok(js.includes('icon: "bee-1"') && js.includes('label: "Oğul"'), "Oğul 1 arı");
assert.ok(js.includes("hive-box-top") && js.includes("hive-box-bot"), "iki kat şablon");
assert.ok(!/Hardal Arıcılık/.test(js.split("hiveArt")[1]?.split("function weatherIco")[0] || ""), "kovan SVG içinde işletme yok");

assert.ok(css.includes("translate(-50%, -50%)"), "simge tam orta");
assert.ok(/\.hive-box-top|\.hive-box\s*\{[\s\S]*height:\s*30px/.test(css), "eşit kat yüksekliği");
assert.ok(css.includes("width: 100%") && css.includes(".hive-box"), "katlar aynı genişlik");
assert.ok(!/object-fit:\s*cover/.test(css), "object-fit:cover yok (crop kayması)");
assert.ok(css.includes(".ana-card [data-watermark]"), "kart watermark gizleme");

const brandInJsCards = /label:\s*"Oğul"[\s\S]*Hardal/.test(js);
assert.ok(!brandInJsCards, "Oğul kartında Hardal yok");

console.log("check-ana-ia: OK — 9 kart, flush şablon, Hardal şeritte");
