// Copy for the comparison pages (/compare and /compare/[slug]). The comparisons themselves are the presets in presets.ts.

export const compareCopy = {
  indexTitle: "Size comparisons",
  indexLead:
    "Countries and empires lined up at their true size. Normal web maps stretch land near the poles, so these pairs look nothing like they do on the map you grew up with.",
  pageTitle: (title: string) => `${title}: true size compared`,
  figureCaption: "Lined up at true size. A shape keeps its real area wherever you move it on the globe.",
  openMap: "Open this on the map",
  playDaily: "Take today's challenge",
  numbersTitle: "By the numbers",
  realSize: "Real size",
  mapSize: "On a normal map",
  inflated: (x: string) => `A normal web map draws it ${x} times bigger than it really is, where it sits.`,
  notInflated: "A normal web map draws it close to its real size, because it sits near the equator.",
  moreTitle: "More comparisons",
  dailyHook: "Think you'd have guessed? Five new matchups every day.",
};
