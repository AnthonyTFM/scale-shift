import type { MetadataRoute } from "next";
import { comparisons } from "@/content/comparisons";
import { featuredIds } from "@/content/featured";
import { site } from "@/content/site";
import { getEntity } from "@/lib/data-server";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/history`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/compare`, changeFrequency: "monthly", priority: 0.8 },
    ...featuredIds.filter((id) => getEntity(id)).map((id) => ({ url: `${base}/history/${id}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...comparisons.map((c) => ({ url: `${base}/compare/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
