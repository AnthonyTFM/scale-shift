// Server-only: the brand fonts for the social preview images, read from public/fonts (no network needed), like og-map reads public/data.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "public", "fonts");
const read = (file: string) => fs.readFileSync(path.join(dir, file));

export function ogFonts() {
  return [
    { name: "Bricolage Grotesque", data: read("bricolage-grotesque-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
    { name: "Inter", data: read("inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: read("inter-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
  ];
}
