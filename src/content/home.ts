// Homepage copy. Facts here must stay true: Africa is 30.37M km², Greenland 2.17M km² (14× smaller).

export const home = {
  eyebrow: "Free to play · No sign-up needed",
  title: "Your map has been lying to you.",
  lead: "Greenland looks as big as Africa. Africa is 14 times bigger. Drag any country or empire to its true size, travel through 4,000 years of borders, and see if you can beat today's challenge.",
  playCta: "Take today's challenge",
  mapCta: "Explore the true-size map",
  globeLabel: "A slowly turning globe. Drag it to spin.",
  globeHint: "Drag to spin",

  teaser: {
    title: "Which is bigger?",
    lead: "5 matchups. One looks huge, the other really is. Your eyes will lie to you. Can you go 5 for 5?",
    done: (score: number) => `You scored ${score}/5 today. New matchups at midnight.`,
    cta: "Take today's 5 →",
    doneCta: "See today's answers",
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
