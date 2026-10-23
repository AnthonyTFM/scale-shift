# Border Drift: project brief

The single source of truth for what we're building and why. Both owners and both Claudes read this before starting work. Update it in the same PR whenever a decision changes.

## The goal
**Make the best true-size map on the internet, with history and games built in.** Quality comes first. A portfolio piece and a possible business are welcome side effects, not the main objective, so we don't cut corners for speed or monetization.

- **Name:** Border Drift (Oct 21, chosen by Anthony and Evan; "Scale Shift" until then). The name lives in `src/content/site.ts`. The repo, the Vercel project and the URL stay `scale-shift` until the domain is bought (borderdrift.com, see the launch checklist in issue #40).
- **Owners:** Anthony (Mac) and Evan (Windows). Shared ownership of everything.
- **Repo:** https://github.com/AnthonyTFM/scale-shift (public). Hosting: Vercel, auto-deploys `main`.
- **Inspiration:** thetruesize.com. We rebuilt the idea with original code, copy, name and design, and added 4,000 years of history and a daily game. Never copy its text, branding or layout.

## What the site does today
On Oct 19, 2026 the site was rebuilt from the "Atlas Drift" prototype (the v1 code is in git history before PR #3).

| Page | What it does |
|---|---|
| Home `/` | A directory, not a map: today's daily challenge with your streak and the top players, links to every section and famous comparisons |
| Map `/map` | Drag countries, US states and historical states at real size; rotate; 49 border snapshots from 2000 BCE to today; type any year; click land for "who ruled here?" through every era; map key; Antarctic claims; disputed territories; edge-scrolling while dragging; share links and PNG download |
| Daily challenge `/daily` | 5 "which is bigger?" puzzles a day, the same for everyone; true-size reveal; context for every empire; streaks; practice rounds; results with leaderboard sign-up first, share text, share picture and challenge links |
| Leaderboard `/leaderboard` | Daily and all-time rankings; joining needs an email (private, one player per inbox) and a nickname; disguised slurs blocked; scores re-marked on the server; first try of the day counts |
| Eras, timeline, disputes | 49 era pages, 104 events (when land was taken vs. made official), 19 present-day disputes |
| About, how it works, contact, privacy | Sources, every data correction, the border-error form |

## How it works (key decisions, don't undo without discussing)
- **No map tiles.** The map is drawn on canvas by d3-geo from our own data: no API keys or per-view costs.
- **Real-size math:** shapes are rotated on the sphere (`src/lib/geo.ts`), then projected. Area never changes. Never move shapes by flat pixel offsets.
- **Data pipeline:** `npm run data` turns historical-basemaps (GPL-3.0) and Natural Earth (public domain) into TopoJSON per snapshot in `public/data/eras/`, with fixes from `src/content/data-corrections.json`, then builds the Antarctic claims and the daily puzzle pool. `npm run check:data` guards it in CI.
- **Every spot belongs to one shape (Oct 20):** the sources often draw territories on top of each other (1492 had ~2,900 overlapping pairs, 1600–1815 ~400 each), and the map strokes every outline, so hidden outlines showed as stray dotted lines through other shapes. `scripts/lib/overlaps.mjs` cuts them apart: where two shapes overlap, the smaller keeps the shared ground and the larger gets a hole, so every territory stays visible. Area and label point follow the cut shape. `npm run data` does this before coloring; `node scripts/fix-overlaps.mjs` redoes it on the existing files (and recolours). One small pair in Australia (Wailwan / Kamilaroi, 1600–1800) is left as the clipping fails there.
- **One color per country for life (Oct 20):** every country, empire or people keeps one color from the first era it appears in to the last (`scripts/lib/colors.mjs`). All 49 eras are colored together (DSATUR), so two owners that ever border each other never share a color; the eight palette colors fit with no clashes. Renames that add words fold into one country ("United Kingdom of Great Britain and Ireland" = "United Kingdom", "Empire of Brazil" = "Brazil") unless the two ever border, and so do countries that carry on under a new name from one era to the next (German Empire → Germany, Russian Empire → USSR → Russia, Ottoman Empire → Türkiye: each one's label point inside the other's land, or the main successor), unless two of them are ever on the map together; a ruler named without a shape of its own (1914 "Russia", 1945 "USA") is read as its homeland. Colonies take their ruler's color, so a place changes color only when it changes hands. `npm run data` does this at the end; `node scripts/recolor-eras.mjs` redoes it on the existing files (`--check` reports).
- **Borders sweep into each new era (Oct 22):** changing era (Play, ◀ ▶, the slider, typing a year) moves borders to their new place over 2 seconds (`src/components/map/sweep.ts`). A country that gains land spreads into it from its old border; a new country sweeps in from one side (its border with whoever carries on the country it takes most land from, else its longest border), never from every edge at once. **Only the border moves:** the frame is the new era's normal tiles with the old era's picture clipped to the land the border hasn't reached, plus the moving border line in the map's own style, so colors, solid/dashed lines and lakes never change, and the end is exactly the new era's map. Who carries on whom uses the colors from `scripts/lib/colors.mjs` (decided on the whole world, not the view). Names stay on, follow their country and switch halfway when it is renamed; new countries are named from halfway. Moving the map mid-sweep or "reduce motion" shows the new era straight away; Play waits for each sweep. (A first slide, #47–#51, was removed in #54 because colors, dotted lines and names changed during it; this version keeps all of them.) **Lakes are the same on every era:** big lakes (`scripts/build-lakes.mjs` → `public/data/lakes.json`, natural lakes of 1,000 km² or more from Natural Earth) are drawn as water on top of every era's tiles, since the sources disagree about which lakes they cut out.
- **The map lives only on `/map`.** The homepage leads to games, the map and information pages: a game-first hero (today's game card, a map card and today's leaderboard over a light, slowly turning globe), then how to play, the daily fact, a directory of the site and this week's picks. Kept as Anthony built it when the Daylight Arcade look arrived (Oct 21, Evan's call); only its colors changed.
- **Daily puzzles** are picked by a seeded shuffle of the date, so everyone gets the same five. The leaderboard re-marks answers on the server.
- **Daily game screens (Oct 21–22, Anthony's calls):** a 5-pill progress bar and, for players with a streak, a "N-day streak" pill above it. Each round reveals the web-map size as a dashed outline and the true size as a solid shape, then shows a dark verdict panel and "Next round". **Results order:** score with a fun title (5 "Emperor!", 4 "Empire builder!", 3 "Regional power", 0–2 "The map fooled you"), the five result tiles, then **"Get on the leaderboard" first** (the full sign-up opens only after Join), then the streak / today's rank / all-time cards, one compact share row (Share · Picture · Challenge), the answers ("Compare sizes on the map") and a big gold "Play more rounds for fun". Signing in from /daily pulls today's result from the account straight away, so a player who already played lands on their results without a refresh or a replay. Drawn icons (`src/components/site/Icons.tsx`) are used instead of emoji where they carry meaning. **Oct 22 follow-ups:** every historical place has a "what it was / today" note (`src/content/daily-context.ts`; new pool shapes need one too); "Play more rounds for fun" scrolls back to the top of the new round; sounds are on by default (players who turn them off stay off); the reveal's second line uses the same 15% threshold as the cards' "Map: 1.2× too big" chips.
- **Growing the puzzle pool (Oct 20):** new shapes are added in `scripts/build-daily.mjs` and get a `since` date two days after the build; a dated puzzle only uses shapes in the pool that day, so past puzzles (and today's in every time zone) never change and the server keeps marking them correctly. Never edit or remove a shape whose `since` date has passed (or that has none). Leave out states the map data shows outside the years they existed. Pool: 337 shapes (Oct 20).
- **Weekly review (Mondays 8:47 ET, scheduled task):** checks the news for border and dispute changes (two reliable sources before editing), new historical findings, upstream map-data releases, and adds ~20 more puzzle shapes. Pool growth merges after CI; history corrections and map-data rebuilds wait for Anthony's OK.
- **Leaderboard sign-up (Oct 19):** an email and a nickname are required to join. Emails are stored privately in Redis (`lb2:emails`), never returned by the API, and each inbox gets one player. Since Oct 19 the email is verified by signing in with Clerk (see below).
- **Fresh start (Oct 19):** when verified sign-in went live, the leaderboard was reset: Redis keys moved from `lb:` to `lb2:` (old data left unused), and browsers' saved progress and player moved to `atlas-daily-v2` / `atlas-player-v2`. Everyone starts again by signing in.
- **Verified sign-in with Clerk (Oct 19):** to post a score you sign in with an email code or Google (Clerk), so nobody can play under an email they don't own, and you keep one nickname on every device and browser. Clerk only proves the email: the player, nickname, scores and reminders stay in our Redis, found by the verified email (`lb2:email-owners`) and tied to the Clerk account (`lb2:accounts`). A player who joined before sign-in keeps their spot by signing in with the same email. **Switching away later** (e.g. our own email codes via Resend once there's a domain) only means replacing `verifiedUser()` in `src/lib/account.ts`; everyone signs in once more and lands on the same player. Keys set Oct 19 (development keys). **Caveat:** Clerk's production mode needs a domain we own; on `scale-shift.vercel.app` it runs in development mode (a small badge, and Clerk caps development sign-ups at 100), fine until the domain is decided.
- **Privacy, terms and age (Oct 23, Anthony's calls):** the contact address is `borderdrift.team@gmail.com` (a shared Gmail, forwarded to Anthony; move to a domain address once borderdrift.com is bought). `/privacy` and `/terms` copy lives in `src/content/legal.ts`; keep it true to the code whenever data handling changes. An "I'm 13 or older" checkbox is required before any sign-in or email join (`AgeCheck.tsx`, remembered in `atlas-13plus`); a lawyer may prefer a neutral birth-year question before ads. "Delete my data" on /leaderboard removes the player from Redis (`deletePlayer`) and deletes the Clerk account. The old `lb:` keys from before Oct 19 should be purged in the Upstash console so the policy holds.
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
- **Look: "Daylight Arcade" (Oct 21).** **Name: Border Drift** (Oct 21, chosen by Anthony and Evan; the URL stays scale-shift.vercel.app until the domain is bought). Bright, friendly and game-like: a cream page, white cards, chunky buttons that press down. World-map silhouette page headers stay. The `/map` page keeps its own dark panels.
- **Colors** (`src/app/globals.css`): page `#FFF8EC`, cards `#FFFFFF`, line `#E8DFCF`, ink `#1D2140` (also for any section that must stay dark), muted text `#5D6280`; primary blue `#2563EB` (shadow `#1A47B0`), red `#D93A2B` (shadow `#A82A1E`), green `#21B26B` (shadow `#16804C`; green text on white uses `#15803D`), gold `#FFC233` (shadow `#C48E00`, ink text on it); map tiles `#E3F1FF`; game shapes `#2F6BFF` / `#FF5B4A` (fills only). Eight political-map pastels for countries (`src/lib/palette.ts`). All text 4.5:1 or better.
- **Shapes and buttons:** radii buttons 16px, cards 20–22px, panels 28px, pills fully round. Use the classes in `globals.css`: `.btn` + `.btn-primary` / `.btn-red` / `.btn-gold` / `.btn-white` (44px tall, `.btn-lg` 56px for main actions; a `0 6px 0` shade that drops 4px on press) and `.press-card` for white cards that are links. Blue uppercase eyebrows above headings. Respect reduced motion.
- **Homepage globe** (`src/components/home/Globe.tsx`): drawn from `public/data/globe.json` (built by `scripts/build-globe.mjs`). Only the countries are redrawn as it turns (20 fps, starts after page load); the sea, glow and shading are CSS. Keep it that way or homepage performance drops below 90.
- **Copy voice for hooks:** a dare backed by a true fact ("On most maps, Russia looks far bigger than Africa. In reality, Africa is nearly twice its size."). Don't lead with Greenland vs Africa: it's thetruesize.com's signature example (originality check, Oct 20). Never invent statistics about players.
- **Type:** Bricolage Grotesque 800 for headings, numbers and the wordmark (`font-display`), Inter for body text.
- **Writing voice:** plain, specific, active. Buttons say what happens. Errors say what to do next.

## Known issues and limits
- Borders before about 1800 are approximate; snapshots are 50–200 years apart in ancient times.
- Antarctic claim areas exclude the floating ice shelves.
- Searchable places are countries, US states and historical states. The v1 site also had Canadian and other provinces, continents and "all claims" realms; bringing those back needs data-pipeline work.
- Forms don't keep anything on Vercel until their settings are added (see below).
- Sign-in (Clerk) runs in development mode on scale-shift.vercel.app (a small badge and a 100-sign-up cap) until the domain is bought.
- Vercel's Hobby plan is for non-commercial use. Keep the repo public, or move to Pro, if either owner's merges stop deploying.

## How we work (agreed Oct 22)
- **One task at a time.** The queue lives in issue #40. Claude builds one task end to end, then a separate **reviewer agent** checks it independently (bugs, accuracy, Anthony's exact words, a phone-size playthrough). Facts get a second **fact-check agent** with two sources each. Anthony confirms the merge, and only then does the next task start. This applies to the work queue in #40; Evan still ships his own work as CLAUDE.md describes.
- Map data and the map engine are Evan's area; problems found there go to him as issues (#89, #93).
- **Speed never costs quality (Anthony, Oct 23).** A faster version must look and work at least as well as before: compare images at full zoom (lossless or visually identical only), keep animations smooth (the home globe draws in a background worker so it spins at 20 fps without slowing the page; browsers without OffscreenCanvas fall back to the main thread, which aims for at least 8 fps) and never trim content to win a score. If a speed-up can't keep quality, skip it and say so.

## Roadmap (agreed Oct 22; each item its own PR, Anthony confirms before merging)
**Done Oct 22:** history notes for all 120 historical places (#94), "Play more rounds for fun" starts at the top (#95), sounds on by default (#96), the reveal's map line matches the cards (#97).

**Now: fix everything else first**
1. Docs on the new name and decisions (this file, README, CLAUDE.md).
2. Load sign-in (Clerk) only when someone taps Join or Sign in (#91).
3. Site-wide accessibility audit after the rebrand (#92).
4. A full systems check: speed, errors, UI and transitions, spelling and grammar, copyright, design quality; report back with questions.
5. Evan: close Antarctica to the South Pole (#38) and faster `/map` on phones (#38, #89); 15 daily shapes that don't match their real history (#93).

**Next: the game**
6. **Endless streak mode:** unlimited matchups, harder each round (big tricks first, then pairs within ~10%), ending on the first miss. Best streaks go on a leaderboard joined the same way as the daily; the server re-checks every answer.
7. **More places:** islands and territories, more empires and peoples. Real data only; past daily puzzles never change.
8. **Sounds:** copyright-safe (CC0) meme-style win and fail clips; no real meme or TikTok audio.
9. **Explainer:** in each reveal, a short animation slides the shape from its latitude to the equator and shrinks it, with one plain sentence.

**Later**
10. Launch checklist before any money (issue #40): domain, Clerk production, analytics, Resend, LLC, a license check before selling anything made from GPL map data.
11. `/history/[empire]` timeline pages (from the v1 site), provinces and continents in search, more snapshots at famous peaks (Rome AD 117, Ottomans 1683, British Empire 1922), a "who ruled this spot?" puzzle, side-by-side mode, globe view, historical populations, translations.

## Open decisions
- Domain: buy borderdrift.com (check it is still free), then connect it and switch Clerk to production
- Analytics (GA4 ID in Vercel) and form delivery (webhook vs Resend)
- Slack with @Claude for both owners (after both have shipped from their laptops)

## Status and setup log
_Last updated: October 23, 2026_

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
- Decided Oct 20: Anthony and Evan each merge and ship any change on their own once CI passes, big ones included. No approvals or waiting on the other owner. (Since Oct 22, tasks from the #40 work queue also wait for Anthony's OK before merging; see "How we work".) The hourly checks notify each owner when the other ships.
- Issues are on. Leftover branches from merged PRs are deleted.
- Working from a Claude Code cloud session: GitHub's GraphQL API is blocked there, so `gh pr list`, `gh pr checks` and `gh pr merge` fail. Use the REST equivalents (`gh api repos/AnthonyTFM/scale-shift/...`) or finish the step from a laptop.

**Open setup items**
1. ~~Invite Evan as a collaborator~~ Done Oct 19.
2. ~~Confirm Evan's test PR deploys~~ Done Oct 19: PR #5 merged and deployed to production under his name.
3. Connect form delivery: set `SUBMISSIONS_WEBHOOK_URL` or the Resend settings in Vercel. Until then the live site's forms don't save.
4. ~~Add Upstash Redis~~ Done Oct 19.
5. ~~Pick the final name~~ Done Oct 21: Border Drift. Domain: see Open decisions.
6. Later: Slack with @Claude for both owners.

## Working with Claude (examples that work well)
- "Pull the latest main, then add a comparison page for the Aztec Empire vs Mexico and ship it."
- "Open an issue for adding AD 117, assign it to me, then research where we can get licensed boundary data for that year."
- "Make the timeline dock easier to use on a 375px phone. Open the PR but don't merge; I want Anthony to see the preview."
- "Run the full checks and the e2e tests, and tell me anything that's broken."
