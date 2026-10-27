// Builds the shape pool for the Daily Challenge (/daily) from the map data that build-data.mjs wrote.
// Run with `npm run data` (it runs after build-data.mjs), or on its own: `node scripts/build-daily.mjs`.
//
// Output:
//   public/data/daily/index.json        every shape in the pool: name, label, real area, web-map area, latitude
//   src/data/daily-pool.json            copy of index.json for the leaderboard API (scores answers on the server)
//   public/data/daily/shapes/{id}.json  two pre-drawn SVG outlines per shape:
//                                       "merc" = how it looks on a normal web map (Mercator)
//                                       "ea"   = its true size (equal-area projection centred on the shape)
//   public/data/daily/loc/{id}.json     a small "where is it" map for each shape (see scripts/lib/locator.mjs)
// Both outlines are in km, so two shapes drawn with the same scale compare correctly.

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoMercator, geoPath } from "d3-geo";
import * as client from "topojson-client";
import { loadRegions } from "./lib/regions.mjs";
import { locator } from "./lib/locator.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DATA = path.join(ROOT, "public", "data");
const OUT = path.join(DATA, "daily");
const R = 6371; // Earth radius, km
const eras = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "eras.json"), "utf8"));
const keyForYear = new Map(eras.map((e) => [e.year, e.key]));
const labelForKey = new Map(eras.map((e) => [e.key, e.label]));

// Well-known historical states, shown at the snapshot where they are largest in our data
// (or a fixed snapshot). n = name in the map data, show = display name.
const HISTORY = [
  { n: "Roman Empire" },
  { n: "Western Roman Empire" },
  { n: "Byzantine Empire" },
  { n: "Empire of Alexander", show: "Alexander the Great's empire" },
  { n: "Achaemenid Empire", show: "Achaemenid Persian Empire" },
  { n: "Seleucid Kingdom", show: "Seleucid Empire" },
  { n: "Parthian Empire" },
  { n: "Sasanian Empire" },
  { n: "Carthaginian Empire" },
  { n: "Mauryan Empire" },
  { n: "Gupta Empire" },
  { n: "Mughal Empire" },
  { n: "Maratha Confederacy" },
  { n: "British Raj" },
  { n: "Han", show: "Han Empire" },
  { n: "Sui Empire" },
  { n: "Tang Empire" },
  { n: "Song Empire" },
  { n: "Great Khanate", show: "Great Khanate (Mongol Yuan)" },
  { n: "Ming Chinese Empire", show: "Ming Empire" },
  { n: "Qing Empire" },
  { n: "Tibetan Empire" },
  { n: "Khmer Empire" },
  { n: "Empire of Japan" },
  { n: "Umayyad Caliphate" },
  { n: "Abbasid Caliphate" },
  { n: "Fatimid Caliphate" },
  { n: "Seljuk Empire" },
  { n: "Ottoman Empire" },
  { n: "Safavid Empire" },
  { n: "Timurid Empire" },
  { n: "Khanate of the Golden Horde", show: "Golden Horde" },
  { n: "Kievan Rus" },
  { n: "Russian Empire" },
  { n: "USSR", show: "Soviet Union", year: 1960 },
  { n: "Carolingian Empire" },
  { n: "Holy Roman Empire" },
  { n: "Polish–Lithuanian Commonwealth" },
  { n: "Kalmar Union" },
  { n: "Austro-Hungarian Empire", show: "Austria-Hungary" },
  { n: "German Empire" },
  { n: "Axum", show: "Kingdom of Aksum" },
  { n: "Mali", show: "Mali Empire" },
  { n: "Songhai", show: "Songhai Empire" },
  { n: "Inca Empire" },
  { n: "Aztec Empire" },
  { n: "Viceroyalty of New Spain" },
  { n: "Viceroyalty of Peru" },
  { n: "Empire of Brazil" },
  { n: "British North America" },
  // added Oct 19, in the daily puzzles from Oct 21 (see "since" below)
  { n: "Assyria" },
  { n: "Babylonia" },
  { n: "Hittites", show: "Hittite Empire" },
  { n: "Ptolemaic Kingdom", show: "Ptolemaic Egypt" },
  { n: "Kushan Empire" },
  { n: "Xiongnu", show: "Xiongnu Empire", year: -200 }, // the confederation formed c. 209 BCE
  { n: "Hunnic Empire" },
  { n: "Khazars", show: "Khazar Khaganate" },
  { n: "Ilkhanate" },
  { n: "Chagatai Khanate" },
  { n: "Sultanate of Delhi", show: "Delhi Sultanate" },
  { n: "Vijayanagara", show: "Vijayanagara Empire" },
  { n: "Chola Empire" },
  { n: "Srivijaya Empire" },
  { n: "Ayyubid Sultanate" },
  { n: "Mamluke Sultanate", show: "Mamluk Sultanate" },
  { n: "Almohad Caliphate" },
  { n: "Ghaznavid Emirate", show: "Ghaznavid Empire" },
  { n: "Khwarazmian dynasty", show: "Khwarazmian Empire" },
  { n: "Empire of Ghana", show: "Ghana Empire" },
  { n: "Kanem-Bornu", show: "Kanem-Bornu Empire" },
  { n: "Toltec Empire" },
  { n: "Tsardom of Muscovy" },
  { n: "Frankish Kingdom" },
  { n: "Austrian Empire" },
  { n: "Liao", show: "Liao Empire" },
  // added Oct 20 (round 2)
  { n: "Republic of China" },
  { n: "Viceroyalty of Brazil" },
  { n: "Rupert's Land", show: "Rupert's Land (Hudson's Bay Company)" },
  { n: "Northern Yuan" },
  { n: "French West Africa" },
  { n: "Kara Khitai Khaganate", show: "Qara Khitai" },
  { n: "Göktürks", show: "Göktürk Khaganate" },
  { n: "Jin", show: "Jin Empire" },
  { n: "Viceroyalty of New Granada" },
  { n: "Grand Duchy of Moscow" },
  { n: "Anglo-Egyptian Sudan" },
  { n: "Denmark-Norway" },
  { n: "French Equatorial Africa" },
  { n: "Viceroyalty of the Río de la Plata" },
  { n: "Belgian Congo" },
  { n: "Almoravid dynasty", show: "Almoravid Empire" },
  { n: "Ghurid Sultanate" },
  { n: "Persia", show: "Qajar Persia" },
  { n: "Union of South Africa" },
  { n: "Karkhanids", show: "Kara-Khanid Khanate" },
  { n: "Nogai Horde" },
  { n: "Saffarids", show: "Saffarid Empire" },
  { n: "Shunga Empire" },
  { n: "Bactria" },
  { n: "Dutch East Indies" },
  { n: "Samanid Empire" },
  { n: "Far Eastern Republic" },
  { n: "Toba Wei", show: "Northern Wei" },
  { n: "Magadha" },
  { n: "Roman Republic" },
  { n: "Shang", show: "Shang dynasty" },
  { n: "Zhou", show: "Zhou dynasty" },
  { n: "Rhodesia" },
  { n: "Abyssinia", show: "Ethiopian Empire" },
  { n: "Sokoto Caliphate" },
  { n: "Khiva Khanate" },
  { n: "Ayutthaya", show: "Ayutthaya Kingdom" },
  { n: "Rattanakosin Kingdom", show: "Kingdom of Siam" },
  { n: "German South-West Africa" },
  { n: "Kamerun", show: "German Kamerun" },
  { n: "French Indochina" },
  { n: "Sweden–Norway" },
  { n: "Pagan", show: "Pagan Kingdom" },
  { n: "Caliphate of Córdoba" },
];

const loadTopo = (file) => {
  const topo = JSON.parse(fs.readFileSync(file, "utf8"));
  return { topo, geoms: Object.values(topo.objects)[0].geometries };
};

const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ---------- drawing ----------

/**
 * The size of a shape's main landmass: its biggest ring and the rings near it, link by link (a ring joins when it lies
 * within 3/4 of the cluster's size). The same rule as mainPart in src/lib/outline.ts, which frames the shapes in the game,
 * so the detail matches what's on screen. Island chains (Indonesia) stay one cluster; far-off territories don't count.
 */
function mainExtent(rings) {
  const info = rings
    .map((r) => {
      let a = 0;
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let i = 0; i < r.length; i++) {
        const [x, y] = r[i];
        const [nx, ny] = r[(i + 1) % r.length];
        a += x * ny - nx * y;
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
      }
      return { area: Math.abs(a) / 2, box: [x0, y0, x1, y1] };
    })
    .filter((r) => Number.isFinite(r.box[0]))
    .sort((a, b) => b.area - a.area);
  if (!info.length) return 0;
  let box = info[0].box;
  let rest = info.slice(1);
  for (let added = true; added && rest.length; ) {
    added = false;
    rest = rest.filter((r) => {
      const near = (Math.max(box[2] - box[0], box[3] - box[1]) * 3) / 4;
      const gap = Math.max(r.box[0] - box[2], box[0] - r.box[2], r.box[1] - box[3], box[1] - r.box[3], 0);
      if (gap > near) return true;
      box = [Math.min(box[0], r.box[0]), Math.min(box[1], r.box[1]), Math.max(box[2], r.box[2]), Math.max(box[3], r.box[3])];
      added = true;
      return false;
    });
  }
  return Math.max(box[2] - box[0], box[3] - box[1]);
}

/** Project a geometry and return a compact SVG path (integer km) plus its bounding box. */
function draw(geom, projection) {
  // geoPath with a recording context hands us the projected (and clipped) rings
  const rings = [];
  const ctx = {
    moveTo(x, y) {
      rings.push([[x, y]]);
    },
    lineTo(x, y) {
      rings[rings.length - 1].push([x, y]);
    },
    closePath() {},
  };
  geoPath(projection, ctx)(geom);

  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  // detail is set by the main landmass, not the whole shape: far-off islands (French Guiana, the Dutch Caribbean) used to
  // stretch the extent, so France and the Netherlands came out as rough 30-point outlines. Same rule as the game's frame.
  const extent = mainExtent(rings) || Math.max(x1 - x0, y1 - y0);
  const tol = Math.max(extent / 260, 0.6); // drop points closer than this (km)
  const minArea = (extent / 90) ** 2; // drop specks

  const parts = [];
  for (const ring of rings) {
    const kept = [];
    for (const p of ring) {
      const last = kept[kept.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= tol) kept.push(p);
    }
    if (kept.length < 3) continue;
    let a = 0;
    for (let i = 0; i < kept.length; i++) {
      const [ax, ay] = kept[i];
      const [bx, by] = kept[(i + 1) % kept.length];
      a += ax * by - bx * ay;
    }
    if (Math.abs(a / 2) < minArea) continue;
    const pts = kept.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`);
    parts.push(`M${pts.join(" ")}Z`);
  }
  return { d: parts.join(""), b: [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)] };
}

function shapeFiles(geom) {
  const [lon, lat] = geoCentroid(geom);
  // Mercator only distorts by latitude, so turning it to the shape's longitude keeps the distortion
  // exact while stopping shapes that cross the 180° line (Russia, Fiji) from splitting in two.
  const merc = geoMercator().rotate([-lon, 0]).scale(R).translate([0, 0]).precision(0.5);
  const ea = geoAzimuthalEqualArea().rotate([-lon, -lat]).scale(R).translate([0, 0]).precision(0.5);
  const mercArea = geoPath(merc).area(geom); // km² as drawn on a web map, at equator scale
  return { lon, lat, mercArea, merc: draw(geom, merc), ea: draw(geom, ea) };
}

// ---------- pool ----------

// Shapes already in the pool are frozen: their entry (areas, latitude, "since") never changes, because every puzzle already
// played was built from it and the leaderboard re-marks answers with it. Only their outlines are redrawn, so map-data
// fixes and drawing improvements still reach the tiles. New shapes are added after the existing ones.
const pool = [];
const drawn = new Set();
const add = (entry, geom) => {
  const id = slug(`${entry.n}-${entry.era}`);
  if (drawn.has(id)) return;
  drawn.add(id);
  const area = Math.round(geoArea(geom) * R * R);
  // a frozen shape whose land has changed in the map data since (by more than 2%) keeps its old outline, so the picture
  // always matches the area the puzzles use
  const old = previous.get(id);
  const s = shapeFiles(geom);
  const loc = locator(DATA, entry, geom, s.lat, s.lon);
  if (loc) fs.writeFileSync(path.join(OUT, "loc", `${id}.json`), JSON.stringify(loc));
  const changed = old && (Math.abs(area / old.a - 1) > 0.02 || Math.abs(s.mercArea / old.m - 1) > 0.02);
  if (changed && oldOutlines.has(id)) {
    fs.writeFileSync(path.join(OUT, "shapes", `${id}.json`), oldOutlines.get(id));
    console.log(`  daily: "${id}" kept its outline (its land changed ${((area / old.a - 1) * 100).toFixed(1)}% in the map data)`);
    return;
  }
  if (changed) console.warn(`  ! daily: "${id}" changed ${((area / old.a - 1) * 100).toFixed(1)}% and has no old outline: drawn new`);
  fs.writeFileSync(path.join(OUT, "shapes", `${id}.json`), JSON.stringify({ merc: s.merc, ea: s.ea }));
  if (old) return;
  pool.push({
    id,
    n: entry.show ?? entry.n,
    src: entry.n,
    era: entry.era,
    kind: entry.kind,
    sub: entry.sub,
    a: area,
    m: Math.round(s.mercArea),
    lat: Math.round(s.lat * 10) / 10,
    // only new shapes get here; on the very first build (no pool yet) nothing has been played, so no date is needed
    ...(previous.size ? { since: firstDay } : {}),
  });
};

// Shapes added after launch only join the daily puzzles from their "since" date, so every day already played keeps
// exactly the same questions (the leaderboard re-marks answers from this pool). New ids start two days after the build
// (UTC), a date no time zone has reached yet, so nobody can have played it with the old pool.
// Only a missing pool (the very first build) starts fresh: an unreadable one (say, a merge conflict in the file) stops the
// build before anything is deleted, because rebuilding from scratch would silently change every puzzle already played.
const previous = (() => {
  const file = path.join(ROOT, "src", "data", "daily-pool.json");
  if (!fs.existsSync(file)) return new Map();
  return new Map(JSON.parse(fs.readFileSync(file, "utf8")).map((p) => [p.id, p]));
})();
const firstDay = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

// outlines of frozen shapes the map data no longer has (renamed or removed) are kept as they are
const oldOutlines = new Map();
if (fs.existsSync(path.join(OUT, "shapes")))
  for (const f of fs.readdirSync(path.join(OUT, "shapes"))) oldOutlines.set(f.replace(/\.json$/, ""), fs.readFileSync(path.join(OUT, "shapes", f)));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "shapes"), { recursive: true });
fs.mkdirSync(path.join(OUT, "loc"), { recursive: true });

// Present-day countries: 5,000 km² and up (30,000 before Oct 21, 10,000 before Oct 22), excluding disputed shapes.
// Antarctica joins as a continent (from Oct 22): web maps draw it about 24 times too big, so it makes the best trap of all.
{
  const { topo, geoms } = loadTopo(path.join(DATA, "eras", "present.json"));
  for (const g of geoms) {
    const p = g.properties;
    if (!p.n || p.d || p.m || p.a < 5000 || p.n === "French Southern Lands") continue;
    const sub = p.n === "Antarctica" ? "continent" : "today";
    add({ n: p.n, era: "present", kind: "country", sub }, client.feature(topo, g).geometry);
  }
}

// US states: 5,000 km² and up (100,000 before Oct 21, 10,000 before Oct 22)
{
  const { topo, geoms } = loadTopo(path.join(DATA, "us-states.json"));
  for (const g of geoms) {
    const p = g.properties;
    // Puerto Rico is a territory, not a state (it's in the pool as a country-level shape already)
    if (!p.n || p.a < 5000 || p.n === "Puerto Rico") continue;
    add({ n: p.n, era: "us", kind: "state", sub: "US state" }, client.feature(topo, g).geometry);
  }
}

// Regions of six big countries: Canadian provinces and territories, Australian, Mexican, Brazilian and Indian states,
// Chinese provinces (added Oct 27; see scripts/lib/regions.mjs). The map can't draw these yet, so their era starts with
// "adm1-" and puzzles with one leave out the "compare on the map" link.
for (const r of await loadRegions(ROOT)) add({ n: r.n, era: `adm1-${r.cc.toLowerCase()}`, kind: "state", sub: r.sub }, r.geometry);

// Historical states
{
  const polities = JSON.parse(fs.readFileSync(path.join(DATA, "polities.json"), "utf8"));
  for (const h of HISTORY) {
    const row = polities.find((p) => p.n === h.n);
    if (!row) {
      console.warn(`  ! daily: "${h.n}" not found in the map data, skipped`);
      continue;
    }
    // a state already in the pool stays at its snapshot: if a map-data fix moved its largest year, a second entry would
    // let a puzzle pit the same empire against itself
    const frozen = [...previous.values()].find((p) => p.kind === "history" && p.src === h.n);
    const year = h.year ?? row.y[row.a.indexOf(Math.max(...row.a))];
    const key = frozen ? frozen.era : year === "present" ? "present" : keyForYear.get(year);
    if (!key || key === "present") continue;
    const { topo, geoms } = loadTopo(path.join(DATA, "eras", `${key}.json`));
    const parts = geoms.filter((g) => g.properties.n === h.n);
    if (!parts.length) continue;
    const geom = client.merge(topo, parts);
    add({ n: h.n, show: h.show, era: key, kind: "history", sub: `in ${labelForKey.get(key)}` }, geom);
  }
}

// the frozen entries first, in their original order (puzzles pick by position), then any new shapes
for (const [id] of previous)
  if (!drawn.has(id)) {
    if (oldOutlines.has(id)) fs.writeFileSync(path.join(OUT, "shapes", `${id}.json`), oldOutlines.get(id));
    else console.warn(`  ! daily: no outline for frozen shape "${id}"`);
  }
pool.unshift(...previous.values());
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(pool));
// new version stamp, so browsers fetch the new pool instead of a cached one (a stale pool would build different puzzles).
// The pool has its own stamp, so a pool change doesn't need a new map-data stamp (data-version.json) and the reverse.
fs.writeFileSync(path.join(ROOT, "src", "data", "daily-version.json"), JSON.stringify({ v: Date.now().toString(36) }));
// the same pool, bundled into the server so the leaderboard can score answers itself
fs.writeFileSync(path.join(ROOT, "src", "data", "daily-pool.json"), JSON.stringify(pool));
const bytes = fs.readdirSync(path.join(OUT, "shapes")).reduce((s, f) => s + fs.statSync(path.join(OUT, "shapes", f)).size, 0);
const counts = pool.reduce((c, p) => ((c[p.kind] = (c[p.kind] ?? 0) + 1), c), {});
console.log(`daily pool: ${pool.length} shapes ${JSON.stringify(counts)}, outlines ${(bytes / 1024).toFixed(0)} KB total`);
