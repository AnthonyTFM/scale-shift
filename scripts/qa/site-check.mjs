// Read-only health check of a deployed site: every sitemap page on desktop + phone, internal links, key APIs, and
// how soon a fresh visitor sees countries on the homepage globe. Usage: node site-check.mjs [base-url]
// Quick check after a merge (about 2 minutes): node site-check.mjs [base-url] --quick [/changed-page …] checks the
// homepage, the map, both games, the leaderboard and any pages named, instead of every page in the sitemap.
// Needs Chromium: set CHROME to its path (defaults to the cloud sandbox one). Exits 1 when it finds issues.
import { chromium, request } from "playwright-core";
const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
// go through this environment's proxy like the browser does
const api = await request.newContext({ proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined, ignoreHTTPSErrors: false });
const fetch = async (url, opts = {}, tries = 4) => {
  let r;
  try {
    r = await api.fetch(url, { method: opts.method || "GET", headers: opts.headers, data: opts.body, maxRedirects: opts.redirect === "manual" ? 0 : 20 });
  } catch (e) {
    // the sandbox proxy drops a connection now and then; that's not the site
    if (tries > 1) { await new Promise((ok) => setTimeout(ok, 1500)); return fetch(url, opts, tries - 1); }
    throw e;
  }
  return { ok: r.ok(), status: r.status(), headers: { get: (k) => r.headers()[k.toLowerCase()] ?? null }, text: () => r.text() };
};
const args = process.argv.slice(2);
const QUICK = args.includes("--quick");
const BASE = (args.find((a) => /^https?:/.test(a)) || "https://scale-shift.vercel.app").replace(/\/$/, "");
const named = args.filter((a) => a.startsWith("/"));
const issues = [];
const note = (s) => issues.push(s);
const sm = await (await fetch(BASE + "/sitemap.xml")).text();
let pages = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
pages = QUICK ? [...new Set(["/", "/map", "/daily", "/endless", "/leaderboard", ...named])] : [...new Set(["/", "/map", ...pages])];
console.log(QUICK ? `quick check: ${pages.join(" ")}` : `${pages.length} pages in sitemap`);
const browser = await chromium.launch({ executablePath: CHROME });
const links = new Set();
let checked = 0;
for (const [w, h, tag] of [[1280, 900, "desktop"], [375, 812, "phone"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  let cur = "";
  page.on("pageerror", (e) => note(`${tag} ${cur} JS error: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && note(`${tag} ${cur} console: ${m.text().slice(0, 160)}`));
  page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400) note(`${tag} ${cur} ${r.status()} ${u.replace(BASE, "")}`); });
  for (const p of pages) {
    cur = p;
    // one retry: a slow page can still be loading when the next navigation starts
    const go = () => page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 });
    const res = await go()
      .catch(() => page.waitForTimeout(2000).then(go))
      .catch((e) => { note(`${tag} ${p} failed to load: ${e.message.split("\n")[0]}`); return null; });
    if (!res) continue;
    if (res.status() !== 200) note(`${tag} ${p} status ${res.status()}`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (over > 0) note(`${tag} ${p} sideways scroll ${over}px`);
    const h1 = await page.locator("h1").count();
    if (p !== "/map" && h1 !== 1) note(`${tag} ${p} has ${h1} <h1>`);
    const imgs = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));
    for (const s of imgs) note(`${tag} ${p} broken image ${s}`);
    if (tag === "desktop") for (const href of await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")))) if (href.startsWith("/") && !href.startsWith("//")) links.add(href.split("#")[0] || "/");
    checked++;
  }
  await ctx.close();
}
// every internal link resolves
let linkCount = 0;
for (const l of links) {
  const r = await fetch(BASE + l, { redirect: "follow" });
  linkCount++;
  if (r.status >= 400) note(`link ${l} → ${r.status}`);
}
// APIs (read-only)
const today = new Date().toISOString().slice(0, 10);
const lb = await fetch(`${BASE}/api/leaderboard?scope=day&date=${today}`);
if (!lb.ok) note(`leaderboard API ${lb.status}`);
const store = lb.headers.get("x-leaderboard-store");
const body = await lb.text();
if (body.includes("@")) note("leaderboard API exposes an email");
const bad = await fetch(`${BASE}/api/leaderboard?scope=day&date=nope`);
if (bad.status !== 400) note(`bad date not rejected (${bad.status})`);
const remind = await fetch(`${BASE}/api/leaderboard/reminders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", on: true }) });
if (remind.status !== 401 && remind.status !== 422) note(`reminders without sign-up not refused (${remind.status})`);
const unsub = await fetch(`${BASE}/api/leaderboard/unsubscribe?p=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&t=forged`, { redirect: "manual" });
if (!(unsub.headers.get("location") || "").endsWith("/unsubscribed/error")) note("forged unsubscribe link not refused");
for (const f of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/data/eras/present.json", "/data/daily/index.json", "/data/LICENSE.txt"]) {
  const r = await fetch(BASE + f);
  if (!r.ok) note(`${f} → ${r.status}`);
}

// homepage globe: a fresh visitor must see countries quickly, even on a slow phone
const globeRuns = [["fast", null, 1, 3000], ["slow 4G + slow CPU", { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, 4, 6000]];
for (const [label, net, cpu, limit] of QUICK ? globeRuns.slice(0, 1) : globeRuns) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (net) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...net });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  const t0 = Date.now();
  await p.goto(BASE + "/", { waitUntil: "commit" });
  let seen = null;
  for (let i = 0; i < 150 && seen === null; i++) {
    // the still picture has loaded, or the live canvas shows country colours
    const ok = await p
      .evaluate(() => {
        if (document.querySelector('img[src="/globe-still.svg"]')?.complete) return true;
        const c = document.querySelector('canvas[role="img"]');
        if (!c?.width) return false;
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let k = 0; k < d.length; k += 4 * 40) if (d[k + 3] > 200 && d[k] > 140 && d[k + 2] < 230 && !(d[k] > 230 && d[k + 1] > 230)) n++;
        return n > 30;
      })
      .catch(() => false);
    if (ok) seen = Date.now() - t0;
    else await p.waitForTimeout(100);
  }
  if (seen === null || seen > limit) note(`globe (${label}): countries ${seen === null ? "never shown" : `took ${seen} ms`}`);
  else console.log(`globe (${label}): countries in ${seen} ms`);
  await ctx.close();
}

console.log(`checked ${checked} page views, ${linkCount} internal links, leaderboard store: ${store}`);
console.log(issues.length ? `ISSUES (${issues.length}):\n- ` + [...new Set(issues)].join("\n- ") : "ISSUES: none");
await browser.close();
process.exit(issues.length ? 1 : 0);
