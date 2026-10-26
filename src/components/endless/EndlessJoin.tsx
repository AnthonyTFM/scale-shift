"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { EndlessBoard, EndlessSubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer } from "@/lib/player";
import { track } from "@/lib/analytics";
import { signInOn } from "@/lib/sign-in";
import { endlessCopy } from "@/content/endless";
import { TrophyIcon } from "@/components/site/Icons";
import { useAccount } from "@/components/daily/SignInProvider";
import { clearJoinFlow, JoinDialog, startJoinFlow, takeJoinFlow, type JoinStep, type JoinText } from "@/components/daily/JoinDialog";
import { useJoinTo } from "@/components/daily/useJoin";

const t = endlessCopy.board;

/** A finished run the server handed out, ready to post. */
type Props = { seed: string; token: string; choices: number[]; streak: number };

const dayOf = (seed: string) => seed.slice(0, 10);
const boardUrl = (seed: string, id: string) => `/api/endless?scope=day&date=${dayOf(seed)}&limit=5&player=${id}`;

/**
 * After an endless run: put the streak on the Best streaks board. Players already on the leaderboard (signed in, with a
 * nickname) are posted straight away; others join through the same pop-up as the daily.
 */
export function EndlessJoin(props: Props) {
  return signInOn ? <SignedIn {...props} /> : <SavedPlayer {...props} />;
}

function SignedIn({ seed, token, choices, streak }: Props) {
  const { isLoaded, isSignedIn, openSignIn, opening, openFailed, signOut } = useAccount();
  const join = useJoinTo<EndlessSubmitResult>({ endpoint: "/api/endless", payload: { seed, token, choices }, board: (id) => boardUrl(seed, id) });
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
        if (step === 1) clearJoinFlow();
        setStep(null);
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
          <span className="block font-display text-lg leading-tight text-ink">{t.joinCta}</span>
          <span className="block text-sm text-muted">{t.joinHint}</span>
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
          {awaiting && opening ? t.opening : t.join}
        </button>
      </div>
      {dialog}
    </>
  );
}

/** Sign-in off (local development): a browser that joined the daily's leaderboard posts its runs with that player. */
function SavedPlayer({ seed, token, choices }: Props) {
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
      const top = await fetch(boardUrl(seed, p.id)).then((r) => (r.ok ? (r.json() as Promise<EndlessBoard>) : null));
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
  if (!joined) return <p className="mt-5 rounded-[20px] border-2 border-line bg-paper p-4 text-sm text-ink-soft">{t.joinFromDaily}</p>;
  return <Posted status={state.status} error={state.error} result={state.result} top={state.top} onRetry={post} />;
}

/** Where the streak landed: today's rank, the all-time rank, and today's top five. */
function Posted({
  status,
  error,
  result,
  top,
  onRetry,
  footer,
}: {
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
        <h3 className="flex items-center gap-1.5 whitespace-nowrap font-display text-[15px] text-ink min-[400px]:text-lg sm:gap-2 sm:text-xl">
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
              <strong className="text-lg">{t.rankToday(result.rank, result.total)}</strong>
            </p>
            <p className="text-sm text-ink-soft">{t.rankAll(result.allRank, result.best)}</p>
            {result.duplicate ? <p className="mt-1 text-sm text-muted">{t.better(result.score)}</p> : null}
          </>
        ) : null}
      </div>
      {top?.rows.length ? (
        <ol className="mt-3 space-y-1 text-sm">
          {top.rows.map((r) => (
            <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.me ? "bg-gold-soft font-bold" : ""}`}>
              <span className="w-6 text-right text-muted">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.name}
                {r.me ? <span className="font-normal text-muted"> (you)</span> : null}
              </span>
              <span className="font-display tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {footer}
    </div>
  );
}
