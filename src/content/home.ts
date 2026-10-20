// Homepage copy. Facts here must stay true: Africa is 30.37M km², Russia 16.85M km² (1.8× smaller), yet a web map draws
// Russia at about 83M km², more than twice the size of Africa. (Greenland vs Africa is thetruesize.com's signature
// example, so we lead with our own.)

export const home = {
  eyebrow: "Free to play · No sign-up needed",
  title: "Your map has been lying to you.",
  lead: "On most maps, Russia looks far bigger than Africa. In reality, Africa is nearly twice its size. Drag any country or empire to see its true size, travel through 4,000 years of borders, and put your eye to the test in today's challenge.",
  playCta: "Take today's challenge",
  mapCta: "Explore the real-size map",
  globeLabel: "A slowly turning globe of today's countries. Drag to spin it.",
  globeHint: "Drag to spin",

  teaser: {
    badge: "Today's game",
    title: "Which is bigger?",
    lead: "Five matchups. In each one, a shape looks huge and the other actually is. The map will try to fool you. Can you go 5 for 5?",
    steps: ["5 quick matchups", "Same puzzle for everyone", "New every midnight"],
    done: (score: number) => `You scored ${score}/5 today. New matchups arrive at midnight.`,
    cta: "Take today's 5 →",
    doneCta: "See today's answers",
    topPlayers: "Today's top players",
    noScores: "No scores yet today. Be the first on the board!",
    fullBoard: "Full leaderboard →",
  },

  // the example picture in the daily challenge card: always this pair, the classic trick
  example: {
    caption: "Example matchup",
    mapLabel: "On a normal map",
    realLabel: "Real size",
    looks: (bigger: string, times: number) => `${bigger} looks ${times}× bigger`,
    answer: (winner: string) => `${winner} is bigger`,
  },

  fact: {
    eyebrow: "See it to believe it",
    cta: "Line them up →",
    // the comparison itself rotates daily (src/components/home/DailyFact.tsx); these are the labels
    mapLabel: "On a normal map",
    realLabel: "Real size",
  },

  stickyCta: "Explore the real-size map",

  // the game-first hero: play card, map card and today's leaderboard over a floating globe
  hub: {
    mission:
      "Most world maps stretch land toward the poles, so the countries you know best are drawn the wrong size. Scale Shift shows every country and empire at its real size, across 4,000 years of history.",
    playEyebrow: "Today's game",
    playTitle: "Which is bigger?",
    playLead: "Five matchups, about two minutes. The map will try to fool you.",
    playCta: "Play today's game",
    playDone: (score: number) => `You scored ${score}/5 today.`,
    playDoneCta: "See today's answers",
    mapEyebrow: "The real-size map",
    mapTitle: "Drag any country anywhere",
    mapLead: "Watch shapes shrink and grow as they move, across 4,000 years of borders.",
    mapCta: "Open the map",
    boardTitle: "Today's leaderboard",
    boardEmpty: "No scores yet today. Be the first on the board!",
    boardPlayers: (n: number) => `${n} ${n === 1 ? "player" : "players"} today`,
    boardCta: "Full leaderboard",
    nextIn: (h: number, m: number) => `Next game in ${h}h ${m}m`,
    nextReady: "A new game is ready",
    challengeCta: "Challenge a friend",
    challengeCopied: "Challenge link copied! Send it to a friend.",
    spotWaiting: "Your spot is waiting",
    spotPlay: "Play now",
    beatMe: "Challenge a friend to beat you",
    howTitle: "How to play",
    steps: [
      ["See two shapes", "Both are drawn the way a normal web map shows them, stretched toward the poles."],
      ["Tap the bigger one", "Pick the one you think is really bigger. Trust your eyes at your own risk."],
      ["See the truth", "Watch both shrink or grow to their real sizes, with the areas and why the map lied."],
    ] as [string, string][],
    howFacts: ["Five matchups a day", "Same puzzle for everyone", "Keep your streak going"],
  },
};
