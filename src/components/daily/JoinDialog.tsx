"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isOffensive } from "@/lib/name-filter";
import { dailyCopy } from "@/content/daily";
import { FlameIcon, MarkIcon, TrophyIcon } from "@/components/site/Icons";
import { AgeCheck, useAgeOk } from "./AgeCheck";
import { useAccount } from "./SignInProvider";
import type { Join } from "./useJoin";

const t = dailyCopy.joinDialog;

/** 1: the 13+ box and sign-in; 2: pick a nickname; 3: you're on the board. */
export type JoinStep = 1 | 2 | 3;

/** The words for the board being joined (endless mode's Best streaks). */
export type JoinText = {
  title: string;
  lead: string;
  doneTitle: (rank: number) => string;
  doneLead: (score: number) => string;
  duplicate: string;
  /** a board row's score: "4/5", or a streak */
  scoreCell: (score: number) => string;
  back: string;
  /** where "Sign out" lands */
  page: string;
  /** the nickname step's button */
  post: string;
};

/**
 * Set while a player is between step 1 and step 2 (or, saving the daily streak, between the sign-in step and coming back): the sign-in window opens over the page with this pop-up closed (a
 * modal pop-up would block it), and a Google sign-in leaves the page entirely. Back signed in, the pop-up reopens at step 2.
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

export function clearJoinFlow() {
  try {
    sessionStorage.removeItem(FLOW);
  } catch {
    /* storage blocked */
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
 * "Get on the Best streaks board" as one pop-up with clear steps, so nobody misses the next one: a bottom sheet on phones,
 * a box in the middle on wider screens.
 */
export function JoinDialog({
  step,
  onPosted,
  onClose,
  onContinue,
  failed,
  join,
  score,
  text,
}: {
  step: JoinStep | null;
  /** the score is on the board: show step 3 */
  onPosted: () => void;
  onClose: () => void;
  /** step 1 done (13+ ticked): close this pop-up and open the sign-in window */
  onContinue: () => void;
  /** the last sign-in window never opened */
  failed: boolean;
  join: Join;
  score: number;
  text: JoinText;
}) {
  const titleId = useId();
  return (
    <Sheet step={step} titleId={titleId} onClose={onClose}>
      {step === 1 ? <SignInStep titleId={titleId} title={text.title} lead={text.lead} steps failed={failed} onContinue={onContinue} onClose={onClose} /> : null}
      {step === 2 ? <NameStep titleId={titleId} join={join} text={text} onPosted={onPosted} /> : null}
      {step === 3 ? <DoneStep titleId={titleId} join={join} score={score} text={text} onClose={onClose} /> : null}
    </Sheet>
  );
}

/** The 13+ box and sign-in on their own (saving the daily streak: no nickname, no board). */
export function SignInSheet({
  open,
  title,
  lead,
  failed,
  onContinue,
  onClose,
}: {
  open: boolean;
  title: string;
  lead: string;
  failed: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Sheet step={open ? 1 : null} titleId={titleId} onClose={onClose}>
      {open ? <SignInStep titleId={titleId} title={title} lead={lead} failed={failed} onContinue={onContinue} onClose={onClose} /> : null}
    </Sheet>
  );
}

/** The pop-up itself, open while `step` is set. */
function Sheet({ step, titleId, onClose, children }: { step: JoinStep | null; titleId: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (step && !d.open) d.showModal();
    if (!step && d.open) d.close();
    // each step starts on its title (or the nickname field), so screen readers hear where they are
    if (step) requestAnimationFrame(() => d.querySelector<HTMLElement>("[data-start]")?.focus());
  }, [step]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // a tap on the dimmed page around the pop-up closes it
      onClick={(e) => e.target === ref.current && onClose()}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-[28px] bg-white p-0 text-ink shadow-[0_-8px_30px_rgba(29,33,64,0.25)] md:inset-0 md:m-auto md:h-fit md:max-w-md md:rounded-[28px] md:shadow-[0_16px_48px_rgba(29,33,64,0.3)]"
    >
      <div className="relative p-5 pb-7 sm:p-6">
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line md:hidden" />
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-full text-muted hover:bg-beige hover:text-ink"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
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

function SignInStep({
  titleId,
  title,
  lead,
  steps = false,
  failed,
  onContinue,
  onClose,
}: {
  titleId: string;
  title: string;
  lead: string;
  /** "Step 1 of 2" above the title, when a nickname step follows */
  steps?: boolean;
  failed: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { prepare } = useAccount();
  const [ageOk, setAgeOk] = useAgeOk();
  const [ageError, setAgeError] = useState(false);
  // fetch sign-in while the player reads this, so its window opens without a wait
  useEffect(prepare, [prepare]);

  return (
    <>
      {steps ? <Steps at={1} /> : null}
      <h2 id={titleId} data-start tabIndex={-1} className={`${steps ? "mt-2" : ""} flex items-center gap-2 pr-10 font-display text-2xl leading-tight outline-none`}>
        {steps ? <TrophyIcon className="size-7" /> : <FlameIcon className="size-7" />} {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{lead}</p>
      <AgeCheck
        id="age-ok-join"
        ok={ageOk}
        error={ageError}
        onChange={(v) => {
          setAgeOk(v);
          if (v) setAgeError(false);
        }}
      />
      {failed ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {t.failed}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (!ageOk) {
            setAgeError(true);
            return document.getElementById("age-ok-join")?.focus();
          }
          onContinue();
        }}
        className="btn btn-gold btn-lg mt-5 w-full"
      >
        {failed ? t.retry : t.continue}
      </button>
      <p className="mt-3 text-center text-xs text-muted">{t.private}</p>
      <button type="button" onClick={onClose} className="mx-auto mt-1 flex min-h-11 items-center px-4 text-sm font-semibold text-muted hover:text-ink">
        {t.notNow}
      </button>
    </>
  );
}

function NameStep({ titleId, join, text, onPosted }: { titleId: string; join: Join; text: JoinText; onPosted: () => void }) {
  const { status, setStatus, error, setError, submit } = join;
  const { signOut } = useAccount();
  const nameRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLInputElement>(null);

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
      <h2 id={titleId} className="mt-2 pr-10 font-display text-2xl leading-tight">
        {t.nameTitle}
      </h2>
      <p className="mt-2 text-sm text-ink-soft">{t.nameLead}</p>
      <label htmlFor="join-name" className="sr-only">
        {t.nameLabel}
      </label>
      <input
        id="join-name"
        data-start
        ref={nameRef}
        maxLength={16}
        autoComplete="nickname"
        enterKeyHint="done"
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
        {status === "sending" ? t.posting : text.post}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        {t.notYou}{" "}
        <button type="button" onClick={() => signOut(text.page)} className="min-h-11 font-semibold text-primary hover:underline">
          {t.signOut}
        </button>
      </p>
    </form>
  );
}

function DoneStep({ titleId, join, score, text, onClose }: { titleId: string; join: Join; score: number; text: JoinText; onClose: () => void }) {
  const { me, result, top, status, error, submit } = join;
  // back from Google with a nickname, the score is still being posted: say so, and offer a retry if it fails
  if (!result)
    return (
      <div className="text-center">
        <h2 id={titleId} data-start tabIndex={-1} className="mt-2 px-8 font-display text-2xl leading-tight outline-none">
          {text.title}
        </h2>
        <div aria-live="polite">
          {status === "error" ? (
            <>
              <p role="alert" className="mt-3 text-sm font-semibold text-danger">
                {error}
              </p>
              {me?.name ? (
                <button type="button" onClick={() => submit(me.name!)} className="btn btn-gold btn-lg mt-5 w-full">
                  {t.retry}
                </button>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-ink-soft">{t.posting}</p>
          )}
        </div>
      </div>
    );
  const rows = top?.rows ?? [];
  // the top three, plus your own row if you're further down (in the top five, or below it)
  const mine = rows.find((r) => r.me) ?? top?.me;
  const shown = [...rows.slice(0, 3), ...(mine && mine.rank > 3 ? [mine] : [])];
  return (
    <div className="text-center">
      <MarkIcon right className="mx-auto size-12" />
      <h2 id={titleId} data-start tabIndex={-1} className="mt-3 font-display text-3xl leading-tight outline-none">
        {text.doneTitle(result.rank)}
      </h2>
      <p className="mt-2 text-ink-soft">
        <strong className="text-ink">{me?.name}</strong> {text.doneLead(result.score ?? score)}
      </p>
      {result.duplicate ? <p className="mt-1 text-sm text-muted">{text.duplicate}</p> : null}
      {shown.length ? (
        <ol className="mt-4 space-y-1 text-left text-sm">
          {shown.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${r.me ? "bg-gold-soft font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.name}
                {r.me ? <span className="font-normal text-muted"> (you)</span> : null}
              </span>
              <span className="font-display tabular-nums">{text.scoreCell(r.score)}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <button type="button" onClick={onClose} className="btn btn-primary btn-lg mt-5 w-full">
        {text.back}
      </button>
    </div>
  );
}
