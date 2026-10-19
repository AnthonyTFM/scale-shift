/**
 * Curated comparison pages (/compare/<slug>).
 * `at` moves a shape's centre to [longitude, latitude]; leave it out to keep the shape where it really is.
 * `year` must be a year the entity appears in (see /history/<id> or public/data/index.json).
 */
export interface ComparisonSide {
  id: string;
  year: number;
  at?: [number, number];
}

export interface Comparison {
  slug: string;
  title: string;
  /** one sentence that frames the comparison */
  intro: string;
  a: ComparisonSide;
  b: ComparisonSide;
  /** timeline year the map opens on */
  year: number;
}

export const comparisons: Comparison[] = [
  {
    slug: "greenland-vs-africa",
    title: "Greenland vs Africa",
    intro: "On a Mercator map Greenland looks close to Africa's size. Drag it to the equator and the truth shows up fast.",
    a: { id: "greenland", year: 2026, at: [20, 2] },
    b: { id: "continent-africa", year: 2026 },
    year: 2026,
  },
  {
    slug: "roman-empire-vs-united-states",
    title: "Roman Empire vs the United States",
    intro: "Rome at its height in AD 200, laid over the United States at the same latitude.",
    a: { id: "roman-empire", year: 200, at: [-97, 39] },
    b: { id: "united-states", year: 2026 },
    year: 2026,
  },
  {
    slug: "mongol-empire-vs-russia",
    title: "Mongol Empire vs Russia",
    intro: "The Mongol realm in 1279, with every khanate it claimed, next to modern Russia.",
    a: { id: "mongol-empire-claims", year: 1279 },
    b: { id: "russia", year: 2026, at: [95, 30] },
    year: 2026,
  },
  {
    slug: "russia-vs-africa",
    title: "Russia vs Africa",
    intro: "Russia is the largest country on Earth. Moved onto Africa, it covers barely more than half the continent.",
    a: { id: "russia", year: 2026, at: [20, 2] },
    b: { id: "continent-africa", year: 2026 },
    year: 2026,
  },
  {
    slug: "british-claims-1914-vs-united-kingdom",
    title: "Britain's claims in 1914 vs the UK today",
    intro: "Everything mapped under British rule in 1914, compared with the United Kingdom now.",
    a: { id: "united-kingdom-claims", year: 1914 },
    b: { id: "united-kingdom", year: 2026 },
    year: 1914,
  },
  {
    slug: "ottoman-empire-vs-turkey",
    title: "Ottoman Empire vs modern Turkey",
    intro: "The Ottoman Empire in 1650 against the Republic of Turkey today.",
    a: { id: "ottoman-empire", year: 1650 },
    b: { id: "turkey", year: 2026, at: [34, 22] },
    year: 1650,
  },
  {
    slug: "qing-empire-vs-china",
    title: "Qing Empire vs China today",
    intro: "China under the Qing in 1800, compared with the People's Republic's borders today.",
    a: { id: "qing-empire", year: 1800 },
    b: { id: "china", year: 2026, at: [104, 12] },
    year: 1800,
  },
  {
    slug: "mughal-empire-vs-india",
    title: "Mughal Empire vs India",
    intro: "The Mughal Empire in 1700 next to the Republic of India today.",
    a: { id: "mughal-empire", year: 1700 },
    b: { id: "india", year: 2026, at: [92, 5] },
    year: 1700,
  },
  {
    slug: "united-states-1783-vs-today",
    title: "The United States in 1783 vs today",
    intro: "The thirteen states after the Treaty of Paris, compared with the country today.",
    a: { id: "united-states", year: 1783 },
    b: { id: "united-states", year: 2026, at: [-98, 16] },
    year: 1783,
  },
  {
    slug: "han-vs-roman-empire",
    title: "Han China vs the Roman Empire",
    intro: "The two great powers of AD 100, side by side on the same map.",
    a: { id: "han", year: 100 },
    b: { id: "roman-empire", year: 100 },
    year: 100,
  },
  {
    slug: "inca-empire-vs-peru",
    title: "Inca Empire vs Peru",
    intro: "The Inca realm around 1500 compared with modern Peru.",
    a: { id: "inca-empire", year: 1500 },
    b: { id: "peru", year: 2026, at: [-58, -12] },
    year: 1500,
  },
  {
    slug: "alaska-vs-texas",
    title: "Alaska vs Texas",
    intro: "Alaska looks enormous because it sits so far north. Moved next to Texas, it is still about 2.5 times larger.",
    a: { id: "alaska-us", year: 2026, at: [-90, 33] },
    b: { id: "texas-us", year: 2026 },
    year: 2026,
  },
];

export const getComparison = (slug: string) => comparisons.find((c) => c.slug === slug);
