"use client";

import { useEffect, useRef, useState } from "react";
import type { DayBoard, SubmitResult } from "@/lib/leaderboard-types";
import { loadPlayer, rememberPlayer } from "@/lib/player";
import { track } from "@/lib/analytics";
import { useAccount } from "./SignInProvider";

export type Me = { id: string; name: string | null; reminders: boolean } | null;

/** Fired on window once today's score is on the board, so the results card can show the real rank. */
export const POSTED_EVENT = "lb-posted";
export type Posted = { date: string; rank: number; total: number };
export const announcePosted = (detail: Posted) => window.dispatchEvent(new CustomEvent<Posted>(POSTED_EVENT, { detail }));
export type Join = ReturnType<typeof useJoin>;

/**
 * Getting today's score on the leaderboard with sign-in on: who the signed-in player is, posting the score (a returning
 * player's posts straight away), the reminder emails and today's top five. Shared by the results card and the join pop-up.
 */
export function useJoin(date: string, choices: number[]) {
  const { isLoaded, isSignedIn } = useAccount();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Extract<SubmitResult, { ok: true }> | null>(null);
  const [top, setTop] = useState<DayBoard | null>(null);
  const [remindNote, setRemindNote] = useState("");
  const sent = useRef(false);

  // updates go through the latest `me` (a functional update): a first-time player's `me` is set in the same tick as this
  // runs, and restoring a captured copy would wipe a player whose score is already on the board
  const saveReminders = async (on: boolean) => {
    setRemindNote("");
    setMe((m) => m && { ...m, reminders: on });
    const undo = (note: string) => {
      setMe((m) => m && { ...m, reminders: !on });
      setRemindNote(note);
    };
    try {
      const res = await fetch("/api/leaderboard/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) return undo(data.error ?? "Couldn't save that. Please try again.");
      setRemindNote(on ? "Done. We'll email you when a new challenge is up." : "Done. No more reminder emails.");
    } catch {
      undo("Couldn't reach the server. Please try again.");
    }
  };

  /** Post today's score under this nickname; resolves true once it's on the board. */
  const submit = async (name: string, reminders?: boolean) => {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `player` only matters for a brand-new player: it keeps the scores this browser already posted
        body: JSON.stringify({ player: loadPlayer()?.id ?? "", name, date, choices, website: "" }),
      });
      const data = (await res.json()) as SubmitResult;
      if (!data.ok) {
        setStatus("error");
        setError(data.error);
        if (data.field === "name") setEditing(true);
        return false;
      }
      if (data.player) rememberPlayer(data.player);
      setMe((m) => ({ id: data.player?.id ?? m?.id ?? "", name, reminders: m?.reminders ?? false }));
      setResult(data);
      setStatus("done");
      setEditing(false);
      if (!data.duplicate) track("leaderboard_join", { rank: data.rank });
      announcePosted({ date, rank: data.rank, total: data.total });
      if (reminders) await saveReminders(true);
      const board = await fetch(`/api/leaderboard?scope=day&date=${date}&limit=5&player=${data.player?.id ?? ""}`).then((r) => (r.ok ? r.json() : null));
      setTop(board);
      return true;
    } catch {
      setStatus("error");
      setError("Couldn't reach the leaderboard. Check your connection and try again.");
      return false;
    }
  };

  // signed out (sign-out keeps the page): forget the last account, so the next one starts clean
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    sent.current = false;
    queueMicrotask(() => {
      setMe(undefined);
      setResult(null);
      setTop(null);
      setEditing(false);
      setStatus("idle");
      setError("");
      setRemindNote("");
    });
  }, [isLoaded, isSignedIn]);

  // signed in: find out who we are; a returning player's score is posted straight away
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/leaderboard/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { player?: Me } | null) => {
        const p = d?.player ?? null;
        setMe(p);
        if (p?.name && !sent.current) {
          sent.current = true;
          submit(p.name);
        }
      })
      .catch(() => setMe(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return { me, editing, setEditing, status, setStatus, error, setError, result, top, remindNote, submit, saveReminders };
}
