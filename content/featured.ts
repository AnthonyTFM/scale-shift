/**
 * Entities that get their own timeline page at /history/<id>, grouped by era.
 * Ids come from public/data/index.json. Unknown ids are skipped automatically.
 */
export const featuredGroups: { era: string; ids: string[] }[] = [
  {
    era: "Ancient world",
    ids: ["roman-empire", "han", "parthian-empire", "kushan-empire", "gupta-empire", "western-roman-empire", "hunnic-empire-claims", "sasanian-empire"],
  },
  {
    era: "Middle Ages",
    ids: [
      "byzantine-empire",
      "umayyad-caliphate",
      "abbasid-caliphate",
      "frankish-kingdom",
      "tang-empire",
      "tibetan-empire",
      "holy-roman-empire",
      "kyivan-rus",
      "fatimid-caliphate",
      "song-empire",
      "khmer-empire",
      "mongol-empire-claims",
      "khanate-of-the-golden-horde",
      "sultanate-of-delhi",
      "timurid-empire",
      "great-zimbabwe",
      "mali",
    ],
  },
  {
    era: "Early modern",
    ids: [
      "ottoman-empire",
      "ming-empire",
      "inca-empire",
      "aztec-empire",
      "mughal-empire",
      "safavid-empire",
      "songhai",
      "viceroyalty-of-new-spain",
      "viceroyalty-of-peru",
      "tsardom-of-muscovy",
      "qing-empire",
      "spain-claims",
      "portugal-claims",
      "netherlands-claims",
    ],
  },
  {
    era: "Modern",
    ids: [
      "united-kingdom-claims",
      "france-claims",
      "russian-empire",
      "austro-hungarian-empire",
      "british-raj",
      "empire-of-japan",
      "ussr",
      "united-states",
      "china",
      "india",
      "russia",
      "canada",
      "brazil",
      "australia",
    ],
  },
];

export const featuredIds = featuredGroups.flatMap((g) => g.ids);
