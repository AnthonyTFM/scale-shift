"use client";

import { useRef, useState } from "react";
import { track } from "@/lib/analytics";

type Kind = "updates" | "correction";

interface Props {
  kind: Kind;
  buttonLabel: string;
  successText: string;
  /** dark variant for the footer */
  tone?: "light" | "dark";
}

interface Errors {
  email?: string;
  message?: string;
  form?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LeadForm({ kind, buttonLabel, successText, tone = "light" }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const startedAt = useRef<number>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const dark = tone === "dark";

  const validate = (data: FormData): Errors => {
    const e: Errors = {};
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (kind === "updates" && !email) e.email = "Enter your email so we can send updates.";
    else if (email && !EMAIL_RE.test(email)) e.email = "That email doesn't look right. Check for a typo.";
    if (kind === "correction") {
      if (message.length < 10) e.message = "Describe the problem in at least 10 characters.";
      else if (message.length > 2000) e.message = "Keep it under 2,000 characters.";
    }
    return e;
  };

  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    const e = validate(data);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = ev.currentTarget.querySelector<HTMLElement>(e.email ? "[name=email]" : "[name=message]");
      first?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          email: String(data.get("email") ?? "").trim(),
          name: String(data.get("name") ?? "").trim(),
          topic: String(data.get("topic") ?? "").trim(),
          message: String(data.get("message") ?? "").trim(),
          company: String(data.get("company") ?? ""),
          elapsedMs: startedAt.current ? Date.now() - startedAt.current : 0,
          page: window.location.pathname,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Errors };
      if (!res.ok || !body.ok) {
        setErrors({ ...(body.fields ?? {}), form: body.error ?? "Sending failed. Check your connection and try again." });
        setStatus("idle");
        return;
      }
      setStatus("sent");
      formRef.current?.reset();
      track(kind === "updates" ? "updates_signup" : "correction_sent");
    } catch {
      setErrors({ form: "Sending failed. Check your connection and try again." });
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <p role="status" className={`rounded-xl p-4 ${dark ? "bg-paper/10 text-paper" : "bg-paper-2 text-ink"}`}>
        {successText}
      </p>
    );
  }

  const labelCls = `text-sm font-bold ${dark ? "text-paper" : "text-ink"}`;
  const errCls = `text-sm ${dark ? "text-[#ffb4a9]" : "text-danger"}`;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      onFocus={() => {
        if (!startedAt.current) startedAt.current = Date.now();
      }}
      className="grid gap-3"
      aria-label={kind === "updates" ? "Email updates" : "Report a border problem"}
    >
      {/* honeypot: hidden from people, tempting to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {kind === "correction" && (
        <>
          <label className="grid gap-1">
            <span className={labelCls}>Which place and year?</span>
            <input name="topic" className="field" maxLength={120} placeholder="For example: Mali, 1300" />
          </label>
          <label className="grid gap-1">
            <span className={labelCls}>What looks wrong?</span>
            <textarea
              name="message"
              className="field min-h-[120px]"
              maxLength={2000}
              required
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? `${kind}-message-err` : undefined}
            />
            {errors.message && (
              <span id={`${kind}-message-err`} className={errCls}>
                {errors.message}
              </span>
            )}
          </label>
        </>
      )}

      <div className={kind === "updates" ? "flex flex-col gap-2 sm:flex-row sm:items-start" : "grid gap-3"}>
        <label className={kind === "updates" ? "grid min-w-0 flex-1 gap-1" : "grid gap-1"}>
          <span className={kind === "updates" ? "sr-only" : labelCls}>
            {kind === "updates" ? "Email address" : "Your email (optional, if you'd like a reply)"}
          </span>
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="field"
            placeholder={kind === "updates" ? "you@example.com" : undefined}
            required={kind === "updates"}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${kind}-email-err` : undefined}
          />
          {errors.email && (
            <span id={`${kind}-email-err`} className={errCls}>
              {errors.email}
            </span>
          )}
        </label>
        <button type="submit" className={`btn ${dark ? "btn-accent" : "btn-primary"}`} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : buttonLabel}
        </button>
      </div>

      <p role="alert" className={errCls}>
        {errors.form ?? ""}
      </p>
    </form>
  );
}
