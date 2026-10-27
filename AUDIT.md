# Border Drift audit: 27 October 2026

The audit ran on branch `polish/audit-2026-10-27`. Production at the time was `main` at #161. The detailed reports, with every finding, before/after table and source link, are in [`docs/audit-2026-10-27/`](docs/audit-2026-10-27/).

**Summary.**
- **Strengths:**
  - The site works.
  - It loads fastest of the seven sites benchmarked.
  - Lighthouse scores 100 for accessibility, best practices and SEO on every page.
  - The browser console shows no errors.
  - Map math checks out (true area kept exactly, size scales correctly with latitude).
- **Biggest gap: history copy.** Many history notes, timeline events and dispute entries were vague, out of date or one-sided. Several genocides, massacres and expulsions were missing. All of this has been fixed with sources, under the owners' "whole truth" rule.
- **Weak spots that remain:**
  - **/map on phones:** slow to respond, panels pile up, a few keyboard gaps.
  - **Delight and link previews:** Border Drift trails Wordle and Krillion here.
  - **18 historical map shapes** are drawn wrong. That data belongs to Evan.

## Scope (agreed in Phase 0)

| Area | Decision |
|---|---|
| Deep checks | Spelling, grammar, eloquence and accuracy; speed and robustness; accessibility to WCAG 2.2 AA |
| SEO and licensing | Noted only if serious |
| Voice | Playful documentary (unchanged) |
| Dates | BCE/CE |
| Device priority | Mobile-first |
| Fixed without asking | Typos, clear errors, sourced fact corrections, broken links, accessibility bugs |
| Needs approval | Copy rewrites, design and layout, map-engine changes |
| Not covered | Safari (WebKit isn't available in this environment) |
| Hands off | Files in Evan's open PRs: findings there are reported, not changed |

## Scorecard (benchmark, 1–5)

| Dimension | Border Drift | Best in class | Gap | Fix |
|---|---|---|---|---|
| 5-second clarity | 4 | 5, thetruesize.com | −1 | Show one real size reveal above the fold on phones (our own pairs, never Greenland vs Africa) |
| Onboarding | 4 | 5, NYT Wordle / Connections | −1 | A 2-second animated example in round 1. Replace the /map pop-up with an inline hint. |
| Load speed | 5 | 5, Border Drift | 0 | Cache /endless and /size like the homepage |
| Mobile feel | 4 | 5, Wordle | −1 | Shorter reveal scroll. /map: fewer buttons on the right edge, no stacked panels. |
| Visual polish | 4 | 5, Krillion (identity), Wordle (restraint) | −1 | A stronger visual identity. Tiles are already simpler since #161 (the dashed outline is gone). |
| Delight and motion | 3 | 5, Krillion | −2 | Celebrate right answers; today's score spread as a chart with "you" on it |
| Shareability | 3 | 5, Wordle, thetruesize | −2 | Preview images per /size page. Challenge links as real paths, so the preview can show the score. |
| Reason to return | 4 | 5, Worldle, NYT | −1 | Archive of past days, streak calendar, themed sets |
| Trust and credibility | 4 | 5, NYT | −1 | Named makers (the /team page, #154), a custom domain, Clerk in production mode |

**Totals (out of 45):** Border Drift 35, Wordle 41, Krillion 39, Connections 35, Globle 30, Worldle 29, thetruesize 28.

**Top 5 to borrow, as patterns only (no code, text or assets copied):**
1. Proof before words on the first screen.
2. Today's score spread drawn as a picture, with your place on it.
3. A crowd verdict for each question ("the map fooled 64% of people too").
4. More to play once the daily is done (archive, themed sets).
5. Link previews that show the idea and the score.

Full notes per site are in [benchmark.md](docs/audit-2026-10-27/benchmark.md).

## Lighthouse and Core Web Vitals (production, before the fixes)

| Page | Mobile Perf | Mobile LCP | Mobile TBT | Desktop Perf | A11y / Best Practices / SEO |
|---|---|---|---|---|---|
| / | 95–96 | 2.6–2.7 s | 90–140 ms | 100 | 100 / 100 / 100 |
| /daily | 100 | 1.5 s | 50 ms | 100 | 100 / 100 / 100 |
| /map | **65–73** | 1.4–3.2 s | **1,790–2,050 ms** | 95 | 100 / 100 / 100 |
| /eras | 88–100 | 1.5–3.7 s | 50–120 ms | 100 | 100 / 100 / 100 |
| /eras/1914 | 86–94 | 2.9–3.7 s | 110–120 ms | 100 | 100 / 100 / 100 |
| /timeline | 97 | 2.4 s | 100 ms | 100 | 100 / 100 / 100 |
| /size/greenland | 91–100 | 1.7–3.1 s | 60–130 ms | 100 | 100 / 100 / 100 |

- **CLS:** 0.011 or lower everywhere (target: under 0.1).
- **INP** (measured on real taps, phone size, 4× slower CPU): /daily 136 ms, home 152 ms, **/map 224 ms** (target: under 200 ms).
- The after-fix numbers are in the "Re-run" section at the end.

## Findings

Effort: **S** is under an hour, **M** is half a day, **L** is a day or more. ✅ fixed on this branch, 🟡 waiting for approval, 🔵 Evan's area (reported only).

### P0: broken or wrong

| # | Finding | Effort | Status |
|---|---|---|---|
| 1 | **History copy left out or got wrong documented atrocities and facts.** History notes: 83 findings (36 wrong). Timeline: 55 findings (7 wrong). Disputes and claims: about 25 findings. Examples: no Armenian Genocide, Holodomor, Nanjing, Nakba, Bangladesh 1971 or Srebrenica; "1938, the last full year of peace"; Somaliland, Golan and Gaza out of date. | L | ✅ 177 changes, each re-checked against a source ([history-applied](docs/audit-2026-10-27/history-applied.md), [events-applied](docs/audit-2026-10-27/events-applied.md), [disputes-applied](docs/audit-2026-10-27/disputes-applied.md)) |
| 2 | **The map's "drawn N× smaller than at home" label was off by up to 37%.** Greenland at 14°N said 11.1×; it is drawn 15.2× smaller. | S | ✅ Now measured over the whole shape |
| 3 | **Antarctica dragged off the pole has a hole about 1,100 km across.** About 7.9% of its area is missing, because the dragged copy is built from the version cut at 85°S. | M | 🟡 Needs a map-engine change |
| 4 | **18 historical map shapes are drawn wrong**, which skews "which is bigger?" answers. Examples: Khwarazmian 1200 is 98% inside Pakistan, Ayyubid 1200 is a copy of the Fatimid shape, Chagatai 1492 is several times too big. | L | 🔵 Evan's data, listed in [history.md](docs/audit-2026-10-27/history.md) section B |

### P1: hurts the experience

| # | Finding | Effort | Status |
|---|---|---|---|
| 5 | /map is slow on phones: main-thread blocking of 1.8–2.0 s, INP 224 ms | L | 🟡 Map engine |
| 6 | Panels pile up on the phone map (year card under the shape bar, "Who ruled here?" and the Undo toast stacked) | M | 🟡 / 🔵 AtlasApp.tsx is in Evan's PRs |
| 7 | On tablets, a searched shape lands half under the side panel | S | 🔵 AtlasApp.tsx |
| 8 | ◀ on the phone map played the timeline backward instead of stepping back | S | ✅ Phones get ‹ › one-step buttons |
| 9 | The map intro card looks like a pop-up, but keyboard users reached it 27 tab stops later | S | ✅ It takes focus when it opens |
| 10 | Keyboard focus is lost after choosing a search result | S | 🔵 AtlasApp.tsx |
| 11 | "Who ruled here?" can't be reached by keyboard | M | 🔵 AtlasApp.tsx |
| 12 | The faded tile on the reveal has text contrast of 3.1:1 (needs 4.5:1) | S | ✅ The drawing fades, the text stays |
| 13 | The era name on the phone map was an 18 px tap target | S | ✅ Now at least 24 px |
| 14 | Mobile LCP is borderline (2.4–3.7 s) on home, /eras, /eras/[slug] and /size; /eras loads about 520 KB of oversized thumbnails | M | 🟡 |
| 15 | Link previews are the same generic image on every page except the eras; challenge links can't preview a score | M | 🟡 Benchmark item 5 |
| 16 | The daily prompt "Tap the bigger one" is ambiguous, because the wrong one is drawn bigger | S | 🟡 Copy rewrite |
| 17 | Seven different wordings for "play today", and the countdown is worded two ways | S | 🟡 Copy rewrite |

### P2: polish

| # | Finding | Effort | Status |
|---|---|---|---|
| 18 | "300 BC" in the map's year box (everything else uses BCE) | S | ✅ |
| 19 | "Click" wording on a mobile-first site | S | ✅ "Tap" |
| 20 | Four names for the streak board; "True area" echoed the competitor's name | S | ✅ |
| 21 | /eras section labels were broken for screen readers (ids with spaces); 24 identical "See it on the map" links; countdown announced every minute; raw date in a caption; colour swatches called "Color 1" | S | ✅ |
| 22 | "Every country" isn't true: six small UN members and Vatican City aren't on the map | S | ✅ "Nearly every country" |
| 23 | Size superlatives in history notes and region notes, which show before the answer | S | ✅ Removed |
| 24 | 46 eloquence rewrites and jargon fixes ("Mercator can't fool you", "snapshot", "de facto", "contiguous", "Download PNG", "Incl. subject lands") | M | 🟡 Copy rewrites ([copy.md](docs/audit-2026-10-27/copy.md) §2) |
| 25 | Clicking the sea opens an "Unclaimed land" panel; searching South Africa frames empty sea; if the first era fails to load, the map stays blank with no message | S–M | 🟡 ([qa.md](docs/audit-2026-10-27/qa.md) P2) |
| 26 | 404s under /size and /eras keep the generic page title | S | 🟡 |
| 27 | On slow 3G the first daily puzzle takes 12–15 s | M | 🟡 |
| 28 | Map presets lead with Greenland, which PROJECT.md says not to lead with | S | 🟡 |
| 29 | Era stats may be stale after the lineage fixes (`npm run data:stats`) | S | 🔵 Writes files in Evan's PRs |
| 30 | Copy in Evan's files: the old name in the map download, `teachers.ts`, `legal.ts`, `data-corrections.json`, the "Present" label | S | 🔵 Listed in copy.md as [EVAN-FILE] |

### Serious SEO and licensing notes (noted only)

- **Live URL:** every shared link points to `scale-shift.vercel.app`. The custom domain (borderdrift.com) is on the domain-day list.
- **Preview images:** the generic preview image (see #15) is the only serious SEO issue.
- **Licensing:** no new risks found. Historical borders are GPL-3.0, already credited. Natural Earth is public domain. Natural Earth admin-1 should be credited on /about once Evan's PRs merge.

## Map math (verified)

| Check | Result |
|---|---|
| True area | Shapes are moved by rotation on the sphere and keep their true area exactly |
| Size by latitude | A small shape scales by 1/cos φ in width and 1/cos²φ in area, within 0.35% up to 84° |
| Pole cut | 85.0511°, the same as standard web maps |
| Date line | Fiji and Russia draw the same either side of it (0.00% difference) |
| Greenland vs Africa | Africa is 13.9× bigger in reality, yet a web map draws Greenland about 5% bigger than Africa |
| Russia at the equator | Shrinks 4.81× in area |

Numbers are in [mapmath-output.md](docs/audit-2026-10-27/mapmath-output.md).

## Commits on this branch

1. `11c0602` Copy and accessibility auto-fixes
2. `dd03a8c` Map: "drawn N× smaller than at home" measures the whole shape
3. `7c5a588` Disputes and size claims brought up to date, both sides given
4. `5925148` Timeline events, with sources
5. `fc8992b` History notes, era intros and region notes
6. `48d7798` Accessibility and phone fixes from the live run
7. This report

## Re-run after the fixes

Lighthouse (mobile) was run on production ("before", `main` at #161) and on this branch's preview ("after"), one run each, at the same time of day:

| Page | Perf before → after | A11y before → after | Best practices | LCP before → after | TBT before → after | CLS |
|---|---|---|---|---|---|---|
| / | 95 → 95 | 100 → 100 | 100 → 100 | 2.6 → 2.0 s | 110 → 216 ms | 0 |
| /daily | 92 → 99 | 100 → 100 | 100 → 100 | 3.0 → 1.6 s | 102 → 75 ms | 0 → 0.011 |
| /map | 62 → 59 | 100 → 100 | 100 → 100 | 3.4 → 3.8 s | 1,794 → 1,737 ms | 0 |
| /eras | 86 → 100 | 100 → 100 | 100 → 100 | 3.9 → 1.5 s | 160 → 47 ms | 0 |
| /disputes | 96 → 99 | 100 → 100 | 100 → 100 | 2.5 → 1.8 s | 100 → 79 ms | 0 |

- **What the numbers mean:** this branch makes no speed changes, so most of the differences between runs are noise. Earlier runs on the same pages swung by up to 15 points.
- **Accessibility and best practices** stay at 100. The fixed issues (contrast, tap target, labels) are now gone in manual checks too:
  - The faded reveal tile keeps its text at full contrast.
  - The phone map has ‹ › era buttons, and ‹ steps from Present to 2010.
  - The map intro card takes focus.
  - Nothing overflows sideways at 360 px.
- **/map is still slow on phones** (TBT about 1.7 s). That is P1 #5 and needs the map-engine work that is waiting for approval.
- **Before/after screenshots:** the reveal tile, the phone era bar and the Somaliland entry. They are attached to the PR conversation.
- **Checks:** lint, typecheck, build and check:data pass, and CI is green.

## What's left (top 3 next moves)

1. **/map on phones (P1 #5–7, 10–11):** spread the first draw over frames and fix the stacked panels and keyboard gaps. The map engine is ours. AtlasApp.tsx needs Evan's PRs to merge first, or Evan to take it.
2. **Delight and sharing (benchmark):** a "map size → real size" proof on the first screen, today's score spread as a chart with "you" on it, and link previews that show a comparison and the challenger's score.
3. **Evan's data (P0 #4):** 18 wrong historical shapes, plus the stale era stats and Natural Earth credit once his PRs merge.
