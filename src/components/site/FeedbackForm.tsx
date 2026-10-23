"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { topics, validateFeedback, type FieldErrors, type Topic } from "@/lib/feedback";
import { track } from "@/lib/analytics";

type Status = "idle" | "sending" | "sent" | "error";

function FieldError({ k, errors }: { k: keyof FieldErrors; errors: FieldErrors }) {
  if (!errors[k]) return null;
  return (
    <p id={`${k}-error`} className="mt-1 text-sm font-semibold text-danger">
      {errors[k]}
    </p>
  );
}

export function FeedbackForm() {
  const params = useSearchParams();
  const initialTopic = (topics.find((t) => t.value === params.get("topic"))?.value ?? "border") as Topic;
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // set after mount so the timestamp reflects when a person actually saw the form
    const t = setTimeout(() => setStartedAt(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    const { data, errors: errs } = validateFeedback({ ...raw, topic, startedAt });
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: FieldErrors };
      if (res.ok && json.ok) {
        setStatus("sent");
        track("feedback_sent", { topic });
        formRef.current?.reset();
      } else {
        if (json.errors) setErrors(json.errors);
        setServerError(json.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setServerError("You seem to be offline. Please check your connection and try again.");
      setStatus("error");
    }
    setTimeout(() => statusRef.current?.focus(), 0);
  };

  if (status === "sent") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-card bg-[#e7f7ee] p-6 ring-1 ring-green">
        <h2 className="font-display text-2xl text-ink">Thanks! Your report is in.</h2>
        <p className="mt-2 text-ink-soft">We read every message. Fixes are listed on the About page. If you left an email, we may follow up.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/map" className="btn btn-primary">
            Back to the map
          </Link>
          <button type="button" onClick={() => setStatus("idle")} className="btn btn-white">
            Send another
          </button>
        </div>
      </div>
    );
  }

  const field = "mt-1 w-full rounded-[14px] border-2 bg-white px-3 text-base text-ink";
  const border = (k: keyof FieldErrors) => (errors[k] ? "border-danger" : "border-line");

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="card space-y-5 p-5 md:p-6">
      {status === "error" ? (
        <div ref={statusRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red/30 bg-red-soft p-3 text-sm font-semibold text-danger">
          {serverError || "Please fix the highlighted fields."}
        </div>
      ) : null}

      <fieldset>
        <legend className="text-sm font-semibold text-ink">What is it about?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {topics.map((t) => (
            <label key={t.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[14px] border-2 border-line px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="radio" name="topic" value={t.value} checked={topic === t.value} onChange={() => setTopic(t.value)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Place {topic === "border" || topic === "missing" ? "(required)" : "(optional)"}
          <input
            name="region"
            defaultValue={params.get("region") ?? ""}
            aria-invalid={!!errors.region}
            aria-describedby={errors.region ? "region-error" : undefined}
            className={`${field} h-11 ${border("region")}`}
            placeholder="e.g. Crimea, Austria-Hungary"
          />
          <FieldError k="region" errors={errors} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Era or year (optional)
          <input name="era" defaultValue={params.get("era") ?? ""} className={`${field} h-11 border-line`} placeholder="e.g. 1914" />
        </label>
      </div>

      <label className="block text-sm font-semibold text-ink">
        Your message (required)
        <textarea
          name="message"
          rows={5}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${field} py-2 ${border("message")}`}
          placeholder="What's wrong, and what should it be?"
        />
        <FieldError k="message" errors={errors} />
      </label>

      <label className="block text-sm font-semibold text-ink">
        Source link (optional, but it helps us fix things fast)
        <input
          name="source"
          type="url"
          inputMode="url"
          aria-invalid={!!errors.source}
          aria-describedby={errors.source ? "source-error" : undefined}
          className={`${field} h-11 ${border("source")}`}
          placeholder="https://"
        />
        <FieldError k="source" errors={errors} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Name (optional)
          <input name="name" autoComplete="name" className={`${field} h-11 border-line`} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Email (optional, if you&apos;d like a reply)
          <input
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`${field} h-11 ${border("email")}`}
          />
          <FieldError k="email" errors={errors} />
        </label>
      </div>

      {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="btn btn-primary btn-lg w-full gap-2 sm:w-auto"
      >
        {status === "sending" ? (
          <>
            <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sending…
          </>
        ) : (
          "Send report"
        )}
      </button>
    </form>
  );
}
