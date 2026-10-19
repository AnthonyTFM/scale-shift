"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import type { DayBoard, SubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, rememberPlayer } from "@/lib/player";
import { track } from "@/lib/analytics";
import { isOffensive } from "@/lib/name-filter";

type Props = { date: string; choices: number[] };
type Me = { id: string; name: string | null; reminders: boolean } | null;

/**
 * After the daily round, with sign-in on: sign in (an email code or Google) so nobody else can post as you, pick a
 * nickname once, and your score posts as the same player on every device.
 */
export function AccountJoin({ date, choices }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [top, setTop] = useState<DayBoard | null>(null);
  const [remindNote, setRemindNote] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLInputElement>(null);
  const sent = useRef(false);

  const saveReminders = async (on: boolean) => {
    setRemindNote("");
    const before = me;
    if (me) setMe({ ...me, reminders: on });
    try {
      const res = await fetch("/api/leaderboard/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setMe(before);
        return setRemindNote(data.error ?? "Couldn't save that. Please try again.");
      }
      setRemindNote(on ? "Done. We'll email you when a new challenge is up." : "Done. No more reminder emails.");
    } catch {
      setMe(before);
      setRemindNote("Couldn't reach the server. Please try again.");
    }
  };

  const submit = async (name: string, reminders?: boolean) => {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `player` only matters for a brand-new player: it keeps the scores this browser already posted
        body: JSON.stringify({ player: loadPlayer()?.id ?? "", name, date, choices, website: "" }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!data.ok) {
        setStatus("error");
        setError(data.error);
        if (data.field === "name") setEditing(true);
        return;
      }
      if (data.player) rememberPlayer(data.player);
      setMe((m) => ({ id: data.player?.id ?? m?.id ?? "", name, reminders: m?.reminders ?? false }));
      setResult(data);
      setStatus("done");
      setEditing(false);
      if (!data.duplicate) track("leaderboard_join", { rank: data.rank });
      if (reminders) await saveReminders(true);
      const board = await fetch(`/api/leaderboard?scope=day&date=${date}&limit=5&player=${data.player?.id ?? ""}`).then((r) => (r.ok ? r.json() : null));
      setTop(board);
    } catch {
      setStatus("error");
      setError("Couldn't reach the leaderboard. Check your connection and try again.");
    }
  };

  // signed in: find out who we are; a returning player's score is posted straight away
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/leaderboard/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { player?: Me } | null) => {
        const p = d?.player ?? null;
        setMe(p);
        if (p?.name && !sent.current) {
          sent.current = true;
          submit(p.name);
        }
      })
      .catch(() => setMe(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const askName = isSignedIn && me !== undefined && (!me?.name || editing);

  return (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-ink">🏆 Today&apos;s leaderboard</h3>
        <Link href="/leaderboard" className="text-sm font-semibold text-link hover:underline">
          See all →
        </Link>
      </div>

      {!isLoaded ? <p className="mt-2 text-sm text-muted">Loading…</p> : null}

      {isLoaded && !isSignedIn ? (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">
            Sign in to put your score on the public leaderboard. We&apos;ll send a code to your email (or use Google), so nobody else can post as
            you, and you keep the same nickname on every device.
          </p>
          <SignInButton mode="modal" withSignUp forceRedirectUrl="/daily" signUpForceRedirectUrl="/daily">
            <button type="button" className="mt-3 h-11 rounded-lg bg-panel px-4 font-bold text-panel-text hover:bg-panel-2">
              Sign in to post my score
            </button>
          </SignInButton>
        </div>
      ) : null}

      {isSignedIn && me === undefined ? <p className="mt-2 text-sm text-muted">Loading your spot…</p> : null}

      {askName ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = nameRef.current?.value.trim() ?? "";
            if (name.length < 3) return (setStatus("error"), setError("Use 3 to 16 characters."));
            if (isOffensive(name)) return (setStatus("error"), setError("Please pick a different nickname."));
            submit(name, me?.name ? undefined : (remindRef.current?.checked ?? false));
          }}
        >
          <label htmlFor="lb-name" className="block text-sm font-semibold text-ink">
            Nickname <span className="font-normal text-muted">(shown publicly)</span>
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="lb-name"
              ref={nameRef}
              defaultValue={me?.name ?? ""}
              maxLength={16}
              autoComplete="nickname"
              placeholder="e.g. MapWizard"
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-11 shrink-0 rounded-lg bg-panel px-4 font-bold text-panel-text hover:bg-panel-2 disabled:opacity-60"
            >
              {status === "sending" ? "Saving…" : me?.name ? "Save" : "Join"}
            </button>
          </div>
          {me?.name ? null : (
            <label className="mt-3 flex items-start gap-2 text-sm text-ink">
              <input ref={remindRef} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-amber-500" />
              <span>
                Email me when a new daily challenge is up, so I can defend my spot on the leaderboard.{" "}
                <span className="text-muted">Optional. Unsubscribe any time with one click.</span>
              </span>
            </label>
          )}
          <p className="mt-1 text-xs text-muted">
            Please don&apos;t use your full real name as a nickname. Only your first try each day counts. Your email is never shown or shared.
          </p>
        </form>
      ) : null}

      <div aria-live="polite">
        {status === "error" && error ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {status === "sending" && !askName ? <p className="mt-2 text-sm text-muted">Posting your score…</p> : null}
        {result && !editing ? (
          <p className="mt-2 text-ink">
            <strong>{me?.name}</strong>, you&apos;re <strong className="text-lg">#{result.rank}</strong> of {result.total} today
            {result.duplicate ? " (your first score of the day counts)" : ""}.{" "}
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-link hover:underline">
              Change nickname
            </button>
          </p>
        ) : null}
        {result && !editing && me ? (
          <label className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={me.reminders}
              onChange={(e) => saveReminders(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-amber-500"
            />
            <span>Email me when a new daily challenge is up</span>
          </label>
        ) : null}
        {remindNote ? <p className="mt-1 text-xs text-muted">{remindNote}</p> : null}
      </div>

      {top?.rows.length ? (
        <ol className="mt-3 space-y-1 text-sm">
          {top.rows.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-amber-200/70 font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? <span className="font-normal text-muted"> (you)</span> : null}</span>
              <span className="font-mono">{r.score}/5</span>
            </li>
          ))}
        </ol>
      ) : null}

      {isSignedIn ? (
        <p className="mt-3 text-xs text-muted">
          Signed in.{" "}
          <SignOutButton redirectUrl="/daily">
            <button type="button" className="font-semibold text-link hover:underline">
              Sign out
            </button>
          </SignOutButton>
        </p>
      ) : null}
    </div>
  );
}
