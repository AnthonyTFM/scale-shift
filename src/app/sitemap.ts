import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { eras, eraSlug } from "@/lib/eras";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const pages = ["", "/map", "/daily", "/leaderboard", "/teachers", "/eras", "/timeline", "/disputes", "/how-it-works", "/about", "/contact", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${base}${p || "/"}`, changeFrequency: p === "/daily" ? ("daily" as const) : ("monthly" as const), priority: p === "" ? 1 : 0.7 })),
    ...eras.map((e) => ({ url: `${base}/eras/${eraSlug(e.key)}`, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
