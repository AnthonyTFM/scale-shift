// Regions of six big countries for the daily puzzle pool (and endless mode): Canadian provinces and territories,
// Australian, Mexican, Brazilian and Indian states, and Chinese provinces. From Natural Earth's admin-1 map
// (public domain), downloaded once into .cache/regions.
//
// Borders are drawn as each country runs them on the ground, like the present-day map, with one rule for every side of a
// dispute: Jammu and Kashmir, Ladakh, Arunachal Pradesh, Xinjiang and Tibet are all in, and their notes
// (src/content/region-context.ts) say who else claims them. Left out: regions under 5,000 km² (the same floor as countries
// and US states: they'd be specks on the tiles), and two whose outlines are well off their official areas (Ningxia by
// about a fifth, the Andaman and Nicobar Islands by about an eighth, as most of their small islands are missing).

import fs from "node:fs";
import path from "node:path";
import { geoArea } from "d3-geo";

const URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson";

// country code → how a region is described under its name, by Natural Earth's region type
const COUNTRIES = {
  CAN: { Province: "Canadian province", Territory: "Canadian territory" },
  AUS: { State: "Australian state", Territory: "Australian territory" },
  MEX: { State: "Mexican state" },
  BRA: { State: "Brazilian state", "Federal District": "Brazil's capital district" },
  IND: { State: "Indian state", "Union Territory": "Indian union territory" },
  CHN: { Province: "Chinese province", "Autonomous Region": "Chinese autonomous region", Municipality: "Chinese city-province" },
};
// left out, by ISO 3166-2 code: outlines well off the official area, Mexico City (a federal entity, not a state), and
// specks that aren't regions of their own (Jervis Bay, Macquarie Island, the Paracel Islands)
const SKIP = new Set(["CN-NX", "IN-AN", "MX-DIF", "AU-X02~", "AU-X03~", "CN-X01~"]);
// rows Natural Earth labels wrongly (or not at all); Lord Howe Island is part of New South Wales, not a territory
const TYPE_FIX = { Gujarat: "State", "Himachal Pradesh": "State" };
const SKIP_NAMES = new Set(["Lord Howe Island"]);
// names that would read wrong in the game, by ISO code (Natural Earth calls Brazil's capital district "Federal")
const RENAME = { "BR-DF": "Federal District" };
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
    if (!labels || !name || !f.geometry || SKIP.has(p.iso_3166_2) || SKIP_NAMES.has(name)) continue;
    // a Mexican row without a type is a state; unnamed rows are slivers
    const sub = labels[TYPE_FIX[name] ?? p.type_en] ?? (p.adm0_a3 === "MEX" ? labels.State : null);
    if (!sub) continue;
    const geometry = rewind(f.geometry);
    if (geoArea(geometry) * R * R < 5000) continue;
    out.push({ n: RENAME[p.iso_3166_2] ?? name, sub, cc: p.adm0_a3, geometry });
  }
  return out;
}
