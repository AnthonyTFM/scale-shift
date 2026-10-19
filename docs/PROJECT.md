# Scale Shift: project brief

The single source of truth for what we're building and why. Both owners and both Claudes read this before starting work. Update it in the same PR whenever a decision changes.

## The goal
**Make the best true-size map on the internet, with history and games built in.** Quality comes first. A portfolio piece and a possible business are welcome side effects, not the main objective, so we don't cut corners for speed or monetisation.

- **Working name:** "Scale Shift". Not final; renaming is a one-line change in `src/content/site.ts`.
- **Owners:** Anthony (Mac) and Evan (Windows). Shared ownership of everything.
- **Repo:** https://github.com/AnthonyTFM/scale-shift (public). Hosting: Vercel, auto-deploys `main`.
- **Inspiration:** thetruesize.com. We rebuilt the idea with original code, copy, name and design, and added 4,000 years of history and a daily game. Never copy its text, branding or layout.

## What the site does today
On Oct 19, 2026 the site was rebuilt from the "Atlas Drift" prototype (the v1 code is in git history before PR #3).

| Page | What it does |
|---|---|
| Home `/` | A directory, not a map: today's daily challenge with your streak and the top players, links to every section, famous comparisons and the teachers' area |
| Map `/map` | Drag countries, US states and historical states at real size; rotate; 49 border snapshots from 2000 BCE to today; type any year; click land for "who ruled here?" through every era; map key; Antarctic claims; disputed territories; edge-scrolling while dragging; share links and PNG download |
| Daily challenge `/daily` | 5 "which is bigger?" puzzles a day, the same for everyone; true-size reveal; context for every empire; streaks; practice rounds; shareable score grid |
| Leaderboard `/leaderboard` | Daily and all-time rankings under a nickname; scores re-marked on the server; first try of the day counts |
| Teachers `/teachers` | Six printable classroom activities with map links |
| Eras, timeline, disputes | 49 era pages, 104 events (when land was taken vs. made official), 19 present-day disputes |
| About, how it works, contact, privacy | Sources, every data correction, the border-error form |

## How it works (key decisions, don't undo without discussing)
- **No map tiles.** The map is drawn on canvas by d3-geo from our own data: no API keys or per-view costs.
- **Real-size math:** shapes are rotated on the sphere (`src/lib/geo.ts`), then projected. Area never changes. Never move shapes by flat pixel offsets.
- **Data pipeline:** `npm run data` turns historical-basemaps (GPL-3.0) and Natural Earth (public domain) into TopoJSON per snapshot in `public/data/eras/`, with fixes from `src/content/data-corrections.json`, then builds the Antarctic claims and the daily puzzle pool. `npm run check:data` guards it in CI.
- **The map lives only on `/map`.** The homepage leads to games, the map and information pages.
- **Daily puzzles** are picked by a seeded shuffle of the date, so everyone gets the same five. The leaderboard re-marks answers on the server.
- **Storage:** form messages and leaderboard scores need Vercel settings to persist (see the setup log).

## Quality bar (every change must keep these)
- `npm run lint`, `typecheck`, `build` and `check:data` pass; CI enforces it on every PR.
- No console errors. Works at 375px, 768px, 1280px and 1920px with no sideways scrolling.
- Keyboard and screen-reader friendly: labels on every control, visible focus, sensible tab order.
- Lighthouse: Performance 90+, Accessibility/Best Practices/SEO 100. Last measured Oct 19: home 98, teachers 99, leaderboard 98, daily 100 performance; 100 on everything else.
- Copy lives in `src/content/`, never hardcoded in components.

## Design system
- **Feel:** warm and inviting, like a well-loved atlas. One bold accent (amber `#ffb547`) for primary actions.
- **Colours** (`src/app/globals.css`): ink `#1f1712`, paper `#fbf6ee`, panel `#221b2e`, link `#b4401a`; eight warm political-map pastels; ocean `#9FCBE0`.
- **Type:** Fraunces (headings) + the system font (body), so text paints instantly.
- **Writing voice:** plain, specific, active. Buttons say what happens. Errors say what to do next.

## Known issues and limits
- Borders before about 1800 are approximate; snapshots are 50–200 years apart in ancient times.
- Antarctic claim areas exclude the floating ice shelves.
- Searchable places are countries, US states and historical states. The v1 site also had Canadian and other provinces, continents and "all claims" realms; bringing those back needs data-pipeline work.
- Forms and the leaderboard don't keep anything on Vercel until their settings are added (see below).
- Vercel's Hobby plan is for non-commercial use. Keep the repo public, or move to Pro, if either owner's merges stop deploying.

## Roadmap (best-site-first order)
**Now**
1. Bring back the best of v1: `/history/[empire]` timeline pages and `/compare/[slug]` share pages, the email-updates signup, and provinces/continents in search.
2. Turn on Upstash Redis (leaderboard) and form delivery on Vercel.
3. Choose the final name and domain.

**Next**
4. More snapshots at famous peaks (Rome AD 117, Ottomans 1683, British Empire 1922).
5. A weekly leaderboard; a "who ruled this spot?" puzzle type.
6. Side-by-side mode and smoother timeline transitions.

**Later**
7. Globe view, historical populations, translations.

## Open decisions
- Name and domain
- Analytics (GA4 ID in Vercel) and form delivery (webhook vs Resend)
- Slack with @Claude for both owners (after both have shipped from their laptops)

## Status and setup log
_Last updated: October 19, 2026_

**Live:** https://scale-shift.vercel.app

**Hosting:** Vercel Hobby plan, project `scale-shift` under the BellAI team. Every merge to `main` deploys to production automatically; every pull request gets its own preview link.

**Environment variables (Vercel)**
| Variable | Status |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Set to `https://scale-shift.vercel.app` (all environments). A typo (`ttps://`) was fixed on Oct 18; the live sitemap was checked on Oct 19 and all 69 links are correct. |
| `NEXT_PUBLIC_GA4_ID` | Not set yet (no analytics) |
| `SUBMISSIONS_WEBHOOK_URL`, or `RESEND_API_KEY` + `NOTIFY_EMAIL_TO` (+ `NOTIFY_EMAIL_FROM`) | Not set yet, so the live site's forms don't save anything |
| Upstash Redis (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, added by Vercel → Storage) | Not set yet, so leaderboard scores are wiped every few hours |

**GitHub**
- `main` is protected: changes go through a pull request, approvals are not required, and the CI status check `build` must pass (lint, typecheck, build, data check).
- Issues are on. Leftover branches from merged PRs are deleted.
- Working from a Claude Code cloud session: GitHub's GraphQL API is blocked there, so `gh pr list`, `gh pr checks` and `gh pr merge` fail. Use the REST equivalents (`gh api repos/AnthonyTFM/scale-shift/...`) or finish the step from a laptop.

**Open setup items**
1. ~~Invite Evan as a collaborator~~ Done Oct 19.
2. Confirm Evan's test PR (adding `CONTRIBUTORS.md`) deploys. If Vercel marks his deployment "Blocked", the Hobby plan is refusing a second author: either move the project to Vercel Pro or host somewhere that allows free collaborators.
3. Connect form delivery: set `SUBMISSIONS_WEBHOOK_URL` or the Resend settings in Vercel. Until then the live site's forms don't save.
4. Add Upstash Redis in Vercel → Storage so leaderboard scores persist.
5. Pick the final name and domain.
6. Later: Slack with @Claude for both owners.

## Working with Claude (examples that work well)
- "Pull the latest main, then add a comparison page for the Aztec Empire vs Mexico and ship it."
- "Open an issue for adding AD 117, assign it to me, then research where we can get licensed boundary data for that year."
- "Make the timeline dock easier to use on a 375px phone. Open the PR but don't merge; I want Anthony to see the preview."
- "Run the full checks and the e2e tests, and tell me anything that's broken."
