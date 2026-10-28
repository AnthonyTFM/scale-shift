"use client";

import { useEffect, useState } from "react";
import { loadPlayer, rememberPlayer } from "@/lib/player";
import { accountCopy as A } from "@/content/account";
import { useAccount } from "./SignInProvider";

export type AccountInfo = { id: string; name: string | null; reminders: boolean } | null;

/**
 * The signed-in player's username and reminder setting (undefined while loading, null for an account that has never
 * played), and saving either. Used by the one-time welcome pop-up and the account page.
 */
export function useAccountInfo() {
  const { isLoaded, isSignedIn } = useAccount();
  const [info, setInfo] = useState<AccountInfo | undefined>(undefined);

  const refresh = () =>
    fetch("/api/leaderboard/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { player?: AccountInfo } | null) => {
        const p = d?.player ?? null;
        if (p) rememberPlayer({ id: p.id, name: p.name });
        setInfo(p);
        return p;
      })
      .catch(() => {
        setInfo(null);
        return null;
      });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      queueMicrotask(() => setInfo(undefined));
      return;
    }
    refresh();
  }, [isLoaded, isSignedIn]);

  /** Resolves to an error message, or "" once saved. */
  const saveName = async (name: string): Promise<string> => {
    try {
      const res = await fetch("/api/leaderboard/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: loadPlayer()?.id ?? "", name }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string; player?: { id: string; name: string } };
      if (!d.ok || !d.player) return d.error ?? A.errors.generic;
      rememberPlayer(d.player);
      setInfo((i) => ({ id: d.player!.id, name: d.player!.name, reminders: i?.reminders ?? false }));
      return "";
    } catch {
      return A.errors.network;
    }
  };

  /** Resolves to an error message, or "" once saved. */
  const saveReminders = async (on: boolean): Promise<string> => {
    try {
      const res = await fetch("/api/leaderboard/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: loadPlayer()?.id ?? "", on }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) return d.error ?? A.errors.generic;
      setInfo((i) => (i ? { ...i, reminders: on } : i));
      return "";
    } catch {
      return A.errors.network;
    }
  };

  return { info, refresh, saveName, saveReminders };
}
