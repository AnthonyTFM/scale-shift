# Scale Shift: project brief

The single source of truth for what we're building and why. Both owners and both Claudes read this before starting work. Update it in the same PR whenever a decision changes.

## The goal
**Make the best true-size map on the internet, with history built in.** Quality comes first. A portfolio piece and a possible business are welcome side effects, not the main objective, so we don't cut corners for speed or monetisation.

- **Working name:** "Scale Shift". Not final; renaming is a one-line change in `content/site.ts`.
- **Owners:** Anthony (Mac) and Evan (Windows). Shared ownership of everything.
- **Repo:** https://github.com/AnthonyTFM/scale-shift (public). Hosting: Vercel, auto-deploys `main`.
- **Inspiration:** thetruesize.com. We rebuilt the idea with original code, copy, name and design, and added the timeline. Never copy its text, branding or layout.

## What the site does today
| Area | What works |
|---|---|
| Map (`/`) | Search 3,185 places (countries, US/Canadian/other states and provinces, continents, historical territories, "all claims" realms); drag at true size; rotate; right-click or button to remove; keyboard moves; zoom; borders of the selected year; click a territory to pick it up |
| Timeline | 39 snapshots: 1 BC, AD 100–900 by century, 1000–2010 at key years, plus today. Play, step, keyboard. Shapes follow the timeline or stay locked to a year |
| Panel | True area (km² and sq mi), population (today only), border precision, area-over-time chart, "show everything it claimed", rotate, reset, "came before" links |
| Share | URL holds the full map state; Share button copies it (native share sheet on phones) |
| `/compare/[slug]` | 12 comparisons with an embedded map, facts, FAQ schema and generated share image |
| `/history/[id]` | 53 empire timelines with chart, table and map links |
| `/about` | How true size works, sources, limits, border-correction form |
| Forms | Email updates (footer) and corrections, with validation and a spam trap. Saved to `data/submissions.json` locally; webhook or Resend email via env vars |
| SEO | Titles, meta, canonical, sitemap, robots, JSON-LD, OG images |

## How it works (key decisions, don't undo without discussing)
- **No map tiles.** The map is SVG drawn by d3-geo from our own data, so there are no API keys or per-view costs.
- **True-size math:** shapes are rotated on the sphere (`lib/geo.ts` → `relocate()`), then re-projected to Mercator. Area never changes. Never move shapes by flat pixel offsets.
- **Data pipeline:** `scripts/build-data.mjs` turns historical-basemaps (GPL-3.0) and Natural Earth (public domain) into simplified TopoJSON per year in `public/data/years/` plus `public/data/index.json`. Areas are computed at full resolution before simplifying.
- **"All claims" realms:** territories marked as subject to a power (SUBJECTO field) are grouped into one shape, e.g. "Mongol Empire (all claims)".
- **Years:** `-1` means 1 BC (there is no year 0). `2026` means today.
- **Antarctica is excluded** because Mercator can't draw a shape containing a pole.
- **Performance:** map layers render in chunks inside React transitions; path strings are cached; non-territory shapes decode lazily.
- **Fonts:** self-hosted with `next/font/local` (no layout shift).

## Quality bar (every change must keep these)
- `npm run lint`, `typecheck`, `build` pass; CI enforces it on every PR.
- No console errors. Works at 375px, 768px, 1280px and 1920px with no sideways scrolling.
- Keyboard and screen-reader friendly: labels on every control, visible focus, sensible tab order.
- Lighthouse (phone simulation): Performance 90+, Accessibility/Best Practices/SEO 100, CLS under 0.1. The last measurement was 93–99 Performance and 100 on everything else.
- Copy lives in `content/`, never hardcoded in components.

## Design system
- **Feel:** a historical atlas, not a SaaS dashboard. One bold element (the big year numeral in the timeline); everything else quiet.
- **Colours** (`app/globals.css`): ocean `#0f2e36`, land `#c8d2c3`, paper `#f1f4ef`, ink `#15242b`, accent (orpiment) `#e8a92a`. Overlays use eight historical pigments (`--pigment-0…7`: cinnabar, lapis, orpiment, malachite, tyrian, ochre, teal, madder).
- **Type:** IM Fell English (display, old-style numerals) + Libre Franklin (interface and body).
- **Avoid:** generic templates, cream-and-terracotta palettes, all-caps eyebrow labels, gradient blobs, card grids with identical shadows, decorative motion.
- **Writing voice:** plain, specific, active. Buttons say what happens ("Send correction"). Errors say what to do next.

## Known issues and limits
- Source data has some odd shapes (e.g. "White Russia" 1930 is far too large). Fix with the name/alias tools in `scripts/build-data.mjs`, or log them in an issue.
- Snapshots are about 100 years apart before 1300; some famous peaks (Rome in AD 117) fall between snapshots.
- Population exists only for today's countries.
- Mobile phone LCP measures around 2.0–2.7s under Lighthouse's heavy throttling.
- Forms on Vercel need `SUBMISSIONS_WEBHOOK_URL` or the Resend settings; the local JSON file doesn't persist there.
- Vercel's free (Hobby) plan is for non-commercial use, and its collaboration rules are stricter for private repos. Keep the repo public, or move to Vercel Pro, if either owner's merges stop deploying.

## Roadmap (best-site-first order)
**Now**
1. Add key snapshot years: AD 117 (Rome's peak), 1683 (Ottoman peak), 1922 (British Empire peak). This needs extra boundary data; check licences first.
2. Phone feel: an on-shape rotate handle, a two-finger twist to rotate, larger touch targets on the dock.
3. Rendering upgrade for dense years (1492 has 1,300+ territories): canvas or WebGL layer with SVG overlays kept for interaction.
4. Choose the final name and domain.

**Next**
5. 100+ comparison pages and a share image for every history page.
6. Side-by-side mode: the same place at two years, ghosted on top of each other.
7. Timeline smoothing: morph between snapshots instead of jumping.
8. Teacher mode: printable worksheets and an embeddable widget.

**Later**
9. Globe view toggle.
10. Population estimates for historical entities, with sources.
11. Translations.

## Open decisions
- Name and domain
- Analytics (GA4 ID in Vercel) and form delivery (webhook vs Resend)
- Slack with @Claude for both owners (after both have shipped from their laptops)

## Working with Claude (examples that work well)
- "Pull the latest main, then add a comparison page for the Aztec Empire vs Mexico and ship it."
- "Open an issue for adding AD 117, assign it to me, then research where we can get licensed boundary data for that year."
- "Make the timeline dock easier to use on a 375px phone. Open the PR but don't merge; I want Anthony to see the preview."
- "Run the full checks and the e2e tests, and tell me anything that's broken."
