import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Form endpoint for "updates" sign-ups and border corrections.
 * Works with zero setup: submissions are appended to data/submissions.json.
 * Optional delivery (set in .env.local or Vercel):
 *   SUBMISSIONS_WEBHOOK_URL  POSTs each submission as JSON (Zapier, Make, GoHighLevel, Google Apps Script…)
 *   RESEND_API_KEY + NOTIFY_EMAIL_TO + NOTIFY_EMAIL_FROM  emails each submission via Resend
 *   SUBMISSIONS_FILE  custom path for the JSON file
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hits = new Map<string, number[]>();

interface Submission {
  id: string;
  kind: "updates" | "correction";
  email: string;
  name: string;
  topic: string;
  message: string;
  page: string;
  createdAt: string;
}

function json(body: object, status = 200) {
  return Response.json(body, { status });
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

async function appendToFile(entry: Submission): Promise<string> {
  const preferred = process.env.SUBMISSIONS_FILE || path.join(process.cwd(), "data", "submissions.json");
  const fallback = path.join(os.tmpdir(), "scale-shift-submissions.json");
  for (const file of [preferred, fallback]) {
    try {
      await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
      let list: Submission[] = [];
      try {
        list = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file, "utf8")) as Submission[];
        if (!Array.isArray(list)) list = [];
      } catch {
        list = [];
      }
      list.push(entry);
      await fs.writeFile(/*turbopackIgnore: true*/ file, JSON.stringify(list, null, 2));
      return file;
    } catch {
      // read-only filesystem (e.g. Vercel): try the next location
    }
  }
  throw new Error("No writable location for submissions");
}

async function deliver(entry: Submission): Promise<boolean> {
  let delivered = false;
  const hook = process.env.SUBMISSIONS_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
      delivered = delivered || r.ok;
    } catch {
      // fall through to other channels
    }
  }
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (key && to && from) {
    try {
      const subject = entry.kind === "updates" ? `New updates sign-up: ${entry.email}` : `Border correction: ${entry.topic || "no topic"}`;
      const text = Object.entries(entry)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()), subject, text, reply_to: entry.email || undefined }),
      });
      delivered = delivered || r.ok;
    } catch {
      // ignore; file storage still applies
    }
  }
  return delivered;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "The form data couldn't be read. Reload the page and try again." }, 400);
  }

  const str = (k: string, max: number) => String(body[k] ?? "").trim().slice(0, max);
  const kind = body.kind === "updates" || body.kind === "correction" ? body.kind : null;
  const email = str("email", 254);
  const message = str("message", 2000);

  // Honeypot or impossibly fast submit: pretend success, store nothing.
  if (str("company", 200) || (typeof body.elapsedMs === "number" && body.elapsedMs > 0 && body.elapsedMs < 1200)) {
    return json({ ok: true });
  }

  const fields: Record<string, string> = {};
  if (!kind) return json({ ok: false, error: "Unknown form." }, 400);
  if (kind === "updates" && !email) fields.email = "Enter your email so we can send updates.";
  else if (email && !EMAIL_RE.test(email)) fields.email = "That email doesn't look right. Check for a typo.";
  if (kind === "correction" && message.length < 10) fields.message = "Describe the problem in at least 10 characters.";
  if (Object.keys(fields).length) return json({ ok: false, error: "Fix the highlighted field and send again.", fields }, 422);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) return json({ ok: false, error: "Too many messages in a minute. Wait a moment and try again." }, 429);

  const entry: Submission = {
    id: crypto.randomUUID(),
    kind,
    email,
    name: str("name", 120),
    topic: str("topic", 120),
    message,
    page: str("page", 200),
    createdAt: new Date().toISOString(),
  };

  let stored = false;
  try {
    await appendToFile(entry);
    stored = true;
  } catch {
    stored = false;
  }
  const delivered = await deliver(entry);
  if (!stored && !delivered) {
    return json({ ok: false, error: "We couldn't save that just now. Try again in a minute." }, 500);
  }
  return json({ ok: true });
}
