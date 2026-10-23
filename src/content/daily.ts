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
  joinButton: "Join",
  // the reveal after each answer
  reveal: {
    round: (n: number, total: number) => `Round ${n} of ${total}`,
    practice: "Practice",
    ask: "Sized the way a normal web map shows them. Tap the bigger one.",
    // the tiles compare the two shapes with each other (one scale per view), so the legend says "compare", not "size"
    legend: "Dashed: how the two compare on a web map. Solid: how they really compare.",
    right: "You got it!",
    wrong: "Not quite!",
    perfect: "5 for 5! Perfect round!",
    next: "Next round",
    seeResults: "See my results",
    mapTooBig: (x: string) => `Map: ${x}× too big`,
    mapTooSmall: (x: string) => `Map: ${x}× too small`,
    mapAboutRight: "Map: about right",
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
    practiceRound: "Practice round",
    streak: "Streak",
    best: (n: number) => `Best ${n}`,
    rank: "Today's rank",
    rankOf: (n: number) => `of ${n} today`,
    rankNone: "Join to rank",
    allTime: "All-time",
    allTimeSub: "correct",
    share: "Share my score",
    picture: "As a picture",
    // phones: the three share buttons sit in one row
    shareShort: "Share",
    pictureShort: "Picture",
    challengeShort: "Challenge",
    challenge: "Challenge a friend",
    practice: "Play more rounds for fun",
    anotherPractice: "Another practice round",
    backToToday: "Back to today's results",
    answers: "The answers",
    dragOnMap: "Compare sizes on the map",
    pictureSaved: "Picture saved. Post it anywhere.",
    pictureFailed: "Couldn't make the picture. Try Share my score instead.",
  },
};
