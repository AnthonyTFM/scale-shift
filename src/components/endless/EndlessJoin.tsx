"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DayRow, EndlessBoard, EndlessSubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, playerId } from "@/lib/player";
import { track } from "@/lib/analytics";
import { signInOn } from "@/lib/sign-in";
import { endlessCopy } from "@/content/endless";
import { TrophyIcon } from "@/components/site/Icons";
import { useAccount } from "@/components/daily/SignInProvider";
import { clearJoinFlow, JoinDialog, startJoinFlow, takeJoinFlow, type JoinStep, type JoinText } from "@/components/daily/JoinDialog";
import { useJoinTo } from "@/components/daily/useJoin";

const t = endlessCopy.board;

/** A finished run the server handed out, ready to post. */
type Props = { seed: string; token: string; choices: number[]; streak: number; /** where this run would land: undefined while it loads, null if it couldn't be read */ wouldRank?: number | null };

// the all-time Best streaks board's top five, with this player marked
const boardUrl = (id: string) => `/api/endless?scope=all&limit=5&player=${id}`;

/**
 * After an endless run: put the streak on the Best streaks board. Players already on the leaderboard (signed in, with a
 * nickname) are posted straight away; others join through the same pop-up as the daily.
 */
export function EndlessJoin(props: Props) {
  return signInOn ? <SignedIn {...props} /> : <SavedPlayer {...props} />;
}

function SignedIn({ seed, token, choices, streak, wouldRank }: Props) {
  const { isLoaded, isSignedIn, openSignIn, opening, openFailed, signOut } = useAccount();
  const join = useJoinTo<EndlessSubmitResult>({ endpoint: "/api/endless", payload: { seed, token, choices }, board: boardUrl });
  const [step, setStep] = useState<JoinStep | null>(null);
  const [awaiting, setAwaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const resumed = useRef(false);
  const flow = `endless:${seed}`;

  // back from the sign-in window (or from Google, a fresh page load): carry on at step 2, or show where you landed
  useEffect(() => {
    if (isLoaded && !isSignedIn) resumed.current = false;
    if (!isLoaded || !isSignedIn || join.me === undefined || resumed.current) return;
    resumed.current = true;
    if (takeJoinFlow(flow)) queueMicrotask(() => setStep(join.me?.name ? 3 : 2));
  }, [isLoaded, isSignedIn, join.me, flow]);

  // the sign-in window never opened (blocked or offline): bring the pop-up back with a retry
  useEffect(() => {
    if (!awaiting || !openFailed) return;
    clearJoinFlow();
    queueMicrotask(() => {
      setAwaiting(false);
      setFailed(true);
      setStep(1);
    });
  }, [awaiting, openFailed]);

  const text: JoinText = { ...t.dialog, lead: t.dialog.lead(streak), scoreCell: String, page: "/endless" };
  const dialog = (
    <JoinDialog
      step={step}
      onPosted={() => setStep((s) => (s ? 3 : s))}
      onClose={() => {
        const wasDone = step === 3;
        if (step === 1) clearJoinFlow();
        setStep(null);
        // the Join button that opened this has gone: land on the card that now shows the rank
        if (wasDone) requestAnimationFrame(() => document.getElementById("endless-board-h")?.focus());
      }}
      onContinue={() => {
        startJoinFlow(flow);
        setFailed(false);
        // as on the daily: close this modal first, so Clerk's window can take focus
        setStep(null);
        requestAnimationFrame(() => {
          openSignIn(window.location.pathname);
          setAwaiting(true);
        });
      }}
      failed={failed}
      join={join}
      score={streak}
      text={text}
    />
  );

  // still finding out who's signed in: hold the space
  if (!isLoaded || (isSignedIn && join.me === undefined)) return <div className="mt-5 h-[86px]" aria-hidden="true" />;
  if (isSignedIn && join.me?.name && step !== 2)
    return (
      <>
        <Posted
          streak={streak}
          status={join.status}
          error={join.error}
          result={join.result}
          top={join.top as EndlessBoard | null}
          onRetry={() => join.me?.name && join.submit(join.me.name)}
          footer={
            <p className="mt-3 text-xs text-muted">
              {t.signedIn}{" "}
              <button type="button" onClick={() => signOut("/endless")} className="font-semibold text-primary hover:underline">
                {t.signOut}
              </button>
            </p>
          }
        />
        {dialog}
      </>
    );
  return (
    <>
      <div className="mt-5 flex items-center gap-3 rounded-[22px] border-2 border-primary bg-primary-soft py-3 pl-4 pr-3 shadow-[0_6px_0_0_var(--color-primary-shadow)]">
        <TrophyIcon className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight text-ink">{wouldRank ? t.joinWould(wouldRank) : t.joinCta}</span>
          <span className="block text-sm text-muted">{wouldRank ? (isSignedIn ? t.joinWouldName : t.joinWouldHint) : t.joinHint}</span>
        </span>
        <button
          type="button"
          aria-haspopup="dialog"
          disabled={awaiting && opening}
          onClick={() => {
            track("leaderboard_join_open", { board: "endless" });
            join.setStatus("idle");
            join.setError("");
            setFailed(false);
            setAwaiting(false);
            setStep(isSignedIn ? 2 : 1);
          }}
          className="btn btn-primary mb-1.5 h-12 shrink-0 px-6"
        >
          {awaiting && opening ? t.opening : wouldRank ? t.joinPost : t.join}
        </button>
      </div>
      <RunBoard streak={streak} rank={wouldRank} />
      {dialog}
    </>
  );
}

/** Sign-in off (local development): a browser that joined the daily's leaderboard posts its runs with that player. */
function SavedPlayer({ seed, token, choices, streak, wouldRank }: Props) {
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; error: string; result: Extract<EndlessSubmitResult, { ok: true }> | null; top: EndlessBoard | null }>({
    status: "idle",
    error: "",
    result: null,
    top: null,
  });
  const [joined, setJoined] = useState<boolean | undefined>(undefined);
  const sent = useRef(false);

  const post = async () => {
    const p = loadPlayer();
    if (!p) return;
    setState((s) => ({ ...s, status: "sending", error: "" }));
    try {
      const res = await fetch("/api/endless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: p.id, name: p.name, email: p.email ?? "", seed, token, choices, website: "" }),
      });
      const data = (await res.json()) as EndlessSubmitResult;
      if (!data.ok) return setState((s) => ({ ...s, status: "error", error: data.error }));
      const top = await fetch(boardUrl(p.id)).then((r) => (r.ok ? (r.json() as Promise<EndlessBoard>) : null));
      setState({ status: "done", error: "", result: data, top });
    } catch {
      setState((s) => ({ ...s, status: "error", error: "Couldn't reach the leaderboard. Check your connection and try again." }));
    }
  };

  useEffect(() => {
    const p = loadPlayer();
    queueMicrotask(() => setJoined(!!p));
    if (!p || sent.current) return;
    sent.current = true;
    post();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (joined === undefined) return <div className="mt-5 h-[86px]" aria-hidden="true" />;
  if (!joined)
    return (
      <>
        <p className="mt-5 rounded-[20px] border-2 border-line bg-paper p-4 text-sm text-ink-soft">{t.joinFromDaily}</p>
        <RunBoard streak={streak} rank={wouldRank} />
      </>
    );
  return <Posted streak={streak} status={state.status} error={state.error} result={state.result} top={state.top} onRetry={post} />;
}

/**
 * The Best streaks top five for a run that isn't on the board (yet), so everyone sees the competition: this run is
 * slotted in where it would land (`rank`), or added under the five when it lands further down. `rank` is undefined
 * while it loads and null when it couldn't be read (or the run scored 0): the board shows without the run then.
 */
export function RunBoard({ streak, rank }: { streak: number; rank: number | null | undefined }) {
  const [top, setTop] = useState<EndlessBoard | null | undefined>(undefined);

  useEffect(() => {
    // one extra row, in case the player's own earlier best is in the five: it's left out, as this run would replace it
    const id = playerId();
    fetch(`/api/endless?scope=all&limit=6${id ? `&player=${encodeURIComponent(id)}` : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<EndlessBoard>) : null))
      .then((b) => setTop(b && Array.isArray(b.rows) ? b : null))
      .catch(() => setTop(null));
  }, []);

  const rows = (() => {
    if (!top) return [];
    const mine = top.me ?? top.rows.find((r) => r.me);
    // everyone else, ranked as if the player's earlier best weren't there (as `rank` is)
    const others = top.rows.filter((r) => !r.me).map((r) => ({ ...r, rank: r.rank - (mine && mine.score > r.score ? 1 : 0) }));
    if (!(streak > 0 && rank)) return others.slice(0, 5);
    // after everyone tied with it: whoever got there first is listed first
    const run = { rank, name: t.thisRun, score: streak, me: true };
    const at = others.filter((r) => r.score >= streak).length;
    return at < 5 ? [...others.slice(0, at), run, ...others.slice(at)].slice(0, 5) : [...others.slice(0, 5), run];
  })();

  return (
    <div className="mt-3 rounded-[20px] border-2 border-line bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] text-ink min-[400px]:text-lg sm:gap-2 sm:text-xl">
          <TrophyIcon className="size-5 min-[400px]:size-6 sm:size-7" /> {t.title}
        </h3>
        <Link href="/leaderboard#endless" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
          {t.seeAll} →
        </Link>
      </div>
      {top === undefined || (streak > 0 && rank === undefined) ? (
        <ul aria-hidden="true" className="mt-3 space-y-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="h-7 animate-pulse rounded-md bg-beige" />
          ))}
        </ul>
      ) : top === null ? (
        <p className="mt-2 text-sm text-muted">{t.boardFailed}</p>
      ) : rows.length ? (
        <BoardRows rows={rows} gapBeforeLast={rows.length > 5} />
      ) : (
        <p className="mt-2 text-sm text-muted">{t.boardEmpty}</p>
      )}
    </div>
  );
}

/** The board's rows; the highlighted one is you (or this run). A gap marks the jump when your row is further down. */
function BoardRows({ rows, gapBeforeLast = false, you = "" }: { rows: DayRow[]; gapBeforeLast?: boolean; you?: string }) {
  return (
    <ol className="mt-3 space-y-1 text-sm">
      {rows.map((r, i) => (
        <li
          key={i}
          className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-gold-soft font-bold" : ""} ${gapBeforeLast && i === rows.length - 1 ? "mt-2 border-t border-dashed border-line pt-2" : ""}`}
        >
          <span className="w-6 text-right text-muted">{r.rank}</span>
          <span className="min-w-0 flex-1 truncate">
            {r.name}
            {r.me && you ? <span className="font-normal text-muted"> {you}</span> : null}
          </span>
          <span className="font-display tabular-nums">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}

/** Where the streak landed: the player's best of all time, its rank, and the all-time top five. */
function Posted({
  streak,
  status,
  error,
  result,
  top,
  onRetry,
  footer,
}: {
  /** this run's streak (the board shows the player's best, which may be an earlier run) */
  streak: number;
  status: "idle" | "sending" | "done" | "error";
  error: string;
  result: Extract<EndlessSubmitResult, { ok: true }> | null;
  top: EndlessBoard | null;
  onRetry: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-[20px] border-2 border-line bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="endless-board-h"
          tabIndex={-1}
          className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] text-ink outline-none min-[400px]:text-lg sm:gap-2 sm:text-xl"
        >
          <TrophyIcon className="size-5 min-[400px]:size-6 sm:size-7" /> {t.title}
        </h3>
        <Link href="/leaderboard#endless" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
          {t.seeAll} →
        </Link>
      </div>
      <div aria-live="polite">
        {status === "sending" ? <p className="mt-2 text-sm text-muted">{t.posting}</p> : null}
        {status === "error" ? (
          <p role="alert" className="mt-2 text-sm font-semibold text-danger">
            {error}{" "}
            <button type="button" onClick={onRetry} className="min-h-11 font-semibold text-primary hover:underline">
              {t.retry}
            </button>
          </p>
        ) : null}
        {result ? (
          <>
            <p className="mt-2 text-ink">
              <strong className="text-lg">{t.rank(result.rank, result.total)}</strong>
            </p>
            <p className="text-sm text-ink-soft">{result.duplicate ? t.better(streak, result.score) : t.yourBest(result.score)}</p>
          </>
        ) : null}
      </div>
      {top?.rows.length ? (
        // the top five, plus your own row if you're further down
        <BoardRows rows={[...top.rows, ...(top.me && !top.rows.some((r) => r.me) ? [top.me] : [])]} gapBeforeLast={!!top.me && !top.rows.some((r) => r.me)} you={t.you} />
      ) : null}
      {footer}
    </div>
  );
}
