"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DayBoard, SubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, savePlayer, type Player } from "@/lib/player";
import { track } from "@/lib/analytics";
import { isOffensive } from "@/lib/name-filter";
import { signInOn } from "@/lib/sign-in";
import { useAccount } from "./SignInProvider";
import { AccountJoin } from "./AccountJoin";
import { dailyCopy as t } from "@/content/daily";
import { TrophyIcon } from "@/components/site/Icons";

type Props = { date: string; choices: number[] };

/**
 * After the daily round: post the score. With sign-in on, players sign in (verified email); otherwise they type an email.
 * New players see one "Join the leaderboard" button first, so the score, sharing and answers lead the results screen.
 * Players already on the board skip the button and see their rank straight away.
 */
export function LeaderboardJoin(props: Props) {
  return signInOn ? <SignedInGate {...props} /> : <SavedPlayerGate {...props} />;
}

function SignedInGate(props: Props) {
  const { isLoaded, isSignedIn } = useAccount();
  return <JoinGate joined={isLoaded ? !!isSignedIn : undefined}>
      <AccountJoin {...props} />
    </JoinGate>;
}

function SavedPlayerGate(props: Props) {
  const [joined, setJoined] = useState<boolean | undefined>(undefined);
  useEffect(() => queueMicrotask(() => setJoined(!!loadPlayer())), []);
  return <JoinGate joined={joined}>
      <EmailJoin {...props} />
    </JoinGate>;
}

/** Shows the sign-up behind a button until opened; `joined` (already on the board) opens it straight away. */
function JoinGate({ joined, children }: { joined: boolean | undefined; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // keyboard and screen-reader users land in the sign-up they just opened
    if (open) panel.current?.focus();
  }, [open]);
  if (joined === undefined) return <div className="mt-5 h-[86px]" aria-hidden="true" />;
  if (joined || open) {
    return (
      <div ref={panel} tabIndex={-1} className="outline-none">
        {children}
      </div>
    );
  }
  // compact: "Get on the leaderboard · Join"; the full sign-up only opens after Join
  return (
    <div className="mt-5 flex items-center gap-3 rounded-[22px] border-2 border-primary bg-primary-soft py-3 pl-4 pr-3 shadow-[0_6px_0_0_var(--color-primary-shadow)]">
      <TrophyIcon className="size-9" />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg leading-tight text-ink">{t.joinCta}</span>
        <span className="block text-sm text-muted">{t.joinHint}</span>
      </span>
      <button
        type="button"
        aria-expanded={false}
        onClick={() => {
          track("leaderboard_join_open");
          setOpen(true);
        }}
        className="btn btn-primary mb-1.5 h-12 shrink-0 px-6"
      >
        {t.joinButton}
      </button>
    </div>
  );
}

/** Sign up with an email and a nickname, post the score and show where it ranks today. */
function EmailJoin({ date, choices }: Props) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"name" | "email" | null>(null);
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [top, setTop] = useState<DayBoard | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLInputElement>(null);
  const sent = useRef(false);
  const [remindNote, setRemindNote] = useState("");

  /** Turn reminder emails on or off on the server, then remember the choice in this browser. */
  const saveReminders = async (p: Player, on: boolean) => {
    setRemindNote("");
    // flip the box straight away; put it back if the server says no
    setPlayer({ ...p, reminders: on });
    const undo = (note: string) => {
      setPlayer(p);
      setRemindNote(note);
    };
    try {
      const res = await fetch("/api/leaderboard/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: p.id, on }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) return undo(data.error ?? "Couldn't save that. Please try again.");
      setPlayer(savePlayer(p.name, p.email, on));
      setRemindNote(on ? "Done. We'll email you when a new challenge is up." : "Done. No more reminder emails.");
    } catch {
      undo("Couldn't reach the server. Please try again.");
    }
  };

  const submit = async (p: Player, reminders?: boolean) => {
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
      if (reminders !== undefined) await saveReminders(p, reminders);
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
    <div className="mt-5 rounded-[20px] border-2 border-line bg-paper p-4">
      {/* on the narrowest phones "See all" drops to its own line rather than crowd the heading */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] text-ink min-[400px]:text-lg sm:gap-2 sm:text-xl">
          <TrophyIcon className="size-5 min-[400px]:size-6 sm:size-7" /> Today&apos;s leaderboard
        </h3>
        <Link href="/leaderboard" className="whitespace-nowrap text-sm font-semibold text-link hover:underline">
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
            const reminders = remindRef.current?.checked ?? false;
            const p = savePlayer(name, email);
            setPlayer(p);
            submit(p, reminders);
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
            className="mt-1 h-11 w-full rounded-xl border-2 border-line bg-white px-3 text-ink"
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
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-3 text-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn btn-primary mb-1.5 h-11 shrink-0 px-4"
            >
              {status === "sending" ? "Saving…" : player ? "Save" : "Join"}
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-ink">
            <input ref={remindRef} type="checkbox" defaultChecked={player?.reminders ?? false} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span>
              Email me when a new daily challenge is up, so I can defend my spot on the leaderboard.{" "}
              <span className="text-muted">Optional. Unsubscribe any time with one click.</span>
            </span>
          </label>
          <p id="lb-help" className="mt-1 text-xs text-muted">
            One nickname per email. We use your email to keep the leaderboard fair, and for reminders only if you check the box. We never
            show or share it. Please don&apos;t use your full real name as a nickname. Only your first try each day counts.
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
            <button type="button" onClick={() => setEditing(true)} className="whitespace-nowrap text-sm font-semibold text-link hover:underline">
              Change nickname
            </button>
          </p>
        ) : null}
        {result && !editing && player ? (
          <label className="mt-2 flex items-start gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={player.reminders ?? false}
              onChange={(e) => saveReminders(player, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>Email me when a new daily challenge is up</span>
          </label>
        ) : null}
        {remindNote ? <p className="mt-1 text-xs text-muted">{remindNote}</p> : null}
      </div>

      {top?.rows.length ? (
        <ol className="mt-3 space-y-1 text-sm">
          {top.rows.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-[#FFF1C7] font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? <span className="font-normal text-muted"> (you)</span> : null}</span>
              <span className="font-mono">{r.score}/5</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
