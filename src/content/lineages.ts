// Links the different names one state has had over time, so a shape's timeline can step
// from "Tsardom of Muscovy" to "Russian Empire" to "USSR" to "Russia".
// Names must match the map data exactly (search the map to check spelling).
// When several names exist in the same era, the largest one is shown.

export const lineages: { label: string; names: string[] }[] = [
  { label: "United States", names: ["British American colonies", "United States of America", "United States"] },
  {
    label: "Russia",
    names: ["Principality of Novgorod", "Novgorod", "Tsardom of Muscovy", "Russian Empire", "Soviet Russia (RSFSR)", "USSR", "Russia"],
  },
  {
    label: "China",
    names: [
      "Zhou states",
      "Qin",
      "Han Empire",
      "Han",
      "Tang Empire",
      "Song Empire",
      "Ming Empire",
      "Ming Chinese Empire",
      "Post-Ming Warlords",
      "Qing Empire",
      "Manchu Empire",
      "Republic of China",
      "Chinese Warlords",
      "Chinese warlords",
      "China",
    ],
  },
  { label: "Austria", names: ["Austrian Empire", "Austria Hungary", "Austro-Hungarian Empire", "Austria"] },
  {
    label: "United Kingdom",
    names: ["England", "England and Ireland", "United Kingdom", "United Kingdom of Great Britain and Ireland"],
  },
  { label: "France", names: ["Franks", "Frankish Kingdom", "West Francia", "Kingdom of France", "France"] },
  { label: "Germany", names: ["Holy Roman Empire", "Prussia", "German Empire", "Germany", "West Germany"] },
  {
    label: "Rome & Byzantium",
    names: ["Rome", "Roman Republic", "Roman Empire", "Eastern Roman Empire", "Byzantine Empire"],
  },
  { label: "Türkiye", names: ["Ottoman Empire", "Ottoman Sultanate", "Turkey", "Republic of Turkey", "Türkiye"] },
  { label: "India", names: ["Mauryan Empire", "Gupta Empire", "Sultanate of Delhi", "Mughal Empire", "British Raj", "India"] },
  {
    label: "Iran",
    names: ["Achaemenid Empire", "Seleucid Kingdom", "Parthia", "Parthian Empire", "Persia", "Safavid Empire", "Iran"],
  },
  { label: "Spain", names: ["Castilla", "Castile", "Castille", "Spain"] },
  { label: "Mexico", names: ["Aztec Empire", "Viceroyalty of New Spain", "Mexico"] },
  {
    label: "Brazil",
    names: ["Portuguese Brazil", "Viceroyalty of Brazil", "Empire of Brazil", "Brazil"],
  },
  { label: "Indonesia", names: ["Dutch East Indies", "Netherlands Indies", "Indonesia"] },
  { label: "Mongolia", names: ["Mongols", "Mongol Empire", "Mongolia"] },
  {
    label: "Japan",
    names: [
      "Japan",
      "Imperial Japan (Fujiwara)",
      "Shogun Japan (Kamakura)",
      "Japan (Warring States)",
      "Imperial Japan",
      "Empire of Japan",
      "Japan (USA)",
    ],
  },
  { label: "Egypt", names: ["Egypt", "Ptolemaic Kingdom", "Mamluke Sultanate"] },
  { label: "Macedon", names: ["Empire of Alexander", "Macedon and Hellenic League"] },
];
