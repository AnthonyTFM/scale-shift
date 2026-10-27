// The cache stamp for the daily puzzle files (public/data/daily): a new pool (daily-version, from build-daily) or new map
// data (data-version) means fresh files, not cached ones. Every fetch of those files uses it, and next.config.ts builds
// the same string for its preload headers, so the preloaded file is the one the page asks for.
import dataVersion from "@/data/data-version.json";
import dailyVersion from "@/data/daily-version.json";

export const POOL_V = `?v=${dataVersion.v}.${dailyVersion.v}`;
