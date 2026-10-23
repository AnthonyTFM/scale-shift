"use client";

import { useRef } from "react";
import Link from "next/link";
import { isOffensive } from "@/lib/name-filter";
import { useAccount } from "./SignInProvider";
import { TrophyIcon } from "@/components/site/Icons";
import type { Join } from "./useJoin";

/**
 * The results card for a player on today's leaderboard (signed in, nickname picked): their rank, today's top five, a
 * nickname change and the reminder emails. Getting on the board in the first place happens in the join pop-up.
 */
export function AccountJoin({ join }: { join: Join }) {
  const { isSignedIn, signOut } = useAccount();
  const { me, editing, setEditing, status, setStatus, error, setError, result, top, remindNote, submit, saveReminders } = join;
  const nameRef = useRef<HTMLInputElement>(null);

  const askName = isSignedIn && me !== undefined && editing;

  return (
    <div className="mt-5 rounded-[20px] border-2 border-line bg-paper p-4">
      {/* on the narrowest phones "See all" drops to its own line rather than crowd the heading */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="lb-card-h" tabIndex={-1} className="flex items-center outline-none gap-1.5 whitespace-nowrap font-display text-[15px] text-ink min-[400px]:text-lg sm:gap-2 sm:text-xl">
          <TrophyIcon className="size-5 min-[400px]:size-6 sm:size-7" /> Today&apos;s leaderboard
        </h3>
        <Link href="/leaderboard" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
          See all →
        </Link>
      </div>


      {askName ? (
        <form
          className="mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = nameRef.current?.value.trim() ?? "";
            if (name.length < 3) return (setStatus("error"), setError("Use 3 to 16 characters."));
            if (isOffensive(name)) return (setStatus("error"), setError("Please pick a different nickname."));
            submit(name);
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
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-3 text-ink"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn btn-primary mb-1.5 h-11 shrink-0 px-4"
            >
              {status === "sending" ? "Saving…" : "Save"}
            </button>
          </div>
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
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-primary hover:underline">
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
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-gold-soft font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? <span className="font-normal text-muted"> (you)</span> : null}</span>
              <span className="font-display tabular-nums">{r.score}/5</span>
            </li>
          ))}
        </ol>
      ) : null}

      {isSignedIn ? (
        <p className="mt-3 text-xs text-muted">
          Signed in.{" "}
          <button type="button" onClick={() => signOut("/daily")} className="font-semibold text-primary hover:underline">
            Sign out
          </button>
        </p>
      ) : null}
    </div>
  );
}
