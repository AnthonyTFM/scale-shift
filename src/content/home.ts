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
    replay: "Replay",
    // the picture, for screen readers (the line under it says the sizes in words)
    proofSr: (a: string, b: string) => `${a} and ${b}, drawn as a normal map shows them, then shrinking or growing to their real sizes`,
    play: "Play today's five",
    played: "See today's results",
  },

  stickyCta: "Explore the real-size map",
  // the phone bar on era pages, before today's game is played
  stickyPlay: "Play today's five",

  // the game-first hero: the two game tiles, yesterday's matchup, the Best streaks board and the map card over a floating globe
  hub: {
    mission:
      `Most web maps puff up land near the poles, so the places you know best are drawn the wrong size. ${site.name} shows nearly every country and empire at its real size, across 4,000 years of borders.`,
    // phones show this one line instead of `mission` on a first visit, so the games start on the first screen
    missionShort: "Normal web maps get sizes wrong. Can you tell what's really bigger?",
    // returning players (anyone who has played here) see this one line instead of the big headline and `mission`
    welcomeBack: "Welcome back. The map is still lying.",
    // the two game tiles at the top (src/components/home/HeroPlay.tsx and HeroEndless.tsx): one stat line each
    playEyebrow: (day: number) => `Daily #${day}`,
    playTitle: "Which is bigger?",
    playNew: "5 matchups · 2 min",
    playStreakSr: (n: number) => `${n}-day streak`,
    playTodaySr: (score: number, total: number) => `${score} out of ${total} today`,
    playToday: "today",
    playPerfect: (n: number) => `${n} perfect`,
    playNoStreak: "Start a streak",
    playCta: "Play",
    playCtaLong: "Play today's five",
    playDoneCta: "Results",
    playDoneCtaLong: "See today's results",
    endlessEyebrow: "Endless",
    endlessTitle: "How long can you last?",
    endlessNew: "Until your first miss",
    endlessBestSr: (n: number) => `Your best: ${n} in a row`,
    endlessTopLine: (n: number) => `#1: ${n}`,
    endlessCta: "Play",
    endlessCtaLong: "Play endless",
    endlessCtaBeat: (n: number) => `Beat ${n}`,
    endlessCtaBeatLong: (n: number) => `Beat your ${n} in a row`,
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
