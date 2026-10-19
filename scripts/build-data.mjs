#!/usr/bin/env node
/**
 * Builds the map data Scale Shift ships in /public/data.
 *
 * Inputs (not committed, see README "Rebuilding the map data"):
 *   data-src/historical-basemaps/geojson/world_*.geojson   (GPL-3.0, A. Ourednik et al.)
 *   data-src/ne/ne_50m_admin_0_countries.geojson           (Natural Earth, public domain)
 *   data-src/ne/ne_50m_admin_1_states_provinces.geojson    (Natural Earth, public domain)
 *
 * Outputs:
 *   public/data/index.json        search index + area history for every entity
 *   public/data/years/<year>.json one TopoJSON per snapshot (simplified)
 *
 * Run: npm run data
 */
import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { merge, quantize } from "topojson-client";

const ROOT = process.cwd();
const HIST = path.join(ROOT, "data-src/historical-basemaps/geojson");
const NE = path.join(ROOT, "data-src/ne");
const OUT = path.join(ROOT, "public/data");
const EARTH_R_KM = 6371.0088;
const TODAY = 2026;

// Snapshots from 1 BC forward. -1 means 1 BC (there is no year 0).
const HIST_YEARS = [
  -1, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530,
  1600, 1650, 1700, 1715, 1783, 1800, 1815, 1878, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994,
  2000, 2010,
];
const YEARS = [...HIST_YEARS, TODAY];

// Same polity spelled differently across source files.
const NAME_ALIASES = {
  "United States of America": "United States",
  USA: "United States",
  "United Kingdom of Great Britain and Ireland": "United Kingdom",
  UK: "United Kingdom",
  "Eastern Roman Empire": "Byzantine Empire",
  Ainus: "Ainu",
  Saami: "Sámi",
  Māori: "Maori",
  Athabascan: "Athabaskan",
  Byelarus: "Belarus",
  "Gambia, The": "Gambia",
  "Tanzania, United Republic of": "Tanzania",
  "Korea, Republic of": "South Korea",
  "Korea, Democratic People's Republic of": "North Korea",
  Burma: "Myanmar",
  Zaire: "Democratic Republic of the Congo",
  Swaziland: "Eswatini",
  "Ivory Coast": "Côte d'Ivoire",
  "Manchu Empire": "Qing Empire",
  "Ming Chinese Empire": "Ming Empire",
  "Austria-Hungary": "Austro-Hungarian Empire",
  "Kievan Rus": "Kyivan Rus",
};
// Natural Earth (today) names mapped onto the historical spelling so timelines connect.
const NE_ALIASES = {
  "United States of America": "United States",
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Central African Rep.": "Central African Republic",
  "Dominican Rep.": "Dominican Republic",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan",
  "Solomon Is.": "Solomon Islands",
  "Czechia": "Czech Republic",
  "eSwatini": "Eswatini",
  "W. Sahara": "Western Sahara",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Antigua and Barb.": "Antigua and Barbuda",
  "St. Kitts and Nevis": "Saint Kitts and Nevis",
  "St. Vin. and Gren.": "Saint Vincent and the Grenadines",
  "Saint Lucia": "Saint Lucia",
  "Turks and Caicos Is.": "Turks and Caicos Islands",
  "U.S. Virgin Is.": "United States Virgin Islands",
  "Wallis and Futuna Is.": "Wallis and Futuna Islands",
  "Timor-Leste": "East Timor",
  "Macedonia": "North Macedonia",
};
// SUBJECTO values that belong to one realm ("X plus everything it claimed").
const REALM_ALIASES = {
  UK: "United Kingdom",
  "United Kingdom of Great Britain and Ireland": "United Kingdom",
  "British East India Company": "United Kingdom",
  USA: "United States",
  "Eastern Roman Empire": "Byzantine Empire",
  "Manchu Empire": "Qing Empire",
};

// Mercator cannot draw a shape that contains a pole, so Antarctica is left out (see About page).
const EXCLUDE = new Set(["antarctica"]);

const clean = (s) => (s ?? "").toString().trim().replace(/\s+/g, " ");
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Alias lookups ignore spacing, case, accents and hyphens ("Austria Hungary" == "Austria-Hungary").
const bySlug = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [slug(k), v]));
const NAME_ALIAS = bySlug(NAME_ALIASES);
const REALM_ALIAS = bySlug(REALM_ALIASES);
const NE_ALIAS = bySlug(NE_ALIASES);
const alias = (map, name) => map[slug(name)] ?? name;

function rewindPolygon(rings) {
  const area = geoArea({ type: "Polygon", coordinates: rings });
  return area > 2 * Math.PI ? rings.map((r) => r.slice().reverse()) : rings;
}
function polygonsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return [rewindPolygon(geom.coordinates)];
  if (geom.type === "MultiPolygon") return geom.coordinates.map(rewindPolygon);
  if (geom.type === "GeometryCollection") return geom.geometries.flatMap(polygonsOf);
  return [];
}
const areaKm2 = (polys) =>
  Math.round(polys.reduce((s, p) => s + geoArea({ type: "Polygon", coordinates: p }), 0) * EARTH_R_KM ** 2);

// entity registry: id -> {n, k, y: [], a: [], q: [] , p?}
const entities = new Map();
function record(id, name, kind, year, area, precision, extra = {}) {
  let e = entities.get(id);
  if (!e) {
    e = { i: id, n: name, k: kind, y: [], a: [], q: [] };
    entities.set(id, e);
  }
  e.y.push(year);
  e.a.push(area);
  e.q.push(precision);
  Object.assign(e, extra);
}

// Drop specks (tiny islets, slivers) from the drawn shapes. Areas are computed before this runs,
// so stats stay exact; only the drawing gets lighter. The largest piece of every entity is always kept.
function prune(polys, minKm2) {
  const minSr = minKm2 / EARTH_R_KM ** 2;
  const sized = polys.map((p) => [p, geoArea({ type: "Polygon", coordinates: p })]);
  const largest = Math.max(...sized.map((s) => s[1]));
  return sized
    .filter(([, a]) => a >= minSr || a === largest)
    .map(([p]) => [p[0], ...p.slice(1).filter((hole) => geoArea({ type: "Polygon", coordinates: [hole.slice().reverse()] }) >= minSr)]);
}

function writeTopo(year, groups) {
  // groups: { t: Map(id -> polys), r: Map(id -> polys), ... }
  const objects = {};
  for (const [key, map] of Object.entries(groups)) {
    objects[key] = {
      type: "FeatureCollection",
      features: [...map.entries()].map(([id, polys]) => ({
        type: "Feature",
        id,
        properties: {},
        geometry: { type: "MultiPolygon", coordinates: prune(polys, year === TODAY ? 60 : 250) },
      })),
    };
  }
  let topo = topology(objects, 5e4);
  topo = presimplify(topo);
  // Keep a fixed point budget per snapshot so every file stays small enough for phones.
  const total = topo.arcs.reduce((s, a) => s + a.length, 0);
  const budget = year === TODAY ? 70000 : 32000;
  const keep = Math.min(1, budget / total);
  if (process.env.DEBUG) console.log("  points", total, "keep", keep.toFixed(3), "arcs", topo.arcs.length);
  topo = simplify(topo, keep >= 1 ? 0 : quantile(topo, 1 - keep));
  topo = quantize(topo, 5e4);
  // strip empty properties to save bytes
  for (const obj of Object.values(topo.objects)) {
    for (const g of obj.geometries) delete g.properties;
  }
  fs.writeFileSync(path.join(OUT, "years", `${year}.json`), JSON.stringify(topo));
  return fs.statSync(path.join(OUT, "years", `${year}.json`)).size;
}

fs.mkdirSync(path.join(OUT, "years"), { recursive: true });

// ---------- historical snapshots ----------
for (const year of HIST_YEARS) {
  const file = path.join(HIST, `world_${year < 0 ? "bc" + -year : year}.geojson`);
  const gj = JSON.parse(fs.readFileSync(file, "utf8"));
  const territories = new Map(); // id -> {name, polys, prec}
  const realms = new Map(); // id -> {name, polys, members:Set}
  for (const f of gj.features) {
    let name = clean(f.properties?.NAME);
    if (!name) continue;
    name = alias(NAME_ALIAS, name);
    const polys = polygonsOf(f.geometry);
    if (!polys.length) continue;
    const id = slug(name);
    if (!id || EXCLUDE.has(id)) continue;
    const prec = Number(f.properties?.BORDERPRECISION) || 1;
    const t = territories.get(id) ?? { name, polys: [], prec: 3 };
    t.polys.push(...polys);
    t.prec = Math.min(t.prec, prec);
    territories.set(id, t);

    let sub = clean(f.properties?.SUBJECTO);
    if (sub && /[a-z]/i.test(sub)) {
      sub = REALM_ALIAS[slug(sub)] ?? alias(NAME_ALIAS, sub);
      const rid = `${slug(sub)}-claims`;
      const r = realms.get(rid) ?? { name: `${sub} (all claims)`, polys: [], members: new Set(), prec: 3 };
      r.polys.push(...polys);
      r.members.add(id);
      r.prec = Math.min(r.prec, prec);
      realms.set(rid, r);
    }
  }
  const tMap = new Map();
  for (const [id, t] of territories) {
    tMap.set(id, t.polys);
    record(id, t.name, "t", year, areaKm2(t.polys), t.prec);
  }
  const rMap = new Map();
  for (const [rid, r] of realms) {
    if (r.members.size < 2) continue; // a realm only adds something when it spans several territories
    rMap.set(rid, r.polys);
    record(rid, r.name, "r", year, areaKm2(r.polys), r.prec);
  }
  const size = writeTopo(year, { t: tMap, r: rMap });
  console.log(`${year}: ${tMap.size} territories, ${rMap.size} realms, ${(size / 1024).toFixed(0)} KB`);
}

// ---------- today (Natural Earth) ----------
{
  const a0 = JSON.parse(fs.readFileSync(path.join(NE, "ne_50m_admin_0_countries.geojson"), "utf8"));
  const a1 = JSON.parse(fs.readFileSync(path.join(NE, "ne_50m_admin_1_states_provinces.geojson"), "utf8"));
  const countries = new Map();
  const byContinent = new Map();
  for (const f of a0.features) {
    const p = f.properties;
    const raw = clean(p.NAME);
    const name = NE_ALIAS[slug(raw)] ?? alias(NAME_ALIAS, raw);
    const id = slug(name);
    if (EXCLUDE.has(id)) continue;
    const polys = polygonsOf(f.geometry);
    if (!polys.length) continue;
    countries.set(id, polys);
    record(id, name, "t", TODAY, areaKm2(polys), 3, {
      p: Number(p.POP_EST) || undefined,
      py: Number(p.POP_YEAR) || undefined,
      iso: p.ISO_A3 && p.ISO_A3 !== "-99" ? p.ISO_A3 : p.ADM0_A3,
      ...(raw !== name ? { al: [raw] } : {}),
    });
    const cont = clean(p.CONTINENT);
    if (cont && cont !== "Seven seas (open ocean)" && !EXCLUDE.has(slug(cont))) {
      if (!byContinent.has(cont)) byContinent.set(cont, []);
      byContinent.get(cont).push(id);
    }
  }
  const states = new Map();
  for (const f of a1.features) {
    const p = f.properties;
    const name = clean(p.name);
    if (!name) continue;
    const country = alias(NE_ALIAS, clean(p.admin));
    const id = `${slug(name)}-${slug(p.iso_a2 || country)}`;
    const polys = polygonsOf(f.geometry);
    if (!polys.length) continue;
    states.set(id, polys);
    record(id, `${name}, ${country}`, "s", TODAY, areaKm2(polys), 3, { st: clean(p.type_en) || "Region" });
  }
  // Continents: union of member countries via a topology merge.
  const tmpTopo = topology(
    {
      c: {
        type: "FeatureCollection",
        features: [...countries.entries()].map(([id, polys]) => ({
          type: "Feature",
          id,
          properties: {},
          geometry: { type: "MultiPolygon", coordinates: polys },
        })),
      },
    },
    1e6,
  );
  const continents = new Map();
  for (const [cont, ids] of byContinent) {
    const set = new Set(ids);
    const merged = merge(tmpTopo, tmpTopo.objects.c.geometries.filter((g) => set.has(g.id)));
    const polys = merged.coordinates.map(rewindPolygon);
    const id = `continent-${slug(cont)}`;
    continents.set(id, polys);
    record(id, cont, "k", TODAY, areaKm2(polys), 3);
  }
  const size = writeTopo(TODAY, { t: countries, s: states, k: continents });
  console.log(`today: ${countries.size} countries, ${states.size} states, ${continents.size} continents, ${(size / 1024).toFixed(0)} KB`);
}

// ---------- index ----------
const yearIndex = new Map(YEARS.map((y, i) => [y, i]));
const list = [...entities.values()].map((e) => {
  const out = {
    i: e.i,
    n: e.n,
    k: e.k,
    y: e.y.map((y) => yearIndex.get(y)),
    a: e.a,
    q: Math.round(e.q.reduce((s, v) => s + v, 0) / e.q.length),
  };
  for (const key of ["p", "py", "iso", "st", "al"]) if (e[key] !== undefined) out[key] = e[key];
  return out;
});
list.sort((a, b) => Math.max(...b.a) - Math.max(...a.a));
const index = {
  v: 1,
  years: YEARS,
  today: TODAY,
  entities: list,
};
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));
// The app shell renders the timeline before the index arrives, so it needs the year list at build time.
fs.writeFileSync(
  path.join(ROOT, "lib", "years.generated.ts"),
  `// Generated by scripts/build-data.mjs. Do not edit by hand.\nexport const YEARS: number[] = ${JSON.stringify(YEARS)};\n`,
);
console.log(`index: ${list.length} entities, ${(fs.statSync(path.join(OUT, "index.json")).size / 1024).toFixed(0)} KB`);
