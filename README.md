# Scale Shift

A true-size world map with a time slider. Drag any country, US state, Canadian province, continent or historical empire across a Mercator map and it is redrawn at its real size for its new latitude. Slide through 39 world maps from **1 BC to today** and compare shapes from any era side by side.

- `/`: the map (search, drag, rotate, timeline, borders of each year, share links)
- `/compare/<slug>`: 12 ready-made comparisons (Greenland vs Africa, Rome vs the US…) with facts and FAQ
- `/history/<id>`: 53 empire timelines with area-over-time charts
- `/about`: how it works, sources, and a border-correction form
- Footer on every content page: email sign-up for updates

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4 and d3-geo. There are no map tiles and no API keys: the map is drawn from the data in `public/data`.

---

## Run it on your computer

You need **Node.js 20 or newer**. Check by opening a terminal and typing `node -v`. If you get an error or a number below 20, install the LTS version from https://nodejs.org (click the big green button, run the installer, then close and reopen your terminal).

1. Unzip `scale-shift.zip` somewhere easy, such as your Desktop.
2. Open a terminal in that folder.
   - **Mac:** open Terminal, type `cd ` (with a space), drag the `scale-shift` folder into the window, press Enter.
   - **Windows:** open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
3. Install the packages (takes a minute or two the first time):
   ```
   npm install
   ```
4. Start the site:
   ```
   npm run dev
   ```
5. Open **http://localhost:3000** in your browser. Stop the server any time with `Ctrl + C`.

To run the fast production version instead: `npm run build`, then `npm run start`.

### Where form submissions go

Sign-ups and corrections are saved to `data/submissions.json` inside the project folder. Open it in any text editor. To get them by email or into a CRM instead, see **Settings** below.

---

## Put it live on Vercel (free)

**Option A: from your terminal (no GitHub needed)**

1. Create a free account at https://vercel.com (sign up with email or GitHub).
2. In the project folder, run:
   ```
   npx vercel
   ```
   Log in when it asks (it opens your browser), then press Enter to accept each default.
3. It prints a preview link. To publish the real site, run:
   ```
   npx vercel --prod
   ```
4. In the Vercel dashboard, open the project, go to **Settings → Environment Variables**, and add `NEXT_PUBLIC_SITE_URL` with your live address (for example `https://scale-shift.vercel.app`). Run `npx vercel --prod` again so it takes effect.

**Option B: through GitHub**

1. Create an empty repository on https://github.com/new.
2. In the project folder, run (replace the URL with yours):
   ```
   git init
   git add .
   git commit -m "Scale Shift"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/scale-shift.git
   git push -u origin main
   ```
3. On https://vercel.com/new, import that repository and click **Deploy**. Every future `git push` redeploys automatically.

> **Forms on Vercel:** Vercel's servers can't keep files, so `data/submissions.json` only works on your own computer. Before you share the live site, set up a webhook or email (below), or sign-ups will be lost.

---

## Settings (environment variables)

Copy `.env.example` to `.env.local` for your computer, or add the same names in Vercel under **Settings → Environment Variables**. All are optional.

| Name | What it does | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your live address for the sitemap, canonical links and share images | Your Vercel or custom domain |
| `NEXT_PUBLIC_GA4_ID` | Turns on Google Analytics 4 with the built-in events | analytics.google.com → Admin → Data streams → Measurement ID (`G-…`) |
| `SUBMISSIONS_WEBHOOK_URL` | POSTs every form submission as JSON | A "Catch hook" in Zapier or Make, a GoHighLevel inbound webhook, or a Google Apps Script web app that writes to a Sheet |
| `RESEND_API_KEY` | Emails every submission | resend.com → API Keys (free tier) |
| `NOTIFY_EMAIL_TO` | Where those emails go | Your inbox |
| `NOTIFY_EMAIL_FROM` | Sender address | An address on a domain you verified in Resend |
| `SUBMISSIONS_FILE` | Custom path for the local JSON file | Leave empty |

**Analytics events sent:** `region_added`, `region_removed`, `overlay_dragged`, `overlay_rotated`, `timeline_changed`, `share_clicked`, `coachmark_completed`, `coachmark_skipped`, `updates_signup`, `correction_sent`.

---

## Change the words and content

All copy lives in `content/` so you never have to touch components:

| File | What's in it |
|---|---|
| `content/site.ts` | Site name, tagline, menu, map labels, first-visit guide, form text |
| `content/comparisons.ts` | The comparison pages. Add one by copying an entry. `at: [longitude, latitude]` moves a shape; leave it out to keep the shape where it really is |
| `content/featured.ts` | Which empires get a timeline page, grouped by era |
| `content/lineage.ts` | "Came before" links between modern countries and older empires |

Entity ids (like `roman-empire` or `mongol-empire-claims`) come from `public/data/index.json`. The fastest way to find one: search on the map, click Share, and read the id from the link.

---

## Check that everything works

```
npm run lint        # code style
npm run typecheck   # TypeScript
npm run build       # production build
npm run check:data  # every map shape draws correctly
```

Browser test of every page, button and form (start the site with `npm run build && npm run start` first, in a second terminal):

```
npx playwright install chromium   # first time only
npm run test:e2e
```

Screenshots at phone, tablet, desktop and wide sizes are saved to `e2e-shots/`.

---

## Rebuilding the map data (optional)

The processed data is already included. To rebuild it, for example after the historical dataset updates:

```
mkdir -p data-src/ne
git clone --depth 1 https://github.com/aourednik/historical-basemaps.git data-src/historical-basemaps
curl -L -o data-src/ne/ne_50m_admin_0_countries.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
curl -L -o data-src/ne/ne_50m_admin_1_states_provinces.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson
npm run data
npm run check:data
```

Name merges (for example "Austria Hungary" and "Austro-Hungarian Empire") are listed at the top of `scripts/build-data.mjs`.

---

## Data and licences

- **Historical borders (1 BC to 2010):** historical-basemaps by André Ourednik and contributors, **GPL-3.0**. See `public/data/LICENSE-DATA.md`. Keep the credit in the footer and on the About page. GPL is a copyleft licence: if you plan to sell or close-source this project, check what it requires for the data first.
- **Today's borders:** Natural Earth, public domain.
- **Fonts:** IM Fell English and Libre Franklin, SIL Open Font License (`app/fonts/LICENSE.txt`).
- Antarctica is left out because a Mercator map cannot draw a shape that surrounds a pole.
