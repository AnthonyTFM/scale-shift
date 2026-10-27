// Homepage copy. Facts here must stay true. (Greenland vs Africa is thetruesize.com's signature example, so we never lead
// with it: the homepage's picture is yesterday's real daily matchup.)

import { site } from "./site";

export const home = {
  title: "Your map has been lying to you.",
  /** the word in the title shown in red */
  titleAccent: "lying",
  globeLabel: "A globe of today's countries.",

  // "More to explore": the rest of the site, one line each (the two games and the map have their own cards above)
  explore: {
    title: "More to explore",
    leaderboard: "The longest endless streaks",
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
    play: "Play today's five",
    played: "See today's results",
  },

  stickyCta: "Explore the real-size map",
  // the phone bar on era pages, before today's game is played
  stickyPlay: "Play today's five",

  // the game-first hero: today's game, yesterday's matchup and the map card over a floating globe, then the leaderboard
  hub: {
    mission:
      `Most web maps puff up land near the poles, so the places you know best are drawn the wrong size. ${site.name} shows nearly every country and empire at its real size, across 4,000 years of borders.`,
    playEyebrow: "Today's game",
    playTitle: "Which is bigger?",
    playLead: "Five matchups, about two minutes. The map will try to fool you.",
    playCta: "Play today's five",
    playDone: (score: number) => `You scored ${score}/5 today.`,
    playDay: "Daily challenge",
    // the daily card's two numbers, from this browser
    playStreak: "Your streak",
    playStreakDays: (n: number) => `${n} ${n === 1 ? "day" : "days"} in a row`,
    playNoStreak: "Start today",
    // played today: today's score in the first box
    playToday: "Today",
    playTodaySr: (score: number, total: number) => `${score} out of ${total}`,
    // not played yet today: days with all five right
    playPerfect: "Perfect days",
    // a first visit, instead of the boxes: from yesterday's anonymous counts
    playTeaser: (pct: number) => `Yesterday, only ${pct}% of players went 5 for 5. Can you?`,
    playDoneCta: "See today's results",
    // the endless card beside today's game (src/components/home/HeroEndless.tsx)
    endlessEyebrow: "Endless mode",
    endlessTitle: "How long can you last?",
    endlessLead: "Closer and closer matchups, until your first miss.",
    endlessYourBest: "Your best",
    endlessNoBest: "No run yet",
    endlessTop: "#1 streak ever",
    endlessTopBy: (name: string) => `by ${name}`,
    endlessTopNone: "Be the first",
    // the Best streaks board couldn't be reached
    endlessTopFailed: "Unavailable",
    endlessCta: "Play endless",
    endlessCtaBeat: (n: number) => `Beat your ${n} in a row`,
    endlessSr: (n: number) => `${n} in a row`,
    mapEyebrow: "The real-size map",
    mapTitle: "Drag any country anywhere",
    mapLead: "Drag Russia to the equator and watch it shrink. Any country, any era.",
    mapCta: "Open the map",
    boardCta: "Full leaderboard",
    // the leaderboard card: endless mode's Best streaks (daily scores are private)
    streakEmpty: "No streaks yet. Start the first run!",
    streakTitle: "Best streaks ever",
    streakPlayers: (n: number) => `${n} ${n === 1 ? "player" : "players"}`,
    streakSr: (n: number) => `${n} in a row`,
    // someone already on the Best streaks board
    streakBeat: (n: number) => `Beat your ${n} in a row`,
    you: "(you)",
    // the leaderboard couldn't be reached
    boardFailed: "Couldn't load the leaderboard. Try again in a minute.",
    nextIn: (h: number, m: number) => `Next five in ${h ? `${h}h ${m}m` : `${m}m`}`,
    nextReady: "Five new matchups are ready",
    challengeCta: "Challenge a friend",
    spotWaiting: "Your spot is waiting",
    spotPlay: "Play now",
  },
};
