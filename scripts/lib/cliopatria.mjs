// Cliopatria (Seshat Global History Databank; CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria):
// the world's polities from 3400 BCE to 2024, digitised from historical atlases (Bennett et al., Scientific Data 2025).
// Used as the base of the maps from 1800 to 1960. Downloads one release once, unzips it and caches the polities valid
// in each year asked for in `.cache/cliopatria/`. Used by build-data.mjs.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const VERSION = "v0.2.1";
const ZIP_URL = `https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/${VERSION}/cliopatria.geojson.zip`;

/** The first file in a zip archive (stored or deflated), read through the archive's central directory. */
function unzipFirst(buf) {
  let end = buf.length - 22;
  while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("Cliopatria: not a zip file");
  const entry = buf.readUInt32LE(end + 16); // the first central directory entry
  if (buf.readUInt32LE(entry) !== 0x02014b50) throw new Error("Cliopatria: bad zip directory");
  const method = buf.readUInt16LE(entry + 10);
  const size = buf.readUInt32LE(entry + 20);
  const local = buf.readUInt32LE(entry + 42);
  const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
  const data = buf.subarray(start, start + size);
  if (method === 0) return data;
  if (method === 8) return zlib.inflateRawSync(data);
  throw new Error(`Cliopatria: unsupported zip method ${method}`);
}

/**
 * The polities valid in `year`, as GeoJSON features with Cliopatria's properties: Name, FromYear, ToYear, Area,
 * MemberOf (the empire it belongs to, in parentheses, if any). An empire's own row, the union of its parts ("(British
 * Empire)", listing them as Components), is left out: its parts are there. Cached per year.
 */
export async function cliopatriaPolities(cacheDir, year) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `polities-${VERSION}-${year}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const zipFile = path.join(cacheDir, `cliopatria-${VERSION}.geojson.zip`);
  if (!fs.existsSync(zipFile)) {
    const res = await fetch(ZIP_URL);
    if (!res.ok) throw new Error(`Download failed: Cliopatria ${VERSION} (${res.status})`);
    fs.writeFileSync(zipFile, Buffer.from(await res.arrayBuffer()));
  }
  const rows = JSON.parse(unzipFirst(fs.readFileSync(zipFile)).toString("utf8")).features;
  const valid = rows.filter((f) => f.properties.Type === "POLITY" && !f.properties.Components && f.properties.FromYear <= year && f.properties.ToYear >= year);
  fs.writeFileSync(file, JSON.stringify(valid));
  return valid;
}
