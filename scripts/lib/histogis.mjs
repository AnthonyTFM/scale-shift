// HistoGIS (ACDH-CH, Austrian Academy of Sciences; CC BY 4.0, https://histogis.acdh.oeaw.ac.at/): the national borders
// of Europe from 1815 to 1919, drawn from maps of the time and dated to the day. Fetches the states valid on a given day
// from its API once and caches them in `.cache/histogis/`. Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";

const API = "https://histogis.acdh.oeaw.ac.at/api";
// the sets that hold national borders: Europe's states, and the German Empire, which HistoGIS keeps in sets of its own
const NATIONAL = /^(Europe Stateborders|German Empire Stateborders)/;

async function getJson(url) {
  for (let tries = 1; ; tries++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (tries >= 4) throw new Error(`${url}: ${res.status}`);
    } catch (err) {
      if (tries >= 4) throw err;
    }
    await new Promise((r) => setTimeout(r, 1500 * tries));
  }
}

/** Every HistoGIS record (name, dates, source set; no geometry), cached. */
async function records(cacheDir) {
  const file = path.join(cacheDir, "records.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const all = [];
  for (let url = `${API}/tempspatial-simple/?format=json&limit=500`; url; ) {
    const page = await getJson(url);
    all.push(...page.results);
    url = page.next;
  }
  fs.writeFileSync(file, JSON.stringify(all));
  return all;
}

/**
 * The states whose borders were valid on `day` (YYYY-MM-DD), as GeoJSON features with HistoGIS's name, English name,
 * kind of state and dates. Cached per day.
 */
export async function histogisStates(cacheDir, day) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `states-${day}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const valid = (await records(cacheDir)).filter((r) => NATIONAL.test(r.source_name) && r.start_date <= day && (!r.end_date || r.end_date >= day));
  const features = [];
  for (const r of valid) {
    const f = await getJson(`${API}/tempspatial/${r.id}/?format=json`);
    features.push({
      type: "Feature",
      properties: { id: r.id, title: r.title, en: r.alt_name || r.title, kind: r.adm_name, from: r.start_date, to: r.end_date, set: r.source_name },
      geometry: f.geometry,
    });
  }
  fs.writeFileSync(file, JSON.stringify(features));
  return features;
}
