// Brand, navigation and shared copy. Change the name or tagline here and it updates everywhere.

export const site = {
  name: "Border Drift",
  tagline: "See the real size of every country and empire, across 4,000 years of borders.",
  description:
    "An interactive map of 4,000 years of borders. Drag countries and empires anywhere on Earth to see their real size, step through history from 2000 BCE to today and find out who ruled any spot on the planet.",
  // Used for canonical URLs and social previews. Set NEXT_PUBLIC_SITE_URL in production.
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  contactEmail: "borderdrift.team@gmail.com",
  copyrightHolder: "Border Drift",
};

/** Main menu. `from` hides an item in the desktop header below that breakpoint (it stays in the phone menu and footer). */
export const nav: { href: string; label: string; from?: "lg" | "xl" }[] = [
  { href: "/map", label: "Map" },
  { href: "/daily", label: "Daily challenge" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/eras", label: "Eras" },
  { href: "/timeline", label: "Timeline", from: "lg" },
  { href: "/disputes", label: "Disputed borders", from: "xl" },
];

export const footerNav = [
  { href: "/teachers", label: "For teachers" },
  { href: "/about", label: "About & sources" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/contact", label: "Report a border error" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** The phone menu: the three main places first (the game leads), then history pages, then the small print. */
export const menu = {
  main: [
    { href: "/daily", label: "Daily challenge", blurb: "Five new matchups every day", icon: "target" as const },
    { href: "/leaderboard", label: "Leaderboard", blurb: "Today, this week and all time", icon: "trophy" as const },
    { href: "/map", label: "Map", blurb: "Drag any country to its real size", icon: "map" as const },
  ],
  historyTitle: "History",
  history: [
    { href: "/eras", label: "Eras" },
    { href: "/timeline", label: "Timeline" },
    { href: "/disputes", label: "Disputed borders" },
  ],
  more: footerNav,
  backToMap: "Back to the map",
};

export const appCopy = {
  searchPlaceholder: "Try Roman Empire, Texas, Brazil",
  introTitle: "Maps lie about size.",
  introBody:
    "Most web maps stretch land more and more as it nears the poles. Search for any country or empire, drag it across the map and watch it shrink or grow to its real size. Use the timeline to travel from 2000 BCE to today.",
  introCta: "Start exploring",
  whoRuledTitle: "Who ruled here?",
  whoRuledHint: "Click anywhere on land to see who controlled it in every era.",
  shareCta: "Share",
  precision: {
    1: "Approximate borders",
    2: "Moderately precise borders",
    3: "Borders fixed by international law",
  } as Record<number, string>,
};
