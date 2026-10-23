// Where form submissions go. Works with zero setup (a local JSON file); add env vars to forward them.
//
//   Redis (the leaderboard's Upstash database, same env vars)  newest first in the list "fb:inbox"; on Vercel this
//                                       replaces the /tmp file, which is wiped regularly
//   SUBMISSIONS_FILE=path               local JSON file (default data/submissions.json; on Vercel /tmp, temporary!)
//   SUBMISSIONS_WEBHOOK_URL=https://... POST each submission as JSON (Zapier, Make, Slack, Airtable, a CRM…)
//   RESEND_API_KEY + NOTIFY_EMAIL_TO (+ NOTIFY_EMAIL_FROM)  email each submission via resend.com
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FeedbackInput } from "./feedback";
import { site } from "@/content/site";

export type Submission = Omit<FeedbackInput, "website" | "startedAt"> & { id: string; receivedAt: string; userAgent: string };

const onVercel = !!process.env.VERCEL;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
/** Redis list holding every message, newest first. Read it with `npm run leads` or Upstash's data browser. */
export const INBOX_KEY = "fb:inbox";
const INBOX_MAX = 1000;
const DATA_FILE = process.env.SUBMISSIONS_FILE || (onVercel ? "/tmp/submissions.json" : path.join(process.cwd(), "data", "submissions.json"));

let queue: Promise<unknown> = Promise.resolve();

async function saveJson(sub: Submission) {
  // serialize writes so two submissions at once can't clobber each other
  const run = queue.then(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    let list: Submission[] = [];
    try {
      list = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
    list.push(sub);
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(list, null, 2));
    await fs.rename(tmp, DATA_FILE);
  });
  queue = run.catch(() => {});
  return run;
}

async function saveRedis(sub: Submission) {
  const res = await fetch(`${redisUrl!.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["LPUSH", INBOX_KEY, JSON.stringify(sub)],
      ["LTRIM", INBOX_KEY, "0", String(INBOX_MAX - 1)],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  const out = (await res.json()) as { error?: string }[];
  const err = out.find((o) => o.error);
  if (err) throw new Error(err.error);
}

async function sendWebhook(sub: Submission) {
  const url = process.env.SUBMISSIONS_WEBHOOK_URL;
  if (!url) return;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

async function sendEmail(sub: Submission) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!key || !to) return;
  const from = process.env.NOTIFY_EMAIL_FROM || `${site.name} <onboarding@resend.dev>`;
  const lines = [
    `Topic: ${sub.topic}`,
    `Era: ${sub.era || "-"}`,
    `Place: ${sub.region || "-"}`,
    `Source: ${sub.source || "-"}`,
    `From: ${sub.name || "-"} <${sub.email || "no email"}>`,
    "",
    sub.message,
  ];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()),
      subject: `[${site.name}] ${sub.topic}: ${sub.region || sub.message.slice(0, 40)}`,
      text: lines.join("\n"),
      ...(sub.email ? { reply_to: sub.email } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

/** Delivers to every configured destination. Succeeds if at least one destination accepted it. */
export async function deliver(sub: Submission): Promise<{ ok: boolean; failures: string[] }> {
  const jobs: [string, Promise<unknown>][] = [];
  const redis = !!(redisUrl && redisToken);
  if (redis) jobs.push(["redis", saveRedis(sub)]);
  // on Vercel the file lives in /tmp and is soon lost: only fall back to it when nothing else is set up
  if (!redis || !onVercel) jobs.push(["json", saveJson(sub)]);
  if (process.env.SUBMISSIONS_WEBHOOK_URL) jobs.push(["webhook", sendWebhook(sub)]);
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO) jobs.push(["email", sendEmail(sub)]);
  if (!jobs.length) return { ok: false, failures: ["no destination configured"] };
  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  const failures = results.flatMap((r, i) => (r.status === "rejected" ? [`${jobs[i][0]}: ${String(r.reason)}`] : []));
  if (onVercel && jobs.length === 1 && jobs[0][0] === "json") {
    console.warn("[feedback] Saved to /tmp on Vercel, which is wiped regularly. Add the Upstash Redis settings, SUBMISSIONS_WEBHOOK_URL or Resend.");
  }
  // no personal details here: just enough for the owners' hourly check to see that a message came in
  if (failures.length < jobs.length) console.info(`[feedback] new message ${sub.id} (${sub.topic})`);
  return { ok: failures.length < jobs.length, failures };
}

// ---- simple in-memory rate limit (per server instance) ----
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, limit = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > limit;
}
