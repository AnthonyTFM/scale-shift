"use client";

import { useEffect, useRef, useState } from "react";
import { finishedPicks, localDateKey, mergeDays } from "@/lib/daily";
import type { LinkResult } from "@/lib/leaderboard-types";
import { adoptPlayer, loadPlayer, type Player } from "@/lib/player";
import { track } from "@/lib/analytics";

const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * Same player on every device. On the device that joined: "Play on another device" shows a one-time code (and a link
 * with it). On the new device: enter the code and this browser becomes that player, with their results so far.
 * `redeemOnly` shows just the code box, folded away (for the sign-up form after a round).
 */
export function DeviceLink({ redeemOnly = false }: { redeemOnly?: boolean }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [made, setMade] = useState<{ code: string; until: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const redeem = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/leaderboard/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem", code, today: localDateKey() }),
      });
      const data = (await res.json()) as LinkResult;
      if (!data.ok) return setError(data.error);
      if (!("player" in data)) return setError("That code didn't work.");
      adoptPlayer(data.player);
      mergeDays(data.days);
      track("device_linked");
      setDone(`You're signed in as ${data.player.name} on this device.`);
      if (location.hash.startsWith("#link=")) history.replaceState(null, "", location.pathname);
      // refresh so the scores, streak and leaderboard on the page all show the linked player
      setTimeout(() => location.reload(), 1200);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const make = async (p: Player) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/leaderboard/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", player: p.id, today: localDateKey(), days: finishedPicks() }),
      });
      const data = (await res.json()) as LinkResult;
      if (!data.ok) return setError(data.error);
      if (!("code" in data)) return setError("Couldn't make a code. Please try again.");
      setMade({ code: data.code, until: Date.now() + data.expiresIn * 1000 });
      track("device_link_code");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const p = loadPlayer();
    // only a player with a score on the board really joined (a refused sign-up leaves a nickname in this browser only)
    if (p)
      fetch(`/api/leaderboard?scope=all&limit=1&player=${p.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b: { me?: unknown } | null) => setPlayer(b?.me ? p : null))
        .catch(() => setPlayer(p));
    // opened from a "play on another device" link: fill in the code (and use it straight away on a fresh device)
    const m = location.hash.match(/^#link=([A-Za-z0-9-]{8,9})$/);
    if (m) {
      queueMicrotask(() => {
        setOpen(true);
        if (codeRef.current) codeRef.current.value = m[1].toUpperCase();
      });
      if (!p) redeem(m[1]);
    }
  }, []);

  useEffect(() => {
    if (!made) return;
    const tick = () => {
      const s = Math.max(0, Math.round((made.until - Date.now()) / 1000));
      setLeft(s);
      if (!s) setMade(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [made]);

  const codeForm = (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const code = codeRef.current?.value ?? "";
        // (after a round, a refused sign-up leaves an unconfirmed nickname behind: nothing to lose by switching)
        if (player && !redeemOnly && !confirm(`This device is signed in as ${player.name}. Switch to the player this code belongs to?`)) return;
        redeem(code);
      }}
    >
      <label htmlFor="link-code" className="sr-only">
        Link code
      </label>
      <input
        id="link-code"
        ref={codeRef}
        placeholder="ABCD-EFGH"
        maxLength={9}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 font-mono uppercase tracking-widest text-ink"
      />
      <button type="submit" disabled={busy} className="h-11 shrink-0 rounded-lg bg-panel px-4 font-bold text-panel-text hover:bg-panel-2 disabled:opacity-60">
        {busy ? "Linking…" : "Link"}
      </button>
    </form>
  );

  const status = (
    <div aria-live="polite">
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {done ? <p className="mt-2 text-sm font-semibold text-formal">✓ {done}</p> : null}
    </div>
  );

  // shown with the sign-up form, so also when a sign-up here was refused ("email already on the leaderboard")
  if (redeemOnly) {
    return (
      <div className="mt-3 border-t border-amber-200 pt-3">
        {open ? (
          <>
            <p className="text-sm text-ink-soft">
              On the device you joined with, open the leaderboard and tap <strong>Play on another device</strong>. Enter the code here.
            </p>
            {codeForm}
            {status}
          </>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-link hover:underline">
            Already on the leaderboard from another device? Link this one →
          </button>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="devices" className="rounded-card border border-line bg-white p-5">
      <h2 id="devices" className="font-display text-xl text-ink">
        📱 Play on all your devices
      </h2>
      {player ? (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            You&apos;re <strong className="text-ink">{player.name}</strong> on this device. To be {player.name} on your phone or another computer too,
            get a one-time code and enter it there.
          </p>
          {made ? (
            <div className="mt-3 rounded-lg bg-paper p-3 text-center ring-1 ring-line">
              <p className="font-mono text-3xl font-bold tracking-[0.2em] text-ink">{pretty(made.code)}</p>
              <p className="mt-1 text-xs text-muted">
                On your other device, open {location.host}/leaderboard and enter this code. Works once, expires in{" "}
                <span className="font-mono">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                </span>
                .
              </p>
              <button
                type="button"
                onClick={async () => {
                  const url = `${location.origin}/leaderboard#link=${made.code}`;
                  try {
                    if (navigator.share) await navigator.share({ title: "Sign in on this device", url });
                    else {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                    }
                  } catch {
                    /* share sheet closed */
                  }
                }}
                className="mt-2 text-sm font-semibold text-link hover:underline"
              >
                {copied ? "Link copied. Open it on your other device." : "Or send yourself a sign-in link →"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => make(player)}
              className="mt-3 h-11 rounded-lg bg-panel px-4 font-bold text-panel-text hover:bg-panel-2 disabled:opacity-60"
            >
              {busy ? "Making a code…" : "Play on another device"}
            </button>
          )}
          {status}
          <details className="mt-3 text-sm" open={open}>
            <summary className="cursor-pointer text-muted">Have a code from another device?</summary>
            {codeForm}
          </details>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Already on the leaderboard from another device? There, open this page and tap <strong>Play on another device</strong>, then enter the
            code here. Your nickname, scores and streak come with you.
          </p>
          {codeForm}
          {status}
        </>
      )}
    </section>
  );
}
