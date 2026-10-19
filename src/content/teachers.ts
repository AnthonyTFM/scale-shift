// Classroom activities on /teachers. Edit freely. Map links are built from `map` (same format as presets).
import type { MapState } from "@/lib/share";

export type Activity = {
  id: string;
  title: string;
  minutes: string;
  ages: string;
  goal: string;
  links: { label: string; href?: string; map?: MapState }[];
  steps: string[];
  questions: string[];
  notes: string;
};

export const activities: Activity[] = [
  {
    id: "warm-up",
    title: "Daily challenge warm-up",
    minutes: "5–10 min",
    ages: "9+",
    goal: "Practise estimating size and notice how maps distort it. A quick daily starter.",
    links: [{ label: "Today's challenge", href: "/daily" }],
    steps: [
      "Put today's challenge on the projector.",
      "For each question, students vote before you click: hands up, or A/B cards.",
      "Click the class choice, then read the explanation out loud.",
      "Keep a class tally on the board for the week and compare days.",
    ],
    questions: [
      "Which answer surprised you most?",
      "What do the shapes that 'fooled' us have in common? (Look at how far they are from the equator.)",
    ],
    notes:
      "Web maps stretch area by about 1 ÷ cos²(latitude): 4× at 60° north or south, and more than 8× at 70°. The leaderboard is optional and public. With students under 13, skip it or post one class score under a class nickname such as 'Room 12'.",
  },
  {
    id: "mercator",
    title: "The Mercator myth",
    minutes: "15 min",
    ages: "10+",
    goal: "Understand why most world maps make places near the poles look too big.",
    links: [
      { label: "Greenland vs DR Congo", map: { era: "present", shapes: [{ era: "present", name: "DR Congo", color: 0 }, { era: "present", name: "Greenland", color: 1, lon: 2, lat: 2 }] } },
      { label: "Russia at the equator", map: { era: "present", shapes: [{ era: "present", name: "Russia", color: 0, lon: 20, lat: 0 }] } },
    ],
    steps: [
      "Open Greenland vs DR Congo. Before revealing anything, ask: which is bigger?",
      "Drag Greenland down to the equator and watch it shrink.",
      "Each student picks a country, drags it far north, then far south, and writes down what happens to its size.",
      "Discuss why sailors used this map: a straight line on it is a constant compass direction.",
    ],
    questions: [
      "Why do phone and web maps still use this projection? (It keeps shapes and directions correct up close, which suits zooming into streets.)",
      "Where on Earth is the map most accurate?",
    ],
    notes: "DR Congo is about 2.34 million km²; Greenland is about 2.17 million km², yet on a web map Greenland looks many times larger.",
  },
  {
    id: "empires",
    title: "Empires then and now",
    minutes: "30 min",
    ages: "12+",
    goal: "Compare famous empires with today's countries and see which modern nations sit on their land.",
    links: [
      { label: "Roman Empire on the US", map: { era: "present", shapes: [{ era: "present", name: "United States", color: 0 }, { era: "100", name: "Roman Empire", color: 1, lon: -96, lat: 39 }] } },
      { label: "Mongol Yuan (1279) vs China", map: { era: "present", shapes: [{ era: "1279", name: "Great Khanate", color: 0 }, { era: "present", name: "China", color: 1 }] } },
      { label: "Russian Empire 1914 vs Russia", map: { era: "present", shapes: [{ era: "1914", name: "Russian Empire", color: 0 }, { era: "present", name: "Russia", color: 1 }] } },
    ],
    steps: [
      "In pairs, choose an empire: Roman (200 CE), Mongol Yuan (1279), Ottoman (1650), Inca (1500) or British Raj (1914).",
      "Search for it on the map, click it and note its area.",
      "Drag it onto your own country. How many times would your country fit inside?",
      "Use 'Who ruled here?' (click the land) to list the modern countries on its territory.",
      "Each pair shares one surprising fact with the class.",
    ],
    questions: ["Which empire was largest? Which lasted longest?", "Why might an empire's borders be drawn as dashed (approximate) lines?"],
    notes:
      "Worksheet columns: Empire · Year shown · Area · Modern countries · One surprising fact. Areas come from the map outlines and can differ from textbook figures by a few percent.",
  },
  {
    id: "who-ruled",
    title: "Who ruled here?",
    minutes: "20 min",
    ages: "10+",
    goal: "Build a 4,000-year timeline of rulers for your own town.",
    links: [{ label: "Open the map", href: "/map" }],
    steps: [
      "Click your town on the map. The panel lists who ruled that spot in every snapshot.",
      "Students draw a timeline strip with each ruler and its dates.",
      "Swap with a partner who chose a different city and compare.",
      "Click any row to jump the map to that era and see the wider borders.",
    ],
    questions: ["How many times did your town change hands?", "Which changes came from war, and which from treaties or purchases?"],
    notes:
      "Borders before about 1800 are approximate, and the list uses a grid of about 100 km, so small towns near a border may show the neighbour. Many places had peoples without fixed borders, shown as 'no state recorded'.",
  },
  {
    id: "taken-official",
    title: "Taken vs. made official",
    minutes: "30–40 min",
    ages: "14+",
    goal: "Separate when land was taken from when the change was formally recognized, and ask who was left out.",
    links: [
      { label: "The timeline", href: "/timeline" },
      { label: "The United States in 1783 (press play)", map: { era: "1783", shapes: [{ era: "1783", name: "United States of America", color: 0 }] } },
    ],
    steps: [
      "Give each group one event from the timeline: the Louisiana Purchase (1803), the Mexican Cession (1848), the Alaska Purchase (1867) or the Partitions of Poland (1772–1795).",
      "Groups record: how control changed (purchase, war or treaty), the year it was taken, the year it was made official, and the gap between them.",
      "Groups find who lived there and whether they agreed to the change.",
      "Share findings and build a class table.",
    ],
    questions: ["Does a treaty make a border fair? Who gets to decide?", "Can land be sold if the people living on it weren't asked?"],
    notes:
      "For example, the Louisiana Purchase transferred France's claim to the land. The Native nations living there were not part of the deal, and the US took control on the ground over the following decades.",
  },
  {
    id: "disputes",
    title: "Disputed borders: control vs. recognition",
    minutes: "40 min",
    ages: "14+",
    goal: "Understand why some borders are still contested, and describe each side's view fairly.",
    links: [
      { label: "Disputed borders", href: "/disputes" },
      { label: "Antarctic claims on the map", map: { era: "present", shapes: [], at: [-60, -75] } },
    ],
    steps: [
      "Start with Antarctica, a low-stakes case: open the map key and click the overlapping claims on the peninsula.",
      "Assign each group one dispute: Kashmir, Western Sahara, the Falklands (Malvinas), Kosovo or Taiwan.",
      "Each group fills in who controls the land, since when, who claims it, and what international bodies say.",
      "Rule for presenting: describe each side's argument in its strongest form before giving any opinion.",
    ],
    questions: ["Why might a country control land that most of the world doesn't recognize as its own?", "What would it take to settle this dispute?"],
    notes:
      "Some disputes involve ongoing conflict and may affect students personally. Set ground rules first. Status can change; check current news before teaching.",
  },
];

export const tips = [
  "No accounts or installs. Works on Chromebooks, tablets, phones and projectors.",
  "Set up any comparison on the map, click Share, and paste the link into Google Classroom or your slides.",
  "Keyboard: arrow keys move the selected shape, [ and ] rotate it, + and − zoom, Delete removes it.",
  "Click the year on the timeline to jump to any year, like 1453 or 300 BC.",
  "The map key (the list icon on the right of the map) explains every line and colour.",
  "Borders before about 1800 are approximate. Sources and known limits are on the About page.",
  "We collect no student data. The leaderboard is optional, and nicknames are public.",
];
