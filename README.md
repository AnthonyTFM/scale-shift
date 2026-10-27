# Border Drift

Drag any country or empire across a world map and see its **real size**, travel through **4,000 years of borders** (2000 BCE → today), click any land to see **who ruled it in every era**, and play a **daily "which is bigger?" challenge** with a public leaderboard.

Built with Next.js 16 (App Router), TypeScript and Tailwind CSS 4. No map tiles or API keys. Live at **https://scale-shift.vercel.app**.

Owners: Anthony and Evan. How we work (branches, pull requests, "ship it") is in `CLAUDE.md`; goals, decisions and setup status are in `docs/PROJECT.md`.

---

## Run it on your computer

1. Install **Node.js 22 LTS** from <https://nodejs.org> (one time).
2. Get the code (one time):
   ```bash
   git clone https://github.com/AnthonyTFM/scale-shift.git
   cd scale-shift
   npm install
   ```
3. Start it: `npm run dev`, then open **<http://localhost:3000>**. Press `Ctrl + C` to stop.

Before every change: `git switch main && git pull`. Windows notes (PowerShell, line endings) are in `CLAUDE.md`.

## How changes go live

`main` deploys to https://scale-shift.vercel.app automatically on Vercel. Never push to `main` directly:
1. Make a branch, commit, push, and open a pull request.
2. GitHub runs the checks (`build`: lint, typecheck, build, data check) and Vercel posts a **preview link** on the PR, so the other owner can click around before it's merged.
3. Merge the PR and it's live within a couple of minutes.

**Settings on Vercel** (Project → Settings → Environment Variables; all are listed in `.env.example`):
- `NEXT_PUBLIC_SITE_URL`: the live address (set).
- `SUBMISSIONS_WEBHOOK_URL`, or `RESEND_API_KEY` + `NOTIFY_EMAIL_TO`: also forward form messages. They're always kept in the Redis list `fb:inbox` when the Upstash settings are set (`npm run leads` prints them).
- Upstash Redis (Vercel → Storage): keeps leaderboard scores. Without it, scores are wiped every few hours.
- `NEXT_PUBLIC_GA4_ID`: optional Google Analytics.

## Edit the content

All copy lives in `src/content/`, so no code knowledge is needed:

| File | What it controls |
|---|---|
| `site.ts` | Brand name (rename the site here), tagline, menu, contact email, map panel copy |
| `events.ts` | The 104 territorial events (taken vs. made official) |
| `disputes.ts` | Present-day disputed territories |
| `presets.ts` | The map's Comparisons tab (surprising and controversial) |
| `era-intros.ts` | Intro paragraphs on era pages |
| `lineages.ts` | Links one state's names over time (e.g. Muscovy → Russian Empire → USSR → Russia) |
| `data-corrections.json` | Every name, ruler and shape fix to the source data (applied by `npm run data`, listed on /about) |
| `corrections.ts` | Known limitations shown on /about |

Colours and fonts are design tokens at the top of `src/app/globals.css`.

## Daily challenge (/daily)

Five "which is bigger?" questions a day, the same for everyone on the same date, changing at the player's local midnight.

- **Question mix (in order):** a web-map trap (the one that looks bigger is smaller), a US state vs a country, an empire vs a country today, a close call between two countries, and empire vs empire.
- **Where questions come from:** `scripts/build-daily.mjs` builds a pool of 226 shapes (countries, large US states and 50 well-known empires). The list of empires is at the top of that script. The question rules are in `src/lib/daily.ts`.
- **Day numbering:** Day #1 is `LAUNCH` in `src/lib/daily.ts`. Change it to your launch date before going live.
- **Saving:** scores and streaks are saved in the player's browser (no account needed).
- **Changes to the pool:** rebuilding the data with a changed pool changes the questions for future days and for today.

## Leaderboard (/leaderboard)

Players sign up with an email (kept private, one player per inbox) and a nickname after finishing the daily challenge. The server re-checks every answer, so scores can't be faked by editing the page, and only the first try each day counts.

- **On your computer:** works with no setup. Scores are saved in `data/leaderboard.json`.
- **When the site is live on Vercel:** you must add a free Redis database, or scores get wiped every few hours:
  1. In your Vercel project, open **Storage → Create → Upstash (Redis)** and connect it to the project. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
  2. Or create one at [upstash.com](https://upstash.com) and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel → Settings → Environment Variables.
  3. Redeploy.
- **Removing a nickname:** add it to `src/content/removed-players.json` (hidden from every board on the next deploy). To delete it for good, open the Redis console and remove the player's ID from `lb2:names`, or edit `data/leaderboard.json` locally.
- **Sign-in (Clerk):** with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` set (Vercel → Marketplace → Clerk), players sign in with an email code or Google before their score posts, so only the owner of an email can play under it, with the same nickname on every device. Clerk only proves the email; players, nicknames and scores stay in our Redis (`src/lib/account.ts`). Without the keys the old email box is used.
- **Reminder emails (opt-in):** players can tick "Email me when a new daily challenge is up". Consent and its date are stored in `lb2:reminders`; `reminderRecipients()` in `src/lib/leaderboard.ts` lists who agreed. Every email must include the one-click link `/api/leaderboard/unsubscribe?p=<id>&t=<unsubscribeToken(id)>`. Set `UNSUBSCRIBE_SECRET` in Vercel (any long random string) to sign those links. Sending isn't built yet: it needs a real domain and Resend.
- **Blocked words** for nicknames are in `src/lib/name-filter.ts`. It catches disguised spellings (n1gg3r, niqqer, f4g0t). The boards also hide any saved name that fails it, so adding a word there takes a bad name down on the next deploy.

## Map data

Processed map files ship in `public/data/`, so you don't need to do anything. To rebuild them (for example after adding a fix to `src/content/data-corrections.json`), run `npm run data`. It downloads the historical source files automatically.

- 1800 → 1960: [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria) (Seshat Global History Databank, **CC BY 4.0**), with dated borders from [OpenHistoricalMap](https://www.openhistoricalmap.org/) (CC0, apart from some border lines under CC BY 4.0 and a few under MIT, listed in `public/data/LICENSE.txt`) laid over it, and [HistoGIS](https://histogis.acdh.oeaw.ac.at/) (CC BY 4.0) in Europe from 1815 to 1914. No historical-basemaps data. CC BY needs the credit kept: footer, /about and `public/data/LICENSE.txt`.
- 1994–2010: Natural Earth rolled back (see `docs/PROJECT.md`).
- 2000 BCE → 1783: [historical-basemaps](https://github.com/aourednik/historical-basemaps) by André Ourednik, **GPL-3.0**, checked against Cliopatria for each year: states it leaves out, draws inside a neighbour or keeps after they fell are redrawn from Cliopatria's outlines (`BEFORE_1800` in `scripts/build-data.mjs`), and on the 1783 map Rupert's Land, the Spanish viceroyalties of South America and the Guianas follow OpenHistoricalMap's. The GPL allows any use, commercial included. If we redistribute the data (and we do: the processed files in `public/data/eras/` are downloaded by every visitor), those files must stay under GPL-3.0 with the credit kept, and their source must be available (it is: this public repo, the build scripts and `public/data/LICENSE.txt`).
- Present: Natural Earth 1:50m (public domain) via world-atlas; US states via us-atlas (US Census, public domain).
- Population: World Bank via datasets/population (ODC-PDDL). Flags: country-flag-icons (MIT).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run data` | Rebuild the map data files and the daily challenge pool |
| `npm run data:stats` | Rebuild only the era statistics from the era files (no downloads) |
| `npm run leads` | Print feedback messages (from Redis if the Upstash settings are in `.env.local`, else `data/submissions.json`) |
