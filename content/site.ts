/** All editable site copy lives here. Change words without touching components. */
export const site = {
  name: "Scale Shift",
  tagline: "Every empire and country at its true size, from 1 BC to today.",
  description:
    "Drag countries, states and historical empires across a world map and see how big they really are. Slide through 39 snapshots from 1 BC to today and compare any two eras.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  nav: [
    { href: "/", label: "Map" },
    { href: "/history", label: "Empires" },
    { href: "/compare", label: "Comparisons" },
    { href: "/about", label: "How it works" },
  ],
  map: {
    searchPlaceholder: "Search a place or empire",
    searchLabel: "Add a place to the map",
    searchEmpty: "No match. Try a modern country name, or an empire like “Roman” or “Mongol”.",
    shareLabel: "Share",
    shareCopied: "Link copied",
    shareFallback: "Copy this link",
    panelTitle: "On the map",
    panelEmpty: "Search above or click any territory on the map to pick it up.",
    clearAll: "Clear all",
    bordersLabel: "Borders of this year",
    playLabel: "Play through time",
    pauseLabel: "Pause",
    prevLabel: "Earlier map",
    nextLabel: "Later map",
    loading: "Loading map",
    loadError: "The map data didn't load. Check your connection, then reload the page.",
    retry: "Reload",
  },
  coach: [
    {
      title: "Pick something up",
      body: "Search for any country, empire or state, or click a territory on the map.",
    },
    {
      title: "Drag it anywhere",
      body: "Moving a shape keeps its real area. Watch it shrink toward the equator and swell near the poles.",
    },
    {
      title: "Travel through time",
      body: "Slide the timeline from 1 BC to today. Shapes on the map redraw with that year's borders.",
    },
  ],
  coachDone: "Start exploring",
  coachNext: "Next",
  coachSkip: "Skip",
  footer: {
    blurb:
      "Scale Shift is a free map for students, teachers and anyone who suspects Greenland is smaller than it looks.",
    credit:
      "Historical borders: historical-basemaps by André Ourednik and contributors (GPL-3.0). Modern borders: Natural Earth (public domain).",
  },
  updatesForm: {
    title: "Get new eras when they land",
    body: "One short email when we add maps or classroom guides. No spam, unsubscribe any time.",
    button: "Send me updates",
    success: "You're on the list. We'll email you when new eras are added.",
  },
  correctionForm: {
    title: "Spot a border that looks wrong?",
    body: "Historical borders are contested and our source data is approximate. Tell us what you found and we'll check it against other atlases.",
    button: "Send correction",
    success: "Thanks. Your correction was sent and we'll review it.",
  },
};

export type SiteCopy = typeof site;
