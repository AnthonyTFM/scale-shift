"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, rememberPlayer } from "@/lib/player";
import { track } from "@/lib/analytics";
import { signInOn } from "@/lib/sign-in";
import { useAccount } from "./SignInProvider";
import { clearJoinFlow, SignInSheet, startJoinFlow, takeJoinFlow } from "./JoinDialog";
import { dailyCopy } from "@/content/daily";
import { accountCopy } from "@/content/account";
import { useAccountInfo } from "./useAccountInfo";
import { WelcomeSheet } from "./WelcomeSheet";
import { FlameIcon, MarkIcon } from "@/components/site/Icons";

const t = dailyCopy.save;

type Props = { date: string; choices: number[] };

/**
 * After the daily round. Daily scores are private, the way Wordle's are: there is no public daily board. Signing in is
 * what keeps your streak and results on every device, so that's the offer. Signed in, today's score is saved straight
 * away (no nickname needed). The first time, a pop-up welcomes them and offers a username and reminder emails (see
 * WelcomeSheet); after that, both live on the account page. Without sign-in (running locally without Clerk), the streak
 * lives in this browser only.
 */
export function SaveStreak(props: Props) {
  return signInOn ? <Save {...props} /> : null;
}

function Save({ date, choices }: Props) {
  const { isLoaded, isSignedIn, openSignIn, opening, openFailed } = useAccount();
  // loaded after each save (the player surely exists by then), not on sign-in as well, so two answers can't race
  const { info, refresh, saveName, saveReminders, markWelcomed } = useAccountInfo({ auto: false });
  // the one-time welcome pop-up, for this player
  const [welcome, setWelcome] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // between "Continue" and the sign-in window (the pop-up is closed meanwhile), and whether that window failed to open
  const [awaiting, setAwaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const sent = useRef(false);
  const card = useRef<HTMLDivElement>(null);

  const save = async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `player` only matters for a brand-new player: it keeps the scores this browser already saved
        body: JSON.stringify({ player: loadPlayer()?.id ?? "", date, choices, website: "" }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!data.ok) {
        setError(data.error);
        return setStatus("error");
      }
      if (data.player) rememberPlayer(data.player);
      setStatus("saved");
      if (!data.duplicate) track("streak_saved");
      // now that the player surely exists: a player with no username who hasn't been welcomed (on any device) gets the
      // welcome pop-up, once; it's marked as seen as it opens, so a closed tab doesn't bring it back
      const me = await refresh();
      if (me && !me.name && !me.welcomed) {
        setWelcome(me.id);
        markWelcomed();
      }
    } catch {
      setError(t.failed);
      setStatus("error");
    }
  };

  // signed in: save today's score once; signed out (the page stays): the next sign-in saves again
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      sent.current = false;
      queueMicrotask(() => {
        setStatus("idle");
        setWelcome(null);
      });
      return;
    }
    if (sent.current) return;
    sent.current = true;
    queueMicrotask(save);
    // back from the sign-in window (or from Google, a fresh page load): land on the card that now says it's saved
    if (takeJoinFlow(date)) requestAnimationFrame(() => card.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, date]);

  // the sign-in window never opened (blocked or offline): bring the pop-up back with a retry
  useEffect(() => {
    if (!awaiting || !openFailed) return;
    clearJoinFlow();
    queueMicrotask(() => {
      setAwaiting(false);
      setFailed(true);
      setOpen(true);
    });
  }, [awaiting, openFailed]);

  const sheet = (
    <SignInSheet
      open={open}
      title={t.title}
      lead={t.lead}
      failed={failed}
      // also runs when Continue closes the pop-up on the way to sign-in: only a close by the player ends the flow
      onClose={() => {
        if (open) clearJoinFlow();
        setOpen(false);
      }}
      onContinue={() => {
        startJoinFlow(date);
        setFailed(false);
        // close first, then open sign-in a frame later: while this modal pop-up is open, Clerk's window couldn't take focus
        setOpen(false);
        requestAnimationFrame(() => {
          openSignIn(window.location.pathname);
          setAwaiting(true);
        });
      }}
    />
  );

  // still finding out who's signed in: hold the space
  if (!isLoaded) return <div className="mt-5 h-[86px]" aria-hidden="true" />;

  if (isSignedIn)
    return (
      <div ref={card} tabIndex={-1} className="mt-5 rounded-[20px] border-2 border-line bg-paper px-4 py-3 outline-none">
        <div aria-live="polite">
          {status === "error" ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error || t.failed}{" "}
              <button type="button" onClick={save} className="min-h-11 font-semibold text-primary hover:underline">
                {t.retry}
              </button>
            </p>
          ) : status === "saved" ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <MarkIcon right className="size-6" />
              <p className="min-w-0 flex-1">
                <span className="block font-display text-base leading-tight text-ink">{accountCopy.saved}</span>
                {info?.name ? <span className="block text-xs text-muted">{accountCopy.savedAs(info.name)}</span> : null}
              </p>
              <Link href="/account" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">
                {accountCopy.manage} <span aria-hidden="true">&nbsp;→</span>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted">{t.saving}</p>
          )}
        </div>
        <WelcomeSheet
          player={welcome}
          onSaveName={saveName}
          onSaveReminders={saveReminders}
          onClose={() => {
            setWelcome(null);
            requestAnimationFrame(() => card.current?.focus());
          }}
        />
      </div>
    );

  return (
    <>
      <div className="mt-5 flex items-center gap-3 rounded-[22px] border-2 border-primary bg-primary-soft py-3 pl-4 pr-3 shadow-[0_6px_0_0_var(--color-primary-shadow)]">
        <FlameIcon className="size-9 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight text-ink">{t.cta}</span>
          <span className="block text-sm text-muted">{t.hint}</span>
        </span>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            track("streak_save_open");
            setFailed(false);
            setAwaiting(false);
            setOpen(true);
          }}
          disabled={awaiting && opening}
          className="btn btn-primary mb-1.5 h-12 shrink-0 px-5"
        >
          {awaiting && opening ? dailyCopy.joinDialog.opening : t.button}
        </button>
      </div>
      {sheet}
    </>
  );
}
