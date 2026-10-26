// Builds every map data file the site ships with.
// Run with: npm run data   (only needed if you change sources or settings below)
//
// Sources (see /about for full credits):
//   - historical-basemaps by André Ourednik (GPL-3.0): border snapshots 2000 BCE -> 1960
//   - HistoGIS (CC BY 4.0): Europe in 1900 and 1914; OpenHistoricalMap (CC0): Europe from 1920 to 1960
//   - Natural Earth 1:50m via world-atlas (public domain): present-day borders, the maps from 1994, and fixes before
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
import { recolorEraFiles, settleEraFiles } from "./lib/colors.mjs";
import { separateEraFiles } from "./lib/overlaps.mjs";
import { fillGapEraFiles } from "./lib/gaps.mjs";
import { histogisStates } from "./lib/histogis.mjs";
import { ohmRelations } from "./lib/ohm.mjs";
import { cliopatriaPolities } from "./lib/cliopatria.mjs";
import { writeFileRetrying } from "./lib/files.mjs";
import { eraStatsFromFiles } from "./lib/era-stats.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
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
  writeFileRetrying(file, JSON.stringify(data));
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

// ---------- colours: every owner keeps one colour across all eras, see scripts/lib/colors.mjs (run at the end) ----------
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
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
let landCache = null;
/** Natural Earth's land with its lakes (the lakes are drawn over every era as water anyway); Antarctica left out. */
function landWithLakes() {
  if (landCache) return landCache;
  const fc = JSON.parse(fs.readFileSync(path.join(CACHE, "ne_50m_land.geojson"), "utf8"));
  landCache = fc.features
    .flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : []))
    .filter((p) => p[0].some(([, y]) => y > -60));
  return landCache;
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

/**
 * Pieces of real land not covered by any shape in this era: compact pieces only (not coastline slivers). One landmass
 * at a time, so a clipping failure on one leaves the others filled.
 */
function missingLand(features) {
  const clips = features
    .flatMap((f) => f.geometry.coordinates)
    .filter((p) => p[0].length > 3)
    .map((p) => ({ p, box: boxOfPolys([p]) }));
  const diff = [];
  let failed = 0;
  for (const land of landNoLakes()) {
    const box = boxOfPolys([land]);
    const near = clips.filter((c) => boxesMeet(c.box, box)).map((c) => c.p);
    const left = near.length ? clipSafely(polygonClipping.difference, [land], near) : [land];
    if (left) diff.push(...left);
    else failed++;
  }
  if (failed) console.warn(`   (gap fill skipped on ${failed} landmass${failed === 1 ? "" : "es"})`);
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

// ---------- 1994, 2000 and 2010 from Natural Earth ----------
// These snapshots are drawn from Natural Earth's present-day borders (public domain, and far more precise than the
// historical source), rolled back to 31 December of each year with the changes made since. Dates checked against
// CShapes 2.0 (ETH Zurich).
const FROM_NATURAL_EARTH = new Set([1994, 2000, 2010]);

// ---------- the maps from 1800 to 1960: built without historical-basemaps ----------
// Their base is Cliopatria (CC BY 4.0, see scripts/lib/cliopatria.mjs): the world's polities digitised from historical
// atlases. OpenHistoricalMap's dated borders and HistoGIS's (Europe, from 1815 to 1914) are laid over it.
// Cliopatria names the empire a polity belongs to ("(British Empire)"); here, the ruler's shape on that map.
const FROM_CLIOPATRIA = new Set([1800, 1815, 1878, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960]);
const CLIO_EMPIRES = (uk) => ({ "(British Empire)": uk, "(Spanish Empire)": "Spain", "(Portuguese Empire)": "Portugal", "(French Third Republic)": "France", "(French Fourth Republic)": "France", "(Vichy France)": "France", "(Netherlands)": "Netherlands" });
const CLIO_RULERS = {
  1800: { "(British Empire)": "Kingdom of Great Britain", "(Spanish Empire)": "Spain", "(Portuguese Empire)": "Kingdom of Portugal", "(French Consulate)": "French Republic", "(Kingdom of France)": "French Republic", "(Batavian Republic)": "Batavian Republic" },
  1815: { "(British Empire)": "United Kingdom of Great Britain and Ireland", "(Spanish Empire)": "Spain", "(Portuguese Empire)": "United Kingdom of Portugal, Brazil and the Algarves", "(Bourbon Kingdom of France)": "Kingdom of France", "(Netherlands)": "United Kingdom of the Netherlands" },
  1878: { "(British Empire)": "United Kingdom of Great Britain and Ireland", "(Spanish Empire)": "Spain", "(Portuguese Empire)": "Portugal", "(French Third Republic)": "France", "(Netherlands)": "Netherlands" },
};
CLIO_RULERS[1880] = CLIO_RULERS[1878];
for (const year of [1900, 1914, 1920, 1930]) CLIO_RULERS[year] = CLIO_EMPIRES("United Kingdom of Great Britain and Ireland");
for (const year of [1938, 1945, 1960]) CLIO_RULERS[year] = CLIO_EMPIRES("United Kingdom");
// parts of a Cliopatria polity that are a territory of their own, by the box their middle lies in: Cliopatria often
// groups an empire's scattered pieces under one name (its row for British India also holds the fur-trading posts of
// North America). `member`: the empire they belong to, where it differs from the row's ("" for none), or `s`: their
// ruler; `years`: only on these maps; `drop`: a piece the empire did not hold, left out
const CLIO_PARTS = [
  { from: "British Empire", box: [-170, 30, -50, 75], name: "British trading posts" },
  { from: "British Colonial Empire", box: [-40, -56, -33, -53], name: "South Georgia" },
  // Papua's islands, and Bass Strait's (Tasmanian)
  { from: "British Colonial Empire", box: [149, -12, 154.6, -8], name: "British New Guinea", member: "(British Empire)", years: [1900] },
  { from: "British Colonial Empire", box: [149, -12, 154.6, -8], name: "Territory of Papua", s: "Australia", years: [1914, 1920, 1930, 1938, 1945] },
  { from: "British Colonial Empire", box: [149, -12, 154.6, -8], name: "Territory of Papua and New Guinea", s: "Australia", years: [1960] },
  { from: "British Colonial Empire", box: [143.5, -40.5, 148.6, -39], name: "Tasmania (UK)", member: "(British Empire)", years: [1900] },
  { from: "British Colonial Empire", box: [143.5, -40.5, 148.6, -39], name: "Australia", s: "", years: [1914, 1920, 1930, 1938, 1945, 1960] },
  // a strip of the Empty Quarter south of the Trucial coast, which no one held
  { from: "Kingdom of Great Britain", box: [50, 19, 58, 24.4], drop: true, years: [1900, 1914, 1920, 1930, 1938, 1945, 1960] },
  { from: "British Colonial Empire", box: [99.5, 4.5, 101, 6], name: "Prince of Wales Island", years: [1800, 1815] }, // Penang
  { from: "British Colonial Empire", box: [101.5, 1.8, 103, 3], name: "Malacca", years: [1800] },
  { from: "British Colonial Empire", box: [-61.3, 14.3, -60.7, 15], name: "Martinique", years: [1800] },
  { from: "British Colonial Empire", box: [-70.5, 11.8, -67.8, 12.8], name: "Curaçao", years: [1800] },
  { from: "French Consulate", box: [24, 21, 37, 32], name: "French Egypt" },
  { from: "French Consulate", box: [-18, 11, -8, 17], name: "Senegal" },
  { from: "French Consulate", box: [55, -5, 56, -4], name: "Seychelles" },
  { from: "French Consulate", box: [-4.5, 4.5, -2.5, 6], drop: true }, // the Ivory Coast, where France had no post until 1843
  { from: "Spanish Empire", box: [-62, -53, -57, -50.5], name: "Viceroyalty of the Río de la Plata", years: [1800] }, // the Falklands
  { from: "British Colonial Empire", box: [165, -53, 179, -34], drop: true, years: [1800, 1815] }, // New Zealand (British from 1840) and its islands
  { from: "British Colonial Empire", box: [115, 4, 120, 8], name: "North Borneo", years: [1880] },
  { from: "French India", box: [55, -21.5, 56, -20.8], name: "La Réunion", years: [1800] },
  { from: "French India", box: [57, -20.6, 58, -19.9], name: "Isle de France", years: [1800] },
  { from: "British Cape Colony", box: [-14, 6, -10, 10.5], name: "Colony of Sierra Leone" },
  { from: "British Gold Coast", box: [2.5, 6, 4.6, 7], name: "Lagos Colony", years: [1878, 1880, 1900] },
  { from: "Portuguese Empire", box: [30, -27, 41.5, -10], name: "Portuguese Mozambique" },
  { from: "Kingdom of Portugal", box: [30, -27, 41.5, -10], name: "Portuguese Mozambique" },
  { from: "Kingdom of Portugal", box: [-32, 32, -16, 40.5], name: "Portugal", years: [1878, 1880, 1900] }, // the Azores and Madeira
  { from: "Kingdom of Portugal", box: [11, -18.5, 24, -4.5], name: "Portuguese Angola", years: [1878, 1880] },
  { from: "Portuguese Colonies", box: [122, -10, 127.5, -8], name: "Portuguese Timor" },
  { from: "Spanish Empire", box: [-18.5, 27.5, -13, 29.5], name: "Spain" }, // the Canary Islands
  { from: "Kingdom of Spain", box: [-18.5, 27.5, -13, 29.5], name: "Spain" },
  { from: "Kingdom of Spain", box: [130, 0, 170, 12], drop: true, years: [1878, 1880] }, // the Carolines, claimed but not held until 1885
  { from: "Spanish Empire", box: [8.3, 3.1, 9.0, 3.9], name: "Fernando Po" },
  { from: "Spanish Empire", box: [116, 4, 127, 21], name: "Captaincy General of the Philippines", years: [1878, 1880] },
  { from: "French India", box: [42, -13.5, 46, -11], name: "Comoro sultanates", member: "" },
  { from: "French Africa", box: [42, -13.5, 46, -11], name: "Comoro sultanates", member: "", years: [1878, 1880] },
  { from: "French Africa", box: [-9, 28, 12, 38], name: "Algeria" },
  { from: "French Africa", box: [-18, 11, -8, 17], name: "Senegal" },
  { from: "French Africa", box: [7, -4, 14, 3], name: "Gabon" },
  { from: "French Africa", box: [13.5, -6, 17, -2], name: "French Congo", years: [1878, 1880, 1900] },
  { from: "French Africa", box: [-4.5, 4.5, -2.5, 6], name: "Grand-Bassam", years: [1878, 1880] },
  { from: "French Indochina", box: [102, 9.5, 108, 15], name: "Cambodia" },
  { from: "French Indochina", box: [116, 38, 119, 41], name: "Qing Empire", member: "", years: [1878, 1880] }, // the concession at Tianjin
  { from: "French Indochina", box: [163, -23, 169, -19], name: "New Caledonia" },
  { from: "French Indochina", box: [55, -21.5, 56, -20.8], name: "La Réunion" },
  { from: "French Third Republic", box: [-61.3, 14.3, -60.7, 15], name: "Martinique" },
  { from: "French Third Republic", box: [-63.2, 17.8, -62.7, 18.3], name: "Colony of Guadeloupe" }, // Saint-Martin
  { from: "Bourbon Kingdom of France", box: [-61.3, 14.3, -60.7, 15], name: "Martinique" },
  { from: "Bourbon Kingdom of France", box: [-63.2, 15.8, -60.9, 18.3], name: "Colony of Guadeloupe" },
  { from: "Bourbon Kingdom of France", box: [-4.5, 4.5, -2.5, 6], drop: true }, // the Ivory Coast, where France had no post until 1843
  { from: "French Louisiana", box: [-56.6, 46.7, -56, 47.2], name: "Saint Pierre and Miquelon", member: "(British Empire)" }, // held by Britain 1793-1802
  { from: "French Louisiana", box: [-63.2, 17.8, -62.7, 18.3], name: "Colony of Guadeloupe", member: "(French Consulate)" },
  { from: "New Netherland", box: [-63.5, 17.3, -62.7, 18.3], name: "Dutch Windward Islands", member: "(Batavian Republic)" },
  { from: "Netherlands Antilles", box: [-58.5, 1.5, -53.5, 6.5], name: "Suriname", member: "(Netherlands)" },
  // Curaçao and the Windward Islands were one colony, the Netherlands Antilles from 1954
  { from: "Netherlands Antilles", box: [-70.5, 11.8, -67.8, 12.8], name: "Netherlands Antilles", member: "(Netherlands)", years: [1960] },
  { from: "Netherlands Antilles", box: [-63.5, 17.3, -62.7, 18.3], name: "Netherlands Antilles", member: "(Netherlands)", years: [1960] },
  { from: "Netherlands Antilles", box: [-70.5, 11.8, -67.8, 12.8], name: "Curaçao", member: "(Netherlands)" },
  { from: "Netherlands Antilles", box: [-63.5, 17.3, -62.7, 18.3], name: "Dutch Windward Islands", member: "(Netherlands)" },
  // the Isle of Pines, left out of Cuba's borders in 1903 until a treaty settled it as Cuban in 1925 (Cuba ran it), and
  // Hawaii's western islands
  { from: "United States of America", box: [-83.3, 21.3, -82.3, 22.1], name: "Cuba", s: "", years: [1914, 1920] },
  { from: "United States of America", box: [-162.5, 21.5, -159.5, 23.5], name: "Hawaii", s: "United States", years: [1914, 1920, 1930, 1938, 1945] },
  // after the war: Greenland (defended by the United States from 1941) and Mindanao back to their own governments,
  // Bougainville to New Guinea (OpenHistoricalMap draws it)
  { from: "United States of America", box: [-75, 59, -10, 84], name: "Greenland", s: "Denmark", years: [1945] },
  { from: "United States of America", box: [121, 4.5, 127, 10.5], name: "Philippines", s: "", years: [1945] },
  { from: "United States of America", box: [154, -7.5, 157, -4.5], drop: true, years: [1945] },
  // Japan's empire after its surrender: the islands it occupied in the war, south of Taiwan, are drawn under their own
  // rulers (OpenHistoricalMap draws them)
  { from: "Empire of Japan", box: [90, -15, 170, 23.4], drop: true, years: [1945] },
  { from: "North Yemen", box: [41.5, 16.3, 42.5, 17.2], name: "Asir", s: "", years: [1920] }, // the Farasan Islands, the Idrisids'
  { from: "French Africa", box: [43, -13.2, 45.5, -11.2], name: "Comoros", s: "France", years: [1945] }, // part of Madagascar until 1946
  // France's overseas departments and territories, and Portugal's colonies, which Cliopatria draws as one with them
  ...[
    [[-55, 1.5, -51, 6.5], "French Guiana"],
    [[41, 10.5, 44, 13], "French Somaliland"],
    [[43, -13.2, 45.5, -11.2], "Comoros"],
    [[55, -21.5, 56, -20.8], "Réunion"],
    [[163, -23, 169, -19.5], "New Caledonia"],
    [[-62, 15.8, -61, 16.6], "Guadeloupe"],
    [[-61.3, 14.3, -60.7, 15], "Martinique"],
    [[-56.6, 46.7, -56, 47.2], "Saint Pierre and Miquelon"],
    [[68, -50, 71, -48], "French Southern and Antarctic Lands"],
  ].map(([box, name]) => ({ from: "French Fifth Republic", box, name, s: "France", years: [1960] })),
  ...[
    [[124, -9.6, 127.5, -8], "Portuguese Timor"],
    [[6.2, -0.2, 7.6, 1.8], "São Tomé and Príncipe"],
    [[11.5, -6, 13.2, -4.3], "Angola"], // Cabinda, run as part of Angola from 1956
  ].map(([box, name]) => ({ from: "Estado Novo", box, name, s: "Portugal", years: [1960] })),
];
/**
 * Cliopatria's outlines run past the coast here and there. Cut to Natural Earth's land, as the other sources' are, they
 * leave no strip at sea where a better outline takes the land beside them. A small island the outline covers in good
 * part is taken whole (Cliopatria's islands can sit a little off); a part with almost no land under it (an island
 * Natural Earth leaves out) stays as drawn. Cached per year (delete the file to redo it).
 */
const ISLAND_KM2 = 5000;
function cliopatriaOnLand(year, rows) {
  const file = path.join(CACHE, "cliopatria", `polities-on-land-${year}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const land = landWithLakes().map((p) => ({ p, box: boxOfPolys([p]), km2: km2Of([p]) }));
  const out = rows.map((f) => {
    const polys = [];
    for (const p of polysOfGeom(f.geometry)) {
      const box = boxOfPolys([p]);
      const whole = [];
      const cut = [];
      for (const l of land) {
        if (!boxesMeet(l.box, box)) continue;
        const shared = l.km2 <= ISLAND_KM2 ? clipSafely(polygonClipping.intersection, [p], [l.p]) : null;
        if (shared && km2Of(shared) >= 0.25 * l.km2) whole.push(l.p);
        else cut.push(l.p);
      }
      const on = cut.length ? clipSafely(polygonClipping.intersection, [p], cut) : [];
      const kept = on ? [...on, ...whole] : null;
      polys.push(...(kept && km2Of(kept) >= 0.1 * km2Of([p]) ? kept : [p]));
    }
    return { ...f, geometry: { type: "MultiPolygon", coordinates: polys } };
  });
  fs.writeFileSync(file, JSON.stringify(out));
  return out;
}
const clioRaw = new Map(); // year -> Cliopatria's polities as it gives them, for the territory rules (`clio`)
/** Cliopatria's polities for a year, in the historical source's form (NAME, SUBJECTO, BORDERPRECISION). */
async function cliopatriaBase(year) {
  const rows = cliopatriaOnLand(year, await cliopatriaPolities(path.join(CACHE, "cliopatria"), year));
  clioRaw.set(year, rows);
  const rulerOf = (memberOf) => CLIO_RULERS[year][memberOf] ?? memberOf.replace(/^\((.*)\)$/, "$1");
  return rows.flatMap((f) => {
    const props = { NAME: f.properties.Name, SUBJECTO: rulerOf(f.properties.MemberOf || ""), BORDERPRECISION: 2 };
    let polys = polysOfGeom(f.geometry);
    const out = [];
    for (const part of CLIO_PARTS) {
      if (part.from !== f.properties.Name || (part.years && !part.years.includes(year))) continue;
      const inBox = (p) => {
        const [w, s, e, n] = boxOfPolys([p]);
        return boxesMeet(part.box, [(w + e) / 2, (s + n) / 2, (w + e) / 2, (s + n) / 2]);
      };
      const got = polys.filter(inBox);
      polys = polys.filter((p) => !inBox(p));
      const SUBJECTO = "s" in part ? part.s : "member" in part ? rulerOf(part.member) : props.SUBJECTO;
      if (got.length && !part.drop) out.push({ type: "Feature", properties: { ...props, NAME: part.name, SUBJECTO }, geometry: { type: "MultiPolygon", coordinates: got } });
    }
    if (polys.length) out.push({ type: "Feature", properties: props, geometry: { type: "MultiPolygon", coordinates: polys } });
    return out;
  });
}
// present-day names that were different then (the countries were renamed between 2013 and 2022)
const NAME_THEN = { Türkiye: "Turkey", "North Macedonia": "Macedonia", Eswatini: "Swaziland", Czechia: "Czech Republic", "Cabo Verde": "Cape Verde" };
const isCrimea = (rings) => {
  const c = geoCentroid({ type: "Polygon", coordinates: rings });
  return c[0] > 32 && c[0] < 37 && c[1] > 44 && c[1] < 46.3;
};
const inCaribbean = (rings) => geoCentroid({ type: "Polygon", coordinates: rings })[0] < -60;
function naturalEarthEra(year) {
  const parts = new Map(); // name -> polygons
  const extra = new Map(); // name -> properties beyond the name
  const ne = require("world-atlas/countries-50m.json");
  for (const f of client.feature(ne, ne.objects.countries).features) {
    const g = fixWinding(f.geometry);
    if (!g) continue;
    const name = NAME_FIX[f.properties.name] || f.properties.name;
    const n = NAME_THEN[name] || name;
    parts.set(n, [...(parts.get(n) ?? []), ...g.coordinates]);
  }
  const move = (from, to, pick = () => true) => {
    const all = parts.get(from) ?? [];
    parts.set(to, [...(parts.get(to) ?? []), ...all.filter(pick)]);
    parts.set(from, all.filter((rings) => !pick(rings)));
  };
  // Natural Earth draws Crimea in Russia; it was Ukraine's until Russia annexed it in March 2014
  move("Russia", "Ukraine", isCrimea);
  move("South Sudan", "Sudan"); // independent from 9 July 2011
  if (year <= 2000) {
    // the Federal Republic of Yugoslavia (Serbia and Montenegro, 1992–2003); Kosovo declared independence in 2008
    for (const n of ["Serbia", "Montenegro", "Kosovo"]) move(n, "Yugoslavia");
    extra.set("Yugoslavia", {
      w: `The Federal Republic of Yugoslavia: Serbia and Montenegro, 1992–2003.${year === 2000 ? " Kosovo has been under UN administration since June 1999." : ""}`,
    });
    // the Netherlands Antilles were dissolved on 10 October 2010; Saint Martin and Saint Barthélemy were part of
    // Guadeloupe, an overseas department of France, until 2007
    for (const n of ["Curaçao", "Sint Maarten"]) move(n, "Netherlands Antilles");
    move("Netherlands", "Netherlands Antilles", inCaribbean);
    extra.set("Netherlands Antilles", { s: "Netherlands" });
    for (const n of ["Saint Martin", "Saint Barthélemy"]) move(n, "France");
  }
  if (year === 2000) {
    move("Timor-Leste", "East Timor");
    extra.set("East Timor", { w: "Under United Nations administration from October 1999 until independence on 20 May 2002." });
  }
  if (year === 1994) {
    move("Timor-Leste", "East Timor");
    extra.set("East Timor", { s: "Indonesia", w: "Occupied by Indonesia from December 1975 and annexed in 1976; the UN never recognised the annexation. Independent since 2002." });
    move("DR Congo", "Zaire"); // renamed the Democratic Republic of the Congo in May 1997
    extra.set("Hong Kong", { s: "United Kingdom" }); // returned to China on 1 July 1997
    move("Macao", "Macau");
    extra.set("Macau", { s: "Portugal" }); // returned to China on 20 December 1999
  }
  const out = [];
  for (const [n, coordinates] of parts) {
    if (!coordinates.length) continue;
    const properties = { n, b: 3, ...extra.get(n) };
    if (DISPUTE_TAGS[n]) properties.d = DISPUTE_TAGS[n];
    out.push({ type: "Feature", properties, geometry: { type: "MultiPolygon", coordinates } });
  }
  return out;
}

// ---------- Europe's borders from HistoGIS (1900, 1914) and OpenHistoricalMap (1920 on) ----------
// HistoGIS (CC BY 4.0, see scripts/lib/histogis.mjs) draws Europe's national borders from maps of the time, far more
// exactly than the historical source; OpenHistoricalMap (CC0, see scripts/lib/ohm.mjs) does the same for the years
// after. Across the land they cover, their states replace ours: our shapes lose that land, and each state joins our
// shape of the same name, or becomes one. Where they cover only part of an empire (Russia, the Ottoman Empire), the rest
// stays ours. HistoGIS: `day`: the date the map shows. `names`: our name for a HistoGIS state where it differs. `add`:
// properties for states we didn't have. `keep`: our shapes laid back on top, for vassals HistoGIS counts as part of
// their overlord.
const UK_1900S = "United Kingdom of Great Britain and Ireland";
const CYPRUS = { s: UK_1900S, w: "Ottoman territory under British administration from 1878; Britain annexed it in November 1914." };
const HISTOGIS = {
  1900: {
    day: "1900-12-31",
    names: { "Austria-Hungary": "Austria Hungary", "German Empire": "Germany", Sweden: "Sweden–Norway", "United Kingdom": UK_1900S, "Bosnia and Herzegovina": "Bosnia-Herzegovina", Russia: "Russian Empire" },
    add: { Cyprus: CYPRUS },
    keep: {},
  },
  1914: {
    day: "1914-06-28",
    names: { "Austria-Hungary": "Austro-Hungarian Empire", "United Kingdom": UK_1900S, Italy: "Kingdom of Italy", Russia: "Russian Empire" },
    add: { Cyprus: CYPRUS },
    keep: {},
  },
  // HistoGIS has no German states for 1815 (OpenHistoricalMap draws them)
  1815: {
    day: "1815-12-31",
    names: {
      Austria: "Austrian Empire",
      Cracow: "Free City of Cracow",
      France: "Kingdom of France",
      Lucca: "Duchy of Lucca",
      "Massa e Carrara": "Duchy of Massa and Carrara",
      "Modena and Reggio": "Duchy of Modena and Reggio",
      Naples: "Kingdom of Naples",
      Parma: "Duchy of Parma and Piacenza",
      Poland: "Congress Poland",
      Portugal: "United Kingdom of Portugal, Brazil and the Algarves",
      "Repubblica Settinsulare": "United States of the Ionian Islands",
      Russia: "Russian Empire",
      Sardinia: "Kingdom of Sardinia",
      Sicily: "Kingdom of Sicily",
      Sweden: "Sweden–Norway",
      Tuscany: "Grand Duchy of Tuscany",
      "Vereinigtes Königreich der Niederlande": "United Kingdom of the Netherlands",
      "United Kingdom": UK_1900S,
    },
    add: {
      "Congress Poland": { s: "Russian Empire", w: "A kingdom created at the Congress of Vienna, with the Russian emperor as its king." },
      "United States of the Ionian Islands": { s: UK_1900S, w: "A British protectorate from November 1815 until the islands joined Greece in 1864." },
      "Free City of Cracow": { w: "A free city under the protection of Austria, Prussia and Russia, 1815–1846." },
      Malta: { s: UK_1900S },
      Gibraltar: { s: UK_1900S },
    },
    keep: {},
  },
  1878: {
    day: "1878-12-31",
    names: { "Austria-Hungary": "Austria-Hungary", Italy: "Kingdom of Italy", "Bosnia and Herzegovina": "Bosnia-Herzegovina", Russia: "Russian Empire", Sweden: "Sweden–Norway", "United Kingdom": UK_1900S },
    add: {
      "Bosnia-Herzegovina": { s: "Austria-Hungary", w: "Ottoman land occupied and run by Austria-Hungary from 1878; annexed in 1908." },
      Cyprus: { s: UK_1900S, w: "Ottoman land under British administration from 1878; Britain annexed it in November 1914." },
      Malta: { s: UK_1900S },
      Gibraltar: { s: UK_1900S },
    },
    keep: {},
  },
};
HISTOGIS[1880] = { ...HISTOGIS[1878], day: "1880-12-31" };
// OpenHistoricalMap's states, by map: [relation id, our name, options]. `parts`: which of the relation's parts count,
// by where they lie (by default those in Europe: a relation can also hold a country's colonies, which the historical
// source draws on their own). `props`: properties for the shape. `rest`: a shape for what ours of that name covers
// outside the new border. `exact`: our shape keeps nothing outside the new border (for states beside land OHM doesn't
// draw, like the USSR). Each relation was checked against CShapes 2.0: they agree to within a few percent, except
// where CShapes keeps a border that had not yet changed in law (Italian Istria, Danzig, Hatay, Manchukuo).
const inEurope = ([x, y]) => x >= -32 && x <= 70 && y >= 34.5 && y <= 82 && !(y < 36 && x >= -18 && x <= 12);
const notIceland = (pt) => inEurope(pt) && pt[0] > -12; // Iceland was a kingdom of its own from 1918
const anywhere = () => true;
const DANZIG = { w: "A free city under the protection of the League of Nations, 1920–1939." };
const SPANISH_MOROCCO = { n: "Spanish Morocco", s: "Spain", w: "Spain's protectorate zones in Morocco (1912–1956, the southern one until 1958), with Ifni." };
const SPANISH_ZONES = [[-6.5, 34.6, -1.9, 36.0], [-13.5, 27.5, -8.5, 29.6]]; // the northern zone with Tangier; the southern zone with Ifni
const FRENCH_MOROCCO = [2690949, "Morocco", { parts: anywhere, props: { s: "France" }, rest: SPANISH_MOROCCO, restIn: SPANISH_ZONES }];
const OHM = {
  1920: [
    [2696516, "Germany"],
    // from April 1922: OHM leaves Poland's eastern border of late 1920 open (it was fixed in 1921), and the later one
    // differs little from the line Poland held; Vilnius was held by Polish forces as "Central Lithuania"
    [2855672, "Poland", { exact: true }],
    [2691478, "Danzig", { props: DANZIG }],
    [2691476, "Memel Territory", { props: { s: "France", w: "Taken from Germany in 1920 and run by France for the Allies until Lithuania seized it in January 1923." } }],
    [2693086, "Lithuania", { exact: true }],
    [2704702, "Latvia", { exact: true }],
    [2801387, "Estonia", { exact: true }],
    [2959045, "Finland", { exact: true }],
    [2747893, "Czechoslovakia", { exact: true }],
    [2692711, "Austria"],
    [2693462, "Hungary", { exact: true }], // from July 1921, when the Treaty of Trianon came into force: OHM has no Hungary for late 1920
    [2696325, "Italy"],
    [2693464, "Romania", { exact: true }],
    [2747828, "Yugoslavia"],
    [2800556, "Albania"],
    [2848878, "Bulgaria"],
    [2692238, "Denmark", { parts: notIceland }],
    [2692537, "Norway", { exact: true }],
    [2692524, "Sweden"],
    [2828388, UK_1900S],
    [2696299, "France"],
    [2800293, "Belgium"],
    [2883430, "Netherlands"],
    [2748545, "Luxembourg"],
    [2798802, "Switzerland"],
    [2860486, "Spain"],
    [2807009, "Portugal"],
    [2698086, "Georgia", { props: { s: null, w: "Independent from 1918 until the Red Army invaded in February 1921." } }],
    [2801981, "Iceland"],
    FRENCH_MOROCCO, // the 1912 treaty zone (OHM's outline for 1920 covers only the part France then controlled)
  ],
  1930: [
    [2696515, "Germany"],
    [2692205, "Poland", { exact: true }],
    [2691478, "Danzig", { props: DANZIG }],
    [2692218, "Lithuania", { exact: true }],
    [2704702, "Latvia", { exact: true }],
    [2801387, "Estonia", { exact: true }],
    [2959045, "Finland", { exact: true }],
    [2692233, "Czechoslovakia", { exact: true }],
    [2858751, "Austria"],
    [2695633, "Hungary", { exact: true }],
    [2693259, "Romania", { exact: true }],
    [2747831, "Yugoslavia"],
    [2800554, "Albania"],
    [2851104, "Italy"],
    [2801340, "Greece"],
    [2848878, "Bulgaria"],
    [2801012, "Republic of Turkey", { exact: true }],
    [2850547, "Denmark", { parts: notIceland }],
    [2851798, "Norway", { exact: true }],
    [2692524, "Sweden"],
    [2697727, "Irish Free State"],
    [2693292, UK_1900S],
    [2801981, "Iceland"],
    [2696299, "France"],
    [2800293, "Belgium"],
    [2883430, "Netherlands"],
    [2748545, "Luxembourg"],
    [2798802, "Switzerland"],
    [2862762, "Spain"],
    [2807009, "Portugal"],
    FRENCH_MOROCCO,
  ],
  1938: [
    [2704711, "Germany"],
    [2741574, "Poland", { exact: true }],
    [2691478, "Danzig", { props: DANZIG }],
    [2692218, "Lithuania", { exact: true }],
    [2704702, "Latvia", { exact: true }],
    [2801387, "Estonia", { exact: true }],
    [2959045, "Finland", { exact: true }],
    [2857482, "Czechoslovakia", { exact: true }],
    [2747873, "Hungary", { exact: true }],
    [2693259, "Romania", { exact: true }],
    [2747831, "Yugoslavia"],
    [2800554, "Albania"],
    [2851104, "Italy"],
    [2873762, "Greece"],
    [2848878, "Bulgaria"],
    [2801012, "Turkey", { exact: true }],
    [2864001, "Hatay State", { props: { w: "Self-governing from September 1938 under French and Turkish supervision; Turkey annexed it in June 1939." } }],
    [2869937, "Denmark", { parts: notIceland }],
    [2851798, "Norway", { exact: true }],
    [2870046, "Sweden"],
    [2692985, "Ireland"],
    [2693292, "United Kingdom"],
    [2801981, "Iceland"],
    [2696299, "France"],
    [2800293, "Belgium"],
    [2883430, "Netherlands"],
    [2748545, "Luxembourg"],
    [2798802, "Switzerland"],
    [2860484, "Spain"],
    [2807009, "Portugal"],
    [2690949, "Morocco (France)", { parts: anywhere, rest: SPANISH_MOROCCO, restIn: SPANISH_ZONES }],
    [2885965, "Manchukuo", { parts: anywhere, props: { s: "Empire of Japan", w: "A state Japan set up in Manchuria in 1932 and controlled until 1945." } }],
  ],
  1945: [
    [2692206, "Poland", { exact: true }],
    [2692360, "Austria", { props: { w: "Occupied in four zones by the Allies from 1945 until 1955; its provisional government was recognised in October 1945." } }],
    [2877966, "Romania", { exact: true }],
    [2923084, "Yugoslavia"],
    [2878108, "Albania"],
    [2795081, "Italy"],
    [2920399, "Greece"],
    [2848877, "Bulgaria"],
    [2864004, "Turkey", { exact: true }],
    [2851793, "Denmark"],
    [2851798, "Norway", { exact: true }],
    [2870046, "Sweden"],
    [2801982, "Iceland"],
    [2692985, "Ireland"],
    [2693292, "United Kingdom"],
    [2855285, "Finland", { exact: true }],
    [2696301, "France"],
    [2692857, "Belgium"],
    [2883430, "Netherlands"],
    [2692839, "Luxembourg"],
    [2798802, "Switzerland"],
    [2862761, "Spain"],
    [2807009, "Portugal"],
    [2692766, "Czechoslovakia", { exact: true }],
    [2878067, "Hungary", { exact: true }],
    FRENCH_MOROCCO,
    // Berlin's western sectors, inside the Soviet zone (OHM's outline of West Berlin, which keeps the sector lines; the
    // Soviet sector is set in TERRITORY)
    [2692239, "Berlin (Western sectors)", { props: { w: "The American, British and French sectors of Berlin, occupied from July 1945; the four powers governed the city together." } }],
  ],
  1960: [
    [2743709, "West Germany"],
    [2692241, "East Germany"],
    [2878198, "Poland", { exact: true }],
    [2830315, "Czechoslovakia", { exact: true }],
    [2746466, "Austria"],
    [2878068, "Hungary", { exact: true }],
    [2877965, "Romania", { exact: true }],
    [2923085, "Yugoslavia"],
    [2878107, "Albania"],
    [2742909, "Italy"],
    [2692866, "Greece"],
    [2848876, "Bulgaria"],
    [2864004, "Turkey", { exact: true }],
    [2959047, "Finland", { exact: true }],
    [2851793, "Denmark"],
    [2851798, "Norway", { exact: true }],
    [2870046, "Sweden"],
    [2801982, "Iceland"],
    [2692985, "Ireland"],
    [2693292, "United Kingdom"],
    [2903444, "France"],
    [2692857, "Belgium"],
    [2883429, "Netherlands"],
    [2692839, "Luxembourg"],
    [2798802, "Switzerland"],
    [2860482, "Spain"],
    [2905980, "Portugal"],
    [2692239, "West Berlin", { props: { w: "Held by the United States, Britain and France; tied to West Germany but not part of it in law." } }],
  ],
};
// From 1800 to 1880 the OpenHistoricalMap countries are many (over a hundred per map), so they are listed in a file of
// their own, generated from OHM and checked against Cliopatria (see its _readme). They are laid over the Cliopatria base.
const OHM_1800S = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "ohm-1800s.json"), "utf8"));
for (const year of [1800, 1815, 1878, 1880]) OHM[year] = OHM_1800S[year];
// From 1900 to 1960 the rest of the world's OpenHistoricalMap countries are listed the same way, and laid down before the
// European ones above (where two overlap, the later one wins)
const OHM_1900S = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "ohm-1900s.json"), "utf8"));
for (const year of [1900, 1914, 1920, 1930, 1938, 1945, 1960]) OHM[year] = [...OHM_1900S[year].map(([id, n, opt = {}]) => [id, n, { ...opt, parts: anywhere }]), ...(OHM[year] ?? [])];
// Land between the OpenHistoricalMap states that was a territory of its own: { box, n, props }. Our shapes' pieces
// there (outside every state) become it.
const OHM_GAPS = {
  1920: [{ box: [6.35, 49.1, 7.45, 49.65], n: "Saar Basin", props: { w: "Run by the League of Nations from 1920 until its people voted to return to Germany in 1935." } }],
  1930: [{ box: [6.35, 49.1, 7.45, 49.65], n: "Saar Basin", props: { w: "Run by the League of Nations from 1920 until its people voted to return to Germany in 1935." } }],
};
// HistoGIS's own names, often in several languages ("Suisse; Svizzera; Svizra; Switzerland"): the English one
const HISTOGIS_EN = { "Austro-Hungarian Empire": "Austria-Hungary", "Kingdom of the Netherlands": "Netherlands", "Kingdom of Greece": "Greece", "Vereinigtes Königreich von Großbritannien und Irland": "United Kingdom" };
const HISTOGIS_SKIP = new Set(["Lake Constance", "Gibraltar", "Bailiwick of Jersey", "Bailiwick of Guernsey"]); // a lake, and dependencies too small to show
function histogisEnglish(f) {
  const parts = f.properties.en.split(";").map((s) => s.trim());
  const latin = parts.filter((p) => /^[A-Za-z][A-Za-z .'-]*$/.test(p));
  const name = latin.at(-1) ?? parts[0];
  return HISTOGIS_EN[name] ?? name;
}
const polysOfGeom = (g) => (!g ? [] : g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const boxOfPolys = (polys) => {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const p of polys) for (const [x, y] of p[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  return [w, s, e, n];
};
const boxesMeet = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const roundPolys = (polys) => polys.map((rings) => rings.map((r) => r.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6])));
/** A clipping operation that tries again on rounded coordinates when polygon-clipping fails; null if it still does. */
function clipSafely(op, a, b) {
  try {
    return op(a, b);
  } catch {
    try {
      return op(roundPolys(a), roundPolys(b));
    } catch (err) {
      console.warn(`  ! clipping failed (${String(err.message).slice(0, 60)}): the shape is left as it was`);
      return null;
    }
  }
}
function onLandOnly(polys) {
  const box = boxOfPolys(polys);
  const near = landWithLakes().filter((p) => boxesMeet(boxOfPolys([p]), box));
  return near.length ? clipSafely(polygonClipping.intersection, polys, near) ?? polys : [];
}
const ringKm2 = (ring) => {
  const a = geoArea({ type: "Polygon", coordinates: [ring] });
  return (a > 2 * Math.PI ? 4 * Math.PI - a : a) * EARTH_R ** 2;
};
/** The area of polygons in km², whichever way their rings run. */
const km2Of = (polys) => polys.reduce((t, [outer, ...holes]) => t + ringKm2(outer) - holes.reduce((h, r) => h + ringKm2(r), 0), 0);
/** Sets a shape's properties; a null value removes one. */
const setProps = (f, props = {}) => Object.entries(props).forEach(([k, v]) => (v === null ? delete f.properties[k] : (f.properties[k] = v)));

// ---------- slivers: what a new border leaves of a shape along its edge ----------
// Where a better outline replaces ours, our shape beside it can keep thin pieces of its old outline: along a coast,
// where the old outline ran past the new coastline, and along the new border itself. A thin piece no wider than this
// (area / perimeter) that the cut made is a sliver: drawn, it would be a strip of the wrong colour.
const SLIVER_KM = 5;
const partKey = (rings) => `${km2Of([rings]).toFixed(1)}|${boxOfPolys([rings]).map((v) => v.toFixed(4)).join()}`;
let landBoxes = null;
/**
 * Slivers cut off a shape: the parts at sea go; the parts on land become blank strips that the coast fill
 * (scripts/lib/gaps.mjs) gives to the shapes beside them, but never back to the shape `from` they were cut off.
 */
function sliverStrips(polys, from) {
  if (!polys.length) return [];
  landBoxes ??= landNoLakes().map((p) => ({ p, box: boxOfPolys([p]) }));
  const box = boxOfPolys(polys);
  const near = landBoxes.filter((l) => boxesMeet(l.box, box)).map((l) => l.p);
  const onLand = near.length ? (clipSafely(polygonClipping.intersection, polys, near) ?? []) : [];
  return onLand
    .map((rings) => fixWinding({ type: "Polygon", coordinates: rings }))
    .filter((g) => g && km2(g) >= 1)
    .map((g) => ({ type: "Feature", properties: { n: "", b: 1, m: 1, j: 1, no: from, a: Math.round(km2(g)) }, geometry: g }));
}
/**
 * Takes the slivers off a shape after a cut (by the shapes in `box`) and adds their strips to `out`. `before`: the keys
 * of its parts before the cut (a part the cut left alone is never a sliver). Its largest part stays, unless the cut took
 * nearly all of its `wasKm2` (Infinity: it can go too). `anyWidth`: every part near the cut goes, however wide, even one
 * the cut left alone (for a shape that must keep nothing beyond its new outline).
 */
function dropSlivers(f, before, wasKm2, box, out, anyWidth = false) {
  const parts = f.geometry.coordinates;
  if (!parts.length) return;
  const areas = parts.map((p) => km2Of([p]));
  const largest = areas.indexOf(Math.max(...areas));
  const lostMost = areas.reduce((a, b) => a + b, 0) <= 0.15 * wasKm2;
  const near = [box[0] - 0.05, box[1] - 0.05, box[2] + 0.05, box[3] + 0.05];
  const isSliver = (p, i) =>
    (lostMost || i !== largest) && (anyWidth || (!before.has(partKey(p)) && areas[i] / ringPerimeterKm(p[0]) <= SLIVER_KM)) && boxesMeet(boxOfPolys([p]), near);
  const slivers = parts.filter(isSliver);
  if (!slivers.length) return;
  f.geometry.coordinates = parts.filter((p, i) => !isSliver(p, i));
  out.push(...sliverStrips(slivers, f.properties.n));
}

/** The shortest distance, in degrees of latitude, from the points of polygons `a` to the edges of polygons `b`. */
function gapDeg(a, b) {
  let best = Infinity;
  for (const rings of b)
    for (const r of rings)
      for (let i = 1; i < r.length; i++) {
        const [x1, y1] = r[i - 1];
        const k = Math.cos((y1 * Math.PI) / 180); // a degree of longitude, in degrees of latitude
        const [dx, dy] = [(r[i][0] - x1) * k, r[i][1] - y1];
        const len2 = dx * dx + dy * dy;
        for (const ra of a)
          for (const ring of ra)
            for (const [x, y] of ring) {
              const [px, py] = [(x - x1) * k, y - y1];
              const t = len2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / len2)) : 0;
              best = Math.min(best, Math.hypot(px - t * dx, py - t * dy));
            }
      }
  return best;
}

/** Joins shapes that now share a name into one (the larger one's properties). */
function mergeSameNames(grouped) {
  const first = new Map();
  for (let i = 0; i < grouped.length; i++) {
    const f = grouped[i];
    const into = first.get(f.properties.n);
    if (!into) {
      first.set(f.properties.n, f);
      continue;
    }
    if (km2Of(f.geometry.coordinates) > km2Of(into.geometry.coordinates)) into.properties = { ...f.properties };
    into.geometry.coordinates = [...into.geometry.coordinates, ...f.geometry.coordinates];
    grouped.splice(i--, 1);
  }
}

/** Cuts `polys` out of a shape. Returns the km² it lost. */
function cutShape(f, polys, box) {
  if (!f.geometry.coordinates.length || !boxesMeet(boxOfPolys(f.geometry.coordinates), box)) return 0;
  const before = km2Of(f.geometry.coordinates);
  f.geometry.coordinates = clipSafely(polygonClipping.difference, f.geometry.coordinates, polys) ?? f.geometry.coordinates;
  return before - km2Of(f.geometry.coordinates);
}

/** The HistoGIS and OpenHistoricalMap states for a map, as { n, polys, props, rest }, clipped to land. */
async function bordersFor(year) {
  const shapes = [];
  const histogis = [];
  if (HISTOGIS[year]) {
    const spec = HISTOGIS[year];
    for (const f of await histogisStates(path.join(CACHE, "histogis"), spec.day)) {
      const name = histogisEnglish(f);
      if (HISTOGIS_SKIP.has(name)) continue;
      const n = spec.names[name] ?? name;
      histogis.push({ n, polys: onLandOnly(polysOfGeom(f.geometry)), add: spec.add[n], props: spec.add[n] });
    }
  }
  if (OHM[year]) {
    const rels = await ohmRelations(path.join(CACHE, "ohm"), OHM[year].map(([id]) => id));
    for (const [id, n, opt = {}] of OHM[year]) {
      const rel = rels.find((r) => r.id === id);
      if (!rel) continue;
      // `partsIn`: the parts whose middle lies in these lon/lat boxes (a relation that holds a country and its colonies)
      const inBoxes = (boxes) => ([x, y]) => boxes.some(([w, s, e, n]) => x >= w && x <= e && y >= s && y <= n);
      const keep = opt.partsIn ? inBoxes(opt.partsIn) : (opt.parts ?? (OHM_1800S[year] ? anywhere : inEurope)); // the 1800s lists cover the whole world
      const polys = rel.polys.filter((p) => {
        const [w, s, e, nn] = boxOfPolys([p]);
        return keep([(w + e) / 2, (s + nn) / 2]);
      });
      shapes.push({ n, polys: onLandOnly(polys), props: opt.props, rest: opt.rest, restIn: opt.restIn, exact: opt.exact, adopts: opt.adopts });
    }
  }
  shapes.push(...histogis); // after OpenHistoricalMap's: where both draw a country, HistoGIS's border wins
  for (const s of shapes) s.box = boxOfPolys(s.polys);
  return shapes.filter((s) => s.polys.length);
}

/**
 * Lays the HistoGIS or OpenHistoricalMap states for a map over ours: every shape loses the land they cover, then each
 * state joins our shape of its name (what that shape keeps outside the new border, other than slivers, stays with it,
 * or becomes its `rest`), or becomes a new shape. Slivers go to `slivers` as blank strips.
 */
async function overlayBorders(grouped, year, slivers) {
  const shapes = await bordersFor(year);
  // a state the base draws under another name (`adopts`) takes that shape over, so what the base draws outside the new
  // border joins it instead of keeping the old name
  const renames = new Map(shapes.flatMap((s) => (s.adopts ?? []).map((n) => [n, s.n])));
  if (renames.size) {
    for (const f of grouped) if (renames.has(f.properties.n)) f.properties.n = renames.get(f.properties.n);
    mergeSameNames(grouped);
  }
  // one state at a time: polygon-clipping copes far better with these than with one union of them all
  const lost = new Map(); // our shape -> { was: km², to: Map(state -> km² it took), before: keys of its parts }
  for (const f of grouped) {
    const rec = { was: km2Of(f.geometry.coordinates), to: new Map(), before: new Set(f.geometry.coordinates.map(partKey)) };
    const box = [180, 90, -180, -90];
    for (const s of shapes) {
      const km = cutShape(f, s.polys, s.box);
      if (km <= 0) continue;
      rec.to.set(s.n, (rec.to.get(s.n) ?? 0) + km);
      [box[0], box[1], box[2], box[3]] = [Math.min(box[0], s.box[0]), Math.min(box[1], s.box[1]), Math.max(box[2], s.box[2]), Math.max(box[3], s.box[3])];
    }
    rec.box = box;
    lost.set(f, rec);
  }
  // land none of the states covers that was a territory of its own (the Saar): it becomes that shape
  for (const gap of OHM_GAPS[year] ?? []) {
    const parts = [];
    for (const f of grouped) {
      const inGap = (p) => {
        const [w, sth, e, n] = boxOfPolys([p]);
        return km2Of([p]) >= 100 && boxesMeet(gap.box, [(w + e) / 2, (sth + n) / 2, (w + e) / 2, (sth + n) / 2]);
      };
      parts.push(...f.geometry.coordinates.filter(inGap));
      f.geometry.coordinates = f.geometry.coordinates.filter((p) => !inGap(p));
    }
    if (parts.length) grouped.push({ type: "Feature", properties: { n: gap.n, b: 3, ...gap.props }, geometry: { type: "MultiPolygon", coordinates: parts } });
  }
  const mapped = (f) => shapes.some((s) => s.n === f.properties.n);
  // our shape of a state's name keeps no slivers outside the new border (the state is its main part now); with `exact`,
  // nothing at all outside it
  for (const [f, rec] of lost) if (rec.to.size && mapped(f)) dropSlivers(f, rec.before, Infinity, rec.box, slivers, shapes.some((s) => s.exact && s.n === f.properties.n));
  for (const s of shapes) {
    const f = grouped.find((g) => g.properties.n === s.n);
    if (!f) {
      grouped.push({ type: "Feature", properties: { n: s.n, b: 3, ...s.add }, geometry: { type: "MultiPolygon", coordinates: s.polys } });
      setProps(grouped.at(-1), s.props);
      continue;
    }
    // `rest`: what our shape covers outside the new border becomes a shape of its own (only the parts whose middle lies
    // in a `restIn` box, if given)
    const inRest = (p) => {
      const [w, sth, e, n] = boxOfPolys([p]);
      return s.rest && (!s.restIn || s.restIn.some((b) => boxesMeet(b, [(w + e) / 2, (sth + n) / 2, (w + e) / 2, (sth + n) / 2])));
    };
    const rest = f.geometry.coordinates.filter(inRest);
    const outside = f.geometry.coordinates.filter((p) => !inRest(p));
    if (rest.length) grouped.push({ type: "Feature", properties: { b: 1, ...s.rest }, geometry: { type: "MultiPolygon", coordinates: rest } });
    f.geometry.coordinates = outside.length ? (clipSafely(polygonClipping.union, outside, s.polys) ?? [...outside, ...s.polys]) : s.polys;
    f.properties.b = 3;
    setProps(f, s.props);
  }
  // where two states overlap, the later one in the list wins, and the earlier keeps no slivers along its edge (where
  // their coastlines differ); judged once all its cuts are made, as a strip can stay joined to land a later cut takes
  const overlapCut = new Map(); // our shape -> { before: keys of its parts, was: km², box: of the states that cut it }
  for (let j = 1; j < shapes.length; j++) {
    for (let i = 0; i < j; i++) {
      if (shapes[i].n === shapes[j].n || !boxesMeet(shapes[i].box, shapes[j].box)) continue;
      const f = grouped.find((g) => g.properties.n === shapes[i].n);
      if (!f) continue;
      const rec = overlapCut.get(f) ?? { before: new Set(f.geometry.coordinates.map(partKey)), was: km2Of(f.geometry.coordinates), box: [180, 90, -180, -90] };
      if (cutShape(f, shapes[j].polys, shapes[j].box) <= 0) continue;
      const b = shapes[j].box;
      rec.box = [Math.min(rec.box[0], b[0]), Math.min(rec.box[1], b[1]), Math.max(rec.box[2], b[2]), Math.max(rec.box[3], b[3])];
      overlapCut.set(f, rec);
    }
  }
  for (const [f, rec] of overlapCut) dropSlivers(f, rec.before, rec.was, rec.box, slivers);
  // a shape that the states took almost entirely was part of them (Finland and Georgia were part of the Russian Empire
  // in 1914): each piece left over beside a state that took part of it, where our outline ran past the coast, joins that
  // state (the one that took most, if several reach it). Pieces far from them stay (a base polity can be a whole
  // colonial empire, spread over several continents)
  for (const [f, rec] of lost) {
    if (!rec.to.size || mapped(f) || km2Of(f.geometry.coordinates) > 0.15 * rec.was) continue;
    const takers = [...rec.to].sort((a, b) => b[1] - a[1]).map(([n]) => ({ n, polys: shapes.filter((x) => x.n === n).flatMap((x) => x.polys) }));
    const keep = [];
    for (const p of f.geometry.coordinates) {
      // beside: the state's land comes within about 15 km of the piece
      const [w, sth, e, n] = boxOfPolys([p]).map((v, i) => v + (i < 2 ? -0.3 : 0.3));
      const near = [[[w, sth], [e, sth], [e, n], [w, n], [w, sth]]];
      const taker = takers.find((t) => {
        const close = t.polys.filter((q) => boxesMeet(boxOfPolys([q]), [w, sth, e, n]));
        const there = close.length ? clipSafely(polygonClipping.intersection, near, close) : null;
        return there?.length && gapDeg([p], there) <= 0.15;
      });
      if (!taker) {
        keep.push(p);
        continue;
      }
      const into = grouped.find((g) => g.properties.n === taker.n);
      into.geometry.coordinates = clipSafely(polygonClipping.union, into.geometry.coordinates, [p]) ?? [...into.geometry.coordinates, p];
    }
    f.geometry.coordinates = keep;
  }
  for (const [f, rec] of lost) if (rec.to.size && !mapped(f)) dropSlivers(f, rec.before, rec.was, rec.box, slivers);
  for (let i = grouped.length - 1; i >= 0; i--) {
    const g = fixWinding({ type: "MultiPolygon", coordinates: grouped[i].geometry.coordinates });
    if (g && g.coordinates.length) grouped[i].geometry = g;
    else grouped.splice(i, 1); // wholly inside the new states (Finland or Georgia in 1914, part of the Russian Empire)
  }
}

// ---------- land drawn for the wrong country, fixed with Natural Earth's outlines ----------
// Found by checking each map against CShapes 2.0 (ETH Zurich) on its date: 31 December of the year, or 28 June for 1914
// (the eve of the First World War). Where the right border follows a border of today or a present-day province, that
// outline (Natural Earth, public domain) is cut out of every shape on the map and given to the country that held it,
// in the order listed. `ne0`: countries (Natural Earth's names); `ne1`: provinces, "Country/Province"; `pick`: only the
// parts of those whose middle lies in this lon/lat box; `source`: [year, name], a shape from another snapshot of the
// historical source, where that border did not change in between. `clio`: Cliopatria's outline of these polities on
// the map (1800 to 1960). `poly`: a lon/lat outline, clipped to land, for a border that follows no present-day one
// (shown approximately). `ohm`: an OpenHistoricalMap relation's outline, by id. `blank`: the country gets only the land
// there that no shape holds. `from`: only these shapes lose land, and the country gets only what they lose. `exact`: the
// country loses whatever it had beyond the new outline. `s`, `w`: ruler and note (null removes one). Slivers left
// beside the new border go (see dropSlivers).
const UK_1930S = "United Kingdom of Great Britain and Ireland";
const UK_LATER = "United Kingdom";
const NORTH_YEMEN = ["Sa`dah", "Hajjah", "Al Jawf", "Al Hudaydah", "Ta`izz", "Ma'rib", "Sana'a", "Raymah", "Al Bayda'", "Amran", "Ibb", "Al Mahwit", "Dhamar", "Amanat Al Asimah"].map((p) => `Yemen/${p}`);
const SOUTH_YEMEN = ["`Adan", "Lahij", "Abyan", "Shabwah", "Hadramawt", "Al Mahrah", "Al Dali'"].map((p) => `Yemen/${p}`);
const JUBALAND = ["Gedo", "Jubbada Hoose", "Jubbada Dhexe"].map((p) => `Somalia/${p}`);
const SOUTHERN_CAMEROONS = ["Cameroon/Nord-Ouest", "Cameroon/Sud-Ouest"];
const ZANZIBAR_ISLES = ["Zanzibar South and Central", "Kaskazini-Unguja", "Zanzibar West", "Kusini-Pemba", "Kaskazini-Pemba"].map((p) => `United Republic of Tanzania/${p}`);
const ADEN = (s) => ({ to: "Aden Protectorate", ne1: SOUTH_YEMEN, s, w: "Aden and its protectorates were British until South Yemen's independence in 1967." });
const LAUSANNE = (to, year) => [
  // Turkey's borders from the Treaty of Lausanne (1923); the Sèvres treaty of 1920 never took effect. From 1930
  // OpenHistoricalMap draws Turkey, and in 1938 Hatay as a state of its own
  ...(year === 1920 ? [{ to, ne0: ["Turkey"] }] : []),
  // Hatay was French Syria's until 1938 (in 1920 a sanjak of the State of Aleppo)
  ...(year === 1938 ? [] : [{ to: year === 1920 ? "State of Aleppo" : "Syria (France)", ne1: ["Turkey/Hatay"], s: "France" }]),
  ...(year === 1920 ? [{ to: "Armenian SSR", ne0: ["Armenia"] }] : []), // Soviet from December 1920 (later, part of the USSR's outline)
  { to: "Yemen", ne1: NORTH_YEMEN }, // the Mutawakkilite Kingdom of Yemen, independent from 1918
];
const ISLANDS = (uk) => [
  { to: "British Solomon Islands", ne0: ["Solomon Is."], s: uk },
  { to: "New Caledonia", ne0: ["New Caledonia"], s: "France" },
];
// colonies whose borders were set before 1914 and are today's
const COLONIAL_BORDERS = (uk, us) => [
  { to: "Gambia", ne0: ["Gambia"], exact: true, s: uk },
  { to: "Basutoland", ne0: ["Lesotho"], exact: true, s: uk },
  { to: "Swaziland", ne0: ["eSwatini"], exact: true, s: uk },
  { to: "Brunei", ne0: ["Brunei"], exact: true, s: uk },
  { to: "Portuguese Guinea", ne0: ["Guinea-Bissau"], exact: true, s: "Portugal" },
  { to: "Spanish Guinea", ne0: ["Eq. Guinea"], exact: true, s: "Spain" },
  { to: "Puerto Rico", ne0: ["Puerto Rico"], s: us },
  { to: "Zanzibar", ne1: ZANZIBAR_ISLES, s: uk, w: "A sultanate under British protection from 1890 until 1963." },
];
const BORNEO = (uk) => [
  { to: "Sarawak", ne1: ["Malaysia/Sarawak"], s: uk, w: "Ruled by the Brooke family under British protection; a British colony from 1946 until it joined Malaysia in 1963." },
  { to: "North Borneo", ne1: ["Malaysia/Sabah", "Malaysia/Labuan"], s: uk, w: "Run by the British North Borneo Company until 1946, then a British colony until it joined Malaysia in 1963." },
];
const HAWAII = (us) => ({ to: "Hawaii", ne0: ["United States of America"], pick: [-161, 18, -154, 23], s: us, w: "Annexed by the United States in 1898; a US territory until it became a state in 1959." });
const KOREA_TAIWAN = (japan) => [
  { to: "Korea", ne0: ["North Korea", "South Korea"], s: japan, w: "A Japanese colony from 1910 to 1945." },
  { to: "Taiwan", ne0: ["Taiwan"], s: japan, w: "A Japanese colony from 1895 to 1945." },
];
const CYPRUS_COLONY = (uk) => ({ to: "Cyprus", ne0: ["Cyprus", "N. Cyprus"], s: uk, w: "Ottoman land under British rule from 1878, annexed by Britain in 1914 and a crown colony from 1925 until independence in 1960." });
const DODECANESE = [26.3, 35.3, 29.7, 37.7]; // the Dodecanese among Greece's islands, Italian from 1912 to 1947
// small states inside the countries HistoGIS and OpenHistoricalMap draw, which leave them out
const MICROSTATES = [
  { to: "Liechtenstein", ne0: ["Liechtenstein"] },
  { to: "Andorra", ne0: ["Andorra"] },
  { to: "San Marino", ne0: ["San Marino"] },
];
const BRITISH_ISLES = (uk) => [
  { to: "Isle of Man", ne0: ["Isle of Man"], s: uk, w: "A British Crown dependency, not part of the United Kingdom." },
  { to: "Malta", ne0: ["Malta"], s: uk, w: "A British colony from 1813 until independence in 1964." },
];
// Dutch (from 1945 Indonesian) Borneo: the source's Malaya ran past today's border into it
const KALIMANTAN = (n) => ({ to: n, ne1: ["Kalimantan Barat", "Kalimantan Timur", "Kalimantan Tengah", "Kalimantan Selatan"].map((p) => `Indonesia/${p}`) });
const PORTUGUESE_TIMOR = { to: "Portuguese Timor", ne0: ["Timor-Leste"], s: "Portugal" }; // Portuguese until 1975
const EGYPT_LIBYA = (libya, italy, egypt) => [
  // Egypt and Libya had no agreed border until 1925, when it was set where it is today
  { to: "Egypt", ne0: ["Egypt"], exact: true, ...egypt },
  { to: libya, ne0: ["Libya"], exact: true, s: italy },
];
// From 1900 the base (Cliopatria) draws an empire's colonies as one, and OpenHistoricalMap leaves some of them to it:
// they are set here by today's borders, which are theirs or close to them
const GREENLAND = { to: "Greenland", ne0: ["Greenland"], s: "Denmark" };
const GULF = (uk, muscat) => [
  { to: "Trucial Oman", ne0: ["United Arab Emirates"], s: uk },
  { to: "Muscat and Oman", ne0: ["Oman"], s: muscat },
];
const SOUTH_WEST_AFRICA = (sa) => ({ to: "South West Africa", ne0: ["Namibia"], s: sa, w: "German until 1915, then a League of Nations mandate run by South Africa, which held it until Namibia's independence in 1990." });
const ALGERIA = (n) => ({ to: n, ne0: ["Algeria"], s: "France" });
const FRENCH_EQUATORIAL_AFRICA = { to: "French Equatorial Africa", ne0: ["Chad", "Central African Rep.", "Congo", "Gabon"], s: "France" };
// Natural Earth's Morocco runs south over the Western Sahara as far as the berm (its "W. Sahara" is only the land east
// of it). The Spanish Sahara was everything south of 27°40′N, the line Spain and France agreed in 1912; from 1900 to
// 1904, Spain's Río de Oro ended at 26°N. `morocco`: our shape that holds the land first
const SPANISH_SAHARA = (to, morocco, north = 27.667) => [
  { to: morocco, ne0: ["W. Sahara"] },
  { to, poly: [[-17.5, 20.7], [-8.66, 20.7], [-8.66, north], [-17.5, north], [-17.5, 20.7]], from: [morocco], s: "Spain" },
];
// Ifni, Spanish from 1934 (Cliopatria's outline of it lies 60 km away): the coast between the Noun and the Bou Sedra and
// about 25 km inland, approximately
const IFNI = [[-10.65, 29.05], [-10.1, 29.7], [-9.82, 29.5], [-10.34, 28.87], [-10.65, 29.05]];
// Morocco, a French protectorate from 1912, with Spain's two zones: the north as Cliopatria draws it, the far south
// approximately, and Ifni; and the Spanish Sahara
const SPANISH_ZONES_NOTE = "Spain's protectorate zones in Morocco, in the north and the far south (1912–1956; the southern one until 1958).";
const SPAIN_IN_AFRICA = (spain, morocco, ifni) => [
  { to: morocco, ne0: ["Morocco"], s: "France" },
  { to: "Spanish Morocco", clio: spain, pick: [-6.5, 34.6, -1.9, 36.0], s: "Spain", w: ifni ? `${SPANISH_ZONES_NOTE} With Ifni, Spanish from 1934.` : SPANISH_ZONES_NOTE },
  { to: "Spanish Morocco", poly: [[-13.4, 27.66], [-8.67, 27.66], [-8.67, 28.65], [-13.4, 28.65], [-13.4, 27.66]], from: [morocco], s: "Spain" },
  ...(ifni ? [{ to: "Spanish Morocco", poly: IFNI, s: "Spain" }] : []),
  ...SPANISH_SAHARA("Spanish Sahara", morocco),
];
// Where Ecuador's claims ran over land Peru and Colombia held, and Bolivia's over the Chaco Paraguay held: today's
// borders, near the lines each side held (OpenHistoricalMap draws each country's whole claim)
const AMAZON_CHACO = [
  { to: "Peru", ne0: ["Peru"], from: ["Ecuador"] },
  { to: "Colombia", ne0: ["Colombia"], from: ["Ecuador"] },
  { to: "Paraguay", ne0: ["Paraguay"], from: ["Bolivia"] },
];
// Laos and Cambodia, French protectorates with today's borders from 1907 (Tonkin, Annam and Cochinchina come from
// OpenHistoricalMap)
const LAOS_CAMBODIA = [
  { to: "Laos", ne0: ["Laos"], s: "France", w: "A French protectorate, part of French Indochina." },
  { to: "Cambodia", ne0: ["Cambodia"], s: "France", w: "A French protectorate under its own kings, part of French Indochina." },
];
const TOGO = { to: "Togo", ne0: ["Togo"], exact: true, s: "France", w: "The east of German Togoland, run by France (a League of Nations mandate from 1922); independent in 1960." };
const RHODESIAS = (uk) => {
  const w = "Part of the Federation of Rhodesia and Nyasaland (1953–1963).";
  return [
    { to: "Northern Rhodesia", ne0: ["Zambia"], s: uk, w },
    { to: "Southern Rhodesia", ne0: ["Zimbabwe"], s: uk, w: `A self-governing British colony. ${w}` },
    { to: "Nyasaland", ne0: ["Malawi"], s: uk, w },
  ];
};
const SAUDI = (n) => ({ to: n, ne0: ["Saudi Arabia"], exact: true }); // Ibn Saud took Ha'il in 1921 and al-Jawf in 1922
const SOUTH_VIETNAM = ["Kon Tum", "Đắk Nông", "Đắk Lắk", "Gia Lai", "Bình Phước", "Tây Ninh", "Long An", "Ðong Tháp", "An Giang", "Kiên Giang", "Sóc Trăng", "Tiền Giang", "Bà Rịa - Vũng Tàu", "Hồ Chí Minh city", "Khánh Hòa", "Cà Mau", "Bạc Liêu", "Hau Giang", "Vĩnh Long", "Trà Vinh", "Bến Tre", "Đông Nam Bộ", "Bình Thuận", "Ninh Thuận", "Phú Yên", "Bình Định", "Quảng Ngãi", "Đà Nẵng", "Quàng Nam", "Thừa Thiên - Huế", "Quảng Trị", "Bình Dương", "Lâm Đồng", "Can Tho"].map((p) => `Vietnam/${p}`);
const NIGERIA = (states) => states.map((p) => `Nigeria/${p}`);
// Bulgaria from 1878: the principality north of the Balkan Mountains, Eastern Rumelia south of them (both under nominal
// Ottoman rule), and the south-west and south, still Ottoman until 1912–13 (approximately, by today's provinces)
const BULGARIA_1878 = [
  { to: "Bulgaria", ne1: ["Vidin", "Montana", "Vratsa", "Pleven", "Lovech", "Veliko Tarnovo", "Gabrovo", "Ruse", "Razgrad", "Targovishte", "Shumen", "Silistra", "Dobrich", "Varna", "Sofia", "Grad Sofiya", "Pernik", "Kyustendil"].map((p) => `Bulgaria/${p}`), s: "Ottoman Empire", w: "An autonomous principality under nominal Ottoman rule, created in 1878. It took in Eastern Rumelia in 1885 and declared independence in 1908." },
  { to: "Eastern Rumelia", ne1: ["Plovdiv", "Pazardzhik", "Stara Zagora", "Haskovo", "Sliven", "Yambol", "Burgas"].map((p) => `Bulgaria/${p}`), s: "Ottoman Empire", w: "An autonomous Ottoman province from 1878 until it joined Bulgaria in 1885 (shown approximately)." },
  { to: "Ottoman Empire", ne1: ["Bulgaria/Kardzhali", "Bulgaria/Smolyan", "Bulgaria/Blagoevgrad"] },
];
// Cutch, between the Gulf of Kutch and the Rann (OpenHistoricalMap's Maratha outline runs over it; Cliopatria leaves it out)
const CUTCH = {
  to: "Cutch",
  poly: [[68.0, 23.4], [68.3, 24.0], [69.5, 24.4], [70.5, 24.45], [71.1, 24.3], [71.3, 23.9], [71.1, 23.45], [70.85, 23.2], [70.6, 23.12], [70.35, 23.05], [70.1, 22.95], [69.5, 22.6], [68.6, 22.6], [68.0, 23.4]],
  w: "A kingdom ruled by the Jadeja Raos from Bhuj (shown approximately). It came under British protection by a treaty of 1816.",
};
// the Ahom kingdom of Assam, which neither source draws: today's Assam, where no other state is drawn
const AHOM = { to: "Ahom Kingdom", ne1: ["India/Assam"], blank: true, w: "The Ahom kings ruled the Brahmaputra valley from the 13th century until Burma conquered it in 1817–21; Britain took it in 1826 (shown approximately)." };
// the Falklands, British from 1833 (OpenHistoricalMap's Argentina takes them in)
const FALKLANDS = { to: "Falkland Islands", ne0: ["Falkland Is."], s: UK_1900S, w: "A British colony since 1841; Britain took the islands in 1833. Argentina claims them." };
// Cliopatria's row for British India also holds Ceylon's coast, which was a colony of its own
const CEYLON_COAST = (uk, w) => ({ to: "British Ceylon", ne0: ["Sri Lanka"], from: ["Company Raj"], s: uk, ...(w ? { w } : {}) });
const TERRITORY = {
  1800: [
    ...MICROSTATES,
    CUTCH,
    AHOM,
    CEYLON_COAST("Kingdom of Great Britain", "The coast Britain took from the Dutch in 1796, a crown colony from 1802. The Kingdom of Kandy held the hill country until 1815."),
    // Bombay and Surat, British since 1668 and 1800 (Cliopatria draws them; OpenHistoricalMap's Maratha outline runs over them)
    { to: "Company Raj", clio: ["British Empire"], pick: [72.5, 18.9, 73.2, 21.4], from: ["Maratha Confederacy"] },
    // the Sikh states south of the Sutlej (Patiala, Nabha, Jind), which Cliopatria draws in its outline of Rajputana's states
    { to: "Sikh Confederacy", ne1: ["India/Punjab"], from: ["Rajputana"] },
    // the Falklands: Spain's garrison at Puerto Soledad, run from Buenos Aires, held them from 1767 to 1811
    { to: "Viceroyalty of the Río de la Plata", ne0: ["Falkland Is."] },
  ],
  1815: [
    ...MICROSTATES,
    { to: "Kingdom of Saxony", ne1: ["Germany/Sachsen"] }, // the kingdom left after 1815 is today's Saxony
    CUTCH,
    AHOM,
    CEYLON_COAST(UK_1900S),
    // the Mughal emperor's court at Delhi, which Cliopatria draws inside its outline of Rajputana's states; and a speck of
    // that outline on the Kathiawar coast, among the Maratha lands
    { to: "Mughal Empire", clio: ["Mughal Empire"], pick: [76.9, 28.3, 77.6, 28.9], s: UK_1900S, w: "The Mughal emperor's court at Delhi. The British took Delhi in 1803 and ran the country around it; the emperor, Akbar II, lived on a British pension." },
    { to: "Maratha Confederacy", clio: ["Mughal Empire"], pick: [70.2, 22.7, 70.5, 22.9] },
    // Hispaniola: Spain held the east again from 1809 (OpenHistoricalMap's Kingdom of Haiti runs over the Cibao), and the
    // north coast of Haiti is the Kingdom's (OpenHistoricalMap's New Spain, drawn over all the island, keeps it)
    { to: "Captaincy General of Santo Domingo", ne0: ["Dominican Rep."], s: "Spain", w: "Spanish again from 1809 until it broke away in 1821; Haiti took it the next year." },
    { to: "Kingdom of Haiti", poly: [[-74.6, 19.6], [-71.7, 19.6], [-71.7, 20.2], [-74.6, 20.2], [-74.6, 19.6]], from: ["Viceroyalty of New Spain"] },
  ],
  1878: [...MICROSTATES, ...BULGARIA_1878, FALKLANDS],
  1880: [...MICROSTATES, ...BULGARIA_1878, FALKLANDS],
  1900: [
    ...MICROSTATES,
    KALIMANTAN("Netherlands Indies"),
    ADEN(UK_1900S),
    ...BRITISH_ISLES(UK_1900S),
    // Bulgaria, Eastern Rumelia included; its south-west and south stayed Ottoman until 1912–13
    { to: "Bulgaria", ne0: ["Bulgaria"], s: "Ottoman Empire", w: "A principality under nominal Ottoman rule (joined by Eastern Rumelia in 1885) until it declared independence in 1908." },
    { to: "Ottoman Empire", ne1: ["Bulgaria/Kardzhali", "Bulgaria/Smolyan", "Bulgaria/Blagoevgrad"] },
    // Africa: the source shows peoples and kingdoms here long after Europe's colonies had taken them in, many of them
    // conquered by 1900 (Samori Touré's empire in 1898, the Ndebele kingdom in 1893). Today's borders were mostly drawn
    // by 1900, between colonies; states still ruling themselves keep their own shapes
    { to: "Morocco", ne0: ["Morocco"] },
    ...SPANISH_SAHARA("Rio De Oro", "Morocco", 26),
    { to: "Algeria", ne0: ["Algeria"], s: "France" },
    { to: "Tunisia", ne0: ["Tunisia"], s: "France" },
    { to: "Ottoman Empire", ne0: ["Libya"] }, // Tripolitania and Cyrenaica, Ottoman until 1912
    { to: "Egypt", ne0: ["Egypt"], s: UK_1900S, w: "A khedivate under nominal Ottoman rule, occupied by Britain since 1882." },
    { to: "Anglo-Egyptian Sudan", ne0: ["Sudan", "S. Sudan"], s: UK_1900S, w: "Ruled jointly by Britain and Egypt from 1899, in practice by Britain." },
    { to: "Lado Enclave", ohm: 2961764, s: "Congo Free State", w: "Leased to King Leopold II for the Congo Free State in 1894; it went back to the Anglo-Egyptian Sudan in 1910, after his death." },
    // OpenHistoricalMap's Khiva leaves out the oasis of Khiva and Urgench itself, today's Khorezm province
    { to: "Khanate of Khiva", ne1: ["Uzbekistan/Khorezm"], s: "Russian Empire" },
    { to: "Darfur", ne1: ["Central Darfur", "Southern Darfur", "North Darfur", "Western Darfur", "Eastern Darfur"].map((p) => `Sudan/${p}`), w: "A sultanate restored in 1898. Counted as part of Anglo-Egyptian Sudan, it ran its own affairs until Britain conquered it in 1916." },
    { to: "Ethiopia", ne0: ["Ethiopia"] },
    { to: "Eritrea", ne0: ["Eritrea"], s: "Italy" },
    { to: "French Somaliland", ne0: ["Djibouti"], s: "France" },
    { to: "British Somaliland", ne0: ["Somaliland"], s: UK_1900S },
    { to: "Italian Somaliland", ne0: ["Somalia"], s: "Italy" },
    { to: "British East Africa", ne0: ["Kenya"], s: UK_1900S },
    { to: "British East Africa", ne1: JUBALAND }, // Jubaland was British until it was ceded to Italy in 1925
    { to: "Uganda", ne0: ["Uganda"], s: UK_1900S },
    { to: "Uganda", ne1: ["Kenya/Nyanza", "Kenya/Western"], w: "A British protectorate. Its Eastern Province, east of Lake Victoria (shown approximately), passed to British East Africa in 1902." },
    { to: "German East Africa", ne0: ["Tanzania"], s: "Germany" },
    { to: "Zanzibar", ne1: ZANZIBAR_ISLES, s: UK_1900S, w: "A sultanate under British protection from 1890." },
    { to: "Rwanda", ne0: ["Rwanda"], s: "Germany", w: "A kingdom under German protection, counted as part of German East Africa." },
    { to: "Burundi", ne0: ["Burundi"], s: "Germany", w: "A kingdom under German protection, counted as part of German East Africa." },
    { to: "Congo Free State", ne0: ["Dem. Rep. Congo"], w: "The personal possession of King Leopold II of Belgium, 1885–1908." },
    { to: "French Congo", ne0: ["Gabon", "Congo", "Central African Rep.", "Chad"], s: "France" },
    { to: "Wadai", ne1: ["Chad/Ouaddaï", "Chad/Wadi Fira"], w: "An independent sultanate until France conquered it in 1909 (shown approximately)." },
    { to: "Kamerun", ne0: ["Cameroon"], s: "Germany" },
    { to: "Spanish Guinea", ne0: ["Eq. Guinea"], s: "Spain" },
    { to: "São Tomé and Príncipe", ne0: ["São Tomé and Principe"], s: "Portugal" },
    { to: "French West Africa", ne0: ["Mali", "Burkina Faso", "Niger", "Mauritania"], s: "France", w: "The interior run by the federation of French West Africa (1895), which also grouped Senegal, French Guinea, Ivory Coast and Dahomey." },
    { to: "Senegal", ne0: ["Senegal"], s: "France" },
    { to: "Gambia", ne0: ["Gambia"], s: UK_1900S },
    { to: "Portuguese Guinea", ne0: ["Guinea-Bissau"], s: "Portugal" },
    { to: "French Guinea", ne0: ["Guinea"], s: "France" },
    { to: "Sierra Leone", ne0: ["Sierra Leone"], s: UK_1900S },
    { to: "Liberia", ne0: ["Liberia"] },
    { to: "Ivory Coast", ne0: ["Côte d'Ivoire"], s: "France" },
    { to: "Gold Coast", ne0: ["Ghana"], s: UK_1900S, w: "A British colony; Ashanti, occupied in 1896, rose in 1900 and was annexed in 1902." },
    { to: "Togoland", ne1: ["Ghana/Volta"], s: "Germany" }, // the south-west of German Togoland, in Ghana today
    { to: "Dahomey", ne0: ["Benin"], s: "France" },
    { to: "Lagos", ne1: NIGERIA(["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"]), s: UK_1900S, w: "The British Colony and Protectorate of Lagos (shown approximately)." },
    { to: "Southern Nigeria", ne1: NIGERIA(["Edo", "Delta", "Bayelsa", "Rivers", "Akwa Ibom", "Cross River", "Abia", "Imo", "Anambra", "Enugu", "Ebonyi"]), s: UK_1900S, w: "A British protectorate from 1900 (shown approximately)." },
    { to: "Northern Nigeria", ne1: NIGERIA(["Sokoto", "Kebbi", "Zamfara", "Katsina", "Kano", "Jigawa", "Yobe", "Borno", "Bauchi", "Gombe", "Adamawa", "Taraba", "Plateau", "Nassarawa", "Kaduna", "Niger", "Kwara", "Kogi", "Benue", "Federal Capital Territory"]), s: UK_1900S, w: "Proclaimed a British protectorate in January 1900; the Sokoto Caliphate, its largest state, held out until 1903." },
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Angola", ne0: ["Angola"], s: "Portugal" },
    { to: "German South-West Africa", ne0: ["Namibia"], s: "Germany" },
    { to: "Bechuanaland Protectorate", ne0: ["Botswana"], s: UK_1900S },
    { to: "Southern Rhodesia", ne0: ["Zimbabwe"], s: UK_1900S, w: "Run by the British South Africa Company." },
    { to: "Northern Rhodesia", ne0: ["Zambia"], s: UK_1900S, w: "North-Western and North-Eastern Rhodesia, run by the British South Africa Company." },
    { to: "Barotseland", ne1: ["Zambia/Western"], s: UK_1900S, w: "The Lozi kingdom, under British protection (shown approximately)." },
    { to: "British Central Africa", ne0: ["Malawi"], s: UK_1900S },
    { to: "Portuguese East Africa", ne0: ["Mozambique"], s: "Portugal" },
    { to: "Cape Colony", ne1: ["Western Cape", "Eastern Cape", "Northern Cape"].map((p) => `South Africa/${p}`), s: UK_1900S },
    { to: "Natal", ne1: ["South Africa/KwaZulu-Natal"], s: UK_1900S },
    { to: "Orange Free State", ne1: ["South Africa/Free State"], w: "A Boer republic at war with Britain, which annexed it in May 1900; its forces fought on until 1902." },
    { to: "Transvaal", ne1: ["Gauteng", "Limpopo", "Mpumalanga", "North West"].map((p) => `South Africa/${p}`), w: "The South African Republic. Britain took Pretoria in June 1900 and annexed it in September; Boer forces fought on until 1902." },
    { to: "Basutoland", ne0: ["Lesotho"], s: UK_1900S },
    { to: "Swaziland", ne0: ["eSwatini"] },
    { to: "Madagascar", ne0: ["Madagascar"], s: "France" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
    { to: "Mauritius", ne0: ["Mauritius"], s: UK_1900S },
    { to: "Comoros", ne0: ["Comoros"], s: "France" },
    { to: "Oman", ne0: ["Oman"] },
    { to: "Trucial Oman", ne0: ["United Arab Emirates"], s: UK_1900S },
    // Asia and the Pacific
    { to: "Taiwan", ne0: ["Taiwan"], s: "Imperial Japan", w: "A Japanese colony from 1895 to 1945." },
    { to: "Rattanakosin Kingdom", ne0: ["Thailand"] },
    // Siam until it ceded them to France (1904, 1907) and Britain (1909)
    { to: "Rattanakosin Kingdom", ne1: ["Cambodia/Batdâmbâng", "Cambodia/Bântéay Méanchey", "Cambodia/Siemréab", "Cambodia/Otdar Mean Chey", "Cambodia/Krong Pailin", "Laos/Xaignabouri", "Malaysia/Kedah", "Malaysia/Perlis", "Malaysia/Kelantan", "Malaysia/Terengganu"] },
    PORTUGUESE_TIMOR,
    ...BORNEO(UK_1900S),
    { to: "Brunei", ne0: ["Brunei"], s: UK_1900S },
    { to: "New Zealand", ne0: ["New Zealand"], s: UK_1900S },
    ...ISLANDS(UK_1900S),
    // Australia's six colonies, the Northern Territory part of South Australia; they federated on 1 January 1901
    { to: "Western Australia (UK)", ne1: ["Australia/Western Australia"] },
    { to: "South Australia (UK)", ne1: ["Australia/South Australia", "Australia/Northern Territory"] },
    { to: "Queensland (UK)", ne1: ["Australia/Queensland"] },
    { to: "New South Wales (UK)", ne1: ["Australia/New South Wales", "Australia/Australian Capital Territory", "Australia/Jervis Bay Territory"] },
    { to: "Victoria (UK)", ne1: ["Australia/Victoria"] },
    { to: "Tasmania (UK)", ne1: ["Australia/Tasmania"] },
    // the Americas
    HAWAII("United States of America"),
    { to: "Puerto Rico", ne0: ["Puerto Rico"], s: "United States of America" }, // ceded by Spain in 1898
    { to: "Cuba", ne0: ["Cuba"], s: "United States of America", w: "Under United States military government from 1898 until independence in May 1902." },
    { to: "Jamaica", ne0: ["Jamaica"], s: UK_1900S },
    { to: "Bahamas", ne0: ["Bahamas"], s: UK_1900S },
    { to: "Trinidad and Tobago", ne0: ["Trinidad and Tobago"], s: UK_1900S },
    { to: "British Guiana", ne0: ["Guyana"], s: UK_1900S }, // the border set by arbitration in 1899
    { to: "Newfoundland", ne1: ["Canada/Newfoundland and Labrador"], s: UK_1900S },
    { to: "Chile", ne0: ["Chile"] }, // Chile took the Atacama coast from Bolivia and Peru in 1879–1884
    { to: "Chile", ne1: ["Peru/Tacna"] }, // held by Chile until 1929
    { to: "Bolivia", ne1: ["Brazil/Acre"] }, // Bolivian until 1903
    ...AMAZON_CHACO,
  ],
  1914: [
    ...MICROSTATES,
    KALIMANTAN("Netherlands Indies"),
    ...SPAIN_IN_AFRICA(["Kingdom of Spain"], "Morocco", false),
    { to: "Mongolia", ne0: ["Mongolia"], w: "The Bogd Khanate, which broke away from China in 1911; it accepted autonomy under Chinese suzerainty in 1915." },
    { to: "Khanate of Khiva", ne1: ["Uzbekistan/Khorezm"], s: "Russian Empire" }, // the oasis OpenHistoricalMap's Khiva leaves out
    { to: "Abyssinia", ne0: ["Ethiopia"], from: ["Sultanate of Hobyo"] }, // OpenHistoricalMap's Hobyo runs into the Ogaden
    ADEN(UK_1930S),
    ...BRITISH_ISLES(UK_1930S),
    { to: "British Somaliland", ne0: ["Somaliland"] },
    { to: "Italian Somaliland", ne0: ["Somalia"] },
    { to: "British East Africa", ne1: JUBALAND },
    { to: "Muscat and Oman", ne0: ["Oman"], s: UK_1930S },
    { to: "Trucial Oman", ne0: ["United Arab Emirates"], s: UK_1930S },
    ...ISLANDS(UK_1930S),
    { to: "Bahamas", ne0: ["Bahamas"], s: UK_1930S },
    { to: "Jamaica", ne0: ["Jamaica"], s: UK_1930S },
    { to: "Trinidad and Tobago", ne0: ["Trinidad and Tobago"], s: UK_1930S },
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
    ...EGYPT_LIBYA("Libya", "Kingdom of Italy", { s: UK_1930S, w: "A khedivate under nominal Ottoman rule, occupied by Britain since 1882; a British protectorate from December 1914." }),
    // Chad, Ubangi-Shari and the Congo were French Equatorial Africa from 1910, not French West Africa
    { to: "French Equatorial Africa", ne0: ["Chad", "Central African Rep.", "Congo", "Gabon"], from: ["French West Africa"] },
    // the Barotseland border set by arbitration in 1905 (OpenHistoricalMap draws the line held before it until 1915)
    { to: "Angola", ne0: ["Angola"], from: ["Northern Rhodesia"] },
    ...AMAZON_CHACO,
    ...COLONIAL_BORDERS(UK_1930S, "United States"),
    ...BORNEO(UK_1930S),
    ...KOREA_TAIWAN("Empire of Japan"),
    PORTUGUESE_TIMOR,
    HAWAII("United States"),
    { to: "Dominion of Newfoundland", ne1: ["Canada/Newfoundland and Labrador"], s: UK_1930S }, // part of Canada only from 1949
    { to: "Chile", ne1: ["Peru/Tacna"] }, // held by Chile until 1929
  ],
  1920: [
    ...MICROSTATES,
    KALIMANTAN("Dutch East Indies"),
    ...BRITISH_ISLES(UK_1930S),
    ...LAUSANNE("Ottoman Sultanate", 1920),
    GREENLAND,
    ...GULF(UK_1930S, UK_1930S),
    SOUTH_WEST_AFRICA("Union of South Africa"),
    ALGERIA("Algeria"),
    FRENCH_EQUATORIAL_AFRICA,
    ...SPAIN_IN_AFRICA(["Kingdom of Spain"], "Morocco", false),
    ADEN(UK_1930S),
    { to: "Mandatory Palestine (GB)", ne0: ["Jordan"], s: UK_1930S }, // east of the Jordan: part of the British mandate (the emirate from 1921)
    { to: "Kingdom of Hejaz", ne1: ["Jordan/Aqaba", "Jordan/Ma`an"] }, // Aqaba and Ma'an were held by the Hejaz until 1925
    { to: "Khorezm People's Soviet Republic", ne1: ["Uzbekistan/Khorezm"] }, // the oasis OpenHistoricalMap's outline leaves out
    { to: "Ethiopia", ne0: ["Ethiopia"], from: ["Sultanate of Hobyo", "Majeerteen Sultanate"] }, // OpenHistoricalMap's outlines run into the Ogaden
    // the Byelorussian SSR of late 1920 was the land around Minsk: the provinces to its east were Soviet Russia's
    // until 1924 and 1926 (approximately, by today's provinces)
    { to: "Soviet Russia (RSFSR)", ne1: ["Belarus/Vitebsk", "Belarus/Mogilev", "Belarus/Gomel"], from: ["Byelorussian SSR"] },
    ...LAOS_CAMBODIA,
    ...AMAZON_CHACO,
    { to: "Kenya", ne1: JUBALAND },
    { to: "British Cameroons", ne1: SOUTHERN_CAMEROONS, s: UK_1930S }, // a British mandate, never French
    ...ISLANDS(UK_1930S),
    { to: "Bahamas", ne0: ["Bahamas"], s: UK_1930S },
    ...EGYPT_LIBYA("Libya (IT)", "Italy", { s: UK_1930S, w: "A British protectorate from 1914; Britain recognised its independence in 1922." }),
    ...COLONIAL_BORDERS(UK_1930S, "United States"),
    ...BORNEO(UK_1930S),
    ...KOREA_TAIWAN("Empire of Japan"),
    PORTUGUESE_TIMOR,
    HAWAII("United States"),
    TOGO, // the west was British Togoland, run with the Gold Coast
    { to: "Greece", ne0: ["Greece"] }, // with its Aegean islands, Greek from 1912
    { to: "Dodecanese Islands", ne0: ["Greece"], pick: DODECANESE, s: "Italy" },
    CYPRUS_COLONY(UK_1930S),
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
  ],
  1930: [
    ...MICROSTATES,
    KALIMANTAN("Dutch East Indies"),
    ...BRITISH_ISLES(UK_1930S),
    ...LAUSANNE("Republic of Turkey", 1930),
    GREENLAND,
    ...GULF(UK_1930S, UK_1930S),
    SOUTH_WEST_AFRICA("Union of South Africa"),
    ALGERIA("Algeria"),
    FRENCH_EQUATORIAL_AFRICA,
    ...SPAIN_IN_AFRICA(["Kingdom of Spain"], "Morocco", false),
    ADEN(UK_1930S),
    { to: "Transjordan", ne0: ["Jordan"], s: UK_1930S }, // an emirate under British mandate, 1921–1946
    { to: "British Cameroons", ne1: SOUTHERN_CAMEROONS, s: UK_1930S },
    ...ISLANDS(UK_1930S),
    { to: "Bahamas", ne0: ["Bahamas"], s: UK_1930S },
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
    SAUDI("Kingdom of Hejaz and Nejd"),
    CYPRUS_COLONY(UK_1930S),
    ...COLONIAL_BORDERS(UK_1930S, "United States"),
    ...BORNEO(UK_1930S),
    ...KOREA_TAIWAN("Empire of Japan"),
    PORTUGUESE_TIMOR,
    HAWAII("United States"),
    TOGO,
    ...LAOS_CAMBODIA,
    ...AMAZON_CHACO,
  ],
  1938: [
    ...MICROSTATES,
    KALIMANTAN("Dutch East Indies"),
    ...BRITISH_ISLES(UK_LATER),
    { to: "Italy", ne0: ["Greece"], pick: DODECANESE }, // the Dodecanese
    ...LAUSANNE("Turkey", 1938),
    GREENLAND,
    ...GULF(UK_LATER, UK_LATER),
    SOUTH_WEST_AFRICA("Union of South Africa"),
    ALGERIA("Algeria (France)"),
    ...SPAIN_IN_AFRICA(["Second Spanish Republic", "Spanish Nationalists"], "Morocco (France)", true),
    ADEN(UK_LATER),
    { to: "Transjordan", ne0: ["Jordan"], s: UK_LATER },
    { to: "Iraq", ne0: ["Iraq"] }, // independent from October 1932
    { to: "British Cameroons", ne1: SOUTHERN_CAMEROONS, s: UK_LATER },
    ...ISLANDS(UK_LATER),
    SAUDI("Saudi Arabia"),
    CYPRUS_COLONY(UK_LATER),
    // the border of today, near the line each side held from 1936 (the source draws Ecuador's whole claim)
    { to: "Peru", ne0: ["Peru"], exact: true },
    { to: "Ecuador", ne0: ["Ecuador"], exact: true },
    ...COLONIAL_BORDERS(UK_LATER, "United States"),
    ...BORNEO(UK_LATER),
    ...KOREA_TAIWAN("Empire of Japan"),
    PORTUGUESE_TIMOR,
    HAWAII("United States"),
    TOGO,
    { to: "Haiti", ne0: ["Haiti"], exact: true }, // the border with the Dominican Republic fixed in 1929–1936
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
    ...LAOS_CAMBODIA,
  ],
  1945: [
    ...MICROSTATES,
    KALIMANTAN("Indonesia"),
    ...BRITISH_ISLES(UK_LATER),
    { to: "Dodecanese Islands", ne0: ["Greece"], pick: DODECANESE, s: UK_LATER, w: "Italian from 1912, under British military rule from 1945, and Greek from 1947." },
    { to: "Denmark", ne0: ["Faeroe Is."] },
    { to: "USSR", ne0: ["Estonia", "Latvia", "Lithuania"] }, // annexed in 1940 and again in 1944; most Western states never recognised it
    // Germany's islands, by occupation zone
    { to: "Germany (UK)", ne0: ["Germany"], pick: [6.3, 53.4, 11.3, 55.2] },
    { to: "Germany (Soviet)", ne0: ["Germany"], pick: [11.3, 53.85, 14.5, 54.75] },
    ADEN(UK_LATER),
    PORTUGUESE_TIMOR, // Indonesia was not yet a state
    GREENLAND,
    ...GULF(UK_LATER, null),
    SOUTH_WEST_AFRICA("South Africa"),
    ALGERIA("Algeria"),
    ...SPAIN_IN_AFRICA(["Francoist Spain"], "Morocco", true),
    // French West and Equatorial Africa, by colony
    ...[["Senegal", "Senegal"], ["Mauritania", "Mauritania"], ["French Sudan", "Mali"], ["Niger", "Niger"], ["French Guinea", "Guinea"], ["Ivory Coast", "Côte d'Ivoire"], ["Dahomey", "Benin"], ["Chad", "Chad"], ["Ubangi-Shari", "Central African Rep."], ["Middle Congo", "Congo"], ["Gabon", "Gabon"]].map(([to, n]) => ({ to, ne0: [n], s: "France" })),
    // Germany's occupation zones: OpenHistoricalMap draws the American and British ones and Berlin's sectors; the Soviet
    // zone and the French one by today's states, and the French part of Baden-Württemberg
    { to: "Germany (Soviet)", ne1: ["Mecklenburg-Vorpommern", "Brandenburg", "Sachsen", "Sachsen-Anhalt", "Thüringen"].map((n) => `Germany/${n}`), s: "USSR" },
    { to: "Germany (Soviet)", ohm: 2693415 }, // Berlin's Soviet sector (OHM's East Berlin)
    { to: "Germany (France)", ne1: ["Germany/Rheinland-Pfalz", "Germany/Saarland"], s: "France" },
    { to: "Germany (France)", ne1: ["Germany/Baden-Württemberg"], from: ["France", "French Fourth Republic"], s: "France" },
    // East Asia after Japan's surrender
    { to: "Japan (USA)", ne0: ["Japan"], s: "United States", w: "Occupied by the Allies, chiefly the United States, from September 1945 until 1952." },
    // what OpenHistoricalMap's Empire of Japan of late 1945 still holds beyond Japan: the Kwantung peninsula, taken by
    // the Soviet army, and the Pacific islands of Japan's mandate, taken by the United States
    { to: "Kwantung (USSR)", poly: [[120.8, 38.6], [122.9, 38.6], [122.9, 39.5], [120.8, 39.5], [120.8, 38.6]], from: ["Empire of Japan"], s: "USSR", w: "The Kwantung Leased Territory, Japanese from 1905, taken by the Soviet army in August 1945. The Soviet Union kept Port Arthur as a naval base until 1955." },
    { to: "Pacific Islands (USA)", poly: [[130, 0], [172, 0], [172, 22], [130, 22], [130, 0]], from: ["Empire of Japan"], s: "United States", w: "Japan's League of Nations mandate, taken by the United States in 1944–45; a UN trust territory under US rule from 1947." },
    { to: "USSR", ne1: ["Russia/Sakhalin"] }, // southern Sakhalin and the Kurils, taken by the Soviet Union in August 1945
    { to: "Taiwan", ne0: ["Taiwan"], s: "China", w: "A Japanese colony from 1895; run by the Republic of China from October 1945." },
    { to: "French Indochina", ne0: ["Vietnam"], s: "France", w: "Under Japanese control from 1940. In September 1945 Ho Chi Minh declared Vietnam independent in Hanoi while British and French troops retook the south; war with France followed in 1946." },
    { to: "Laos", ne0: ["Laos"], s: "France" },
    // Thailand gave back the Malay states and the Shan lands Japan had given it in 1943 after the war, but held the
    // land it took from French Indochina in 1941 until November 1946
    { to: "Thailand", ne1: ["Laos/Xaignabouri"] },
    { to: "British Malaya", ne1: ["Malaysia/Kedah", "Malaysia/Perlis", "Malaysia/Kelantan", "Malaysia/Terengganu"], from: ["Thailand"] },
    { to: "Burma", ne1: ["Myanmar/Shan"], from: ["Thailand"] },
    { to: "Netherlands New Guinea", ne1: ["Indonesia/Papua", "Indonesia/Papua Barat"], s: "Netherlands" },
    // Upper Volta was split between its neighbours from 1932 to 1947 (approximately, by today's provinces)
    { to: "Ivory Coast", ne0: ["Burkina Faso"] },
    { to: "Niger", ne1: ["Gourma", "Gnagna", "Tapoa", "Komondjari", "Kompienga", "Séno", "Yagha", "Oudalan", "Soum"].map((p) => `Burkina Faso/${p}`) },
    { to: "French Sudan", ne1: ["Yatenga", "Loroum", "Zondoma", "Mou Houn", "Kossi", "Sourou", "Banwa", "Nayala", "Balé"].map((p) => `Burkina Faso/${p}`) },
    { to: "British Cameroons", ne1: SOUTHERN_CAMEROONS, s: UK_LATER },
    ...ISLANDS(UK_LATER),
    { to: "Yemen", ne1: NORTH_YEMEN, exact: true },
    { to: "Lebanon", ne0: ["Lebanon"], exact: true },
    // Trieste and Gorizia, run by the Allies from June 1945 and Italian in law until 1947 (OpenHistoricalMap leaves them out)
    { to: "Italy", ne1: ["Italy/Trieste", "Italy/Gorizia"] },
    CYPRUS_COLONY(UK_LATER),
    ...COLONIAL_BORDERS(UK_LATER, "United States"),
    ...BORNEO(UK_LATER),
    HAWAII("United States"),
    TOGO,
    { to: "Haiti", ne0: ["Haiti"], exact: true },
    { to: "Dominion of Newfoundland", ne1: ["Canada/Newfoundland and Labrador"], s: UK_LATER }, // part of Canada only from 1949
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
  ],
  1960: [
    ...MICROSTATES,
    KALIMANTAN("Indonesia"),
    ...BRITISH_ISLES(UK_LATER),
    { to: "Denmark", ne0: ["Faeroe Is."] },
    { to: "USSR", ne0: ["Estonia", "Latvia", "Lithuania"] },
    ADEN(UK_LATER),
    { to: "Jordan", ne0: ["Palestine"], pick: [34.8, 31.2, 35.7, 32.7] }, // the West Bank, annexed by Jordan in 1950
    ...GULF(UK_LATER, null),
    SOUTH_WEST_AFRICA("South Africa"),
    ALGERIA("Algeria"),
    ...SPANISH_SAHARA("Spanish Sahara", "Morocco"),
    { to: "Ifni", poly: IFNI, s: "Spain", w: "Spanish from 1934 until it was returned to Morocco in 1969." },
    { to: "Eritrea", ne0: ["Eritrea"], s: "Ethiopia", w: "Federated with Ethiopia from 1952 as an autonomous unit; Ethiopia annexed it in 1962." },
    ...RHODESIAS(UK_LATER),
    { to: "Angola", ne0: ["Angola"], s: "Portugal" },
    { to: "Mozambique", ne0: ["Mozambique"], s: "Portugal" },
    { to: "East Germany", ohm: 2693415 }, // East Berlin, its capital (the Western powers held it to be the Soviet sector)
    { to: "United Arab Republic", ne0: ["Palestine"], pick: [34.1, 31.1, 34.7, 31.7] }, // Gaza, held by Egypt from 1948 to 1967
    { to: "British Cameroons", ne1: SOUTHERN_CAMEROONS, s: UK_LATER }, // a British trust territory until October 1961
    ...ISLANDS(UK_LATER),
    { to: "Yemen", ne1: NORTH_YEMEN, exact: true },
    { to: "Lebanon", ne0: ["Lebanon"], exact: true },
    ...COLONIAL_BORDERS(UK_LATER, "United States"),
    ...BORNEO(UK_LATER),
    PORTUGUESE_TIMOR,
    { to: "Singapore", ne0: ["Singapore"], s: UK_LATER, w: "Self-governing from 1959; part of Malaysia from 1963 and independent from 1965." },
    { to: "Netherlands New Guinea", ne1: ["Indonesia/Papua", "Indonesia/Papua Barat"], s: "Netherlands", w: "Dutch until 1962; run by the UN, then by Indonesia from 1963." },
    { to: "South Vietnam", ne1: SOUTH_VIETNAM, w: "The Republic of Vietnam, divided from the North at the 17th parallel (shown approximately) from 1954 until 1975." },
    { to: "Togo", ne0: ["Togo"], exact: true },
    { to: "Haiti", ne0: ["Haiti"], exact: true },
    { to: "United States", ne0: ["United States of America"], pick: [-161, 18, -154, 23] }, // Hawaii, a state from 1959
    { to: "Cape Verde", ne0: ["Cabo Verde"], s: "Portugal" },
    { to: "Réunion", ne1: ["France/La Réunion"], s: "France" },
  ],
};
// A ruler named differently from its shape on the same map ("United Kingdom" where the map names it the United Kingdom
// of Great Britain and Ireland) takes the shape's name, so its land counts toward the empire it belongs to.
const RULER_NAMES = [
  ["United Kingdom", UK_1900S, "Kingdom of Great Britain", "British Empire"],
  ["Italy", "Kingdom of Italy"],
  ["Russia", "Russian Empire"],
  ["Spain", "Kingdom of Spain", "Spanish Empire"],
  ["Portugal", "Kingdom of Portugal", "Portuguese Empire", "United Kingdom of Portugal, Brazil and the Algarves"],
  ["France", "French Republic", "Kingdom of France", "French Third Republic", "French Consulate", "Bourbon Kingdom of France"],
  ["Netherlands", "United Kingdom of the Netherlands", "Batavian Republic"],
  ["Denmark", "Denmark–Norway", "Denmark-Norway"],
];
function matchRulers(grouped) {
  const names = new Set(grouped.map((f) => f.properties.n));
  for (const f of grouped) {
    const s = f.properties.s;
    if (!s || names.has(s)) continue;
    const same = RULER_NAMES.find((pair) => pair.includes(s))?.find((n) => n !== s && names.has(n));
    if (same === f.properties.n) delete f.properties.s;
    else if (same) f.properties.s = same;
  }
}
// shapes from another snapshot of the historical source
const snapshotCache = new Map();
function sourceShape(year, name) {
  if (!snapshotCache.has(year)) snapshotCache.set(year, JSON.parse(fs.readFileSync(path.join(HB_DIR, `world_${year}.geojson`), "utf8")).features);
  return snapshotCache
    .get(year)
    .filter((f) => (f.properties?.NAME || "").trim() === name)
    .flatMap((f) => fixWinding(f.geometry)?.coordinates ?? []);
}
let admin1Cache = null;
let countries50 = null;
const ohmForRules = new Map(); // OpenHistoricalMap relation id -> its land, for the territory rules (`ohm`)
const ADMIN1_COUNTRY = { "United Republic of Tanzania": "Tanzania", "Republic of the Congo": "Congo", "Democratic Republic of the Congo": "Dem. Rep. Congo" };
const polysOfFeature = (f) => fixWinding(f.geometry)?.coordinates ?? [];
/**
 * The land of some provinces of one country. The provinces come from Natural Earth's finer 1:10m file, so their coast
 * and outer border are taken from the 1:50m country outline the rest of the map uses (the country less its other
 * provinces): two versions of one border would leave slivers between them.
 */
function provincesLand(admin, chosen) {
  const own = chosen.flatMap(polysOfFeature);
  const country = countries50.get(ADMIN1_COUNTRY[admin] ?? admin);
  if (!country?.length) return own;
  const [w, s, e, n] = boxOfPolys(own).map((v, i) => v + (i < 2 ? -0.5 : 0.5));
  const near = clipSafely(polygonClipping.intersection, country, [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]]);
  if (!near?.length) return own;
  const others = admin1Cache
    .filter((f) => f.properties.admin === admin && !chosen.includes(f))
    .flatMap(polysOfFeature)
    .filter((p) => boxesMeet(boxOfPolys([p]), [w, s, e, n]));
  const land = others.length ? clipSafely(polygonClipping.difference, near, others) : near;
  if (!land) return own;
  // pieces that are mostly another province's coast (where the two files' coastlines differ) are not these provinces
  return land.filter((p) => {
    const box = boxOfPolys([p]);
    const mine = own.filter((q) => boxesMeet(boxOfPolys([q]), box));
    const shared = mine.length ? clipSafely(polygonClipping.intersection, [p], mine) : [];
    return shared && km2Of(shared) >= 0.5 * km2Of([p]);
  });
}
function territoryUnits(rule, year) {
  const out = [];
  const take = (polys) => {
    for (const rings of polys) {
      if (!rule.pick) out.push(rings);
      else {
        const [x, y] = geoCentroid({ type: "Polygon", coordinates: rings });
        if (x >= rule.pick[0] && x <= rule.pick[2] && y >= rule.pick[1] && y <= rule.pick[3]) out.push(rings);
      }
    }
  };
  const ne = require("world-atlas/countries-50m.json");
  countries50 ??= new Map(client.feature(ne, ne.objects.countries).features.map((f) => [f.properties.name, polysOfFeature(f)]));
  if (rule.ne0) {
    const found = rule.ne0.filter((n) => countries50.has(n));
    if (found.length !== rule.ne0.length) console.warn(`  ! territory rule for ${rule.to}: not all of ${rule.ne0.join(", ")} found`);
    for (const n of found) take(countries50.get(n));
  }
  if (rule.ne1) {
    admin1Cache ??= JSON.parse(fs.readFileSync(path.join(CACHE, "ne_10m_admin_1_states_provinces.geojson"), "utf8")).features;
    const found = admin1Cache.filter((f) => rule.ne1.includes(`${f.properties.admin}/${f.properties.name}`));
    if (found.length !== rule.ne1.length) console.warn(`  ! territory rule for ${rule.to}: found ${found.length} of ${rule.ne1.length} provinces`);
    for (const admin of new Set(found.map((f) => f.properties.admin))) take(provincesLand(admin, found.filter((f) => f.properties.admin === admin)));
  }
  if (rule.source) {
    const polys = sourceShape(...rule.source);
    if (!polys.length) console.warn(`  ! territory rule for ${rule.to}: no ${rule.source[1]} in ${rule.source[0]}`);
    out.push(...polys);
  }
  if (rule.clio) {
    const found = (clioRaw.get(year) ?? []).filter((f) => rule.clio.includes(f.properties.Name));
    if (!found.length) console.warn(`  ! territory rule for ${rule.to}: no ${rule.clio.join(", ")} in Cliopatria's ${year}`);
    take(found.flatMap(polysOfFeature));
  }
  if (rule.poly) take(onLandOnly([[rule.poly]]));
  if (rule.ohm) take(ohmForRules.get(rule.ohm) ?? []);
  return out;
}
function applyTerritory(grouped, year, slivers) {
  for (const rule of TERRITORY[year] ?? []) {
    const polys = territoryUnits(rule, year);
    if (!polys.length) continue;
    const box = boxOfPolys(polys);
    // blank strips left by an earlier cut give way to the land given here
    for (let i = slivers.length - 1; i >= 0; i--) {
      if (!boxesMeet(boxOfPolys(slivers[i].geometry.coordinates), box)) continue;
      const left = clipSafely(polygonClipping.difference, slivers[i].geometry.coordinates, polys);
      const g = left && fixWinding({ type: "MultiPolygon", coordinates: left });
      if (g?.coordinates.length) [slivers[i].geometry, slivers[i].properties.a] = [g, Math.round(km2(g))];
      else if (left) slivers.splice(i, 1);
    }
    const taken = []; // with `from`: what those shapes lose
    const held = []; // with `blank`: the land the shapes there hold
    for (const f of grouped) {
      if (!f.geometry.coordinates.length || !boxesMeet(boxOfPolys(f.geometry.coordinates), box)) continue;
      if (rule.blank) {
        held.push(...f.geometry.coordinates);
        continue;
      }
      if (rule.from && !rule.from.includes(f.properties.n)) continue;
      const before = new Set(f.geometry.coordinates.map(partKey));
      const was = km2Of(f.geometry.coordinates);
      if (rule.from) taken.push(...(clipSafely(polygonClipping.intersection, f.geometry.coordinates, polys) ?? []));
      cutShape(f, polys, box);
      // with `exact`, the country keeps nothing of its old outline beyond the new one (a sliver or wider)
      if (rule.exact && f.properties.n === rule.to) dropSlivers(f, before, Infinity, box, slivers, true);
      else dropSlivers(f, before, was, box, slivers);
    }
    const give = rule.from ? taken : rule.blank && held.length ? (clipSafely(polygonClipping.difference, polys, held) ?? []) : polys;
    if (!give.length) continue;
    let f = grouped.find((g) => g.properties.n === rule.to);
    if (f) f.geometry.coordinates = f.geometry.coordinates.length ? (clipSafely(polygonClipping.union, f.geometry.coordinates, give) ?? [...f.geometry.coordinates, ...give]) : give;
    else grouped.push((f = { type: "Feature", properties: { n: rule.to, b: 3 }, geometry: { type: "MultiPolygon", coordinates: give } }));
    setProps(f, { ...("s" in rule ? { s: rule.s || null } : {}), ...(rule.w ? { w: rule.w } : {}) });
  }
  for (let i = grouped.length - 1; i >= 0; i--) {
    const g = fixWinding({ type: "MultiPolygon", coordinates: grouped[i].geometry.coordinates });
    if (g && g.coordinates.length) grouped[i].geometry = g;
    else grouped.splice(i, 1);
  }
}

// ---------- islands the source leaves out ----------
// A missing island is given to a neighbouring state only when that is safe: the nearest state in this era is
// within 60 km AND it is the same country that owns the island today. Otherwise it stays "not mapped". (Missing land
// that touches a shape is a coastal strip, not an island: see touchesShape.)
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

// A missing piece that shares an edge with a named shape is a strip along a coast, not an island. Added to its country
// as an extra piece, it would draw the old coastline through the country and could run one country's colour along its
// neighbour's coast (Libya's strip ran past the Egyptian border), so it is left to the coast fill (scripts/lib/gaps.mjs),
// which shares it between the shapes beside it and merges each part in. `j` marks it to be filled whatever its width.
// `features` are the outlines the missing land was cut from, so a strip shares their corners exactly; an island across
// a strait, however narrow, does not.
function touchesShape(patch, features) {
  const TOUCH = 1e-7; // degrees: the same point
  const pts = patch.geometry.coordinates.flatMap((rings) => rings[0]);
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const [x, y] of pts) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
  const near = new Set();
  for (const f of features) {
    if (!f.properties.n) continue;
    for (const rings of f.geometry.coordinates)
      for (const r of rings)
        for (let k = 1; k < r.length; k++) {
          const [x1, y1] = r[k - 1];
          const [x2, y2] = r[k];
          if (Math.max(x1, x2) < w - TOUCH || Math.min(x1, x2) > e + TOUCH || Math.max(y1, y2) < s - TOUCH || Math.min(y1, y2) > n + TOUCH) continue;
          const dx = x2 - x1;
          const dy = y2 - y1;
          pts.forEach(([x, y], i) => {
            const t = dx || dy ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))) : 0;
            if (Math.hypot(x1 + t * dx - x, y1 + t * dy - y) <= TOUCH) near.add(i);
          });
          if (near.size >= 2) return true;
        }
  }
  return false;
}

// ---------- countries the source leaves unnamed ----------
// In these snapshots the source draws land but leaves its name blank, so it showed as "not mapped". The unnamed pieces
// lying in that country today get the country's name back (joining its shape, for islands); the outline is the source's own.
// `today` + `box`: the piece lies in a different country today (Tasmania, in Australia), inside this lon/lat box.
// `s`: who ruled it, as for the source's own colonies (colonies take their ruler's colour). None at present: the one
// case, Tasmania in 1900, is now drawn from other sources.
const UNNAMED = [];

/** Splits the pieces of an unnamed source shape that belong to a country in UNNAMED into shapes of their own. */
function nameUnnamed(geometry, b, year, features, found) {
  const rules = UNNAMED.filter((r) => r.years.includes(year));
  if (!rules.length) return geometry;
  const keep = [];
  for (const rings of geometry.coordinates) {
    const c = geoCentroid({ type: "Polygon", coordinates: rings });
    const today = presentOwnerAt(c);
    const inBox = (box) => !box || (c[0] >= box[0] && c[1] >= box[1] && c[0] <= box[2] && c[1] <= box[3]);
    const rule = rules.find((r) => (r.today ?? r.n) === today && inBox(r.box));
    if (!rule) {
      keep.push(rings);
      continue;
    }
    found.set(rule.n, [...(found.get(rule.n) ?? []), rings]);
    const w = rule.note ?? `The source draws ${rule.n} in this snapshot but leaves its name blank; the name is put back here.`;
    const props = { n: rule.n, b, w };
    if (rule.s) props.s = rule.s;
    features.push({ type: "Feature", properties: props, geometry: { type: "MultiPolygon", coordinates: [rings] } });
  }
  return keep.length ? { type: "MultiPolygon", coordinates: keep } : null;
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

// Natural Earth's land, lakes and provinces (public domain), fetched once into .cache/
const NE_RAW = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
async function ensureNaturalEarth() {
  for (const file of ["ne_50m_land.geojson", "ne_50m_lakes.geojson", "ne_10m_admin_1_states_provinces.geojson"]) {
    const dest = path.join(CACHE, file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) continue;
    console.log("  downloading", file);
    const res = await fetch(`${NE_RAW}/${file}`);
    if (!res.ok) throw new Error(`Download failed: ${file} (${res.status})`);
    fs.writeFileSync(dest, await res.text());
  }
}

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
  await ensureNaturalEarth();
  const index = await ensureSnapshots();
  const eras = [];
  const polities = new Map(); // name -> { y: [], a: [], e: [], s }
  const gridSources = []; // per era: named features, used for "Who ruled here?"

  for (const entry of index) {
    const raw = FROM_CLIOPATRIA.has(entry.year)
      ? { features: await cliopatriaBase(entry.year) }
      : FROM_NATURAL_EARTH.has(entry.year)
        ? { features: [] }
        : JSON.parse(fs.readFileSync(path.join(HB_DIR, entry.filename), "utf8"));
    const features = FROM_NATURAL_EARTH.has(entry.year) ? naturalEarthEra(entry.year) : [];
    const namedBack = new Map(); // countries in UNNAMED given their name back in this snapshot -> the pieces
    for (const f of raw.features) {
      let geometry = fixWinding(f.geometry);
      if (!geometry) continue;
      const P = f.properties || {};
      const rawName = (P.NAME || "").trim();
      const rawSubject = (P.SUBJECTO || "").trim();
      const fix = ruleFor.get(`${entry.year}|${rawName}`) || {};
      if (fix.name) usedKeys.add(`${entry.year}|${rawName}`);
      const n = fix.n || rawName;
      // a ruler that was itself renamed this year follows the new name ("Kingdom of Brazil" → "Empire of Brazil")
      const subjectFix = ruleFor.get(`${entry.year}|${rawSubject}`);
      if (subjectFix) usedKeys.add(`${entry.year}|${rawSubject}`);
      let s = "s" in fix ? fix.s || "" : subjectFix?.n || rawSubject;
      if (rawSubject === "Mongol Empire" && entry.year >= 1400) s = ""; // the united Mongol Empire was long gone
      const p = (P.PARTOF || "").trim();
      const props = { n, b: Number(P.BORDERPRECISION) || 1 };
      if (n && s && s !== n) props.s = s;
      if (n && p && p !== n && p !== s) props.p = p;
      if (fix.note) props.w = fix.note;
      if (!n) geometry = nameUnnamed(geometry, props.b, entry.year, features, namedBack);
      if (geometry) features.push({ type: "Feature", properties: props, geometry });
    }
    for (const r of UNNAMED) if (r.years.includes(entry.year) && !namedBack.has(r.n)) console.warn(`  ! ${eraLabel(entry.year)}: no unnamed shape found for ${r.n}`);
    const grouped = groupByName(features);
    const slivers = []; // thin pieces new borders cut off our shapes, left blank for the coast fill
    if (HISTOGIS[entry.year] || OHM[entry.year]) await overlayBorders(grouped, entry.year, slivers);
    if (TERRITORY[entry.year]) {
      const ids = TERRITORY[entry.year].filter((rule) => rule.ohm).map((rule) => rule.ohm);
      if (ids.length) for (const rel of await ohmRelations(path.join(CACHE, "ohm"), ids)) ohmForRules.set(rel.id, onLandOnly(rel.polys));
      applyTerritory(grouped, entry.year, slivers);
    }
    if (entry.year >= 1800) matchRulers(grouped);
    splitSvalbard(grouped, entry.year);
    if (entry.year === 1400) splitMing1400(grouped);
    for (const f of grouped) {
      f.properties.a = Math.round(km2(f.geometry));
      if (f.properties.n) f.properties.l = labelPoint(f.geometry);
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
    let topo = toTopology([...grouped, ...slivers], SIMPLIFY_HISTORICAL);
    const drawn = client
      .feature(topo, topo.objects.p)
      .features.map((f) => ({ properties: f.properties, geometry: { coordinates: f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates } }));
    // Natural Earth's countries already cover its land (and the planar check misreads parts of its Russia outline)
    const allPatches = FROM_NATURAL_EARTH.has(entry.year) ? [] : missingLand(drawn);
    const patches = [];
    const strips = []; // coastal strips left to the coast fill: still their country's land when the next islands are judged
    let joined = 0;
    for (const patch of allPatches) {
      const found = ownerForIsland(patch, [...grouped, ...strips]);
      const owner = found?.owner ?? found;
      if (owner && touchesShape(patch, drawn)) {
        patches.push({ ...patch, properties: { ...patch.properties, j: 1 } });
        strips.push({ properties: owner.properties, geometry: patch.geometry, owner });
      } else if (owner) {
        owner.geometry.coordinates.push(...patch.geometry.coordinates);
        joined++;
      } else patches.push(patch);
    }
    if (allPatches.length) topo = toTopology([...grouped, ...patches, ...slivers], SIMPLIFY_HISTORICAL);
    // the coastal strips count for the country they lie in today, as they did when they were added to it here
    gridSources.push([...grouped.filter((f) => f.properties.n), ...strips.map((s) => ({ properties: s.properties, geometry: s.geometry }))]);
    const key = eraKey(entry.year);
    const bytes = writeJson(path.join(OUT_PUBLIC, "eras", `${key}.json`), topo);
    const named = grouped.filter((f) => f.properties.n);
    const precision = Math.round(
      named.reduce((sum, f) => sum + f.properties.b, 0) / Math.max(1, named.length),
    );
    eras.push({ key, year: entry.year, label: eraLabel(entry.year), count: named.length, precision, bytes });
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
  const presentBytes = writeJson(path.join(OUT_PUBLIC, "eras", "present.json"), toTopology(present, SIMPLIFY_PRESENT));
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

  console.log("5/6 Who-ruled-here grid");
  const gridBytes = writeJson(path.join(OUT_PUBLIC, "rulers-grid.json"), buildGrid(gridSources));
  console.log(`  ${(gridBytes / 1024).toFixed(0)} KB`);

  writeJson(path.join(OUT_SRC, "eras.json"), eras);
  // version stamp: the site adds ?v=… to data URLs so browsers fetch fresh files after every rebuild
  const stamp = hashString(JSON.stringify(eras) + fs.statSync(path.join(OUT_PUBLIC, "rulers-grid.json")).size).toString(36);
  writeJson(path.join(OUT_SRC, "data-version.json"), { v: stamp });
  // every spot belongs to one shape: where the sources draw territories on top of each other, the smaller keeps the ground
  const cuts = separateEraFiles(ROOT).reduce((n, r) => n + r.cut, 0);
  console.log(`  overlaps: ${cuts} shapes cut so no outline runs through another shape`);
  // one colour per owner across every era (rewrites the era files and the version stamp)
  const { clashes } = recolorEraFiles(ROOT);
  console.log(`  colours: one per owner across all eras (${clashes} neighbouring pairs share one)`);
  // Coasts: the source's outlines often stop short of the real coastline, so strips of land between its shapes and the
  // sea came out blank. Thin strips go to the shapes beside them everywhere; in Australia, where the source's coastline
  // is coarse, wider ones too. In the snapshots that map its Aboriginal nations (1600–1815) the source's older shape for
  // the whole continent also shows through as thin slivers along the coast; those go to the nations beside them too.
  // Filled after colouring, so colours stay as they are; a shape that now borders a same-coloured neighbour gets a free one.
  const inAustralia = (c, year) => !FROM_CLIOPATRIA.has(year) && presentOwnerAt(c) === "Australia"; // the source's coarse coastline
  const leftover = (year, props) => props.n === "Australian aboriginal hunter-gatherers" && year >= 1600 && year <= 1815;
  const gaps = fillGapEraFiles(ROOT, inAustralia, leftover);
  const unfilled = gaps.filter((r) => r.inverted).map((r) => r.era);
  const recoloured = settleEraFiles(ROOT, () => true);
  console.log(
    `  coastal gaps: ${gaps.reduce((n, r) => n + r.filled, 0)} blank strips given to the shapes beside them, ${recoloured} recoloured${unfilled.length ? ` (kept blank in ${unfilled.join(", ")})` : ""}`,
  );
  // read from the finished era files, so the era pages' figures match what the map draws (see lib/era-stats.mjs)
  console.log("6/6 Era statistics");
  const stats = eraStatsFromFiles(ROOT, eras);
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
