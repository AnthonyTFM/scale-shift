// Words for the "Meet the makers" page (/team). Change copy here, not in the page.
// Each maker writes (and approves) their own card, in their own words.
// Photos are square headshots on the same soft grey studio background (#e9eaee to #c9ccd4, top to bottom), so the
// cards match.

export type Maker = {
  id: string;
  name: string;
  role: string;
  /** a square photo in /public/team, or none yet */
  photo?: { src: string; alt: string };
  bio: string[];
  facts: { label: string; text: string }[];
  motto?: string;
};

export const teamCopy = {
  metaTitle: "Meet the makers",
  metaDescription: "Border Drift is made by Anthony Bell and Evan, two friends who love to travel and wanted a better way to see the world.",
  eyebrow: "About us",
  title: "Meet the makers",
  // the shared "how we came up with Border Drift" story goes here once both makers have answered
  lead: "The two friends behind Border Drift.",
  makersTitle: "The makers",
  nextTitle: "What's next",
  next: "Our hope is that Border Drift ends up in schools, helping teachers teach world history accurately, and becomes a popular game that teaches kids more about the world.",
  teachers: "For teachers",
  play: "Play today's five",
  comingSoon: "Bio coming soon.",
  mottoSr: "Motto",
};

export const makers: Maker[] = [
  {
    id: "anthony",
    name: "Anthony Bell",
    role: "Game and UI design",
    photo: { src: "/team/anthony.webp", alt: "Anthony Bell" },
    bio: [
      "I design the games and the interface of Border Drift. What I'm proudest of is how Evan's ideas and mine came together into something that is both a fun game and a real learning tool. Evan and I both love to travel the world, and Border Drift is our way of understanding the world we live in.",
      "Outside of Border Drift, I'm a fitness coach and an EDM junkie. My family's heritage is Macedonian, so my favorite feature is watching empires grow and fall over time, especially Alexander the Great's, which stretched from Macedon to Egypt and India.",
    ],
    facts: [
      {
        label: "Favorite \"the map lies\" fact",
        text: "Madagascar puts a lot of countries that people think are big to shame. It's larger than Spain, Germany, Japan or the UK.",
      },
      { label: "Best endless streak", text: "7 in a row. It gets pretty difficult!" },
      { label: "Fun fact", text: "I love clouds." },
    ],
    motto: "If the sky's the limit, shoot for the stars.",
  },
  {
    id: "evan",
    name: "Evan",
    role: "Maps and historical borders",
    bio: [],
    facts: [],
  },
];
