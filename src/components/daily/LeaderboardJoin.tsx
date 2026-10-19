"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DayBoard, SubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, savePlayer, type Player } from "@/lib/player";
import { track } from "@/lib/analytics";
import { isOffensive } from "@/lib/name-filter";

type Props = { date: string; choices: number[] };

/** After the daily round: sign up with an email and a nickname, post the score and show where it ranks today. */
export function LeaderboardJoin({ date, choices }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"name" | "email" | null>(null);
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [top, setTop] = useState<DayBoard | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sent = useRef(false);

  const submit = async (p: Player) => {
    setStatus("sending");
    setError("");
    setErrorField(null);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: p.id, name: p.name, email: p.email ?? "", date, choices, website: "" }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!data.ok) {
        setStatus("error");
        setError(data.error);
        setErrorField(data.field ?? null);
        if (data.field) setEditing(true);
        return;
      }
      setResult(data);
      setStatus("done");
      setEditing(false);
      if (!data.duplicate) track("leaderboard_join", { rank: data.rank });
      const board = await fetch(`/api/leaderboard?scope=day&date=${date}&limit=5&player=${p.id}`).then((r) => (r.ok ? r.json() : null));
      setTop(board);
    } catch {
      setStatus("error");
      setError("Couldn't reach the leaderboard. Check your connection and try again.");
    }
  };

  // returning players are posted automatically
  useEffect(() => {
    const p = loadPlayer();
    if (!p || sent.current) return;
    sent.current = true;
    queueMicrotask(() => setPlayer(p));
    submit(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showForm = !player || editing;

  return (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-ink">🏆 Today&apos;s leaderboard</h3>
        <Link href="/leaderboard" className="text-sm font-semibold text-link hover:underline">
          See all →
        </Link>
      </div>

      {showForm ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = inputRef.current?.value.trim() ?? "";
            const email = emailRef.current?.value.trim() ?? "";
            const invalid = (field: "name" | "email", message: string) => {
              setStatus("error");
              setError(message);
              setErrorField(field);
              (field === "name" ? inputRef : emailRef).current?.focus();
            };
            if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return invalid("email", "Enter your email to join the leaderboard.");
            if (name.length < 3) return invalid("name", "Use 3 to 16 characters.");
            if (isOffensive(name)) return invalid("name", "Please pick a different nickname.");
            const p = savePlayer(name, email);
            setPlayer(p);
            submit(p);
          }}
        >
          <p className="text-sm text-ink-soft">
            {player ? "Update your leaderboard sign-up." : "Sign up with your email and a nickname to put your score on the public leaderboard."}
          </p>
          <label htmlFor="lb-email" className="mt-2 block text-sm font-semibold text-ink">
            Email <span className="font-normal text-muted">(private, never shown)</span>
          </label>
          <input
            id="lb-email"
            ref={emailRef}
            type="email"
            defaultValue={player?.email ?? ""}
            maxLength={254}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errorField === "email"}
            aria-describedby="lb-help"
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-ink"
          />
          <label htmlFor="lb-name" className="mt-2 block text-sm font-semibold text-ink">
            Nickname <span className="font-normal text-muted">(shown publicly)</span>
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="lb-name"
              ref={inputRef}
              defaultValue={player?.name ?? ""}
              maxLength={16}
              autoComplete="nickname"
              placeholder="e.g. MapWizard"
              aria-invalid={errorField === "name"}
              aria-describedby="lb-help"
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-11 shrink-0 rounded-lg bg-panel px-4 font-bold text-panel-text hover:bg-panel-2 disabled:opacity-60"
            >
              {status === "sending" ? "Saving…" : player ? "Save" : "Join"}
            </button>
          </div>
          <p id="lb-help" className="mt-1 text-xs text-muted">
            One nickname per email. Your email is only used to keep the leaderboard fair; we never show or share it. Please don&apos;t use
            your full real name as a nickname. Only your first try each day counts.
          </p>
        </form>
      ) : null}

      <div aria-live="polite">
        {status === "error" && error ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
        {status === "sending" && !showForm ? <p className="mt-2 text-sm text-muted">Posting your score…</p> : null}
        {result && !editing ? (
          <p className="mt-2 text-ink">
            <strong>{player?.name}</strong>, you&apos;re <strong className="text-lg">#{result.rank}</strong> of {result.total} today
            {result.duplicate ? " (your first score of the day counts)" : ""}.{" "}
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-link hover:underline">
              Change nickname
            </button>
          </p>
        ) : null}
      </div>

      {top?.rows.length ? (
        <ol className="mt-3 space-y-1 text-sm">
          {top.rows.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-amber-200/70 font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="font-mono">{r.score}/5</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
