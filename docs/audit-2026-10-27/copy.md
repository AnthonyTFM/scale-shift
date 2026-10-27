# Border Drift: copy audit (phase 2, copy only)

Branch `polish/audit-2026-10-27`, audited 2026-10-27. Scope: every user-facing string in `src/content/*`, `src/app/**`, `src/components/**`, `src/lib/*` (strings that render), metadata, OG, aria and alt text. Historical facts were not checked (other reviewers own them). Nothing in the repo was edited.

Tags: **[AUTO]** = a safe typo, grammar or consistency fix. **[APPROVAL]** = changes tone or meaning. **[EVAN-FILE]** = the file is in one of Evan's open PRs, so report only and don't touch it now.

Overall the copy is in good shape. `codespell` and a manual pass found almost no spelling errors. The real problems are consistency (one leftover "BC", the board's name, the CTA wording, "true" vs "real", vs/vs.) and some jargon a 12-year-old would trip on (de facto, contiguous, satrapies, subject lands, snapshot, Mercator in the results screen). Copy that works for mouse users only ("Click …") shows up in several places, which matters because the site is mobile-first.

---

## 1. Spelling and grammar (real errors only)

| # | Tag | file:line | Before | After |
|---|---|---|---|---|
| 1.1 | [AUTO] | src/components/map/EraBar.tsx:57 | `Try a year like 1453 or 300 BC` | `Try a year like 1453 or 300 BCE` |
| 1.2 | [AUTO] | src/components/map/EraBar.tsx:72 | placeholder `e.g. 1453 or 300 BC` | `e.g. 1453 or 300 BCE` (the parser in src/lib/eras.ts:64 already accepts BCE) |
| 1.3 | [AUTO] [EVAN-FILE] | src/content/data-corrections.json:683 (shown on /about) | `neighbouring colonies` | `neighboring colonies` (the site uses US spelling everywhere else) |
| 1.4 | [AUTO] [EVAN-FILE] | src/content/data-corrections.json:769 (shown on /about) | `two or more neighbours … to the neighbour each shares` | `two or more neighbors … to the neighbor each shares` |
| 1.5 | [AUTO] [EVAN-FILE] | src/content/data-corrections.json:770 (shown on /about) | `the source's outlines of neighbours` | `the source's outlines of neighbors` |
| 1.6 | [AUTO] | src/content/region-context.ts:118 | `China claims most of it as “South Tibet”, and China's army` | `China claims most of it as “South Tibet,” and China's army` (US punctuation) |
| 1.7 | [AUTO] | src/content/events.ts:1713 | `Ending the good-humored 'Whisky War', in which` | `Ending the good-humored “Whisky War,” in which` (US punctuation and the site's curly quotes; see 3.2.10) |
| 1.8 | [AUTO] | src/components/map/EraBar.tsx:47 | `loading…` | `Loading…` (every other loading state is capitalized) |
| 1.9 | [AUTO] [EVAN-FILE] | src/components/map/AtlasApp.tsx:461 | PNG download falls back to the file name `scale-shift.png` | `border-drift.png` (the old product name reaches users) |

---

## 2. Eloquence (the best 46, high-traffic first)

### Homepage
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.1 | [APPROVAL] | src/content/home.ts:39 | "Most world maps stretch land toward the poles, so the countries you know best are drawn the wrong size. Border Drift shows every country and empire at its real size, across 4,000 years of history." | "Most world maps puff up land near the poles, so the places you know best are drawn the wrong size. Border Drift shows every country and empire at its real size, across 4,000 years of borders." | A more vivid verb. "Across 4,000 years of borders" matches the tagline. Also use `site.name` rather than the hard-coded name (see 3.1). |
| 2.2 | [APPROVAL] | src/content/home.ts:68 | "Watch shapes shrink and grow as they move, across 4,000 years of borders." | "Drag Russia to the equator and watch it shrink. Any country, any era." | A concrete picture instead of "shapes". It also avoids the Greenland example that thetruesize.com uses. |
| 2.3 | [AUTO] | src/content/home.ts:64 | `Beat your ${n}` | `Beat your ${n} in a row` | "Beat your 7" reads as a typo. It now matches `streakBeat` (home.ts:88). |
| 2.4 | [APPROVAL] | src/content/home.ts:13 | "Today's best and all-time points" | "Today's best, this week's and all time" | The leaderboard has three boards, and the menu blurb (site.ts:40) already says "Today, this week and all time". |

### Daily game and results
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.5 | [APPROVAL] | src/content/daily.ts:51 | "Sized the way a normal web map shows them. Tap the bigger one." | "Drawn the way a normal web map shows them. Tap the one that's bigger in real life." | "The bigger one" is ambiguous: on screen, the wrong one *is* drawn bigger. Endless already says "bigger in real life" (endless.ts:20). |
| 2.6 | [APPROVAL] | src/content/daily.ts:6 | "…Normal maps stretch land near the poles, so your eyes will lie to you. Go 5 for 5…" | "…Normal maps puff up land near the poles, so the one that looks bigger often isn't. Go 5 for 5…" | It's the map that lies, not your eyes. Says the trick plainly. |
| 2.7 | [APPROVAL] | src/content/daily.ts:100 | "Perfect. Mercator can't fool you." | "Perfect. No map can fool you." | "Mercator" is jargon on the most-seen screen for a 12-year-old. |
| 2.8 | [APPROVAL] | src/content/daily.ts:105 | "Tricky round. New questions tomorrow." | "The map won this one. Five new matchups tomorrow." | Cheekier and fits the voice. Uses the game's own word "matchups" (see 3.2.4). |
| 2.9 | [APPROVAL] | src/content/daily.ts:144 | "One matchup after another, closer the further you go. How far can you get?" | "One matchup after another, each a closer call. How far can you get?" | "Closer" alone is unclear (closer to what?). |
| 2.10 | [APPROVAL] | src/content/daily.ts:41 | "…A new five arrives at midnight." | "…Five new matchups arrive at midnight." | "A new five" is clunky. |
| 2.11 | [AUTO] | src/content/daily.ts:148 | "Couldn't make the picture. Try Share my score instead." | "Couldn't make the picture. Try sharing your score as text instead." | On phones the button says "Share", not "Share my score". |
| 2.12 | [APPROVAL] | src/components/daily/DailyChallenge.tsx:207 | "`{name}` sent you Daily #N, but this is today's. Play it and send your score back." | "`{name}` sent you Daily #N. That one's gone, but today's is ready: play it and send your score back." | "But this is today's" is hard to parse. |
| 2.13 | [APPROVAL] | src/app/(site)/daily/page.tsx:42 | "Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few percent. Your scores and streak are saved in this browser, and on your account if you sign in." | "Areas come from our map outlines (for an empire, its borders in the year shown), so they can be a few percent off official figures. Your scores and streak are saved in this browser, and in your account if you sign in." | Removes the jargon "snapshot". Also move this string into src/content/daily.ts. |
| 2.14 | [AUTO] | src/app/(site)/daily/page.tsx:11 | meta description "Five new size puzzles every day…" | "Five new matchups every day…" | The page itself says "matchups" (see 3.2.4). |

### Endless mode
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.15 | [APPROVAL] | src/content/endless.ts:9 | "Areas are calculated from our map outlines (historical states at the snapshot shown)… Your best run is saved in this browser, and runs by players on the leaderboard go on the all-time Best streaks board." | "Areas come from our map outlines (for an empire, its borders in the year shown), so they can be a few percent off official figures. Your best run is saved in this browser. Join the leaderboard and it goes on the Best streaks board too." | The second sentence is tangled. Removes "snapshot". |
| 2.16 | [AUTO] | src/content/endless.ts:28 | n = 1: "right answer in a row" (renders "1 right answer in a row") | n = 1: "right answer" | "1 … in a row" is odd. |
| 2.17 | [APPROVAL] | src/content/endless.ts:70 | "Join the leaderboard from the daily challenge's results, and your runs will post here too." | "Join the leaderboard from your daily challenge results, and your runs will show up here too." | Removes the awkward possessive. "Post" isn't plain English here. |

### Leaderboard
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.18 | [AUTO] | src/content/leaderboard.ts:13-15 | "…Every correct answer adds a point to the all-time ranking, and your longest run in endless mode goes on the Endless board." | "…Every right answer adds a point to your all-time total, and your longest run in endless mode goes on the Best streaks board." | The board is called "Best streaks" everywhere else (see 3.2.2). "Right answer" matches the game's wording. |
| 2.19 | [APPROVAL] | src/app/(site)/leaderboard/page.tsx:49 | "Each email gets one player, and each nickname belongs to the first player who uses it." | "One player per email, and each nickname belongs to whoever claims it first." | Tighter and plainer. |

### Map UI
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.20 | [AUTO] | src/content/site.ts:60 | "Click anywhere on land to see who controlled it in every era." | "Tap or click any land to see who ruled it in every era." | Mobile-first. Matches the "Who ruled here?" title. |
| 2.21 | [APPROVAL] | src/components/map/InfoSheet.tsx:184 | button "Drag its real size" | "Add it to the map" | The current label doesn't say what the button does. |
| 2.22 | [APPROVAL] | src/components/map/InfoSheet.tsx:161 | "No state in the source here" | "No state mapped here" | "The source" is insider language. |
| 2.23 | [APPROVAL] | src/components/map/InfoSheet.tsx:169 | "…or land the source map does not draw in this era." | "…or land our maps leave blank in this era." | Same as 2.22. |
| 2.24 | [APPROVAL] | src/components/map/InfoSheet.tsx:196 | "Rulers of this spot in each map snapshot (1° grid, ~100 km)." | "Who ruled this spot on each of our maps (accurate to about 100 km)." | Removes "snapshot" and "1° grid". |
| 2.25 | [APPROVAL] | src/components/map/ShapeCard.tsx:114 | "· drawn 1.6× bigger than at home" | "· drawn 1.6× bigger here than in its real spot" | "At home" is unclear. |
| 2.26 | [APPROVAL] | src/components/map/ShapeCard.tsx:106 and InfoSheet.tsx:178 | "Incl. subject lands" / "(… incl. subject lands)" | "With lands it controlled" / "(… with lands it controlled)" | "Subject lands" is jargon. |
| 2.27 | [AUTO] | src/components/map/ShapeCard.tsx:182 | button "Zoom to" | "Zoom to it" | The label reads as unfinished. |
| 2.28 | [APPROVAL] | src/components/map/ShareDialog.tsx:130 | "Download PNG" | "Save as picture" | Plain words. Matches the daily game's "As a picture". |
| 2.29 | [AUTO] | src/components/map/ShareDialog.tsx:38 | share text `${title} — see the real size on ${site.name}` | `${title}: see the real size on ${site.name}` | This is the only em dash in the site's copy. |
| 2.30 | [APPROVAL] | src/components/map/ComparisonsTab.tsx:14 | "Five new size puzzles every day. Keep your streak going →" | "Five new matchups every day. Can you go 5 for 5? →" | Not every visitor has a streak. Also uses "matchups". |
| 2.31 | [AUTO] | src/components/map/MapKey.tsx:85 | "Click it to see who controls it and who claims it." | "Tap it to see who controls it and who claims it." | Mobile-first. |
| 2.32 | [AUTO] | src/components/map/MapKey.tsx:146 | "…Click Antarctica for details." | "…Tap Antarctica for details." | Mobile-first. |
| 2.33 | [AUTO] [EVAN-FILE] | src/components/map/AtlasApp.tsx:584 and :600 | "…or click any land to see who ruled it." / "Click it for details and its border history." | "…or tap any land to see who ruled it." / "Tap it for details and its border history." | Mobile-first. |
| 2.34 | [AUTO] | src/app/map/page.tsx:7 | title "The map: drag countries and empires to their real size" | "The map: drag countries and empires to see their real size" | You drag to *see* the real size. Matches the OG alt (opengraph-image.tsx:9). |
| 2.35 | [AUTO] | src/components/map/ChangesPanel.tsx:80 and src/app/(site)/eras/[slug]/page.tsx:209 | "No curated events in this period yet." | "No events written up for this period yet." | "Curated" is jargon. |

### Era pages
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.36 | [APPROVAL] | src/content/era-intros.ts:7 | "The Late Bronze Age collapse has swept away the Hittites and weakened Egypt." | "A wave of wars and collapse has swept away the Hittites and weakened Egypt." | A 12-year-old won't know "Late Bronze Age collapse". |
| 2.37 | [APPROVAL] | src/content/era-intros.ts:15 | "…build the largest contiguous land empire in history." | "…build the biggest unbroken land empire the world has ever seen." | "Contiguous" is jargon. Same fix at events.ts:357. |
| 2.38 | [APPROVAL] | src/content/era-intros.ts:19 | "…the Mughal Empire is fragmenting as the East India Company expands." | "…the Mughal Empire is breaking apart as the East India Company grabs more land." | Plainer, more vivid verbs. |
| 2.39 | [APPROVAL] | src/content/era-intros.ts:29 | "…and decolonization is about to begin." | "…and Europe's empires are about to start losing their colonies." | Removes "decolonization". |
| 2.40 | [AUTO] | src/content/era-intros.ts:31 | "The Year of Africa, when 17 African countries win independence. The Cold War divides Europe." | "The Year of Africa: 17 African countries win independence. The Cold War splits Europe in two." | The first sentence is a fragment. |
| 2.41 | [APPROVAL] | src/content/era-intros.ts:35 | "…Hatched areas show where control on the ground and international recognition don't match." | "…Striped areas show places where who runs the land and who the world says owns it don't match." | "Hatched" is not a kid's word. MapKey says "Striped". |
| 2.42 | [APPROVAL] | src/app/(site)/eras/[slug]/page.tsx:100 | "What changed" values such as `4,512k km² → 5,103k km²` | Use `formatArea`/`compactNumber`: `4.51M km² → 5.10M km²` (and the visitor's unit) | "4,512k" is hard to read. Everywhere else uses M/million (see 3.4). |

### Size, disputes, timeline and how-it-works
| # | Tag | file:line | Before | After | Why |
|---|---|---|---|---|---|
| 2.43 | [APPROVAL] | src/content/sizes.ts:45 | "…It sits close to the equator, where normal web maps barely stretch land, so they show it at about its real size, and make countries farther from the equator look bigger than it." | "…It sits near the equator, where normal web maps barely stretch land, so they draw it close to its real size, while countries farther north or south look bigger than they are." | The ending ("look bigger than it") is tangled. |
| 2.44 | [AUTO] | src/app/(site)/disputes/page.tsx:25 | "Click any country on today's map and its disputes appear first…" | "Tap any country on today's map and its disputes appear first…" | Mobile-first. The same fix applies to how-it-works/page.tsx:19 ("Click any land" → "Tap or click any land"). |
| 2.45 | [APPROVAL] | src/content/disputes.ts:155, :179; src/content/events.ts:1353 (title) | "de facto state" / "de facto independent" / "Eritrea: de facto independent 1991, official 1993" | "a state in practice" / "independent in practice" / "Eritrea: self-ruled 1991, official 1993" | Latin jargon. (disputes.ts:55 "de facto border" → "the border it actually holds".) |
| 2.46 | [APPROVAL] | src/app/(site)/how-it-works/page.tsx:53 | "It keeps shapes and directions right locally, which is great for navigation. The cost is size…" | "It keeps compass directions and the shapes of small areas right, which made it great for sailors. The price is size…" | "Right locally" is jargon. |

Also worth a look (jargon in events, [APPROVAL]): events.ts:138 "assign satrapies to the generals" → "hand out provinces to the generals"; events.ts:646 "rejected the doctrine that it had been terra nullius" → "rejected the idea that the land had belonged to nobody (terra nullius)"; events.ts:886 "Four provinces confederate." → "Four provinces join together."; presets.ts:100 "The contiguous United States and Australia…" → "The lower 48 US states and Australia…" (and lib/daily.ts:174, which renders "the contiguous United States" in game answers); event-type tags in events.ts:1717-1728 "Cession" → "Handover" and "Dissolution" → "Breakup".

---

## 3. Consistency

### 3.1 Product name: every mention

**User-facing, through `site.name` (safe, updates with site.ts):** src/content/site.ts:4 (name), :11 (copyrightHolder); src/app/layout.tsx:14, :16, :17; src/app/(site)/page.tsx:19, :59 (JSON-LD); src/app/map/page.tsx:15; src/app/manifest.ts:6-7; src/app/opengraph-image.tsx:9, :37; src/lib/og-era.tsx:37; src/lib/result-image.ts:84; src/lib/challenge-friend.ts:11; src/components/site/Wordmark.tsx:21; src/components/site/SiteHeader.tsx:12; src/components/site/SiteFooter.tsx:10, :45 [EVAN-FILE]; src/components/map/AtlasApp.tsx:457, :492, :509, :629 [EVAN-FILE]; src/components/map/ShareDialog.tsx:38; src/components/daily/DailyChallenge.tsx:424; src/components/endless/EndlessGame.tsx:337; src/app/(site)/unsubscribed/page.tsx:7; src/app/(site)/teachers/page.tsx:127; src/app/(site)/about/page.tsx:13, :54, :199 [EVAN-FILE]; src/content/legal.ts:42, :48, :128, :129, :135, :166 [EVAN-FILE]; src/lib/submissions.ts:72, :88 (owners' notification emails only).

**"Border Drift" hard-coded (won't follow a rename) [AUTO]:**
| file:line | Text | Fix |
|---|---|---|
| src/content/home.ts:39 | "…Border Drift shows every country…" | `${site.name}` |
| src/content/teachers.ts:5 [EVAN-FILE] | "Everything on Border Drift, in one place" | `${site.name}` |
| src/content/teachers.ts:81 [EVAN-FILE] | citation "Border Drift. "Real size of countries and empires."…" | `${site.name}` |
| src/components/daily/DailyChallenge.tsx:405 | file name `border-drift-daily-N.png` | build it from `site.name` |
| src/content/site.ts:10 | `borderdrift.team@gmail.com` | Fine for now. It changes when the domain is bought. |

**Old names still present:**
| file:line | Text | User-facing? | Tag |
|---|---|---|---|
| src/components/map/AtlasApp.tsx:461 | `scale-shift` PNG file-name fallback | Yes (download name) | [AUTO] [EVAN-FILE] |
| Live URL `scale-shift.vercel.app` (NEXT_PUBLIC_SITE_URL; README.md:5, :26; docs/PROJECT.md:8, :57, :70, :108, :115; scripts/qa/site-check.mjs:19) | Shows in every shared link and in canonical URLs | Yes, until the domain is bought | [APPROVAL] (decision, not copy) |
| .env.example:17 | `NOTIFY_EMAIL_FROM=Scale Shift <forms@…>` | Owners only (sender name on feedback emails) | [AUTO] |
| package.json:2 | `"name": "scale-shift"` | No | leave |
| src/lib/name-filter.ts:26 | `"scaleshift"` (blocked nickname) | No (intended) | leave |
| docs/PROJECT.md:8, :14 | "Scale Shift", "Atlas Drift" (history notes) | No | [EVAN-FILE], leave |
| README.md:1; CLAUDE.md:1; docs/PROJECT.md:1, :57, :132 | "Border Drift" | No | [EVAN-FILE] |

**"Atlas":** not used as a product name anywhere a user sees it. Internal only: `AtlasApp`, `.prose-atlas` (globals.css, about/page.tsx:60, how-it-works/page.tsx:50, LegalPage.tsx:30), localStorage keys `atlas-*` (layout.tsx:37, lib/daily.ts:200, lib/endless.ts, lib/units.ts, lib/player.ts, lib/report-play.ts), and the `world-atlas`/`us-atlas` packages (credited on /about:77).

**"True size" (a competitor's name, best avoided in our own UI):**
| file:line | Text | Fix | Tag |
|---|---|---|---|
| src/app/(site)/teachers/page.tsx:127 | "How Border Drift shows true sizes →" | "…shows real sizes →" | [AUTO] |
| src/components/map/ShapeCard.tsx:96 | "True area" | "Real area" (as in sizes.ts:49, teachers/page.tsx:67) | [AUTO] |
| src/content/teachers.ts:38 | "True areas from today's map…" | "Real areas…" | [AUTO] [EVAN-FILE] |
| src/content/teachers.ts:20 | "keeps shapes and compass directions true" | Fine (it's an adjective here) | n/a |
| package.json:53 | description "…to see their true size." | "real size" (not user-facing) | [AUTO] |
| src/app/(site)/about/page.tsx:198-199 | Credit and non-affiliation note naming "The True Size" | Intended, keep | [EVAN-FILE] |

### 3.2 UI terms and capitalization
| # | Tag | Finding | Where | Recommendation |
|---|---|---|---|---|
| 3.2.1 | n/a | "Daily challenge" / "daily challenge": correct sentence case everywhere (label: site.ts:17, :38, home.ts:45, daily.ts:4, daily/page.tsx:9, ComparisonsTab.tsx:13; lowercase mid-sentence in 10 places). There is no "Daily Challenge" in the UI. Same for "Endless mode" (labels) and "endless mode" (mid-sentence). | n/a | Keep. |
| 3.2.2 | [AUTO] | The streak board has four names: "Best streaks board" (endless.ts:9, :58, :72, :75), "Best streaks ever" (endless.ts:56, home.ts:84), "Best streaks of all time" (endless.ts:82) and "Endless board" (leaderboard.ts:15). | as listed | Use "Best streaks board" in sentences. "Best streaks ever" works as a card title. Fix leaderboard.ts:15. |
| 3.2.3 | [APPROVAL] | The "play today" CTA has seven wordings: "Play today's game" (home.ts:34, :43), "Try today's five" (home.ts:28), "Play today's five" (endless.ts:43), "Today's challenge" (teachers/page.tsx:257), "Play today's challenge" (UnsubscribeResult.tsx:21), "See today's answers" (home.ts:29, :51) and "Today's results" (endless.ts:44). | as listed | Pick one pair: "Play today's five" / "See today's results". |
| 3.2.4 | [APPROVAL] | Names for one game unit: "matchups" (daily.ts:6, :8, home.ts:42, endless), "Round 1 of 5" (daily.ts:50), "questions" (daily.ts:105; screen-reader text DailyChallenge.tsx:284, :467; teachers.ts:69 [EVAN-FILE]) and "size puzzles" (daily/page.tsx:11, ComparisonsTab.tsx:14). | as listed | "Matchup" for the thing and "round" for its position. Change the screen-reader "Question 1: correct" to "Round 1: right". |
| 3.2.5 | [APPROVAL] | Countdown and refresh wording: "Next game in 3h 12m" / "A new game is ready" (home.ts:92-93) vs "Next challenge in 03:12:45" / "A new challenge is ready. Load it →" (DailyChallenge.tsx:599, :591) vs "New matchups at midnight your time" (daily.ts:6). | as listed | One noun ("Next five in…") and one time format. Also move the DailyChallenge strings into src/content/daily.ts. |
| 3.2.6 | [AUTO] | "vs" (no period) in 13 places (presets.ts titles, size/page.tsx:9, YesterdayMatchup.tsx:158, AtlasApp.tsx:453) vs "vs." in 8 (timeline/page.tsx:7, disputes/page.tsx:11 and :22, contact/page.tsx:30, lib/daily.ts:44-45, lib/endless.ts:39-40). The gold "VS" coin (daily.ts:92) is a design badge and is fine. | as listed | Standardize on "vs". |
| 3.2.7 | [AUTO] | Change-list headings differ between the era page and the map panel: "Grew the most / Shrank the most / Appeared / Disappeared" (eras/[slug]/page.tsx:189-192) vs "Grew most / Shrank most / Appeared / Gone" (ChangesPanel.tsx:84-87). | as listed | Use the era page's set in both. |
| 3.2.8 | [AUTO] | "Hatched" (era-intros.ts:35, disputes.ts:30) vs "Striped" (MapKey.tsx:146). | as listed | "Striped" everywhere. |
| 3.2.9 | [APPROVAL] [EVAN-FILE] | The era label "Present" (src/data/eras.json) shows in EraBar, YearNote ("Next map: Present →", YearNote.tsx:74) and search ranges ("1914 – Present", SearchBox.tsx:50). Everywhere else says "today". | src/data/eras.json | Relabel as "Today" (via the data file, or map the key to "Today" at display). |
| 3.2.10 | [AUTO] | Quote style: straight single quotes in events.ts:973, :1182, :1713; disputes.ts:119, :289; teachers.ts:69 [EVAN-FILE]; corrections.ts:8 [EVAN-FILE]; data-corrections.json (many) [EVAN-FILE]. Curly double quotes in region-context.ts:118, how-it-works/page.tsx:19, legal.ts:98, SearchBox.tsx:166. | as listed | Curly double quotes “…” for quoted terms. |
| 3.2.11 | [AUTO] | "First World War" / "Second World War" ×6 (era-intros.ts:23, :27; daily-context.ts:102, :166, :170, :470) vs "World War I" (events.ts:1551). | events.ts:1551 | "As the First World War ends…" |
| 3.2.12 | [AUTO] [EVAN-FILE] | "1/cos² of the latitude" (about/page.tsx:20) vs "1 ÷ cos²(latitude)" (teachers.ts:21, :41). | as listed | One notation, "1 ÷ cos²". |
| 3.2.13 | [APPROVAL] | Map naming: "normal map" (game), "normal web map" (size pages), "web map", "world map", "usual world map" (presets.ts:19). | n/a | "Normal map" in the games and "normal web map" in reference pages is fine. Drop "usual world map". |
| 3.2.14 | [AUTO] | "All-time" (adjective: daily.ts:126, home.ts:75) vs "All time" (noun: LeaderboardView.tsx:19 tab). Both are correct usage. | n/a | Keep. |

### 3.3 Dates
- BCE/CE is used everywhere except **EraBar.tsx:57 and :72 ("300 BC")**. See 1.1 and 1.2 [AUTO]. The parser comment in lib/eras.ts:61 also lists "BC"/"AD" as accepted input, which is fine for input.
- No "2,000 BCE": all dates are written "2000 BCE".
- `formatYear` (lib/eras.ts:30) adds "CE" only below 1000 ("395 CE", "1453"). Hand-written copy sometimes leaves "CE" off years under 1000 ("It fell in 476", "(224–651)", "(661–750)", "in 711" in daily-context.ts and events.ts). That's acceptable because CE is the default, and BCE ranges always say "BCE". No change needed. Optionally add "CE" when a bare year under 1000 stands alone in a sentence.
- "c." for approximate dates is used consistently.
- Era labels run "1 BCE" then "100 CE". The timeline slider tick says "1 CE" (EraBar.tsx:187), which is fine.

### 3.4 Units
- Visible copy uses only "km²" and "sq mi". There's no "km2", "mi²" or "square kilometers". Good.
- [AUTO] Thousands suffix: `compactNumber` writes an uppercase "K" (format.ts:8, e.g. "604K km²"), but the era page's "What changed" writes a lowercase "k" ("4,512k km²", eras/[slug]/page.tsx:100), and size pages write "million". Use `formatArea` on the era page (see 2.42).
- [APPROVAL] Unit choice: the map, the daily game and the map's ChangesPanel follow the visitor's unit. The era page's "What changed" (eras/[slug]/page.tsx:100) and the size index list (size/page.tsx:39) are km² only. Size pages and era tables show both units (km² first). The map toggle lists "sq mi" first (AtlasApp.tsx:606 [EVAN-FILE]). Suggest km² first everywhere, and both units wherever there's room.

### 3.5 Place names (map data uses Türkiye, Czechia, Eswatini, Côte d'Ivoire, Cabo Verde, Timor-Leste, Myanmar, DR Congo)
| Tag | Name | Status | Fix |
|---|---|---|---|
| [AUTO] | Türkiye vs Turkey | "Türkiye" ×20 in copy. "Turkey" in events.ts:1033 ("Turkey's borders are recognized", 1923) and :1270 ("Turkey's invasion divides Cyprus", 1974). | Use "Türkiye" in :1270, which is a modern event and matches its own summary at :1280. :1033 can keep "Turkey" only if the policy is "historical name before 2022". Decide once. [APPROVAL on the policy] |
| [AUTO] | Timor-Leste vs East Timor | events.ts:1297 title says "East Timor", but its summary (:1307) and the map say "Timor-Leste". | "Timor-Leste: invaded 1975, independent 2002" |
| n/a | Cabo Verde vs Cape Verde | events.ts:411 "370 leagues west of Cape Verde" (1494). | Fine as a historical place reference. Optionally "the Cape Verde islands". |
| [APPROVAL] | DR Congo vs Democratic Republic of the Congo | "DR Congo" (map, presets.ts:28-29, SearchBox) vs the full name (daily-context.ts:371). | Both are correct. Use "DR Congo" in short labels. |
| n/a | Côte d'Ivoire, Myanmar, Czechia, Eswatini, North Macedonia, Kyiv | Consistent. No "Ivory Coast", "Burma", "Czech Republic" (only in an internal regex, lib/daily.ts:170), "Swaziland" or "Kiev". | Keep. |
| [AUTO] | Bosnia | daily-context.ts:167 "Bosnia" vs the map's "Bosnia and Herzegovina". | "Bosnia and Herzegovina" |
| [AUTO] [EVAN-FILE] | Denmark-Norway vs Sweden–Norway | A hyphen in one and an en dash in the other: data names keyed in daily-context.ts:357/:477, lib/daily.ts:168 (regex), and data-corrections.json:739 ("Norway / Denmark-Norway / Sweden–Norway"). | Fix the displayed name via data-corrections.json (Evan's file). Use an en dash in both. |
| [AUTO] [EVAN-FILE] | Mamluke vs mamluks | The data name "Mamluke Sultanate" (title of daily-context.ts:269, lineages.ts:69) vs "mamluks" in its own description (daily-context.ts:270). | Rename to "Mamluk Sultanate" via data-corrections.json. |

### 3.6 Numbers and repeated claims
- "4,000 years" is consistent (site.ts:5, :7; home.ts:39, :68; contact/page.tsx:19; how-it-works/page.tsx:10; teachers/page.tsx:18; teachers.ts:6; InfoSheet.tsx:197; package.json:53). There is no "4000 years" or "four thousand". Small wording variant: home.ts:39 "4,000 years of history" vs "4,000 years of borders" everywhere else (see 2.1).
- [AUTO] "49 snapshots" is hard-coded three times in src/app/(site)/eras/page.tsx (:14 meta description, :29 eyebrow, :39 comment). home.ts:14 and about/page.tsx:54 use `eras.length`. Use `eras.length` so a new snapshot can't make it wrong.
- "about two minutes" (home.ts:42, teachers.ts:69) and "Five matchups" are consistent.
- "13 and up" / "13 or older" are consistent.
- For fact reviewers (wording differs, facts not checked): Alexander's empire is built "in about 11 years" (daily-context.ts:22), "in about ten years" (era-intros.ts:11) and "In about a decade of campaigning (334–325 BCE)" (events.ts:124).

---

## 4. Accessibility text

| # | Tag | file:line | Problem | Fix |
|---|---|---|---|---|
| 4.1 | [AUTO] | src/app/(site)/eras/page.tsx:35-36 | `id={\`g-${g.title}\`}` makes ids with spaces ("g-Ancient world"). `aria-labelledby` treats a space as a list separator, so all four section labels break. | Slugify: `g-ancient-world`. |
| 4.2 | [AUTO] | src/components/daily/LeaderboardView.tsx:276 | Screen-reader caption reads a raw ISO date: "Scores for 2026-10-27". | `Scores for ${prettyDate(board.date)}` |
| 4.3 | [AUTO] | src/app/(site)/disputes/page.tsx:75 | 24 identical links "See it on the map →". A list of links doesn't say which is which. | Add `aria-label={\`See ${d.name} on the map\`}`. EventCard.tsx:30 has the same problem ("See it on the 1914 map"); add the event title. |
| 4.4 | [AUTO] | src/components/home/HeroPlay.tsx:108 | `aria-live="polite"` on a countdown that changes every minute, so screen readers interrupt with "Next game in 3h 11m…" again and again. | Drop `aria-live`, or set it only on the "A new game is ready" state. |
| 4.5 | [AUTO] | src/components/map/ShapeCard.tsx:79 | Color swatches are labeled "Color 1" … "Color 8". | Use color names ("Blue", "Orange", …). |
| 4.6 | [AUTO] [EVAN-FILE] | src/components/map/AtlasApp.tsx:684-685 | A toggle with `aria-pressed`, `aria-label="Show labels"` and `title="Toggle labels"`. It reads as "Show labels, not pressed", and the title doesn't match the label. | `aria-label="Labels"` (the pressed state says on or off) and `title="Labels on/off"`. |
| 4.7 | [AUTO] [EVAN-FILE] | src/components/map/AtlasApp.tsx:645-646 | `aria-label="Home"` vs `title="Back to the homepage"`. | One wording: "Home page" for both. |
| 4.8 | [AUTO] | src/app/(site)/eras/[slug]/opengraph-image.tsx:6 | The OG alt is generic on every era: "World map of borders in this era". | Include the year ("World map of borders in 1914"). |
| 4.9 | [APPROVAL] | src/app/(site)/eras/[slug]/page.tsx:130 | The alt ends "…on an equal-area projection" (jargon). | "…drawn so every country shows at its real size". |
| 4.10 | [AUTO] | src/components/daily/DailyChallenge.tsx:272 | `aria-label="Progress"` is vague, and its items say "Question N" while the screen shows "Round N". | `aria-label="Your answers so far"`, with items "Round N: right / wrong / now / not yet". |
| 4.11 | [AUTO] | src/components/home/YesterdayMatchup.tsx:64 (Pair svg) | The svg's `aria-label` repeats `mapNote`/`realNote`, which are also printed in the paragraph below (:171-174), so screen readers hear each note twice. | Use the short labels only ("On a normal map" / "Real size"). |
| 4.12 | [AUTO] | src/components/site/StickyMapCta.tsx:57 | The `<aside aria-label>` repeats the link text inside it ("Play today's game" twice). | `aria-label="Quick link"`, or drop the label. |
| 4.13 | [APPROVAL] | src/components/map/Compass.tsx:28; src/components/map/MapKey.tsx:122 | The hints work for mouse users only ("double-click to reset", "rest your mouse near any edge"). There's no touch hint. | Add a touch line ("Two-finger twist to rotate", if supported) or hide the mouse tips on touch screens. |

No "click here" or "read more" link text was found. Decorative images (era thumbnails, dispute locators, flags, the globe still) correctly use `alt=""`, and SizePicture has a good descriptive `alt` (sizes.ts:47).

---

## Housekeeping (not counted)
These user-facing strings live in components rather than src/content, against the project rule: DailyChallenge.tsx:161, :168, :206-207, :450-453, :591, :599; YesterdayMatchup.tsx:141 (mapNote); LeaderboardView.tsx:17-19, :174, :219-220, :234, :248-251, :320-322; LeaderboardJoin.tsx:301-359; AccountBar.tsx:62-102; AccountJoin.tsx:46-118; InfoSheet.tsx (all); ShapeCard.tsx (all); MapKey.tsx (all); ShareDialog.tsx; ChangesPanel.tsx; YearNote.tsx; EraBar.tsx; Compass.tsx; ComparisonsTab.tsx; TimelineFilter.tsx; FeedbackForm.tsx; UnsubscribeResult.tsx; EventCard.tsx; the eras, timeline, disputes, how-it-works, contact and 404 pages; daily/page.tsx:42; leaderboard/page.tsx:49-55. Moving them makes later copy passes safer.
