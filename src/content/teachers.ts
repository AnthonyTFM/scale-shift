// Copy for /teachers: a quick reference for teachers. Information only, no lessons or homework. Edit freely.

export const teachers = {
  eyebrow: "For teachers",
  title: "Everything on Size of Empires, in one place",
  lead: "A quick reference for the classroom: why world maps get sizes wrong, real areas for every country, 4,000 years of borders and today's disputes. Free, no sign-up, no ads.",
  jump: [
    { id: "why", label: "Why maps distort" },
    { id: "sizes", label: "Real sizes" },
    { id: "eras", label: "Eras" },
    { id: "changes", label: "Border changes" },
    { id: "disputes", label: "Disputed borders" },
    { id: "class", label: "In class" },
    { id: "cite", label: "Sources & citing" },
  ],

  why: {
    title: "Why world maps get sizes wrong",
    paras: [
      "Most web and wall maps use the Mercator projection (Gerardus Mercator, 1569). It keeps shapes and compass directions true, which made it ideal for sailors, but to do that it stretches everything more the farther it is from the equator.",
      "Areas are inflated by 1 ÷ cos²(latitude). At 60° north, land is drawn 4 times too big; near the poles the stretch heads toward infinity, which is why Antarctica looks like a vast strip along the bottom.",
    ],
    tableTitle: "How much a normal map inflates area",
    // latitude, a place at about that latitude
    rows: [
      [0, "Ecuador, Singapore"],
      [20, "Mexico City, Mumbai"],
      [40, "Madrid, Beijing, New York"],
      [50, "London, Kyiv, Vancouver"],
      [60, "Oslo, Helsinki, Anchorage"],
      [70, "Northern Norway, Alaska's North Slope"],
      [80, "Svalbard, northern Greenland"],
    ] as [number, string][],
  },

  sizes: {
    title: "Real sizes: every country",
    lead: "True areas from our map outlines, and how much a normal web map inflates each one. Areas can differ from official figures by a few percent.",
    mostTitle: "Most exaggerated by a normal map",
    allTitle: "All countries, largest first",
  },

  eras: {
    title: "Eras: world borders through time",
    lead: "Snapshots of world borders from 2000 BCE to today. Each page shows the map, the largest states and what changed since the snapshot before.",
  },

  changes: {
    title: "Recent border changes",
    lead: "For every change, the year control began and the year it was made official, if it ever was.",
    cta: "See the full timeline",
  },

  disputes: {
    title: "Disputed borders at a glance",
    lead: "Places where who controls the land and who claims it don't match. Status can change quickly: check current news before citing.",
    cta: "Details for each dispute",
  },

  inClass: {
    title: "Using it in class",
    tips: [
      ["On a projector", "Open the map full screen. Drag any country or empire to another latitude and the class watches it grow or shrink to its real size."],
      ["Share a set-up", "Arrange shapes on the map, then use Share: the link opens exactly that comparison on every student's device."],
      ["Step through history", "Use the timeline under the map, or open an era page, to show how borders changed in a region."],
      ["Who ruled here?", "Click any spot on land to see who controlled it in every era, with disputes shown first on today's map."],
      ["Quick warm-up", "The daily challenge is five 'which is bigger?' questions, the same for everyone that day, and takes about two minutes. No sign-in needed to play."],
      ["Any device", "Works in any modern browser on laptops, Chromebooks, tablets and phones. Nothing to install and no student accounts."],
    ] as [string, string][],
  },

  cite: {
    title: "Sources and how to cite",
    paras: [
      "Historical borders come from the historical-basemaps project (GPL-3.0); present-day borders from Natural Earth (public domain). Areas are calculated from those outlines.",
      "Historical borders are approximate, especially before 1500: many states had no fixed frontier. Each era page says how precise its borders are.",
    ],
    citeLabel: "Suggested citation",
    citation: (url: string) => `Size of Empires. "Real size of countries and empires." ${url}. Accessed [date].`,
    sourcesCta: "Full sources and licences",
  },
};
