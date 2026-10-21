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
  joinCta: "Join the leaderboard",
  joinHint: "Put today's score on the public board and see where you rank.",
  // the reveal after each answer
  reveal: {
    ask: "Drawn the way a normal web map shows them. Tap the bigger one.",
    right: "✓ Correct!",
    wrong: "✗ Not quite.",
    perfect: "🎉 5 for 5! Perfect round.",
    mapTooBig: (x: string) => `Map: ${x}× too big`,
    mapTooSmall: (x: string) => `Map: ${x}× too small`,
    mapAboutRight: "Map: about right",
    bigger: "✓ Bigger",
    yourPick: "✗ Your pick",
  },
};
