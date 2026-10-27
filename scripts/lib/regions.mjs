// Regions of six big countries for the daily puzzle pool (and endless mode): Canadian provinces and territories,
// Australian, Mexican, Brazilian and Indian states, and Chinese provinces. From Natural Earth's admin-1 map
// (public domain), downloaded once into .cache/regions.
//
// Left out: regions under 5,000 km² (the same floor as countries and US states: they'd be specks on the tiles), and
// regions whose borders are in active dispute (Jammu and Kashmir, Ladakh, Arunachal Pradesh, the Paracel Islands).
// Borders are as each country controls them on the ground, like the present-day map.

import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";

const URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson";

// country code → how a region is described under its name, by Natural Earth's region type
const COUNTRIES = {
  CAN: { Province: "Canadian province", Territory: "Canadian territory" },
  AUS: { State: "Australian state", Territory: "Australian territory" },
  MEX: { State: "Mexican state" },
  BRA: { State: "Brazilian state", "Federal District": "Brazil's federal district" },
  IND: { State: "Indian state", "Union Territory": "Indian union territory" },
  CHN: { Province: "Chinese province", "Autonomous Region": "Chinese autonomous region", Municipality: "Chinese city-province" },
};
const DISPUTED = new Set(["Jammu and Kashmir", "Ladakh", "Arunachal Pradesh", "Paracel Islands"]);
// rows Natural Earth labels wrongly (or not at all)
const TYPE_FIX = { Gujarat: "State", "Himachal Pradesh": "State" };
// names that would read wrong in the game
const RENAME = { "Federal District": "Federal District (Brasília)", Federal: "Federal District (Brasília)", Mexico: "State of Mexico" };
const R = 6371;

/** d3 wants each ring clockwise on the sphere; GeoJSON files often have them the other way, which d3 reads as "the rest of the world". */
function rewind(geom) {
  const fix = (rings) => (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings);
  if (geom.type === "Polygon") return { type: "Polygon", coordinates: fix(geom.coordinates) };
  return { type: "MultiPolygon", coordinates: geom.coordinates.map(fix) };
}

/** The regions to add: name, label (e.g. "Canadian province"), country code and outline. */
export async function loadRegions(root) {
  const file = path.join(root, ".cache", "regions", "admin1.geojson");
  if (!fs.existsSync(file)) {
    console.log("  regions: downloading Natural Earth admin-1 (40 MB, once)");
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`regions: download failed (${res.status})`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const out = [];
  for (const f of JSON.parse(fs.readFileSync(file, "utf8")).features) {
    const p = f.properties;
    const labels = COUNTRIES[p.adm0_a3];
    const name = p.name_en || p.name;
    if (!labels || !name || !f.geometry || DISPUTED.has(name)) continue;
    // Mexico City is a federal entity (and under the floor anyway); unnamed rows are slivers
    const sub = labels[TYPE_FIX[name] ?? p.type_en] ?? (p.adm0_a3 === "MEX" && name !== "Mexico City" ? labels.State : null);
    if (!sub) continue;
    const geometry = rewind(f.geometry);
    if (geoArea(geometry) * R * R < 5000) continue;
    out.push({ n: RENAME[name] ?? name, sub, cc: p.adm0_a3, geometry });
  }
  return out;
}
