# Border Drift benchmark (27 Oct 2026)

Border Drift (https://scale-shift.vercel.app) against thetruesize.com, NYT Wordle, NYT Connections, krillion.io, worldle.teuteuf.fr and globle-game.com.

**Method.** Every site was opened and played in headless Chromium (Playwright) at 390x844 (phone, touch, iPhone UA) and 1440x900 (desktop). Screenshots were taken at 1 s, 2.5 s and 5 s after navigation, plus full pages, plus every play step. `navigator.share` and `clipboard.writeText` were intercepted to capture the exact share text. og: tags were read from the live DOM, and every og:image was downloaded (`bench/og/`).

**Caveat on speed.** All traffic went through a datacenter agent proxy, which adds latency to every request. Compare the numbers with each other, not with real-world Core Web Vitals. NYT blocked the bot partway through Connections, and Worldle's ad stack (1,600 to 2,500 requests) made the page hang. Worldle gameplay was therefore played with ad hosts blocked. Its first-load numbers below were taken with ads on.

Screenshots: `/tmp/claude-0/-home-user-scale-shift/6208685b-4902-5ed5-91f9-3b9851dbbcc5/scratchpad/audit/bench/` (names are `<site>-<phone|desktop>-<step>.png`).

---

## 1. Scorecard

| Dimension | Border Drift | Best-in-class (name it) | Gap | Fix |
|---|---|---|---|---|
| 5-second clarity | **4** | **5**, thetruesize.com | -1 | The headline ("Your map has been lying to you.") and the blue "Play today's game" button are clear. But the phone's first screen shows no *proof*: no shape shrinks and nothing looks visibly wrong. thetruesize shows the "aha" (big shapes laid over Africa) in the first view, before any words. Put one small, live, Border Drift-original size reveal above the fold. |
| Onboarding | **4** | **5**, NYT Connections / Wordle | -1 | /daily needs no modal: "Which country is bigger in real life? … Tap the bigger one." That is good. But "Sized the way a normal web map shows them" is a subtle idea, and a first-timer may not realise the tiles are *meant* to mislead. On phone, /map opens with a text modal over a blank or half-drawn map, and then a Greenland-led preset. Connections onboards in one line ("Create four groups of four!"). Wordle uses three example tiles. Show, don't tell: one 2-second animated example on the first daily round, and drop the /map modal for an inline hint. |
| Load speed | **5** | **5**, Border Drift itself (Krillion is next) | 0 | Fastest of the seven: home FCP 0.50 s on phone with 47 requests and zero console errors on every page. Competitors' FCP ranged 0.8–4.9 s; Worldle took 43–61 s to finish loading. Soft spots: /map draws its sea first, and one desktop run still showed an empty blue map at 2.5 s (TTFB 1.4 s). /endless and /size pages had a TTFB of 0.4–0.5 s against 0.1 s for home, so they look uncached. |
| Mobile feel | **4** | **5**, Wordle | -1 | Big chunky tap targets, a sticky "Next round" and a bottom CTA bar all work well. Weak spots: the answer reveal is a long scroll on phone (tiles, then a verdict, a "For scale" box and a "Why the map fooled you" box). The /map phone view has a 7-button rail over the right edge. The homepage is 3,600 px tall on phone, and /timeline is 15,400 px. Wordle fits the whole game on one screen with no scroll. |
| Visual polish & typography | **4** | **5**, Krillion (identity), Wordle (restraint) | -1 | "Daylight Arcade" is consistent and clean. Bricolage Grotesque plus Inter reads well. But it looks like a well-made generic product UI, not a place with its own character. The reveal tiles stack four visual layers: pale map-size shape, solid real shape, dashed "for scale" outline and inset locator map. That is a lot to parse in one second. Krillion is instantly recognisable from a single screenshot. |
| Delight & motion | **3** | **5**, Krillion | -2 | Border Drift has a shrink replay, confetti on a new endless best, pressable buttons and sounds. Krillion turns score into place: you *sink* through an ocean with depth markers, every answer gets a named rank ("Schooler, swims with the school"), and the end shows a bell curve with "YOU" on it. Border Drift's reveal is informative rather than fun; the motion explains and never celebrates a correct pick. |
| Shareability (share text, link previews) | **3** | **5**, Wordle (grid ubiquity); thetruesize (preview image that shows the idea) | -2 | Share text is good: `Border Drift Daily #9 · 2/5 / 🟥🟩🟥🟩🟥 / The map fooled me 3 times. Can you beat it? / <url>`. Endless has its own. But **every page except era pages shares one generic og:image** (logo card over a pale map), including /daily, /endless, /map, /timeline and all 167 /size pages. The image shows the brand, not the insight. The challenge link uses a hash (`/daily#c=9.2.`), which link-preview bots never see, so a challenge can never preview as "Anthony got 2/5 — can you beat it?". |
| Reason to return | **4** | **5**, Worldle (archive + bonus rounds + leagues + streak calendar) / NYT | -1 | Border Drift has a daily, streak, endless, two leaderboards, "Better than N% of players today", a scores chart and a countdown ("Next challenge in 08:59:51"). Missing so far: reminders (blocked on the domain), streak freeze, an archive of past days, bonus rounds and any per-question crowd data. Social proof is thin: the homepage shows "#1 streak ever: 7 in a row by WizardDev", which signals a small player base. |
| Trust & credibility (sources shown) | **4** | **5**, Border Drift itself on sourcing; NYT on named editors | -1 | Best of the set on sources: credits in every footer, an area-method note under every game, "Mostly precise/approximate borders" per era, and a sources page with corrections. thetruesize credits only Google map data. Points lost: no named humans (NYT shows "Edited by Tracy Bennett"), a "non-commercial educational project" footer that reads like a hobby, and the `scale-shift.vercel.app` URL (plus Clerk's development-mode badge at sign-in) still look unfinished. |

**Border Drift total: 35/45.** Its clear wins are speed, sourcing and depth of content (49 eras, 119 timeline events, 167 size pages; no competitor has anything like it). Its clearest gaps are delight and link previews.

### Competitor scores (same rubric, for reference)

| Site | Clarity | Onboard | Speed | Mobile | Polish | Delight | Share | Return | Trust | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| thetruesize.com | 5 | 4 | 2 | 4 | 4 | 3 | 3 | 1 | 2 | 28 |
| NYT Wordle | 5 | 5 | 3 | 5 | 5 | 3 | 5 | 5 | 5 | 41 |
| NYT Connections | 4 | 5 | 3 | 3 | 4 | 3 | 4 | 4 | 5 | 35 |
| Krillion | 4 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 3 | 39 |
| Worldle | 4 | 3 | 1 | 2 | 3 | 3 | 5 | 5 | 3 | 29 |
| Globle | 4 | 3 | 3 | 3 | 3 | 4 | 3 | 4 | 3 | 30 |

---

## 2. Load speed (measured via proxy; relative only)

| Page | Phone FCP / LCP | Desktop FCP / LCP | Requests | CLS (phone) | Console errors |
|---|---|---|---|---|---|
| **BD home** | **0.50 / 0.52 s** | 0.54 / 0.60 s | 47–57 | 0 | 0 |
| BD /daily | 0.54 / 0.54 s (tile tappable ~2.0 s) | 0.61 / 0.61 s | 45–59 | 0.011 | 0 |
| BD /endless | 1.25 / 1.50 s | 0.86 / 0.86 s | 32–48 | 0.001 | 0 |
| BD /map | 0.85 s (shell); era data ~1.4–1.6 s | 1.90 s (TTFB 1.43 s) | 29 | 0 | 0 |
| BD /eras | 0.99 s | 0.56 s | 66–88 (~1.1 MB thumbnails) | 0 | 0 |
| BD /timeline | 0.55 s | 1.12 s | 27–44 | 0 | 0 |
| BD /size/brazil | 1.21 s | 1.13 s | 28–47 | 0 | 0 |
| Krillion | 1.21 / 1.42 s | 0.84 / 1.81 s | 43 | 0 | 0 |
| Globle | 1.48 / 2.21 s | 1.18 / 1.75 s | 96–124 | **0.718** | 0–1 |
| Connections | 2.55 / 4.28 s | 2.28 / 2.28 s | 144–192 | 0.044 | 1–3 |
| Wordle | 3.44 / 4.38 s | 3.11 / 4.05 s | 97–102 | 0.009 | 2–4 |
| Worldle | 2.51 / 3.96 s; load **43 s** | 3.22 / 4.41 s; load **61 s** | **1,616–2,559** | 0.164 | 6+ |
| thetruesize | no paint for ~4 s (canvas, Google Maps); search box usable 4.6–10.4 s | 4.86 / 4.94 s | 51–77 | 0 | 6 (blocked analytics) |

---

## 3. Site by site

### thetruesize.com (direct competitor)
- **First 5 s:** on phone, a flat grey screen for about 4 s. Then a Google basemap with three coloured shapes already laid over Africa. On desktop, half-loaded Google tiles at 2.5 s and the full picture at about 4 s. Once it appears, the idea lands with zero reading.
- **Onboarding:** an optional 3-step "How it works" sheet with a replayed autocomplete demo. Search is behind a "Search" button on phone.
- **Play:** I searched Brazil and dragged it north over the Atlantic. It swelled to cover Greenland and eastern Canada. The drag feel is very good, and a tooltip gives area, population and a one-line fact.
- **Sharing:** no share button. State lives in a long URL hash (`#?borders=1~!MTQ0…`), so you share by copying the address bar. The og:image is a big screenshot of the map with shapes laid over Africa, so the preview *is* the insight. og:description leads with its Greenland/Africa line.
- **Reason to return:** none built in. No game, no history, no streak.
- **Weak points:** slow (Google Maps), a dead grey screen on phone, blocked analytics errors in the console, no game.

### NYT Wordle
- **First 5 s:** a splash screen (logo, "Get 6 chances to guess a 5-letter word.", Play / Log in / Subscribe, the date and puzzle number, the editor's name). On phone, a **pre-game video ad** ("Continue to Wordle") comes first.
- **Onboarding:** a "How To Play" modal with three example words, one per colour.
- **Play:** 6 guesses, lost (X/6). The end screen nudges you to create an account, offers Wordle Bot, archive and other games.
- **Sharing:** native share sheet on phone, clipboard on desktop: `Wordle 1,956 X/6` plus the emoji grid, **with no link**. The og:image is just the logo.
- **Return:** stats, streaks, Bot analysis, archive (paid), cross-promotion to sibling games.

### NYT Connections
- **First 5 s:** a "Free access to Super Duolingo" bar, a purple splash, and "Subscribe for unlimited play."
- **Onboarding:** none needed. The board says "Create four groups of four!" and it is obvious.
- **Play:** a full-screen Duolingo cross-promotion modal blocked the board on first load. After closing it I played to game over (4 mistakes, one "One away..." toast). The results screen was replaced by "Create a free account…", and then NYT's bot block.
- **Weak points:** monetisation now clutters the first minute (pre-roll ads, a promotion modal, an account wall).

### Krillion
- **First 5 s:** a pixel-art sky over the sea and the "BEGIN DESCENT" button. It is instantly distinctive. "8,399 playing" is live social proof.
- **Onboarding:** five one-line rules ("25 seconds to name one thing. Rare answers score big…").
- **Play:** 7 prompts with a 25-second ring timer. Each answer lands as a named rank ("SCHOOLER, +30 pts, sink 300m, Solid: swims with the school.") and the shrimp sinks. An invalid answer says "no echo, try again".
- **End:** a big score, a **bell curve of today's scores with a "YOU" marker**, "BETTER THAN 57% OF TODAY'S PLAYERS", a dive log of all 7 answers by depth, and **"14,325 other players chose this"** under each answer.
- **Sharing:** `Krillion #104 🦐 / 270 / 🐟🦑🐟🐟🐟🦑🐟`, with no link. The og:image is good branded pixel art.
- **Return:** archive, themed packs, unlimited mode, a cosmetics (shirt) menu, a limited-time beta event.

### Worldle (teuteuf)
- **First 5 s:** a CARFAX ad banner, "REMOVE ADS", a black country silhouette and a tips popover over the input. The page never settles (1,600+ requests).
- **Play:** 4 guesses (Brazil, Suriname, Guyana, French Guiana). Each guess shows distance, a direction arrow and a proximity %.
- **End:** "Play next round" (a bonus round right away), Wikipedia/Maps links, and "You guessed it in 4 tries - better than 39.3% of players."
- **Sharing:** the best of the set: `#Worldle #1740 (27.10.2026) 4/6 (100%) / 🔥 Current Win Streak: 1 days / 🟩🟩🟩🟩⬜⬆️ … / https://worldle.teuteuf.fr/share`. It carries the streak, a direction-arrow grid and a link.
- **Return:** archive, streak calendar, leagues, practice mode, flashcards, "Passport".
- **Weak points:** ads wreck speed and layout (CLS 0.16).

### Globle
- **First 5 s:** the "How to Play" text plus France/Nepal/Mongolia colour examples, and a globe. CLS of **0.72 on phone** (things jump).
- **Play:** 8 guesses. The 3D globe spins to each guess and colours it hot or cold, with a "Closest border: 2,895 km" readout.
- **Sharing:** stats modal with Share. The og:image is a 300x200 logo with `twitter:card=summary` (a small preview).

### Border Drift: what I saw
- **Home:** "Your map has been **lying** to you." Then the daily card (streak, games played, blue "Play today's game"), a gold Endless card ("#1 streak ever: 7 by WizardDev"), then the map card and **Yesterday's matchup** (Burkina Faso vs Belarus, normal map vs real size). The desktop first screen is strong, and yesterday's matchup is exactly the proof the hero needs. On phone, that proof is ~1,500 px down; the first screen is text plus two stat boxes.
- **/daily (played 2/5):** zero modal. A "Played on another device? Sign in" bar sits above the game. The reveal is rich and correct ("Not quite! Venezuela is 17% bigger than Türkiye." with "For scale: Egypt" and an equator-to-pole strip: "Türkiye: 39°, map 1.7× too big"). It is also heavy on phone. The results screen is the best part of the site: a giant "2/5", "The map fooled you", five chunky ✗/✓ tiles, a gold "Keep playing: endless mode", a "Get on the leaderboard" Join, Streak/Played/All-time tiles, Share/Picture/Challenge, the answers list and a countdown.
  - Share text (phone): `Border Drift Daily #9 · 2/5 / 🟥🟩🟥🟩🟥 / The map fooled me 3 times. Can you beat it? / https://scale-shift.vercel.app/daily`
  - Challenge (desktop): `I got 2/5 on today's Border Drift challenge. Think you can beat me? https://scale-shift.vercel.app/daily#c=9.2.`
- **/endless:** level ladder ("Level 1 of 5: Warm-up"), one miss ends the run, and confetti plus a "NEW BEST!" badge at 2. Share: `Border Drift Endless · 2 in a row / 🟩🟩🟥 / The map fooled me on round 3. How far can you go? / …/endless`. A 0-score run has no share (sensible). Note: the first rounds I got included Greenland twice (Greenland vs Brazil, Greenland vs Viceroyalty of Peru).
- **/map:** a modal ("Maps lie about size." with preset chips) over the map on first visit, and a Greenland vs DR Congo comparison preloaded. Search plus Enter dropped Brazil. Dragging it north worked smoothly; the panel showed "drawn 1.3× bigger than at home", and the era bar, compass and share are all there. Desktop is polished. On phone, the control rail and two dark bars eat about 25% of the map.
- **/eras:** a good grid of era thumbnails with a sticky "Play today's game". 6,400 px on phone. Era pages have their **own** og images (the only pages that do).
- **/timeline:** a strong idea ("When land was taken, and when it became official"). But the phone's first screen is a filter form (search, two dropdowns, reset) with no event visible. 15,400 px long.
- **/size/brazil:** an answer box ("8.5 million km² · 5th largest of the 167 · about the size of China · Normal web maps show it about the right size"), then a map-vs-real drawing next to the US, rank tiles, "Countries about the same size", FAQ. Good SEO structure. The phone's first screen is all text; the drawing is below the fold. The og:image is the generic home card. In the real-size tile, a stray dot (Hawaii) floats on its own.

---

## 4. Top 5 things to steal (patterns only, never code, text or assets)

1. **Proof before prose on the first screen.** *Who:* thetruesize.com (live comparison already on the map when you land) and Krillion (the scene itself explains the game). *Why:* Border Drift's phone first screen asks you to believe "your map is lying" without showing it. The proof (yesterday's matchup) sits 1,500 px down. *Border Drift's version:* make the hero a small, auto-playing "map size → real size" shrink of one of *yesterday's* daily pairs (never Greenland/Africa, never US-over-Africa), with the Play button directly under it. *Effort: M.*

2. **Today's score distribution as a picture, with "you" on it.** *Who:* Krillion (bell curve plus YOU marker plus "better than 57%"), Worldle ("better than 39.3% of players"). *Why:* Border Drift already has the counts (`s0…s5` per day) and a "Better than N%" line, but as text. A 6-bar histogram with your bar lit is far more satisfying and screenshot-worthy. *Border Drift's version:* a 0–5 bar chart in the Daylight Arcade style on the results card, your bar in gold. *Effort: S.*

3. **Crowd verdict per question.** *Who:* Krillion ("14,325 other players chose this"), Connections ("One away..." feedback). *Why:* it turns a private miss into "the map fooled 71% of people too", which softens losses and is a natural share hook. *Border Drift's version:* count picks per round (an anonymous per-day counter, the same privacy model as `/api/plays`) and show "64% picked Türkiye" in the reveal, plus a "Close call: only 4% apart" line for near misses. *Effort: M.*

4. **More to do the moment the daily ends: bonus round and archive.** *Who:* Worldle ("Play next round" straight after the win, full archive, streak calendar), Krillion (archive, themed packs). *Why:* Border Drift's endless covers "more", but there is no way to play missed days, which breaks streak-recovery and binge sessions. Archive is already on the roadmap. *Border Drift's version:* a "Past dailies" calendar (play any of the last 30 days, which don't count for the leaderboard), plus themed sets made from the history data ("Empires only", "Same latitude"). *Effort: M.*

5. **A link preview that carries the insight (and the score).** *Who:* thetruesize.com (its og:image *is* the comparison), Worldle (share text carries streak, grid and link). *Why:* Border Drift's 167 /size pages and every game page share one generic logo card. That means each shared link wastes its best thumbnail, and challenge links (`#c=…`) can't preview a score at all because bots never see hashes. *Border Drift's version:* a generated og image per /size page showing its own map-vs-real drawing; move the challenge into a query or path (`/daily/c/9-2`) and render a "2/5 · 🟥🟩🟥🟩🟥 · Can you beat it?" card; add the streak to the share text. *Effort: M.*

**Honourable mentions:** a one-line live player count on the home daily card (Krillion's "8,399 playing"; only once the numbers are flattering). A named, playful rank per answer (Krillion "Schooler"); Border Drift's own vocabulary could be map-themed and original.

---

## 5. Weak points, stated plainly
- **Phone homepage has no visual proof above the fold** and runs 3,600 px. The desktop version is much stronger.
- **The reveal is information-dense.** Four drawing layers plus two explainer boxes per round. Great for learners, slow for a 2-minute game. Consider collapsing "For scale" and "Why the map fooled you" behind one tap after round 1.
- **/map on phone:** a first-visit modal hides the map; the default preset and two of four "surprising sizes" chips lead with Greenland. That is the same family as the example PROJECT.md says not to lead with. On desktop, the map can be an empty blue sea for ~2.5 s.
- **/timeline on phone opens on a filter form**, with no event visible. **/size phone opens on text**, with the drawing below the fold.
- **Link previews:** one generic og:image across daily, endless, map, timeline and all size pages. Hash-based challenge links can't be personalised.
- **Social proof works against you right now:** "#1 streak ever: 7" says "small site". Hide all-time records until they impress.
- **Credibility polish:** vercel.app URL, Clerk dev badge, the "non-commercial educational project" line, no named makers. All are known and blocked on the domain, but they cost trust on first visit.
- **Delight is the biggest gap.** Correct answers get a green panel. Nothing feels like a win until the end screen.

## 6. Where Border Drift already leads
- Fastest load of the seven, zero console errors, no layout shift, no ads.
- Best sourcing and honesty (method notes under every game, precision labels per era, corrections page).
- Unique depth: 4,000 years of borders, a "taken vs made official" timeline, disputes and size pages. No competitor has a content moat like this.
- Results screen craft: clear score, a streak block, endless as the next step and three share modes. It matches Wordle and beats Globle and thetruesize.
