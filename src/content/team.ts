// Words for the "Meet the makers" page (/team). Change copy here, not in the page.
// Each maker approves their own card before it changes.

export type Maker = {
  id: string;
  name: string;
  role: string;
  /** a photo in /public/team (4:5), or none yet */
  photo?: { src: string; alt: string };
  bio: string[];
  facts: { label: string; text: string }[];
  motto?: string;
};

export const teamCopy = {
  metaTitle: "Meet the makers",
  metaDescription:
    "Border Drift is made by Anthony Bell and Evan, friends since grade school who love to travel. How a 3 a.m. talk about Antarctica turned into a game.",
  eyebrow: "Meet the makers",
  title: "Two friends, one honest map",
  lead: "Border Drift is made by two friends who love to travel and wanted a better way to see the world we live in.",
  storyTitle: "How it started",
  story: [
    "It started at 3 a.m. Anthony and Evan, best friends since early grade school, were deep in a conversation about Antarctica and a dozen other tangents. Then one of them asked: why isn't all of this in one place? And why isn't it a game?",
    "They split the work evenly. Anthony designs the games and the look of the site, and Evan builds the borders behind the map, 4,000 years of them.",
  ],
  nextTitle: "What's next",
  next: "We'd love Border Drift to end up in classrooms: a fun, accurate way for teachers to show world history, and a game that teaches kids how big the world really is.",
  teachers: "For teachers",
  play: "Play today's five",
  makersTitle: "The makers",
  comingSoon: "Bio coming soon.",
  mottoSr: "Motto",
};

export const makers: Maker[] = [
  {
    id: "anthony",
    name: "Anthony Bell",
    role: "Designs the games and the look of the site",
    photo: { src: "/team/anthony.webp", alt: "Anthony in a parking garage, arms crossed, next to a car covered in fake grass" },
    bio: [
      "Anthony designs the games and everything you tap. Away from the map he's a fitness coach, an EDM junkie and a traveller.",
      "His family is Macedonian, so his favourite thing on the site is watching Alexander the Great's empire spread from Macedon to Egypt and India, then fall apart.",
    ],
    facts: [
      { label: "Map fact", text: "Madagascar is bigger than Spain, Germany, Japan or the UK, and even edges out Ukraine. Most maps never tell you." },
      { label: "Fun fact", text: "He loves clouds." },
      { label: "Best endless streak", text: "7 in a row" },
    ],
    motto: "If the sky's the limit, shoot for the stars.",
  },
  {
    id: "evan",
    name: "Evan",
    role: "Builds the borders and the map",
    bio: [],
    facts: [],
  },
];
