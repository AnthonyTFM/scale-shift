/**
 * Curated "came before" links shown on a modern country's panel and timeline page.
 * Keys and values are entity ids. This is a teaching aid, not a legal claim of succession.
 */
export const lineage: Record<string, string[]> = {
  italy: ["roman-empire", "western-roman-empire", "byzantine-empire", "papal-states", "venice"],
  turkey: ["byzantine-empire", "ottoman-empire"],
  russia: ["kyivan-rus", "tsardom-of-muscovy", "russian-empire", "ussr"],
  china: ["han", "tang-empire", "song-empire", "mongol-empire-claims", "ming-empire", "qing-empire"],
  india: ["gupta-empire", "sultanate-of-delhi", "vijayanagara", "mughal-empire", "british-raj"],
  iran: ["parthian-empire", "sasanian-empire", "safavid-empire", "persia"],
  "united-kingdom": ["england", "scotland", "united-kingdom-claims"],
  mexico: ["aztec-empire", "viceroyalty-of-new-spain"],
  peru: ["inca-empire", "viceroyalty-of-peru"],
  germany: ["frankish-kingdom", "holy-roman-empire", "prussia", "german-empire"],
  france: ["frankish-kingdom", "france-claims"],
  spain: ["castile", "aragon", "spain-claims"],
  mongolia: ["mongol-empire-claims", "great-khanate"],
  japan: ["empire-of-japan"],
  austria: ["holy-roman-empire", "austrian-empire", "austro-hungarian-empire"],
  "united-states": ["united-states-claims"],
  brazil: ["viceroyalty-of-brazil", "kingdom-of-brazil"],
};

/** Reverse lookup: which modern countries list this entity as a predecessor. */
export function successorsOf(id: string): string[] {
  return Object.entries(lineage)
    .filter(([, ids]) => ids.includes(id))
    .map(([modern]) => modern);
}
