// Plays the site like a visitor before it ships: the homepage, a full daily round and an endless run, on a phone and a
// computer, against a local `npm start`. Every API that writes or reads players is answered here, so nothing reaches
// the real leaderboard. Fails on a page error, a console error, or a game that doesn't reach its results.
// Usage: node smoke.mjs [base-url] [screenshot-dir]   (default http://localhost:3000; CHROME as in site-check.mjs)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.argv[3];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const board = { date: null, total: 3, rows: [{ rank: 1, name: "Atlas", score: 9 }, { rank: 2, name: "Mercator", score: 4 }, { rank: 3, name: "Gall", score: 1 }], me: null };
const issues = [];
const browser = await chromium.launch({ executablePath: CHROME });

for (const [tag, viewport] of [["phone", { width: 390, height: 844 }], ["computer", { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport, isMobile: tag === "phone", hasTouch: tag === "phone" });
  await ctx.route("**/api/**", (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname === "/api/endless" && req.method() === "GET") {
      if (url.searchParams.has("place")) {
        const n = Number(url.searchParams.get("place"));
        const above = board.rows.filter((r) => r.score > n);
        return route.fulfill({ json: { rank: above.length + 1, next: above.length ? { score: above.at(-1).score, place: above.length } : null } });
      }
      return route.fulfill({ json: board });
    }
    // no run token: the game plays on without posting
    if (url.pathname === "/api/endless/start") return route.fulfill({ status: 503, json: {} });
    return route.fulfill({ json: { ok: true, rows: [], n: 0, scores: [], total: 0, me: null } });
  });
  // Vercel's analytics script only exists on Vercel
  await ctx.route("**/_vercel/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  const page = await ctx.newPage();
  let where = "";
  page.on("pageerror", (e) => issues.push(`${tag} ${where}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && issues.push(`${tag} ${where} console: ${m.text().slice(0, 160)}`));
  const shot = (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${tag}-${name}.png`, fullPage: true });
  const options = () => page.locator('section[aria-labelledby="daily-q"] .grid > button');

  where = "/";
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  if ((await page.locator("h1").count()) !== 1) issues.push(`${tag} /: expected one <h1>`);
  if ((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) > 0) issues.push(`${tag} /: sideways scroll`);
  await shot("home");

  // a full daily round: answer, then Next, five times
  where = "/daily";
  await page.goto(BASE + "/daily", { waitUntil: "networkidle" });
  for (let i = 0; i < 5; i++) {
    await options().first().click({ timeout: 15000 });
    await page.getByRole("button", { name: i < 4 ? /Next round/ : /See my results/ }).click({ timeout: 15000 });
  }
  await page.locator('[aria-labelledby="daily-done"]').waitFor({ timeout: 15000 }).catch(() => issues.push(`${tag} /daily: results never showed`));
  await shot("daily-results");

  // an endless run until the first miss (at most 40 rounds)
  where = "/endless";
  await page.goto(BASE + "/endless", { waitUntil: "networkidle" });
  for (let i = 0; i < 40; i++) {
    await options().first().click({ timeout: 15000 });
    const over = page.getByRole("button", { name: /See my run/ });
    const next = page.getByRole("button", { name: /Next round/ });
    await Promise.race([over.waitFor({ timeout: 15000 }), next.waitFor({ timeout: 15000 })]);
    if (await over.count()) {
      await over.click();
      break;
    }
    await next.click();
  }
  await page.locator('section[aria-labelledby="endless-done"]').waitFor({ timeout: 15000 }).catch(() => issues.push(`${tag} /endless: results never showed`));
  // every player sees the Best streaks board after a run
  await page.getByText("Best streaks").first().waitFor({ timeout: 10000 }).catch(() => issues.push(`${tag} /endless: no Best streaks board on the results`));
  await shot("endless-results");
  await ctx.close();
}

await browser.close();
console.log(issues.length ? `SMOKE ISSUES (${issues.length}):\n- ` + [...new Set(issues)].join("\n- ") : "SMOKE: homepage, daily round and endless run all fine on phone and computer");
process.exit(issues.length ? 1 : 0);
