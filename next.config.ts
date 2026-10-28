import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const dataVersion = (JSON.parse(readFileSync("./src/data/data-version.json", "utf8")) as { v: string }).v;
const dailyVersion = (JSON.parse(readFileSync("./src/data/daily-version.json", "utf8")) as { v: string }).v;
// the same stamp as POOL_V in src/lib/pool-version.ts, so the preloaded puzzle list is the one the page fetches
const poolV = `?v=${dataVersion}.${dailyVersion}`;
// pages with a full space header (PageHero without `compact`): the Earth's still picture is in their first screen (the
// curve on phones, the spinning globe's placeholder on wide screens). A new page with a full PageHero needs adding here;
// compact headers (daily, endless, leaderboard, size, account) are just stars and preload no image.
const HERO_PAGES = "about|contact|disputes|eras|how-it-works|privacy|teachers|terms|timeline|unsubscribed";
const earthBand = { key: "Link", value: "</globe-still.svg>; rel=preload; as=image; fetchpriority=high" };
// only on the page itself: the router's prefetch requests (sent with an RSC header) would apply them on other pages
const pageOnly = { missing: [{ type: "header" as const, key: "rsc" }] };

const nextConfig: NextConfig = {
  // which build this is (the deployment on Vercel, so a redeploy after changing settings counts too): an open tab
  // compares it with /api/version and picks up a newer one at the next safe moment (src/components/site/UpdateCheck.tsx)
  env: { BUILD_ID: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
  cacheComponents: true,
  // React would put eager images (the homepage globe) into a Link header that Vercel also sends on the homepage's
  // prefetch responses, so every page downloaded them. Off: React's preloads go in each page's <head> instead.
  reactMaxHeadersLength: 0,
  // hide the Next.js dev badge (it sat on top of the timeline play button)
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // era pages live at /eras/2000-bce; the page also accepts /eras/2000bce, so send that to the one address
  async redirects() {
    return [{ source: "/eras/:year(\\d+)bce", destination: "/eras/:year-bce", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Preloads as headers, per page: preload() in a page leaks into every other page that prefetches it.
      {
        // the globe's still picture is the largest thing on the homepage's first screen; its country data loads next, and the
        // puzzle list for yesterday's matchup (the same file the daily game starts from, so Play finds it ready)
        source: "/",
        ...pageOnly,
        headers: [
          {
            key: "Link",
            value: `</globe-still.svg>; rel=preload; as=image; fetchpriority=high, </data/globe.json>; rel=preload; as=fetch; crossorigin=anonymous, </data/daily/index.json${poolV}>; rel=preload; as=fetch; crossorigin=anonymous`,
          },
        ],
      },
      { source: `/:page(${HERO_PAGES})`, ...pageOnly, headers: [earthBand] },
      { source: "/eras/:slug", ...pageOnly, headers: [earthBand] },
      { source: "/unsubscribed/error", ...pageOnly, headers: [earthBand] },
      {
        // the games can't start until the puzzle list arrives: fetch it with the page, not after the scripts
        source: "/:page(daily|endless)",
        ...pageOnly,
        headers: [{ key: "Link", value: `</data/daily/index.json${poolV}>; rel=preload; as=fetch; crossorigin=anonymous` }],
      },
      {
        source: "/:file(world.svg|globe-still.svg)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        // map data rarely changes; cache for a day, refresh in the background for a week
        source: "/data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/flags/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }],
      },
    ];
  },
};

export default nextConfig;
