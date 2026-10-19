"use client";

import { useEffect } from "react";
import { MAP_PATH } from "@/lib/share";

/** The map used to live at "/". Old share links like "/#e=1914&s=…" still open the map. */
export function LegacyMapRedirect() {
  useEffect(() => {
    const check = () => {
      if (/^#e=/.test(window.location.hash)) window.location.replace(`${MAP_PATH}${window.location.hash}`);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  return null;
}
