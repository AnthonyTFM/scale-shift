import { validateFeedback } from "@/lib/feedback";
import { deliver, type Submission } from "@/lib/submissions";
import { limited } from "@/lib/rate-limit";

const MIN_FILL_MS = 2500;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Something went wrong. Reload the page and try again." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  if (await limited("feedback", ip, 5)) {
    return Response.json({ ok: false, error: "Too many messages. Please wait a few minutes and try again." }, { status: 429 });
  }

  const { data, errors } = validateFeedback(body);

  // Spam traps: pretend success so bots learn nothing, but store nothing.
  const tooFast = !data.startedAt || Date.now() - data.startedAt < MIN_FILL_MS;
  if (data.website || tooFast) return Response.json({ ok: true });

  if (Object.keys(errors).length) return Response.json({ ok: false, errors }, { status: 422 });

  const submission: Submission = {
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 200),
    topic: data.topic,
    era: data.era,
    region: data.region,
    message: data.message,
    source: data.source,
    name: data.name,
    email: data.email,
  };

  const result = await deliver(submission);
  if (!result.ok) {
    console.error("[feedback] delivery failed", result.failures);
    return Response.json({ ok: false, error: "We couldn't save your message. Please try again in a minute." }, { status: 500 });
  }
  if (result.failures.length) console.warn("[feedback] partial delivery", result.failures);
  return Response.json({ ok: true });
}
