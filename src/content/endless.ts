// Words for endless mode (/endless). Change copy here, not in the components.

export const endlessCopy = {
  eyebrow: "Endless mode",
  title: "How far can you go?",
  lead: "One matchup after another, and the further you go, the closer they get. Get one wrong and the run is over.",
  // phones show this instead, so the first matchup is on screen without scrolling
  leadShort: "The further you go, the closer they get. One miss ends the run.",
  metaTitle: "Endless mode: which is bigger?",
  metaDescription:
    "One size matchup after another, closer calls the further you go. Web maps make some countries and empires look far bigger than they are. How long can you go without a miss?",
  note: "Areas are calculated from our map outlines (historical states at the snapshot shown), so they can differ from official figures by a few percent. Your best run is saved in this browser only.",
  loading: "Loading endless mode",
  failed: "We couldn't load endless mode.",
  retry: "Try again",
  // one name per level in src/lib/endless.ts (LEVELS)
  levels: ["Warm-up", "Getting closer", "Tricky", "Close calls", "Razor thin"],
  levelSr: (n: number, total: number, name: string) => `Level ${n} of ${total}: ${name}`,
  round: (n: number, level: string) => `Round ${n} · ${level}`,
  streak: (n: number) => `${n} in a row`,
  best: (n: number) => `Best ${n}`,
  right: "You got it!",
  wrong: "Not quite! Run over.",
  next: "Next round",
  loadingNext: "Loading…",
  seeRun: "See my run",
  results: {
    eyebrow: "Endless run",
    inARow: (n: number) => (n === 1 ? "right answer in a row" : "right answers in a row"),
    scoreSr: (n: number, best: boolean) => `You got ${n} in a row${best ? ", a new best" : ""}.`,
    title: (n: number) =>
      n >= 20 ? "Ruler of the world!" : n >= 12 ? "Emperor!" : n >= 7 ? "Empire builder!" : n >= 3 ? "Regional power" : "The map fooled you",
    verdict: (round: number) => `Your run ended on round ${round}.`,
    newBest: "New best!",
    best: "Best",
    bestSub: "in a row",
    runs: "Runs",
    runsSub: "played",
    level: "Level",
    playAgain: "Play again",
    share: "Share my run",
    shareShort: "Share",
    // the daily challenge, before and after today's is played
    dailyPlay: "Play today's five",
    dailyDone: "Today's results",
    // the shared text: "Border Drift Endless · 14 in a row", the grid, then a dare for whoever sees it
    shareHead: (site: string, n: number) => `${site} Endless · ${n} in a row`,
    shareMore: (n: number) => `+${n} more`,
    shareDare: (round: number) => `The map fooled me on round ${round}. How far can you go?`,
    missTitle: "The one that got you",
    allTitle: (n: number) => `All ${n} matchups`,
    dragOnMap: "Compare sizes on the map",
    dragOnMapSr: (big: string, small: string) => `Compare the sizes of ${big} and ${small} on the map`,
  },
};
