// The "Comparisons" tab on the map (and the intro card). Edit freely.
// era = map snapshot key ("present", "1914", "100", "323bce" …) or "us" for US states.
// lon/lat = where the shape's centre is placed; omit to keep it at home.
// at = also open "Who ruled here?" (with any dispute shown first) at this point.

export type PresetShape = { era: string; name: string; lon?: number; lat?: number; rot?: number };
export type Preset = {
  id: string;
  category: "surprising" | "controversial";
  title: string;
  hook: string;
  baseEra: string;
  shapes: PresetShape[];
  at?: [number, number];
  play?: boolean;
};

export const presetCategories = {
  surprising: { title: "Most surprising sizes", blurb: "Comparisons the usual world map gets badly wrong." },
  controversial: { title: "Most controversial", blurb: "Land that changed hands, or still hasn't been settled." },
} as const;

export const presets: Preset[] = [
  // ---------- surprising ----------
  {
    id: "greenland-vs-congo",
    category: "surprising",
    title: "Greenland vs DR Congo",
    hook: "On a normal web map, Greenland looks about 15 times bigger. In reality, DR Congo is about 8% larger.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "DR Congo" },
      { era: "present", name: "Greenland", lon: 2, lat: 2 },
    ],
  },
  {
    id: "russia-at-equator",
    category: "surprising",
    title: "Russia at the equator",
    hook: "Still the world's largest country, but watch how much it shrinks without the polar stretch.",
    baseEra: "present",
    shapes: [{ era: "present", name: "Russia", lon: 20, lat: 2 }],
  },
  {
    id: "alaska-vs-texas",
    category: "surprising",
    title: "Alaska vs Texas",
    hook: "Alaska is more than twice the size of Texas.",
    baseEra: "present",
    shapes: [
      { era: "us", name: "Texas" },
      { era: "us", name: "Alaska", lon: -84, lat: 33 },
    ],
  },
  {
    id: "greenland-vs-australia",
    category: "surprising",
    title: "Greenland vs Australia",
    hook: "Australia is about three and a half times bigger.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "Australia" },
      { era: "present", name: "Greenland", lon: 104, lat: -26 },
    ],
  },
  {
    id: "uk-vs-madagascar",
    category: "surprising",
    title: "United Kingdom vs Madagascar",
    hook: "Madagascar is more than twice the size of the UK.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "Madagascar" },
      { era: "present", name: "United Kingdom", lon: 60, lat: -19 },
    ],
  },
  {
    id: "mexico-on-europe",
    category: "surprising",
    title: "Mexico on Europe",
    hook: "Mexico spans much of western and central Europe.",
    baseEra: "present",
    shapes: [{ era: "present", name: "Mexico", lon: 10, lat: 48 }],
  },
  {
    id: "indonesia-across-usa",
    category: "surprising",
    title: "Indonesia across the US",
    hook: "Indonesia's islands stretch about as far as the US is wide.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "United States" },
      { era: "present", name: "Indonesia", lon: -97, lat: 38 },
    ],
  },
  {
    id: "contiguous-us-vs-australia",
    category: "surprising",
    title: "Lower 48 vs Australia",
    hook: "The contiguous United States and Australia are close in size.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "Australia" },
      { era: "us", name: "Contiguous United States", lon: 134, lat: -26 },
    ],
  },
  {
    id: "rome-over-usa",
    category: "surprising",
    title: "Roman Empire on the United States",
    hook: "Rome near its peak (the 100 CE map; it was largest in 117 CE), dropped onto North America.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "United States" },
      { era: "100", name: "Roman Empire", lon: -96, lat: 39 },
    ],
  },
  {
    id: "alexander-vs-usa",
    category: "surprising",
    title: "Alexander's empire on the US",
    hook: "Everything Alexander conquered by 323 BCE, laid over the United States.",
    baseEra: "present",
    shapes: [{ era: "323bce", name: "Empire of Alexander", lon: -97, lat: 38 }],
  },

  // ---------- controversial ----------
  {
    id: "crimea-vs-belgium",
    category: "controversial",
    title: "Crimea",
    hook: "Seized by Russia in 2014, but recognized as part of Ukraine by most of the world. It's a little smaller than Belgium.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "Crimea" },
      { era: "present", name: "Belgium", lon: 29.5, lat: 43.6 },
    ],
    at: [34.1, 45.3],
  },
  {
    id: "russia-1914-vs-today",
    category: "controversial",
    title: "Russian Empire 1914 vs Russia today",
    hook: "Finland, central Poland, the Baltics, Belarus, most of Ukraine, Moldova, the South Caucasus and Central Asia: all ruled by the tsars in 1914, all lost by 1991.",
    baseEra: "present",
    shapes: [
      { era: "1914", name: "Russian Empire" },
      { era: "present", name: "Russia" },
    ],
  },
  {
    id: "taiwan-vs-netherlands",
    category: "controversial",
    title: "Taiwan",
    hook: "Self-governing, claimed by Beijing and formally recognized by just 12 states (as of 2026). It's a little smaller than the Netherlands.",
    baseEra: "present",
    shapes: [
      { era: "present", name: "Taiwan" },
      { era: "present", name: "Netherlands", lon: 127, lat: 23.7 },
    ],
    at: [121, 23.7],
  },
  {
    id: "mexico-before-1848",
    category: "controversial",
    title: "New Spain 1815 vs Mexico today",
    hook: "Mexico lost about half its land: Texas broke away in 1836 and joined the US in 1845, and the US took California and the Southwest after the 1846–48 war.",
    baseEra: "present",
    shapes: [
      { era: "1815", name: "Viceroyalty of New Spain" },
      { era: "present", name: "Mexico" },
    ],
  },
  {
    id: "germany-1914-vs-today",
    category: "controversial",
    title: "German Empire 1914 vs Germany today",
    hook: "Alsace-Lorraine, Posen and West Prussia were lost after 1918; Silesia, Pomerania, East Brandenburg and East Prussia after 1945.",
    baseEra: "present",
    shapes: [
      { era: "1914", name: "German Empire" },
      { era: "present", name: "Germany" },
    ],
  },
  {
    id: "poland-moves-west",
    category: "controversial",
    title: "Poland moves west",
    hook: "The USSR kept the eastern lands it had seized in 1939, nearly half of prewar Poland, and in 1945 Poland was moved west onto German land. Millions of Germans and Poles were expelled.",
    baseEra: "present",
    shapes: [
      { era: "1938", name: "Poland" },
      { era: "present", name: "Poland" },
    ],
  },
  {
    id: "ottoman-vs-turkiye",
    category: "controversial",
    title: "Ottoman Empire 1600 vs Türkiye",
    hook: "It once reached from Algeria to Iraq and from Hungary to Yemen. Today it's Anatolia and a corner of Europe.",
    baseEra: "present",
    shapes: [
      { era: "1600", name: "Ottoman Empire" },
      { era: "present", name: "Türkiye" },
    ],
  },
  {
    id: "western-sahara-vs-uk",
    category: "controversial",
    title: "Western Sahara",
    hook: "The only African territory still on the UN's decolonization list, mostly held by Morocco since 1975–79. Bigger than the UK.",
    baseEra: "present",
    shapes: [
      { era: "2010", name: "Western Sahara" },
      { era: "present", name: "United Kingdom", lon: -1, lat: 24 },
    ],
    at: [-13.2, 24.5],
  },
  {
    id: "kashmir",
    category: "controversial",
    title: "Kashmir",
    hook: "India, Pakistan and China each control part of it, and claim more.",
    baseEra: "present",
    shapes: [],
    at: [75.5, 34.6],
  },
  {
    id: "watch-us-grow",
    category: "controversial",
    title: "How the United States grew",
    hook: "Press play to watch the US spread from its 1783 borders to the Pacific and beyond, on land taken from Native nations and Mexico, ceded by Britain and Spain, bought from France and Russia, and annexed from Hawaii's overthrown kingdom.",
    baseEra: "1783",
    shapes: [{ era: "1783", name: "United States of America" }],
    play: true,
  },
];
