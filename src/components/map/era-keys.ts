/** Same key scheme as scripts/build-data.mjs: -2000 → "2000bce", 1914 → "1914", "present" → "present". */
export const eraKeyOfYear = (y: number | "present") => (y === "present" ? "present" : y < 0 ? `${-y}bce` : `${y}`);
