// Known limitations of the map data, listed on /about.
// The list of individual fixes lives in data-corrections.json (used by the map build and by /about).

export const knownLimitations = [
  "Before about 1650 the source marks almost every border as approximate. Many peoples had no fixed borders, so those lines are scholarly estimates of zones of control.",
  "The map shows snapshots, not every year. Changes between two snapshots appear at the next one; use the event timeline for exact dates.",
  "The 1500 BCE, 1000 BCE and 700 BCE snapshots share most of their shapes in the source, so little changes between them on the map.",
  "Names follow the source dataset and can change spelling between snapshots (for example 'Castile' and 'Castille'). Shapes with different names are linked where we know they are the same state.",
  "Some shape changes between snapshots reflect better mapping rather than real history, especially before 1500.",
  "Where the source leaves real land blank (mostly small islands), the map fills it in a neutral sand color labeled as not mapped, rather than inventing an owner.",
  "Present-day borders come from Natural Earth and show who controls the land. Disputes appear at the top of a country's card when you click it; active front lines are not drawn.",
  "Areas are calculated from the map outlines and can differ from official figures by a few percent (official figures often include inland water).",
];
