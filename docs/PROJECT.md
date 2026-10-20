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
| Home `/` | A directory, not a map: today's daily challenge with your streak and the top players, links to every section and famous comparisons |
| Map `/map` | Drag countries, US states and historical states at real size; rotate; 49 border snapshots from 2000 BCE to today; type any year; click land for "who ruled here?" through every era; map key; Antarctic claims; disputed territories; edge-scrolling while dragging; share links and PNG download |
| Daily challenge `/daily` | 5 "which is bigger?" puzzles a day, the same for everyone; true-size reveal; context for every empire; streaks; practice rounds; shareable score grid |
| Leaderboard `/leaderboard` | Daily and all-time rankings; joining needs an email (private, one player per inbox) and a nickname; disguised slurs blocked; scores re-marked on the server; first try of the day counts |
| Eras, timeline, disputes | 49 era pages, 104 events (when land was taken vs. made official), 19 present-day disputes |
| About, how it works, contact, privacy | Sources, every data correction, the border-error form |

## How it works (key decisions, don't undo without discussing)
- **No map tiles.** The map is drawn on canvas by d3-geo from our own data: no API keys or per-view costs.
- **Real-size math:** shapes are rotated on the sphere (`src/lib/geo.ts`), then projected. Area never changes. Never move shapes by flat pixel offsets.
- **Data pipeline:** `npm run data` turns historical-basemaps (GPL-3.0) and Natural Earth (public domain) into TopoJSON per snapshot in `public/data/eras/`, with fixes from `src/content/data-corrections.json`, then builds the Antarctic claims and the daily puzzle pool. `npm run check:data` guards it in CI.
- **Smooth era changes (Oct 20):** when the era changes, borders slide into place over 1 s instead of jumping (`src/components/map/morph.ts`). For the current view the engine draws "who owns each spot" for the old and new snapshot, matches each new shape to the old shape it overlaps most (so no name list is needed across the 49 snapshots), and grows it from the ground they share; brand-new states grow from their middle. Every spot always belongs to one shape or the sea, so no gaps open. Labels return when it finishes; moving the map or "reduce motion" skips it.
- **The map lives only on `/map`.** The homepage leads to games, the map and information pages.
- **Daily puzzles** are picked by a seeded shuffle of the date, so everyone gets the same five. The leaderboard re-marks answers on the server.
- **Growing the puzzle pool (Oct 20):** new shapes are added in `scripts/build-daily.mjs` and get a `since` date two days after the build; a dated puzzle only uses shapes in the pool that day, so past puzzles (and today's in every time zone) never change and the server keeps marking them correctly. Never edit or remove a shape whose `since` date has passed (or that has none). Leave out states the map data shows outside the years they existed. Pool: 337 shapes (Oct 20).
- **Weekly review (Mondays 8:47 ET, scheduled task):** checks the news for border and dispute changes (two reliable sources before editing), new historical findings, upstream map-data releases, and adds ~20 more puzzle shapes. Pool growth merges after CI; history corrections and map-data rebuilds wait for Anthony's OK.
- **Leaderboard sign-up (Oct 19):** an email and a nickname are required to join. Emails are stored privately in Redis (`lb2:emails`), never returned by the API, and each inbox gets one player. Emails are not verified yet: that needs a real domain plus Resend (see roadmap).
- **Fresh start (Oct 19):** when verified sign-in went live, the leaderboard was reset: Redis keys moved from `lb:` to `lb2:` (old data left unused), and browsers' saved progress and player moved to `atlas-daily-v2` / `atlas-player-v2`. Everyone starts again by signing in.
- **Verified sign-in with Clerk (Oct 19):** to post a score you sign in with an email code or Google (Clerk), so nobody can play under an email they don't own, and you keep one nickname on every device and browser. Clerk only proves the email: the player, nickname, scores and reminders stay in our Redis, found by the verified email (`lb2:email-owners`) and tied to the Clerk account (`lb2:accounts`). A player who joined before sign-in keeps their spot by signing in with the same email. **Switching away later** (e.g. our own email codes via Resend once there's a domain) only means replacing `verifiedUser()` in `src/lib/account.ts`; everyone signs in once more and lands on the same player. Off until Clerk's keys are in Vercel. **Caveat:** Clerk's production mode needs a domain we own; on `scale-shift.vercel.app` it runs in development mode (a small badge, and Clerk caps development sign-ups at 100), fine until the domain is decided.
- **Reminder emails are opt-in (Oct 19):** an unticked "Email me when a new daily challenge is up" box at sign-up, and a toggle on the results screen. Consent and its date live in `lb2:reminders`. Every reminder must carry the signed one-click unsubscribe link (`unsubscribeToken`). Sending is not built yet: it needs a real domain, Resend and `UNSUBSCRIBE_SECRET` in Vercel.
- **Nickname filter:** `src/lib/name-filter.ts` reads names several ways (l33t, q-for-g, lookalike letters, repeats, separators). Boards hide any saved name that fails it, so adding a word removes a live bad name on the next deploy.
- **Storage:** form messages and leaderboard scores need Vercel settings to persist (see the setup log).

## Quality bar (every change must keep these)
- `npm run lint`, `typecheck`, `build` and `check:data` pass; CI enforces it on every PR.
- No console errors. Works at 375px, 768px, 1280px and 1920px with no sideways scrolling.
- Keyboard and screen-reader friendly: labels on every control, visible focus, sensible tab order.
- Lighthouse: Performance 90+, Accessibility/Best Practices/SEO 100. Last measured Oct 19: home 98, leaderboard 98, daily 100 performance; 100 on everything else.
- Copy lives in `src/content/`, never hardcoded in components.

## Design system
- **Feel:** show off the world without getting in the way of reading. Deep-ocean headers with a faint world map behind them, warm land colours, light paper for reading. One bold accent (amber `#ffb547`) for primary actions.
- **Colours** (`src/app/globals.css`): deep ocean panel `#0e2a47` (headers, heroes, footer, map panels), ink `#1f1712`, paper `#fbf6ee`, link `#b4401a`; eight warm political-map pastels (`src/lib/palette.ts`); map ocean `#9FCBE0`. Changed from purple-black on Oct 19.
- **Homepage globe** (`src/components/home/Globe.tsx`): drawn from `public/data/globe.json` (built by `scripts/build-globe.mjs`). Only the countries are redrawn as it turns (20 fps, starts after page load); the sea, glow and shading are CSS. Keep it that way or homepage performance drops below 90.
- **Copy voice for hooks:** a dare backed by a true fact ("On most maps, Russia looks far bigger than Africa. In reality, Africa is nearly twice its size."). Don't lead with Greenland vs Africa: it's thetruesize.com's signature example (originality check, Oct 20). Never invent statistics about players.
- **Type:** Fraunces (headings) + the system font (body), so text paints instantly.
- **Writing voice:** plain, specific, active. Buttons say what happens. Errors say what to do next.

## Known issues and limits
- Borders before about 1800 are approximate; snapshots are 50–200 years apart in ancient times.
- Antarctic claim areas exclude the floating ice shelves.
- Searchable places are countries, US states and historical states. The v1 site also had Canadian and other provinces, continents and "all claims" realms; bringing those back needs data-pipeline work.
- Forms don't keep anything on Vercel until their settings are added (see below).
- Leaderboard emails aren't verified, so someone could sign up with an address that isn't theirs. One player per inbox and the 5-new-players-per-network daily cap limit the damage.
- Vercel's Hobby plan is for non-commercial use. Keep the repo public, or move to Pro, if either owner's merges stop deploying.

## Roadmap (best-site-first order)
**Now**
1. Bring back the best of v1: `/history/[empire]` timeline pages and `/compare/[slug]` share pages, the email-updates signup, and provinces/continents in search.
2. Form delivery on Vercel (Resend). With a real domain, also send a code to verify leaderboard emails.
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
| Upstash Redis (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, added by Vercel → Storage) | Set Oct 19. The live API reports `X-Leaderboard-Store: redis`. |
| Clerk (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, added by Vercel → Marketplace → Clerk) | Set Oct 19 (Production + Preview), Clerk **development** keys (`pk_test_`): email verification code on, password off. Switch to production keys once we own a domain. |

**GitHub**
- `main` is protected: changes go through a pull request, approvals are not required, and the CI status check `build` must pass (lint, typecheck, build, data check).
- Decided Oct 20: Anthony and Evan each merge and ship any change on their own once CI passes, big ones included. No approvals or waiting on the other owner. The hourly checks notify each owner when the other ships.
- Issues are on. Leftover branches from merged PRs are deleted.
- Working from a Claude Code cloud session: GitHub's GraphQL API is blocked there, so `gh pr list`, `gh pr checks` and `gh pr merge` fail. Use the REST equivalents (`gh api repos/AnthonyTFM/scale-shift/...`) or finish the step from a laptop.

**Open setup items**
1. ~~Invite Evan as a collaborator~~ Done Oct 19.
2. ~~Confirm Evan's test PR deploys~~ Done Oct 19: PR #5 merged and deployed to production under his name.
3. Connect form delivery: set `SUBMISSIONS_WEBHOOK_URL` or the Resend settings in Vercel. Until then the live site's forms don't save.
4. ~~Add Upstash Redis~~ Done Oct 19.
5. Pick the final name and domain.
6. Later: Slack with @Claude for both owners.

## Working with Claude (examples that work well)
- "Pull the latest main, then add a comparison page for the Aztec Empire vs Mexico and ship it."
- "Open an issue for adding AD 117, assign it to me, then research where we can get licensed boundary data for that year."
- "Make the timeline dock easier to use on a 375px phone. Open the PR but don't merge; I want Anthony to see the preview."
- "Run the full checks and the e2e tests, and tell me anything that's broken."
