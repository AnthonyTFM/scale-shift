// Words for the daily challenge page. Change copy here, not in the components.

export const dailyCopy = {
  eyebrow: "Daily challenge",
  title: "Which is bigger?",
  lead: "Five matchups a day, the same for everyone. Normal maps stretch land near the poles, so your eyes will lie to you. Go 5 for 5 and climb the leaderboard. New matchups at midnight your time.",
  // phones show this instead, so the first puzzle is on screen without scrolling
  leadShort: "Five matchups a day. Normal maps lie about size. Can you see through them?",
  playedElsewhere: "Played today on another device?",
  playedElsewhereShort: "Played on another device?",
  signInToSee: "Sign in to see your result",
  signInToSeeShort: "Sign in",
  // results screen: the leaderboard sign-up waits behind one button
  // shown on the "Sign in" link while the sign-in window downloads
  signInOpening: "Opening sign-in…",
  joinCta: "Get on the leaderboard",
  joinHint: "See where you rank.",
  // the leaderboard page, for someone who played today but isn't on the board yet
  boardNudge: (score: number, total: number) => `You scored ${score}/${total} today. Post it and see where you rank.`,
  joinButton: "Join",
  // the join pop-up: step 1 the 13+ box and sign-in, step 2 the nickname, then where you landed
  joinDialog: {
    step: (n: number) => `Step ${n} of 2`,
    title: "Get on today's leaderboard",
    lead: (score: number) => `You scored ${score}/5. Sign in so your score counts and nobody else can post as you.`,
    continue: "Continue with email or Google",
    opening: "Opening sign-in…",
    private: "Sign in with a code we email you, or with Google. Your email is never shown.",
    failed: "Sign-in didn't open. Check your connection (or an ad blocker) and try again.",
    retry: "Try again",
    notNow: "Not now",
    nameTitle: "Pick a nickname",
    nameLead: "This is what everyone sees on the leaderboard.",
    nameLabel: "Nickname",
    nameHint: "3 to 16 characters. Not your full real name.",
    remind: "Email me when a new daily challenge is up",
    optional: "(optional; unsubscribe any time with one click)",
    post: "Post my score",
    posting: "Posting…",
    doneTitle: (rank: number) => `You're #${rank} today!`,
    doneLead: (score: number) => `is on today's board with ${score}/5. A new five arrives at midnight.`,
    duplicate: "Your first score of the day is the one that counts.",
    back: "Back to my results",
    notYou: "Not you?",
    signOut: "Sign out",
    close: "Close",
  },
  // the reveal after each answer
  reveal: {
    round: (n: number, total: number) => `Round ${n} of ${total}`,
    ask: "Sized the way a normal web map shows them. Tap the bigger one.",
    // after the answer, in place of `ask`: which drawing is which, and tapping a tile plays the shrink again
    watch: "Pale: size on a normal map. Solid: real size. Tap to replay.",
    right: "You got it!",
    wrong: "Not quite!",
    perfect: "5 for 5! Perfect round!",
    next: "Next round",
    seeResults: "See my results",
    // under each name once answered: the result in plain words
    biggerBy: (gap: string) => `${gap} bigger`,
    smaller: "Smaller",
    // the strip in the verdict: how far each place is from the equator, and how much a web map stretches it
    // the strip's title: the map showed the smaller one as bigger (fooled you / misleads), or it didn't
    stretchTitle: "Why the map fooled you",
    stretchTitleRight: "Why the map misleads",
    stretchTitleHonest: "How a web map stretches these two",
    stretchTitleBoth: "Both near the equator: web maps get these about right",
    equator: "Equator",
    pole: "Pole",
    stretchRow: (lat: number, stretch: string) => `${lat}°, ${stretch}`,
    drawnTooBig: (x: string) => `map ${x}× too big`,
    drawnAboutRight: "map about right",
    stretchNote: "The farther from the equator, the more a web map blows land up.",
    // after the answer: a familiar place, drawn as a dashed outline in both tiles, with each shape's size next to it
    forScale: (name: string) => `For scale: ${name}`,
    forScaleNote: "The dashed outline in each tile is the same place at the same scale.",
    scaleSame: (name: string) => `about the same size as ${name}`,
    scaleTimes: (x: string, name: string) => `about ${x}× the size of ${name}`,
    scaleFraction: (part: string, name: string) => `about ${part} the size of ${name}`,
    scalePercent: (pct: number, name: string) => (pct < 1 ? `less than 1% the size of ${name}` : `about ${pct}% the size of ${name}`),
    fractions: [
      [3 / 4, "three-quarters"],
      [2 / 3, "two-thirds"],
      [1 / 2, "half"],
      [1 / 3, "a third"],
      [1 / 4, "a quarter"],
      [1 / 5, "a fifth"],
      [1 / 10, "a tenth"],
    ] as [number, string][],
    bigger: "Bigger",
    yourPick: "Your pick",
    vs: "VS",
  },
  // the results screen
  results: {
    title: (score: number, total: number) =>
      score === total ? "Emperor!" : score === total - 1 ? "Empire builder!" : score === total - 2 ? "Regional power" : "The map fooled you",
    verdict: (score: number, total: number) =>
      score === total
        ? "Perfect. Mercator can't fool you."
        : score >= total - 1
          ? "Sharp eye. One got past you."
          : score >= 3
            ? "Not bad. The map tricked you twice."
            : "Tricky round. New questions tomorrow.",
    scoreSr: (score: number, total: number) => `You got ${score} out of ${total}.`,
    // above the progress bar while playing, for players with a streak going
    streakPill: (n: number) => `${n}-day streak`,
    streak: "Streak",
    best: (n: number) => `Best ${n}`,
    rank: "Today's rank",
    // before you've joined: where your score would land
    rankIfJoined: "If you join",
    rankOf: (n: number) => `of ${n} today`,
    // shown instead of "If you join #2 of 3" while today's board is small, once enough people have played today
    betterThan: "Better than",
    betterSub: "of players today",
    // a perfect round can't beat anyone who also got 5: it shows "Top 8% of players today" instead
    topToday: "Top",
    played: "Played",
    playedSub: (n: number) => (n === 1 ? "day" : "days"),
    // the bar chart of your own daily scores
    scoresTitle: "Your scores",
    scoresSub: (avg: string) => `Average ${avg} out of 5`,
    scoreRow: (score: number, days: number, today: boolean) => `${score} out of 5: ${days} ${days === 1 ? "day" : "days"}${today ? ", including today" : ""}`,
    allTime: "All-time",
    allTimeSub: "correct",
    share: "Share my score",
    // the shared text: "Border Drift Daily #6 · 4/5 🔥3", the grid, then a dare for whoever sees it
    shareHead: (site: string, day: number, score: number, total: number, streak: number) =>
      `${site} Daily #${day} · ${score}/${total}${streak >= 2 ? ` 🔥${streak}` : ""}`,
    shareDare: (misses: number) =>
      misses === 0
        ? "Perfect round. Bet the map fools you at least once."
        : `The map fooled me ${misses === 1 ? "once" : misses === 2 ? "twice" : `${misses} times`}. Can you beat it?`,
    picture: "As a picture",
    // phones: the three share buttons sit in one row
    shareShort: "Share",
    pictureShort: "Picture",
    challengeShort: "Challenge",
    challenge: "Challenge a friend",
    // after the daily: endless mode is the next thing to play
    endless: "Keep playing: endless mode",
    endlessLine: "One matchup after another, closer the further you go. How far can you get?",
    answers: "The answers",
    dragOnMap: "Compare sizes on the map",
    pictureSaved: "Picture saved. Post it anywhere.",
    pictureFailed: "Couldn't make the picture. Try Share my score instead.",
  },
};
