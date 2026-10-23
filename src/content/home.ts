// Homepage copy. Facts here must stay true. (Greenland vs Africa is thetruesize.com's signature example, so we never lead
// with it: the homepage's picture is yesterday's real daily matchup.)

export const home = {
  title: "Your map has been lying to you.",
  /** the word in the title shown in red */
  titleAccent: "lying",
  globeLabel: "A globe of today's countries.",

  // "More to explore": the rest of the site, one line each (the game and the map have their own cards above)
  explore: {
    title: "More to explore",
    leaderboard: "Today's best and all-time points",
    eras: (n: number) => `${n} snapshots, 2000 BCE to today`,
    timeline: (n: number) => `${n} times land changed hands`,
    disputes: (n: number) => `${n} places, from Crimea to Antarctica`,
    teachers: "Everything for the classroom",
  },

  // the hero's picture: the trickiest pair from yesterday's game (src/components/home/YesterdayMatchup.tsx)
  yesterday: {
    eyebrow: "Yesterday's matchup",
    loading: "Loading yesterday's matchup",
    unavailable: "Today's five are waiting",
    unavailableLine: "Yesterday's shapes couldn't load just now.",
    mapLabel: "On a normal map",
    realLabel: "Real size",
    play: "Try today's five",
    played: "See today's answers",
  },

  stickyCta: "Explore the real-size map",
  // the phone bar on the leaderboard and era pages, before today's game is played
  stickyPlay: "Play today's game",

  // the game-first hero: today's game, yesterday's matchup and the map card over a floating globe, then the leaderboard
  hub: {
    mission:
      "Most world maps stretch land toward the poles, so the countries you know best are drawn the wrong size. Border Drift shows every country and empire at its real size, across 4,000 years of history.",
    playEyebrow: "Today's game",
    playTitle: "Which is bigger?",
    playLead: "Five matchups, about two minutes. The map will try to fool you.",
    playCta: "Play today's game",
    playDone: (score: number) => `You scored ${score}/5 today.`,
    playDay: "Daily challenge",
    playDoneCta: "See today's answers",
    mapEyebrow: "The real-size map",
    mapTitle: "Drag any country anywhere",
    mapLead: "Watch shapes shrink and grow as they move, across 4,000 years of borders.",
    mapCta: "Open the map",
    boardTitle: "Today's leaderboard",
    boardEmpty: "No scores yet today. Be the first on the board!",
    // when today's board is empty, the card shows these instead of an empty box
    boardEmptyShort: "No scores yet today. Be the first!",
    boardYesterday: "Yesterday's top players",
    boardAllTime: "All-time top players",
    boardPoints: (n: number) => `${n} pts`,
    boardPlayers: (n: number) => `${n} ${n === 1 ? "player" : "players"} today`,
    boardCta: "Full leaderboard",
    nextIn: (h: number, m: number) => `Next game in ${h}h ${m}m`,
    nextReady: "A new game is ready",
    challengeCta: "Challenge a friend",
    spotWaiting: "Your spot is waiting",
    spotPlay: "Play now",
    beatMe: "Challenge a friend to beat you",
  },
};
