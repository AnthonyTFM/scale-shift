// Builds every map data file the site ships with.
// Run with: npm run data   (only needed if you change sources or settings below)
//
// Sources (see /about for full credits):
//   - historical-basemaps by André Ourednik (GPL-3.0): border snapshots 2000 BCE -> 2010
//   - Natural Earth 1:50m via world-atlas (public domain): present-day borders
//   - US Census via us-atlas (public domain): US states
//   - World Bank population via datasets/population (ODC-PDDL)
//   - country-flag-icons (MIT): flags

import fs from "node:fs";
import path from "node:path";
import { geoArea, geoBounds, geoCentroid, geoContains } from "d3-geo";
import * as server from "topojson-server";
import * as simplifyLib from "topojson-simplify";
import * as client from "topojson-client";
import iso from "i18n-iso-countries";
import polygonClipping from "polygon-clipping";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE = path.join(ROOT, ".cache");
const HB_DIR = path.join(CACHE, "historical-basemaps");
const HB_RAW = "https://raw.githubusercontent.com/aourednik/historical-basemaps/master";
const OUT_PUBLIC = path.join(ROOT, "public", "data");
const OUT_SRC = path.join(ROOT, "src", "data");
const EARTH_R = 6371.0088;
const FIRST_YEAR = -2000;

// Simplification strength (planar triangle area in degrees²). Higher = smaller files, rougher borders.
const SIMPLIFY_HISTORICAL = 0.006;
const SIMPLIFY_PRESENT = 0.006;
const SIMPLIFY_STATES = 0.001;
const QUANTIZE = 1e5; // precision while building topology
const OUTPUT_QUANTIZE = 2e4; // precision written to disk (~2 km at the equator)

const require = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", p), "utf8"));
const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
  return fs.statSync(file).size;
};
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export const eraKey = (year) => (year === "present" ? "present" : year < 0 ? `${-year}bce` : `${year}`);
export const eraLabel = (year) =>
  year === "present" ? "Present" : year < 0 ? `${-year} BCE` : year < 1000 ? `${year} CE` : `${year}`;

// ---------- geometry helpers ----------

/** d3 expects spherical polygons with clockwise exterior rings; GeoJSON files often use the opposite. */
function fixWinding(geometry) {
  if (!geometry) return null;
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  const fixed = [];
  for (const ringsIn of polys) {
    // Drop "rings" that are just a line along a pole (Natural Earth's Antarctica has one); the coastline
    // inside it then becomes the outline, which is what d3 expects.
    const rings = ringsIn.filter((r) => !r.every((pt) => Math.abs(pt[1]) > 89.9));
    if (!rings.length || rings[0].length < 4) continue;
    let poly = { type: "Polygon", coordinates: rings };
    if (geoArea(poly) > 2 * Math.PI) {
      poly = { type: "Polygon", coordinates: rings.map((r) => [...r].reverse()) };
    }
    fixed.push(poly.coordinates);
  }
  if (!fixed.length) return null;
  return { type: "MultiPolygon", coordinates: fixed };
}

const km2 = (geometry) => (geometry ? geoArea(geometry) * EARTH_R * EARTH_R : 0);

/** Label anchor: centroid of the largest polygon. */
function labelPoint(geometry) {
  let best = null;
  let bestArea = -1;
  for (const rings of geometry.coordinates) {
    const p = { type: "Polygon", coordinates: rings };
    const a = geoArea(p);
    if (a > bestArea) {
      bestArea = a;
      best = p;
    }
  }
  const c = geoCentroid(best);
  return [round(c[0]), round(c[1])];
}

/** Merge all features sharing a name into one MultiPolygon (keeps every part). */
function groupByName(features) {
  const groups = new Map();
  for (const f of features) {
    const key = f.properties.n;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  const out = [];
  for (const [n, fs_] of groups) {
    const coords = fs_.flatMap((f) => f.geometry.coordinates);
    const b = Math.min(...fs_.map((f) => f.properties.b ?? 1));
    const base = fs_.reduce((a, f) => (km2(f.geometry) > km2(a.geometry) ? f : a), fs_[0]);
    out.push({
      type: "Feature",
      properties: { ...base.properties, n, b },
      geometry: { type: "MultiPolygon", coordinates: coords },
    });
  }
  return out;
}

function toTopology(features, minWeight) {
  let topo = server.topology({ p: { type: "FeatureCollection", features } }, QUANTIZE);
  topo = simplifyLib.presimplify(topo);
  topo = simplifyLib.simplify(topo, minWeight);
  // Drop specks smaller than ~40 km², measured on the sphere with d3 (a planar test deletes rings around a pole,
  // e.g. Antarctica). Rings that simplification turned inside-out (area > half the globe) are dropped too.
  const ringWeight = (ring, interior) => {
    const a = geoArea({ type: "Polygon", coordinates: [interior ? [...ring].reverse() : ring] });
    return a > 2 * Math.PI ? 0 : a;
  };
  topo = simplifyLib.filter(topo, simplifyLib.filterWeight(topo, 1e-6, ringWeight));
  return client.quantize(topo, OUTPUT_QUANTIZE);
}

// ---------- colours ----------
// Political-map colouring: every owner gets one of PALETTE_SIZE colours, never the same as a neighbour.
const PALETTE_SIZE = 8;
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function assignColors(topo) {
  const geoms = topo.objects.p.geometries;
  const nb = client.neighbors(geoms);
  const ownerOf = (g) => (g.properties?.n ? g.properties.s || g.properties.n : null);
  const adj = new Map();
  geoms.forEach((g, i) => {
    const o = ownerOf(g);
    if (!o) return;
    if (!adj.has(o)) adj.set(o, new Set());
    for (const j of nb[i]) {
      const other = ownerOf(geoms[j]);
      if (other && other !== o) adj.get(o).add(other);
    }
  });
  const color = new Map();
  for (const o of [...adj.keys()].sort((a, b) => adj.get(b).size - adj.get(a).size || a.localeCompare(b))) {
    const used = new Set([...adj.get(o)].map((x) => color.get(x)).filter((x) => x !== undefined));
    const start = hashString(o) % PALETTE_SIZE;
    let pick = start;
    for (let t = 0; t < PALETTE_SIZE; t++) {
      const c = (start + t) % PALETTE_SIZE;
      if (!used.has(c)) {
        pick = c;
        break;
      }
    }
    color.set(o, pick);
  }
  for (const g of geoms) {
    const o = ownerOf(g);
    if (o) g.properties.k = color.get(o);
  }
  return topo;
}

// ---------- gaps: land the source leaves blank ----------
let landNoLakesCache = null;
function landNoLakes() {
  if (landNoLakesCache) return landNoLakesCache;
  const cacheFile = path.join(CACHE, "land-nolakes.json");
  if (fs.existsSync(cacheFile)) return (landNoLakesCache = JSON.parse(fs.readFileSync(cacheFile, "utf8")));
  const read = (f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8"));
  const polys = (fc) =>
    fc.features.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : []));
  // skip Antarctica (handled by the sources themselves; planar clipping is unreliable near the pole)
  const land = polys(read("ne_50m_land.geojson")).filter((p) => p[0].some(([, y]) => y > -60));
  const lakes = polys(read("ne_50m_lakes.geojson"));
  landNoLakesCache = polygonClipping.difference(land, ...lakes);
  fs.writeFileSync(cacheFile, JSON.stringify(landNoLakesCache));
  return landNoLakesCache;
}

function ringPerimeterKm(ring) {
  let d = 0;
  for (let i = 1; i < ring.length; i++) {
    const [x1, y1] = ring[i - 1];
    const [x2, y2] = ring[i];
    const dx = ((x2 - x1) * Math.PI) / 180 * Math.cos((((y1 + y2) / 2) * Math.PI) / 180);
    const dy = ((y2 - y1) * Math.PI) / 180;
    d += Math.hypot(dx, dy) * EARTH_R;
  }
  return d;
}

/** Pieces of real land not covered by any shape in this era: compact pieces only (not coastline slivers). */
function missingLand(features) {
  const clips = features.flatMap((f) => f.geometry.coordinates).filter((p) => p[0].length > 3);
  let diff;
  try {
    diff = polygonClipping.difference(landNoLakes(), ...clips);
  } catch (err) {
    console.warn("   (gap fill skipped:", err.message, ")");
    return [];
  }
  const out = [];
  for (const poly of diff) {
    const g = fixWinding({ type: "Polygon", coordinates: poly });
    if (!g) continue;
    const a = km2(g);
    const per = ringPerimeterKm(poly[0]);
    if (a >= 1500 && a / per >= 4) out.push({ type: "Feature", properties: { n: "", b: 1, m: 1, a: Math.round(a) }, geometry: g });
  }
  return out;
}

// ---------- names ----------

const NAME_FIX = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "DR Congo",
  "Central African Rep.": "Central African Republic",
  "Dominican Rep.": "Dominican Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "S. Sudan": "South Sudan",
  "Eq. Guinea": "Equatorial Guinea",
  "W. Sahara": "Western Sahara",
  "Solomon Is.": "Solomon Islands",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern Lands",
  "Fr. Polynesia": "French Polynesia",
  "N. Cyprus": "Northern Cyprus",
  "Marshall Is.": "Marshall Islands",
  "N. Mariana Is.": "Northern Mariana Islands",
  "U.S. Virgin Is.": "US Virgin Islands",
  "British Virgin Is.": "British Virgin Islands",
  "S. Geo. and the Is.": "South Georgia and the South Sandwich Islands",
  "Br. Indian Ocean Ter.": "British Indian Ocean Territory",
  "Pitcairn Is.": "Pitcairn Islands",
  "Cayman Is.": "Cayman Islands",
  "Turks and Caicos Is.": "Turks and Caicos Islands",
  "St. Vin. and Gren.": "Saint Vincent and the Grenadines",
  "St. Kitts and Nevis": "Saint Kitts and Nevis",
  "Cook Is.": "Cook Islands",
  "St. Pierre and Miquelon": "Saint Pierre and Miquelon",
  "Wallis and Futuna Is.": "Wallis and Futuna",
  "Faeroe Is.": "Faroe Islands",
  "Indian Ocean Ter.": "Australian Indian Ocean Territories",
  "Heard I. and McDonald Is.": "Heard Island and McDonald Islands",
  "Ashmore and Cartier Is.": "Ashmore and Cartier Islands",
  "Antigua and Barb.": "Antigua and Barbuda",
  "eSwatini": "Eswatini",
  Macedonia: "North Macedonia",
  Turkey: "Türkiye",
  "Czech Rep.": "Czechia",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "St-Martin": "Saint Martin",
  "St-Barthélemy": "Saint Barthélemy",
  "Sint Maarten": "Sint Maarten",
  "Timor-Leste": "Timor-Leste",
  "São Tomé and Principe": "São Tomé and Príncipe",
};
// Fixes to the historical source (names, rulers, notes). Shared with /about so every fix is public.
const CORRECTION_RULES = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "content", "data-corrections.json"), "utf8")).rules;
const ruleFor = new Map();
for (const r of CORRECTION_RULES) for (const y of r.years) ruleFor.set(`${y}|${r.name}`, r);
const usedKeys = new Set();

// Present-day shapes that are themselves disputed; ids match src/content/disputes.ts
const DISPUTE_TAGS = {
  "Western Sahara": "western-sahara",
  "Northern Cyprus": "northern-cyprus",
  Kosovo: "kosovo",
  Somaliland: "somaliland",
  Taiwan: "taiwan",
  "Siachen Glacier": "kashmir",
  "Falkland Islands": "falklands",
  Palestine: "palestine",
};
const ALPHA2_FIX = { Kosovo: "XK", "Northern Cyprus": null, Somaliland: null, "Siachen Glacier": null };

// ---------- islands the source leaves out ----------
// A missing island is given to a neighbouring state only when that is safe: the nearest state in this era is
// within 60 km AND it is the same country that owns the island today. Otherwise it stays "not mapped".
const SAME_STATE = { "United States of America": "United States", Turkey: "Türkiye", "Republic of Turkey": "Türkiye", Burma: "Myanmar" };
const sameName = (n) => SAME_STATE[n] || n;
let presentLookup = null;
function presentOwnerAt(pt) {
  if (!presentLookup) {
    const ne = require("world-atlas/countries-50m.json");
    presentLookup = client
      .feature(ne, ne.objects.countries)
      .features.map((f) => ({ n: NAME_FIX[f.properties.name] || f.properties.name, g: fixWinding(f.geometry) }))
      .filter((x) => x.g)
      .map((x) => ({ ...x, bb: geoBounds(x.g) }));
  }
  const inBox = ([[a, b], [c, d]], [x, y]) => y >= b && y <= d && (a <= c ? x >= a && x <= c : x >= a || x <= c);
  return presentLookup.find((x) => inBox(x.bb, pt) && geoContains(x.g, pt))?.n ?? null;
}
function distanceKm([x1, y1], [x2, y2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((y2 - y1) * r) / 2) ** 2 + Math.cos(y1 * r) * Math.cos(y2 * r) * Math.sin(((x2 - x1) * r) / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}
function ownerForIsland(patch, features) {
  const c = geoCentroid(patch.geometry);
  const today = presentOwnerAt(c);
  if (!today) return null;
  let best = null;
  let bestKm = 60;
  for (const f of features) {
    if (!f.properties.n) continue;
    for (const rings of f.geometry.coordinates) {
      const ring = rings[0];
      const step = Math.max(1, Math.floor(ring.length / 300));
      for (let i = 0; i < ring.length; i += step) {
        if (Math.abs(ring[i][1] - c[1]) > 2) continue;
        const d = distanceKm(c, ring[i]);
        if (d < bestKm) {
          bestKm = d;
          best = f;
        }
      }
    }
  }
  return best && sameName(best.properties.n) === today ? best : null;
}

// ---------- geometry fixes ----------

/** Svalbard belonged to no state until the 1920 Svalbard Treaty (in force 1925); the source draws it inside Norway. */
function splitSvalbard(features, year) {
  if (year > 1920) return;
  const isSvalbard = (rings) => {
    const c = geoCentroid({ type: "Polygon", coordinates: rings });
    return c[1] > 74 && c[0] > 5 && c[0] < 35;
  };
  for (const f of features) {
    if (!/Norway/.test(f.properties.n)) continue;
    const parts = f.geometry.coordinates.filter(isSvalbard);
    if (!parts.length) continue;
    f.geometry.coordinates = f.geometry.coordinates.filter((r) => !isSvalbard(r));
    const note =
      year === 1920
        ? "Granted to Norway by the 1920 Svalbard Treaty; Norwegian sovereignty took effect in 1925."
        : year < 1596
          ? "Unknown to Europeans until 1596 (some read a 1194 Norse saga as an earlier sighting); no state ruled it."
          : "No country owned Svalbard until the 1920 Svalbard Treaty. The source drew it inside Norway.";
    const props = { n: "Svalbard", b: 1, w: note };
    if (year === 1920) props.s = "Norway";
    features.push({ type: "Feature", properties: props, geometry: { type: "MultiPolygon", coordinates: parts } });
  }
}

/** In 1400 the source still draws the Mongol Yuan state over China. Split it using the 1492 Ming outline. */
function splitMing1400(features) {
  const gk = features.find((f) => f.properties.n === "Great Khanate");
  if (!gk) return console.warn("  ! 1400: Great Khanate not found");
  const raw1492 = JSON.parse(fs.readFileSync(path.join(HB_DIR, "world_1492.geojson"), "utf8"));
  const ming = raw1492.features.filter((f) => (f.properties.NAME || "").trim() === "Ming Empire").map((f) => fixWinding(f.geometry));
  const mingCoords = ming.flatMap((g) => g.coordinates);
  const inside = polygonClipping.intersection(gk.geometry.coordinates, mingCoords);
  const outside = polygonClipping.difference(gk.geometry.coordinates, mingCoords);
  const asGeom = (mp) => fixWinding({ type: "MultiPolygon", coordinates: mp });
  const mingGeom = asGeom(inside);
  const yuanGeom = asGeom(outside);
  features.splice(features.indexOf(gk), 1);
  if (mingGeom)
    features.push({
      type: "Feature",
      properties: { n: "Ming Empire", b: 1, w: "The Ming dynasty ruled China from 1368. This outline is approximated from the 1492 snapshot, because the source still drew the Mongol Yuan state here." },
      geometry: mingGeom,
    });
  if (yuanGeom)
    features.push({
      type: "Feature",
      properties: { n: "Northern Yuan", b: 1, w: "After losing China in 1368, the Mongol court retreated north as the Northern Yuan." },
      geometry: yuanGeom,
    });
}

// ---------- download ----------

async function ensureSnapshots() {
  fs.mkdirSync(HB_DIR, { recursive: true });
  const indexFile = path.join(HB_DIR, "index.json");
  if (!fs.existsSync(indexFile)) {
    const res = await fetch(`${HB_RAW}/index.json`);
    fs.writeFileSync(indexFile, await res.text());
  }
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8")).years.filter((y) => y.year >= FIRST_YEAR);
  for (const entry of index) {
    const file = path.join(HB_DIR, entry.filename);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) continue;
    console.log("  downloading", entry.filename);
    const res = await fetch(`${HB_RAW}/geojson/${entry.filename}`);
    if (!res.ok) throw new Error(`Download failed: ${entry.filename} (${res.status})`);
    fs.writeFileSync(file, await res.text());
  }
  return index.sort((a, b) => a.year - b.year);
}

// ---------- main ----------

async function main() {
  console.log("1/6 Historical snapshots");
  const index = await ensureSnapshots();
  const eras = [];
  const polities = new Map(); // name -> { y: [], a: [], e: [], s }
  const eraAreas = []; // per era: Map name -> km2
  const gridSources = []; // per era: named features, used for "Who ruled here?"

  for (const entry of index) {
    const raw = JSON.parse(fs.readFileSync(path.join(HB_DIR, entry.filename), "utf8"));
    const features = [];
    for (const f of raw.features) {
      const geometry = fixWinding(f.geometry);
      if (!geometry) continue;
      const P = f.properties || {};
      const rawName = (P.NAME || "").trim();
      const rawSubject = (P.SUBJECTO || "").trim();
      const fix = ruleFor.get(`${entry.year}|${rawName}`) || {};
      if (fix.name) usedKeys.add(`${entry.year}|${rawName}`);
      const n = fix.n || rawName;
      // a ruler that was itself renamed this year follows the new name ("Kingdom of Brazil" → "Empire of Brazil")
      const subjectFix = ruleFor.get(`${entry.year}|${rawSubject}`);
      let s = "s" in fix ? fix.s || "" : subjectFix?.n || rawSubject;
      if (rawSubject === "Mongol Empire" && entry.year >= 1400) s = ""; // the united Mongol Empire was long gone
      const p = (P.PARTOF || "").trim();
      const props = { n, b: Number(P.BORDERPRECISION) || 1 };
      if (n && s && s !== n) props.s = s;
      if (n && p && p !== n && p !== s) props.p = p;
      if (fix.note) props.w = fix.note;
      features.push({ type: "Feature", properties: props, geometry });
    }
    const grouped = groupByName(features);
    splitSvalbard(grouped, entry.year);
    if (entry.year === 1400) splitMing1400(grouped);
    const areas = new Map();
    for (const f of grouped) {
      const a = km2(f.geometry);
      f.properties.a = Math.round(a);
      if (f.properties.n) {
        f.properties.l = labelPoint(f.geometry);
        areas.set(f.properties.n, a);
      }
    }
    // empire totals: a polity plus everything listing it as SUBJECTO
    const empire = new Map();
    for (const f of grouped) {
      const owner = f.properties.s || f.properties.n;
      if (!owner) continue;
      empire.set(owner, (empire.get(owner) || 0) + f.properties.a);
    }
    for (const f of grouped) {
      const n = f.properties.n;
      if (!n) continue;
      const e = empire.get(n) || 0;
      if (e > f.properties.a * 1.05) f.properties.e = Math.round(e);
      if (!polities.has(n)) polities.set(n, { y: [], a: [], e: [], s: "" });
      const rec = polities.get(n);
      rec.y.push(entry.year);
      rec.a.push(Math.round(f.properties.a));
      rec.e.push(f.properties.e || 0);
      if (f.properties.s) rec.s = f.properties.s;
    }
    let topo = toTopology(grouped, SIMPLIFY_HISTORICAL);
    const allPatches = missingLand(client.feature(topo, topo.objects.p).features.map((f) => ({ geometry: { coordinates: f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates } })));
    const patches = [];
    let joined = 0;
    for (const patch of allPatches) {
      const owner = ownerForIsland(patch, grouped);
      if (owner) {
        owner.geometry.coordinates.push(...patch.geometry.coordinates);
        joined++;
      } else patches.push(patch);
    }
    if (allPatches.length) topo = toTopology([...grouped, ...patches], SIMPLIFY_HISTORICAL);
    assignColors(topo);
    gridSources.push(grouped.filter((f) => f.properties.n));
    const key = eraKey(entry.year);
    const bytes = writeJson(path.join(OUT_PUBLIC, "eras", `${key}.json`), topo);
    const named = grouped.filter((f) => f.properties.n);
    const precision = Math.round(
      named.reduce((sum, f) => sum + f.properties.b, 0) / Math.max(1, named.length),
    );
    eras.push({ key, year: entry.year, label: eraLabel(entry.year), count: named.length, precision, bytes });
    eraAreas.push(areas);
    console.log(
      `  ${eraLabel(entry.year).padEnd(9)} ${String(named.length).padStart(4)} polities  ${(bytes / 1024).toFixed(0)} KB  ${joined} islands joined to their state, ${patches.length} left as not mapped (${Math.round(patches.reduce((t, f) => t + f.properties.a, 0) / 1000)}k km²)`,
    );
  }

  for (const r of CORRECTION_RULES)
    for (const y of r.years) if (!usedKeys.has(`${y}|${r.name}`)) console.warn(`  ! correction rule matched nothing: ${r.name} in ${y}`);

  console.log("2/6 Present-day borders (Natural Earth)");
  const pop = loadPopulation();
  const ne = require("world-atlas/countries-50m.json");
  const neFeatures = client.feature(ne, ne.objects.countries).features;
  const flagsDir = path.join(ROOT, "public", "flags");
  fs.mkdirSync(flagsDir, { recursive: true });
  const present = [];
  for (const f of neFeatures) {
    const geometry = fixWinding(f.geometry);
    if (!geometry) continue;
    const n = NAME_FIX[f.properties.name] || f.properties.name;
    if (n === "Russia") {
      // Natural Earth draws Crimea inside Russia (de facto). Split it out as its own disputed shape.
      const isCrimea = (rings) => {
        const c = geoCentroid({ type: "Polygon", coordinates: rings });
        return c[0] > 32 && c[0] < 37 && c[1] > 44 && c[1] < 46.3;
      };
      const crimea = geometry.coordinates.filter(isCrimea);
      geometry.coordinates = geometry.coordinates.filter((r) => !isCrimea(r));
      if (crimea.length) {
        const cg = { type: "MultiPolygon", coordinates: crimea };
        present.push({ type: "Feature", properties: { n: "Crimea", b: 2, a: Math.round(km2(cg)), l: labelPoint(cg), d: "crimea" }, geometry: cg });
        if (!polities.has("Crimea")) polities.set("Crimea", { y: [], a: [], e: [], s: "" });
        polities.get("Crimea").y.push("present");
        polities.get("Crimea").a.push(Math.round(km2(cg)));
        polities.get("Crimea").e.push(0);
      }
    }
    const props = { n, b: 3, a: Math.round(km2(geometry)), l: labelPoint(geometry) };
    if (DISPUTE_TAGS[n]) props.d = DISPUTE_TAGS[n];
    const a2 = n in ALPHA2_FIX ? ALPHA2_FIX[n] : f.id ? iso.numericToAlpha2(f.id) : null;
    if (a2) {
      const flagSrc = path.join(ROOT, "node_modules", "country-flag-icons", "3x2", `${a2}.svg`);
      if (fs.existsSync(flagSrc)) {
        fs.copyFileSync(flagSrc, path.join(flagsDir, `${a2}.svg`));
        props.f = a2;
      }
      const a3 = a2 === "XK" ? "XKX" : iso.alpha2ToAlpha3(a2);
      if (a3 && pop.has(a3)) {
        const [year, value] = pop.get(a3);
        props.pop = value;
        props.py = year;
      }
    }
    present.push({ type: "Feature", properties: props, geometry });
    if (!polities.has(n)) polities.set(n, { y: [], a: [], e: [], s: "" });
    const rec = polities.get(n);
    rec.y.push("present");
    rec.a.push(props.a);
    rec.e.push(0);
    if (props.f) rec.f = props.f;
  }
  gridSources.push(present);
  const presentBytes = writeJson(path.join(OUT_PUBLIC, "eras", "present.json"), assignColors(toTopology(present, SIMPLIFY_PRESENT)));
  eras.push({ key: "present", year: "present", label: "Present", count: present.length, precision: 3, bytes: presentBytes });
  console.log(`  Present   ${present.length} countries  ${(presentBytes / 1024).toFixed(0)} KB`);

  console.log("3/6 US states");
  const us = require("us-atlas/states-10m.json");
  const stateFeatures = client.feature(us, us.objects.states).features;
  const states = [];
  const contiguous = [];
  const NON_CONTIGUOUS = new Set(["02", "15", "60", "66", "69", "72", "78"]);
  for (const f of stateFeatures) {
    const geometry = fixWinding(f.geometry);
    if (!geometry) continue;
    const props = { n: f.properties.name, c: STATE_POSTAL[f.id] || "", b: 3, a: Math.round(km2(geometry)), l: labelPoint(geometry) };
    states.push({ type: "Feature", properties: props, geometry });
    if (!NON_CONTIGUOUS.has(f.id)) contiguous.push(f);
  }
  const contiguousGeom = fixWinding(client.merge(us, us.objects.states.geometries.filter((g) => !NON_CONTIGUOUS.has(g.id))));
  states.push({
    type: "Feature",
    properties: { n: "Contiguous United States", c: "", b: 3, a: Math.round(km2(contiguousGeom)), l: labelPoint(contiguousGeom), x: 1 },
    geometry: contiguousGeom,
  });
  const statesBytes = writeJson(path.join(OUT_PUBLIC, "us-states.json"), toTopology(states, SIMPLIFY_STATES));
  console.log(`  ${states.length} shapes  ${(statesBytes / 1024).toFixed(0)} KB`);

  console.log("4/6 Search index");
  const searchIndex = [...polities.entries()].map(([n, r]) => {
    const row = { n, y: r.y, a: r.a };
    if (r.e.some((v) => v)) row.e = r.e;
    if (r.s) row.s = r.s;
    if (r.f) row.f = r.f;
    return row;
  });
  for (const f of states) {
    searchIndex.push({ n: f.properties.n, y: ["present"], a: [f.properties.a], us: 1 });
  }
  const searchBytes = writeJson(path.join(OUT_PUBLIC, "polities.json"), searchIndex);
  console.log(`  ${searchIndex.length} searchable names  ${(searchBytes / 1024).toFixed(0)} KB`);

  console.log("5/6 Era statistics");
  const stats = eras.map((era, i) => {
    const areas = eraAreas[i];
    const out = { key: era.key, top: [], gained: [], lost: [], appeared: [], vanished: [] };
    if (!areas) {
      const top = [...present].sort((a, b) => b.properties.a - a.properties.a).slice(0, 12);
      out.top = top.map((f) => ({ n: f.properties.n, a: f.properties.a }));
      return out;
    }
    out.top = [...areas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([n, a]) => ({ n, a: Math.round(a) }));
    const prev = eraAreas[i - 1];
    if (!prev) return out;
    const significant = (before, after) => Math.abs(after - before) > Math.max(20000, 0.08 * Math.max(before, after));
    const changes = [];
    for (const [n, a] of areas) {
      if (prev.has(n)) {
        const b = prev.get(n);
        if (significant(b, a)) changes.push({ n, from: Math.round(b), to: Math.round(a) });
      } else if (a > 20000) out.appeared.push({ n, a: Math.round(a) });
    }
    for (const [n, b] of prev) if (!areas.has(n) && b > 20000) out.vanished.push({ n, a: Math.round(b) });
    out.gained = changes.filter((c) => c.to > c.from).sort((x, y) => y.to - y.from - (x.to - x.from)).slice(0, 8);
    out.lost = changes.filter((c) => c.to < c.from).sort((x, y) => x.to - x.from - (y.to - y.from)).slice(0, 8);
    out.appeared = out.appeared.sort((x, y) => y.a - x.a).slice(0, 8);
    out.vanished = out.vanished.sort((x, y) => y.a - x.a).slice(0, 8);
    return out;
  });
  console.log("6/6 Who-ruled-here grid");
  const gridBytes = writeJson(path.join(OUT_PUBLIC, "rulers-grid.json"), buildGrid(gridSources));
  console.log(`  ${(gridBytes / 1024).toFixed(0)} KB`);

  writeJson(path.join(OUT_SRC, "eras.json"), eras);
  // version stamp: the site adds ?v=… to data URLs so browsers fetch fresh files after every rebuild
  const stamp = hashString(JSON.stringify(eras) + fs.statSync(path.join(OUT_PUBLIC, "rulers-grid.json")).size).toString(36);
  writeJson(path.join(OUT_SRC, "data-version.json"), { v: stamp });
  writeJson(path.join(OUT_SRC, "era-stats.json"), stats);
  writeJson(path.join(OUT_PUBLIC, "era-stats.json"), stats);
  console.log("Done.");
}

// ---------- "Who ruled here?" grid ----------
// For every 1° land cell, record which named polity covers the cell centre in each era.
// Output: { step, names[], cells: { "<lonIdx>_<latIdx>": [eraIdx, nameIdx, eraIdx, nameIdx, ...] } }
// where each pair marks a change of ruler (nameIdx -1 = no named polity in the source).
function buildGrid(sourcesPerEra) {
  const STEP = 1;
  const names = [];
  const nameIdx = new Map();
  const idxOf = (n) => {
    if (!nameIdx.has(n)) {
      nameIdx.set(n, names.length);
      names.push(n);
    }
    return nameIdx.get(n);
  };
  const cols = 360 / STEP;
  const perEra = sourcesPerEra.map((features) => {
    const owner = new Map(); // cell -> [nameIdx, area]
    for (const f of features) {
      const id = idxOf(f.properties.n);
      for (const rings of f.geometry.coordinates) {
        const outer = rings[0];
        let minX = 180, maxX = -180, minY = 90, maxY = -90;
        for (const [x, y] of outer) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        if (maxX - minX > 300) continue; // ring wraps the antimeridian; skip (rare, tiny effect)
        for (let gx = Math.floor((minX + 180) / STEP); gx <= Math.floor((maxX + 180) / STEP); gx++) {
          const cx = -180 + (gx + 0.5) * STEP;
          if (cx < minX || cx > maxX) continue;
          for (let gy = Math.floor((minY + 90) / STEP); gy <= Math.floor((maxY + 90) / STEP); gy++) {
            const cy = -90 + (gy + 0.5) * STEP;
            if (cy < minY || cy > maxY) continue;
            if (!inPolygon(cx, cy, rings)) continue;
            const cell = gy * cols + gx;
            const prev = owner.get(cell);
            // overlapping claims: keep the smaller (more specific) polity
            if (!prev || f.properties.a < prev[1]) owner.set(cell, [id, f.properties.a]);
          }
        }
      }
    }
    return owner;
  });
  const allCells = new Set(perEra.flatMap((m) => [...m.keys()]));
  const cells = {};
  for (const cell of allCells) {
    const seq = [];
    let last = -2;
    perEra.forEach((m, era) => {
      const v = m.has(cell) ? m.get(cell)[0] : -1;
      if (v !== last) {
        seq.push(era, v);
        last = v;
      }
    });
    cells[`${cell % cols}_${Math.floor(cell / cols)}`] = seq;
  }
  return { step: STEP, names, cells };
}

function inPolygon(x, y, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function loadPopulation() {
  const file = path.join(CACHE, "population.csv");
  const map = new Map();
  if (!fs.existsSync(file)) {
    console.warn("  (no .cache/population.csv — population figures skipped)");
    return map;
  }
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").slice(1);
  for (const line of lines) {
    const parts = line.split(",");
    const value = Number(parts.at(-1));
    const year = Number(parts.at(-2));
    const code = parts.at(-3);
    if (!Number.isFinite(value) || !code) continue;
    const prev = map.get(code);
    if (!prev || prev[0] < year) map.set(code, [year, value]);
  }
  return map;
}

const STATE_POSTAL = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE", "11": "DC",
  "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT",
  "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
  "72": "PR", "78": "VI",
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
