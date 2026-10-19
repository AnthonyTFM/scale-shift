// Brand, navigation and shared copy. Change the name or tagline here and it updates everywhere.

export const site = {
  name: "Scale Shift",
  tagline: "Drag any nation, through any era, and see its real size.",
  description:
    "An interactive map of 4,000 years of borders. Drag countries and empires anywhere on Earth to see their real size, step through history from 2000 BCE to today, and find out who ruled any spot on the planet.",
  // Used for canonical URLs and social previews. Set NEXT_PUBLIC_SITE_URL in production.
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  contactEmail: "hello@scaleshift.example",
  copyrightHolder: "Scale Shift",
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
  { href: "/about", label: "About & sources" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/contact", label: "Report a border error" },
  { href: "/privacy", label: "Privacy" },
];

export const appCopy = {
  searchPlaceholder: "Try Roman Empire, Texas, Brazil",
  introTitle: "Maps lie about size.",
  introBody:
    "Web maps stretch land as it nears the poles. Search for any country or empire, drag it across the map, and watch it shrink or grow to its real size. Use the timeline to travel from 2000 BCE to today.",
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
