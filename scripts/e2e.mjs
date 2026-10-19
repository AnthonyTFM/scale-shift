#!/usr/bin/env node
/**
 * End-to-end check of every page and interaction in a real browser.
 * 1) npm run build && npm run start   (in one terminal)
 * 2) npx playwright install chromium  (first time only)
 * 3) npm run test:e2e                 (in another terminal)
 * Set BASE_URL to test another address. Screenshots land in ./e2e-shots.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = path.join(process.cwd(), "e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (name, pass, note = "") => {
  results.push({ name, pass, note });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${note ? `  (${note})` : ""}`);
};
async function check(name, fn) {
  try {
    const note = await fn();
    record(name, true, typeof note === "string" ? note : "");
  } catch (e) {
    record(name, false, String(e?.message ?? e).split("\n")[0].slice(0, 200));
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  }
}

const browser = await launch();

async function newPage(viewport = { width: 1280, height: 800 }, opts = {}) {
  const context = await browser.newContext({ viewport, ...opts });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return { context, page, errors };
}

const overlayCount = (page) => page.locator("[data-overlay]").count();
async function waitOverlays(page, n) {
  await page.waitForFunction((k) => document.querySelectorAll("[data-overlay]").length === k, n, { timeout: 15000 });
}
async function bboxArea(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  return b ? b.width * b.height : 0;
}

// ---------- 1. every route renders without console errors ----------
const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
const routes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
await check(`sitemap lists routes (${routes.length})`, async () => {
  assert(routes.length > 20, "too few routes");
});
{
  const { page, errors, context } = await newPage();
  const failed = [];
  for (const r of routes) {
    errors.length = 0;
    const res = await page.goto(BASE + r, { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) failed.push(`${r} -> ${res?.status()}`);
    else if (errors.length) failed.push(`${r}: ${errors[0].slice(0, 120)}`);
  }
  record("every sitemap route returns 200 with no console errors", failed.length === 0, failed.slice(0, 3).join(" | "));
  for (const r of ["/robots.txt", "/opengraph-image", "/compare/greenland-vs-africa/opengraph-image", "/icon.svg"]) {
    const res = await page.request.get(BASE + r);
    record(`asset ${r}`, res.status() === 200, String(res.status()));
  }
  const nf = await page.goto(BASE + "/no-such-page");
  record("unknown URL shows 404 page", nf?.status() === 404 && (await page.getByText("isn't on any map").count()) > 0);
  await context.close();
}

// ---------- 2. home map flow ----------
{
  const { page, errors, context } = await newPage({ width: 1280, height: 800 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });

  await check("default view draws Greenland and Rome", async () => {
    await waitOverlays(page, 2);
    assert((await page.getByRole("button", { name: /Greenland/ }).count()) > 0, "no Greenland");
  });

  await check("first-visit guide walks through 3 steps", async () => {
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    await dlg.getByRole("button", { name: "Next" }).click();
    await dlg.getByRole("button", { name: "Next" }).click();
    await dlg.getByRole("button", { name: "Start exploring" }).click();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    assert((await page.getByRole("dialog").count()) === 0, "guide shown again after finishing");
  });

  await page.screenshot({ path: path.join(SHOTS, "home-1280.png") });

  await check("search adds a historical empire", async () => {
    const before = await overlayCount(page);
    const box = page.getByRole("combobox", { name: "Add a place to the map" });
    await box.fill("mongol empire");
    await page.getByRole("option").first().waitFor();
    const first = await page.getByRole("option").first().innerText();
    await box.press("Enter");
    await waitOverlays(page, before + 1);
    return first.split("\n")[0];
  });

  await check("search with no match explains what to try", async () => {
    await page.getByRole("combobox", { name: "Add a place to the map" }).fill("zzqx");
    await page.getByText("No match").waitFor({ timeout: 3000 });
    await page.getByRole("combobox", { name: "Add a place to the map" }).fill("");
  });

  await check("dragging north makes the shape larger on screen (true-size effect)", async () => {
    const sel = '[data-overlay][aria-label^="Greenland"]';
    const shape = page.locator(sel).first();
    const b = await shape.boundingBox();
    const a0 = b.width * b.height;
    // grab near the centre of the drawn shape
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 60, { steps: 6 });
    await page.mouse.move(cx, cy - 150, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const a1 = await bboxArea(page, sel);
    assert(a1 > a0 * 1.15, `area went from ${a0.toFixed(0)} to ${a1.toFixed(0)}`);
    return `${(a1 / a0).toFixed(2)}x larger`;
  });

  await check("URL updates with the map state", async () => {
    await page.waitForTimeout(400);
    const u = new URL(page.url());
    assert(u.searchParams.get("o")?.includes("greenland~"), "no state in URL");
  });

  await check("timeline moves to 1279 with keyboard and updates the year", async () => {
    const range = page.locator("#timeline");
    await range.focus();
    await page.keyboard.press("Home");
    await page.locator(".year-numeral", { hasText: "1 BC" }).waitFor();
    for (let i = 0; i < 13; i++) await page.keyboard.press("ArrowRight");
    await page.locator(".year-numeral", { hasText: "1279" }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll("[data-territory]").length > 50, null, { timeout: 15000 });
  });

  await check("clicking a territory on the 1279 map picks it up", async () => {
    const before = await overlayCount(page);
    const t = page.locator('[data-territory="byzantine-empire"]');
    await t.scrollIntoViewIfNeeded().catch(() => {});
    const b = await t.boundingBox();
    assert(b, "Byzantine territory not drawn");
    // click a point inside the path
    await t.click({ position: { x: Math.max(2, b.width * 0.5), y: Math.max(2, b.height * 0.5) }, force: true });
    await waitOverlays(page, before + 1);
  });

  await check("panel shows details, area chart and rotation", async () => {
    const panel = page.getByRole("complementary", { name: "On the map" });
    await panel.getByText("True area").waitFor();
    assert((await panel.locator("svg[role=img]").count()) > 0, "no chart");
    const rot = panel.locator('input[type="range"]');
    await rot.focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
    await panel.getByText("10°").waitFor();
    await panel.getByRole("button", { name: "Put it back where it belongs" }).click();
  });

  await check("play button advances the timeline", async () => {
    await page.getByRole("button", { name: "Play through time" }).click();
    await page.locator(".year-numeral", { hasText: "1300" }).waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: "Pause" }).click();
  });

  await check("previous and next buttons step through maps", async () => {
    await page.getByRole("button", { name: "Earlier map" }).click();
    await page.locator(".year-numeral", { hasText: "1279" }).waitFor();
    await page.getByRole("button", { name: "Later map" }).click();
    await page.locator(".year-numeral", { hasText: "1300" }).waitFor();
  });

  await check("arrow keys move a focused shape", async () => {
    const before = new URL(page.url()).searchParams.get("o");
    const shape = page.locator("[data-overlay]").first();
    await shape.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    const after = new URL(page.url()).searchParams.get("o");
    assert(before !== after, "state unchanged");
  });

  await check("right-click removes a shape", async () => {
    const before = await overlayCount(page);
    const target = page.locator("[data-overlay]").last();
    const b = await target.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" });
    await page.waitForFunction((k) => document.querySelectorAll("[data-overlay]").length < k, before, { timeout: 5000 }).catch(() => {});
    const after = await overlayCount(page);
    assert(after === before - 1, `${before} -> ${after}`);
  });

  await check("remove button in the panel removes a shape", async () => {
    const before = await overlayCount(page);
    await page.getByRole("button", { name: /^Remove / }).first().click();
    await waitOverlays(page, before - 1);
  });

  await check("zoom buttons change the view", async () => {
    const g = page.locator(".map-svg > g").first();
    const t0 = await g.getAttribute("transform");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(300);
    const t1 = await g.getAttribute("transform");
    await page.getByRole("button", { name: "Zoom out" }).click();
    assert(t0 !== t1, "transform unchanged");
  });

  await check("borders toggle hides and shows the year's borders", async () => {
    const box = page.getByRole("checkbox", { name: "Borders of this year" });
    await box.uncheck();
    await page.waitForFunction(() => document.querySelectorAll("[data-territory]").length === 0);
    await box.check();
    await page.waitForFunction(() => document.querySelectorAll("[data-territory]").length > 0);
  });

  let shared = "";
  await check("share copies a link with the map state", async () => {
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByText("Link copied").waitFor({ timeout: 4000 });
    shared = await page.evaluate(() => navigator.clipboard.readText());
    assert(shared.includes("?y=") && shared.includes("o="), shared);
  });

  await check("shared link restores the same shapes", async () => {
    const expected = await overlayCount(page);
    const { page: p2, context: c2 } = await newPage();
    await p2.goto(shared, { waitUntil: "networkidle" });
    await waitOverlays(p2, expected);
    await c2.close();
    return `${expected} shapes`;
  });

  await check("clear all empties the map", async () => {
    await page.getByRole("button", { name: "Clear all" }).click();
    await waitOverlays(page, 0);
    await page.getByText("Search above or click any territory").waitFor();
  });

  record("home flow had no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}

// ---------- 3. comparison + history pages ----------
{
  const { page, errors, context } = await newPage();
  await page.goto(BASE + "/compare/greenland-vs-africa", { waitUntil: "networkidle" });
  await check("comparison page embeds a working two-shape map", async () => {
    await waitOverlays(page, 2);
    await page.getByText("The numbers").waitFor();
  });
  await check("comparison 'Open full map' carries the state", async () => {
    await page.getByRole("link", { name: /full map/i }).first().click();
    await page.waitForURL(/o=greenland/);
    await waitOverlays(page, 2);
  });
  await page.goto(BASE + "/history/roman-empire", { waitUntil: "networkidle" });
  await check("timeline page shows chart, table and map link", async () => {
    assert((await page.locator("svg[role=img]").count()) > 0, "no chart");
    assert((await page.locator("table tbody tr").count()) >= 3, "no rows");
    await page.getByRole("link", { name: /See it on the map/ }).click();
    await page.waitForURL(/o=roman-empire/);
    await waitOverlays(page, 1);
  });
  record("comparison/history flow had no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}

// ---------- 4. forms ----------
const subsFile = path.join(process.cwd(), "data", "submissions.json");
const subsCount = () => {
  try {
    return JSON.parse(fs.readFileSync(subsFile, "utf8")).length;
  } catch {
    return 0;
  }
};
{
  const { page, errors, context } = await newPage();
  await page.goto(BASE + "/about", { waitUntil: "networkidle" });
  const form = page.getByRole("form", { name: "Report a border problem" });
  await check("correction form blocks an empty message", async () => {
    await form.getByRole("button", { name: "Send correction" }).click();
    await form.getByText("at least 10 characters").waitFor();
  });
  await check("correction form rejects a bad email", async () => {
    await form.locator("textarea").fill("The border of Mali in 1300 reaches too far north.");
    await form.locator("input[name=email]").fill("not-an-email");
    await form.getByRole("button", { name: "Send correction" }).click();
    await form.getByText("doesn't look right").waitFor();
  });
  await check("correction form sends and is saved to data/submissions.json", async () => {
    const before = subsCount();
    await form.locator("input[name=topic]").fill("Mali, 1300");
    await form.locator("input[name=email]").fill("teacher@example.com");
    await page.waitForTimeout(1300); // real people take longer than the anti-bot minimum
    await form.getByRole("button", { name: "Send correction" }).click();
    await page.getByText("Your correction was sent").waitFor({ timeout: 5000 });
    assert(subsCount() === before + 1, "not stored");
  });
  const footer = page.getByRole("form", { name: "Email updates" });
  await check("updates form requires an email", async () => {
    await footer.getByRole("button", { name: "Send me updates" }).click();
    await footer.getByText("Enter your email").waitFor();
  });
  await check("updates form signs up", async () => {
    const before = subsCount();
    await footer.locator("input[name=email]").fill("fan@example.com");
    await page.waitForTimeout(1300);
    await footer.getByRole("button", { name: "Send me updates" }).click();
    await page.getByText("You're on the list").waitFor({ timeout: 5000 });
    assert(subsCount() === before + 1, "not stored");
  });
  await check("honeypot submissions are accepted silently and not stored", async () => {
    const before = subsCount();
    const res = await page.request.post(BASE + "/api/submit", {
      data: { kind: "updates", email: "bot@example.com", company: "Spam LLC", elapsedMs: 5000 },
    });
    const body = await res.json();
    assert(body.ok === true && subsCount() === before, "bot stored or rejected loudly");
  });
  await check("server validates even without the browser", async () => {
    const res = await page.request.post(BASE + "/api/submit", { data: { kind: "updates", email: "nope", elapsedMs: 5000 } });
    assert(res.status() === 422, String(res.status()));
  });
  record("forms flow had no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await context.close();
}

// ---------- 5. responsive layouts ----------
for (const vp of [
  { width: 375, height: 740, name: "phone" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 1280, height: 800, name: "desktop" },
  { width: 1920, height: 1080, name: "wide" },
]) {
  const { page, errors, context } = await newPage({ width: vp.width, height: vp.height }, { hasTouch: vp.width < 1000, isMobile: vp.width < 500 });
  const problems = [];
  for (const r of ["/", "/about", "/history", "/history/mongol-empire-claims", "/compare", "/compare/roman-empire-vs-united-states"]) {
    await page.goto(BASE + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(r === "/" ? 900 : 200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${r} scrolls sideways by ${overflow}px`);
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}${r.replace(/\//g, "_") || "_home"}.png`) });
  }
  if (vp.width < 768) {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForSelector("[data-overlay]");
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.count()) await skip.click();
    await page.getByRole("button", { name: "Expand panel" }).click();
    await page.getByRole("button", { name: /Greenland/ }).first().click();
    await page.getByText("True area").waitFor();
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}_panel.png`) });
  }
  record(`layout at ${vp.width}px has no sideways scroll or errors`, problems.length === 0 && errors.length === 0, [...problems, ...errors].slice(0, 2).join(" | "));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
fs.writeFileSync(path.join(SHOTS, "results.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
