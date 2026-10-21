// Where form submissions go. Works with zero setup (a local JSON file); add env vars to forward them.
//
//   SUBMISSIONS_FILE=path               local JSON file (default data/submissions.json; on Vercel /tmp, temporary!)
//   SUBMISSIONS_WEBHOOK_URL=https://... POST each submission as JSON (Zapier, Make, Slack, Airtable, a CRM…)
//   RESEND_API_KEY + NOTIFY_EMAIL_TO (+ NOTIFY_EMAIL_FROM)  email each submission via resend.com
import { promises as fs } from "node:fs";
import path from "node:path";
import type { FeedbackInput } from "./feedback";
import { site } from "@/content/site";

export type Submission = Omit<FeedbackInput, "website" | "startedAt"> & { id: string; receivedAt: string; userAgent: string };

const onVercel = !!process.env.VERCEL;
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
  jobs.push(["json", saveJson(sub)]);
  if (process.env.SUBMISSIONS_WEBHOOK_URL) jobs.push(["webhook", sendWebhook(sub)]);
  if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO) jobs.push(["email", sendEmail(sub)]);
  if (!jobs.length) return { ok: false, failures: ["no destination configured"] };
  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  const failures = results.flatMap((r, i) => (r.status === "rejected" ? [`${jobs[i][0]}: ${String(r.reason)}`] : []));
  if (onVercel && jobs.length === 1 && jobs[0][0] === "json") {
    console.warn("[feedback] Saved to /tmp on Vercel, which is wiped regularly. Set SUBMISSIONS_WEBHOOK_URL or the Resend settings.");
  }
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
