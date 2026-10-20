// Homepage copy. Facts here must stay true: Africa is 30.37M km², Greenland 2.17M km² (14× smaller).

export const home = {
  eyebrow: "Free to play · No sign-up needed",
  title: "Your map has been lying to you.",
  lead: "On most maps, Greenland looks as big as Africa. In reality, Africa is 14 times larger. Drag any country or empire to see its true size, travel through 4,000 years of borders, and put your eye to the test in today's challenge.",
  playCta: "Take today's challenge",
  mapCta: "Explore the true-size map",
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

  stickyCta: "Explore the true-size map",
};
