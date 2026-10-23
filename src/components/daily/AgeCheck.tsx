"use client";

import { useState } from "react";
import Link from "next/link";
import { ageCheck as T } from "@/content/legal";

const KEY = "atlas-13plus";

/** Whether this browser has confirmed the player is 13 or older (asked once, before any email is collected). */
export function useAgeOk() {
  const [ok, setOk] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const set = (v: boolean) => {
    setOk(v);
    try {
      if (v) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked: asked again next visit */
    }
  };
  return [ok, set] as const;
}

/** The "I'm 13 or older" box, with links to the terms and privacy policy. */
export function AgeCheck({ ok, onChange, error, id = "age-ok" }: { ok: boolean; onChange: (v: boolean) => void; error?: boolean; id?: string }) {
  return (
    <div className="mt-1 text-sm">
      <label htmlFor={id} className="flex min-h-11 items-start gap-2 py-2.5 font-semibold text-ink">
        <input
          id={id}
          type="checkbox"
          checked={ok}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error || undefined}
          aria-describedby={`${id}-hint`}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>{T.label}</span>
      </label>
      <p id={`${id}-hint`} className={`text-xs ${error ? "font-semibold text-danger" : "text-muted"}`}>
        {error ? T.needed : T.hint}{" "}
        <span className="text-muted">
          {T.agree}{" "}
          <Link href="/terms" className="font-semibold text-link hover:underline">
            {T.terms}
          </Link>{" "}
          {T.and}{" "}
          <Link href="/privacy" className="font-semibold text-link hover:underline">
            {T.privacy}
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
