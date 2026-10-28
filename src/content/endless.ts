// Words for endless mode (/endless). Change copy here, not in the components.

export const endlessCopy = {
  eyebrow: "Endless mode",
  title: "How far can you go?",
  metaTitle: "Endless mode: which is bigger?",
  metaDescription:
    "One size matchup after another, closer calls the further you go. Web maps make some countries and empires look far bigger than they are. How long can you go without a miss?",
  note: "Areas come from our map outlines (for an empire, its borders in the year shown), so they can be a few percent off official figures. Your best run is saved in this browser. Sign in and pick a username, and your best run goes on the Best streaks board.",
  loading: "Loading endless mode",
  failed: "We couldn't load endless mode.",
  retry: "Try again",
  // one name per level in src/lib/endless.ts (LEVELS)
  levels: ["Warm-up", "Getting closer", "Tricky", "Close calls", "Razor thin"],
  levelSr: (n: number, total: number, name: string) => `Level ${n} of ${total}: ${name}`,
  round: (n: number, level: string) => `Round ${n} · ${level}`,
  // the score bar that stays on screen while playing: big streak, best, level, and the rules in one line
  hudStreak: "in a row",
  hudBest: "Best",
  // pinned beside the streak once a run passes your old best
  hudNewBest: "New best!",
  hudNewBestSr: "New best streak!",
  rules: "Pick the one that's bigger in real life. One miss ends the run.",
  right: "You got it!",
  wrong: "Not quite! Run over.",
  next: "Next round",
  loadingNext: "Loading…",
  seeRun: "See my run",
  results: {
    inARow: (n: number) => (n === 1 ? "right answer" : "right answers in a row"),
    scoreSr: (n: number, best: boolean) => `You got ${n} in a row${best ? ", a new best" : ""}.`,
    title: (n: number) =>
      n >= 20 ? "Ruler of the world!" : n >= 12 ? "Emperor!" : n >= 7 ? "Empire builder!" : n >= 3 ? "Regional power" : "The map fooled you",
    newBest: "New best!",
    // the next goal, under the streak: a countdown while it's close; a far-off one is just named, so it never reads
    // as a mountain
    goalBest: (more: number, best: number) => (more <= 5 ? `${more} more to beat your best (${best})` : `Your best: ${best} in a row`),
    goalFirst: "Get one right to start your streak",
    goalRank: (more: number, target: number, place: number) =>
      more <= 5 ? `${more} more ${more === 1 ? "takes" : "take"} #${place} of all time` : `${target} in a row takes #${place} of all time`,
    goalNext: (n: number) => `Next goal: ${n} in a row`,
    goalTop: "That's #1 of all time!",
    playAgain: "Play again",
    // under Play again on computers
    enterHint: "or press Enter",
    share: "Share my run",
    // where a run lands on the Best streaks board, before it's posted
    wouldRank: (rank: number) => `This run would be #${rank} of all time`,
    // the miss that ended the run, when the two were close
    soClose: (pct: number) => `So close: only ${pct}% apart`,
    // the daily challenge, before and after today's is played
    dailyPlay: "Play today's five",
    dailyDone: "See today's results",
    // the shared text: "Border Drift Endless · 14 in a row", the grid, then a dare for whoever sees it
    shareHead: (site: string, n: number) => `${site} Endless · ${n} in a row`,
    shareMore: (n: number) => `+${n} more`,
    shareDare: (round: number) => `The map fooled me on round ${round}. How far can you go?`,
    missTitle: "The one that got you",
    dragOnMap: "Compare sizes on the map",
    dragOnMapSr: (big: string, small: string) => `Compare the sizes of ${big} and ${small} on the map`,
  },
  // the Best streaks board: on the results screen and the leaderboard page
  board: {
    title: "Best streaks ever",
    seeAll: "See all",
    joinCta: "Get on the Best streaks board",
    joinHint: "See where your run ranks.",
    // with the board loaded: where this run would land, and one tap to post it
    joinWould: (rank: number) => `This run would be #${rank} of all time`,
    joinWouldHint: "Sign in to post it.",
    // signed in already, with no nickname yet
    joinWouldName: "Pick a nickname to post it.",
    joinPost: "Post it",
    join: "Join",
    opening: "Opening sign-in…",
    posting: "Posting your streak…",
    retry: "Try again",
    rank: (rank: number, total: number) => `#${rank} of all time, out of ${total} ${total === 1 ? "player" : "players"}`,
    yourBest: (best: number) => `Your best: ${best} in a row`,
    better: (run: number, best: number) => `This run: ${run} in a row. Your best (${best} in a row) stays on the board.`,
    signedIn: "Signed in.",
    signOut: "Sign out",
    // sign-in is off (running locally without Clerk) and this browser has no player from before
    joinFromDaily: "Sign-in is off on this copy of the site, so runs can't go on the Best streaks board.",
    dialog: {
      title: "Get on the Best streaks board",
      lead: (n: number) => `You got ${n} in a row. Sign in so your streak counts and nobody else can post as you.`,
      doneTitle: (rank: number) => `You're #${rank} of all time!`,
      doneLead: (n: number) => `is on the Best streaks board with ${n} in a row.`,
      duplicate: "Your best run ever is the one that counts.",
      back: "Back to my run",
      post: "Post my streak",
    },
    // the leaderboard page (the Best streaks board)
    allCaption: "Best streaks ever",
    streak: "Streak",
    note: "Your longest run of right answers in endless mode. Ties share a rank; whoever got there first is listed first.",
    emptyAll: "No streaks posted yet. Play endless mode to be the first.",
    play: "Play endless mode",
  },
};
