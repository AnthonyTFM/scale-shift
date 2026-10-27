// Copy for the "How big is X really?" pages (/size and /size/[country]). `name` is the country as it reads mid-sentence
// ("the United States", "Brazil"); `Name` is the same with a capital letter. `times` is a ratio already written out
// ("1.4", "16"); r is the page country's area ÷ the other's.

/** "about the size of Spain" / "a bit bigger than Spain" / "about 3 times the size of Spain" / "about 45% the size of Spain" */
function size(other: string, r: number, times: (x: number) => string) {
  if (r >= 0.87 && r <= 1.15) return `about the size of ${other}`;
  if (r > 1.15 && r < 1.6) return `a bit bigger than ${other}`;
  if (r >= 0.63 && r < 0.87) return `a bit smaller than ${other}`;
  return r > 1 ? `about ${times(r)} times the size of ${other}` : `about ${Math.round(r * 100)}% the size of ${other}`;
}

export const sizes = {
  index: {
    eyebrow: "Real sizes",
    title: "How big is each country, really?",
    lead: "Normal web maps stretch land toward the poles, so the countries you know best are drawn the wrong size. Pick a country to see its real area, how much a normal map inflates it, and the countries it really matches.",
    description: "The real area of each country, how much a normal web map stretches it, and the countries it really matches in size.",
    mostTitle: "Most stretched by a normal map",
    allTitle: "Countries A to Z",
  },
  title: (name: string) => `How big is ${name} really?`,
  metaTitle: (name: string) => `How big is ${name} really?`,
  metaDescription: (Name: string, area: string, like: string, stretchLine: string) => `${Name} covers ${area}, ${like}. ${stretchLine}`,
  metaStretch: (x: string) => `A normal web map draws it ${x}× too big.`,
  metaRight: "A normal web map shows it about the right size.",
  eyebrow: "Real size",
  size,
  // phrase is "largest", "12th largest", "smallest" or "5th smallest" (whichever end is nearer)
  rank: (phrase: string, total: number) => `${phrase.charAt(0).toUpperCase() + phrase.slice(1)} of the ${total} here`,
  measured: (total: number) =>
    `Measured from our map outlines, so official figures can differ by a few percent. Ranks count the ${total} countries and territories on these pages: those over 5,000 km², not counting disputed territories.`,
  disputed: (Name: string, count: number) =>
    `Part of the land ${Name} holds or claims is disputed (${count === 1 ? "1 dispute" : `${count} disputes`}). Our area follows the borders drawn on today's map.`,
  disputedLink: "See the disputed territories →",
  stretchChip: (x: string) => `Normal web maps draw it ${x}× too big`,
  rightChip: "Normal web maps show it about the right size",
  // first paragraph, under the answer box
  intro: {
    stretched: (Name: string, area: string, like: string, x: string, lat: string, hemi: "North" | "South") =>
      `${Name} covers ${area}, ${like}. A normal web map draws it about ${x} times too big, because it lies far from the equator (around ${lat}), and those maps stretch land more the closer it gets to the ${hemi} Pole.`,
    mild: (Name: string, area: string, like: string, x: string) =>
      `${Name} covers ${area}, ${like}. A normal web map draws it about ${x} times too big: not much, but enough to make it look bigger than countries nearer the equator.`,
    right: (Name: string, area: string, like: string) =>
      `${Name} covers ${area}, ${like}. It sits near the equator, where normal web maps barely stretch land, so they draw it close to its real size, while countries farther north or south look bigger than they are.`,
  },
  picture: { map: "On a normal web map", real: "At real size", alt: (a: string, b: string) => `${a} and ${b}, first as a normal web map draws them, then at real size.` },
  mapCta: (a: string, b: string) => `Compare ${a} with ${b} on the real-size map`,
  facts: { area: "Real area", rank: "Size rank", stretch: "On a normal web map", lat: "Latitude", right: "About right" },
  sameTitle: "Countries about the same size",
  // one row of "Countries about the same size": always says which is bigger
  sameRow: (Name: string, name: string, Other: string, other: string, r: number, times: (x: number) => string) =>
    r >= 1.05 ? `${Name} is ${times(r)} times the size of ${other}` : r <= 1 / 1.05 ? `${Other} is ${times(1 / r)} times the size of ${name}` : "About the same size",
  historyTitle: (Name: string) => `${Name} through history`,
  history:
    "Borders here have moved many times. Step through our maps, from 2000 BCE to today, to see who ruled this land before, and how big their realms really were.",
  historyCta: "Open the history map",
  historyEras: "Browse the eras",
  faqTitle: "Common questions",
  faq: {
    howBig: (name: string) => `How big is ${name}?`,
    howBigA: (Name: string, area: string, rank: string, total: number) => `${Name} covers about ${area}. It is the ${rank} of the ${total} countries and territories on these pages (those over 5,000 km²).`,
    whyBig: (name: string) => `Why does ${name} look so big on maps?`,
    whyBigA: (name: string, x: string) =>
      `Most web maps use the Mercator projection, which keeps the shapes of small areas right but stretches area more and more toward the poles. Averaged over the whole country, it draws ${name} about ${x} times too big.`,
    rightSize: (name: string) => `Do maps show ${name} at the right size?`,
    rightSizeA: (Name: string, x: string, barely: boolean) =>
      barely
        ? `Yes. ${Name} lies so close to the equator that a normal web map barely stretches it, while countries far to the north or south are drawn several times too big.`
        : `Mostly. ${Name} lies close enough to the equator that a normal web map draws it only about ${x} times too big, while countries far to the north or south are drawn several times too big.`,
    vs: (name: string, other: string) => `Is ${name} bigger than ${other}?`,
    vsA: (Name: string, name: string, Other: string, other: string, r: number, times: (x: number) => string) =>
      r >= 1.05
        ? `Yes. ${Name} is about ${times(r)} times the size of ${other}.`
        : r <= 1 / 1.05
          ? `No. ${Other} is about ${times(1 / r)} times the size of ${name}.`
          : `They are about the same size: within 5% of each other.`,
  },
  others: "More countries",
  allLink: "Countries A to Z →",
};
