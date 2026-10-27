# Border Drift: live-site QA (Phase 1) and speed, robustness and accessibility (Phase 4)

**Site:** https://scale-shift.vercel.app (production `main`, repo at `22d0ce0`, "Homepage: gold endless card beside today's game (#160)")
**Date:** 2026-10-27
**Browser:** Playwright Chromium 1194 (headless). **WebKit was not available in this sandbox, so iOS Safari was not tested**: native share sheet, iOS touch-drag feel and `100dvh` behaviour are untested.
**Viewports:** 390×844 (phone, touch), 768×1024 (tablet, touch), 1440×900 (desktop).
**Evidence:** screenshots, logs and raw JSON are in `/tmp/claude-0/-home-user-scale-shift/6208685b-4902-5ed5-91f9-3b9851dbbcc5/scratchpad/audit/qa/`. Lighthouse reports (HTML and JSON) are in `.../audit/qa/lighthouse/`. Scripts are in `.../audit/scripts/`.

**Nothing was written to production.** `POST /api/plays` (the anonymous daily counter) was answered locally in every run, so the retention stats are untouched. The leaderboard join, the contact form and "Delete my data" were never submitted. The Join pop-up was only opened and closed. In the blocked-API test, Clerk's sign-in window was opened but nothing was entered.

---

## Summary

The site is in good shape. Over 462 page views, the link checker found no broken internal links. No page threw a console error in normal use, and no page scrolls sideways at any of the three widths. axe found **no violations on any content page**. Accessibility, Best Practices and SEO score **100 on every Lighthouse run**. The daily and endless games work end to end on phone and desktop, by touch and by keyboard. Error states for the leaderboard, the daily data and era loading are clear and offer a retry. Reduced motion is respected everywhere: the globe stops, the map's border sweep is skipped and the reveal animations stop.

The problems are concentrated on **/map**:

- It is the one page that misses the speed targets on a phone: Lighthouse mobile Performance is 65–73, with about 2 s of main-thread blocking.
- Its floating panels collide on phone and tablet.
- A few keyboard and screen-reader paths are missing or awkward.

Mobile LCP on content pages is borderline: it falls between 1.5 s and 3.7 s depending on the run.

No P0 issues (broken or wrong in normal use) were found.

---

## Lighthouse scores

Lighthouse 13.5.0, default mobile (simulated Moto G Power, slow 4G, 4× CPU) and `--preset=desktop`. Five mobile pages were re-run with nothing else on the machine. Where the two runs differ, both are shown as "run 1 / run 2". Mobile LCP on the content pages moves by about ±1 s between runs, so treat single values as noisy.

| Page | Mobile Perf | A11y | BP | SEO | Mobile LCP | CLS | TBT | Desktop Perf | A11y | BP | SEO | Desktop LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 96 / 95 | 100 | 100 | 100 | **2.6 / 2.7 s** | 0 | 90 / 140 ms | 100 | 100 | 100 | 100 | 0.5 s | 0 | 0 ms |
| `/daily` | 100 | 100 | 100 | 100 | 1.5 s | 0.011 | 50 ms | 100 | 100 | 100 | 100 | 0.4 s | 0.001 | 0 ms |
| `/map` | **73 / 65** | 100 | 100 | 100 | 1.4 / **3.2 s** | 0 | **1,790 / 2,050 ms** | 95 | 100 | 100 | 100 | 0.5 s | 0.001 | 190 ms |
| `/eras` | **88** / 100 | 100 | 100 | 100 | **3.7** / 1.5 s | 0 | 120 / 50 ms | 100 | 100 | 100 | 100 | 0.4 s | 0 | 0 ms |
| `/eras/1914` | 94 / **86** | 100 | 100 | 100 | **2.9 / 3.7 s** | 0 | 110 / 120 ms | 100 | 100 | 100 | 100 | 0.6 s | 0 | 0 ms |
| `/timeline` | 97 | 100 | 100 | 100 | 2.4 s | 0 | 100 ms | 100 | 100 | 100 | 100 | 0.5 s | 0 | 10 ms |
| `/size/greenland` | 91 / 100 | 100 | 100 | 100 | **3.1** / 1.7 s | 0 | 130 / 60 ms | 100 | 100 | 100 | 100 | 0.5 s | 0 | 0 ms |

Targets are LCP < 2.5 s, CLS < 0.1, INP < 200 ms and every category at 90 or above. Bold values miss a target.

**INP** is not measured in Lighthouse navigation mode. It was measured with web-vitals 4.2.4 on real taps at phone size, at 1× and at 4× CPU slowdown:

| Page and interactions | INP at 1× | INP at 4× | Worst interaction |
|---|---|---|---|
| `/daily`: 3 answers and 3 "Next round" taps | 104 ms | 136 ms | answer tile (processing 92 ms) |
| `/`: menu open/close | 72 ms | 152 ms | menu button |
| `/map`: intro, zoom, play backward, pause, panel, land tap | 64 ms | **224 ms** | input delay 195 ms (main thread busy drawing) |

**Page weight (mobile):** home 488 KiB, /daily 372 KiB, /map 506 KiB, /eras 917 KiB (49 era thumbnails).

---

## Findings

Effort: **S** is under 2 hours, **M** is half a day to 2 days, **L** is more than 2 days.

### P0: broken or wrong

None found. Every page loads with status 200. The sitemap's 231 pages and 235 internal links all resolve, there are no JS errors in normal use, and both games score correctly. (I checked several reveals against `public/data/daily/index.json` areas, and the endless run was played with correct answers for 7 rounds.)

### P1: hurts the experience

**P1-1. /map is slow to become usable on phones.** Effort: **L**. Page: `/map`.
- What a visitor sees: the map appears quickly, but for the first 2 to 4 seconds on a mid-range phone, taps feel sticky. The first tap (dismissing the intro or zooming) can take a quarter of a second to respond.
- Evidence:
  - Lighthouse mobile Performance is 73 and 65. TBT is 1,790 and 2,050 ms (target 200 ms). Main-thread work is 4.1 s and bootup 2.6 s.
  - Long tasks of 702, 387, 359, 327 and 210 ms all come from one chunk, `/_next/static/immutable/chunks/0k9oebe2wd_f0.js`. That chunk is the map app plus engine: it contains `markBase`, `prefetch`, `hitOverlay` and the "Couldn't load that era" copy.
  - INP at 4× CPU is 224 ms, of which 195 ms is input delay.
  - On desktop it scores 95, with TBT 190 ms.
- Repro: run Lighthouse mobile on `/map`, or open /map on a mid-range Android and tap "Start exploring" straight away.
- Source: `src/components/map/engine.ts`. The first frame draws every visible tile synchronously (the `tile()` calls in the draw loop). Off-screen tiles are already time-sliced in 6 ms chunks by `prefetch()`, but the visible ones are not. TopoJSON decoding happens in the same task. Likely fixes:
  - draw the first frame at low resolution and refine it in later frames;
  - slice the visible tiles across frames the way `prefetch` does;
  - decode the era file in a worker, as the home globe already does in `globe.worker.ts`.
- PROJECT.md lists this as Evan's area (#38, #89).

**P1-2. Floating panels pile on top of each other on phones.** Effort: **M**. Page: `/map` at 390 px.
- What a visitor sees: after picking a shape and changing era, the white "Showing today's borders for 2026 / Changed between present and 2026…" card sits *under* the dark "Greenland · Edit · Remove" bar, which covers two of its three lines. After tapping land, the "Who ruled here?" sheet, the year card and the "Cleared the map. Undo" toast are all stacked in the bottom half of the screen.
- Repro (phone):
  1. Open /map and tap Start exploring.
  2. Search for and pick Greenland.
  3. Tap the era name, type `2026` or `1492`, and press Go.
- Screenshots: `map_phone_12_year_error.png`, `map_phone_11_year_1492.png`, `map_phone_20_click_land_info.png`.
- Source: `src/components/map/AtlasApp.tsx` (the `phoneBar` group, around line 756) and `src/components/map/YearNote.tsx`. These need one bottom-sheet slot: when one opens, the others should close or stack.

**P1-3. On tablets, a picked shape lands half-hidden behind the side panel.** Effort: **S**. Page: `/map` at 768×1024 (also any window under about 900 px wide with the panel open).
- What a visitor sees: they search for "Greenland" and the map flies to it, but the left half of Greenland is under the panel. Dragging from the middle of the screen grabs the panel instead of the shape. In my run, the mouse drag on tablet did not move the shape at all, while the same drag on phone and desktop did.
- Repro: at 768×1024, open /map, search for "Greenland" and press Enter. Screenshot: `map_tablet_05_greenland_added.png`.
- Source: `fitTo` in `src/components/map/AtlasApp.tsx` (lines 115–126) frames the box in the full canvas (`engine.getSize()`) and ignores the panel's width. It should pass the free area (canvas width minus the panel, and minus the bottom bar height) to `fitView`.

**P1-4. On phones, the ◀ button next to Play runs the timeline backwards instead of stepping back one era.** Effort: **S**. Page: `/map` at phone width.
- What a visitor sees: they tap ◀ expecting "previous era", and the map keeps sweeping back on its own: Present → 2010 → 2000 → 1994 within 6 s. To stop it, they must find Pause. There is no one-step back or forward on phones: "Previous era" and "Next era" exist but are hidden below the `sm` breakpoint, so the only way to step is to drag the slider.
- Repro: at 390 px, open /map, tap Start exploring, then tap ◀ (its label is "Play timeline backward").
- Source: `src/components/map/EraBar.tsx` (the buttons around lines 120–200). Options: make ◀ and ▶ step once and keep Play for the animation, or give the backward-play button a distinct icon.

**P1-5. The /map intro card looks like a pop-up but keyboard and screen-reader users reach it last.** Effort: **S**. Page: `/map` (first visit).
- What a visitor sees: the "Maps lie about size." card dims the map like a dialog. For a keyboard user, however, the first Tab focuses the map canvas. The card's seven example buttons and "Start exploring" are tab stops 27 to 34, after every map control. A keyboard user can search for and move shapes on the dimmed map behind the card, which stays open (`kbd_map_canvas_focus.png`).
- Repro: on a first visit, or with site data cleared, open /map and press Tab repeatedly.
- Source: `src/components/map/IntroCard.tsx` and its placement in `AtlasApp.tsx`. Options:
  - render it as a modal `<dialog>` (`showModal()`), as the share and join pop-ups already do, which gives focus on open, a focus trap and Escape to close;
  - or at least move it first in DOM order and focus its heading on open.

**P1-6. Keyboard focus is lost after choosing a search result.** Effort: **S**. Page: `/map`.
- Repro: Tab to the search box, type "Alaska", press ↓ then Enter. Focus falls to `<body>`, so the next Tab starts again from the top of the page. It should stay in the search box, or move to the new shape's card or the map.
- Source: `src/components/map/SearchBox.tsx` (`onKeyDown`, around line 101) and `onPick` in `AtlasApp.tsx`, line 435.

**P1-7. "Who ruled here?" has no keyboard path.** Effort: **M**. Page: `/map`.
- Keyboard users *can* do the main task, which I verified: search adds a shape, the shape chips select it, and with the map focused, Shift+arrows move it (Alaska moved to 34°N and the card updated to "drawn 3.6× smaller than at home"), `[`/`]` rotate it and Delete removes it.
- However, clicking land to see its ruler history only works with a pointer. `onMapKey` handles arrows, + and -, `[`/`]`, Delete and Escape, but not Enter or Space.
- Source: `onMapKey` in `src/components/map/AtlasApp.tsx`, lines 466–485. Suggested fix: Enter opens `openPlace` for the point at the centre of the map, with a visible crosshair while the map has focus.

**P1-8. Contrast failure on the daily and endless reveal (WCAG 1.4.3).** Effort: **S**. Pages: `/daily`, `/endless`.
- After answering, the tile that is neither the answer nor your pick fades to `opacity-70`. Its subtitle ("today", "US state", "in 1200") then becomes #8E91A6 on white, which is **3.11:1** against a required 4.5:1. axe flags it on phone and desktop.
- Repro: on /daily, pick the correct tile and look at the other tile's subtitle.
- Source: `src/components/daily/Matchup.tsx`, around line 271 (the `"opacity-70"` class in the `look` string). Fix it by fading only the drawing rather than the text, or by switching the subtitle to `text-ink-soft`.

**P1-9. The era name on the phone map is an 18 px-tall tap target (WCAG 2.5.8).** Effort: **S**. Page: `/map` at phone width.
- The "Present ⌕" or "1914 ⌕" button that opens the year box measures 57–91 × 18 px. axe flags it as `target-size` (serious). On a phone it is easy to miss and hit the slider underneath.
- Source: `src/components/map/EraBar.tsx`, line 30 (the button inside the `aria-live` paragraph). Fix with `min-h-11` or vertical padding.

**P1-10. Mobile LCP is borderline on content pages.** Effort: **M**. Pages: `/`, `/eras`, `/eras/[slug]`, `/size/[slug]`.
- LCP fell between 2.4 s and 3.7 s in half the mobile runs. Lighthouse's breakdown shows the time going to **render delay, not download**:
  - home's LCP is `img[src=/globe-still.svg]`: TTFB 171 ms, load 81 ms, render delay 1,062 ms;
  - on /eras, /eras/1914 and /size/greenland, the LCP element is the header band `section.ocean-band`: render delay 1,055 to 2,057 ms.
- That pattern points at render-blocking CSS and font swap, or at the header waiting for client JS. Lighthouse also flags "render-blocking" (60–270 ms) and 45–91 KiB of unused JS per page.
- /eras also loads 49 era thumbnails (`/era-maps/<era>/thumb`), each about 28 KB larger than needed (image-delivery insight: about 520 KiB to save on mobile, 917 KiB total page weight).
- Repro: run Lighthouse mobile on `/eras/1914` two or three times.
- Source: the `ocean-band` header in `src/app/(site)/` pages and `globals.css`; the thumbnail route in `src/app/era-maps/`. Check what blocks first paint of the header: the font preload and display settings, and whether the band waits for hydration. Lazy-load or right-size the thumbnails below the first screen.

### P2: polish

**P2-1. Clicking the sea opens a "No state in the source here: Unclaimed land…" panel with coastal rulers.** Effort: **S**. Page: `/map`.
- Repro: click the Gulf of Guinea. The panel says "Unclaimed land, peoples without fixed borders…" and lists Bantu, West African cereal farmers and Benin for the 1° grid cell (`map_desktop_20_click_land_info.png`). One tablet run did say "Open ocean: no rulers recorded", so the grid knows about sea in some cells.
- Source: `InfoSheet.tsx` (around line 161) and `openPlace` in `AtlasApp.tsx`. Suggested fix: when there is no feature and the point is not land, say "Open sea", or do not open the panel.

**P2-2. Searching for a country with far-off islands frames empty sea.** Effort: **S/M**. Page: `/map`.
- "South Africa" includes the Prince Edward Islands, so the view centres on the ocean south of the Cape and the country sits in a corner (`probe_info_desktop_SouthAfrica.png`).
- Source: `fitTo` → `boundsOf`. Frame the largest landmass, as the daily game already does ("the main landmass" in PROJECT.md).

**P2-3. When era data fails to load, the map breaks quietly.** Effort: **S**. Page: `/map`.
- With `/data/eras/*` blocked:
  - The first load leaves a blank blue map with no message, and the browser logs an unhandled `Failed to fetch` page error.
  - Changing era does show a good toast, "Couldn't load that era. Check your connection and try again." However, the era label still switches to the failed era ("2010") while the old or blank map stays on screen.
- Screenshots: `blocked__data_eras__map_era.png`, `blocked__data__map.png`.
- Source: `changeEra` and the initial load in `AtlasApp.tsx`. Catch the first-load rejection, and only commit the era label after the layer loads.

**P2-4. The "1492 is one of our map snapshots." card adds noise.** Effort: **S**. Page: `/map`.
- Typing any year that is a snapshot opens a full-width card that says only this, and on phone it sits under the shape bar (see P1-2).
- Source: `src/components/map/YearNote.tsx`. Show a note only when the year is *not* a snapshot.

**P2-5. Moving a shape by keyboard is silent for screen-reader users.** Effort: **S**. Page: `/map`.
- The card text updates ("drawn 3.6× smaller than at home"), but no live region announces it. The live regions present are the era label (polite), an empty polite div and an empty status.
- Fix: announce "Alaska, 34° north, drawn 3.6 times smaller than at home" after keyboard moves, debounced.

**P2-6. Map controls sit outside landmarks (axe `region`, moderate).** Effort: **S**. Page: `/map`.
- The sr-only `<h1>`, the Home link, the compass wrapper and the era bar's label and badge are outside any landmark. Wrapping the era bar in `<nav aria-label="Timeline">` or a `<section>`, and the top-right controls in a toolbar region, clears it.

**P2-7. 404s inside `/size/[slug]` and `/eras/[slug]` keep the generic page title.** Effort: **S**.
- `/size/atlantis` and `/eras/3000-bce` return status 404 with the right "lost to history" content, but their `<title>` is "Border Drift: the real size of countries and empires through history" instead of "Page not found · Border Drift", which `/no-such-page` correctly shows.
- Source: `generateMetadata` in `src/app/(site)/size/[country]/page.tsx` and `eras/[slug]/page.tsx` should return a not-found title for unknown slugs.

**P2-8. The /teachers size table has 167 country links that are 17 px tall on phone.** Effort: **S**.
- This passes WCAG 2.5.8 through the spacing exception, but it is below the project's own rule of "every standalone link at least 44 px on phones".
- Source: `src/app/(site)/teachers/page.tsx`, line 83. Make the whole row the link, or add `block py-2`.

**P2-9. The search box focus ring looks doubled and offset on phone.** Effort: **S**. Page: `/map`.
- When focused, a blue ring is drawn around the inner input, starting after the magnifier icon and inset from the white box's edge (`map_phone_04_search_dropdown.png`).
- Source: `SearchBox.tsx`. Put the ring on the wrapper with `focus-within`.

**P2-10. Slow 3G is slow but holds together.** Effort: **M**. Pages: `/daily`, `/map`, `/`.
- Measured with CDP slow-3G emulation (400 ms RTT, about 400 kbps) and 4× CPU:
  - **/daily** shows the skeleton for about 12–15 s before the first puzzle is playable (394 KB transferred). After that, answering and "Next round" are instant (35–47 ms) because the five puzzles are preloaded.
  - **/** has its static hero immediately, but the cards hydrate at about 10 s.
  - **/map** draws at about 10 s. Switching to 1492 (254 KB) takes 8 s, with a visible "loading…" label.
- No error or stuck state appeared. Shrinking the daily's first payload (the first round's two shapes first, the rest after) would help most.

**P2-11. Versioned data files could be cached for longer.** Effort: **S**.
- `/data/**` is served with `cache-control: public, max-age=86400, stale-while-revalidate=604800`, but every URL carries `?v=<build>`. They could be `immutable` for a year, so returning visitors on phones re-use era files without revalidating. Lighthouse cache insight: up to 282 KiB on /eras.

**P2-12. Lighthouse flags `label-content-name-mismatch` on the daily tiles.** Effort: **S**.
- `aria-label="Venezuela, today"` differs from the visible text "Venezuela / today" only by the comma. It is harmless for voice control (saying "Venezuela" works) and does not lower the score. Dropping the `aria-label` and relying on the visible text would clear it.

**P2-13. Content note: the "Present" map predates three changes.** Effort: **M** (data). Page: `/map`.
- The year card itself says "Changed between present and 2026 (not yet on this map)": Russia's 2022 claims on four Ukrainian regions, the 2022 Hans Island split and Azerbaijan's 2023 retaking of Nagorno-Karabakh. This is honest, but worth a data refresh. It goes to Evan's data queue.

---

## Phase 1: hands-on notes by page

Each page was opened at the three viewports with screenshots (`crawl_<vp>_<page>.png`). Every button on the content pages was clicked at phone width; the log is in `clickall.log`.

| Page | Result |
|---|---|
| Home | The `load` event fires at about 3 s at every width, against 0.3–0.8 s for other pages. The content is visible well before that; the likely cause is the globe assets, but this is unconfirmed. No errors. Menu, the Daily/Endless leaderboard toggle and all cards work. After a daily round, the home card shows the streak (`home_*_after_daily.png`). |
| /daily | Full round played on phone and desktop. The reveal is ready in 60–230 ms and focus moves to "Next round". Results: score, title, streak and all-time cards. Share opens a native `<dialog>` and copies the text with the grid. Picture downloads `border-drift-daily-9.png`. Challenge copies a `#c=9.N` link. Join opens the 2-step pop-up, which closes with Escape and returns focus to Join. "Play more rounds" starts practice at the top. Reloading keeps the results. |
| /endless | Played until the first miss on phone and desktop: 7 right, then a deliberate miss at round 8. Levels advance (Warm-up → Getting closer → Tricky, 3/5). The run summary has a "NEW BEST!", "Play again", Share and "The one that got you". With the API down or returning 500, the game still runs on a local seed. |
| /map | Covered in detail above. Search with suggestions and a "no match" plus "Suggest it" state works. Drag works on phone and desktop by mouse and touch, and the card's "drawn N× smaller" updates. Keyboard move and rotate work. 14 years from 2000 BCE to 2026 load in 0.2–1.5 s each. Bad years give clear errors ("Our maps start in 2000 BCE", "That's in the future", "Try a year like 1453 or 300 BC"). Zoom buttons, wheel and double-click work. Labels, map key, "What changed?", Remove all with Undo, unit toggle, panel tabs, menu, Share (link and social) and "Download PNG" (`map_*_download.png`) all work. Resizing between 1440×900, 1024×600, 390×700, 844×390 (landscape phone) and back keeps the canvas matched with no overflow. |
| /leaderboard | Daily, week, all-time and endless tabs work; previous and next day work; the error state is "The leaderboard couldn't load. Try again". |
| /eras, /eras/[slug], /timeline, /disputes, /size, /size/[slug] | Load cleanly at all widths. Timeline sort and filter work. |
| /about, /how-it-works, /teachers, /privacy, /terms | Clean. |
| /contact | The empty submit shows friendly inline errors ("Which place is it about?", "Please write at least a sentence (10+ characters)."). It was not submitted. |
| 404 | `/no-such-page`, `/daily/extra`, `/api/nope` and `/data/eras/nope.json` all return a branded 404, "This page has been lost to history.", with "Open the map" and "Browse eras". See P2-7 for the title. |

**Console and network:** zero console errors and zero failed first-party requests in all 57 page and viewport loads and all game and map sessions. The only page errors were the deliberate `Failed to fetch` in the blocked-data test (P2-3).

**Link checker** (`scripts/qa/site-check.mjs`): 231 sitemap pages × 2 viewports = 462 page views and 235 internal links, with **no issues**. Globe countries appeared in 282 ms (fast) and 962 ms (slow 4G and slow CPU). Leaderboard store: redis.

---

## Phase 4 details

### Map data weight and lazy loading

- **On disk:** `public/data` is 21 MB, of which `eras/` is 11.4 MB for 49 files and `daily/` is 7 MB. None of it is downloaded up front.
- **First /map load** is 28–29 requests and about 480 KB in total. The data part is about 127 KB, all Brotli-compressed and served from the CDN cache (`x-vercel-cache: HIT`):
  - `eras/present.json`: 98 KB (319 KB raw);
  - `antarctic-claims.json`: 17 KB;
  - `lakes.json`: 12 KB.
- **Loaded on demand:**
  - each era when you visit it: 51 KB for 2000 BCE up to 254 KB for 1492 (raw 168–771 KB);
  - `polities.json` (55 KB) on the first search;
  - `rulers-grid.json` (99 KB, 1.5 MB raw) on the first land tap;
  - `us-states.json` (17–22 KB);
  - `era-stats.json` (15 KB).
  - On desktop, the neighbouring eras (1994, 2000) were fetched as I stepped.
- **A session that visits 14 eras** downloaded 1.33 MB (phone) to 1.47 MB (tablet) of data.
- **Verdict:** lazy loading is done well. The cost on phones is main-thread time to draw, not bytes (P1-1). 1492 is the heaviest era at 254 KB.

### Robustness

| Test | Result |
|---|---|
| Made-up URLs | Branded 404 with status 404. See P2-7 for the title. |
| `/api/*` aborted, and `/api/*` returning 500 | Home: static content plus a fallback leaderboard card. /daily: fully playable; results show "Join"; scores stay in the browser. /endless: playable on a local seed. /leaderboard: "The leaderboard couldn't load. Try again". No crashes. |
| `/data/daily/*` blocked | /daily: "We couldn't load the challenge." with a "Try again" button. |
| `/data/eras/*` or `/data/**` blocked | Changing era shows the toast "Couldn't load that era. Check your connection and try again." The first load fails silently with an uncaught page error (P2-3). |
| Slow 3G with 4× CPU | See P2-10. |

### Accessibility (WCAG 2.2 AA)

- **axe-core 4.10.2** (wcag2a/aa, wcag21a/aa, wcag22aa and best-practice) on 18 pages at phone and desktop, plus states: the daily reveal, the results, the join dialog, /map with a shape selected and /map with the menu open.
  - Content pages: **0 violations**.
  - /daily reveal: `color-contrast` (serious, 1 node; P1-8).
  - /map: `region` (moderate, 5–7 nodes; P2-6); on phone with a shape, `target-size` (serious, 1 node; P1-9).
  - Raw results: `axe.json`.
- **Keyboard, homepage:** "Skip to content" is the first stop, followed by a sensible order: nav, cards, the leaderboard toggle, explore links, footer. The focus ring is clearly visible (a blue rounded outline; `kbd_home_tab3.png`).
- **Keyboard, /daily:** Tab reaches Sound, then the two tiles. Enter answers, focus moves to "Next round" (the verdict is linked by `aria-describedby`) and a `role=status` announces the verdict. After Next, focus goes to the new question heading. Share and Join are native modal `<dialog>`s with focus inside, Escape closes them and focus returns to the trigger. The join checkbox is properly labelled; my script's empty name was a false alarm, and axe passed it.
- **Keyboard, /map:** the canvas is `role=application` with a full instruction label. A keyboard user can add, select (via chips), move, rotate, delete and compare shapes. Gaps are P1-5 (intro order), P1-6 (focus lost after search), P1-7 (no keyboard "who ruled here") and P2-5 (no announcement on move).
- **Screen-reader labels:** every map control has a name ("Zoom in", "Show labels", "Map key", "Remove all shapes", "Play timeline backward", the slider labelled "Era", and so on). The panel tabs use `role=tablist`. The era label is a polite live region.
- **Reduced motion:** verified with `prefers-reduced-motion: reduce`. The home globe is static, /daily has no running animations 400 ms after a tap, the map's era change shows the new map at once with no sweep frames, and no CSS or Web animations run on /, /daily or /map. Without reduced motion, the globe turns and the sweep animates, as expected.
- **Contrast:** axe passes everywhere except P1-8. The dark map panels (muted text on navy) passed.

---

## Screenshot index (selected)

- Crawl, every page × viewport: `crawl_{phone,tablet,desktop}_*.png`
- Daily: `daily_{phone,desktop}_r{1..5}_{ask,reveal}.png`, `daily_*_results*.png`, `results_*_{Share,Picture,Challenge_a_friend,Join}.png`, `results_*_Join_dialog_tab.png`
- Endless: `endless_*_r5.png`, `endless_*_runover.png`, `endless_*_summary.png`
- Map: `map_{phone,tablet,desktop}_NN_*.png`
  - 01 intro, 04 search, 05 picked, 07–09 drag, 10 keyboard move, 11 years, 12 year error, 14–16 zoom, 17–23 controls and share, 24 resize
  - `map_phone_play_backward.png`, `probe_info_desktop_*.png`
- Robustness: `404_*.png`, `api_{abort,500}_*.png`, `blocked_*.png`, `slow3g_*_{1,3,6,10,15,25}s.png`
- Keyboard: `kbd_*.png`
- Reduced motion: `reduced_daily_reveal.png`
- Logs: `games.log`, `results.log`, `map*.log`, `map_*.out`, `robust.log`, `a11y.log`, `inp.log`, `clickall.log`, `site-check.log`, `crawl.json`, `axe.json`, `map_*_requests.json`
