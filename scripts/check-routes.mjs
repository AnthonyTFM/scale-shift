// Every API route that reads the signed-in player (Clerk's auth(), via src/lib/account.ts) must be listed in the
// matcher in src/proxy.ts, or Clerk throws and the route fails for signed-in players (endless posts did, until Oct 26).
// Run by `npm run check:data`, so CI catches a new route that was left out.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const api = path.join(root, "src/app/api");
const proxy = readFileSync(path.join(root, "src/proxy.ts"), "utf8");
const matchers = [...(proxy.match(/matcher:\s*\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
// "/api/x/:path*" covers /api/x and everything under it; anything else must match exactly
const covered = (route) => matchers.some((m) => (m.endsWith("/:path*") ? route === m.slice(0, -7) || route.startsWith(`${m.slice(0, -7)}/`) : route === m));

// a file reads the signed-in player if it uses Clerk's server helpers, or imports a file of ours that does (followed
// through src/lib, any quoting, relative or "@/" imports)
const src = path.join(root, "src");
const CLERK = /from\s+["']@clerk\/nextjs\/server["']/;
const seen = new Map();
function readsPlayer(file) {
  if (seen.has(file)) return seen.get(file);
  seen.set(file, false);
  const text = readFileSync(file, "utf8");
  let hit = CLERK.test(text) && /\b(auth|currentUser)\b/.test(text);
  for (const [, spec] of hit ? [] : text.matchAll(/from\s+["']((?:@\/|\.)[^"']+)["']/g)) {
    const base = spec.startsWith("@/") ? path.join(src, spec.slice(2)) : path.resolve(path.dirname(file), spec);
    const found = [".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find((f) => {
      try {
        return statSync(f).isFile();
      } catch {
        return false;
      }
    });
    if (found && found.startsWith(src) && !found.includes(`${path.sep}components${path.sep}`) && readsPlayer(found)) {
      hit = true;
      break;
    }
  }
  seen.set(file, hit);
  return hit;
}

const routes = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/^route\.tsx?$/.test(name)) routes.push(p);
  }
};
walk(api);

const missing = routes
  .filter((file) => readsPlayer(file))
  .map((file) => `/api/${path.relative(api, path.dirname(file)).split(path.sep).join("/")}`)
  .filter((route) => !covered(route));

if (missing.length) {
  console.error(`These API routes read the signed-in player but aren't in the matcher in src/proxy.ts: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`${routes.length} API routes checked: every one that reads the signed-in player runs Clerk`);
