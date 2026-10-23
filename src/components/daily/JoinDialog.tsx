"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isOffensive } from "@/lib/name-filter";
import { dailyCopy } from "@/content/daily";
import { MarkIcon, TrophyIcon } from "@/components/site/Icons";
import { AgeCheck, useAgeOk } from "./AgeCheck";
import { useAccount } from "./SignInProvider";
import type { Join } from "./useJoin";

const t = dailyCopy.joinDialog;

/** 1: the 13+ box and sign-in; 2: pick a nickname; 3: you're on the board. */
export type JoinStep = 1 | 2 | 3;

/**
 * Set while a player is between step 1 and step 2: the sign-in window sits on top of this pop-up, so the pop-up closes
 * while it's open, and a Google sign-in leaves the page entirely. Coming back signed in, the pop-up reopens at step 2.
 */
const FLOW = "join-flow";
const FLOW_MAX_AGE = 30 * 60_000;

export function startJoinFlow(date: string) {
  try {
    sessionStorage.setItem(FLOW, JSON.stringify({ date, at: Date.now() }));
  } catch {
    /* storage blocked: the player taps Join again after signing in */
  }
}

/** True (once) if this player started joining for `date` in the last half hour. */
export function takeJoinFlow(date: string) {
  try {
    const raw = sessionStorage.getItem(FLOW);
    if (!raw) return false;
    sessionStorage.removeItem(FLOW);
    const f = JSON.parse(raw) as { date: string; at: number };
    return f.date === date && Date.now() - f.at < FLOW_MAX_AGE;
  } catch {
    return false;
  }
}

/**
 * "Get on today's leaderboard" as one pop-up with clear steps, so nobody misses the next one: a bottom sheet on phones, a
 * box in the middle on wider screens.
 */
export function JoinDialog({
  step,
  onStep,
  onClose,
  join,
  date,
  score,
}: {
  step: JoinStep | null;
  onStep: (s: JoinStep | null) => void;
  onClose: () => void;
  join: Join;
  date: string;
  score: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (step && !d.open) d.showModal();
    if (!step && d.open) d.close();
  }, [step]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // a tap on the dimmed page around the pop-up closes it
      onClick={(e) => e.target === ref.current && onClose()}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] bg-white p-0 text-ink shadow-[0_-8px_30px_rgba(29,33,64,0.25)] md:inset-0 md:m-auto md:h-fit md:max-w-md md:rounded-[28px]"
    >
      <div className="p-5 pb-7 sm:p-6">
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line md:hidden" />
        {step === 1 ? <SignInStep titleId={titleId} date={date} score={score} onDone={() => onStep(null)} onClose={onClose} /> : null}
        {step === 2 ? <NameStep titleId={titleId} join={join} onPosted={() => onStep(3)} /> : null}
        {step === 3 ? <DoneStep titleId={titleId} join={join} score={score} onClose={onClose} /> : null}
      </div>
    </dialog>
  );
}

function Steps({ at }: { at: 1 | 2 }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
      {t.step(at)}
      <span aria-hidden="true" className="flex gap-1">
        <span className="h-1.5 w-8 rounded-full bg-primary" />
        <span className={`h-1.5 w-8 rounded-full ${at === 2 ? "bg-primary" : "bg-beige"}`} />
      </span>
    </p>
  );
}

function SignInStep({ titleId, date, score, onDone, onClose }: { titleId: string; date: string; score: number; onDone: () => void; onClose: () => void }) {
  const { openSignIn, opening, prepare } = useAccount();
  const [ageOk, setAgeOk] = useAgeOk();
  const [ageError, setAgeError] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // fetch sign-in while the player reads this, so its window opens without a wait
  useEffect(prepare, [prepare]);
  // the sign-in window has opened over the page: step aside so it can be used (a modal pop-up blocks everything else)
  useEffect(() => {
    if (waiting && !opening) onDone();
  }, [waiting, opening, onDone]);

  return (
    <>
      <Steps at={1} />
      <h2 id={titleId} className="mt-2 flex items-center gap-2 font-display text-2xl leading-tight">
        <TrophyIcon className="size-7" /> {t.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t.lead(score)}</p>
      <AgeCheck
        id="age-ok-join"
        ok={ageOk}
        error={ageError}
        onChange={(v) => {
          setAgeOk(v);
          if (v) setAgeError(false);
        }}
      />
      <button
        type="button"
        disabled={waiting}
        onClick={() => {
          if (!ageOk) {
            setAgeError(true);
            return document.getElementById("age-ok-join")?.focus();
          }
          startJoinFlow(date);
          setWaiting(true);
          openSignIn("/daily");
        }}
        className="btn btn-gold btn-lg mt-5 w-full"
      >
        {waiting ? t.opening : t.continue}
      </button>
      <p className="mt-3 text-center text-xs text-muted">{t.private}</p>
      <button type="button" onClick={onClose} className="mx-auto mt-1 flex min-h-11 items-center px-4 text-sm font-semibold text-muted hover:text-ink">
        {t.notNow}
      </button>
    </>
  );
}

function NameStep({ titleId, join, onPosted }: { titleId: string; join: Join; onPosted: () => void }) {
  const { status, setStatus, error, setError, submit } = join;
  const nameRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLInputElement>(null);
  useEffect(() => nameRef.current?.focus(), []);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const name = nameRef.current?.value.trim() ?? "";
        if (name.length < 3) return (setStatus("error"), setError("Use 3 to 16 characters."));
        if (isOffensive(name)) return (setStatus("error"), setError("Please pick a different nickname."));
        if (await submit(name, remindRef.current?.checked ?? false)) onPosted();
      }}
    >
      <Steps at={2} />
      <h2 id={titleId} className="mt-2 font-display text-2xl leading-tight">
        {t.nameTitle}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">{t.nameLead}</p>
      <label htmlFor="join-name" className="sr-only">
        {t.nameLabel}
      </label>
      <input
        id="join-name"
        ref={nameRef}
        maxLength={16}
        autoComplete="nickname"
        placeholder="e.g. MapWizard"
        aria-invalid={status === "error" || undefined}
        aria-describedby="join-name-hint"
        className="mt-4 h-12 w-full rounded-xl border-2 border-line bg-white px-3 text-lg text-ink focus:border-primary"
      />
      <p id="join-name-hint" className="mt-1 text-xs text-muted">
        {t.nameHint}
      </p>
      <label className="mt-4 flex items-start gap-2 text-sm text-ink">
        <input ref={remindRef} type="checkbox" className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>
          {t.remind} <span className="text-muted">{t.optional}</span>
        </span>
      </label>
      <div aria-live="polite">
        {status === "error" && error ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={status === "sending"} className="btn btn-gold btn-lg mt-5 w-full">
        {status === "sending" ? t.posting : t.post}
      </button>
    </form>
  );
}

function DoneStep({ titleId, join, score, onClose }: { titleId: string; join: Join; score: number; onClose: () => void }) {
  const { me, result, top } = join;
  const rows = top?.rows ?? [];
  // the top three, plus your own row if you're further down
  const shown = [...rows.slice(0, 3), ...rows.filter((r) => r.me && r.rank > 3)];
  return (
    <div className="text-center">
      <MarkIcon right className="mx-auto size-12" />
      <h2 id={titleId} className="mt-3 font-display text-3xl leading-tight">
        {result ? t.doneTitle(result.rank) : t.title}
      </h2>
      <p className="mt-2 text-ink-soft">
        <strong className="text-ink">{me?.name}</strong> {t.doneLead(score)}
      </p>
      {result?.duplicate ? <p className="mt-1 text-sm text-muted">{t.duplicate}</p> : null}
      {shown.length ? (
        <ol className="mt-4 space-y-1 text-left text-sm">
          {shown.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${r.me ? "bg-gold-soft font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.name}
                {r.me ? <span className="font-normal text-muted"> (you)</span> : null}
              </span>
              <span className="font-display tabular-nums">{r.score}/5</span>
            </li>
          ))}
        </ol>
      ) : null}
      <button type="button" onClick={onClose} className="btn btn-primary btn-lg mt-5 w-full">
        {t.back}
      </button>
    </div>
  );
}
