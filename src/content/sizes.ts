// Copy for the "How big is X really?" pages (/size and /size/[country]). `name` is the country as it reads mid-sentence
// ("the United States", "Brazil"); `Name` is the same with a capital letter.

export const sizes = {
  index: {
    eyebrow: "Real sizes",
    title: "How big is every country, really?",
    lead: "Normal web maps stretch land toward the poles, so the countries you know best are drawn the wrong size. Pick a country to see its real area, how much a normal map inflates it, and the countries it really matches.",
    mostTitle: "Most stretched by a normal map",
    allTitle: "Every country, A to Z",
  },
  title: (n: string) => `How big is ${n} really?`,
  metaTitle: (n: string, x: string) => `How big is ${n} really? Real size vs the map (${x})`,
  metaDescription: (name: string, area: string, partner: string, stretchLine: string) =>
    `${name} covers ${area}, about the size of ${partner}. ${stretchLine} See it at its real size on the map.`,
  eyebrow: "Real size",
  // r is "" for the largest ("Largest of 167 countries"), else "12th"
  rank: (r: string, total: number) => (r ? `${r} largest of ${total} countries` : `Largest of ${total} countries`),
  aboutSize: (partner: string) => `about the size of ${partner}`,
  stretchChip: (x: string) => `Normal web maps draw it ${x}× too big`,
  rightChip: "Normal web maps show it about the right size",
  // first paragraph, under the answer box
  intro: {
    stretched: (Name: string, area: string, partner: string, x: string, lat: string, hemi: "North" | "South") =>
      `${Name} covers about ${area}, roughly the size of ${partner}. A normal web map draws it about ${x} times too big, because it lies far from the equator (around ${lat}), and those maps stretch land more the closer it gets to the ${hemi} Pole.`,
    mild: (Name: string, area: string, partner: string, x: string) =>
      `${Name} covers about ${area}, roughly the size of ${partner}. A normal web map draws it about ${x} times too big: not much, but enough to make it look bigger than countries nearer the equator.`,
    right: (Name: string, area: string, partner: string) =>
      `${Name} covers about ${area}, roughly the size of ${partner}. It sits close to the equator, where normal web maps barely stretch land, so they show it at about its real size, and make countries farther north look bigger than it.`,
  },
  picture: { map: "On a normal web map", real: "At real size", alt: (a: string, b: string) => `${a} and ${b}, first as a normal web map draws them, then at real size.` },
  mapCta: (a: string, b: string) => `Compare ${a} and ${b} on the real-size map`,
  facts: { area: "Real area", rank: "Size rank", stretch: "On a normal web map", lat: "Latitude", right: "About right" },
  sameTitle: "Countries about the same size",
  // one row of "Countries about the same size": always says which is bigger ("Algeria is 1.1× bigger"), r = page country ÷ other
  sameRow: (Name: string, Other: string, r: number) =>
    r >= 1.05 ? `${Name} is ${r.toFixed(r >= 10 ? 0 : 1)}× bigger` : r <= 1 / 1.05 ? `${Other} is ${(1 / r).toFixed(1 / r >= 10 ? 0 : 1)}× bigger` : "About the same size",
  historyTitle: (Name: string) => `${Name} through history`,
  history: (Name: string, count: number, maps: number, first: string) =>
    count > 1
      ? `${Name} is on ${count} of our ${maps} maps under this name, first in ${first}. Step through them to see who ruled the land before.`
      : `${Name} is on today's map under this name. Step through our historical maps to see who ruled the land before.`,
  historyCta: (first: string) => `See the world in ${first}`,
  historyMap: "Who ruled here? Open the map",
  faqTitle: "Common questions",
  faq: {
    howBig: (name: string) => `How big is ${name}?`,
    howBigA: (Name: string, area: string, r: string, total: number) => `${Name} covers about ${area}. It is the ${r ? `${r} ` : ""}largest of the ${total} countries on our map.`,
    whyBig: (name: string) => `Why does ${name} look so big on maps?`,
    whyBigA: (Name: string, x: string) =>
      `Most web maps use the Mercator projection, which keeps shapes right but stretches area more and more toward the poles. Averaged over the whole country, it draws ${Name} about ${x} times too big.`,
    rightSize: (name: string) => `Do maps show ${name} at the right size?`,
    rightSizeA: (Name: string, x: string) =>
      `Mostly. ${Name} lies close enough to the equator that a normal web map draws it only about ${x} times too big, while countries far to the north or south are drawn several times too big.`,
    vs: (name: string, other: string) => `Is ${name} bigger than ${other}?`,
    vsA: (Name: string, other: string, r: number) =>
      r >= 1.05
        ? `Yes. ${Name} is about ${r.toFixed(r >= 10 ? 0 : 1)} times the size of ${other}.`
        : r <= 1 / 1.05
          ? `No. ${other.charAt(0).toUpperCase() + other.slice(1)} is about ${(1 / r).toFixed(1 / r >= 10 ? 0 : 1)} times the size of ${Name}.`
          : `They are about the same size: within 5% of each other.`,
  },
  others: "More countries",
  allLink: "All countries, A to Z →",
};
