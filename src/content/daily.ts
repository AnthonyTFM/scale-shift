// Words for the daily challenge page. Change copy here, not in the components.

export const dailyCopy = {
  eyebrow: "Daily challenge",
  title: "Which is bigger?",
  lead: "Five matchups a day, the same for everyone. Normal maps puff up land near the poles, so the one that looks bigger often isn't. Go 5 for 5 and keep your streak alive. New matchups at midnight your time.",
  // under the game
  note: "Areas come from our map outlines (for an empire, its borders in the year shown), so they can be a few percent off official figures. Your scores and streak are saved in this browser, and in your account if you sign in.",
  // a friend's challenge link: for today's game, or for an older one
  challengeToday: (name: string, score: number) => `${name} scored ${score}/5 on today's challenge. Can you beat it?`,
  challengeOld: (name: string, day: number) => `${name} sent you Daily #${day}. That one's gone, but today's is ready: play it and send your score back.`,
  // the countdown under the results, to the next daily
  nextIn: "Next five in",
  nextTime: (h: number, m: number) => (h ? `${h}h ${m}m` : m ? `${m}m` : "under a minute"),
  nextReady: "Five new matchups are ready. Load them",
  // the results header's short version
  nextReadyShort: "New five ready",
  // phones show this instead, so the first puzzle is on screen without scrolling
  leadShort: "Five matchups a day. Normal maps lie about size. Can you see through them?",
  playedElsewhere: "Played today on another device?",
  playedElsewhereShort: "Played on another device?",
  signInToSee: "Sign in to see your result",
  signInToSeeShort: "Sign in",
  // shown on the "Sign in" link while the sign-in window downloads
  signInOpening: "Opening sign-in…",
  // results screen: daily scores are private (no public board), so signing in is about keeping your streak
  save: {
    cta: "Save your streak on every device",
    hint: "Free sign-in. Your daily scores stay private.",
    button: "Sign in",
    title: "Save your streak",
    lead: "Sign in and your streak and past results follow you to any phone or computer. Daily scores stay private: they never go on a public board.",
    saving: "Saving your streak…",
    failed: "Couldn't save your streak. Check your connection and try again.",
    retry: "Try again",
  },
  // the sign-in pop-up, shared with endless mode's Best streaks board: step 1 the 13+ box and sign-in, step 2 the
  // username (endless mode only), then where you landed
  joinDialog: {
    step: (n: number) => `Step ${n} of 2`,
    continue: "Continue with email or Google",
    opening: "Opening sign-in…",
    private: "Sign in with a code we email you, or with Google. Your email is never shown.",
    failed: "Sign-in didn't open. Check your connection (or an ad blocker) and try again.",
    retry: "Try again",
    notNow: "Not now",
    nameTitle: "Pick a username",
    nameLead: "This is what everyone sees on the Best streaks board.",
    nameLabel: "Username",
    nameHint: "3 to 16 characters. Not your full real name.",
    remind: "Email me when a new daily challenge is up (starting soon)",
    optional: "(optional; unsubscribe any time with one click)",
    posting: "Posting…",
    notYou: "Not you?",
    signOut: "Sign out",
    close: "Close",
  },
  // the reveal after each answer
  reveal: {
    round: (n: number, total: number) => `Round ${n} of ${total}`,
    ask: "Drawn the way a normal map shows them. Don't trust your eyes.",
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
    // the strip in the verdict: how far each place is from the equator, and how much a normal map stretches it
    // the strip's title: the map showed the smaller one as bigger (fooled you / misleads), or it didn't
    stretchTitle: "Why the map fooled you",
    stretchTitleRight: "Why the map misleads",
    stretchTitleHonest: "How a normal map stretches these two",
    stretchTitleBoth: "Both near the equator: normal maps get these about right",
    equator: "Equator",
    pole: "Pole",
    stretchRow: (lat: number, stretch: string) => `${lat}° from the equator, ${stretch}`,
    drawnTooBig: (x: string) => `drawn ${x}× too big`,
    drawnAboutRight: "drawn about right",
    stretchNote: "The farther from the equator, the more a normal map blows land up.",
    // after the answer: each shape's size next to a familiar place, in words
    forScale: (name: string) => `For scale: ${name}`,
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
        ? "Perfect. No map can fool you."
        : score >= total - 1
          ? "Sharp eye. One got past you."
          : score >= 3
            ? "Not bad. The map tricked you twice."
            : "The map won this one. Five new matchups tomorrow.",
    scoreSr: (score: number, total: number) => `You got ${score} out of ${total}.`,
    // screen-reader text for each tile in the row of answers
    markSr: (n: number, right: boolean) => `Round ${n}: ${right ? "right" : "wrong"}`,
    // above the progress bar while playing, for players with a streak going
    streakPill: (n: number) => `${n}-day streak`,
    streak: "Streak",
    best: (n: number) => `Best ${n}`,
    // the day a streak reaches 3, 7, 14, 30, 50, 100 or 365 days (STREAK_MILESTONES in src/lib/daily.ts)
    milestone: (n: number) =>
      ({
        3: "3 days in a row. It's a habit now!",
        7: "7 days in a row: a full week of beating the map!",
        14: "14 days in a row: two weeks strong!",
        30: "30 days in a row: a whole month!",
        50: "50 days in a row. Unstoppable!",
        100: "100 days in a row. Legend!",
        365: "365 days in a row: a full year!",
      })[n] ?? `${n} days in a row!`,
    played: "Played",
    playedSub: (n: number) => (n === 1 ? "day" : "days"),
    // the one chart under the stats: everyone's scores today (anonymous counts) or your own days, with a toggle
    chartToggle: "Whose scores",
    chartEveryone: "Everyone today",
    chartYou: "You",
    // after "48 players so far", once enough have played and it's good news (a perfect round can't beat anyone who
    // also got 5, so it says "top" instead)
    standingTop: (pct: number) => `you're in the top ${pct}%`,
    standingBetter: (pct: number) => `you beat ${pct}%`,
    crowdTitle: "How everyone did today",
    crowdSub: (n: number) => `${n} players so far`,
    crowdRow: (score: number, pct: string, mine: boolean) => `${score} out of 5: ${pct}% of players${mine ? ", including you" : ""}`,
    crowdYou: "You",
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
    // the quieter ways to share, under the Share button
    picture: "Share a picture",
    challenge: "Challenge a friend",
    // beside Share: endless mode is the next thing to play (the full name is for screen readers)
    endless: "Keep playing: endless mode",
    endlessShort: "Endless",
    // after "Endless" for screen readers, so the button's name starts with what it shows
    endlessSr: "mode: keep playing",
    answersToggle: (n: number) => `See the ${n} answers`,
    dragOnMap: "Compare sizes on the map",
    pictureSaved: "Picture saved. Post it anywhere.",
    pictureFailed: "Couldn't make the picture. Try sharing your score as text instead.",
  },
};
