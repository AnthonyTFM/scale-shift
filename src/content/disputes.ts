// Present-day disputed territories: shown first when you click a country on the "Present" map, and on /disputes.
// "taken" = when the current controller gained control. "formalized" explains whether that control
// has ever been made official. Facts reviewed for this build; status can change, so re-check before relying on it.

export type Dispute = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  controlledBy: string;
  claimedBy: string[];
  taken: number;
  formalStatus: string;
  summary: string;
  /** names in the map data this dispute is attached to (info cards) */
  polities: string[];
};

export const disputes: Dispute[] = [
  {
    id: "crimea",
    name: "Crimea",
    lon: 34.1,
    lat: 45.3,
    controlledBy: "Russia",
    claimedBy: ["Ukraine"],
    taken: 2014,
    formalStatus:
      "Annexation not recognized by most UN members. UN General Assembly Resolution 68/262 (March 27, 2014; 100 votes to 11, with 58 abstentions) affirmed Ukraine's borders.",
    summary:
      "Unmarked Russian troops seized Crimea's parliament on February 27, 2014. After a “referendum” held under Russian military control on March 16, Russia declared Crimea annexed on March 18. Russia says Crimeans chose to join it; Ukraine and most of the world call it an illegal annexation. This map draws Crimea as its own striped shape, not as part of either country.",
    polities: ["Crimea", "Russia", "Ukraine"],
  },
  {
    id: "occupied-ukraine",
    name: "Russian-occupied southern and eastern Ukraine",
    lon: 37.8,
    lat: 48.0,
    controlledBy: "Russia (partially)",
    claimedBy: ["Ukraine"],
    taken: 2014,
    formalStatus:
      "Russia claims to have annexed Donetsk, Luhansk, Zaporizhzhia and Kherson oblasts (September 30, 2022), though it does not hold all of them. UN General Assembly Resolution ES-11/4 (October 12, 2022; 143 votes to 5) called the annexation invalid.",
    summary:
      "Fighting in Donetsk and Luhansk began in 2014, and Russia's full-scale invasion followed on February 24, 2022. Counting Crimea, Russia held about a fifth of Ukraine in mid-2026 (ISW and DeepState data). In July 2025 the European Court of Human Rights ruled that Russia itself had controlled the separatist “people's republics” since 2014 and was responsible for shooting down flight MH17. Front lines shift, so they are not drawn; the map shows Ukraine's internationally recognized border.",
    polities: ["Ukraine", "Russia"],
  },
  {
    id: "golan",
    name: "Golan Heights",
    lon: 35.75,
    lat: 33.0,
    controlledBy: "Israel",
    claimedBy: ["Syria"],
    taken: 1967,
    formalStatus: "Israeli law extended in 1981; UN Security Council Resolution 497 declared it null and void. The US recognized Israeli sovereignty in 2019.",
    summary:
      "Israel captured it from Syria in the 1967 Six-Day War. A 1974 disengagement agreement set up a UN-patrolled buffer zone between the two sides. After Assad's fall in December 2024, Israeli forces moved into the buffer zone and positions beyond it, and were still there in 2026; UN reports call this a violation of the 1974 agreement, while Israel says it needs them for security. The source data draws the Golan inside the border Israel actually holds.",
    polities: ["Israel", "Syria"],
  },
  {
    id: "palestine",
    name: "West Bank, East Jerusalem and Gaza",
    lon: 35.25,
    lat: 31.95,
    controlledBy:
      "Israel (East Jerusalem, the West Bank's Area C, and more than half of Gaza as of 2026); the Palestinian Authority (self-rule in West Bank Areas A and B); Hamas (the rest of Gaza)",
    claimedBy: ["Palestine"],
    taken: 1967,
    formalStatus:
      "Occupied by Israel since 1967. Israel annexed East Jerusalem by law in 1980; UN Security Council Resolution 478 declared that null and void. An ICJ advisory opinion (July 19, 2024) found Israel's continued presence in these territories unlawful; Israel rejects it. Palestine has been a UN non-member observer state since 2012 and was recognized by 157 of 193 UN members as of September 2025.",
    summary:
      "Israel pulled its settlers out of Gaza in 2005, and Hamas has ruled it since 2007. After the Hamas-led attack on Israel on October 7, 2023, Israel went to war in Gaza. Under the October 2025 ceasefire, Israeli forces held 53% of Gaza behind a “Yellow Line”; by September 2026, UN OCHA said Palestinians were left with less than 40% of it. Israel calls the West Bank disputed and Jerusalem its undivided capital; Palestinians seek a state in all these territories, with East Jerusalem as its capital.",
    polities: ["Palestine", "Israel"],
  },
  {
    id: "kashmir",
    name: "Kashmir",
    lon: 75.5,
    lat: 34.6,
    controlledBy: "India, Pakistan and China (each controls part)",
    claimedBy: ["India", "Pakistan", "China"],
    taken: 1947,
    formalStatus:
      "Divided by the 1949 ceasefire line, renamed the Line of Control in 1972. No agreed border. India says the whole former princely state legally joined India in 1947; Pakistan says its people should decide, as a 1948 UN Security Council resolution (47) proposed. That plebiscite was never held.",
    summary:
      "China has held Aksai Chin since the 1950s, confirmed by the 1962 war. Pakistan ceded the Shaksgam Valley to China in 1963, a transfer India does not recognize. India has held the Siachen Glacier since 1984. On August 5, 2019, India ended Jammu and Kashmir's special status and split it into two union territories; Pakistan and China reject the change. After militants killed 26 people at Pahalgam on April 22, 2025, India blamed Pakistan, which denied involvement; the two traded strikes from May 7 until a ceasefire on May 10.",
    polities: ["India", "Pakistan", "China", "Siachen Glacier"],
  },
  {
    id: "arunachal",
    name: "Arunachal Pradesh",
    lon: 93.6,
    lat: 27.9,
    controlledBy: "India",
    claimedBy: ["China"],
    taken: 1951,
    formalStatus: "China has never accepted the McMahon Line (1914 Simla Convention).",
    summary:
      "India took over Tawang from Tibetan officials in February 1951. China calls the area Zangnan (“South Tibet”), claims almost all of it, and has given Chinese names to places there several times since 2017; India rejects them. Chinese troops overran much of the area in the 1962 war, then withdrew.",
    polities: ["India", "China"],
  },
  {
    id: "taiwan",
    name: "Taiwan",
    lon: 121.0,
    lat: 23.7,
    controlledBy: "Republic of China (Taiwan)",
    claimedBy: ["People's Republic of China"],
    taken: 1945,
    formalStatus:
      "Self-governing, and formally recognized by 12 states as of 2026 (11 UN members and the Holy See). The PRC claims it but has never ruled it; the PRC has held China's UN seat since 1971 (UN General Assembly Resolution 2758).",
    summary:
      "Japan handed Taiwan to Republic of China administration in 1945, and the ROC government moved there in 1949. In the 1951 San Francisco Treaty, Japan renounced Taiwan without naming a recipient. The ROC also holds Penghu, Kinmen and Matsu. Beijing calls Taiwan a province of China and has not ruled out force; Taiwan's government says the PRC has never governed it.",
    polities: ["Taiwan", "China"],
  },
  {
    id: "western-sahara",
    name: "Western Sahara",
    lon: -13.2,
    lat: 24.5,
    controlledBy: "Morocco (about 80%, west of the 2,700 km sand wall it built in the 1980s) and the Sahrawi Republic / Polisario (the east, about 20%)",
    claimedBy: ["Morocco", "Sahrawi Arab Democratic Republic"],
    taken: 1975,
    formalStatus:
      "UN non-self-governing territory. The US recognized Moroccan sovereignty in 2020, and in 2025 the UN Security Council (Resolution 2797) called for talks based on Morocco's autonomy plan. Morocco calls it its Southern Provinces; the Polisario wants the independence referendum promised in 1991, which was never held. The Sahrawi Republic is a member of the African Union.",
    summary:
      "In October 1975 the ICJ found no tie of territorial sovereignty between the land and Morocco or Mauritania. Weeks later, Spain handed it to both in the Madrid Accords (November 14, 1975). The Polisario fought both; Mauritania pulled out in 1979 and Morocco took its southern share. A UN ceasefire held from 1991 until fighting resumed in November 2020. The source data draws Morocco-administered land as part of Morocco and labels only the Polisario-held east “Western Sahara”, so Morocco's area here includes the disputed part.",
    polities: ["Western Sahara", "Morocco"],
  },
  {
    id: "northern-cyprus",
    name: "Northern Cyprus",
    lon: 33.57,
    lat: 35.26,
    controlledBy: "Turkish Republic of Northern Cyprus (backed by Türkiye)",
    claimedBy: ["Cyprus"],
    taken: 1974,
    formalStatus: "Recognized only by Türkiye; UN Security Council Resolution 541 (1983) deemed the declaration invalid.",
    summary:
      "After a coup backed by Greece's military government on July 15, 1974, Türkiye invaded on July 20 (with a second offensive on August 14) and has kept troops in the north since. Türkiye calls it an intervention to protect Turkish Cypriots under the 1960 Treaty of Guarantee. A UN buffer zone has divided the island since 1974, and the north declared itself a state on November 15, 1983.",
    polities: ["Northern Cyprus", "Cyprus"],
  },
  {
    id: "kosovo",
    name: "Kosovo",
    lon: 20.87,
    lat: 42.57,
    controlledBy: "Republic of Kosovo",
    claimedBy: ["Serbia"],
    taken: 1999,
    formalStatus:
      "The count is disputed: Kosovo lists more than 110 recognitions, while Serbia says fewer than 100 remain after some states withdrew theirs. Serbia, Russia, China and five EU members do not recognize it.",
    summary:
      "After the 1998–99 war and NATO's 78-day bombing of Yugoslavia (March 24 to June 10, 1999), Kosovo came under UN administration (Security Council Resolution 1244). It declared independence on February 17, 2008; in 2010 an ICJ advisory opinion found that the declaration did not violate international law. Serbia still calls Kosovo its southern province.",
    polities: ["Kosovo", "Serbia"],
  },
  {
    id: "somaliland",
    name: "Somaliland",
    lon: 46.25,
    lat: 9.74,
    controlledBy: "Republic of Somaliland",
    claimedBy: ["Somalia"],
    taken: 1991,
    formalStatus:
      "Declared independence on May 18, 1991. Israel recognized it on December 26, 2025, the first UN member to do so; Somalia, the African Union and the EU reject the move.",
    summary:
      "It has worked as a state in practice for over three decades, with its own currency, army and elections. Since 2023 it has lost Las Anod and parts of the Sool, Sanaag and Cayn regions to SSC-Khatumo, which Somalia recognized as a federal member state in 2025.",
    polities: ["Somaliland", "Somalia"],
  },
  {
    id: "abkhazia-south-ossetia",
    name: "Abkhazia and South Ossetia",
    lon: 41.5,
    lat: 43.0,
    controlledBy: "Russian-backed separatist governments, with Russian troops",
    claimedBy: ["Georgia"],
    taken: 1993,
    formalStatus:
      "Recognized by Russia (August 26, 2008), Nicaragua, Venezuela and Syria as of 2026. Georgia and the EU call them Russian-occupied, and the European Court of Human Rights (2021) found that Russia has had effective control there since the 2008 war.",
    summary:
      "Both broke away from Georgian control in wars in 1991–93; most ethnic Georgians in Abkhazia fled or were driven out. In August 2008, after Georgia attacked South Ossetia's capital, Russian troops moved into Georgia; the five-day war ended on August 12, and Russia has kept bases in both regions since. The source data draws them inside Georgia's internationally recognized border.",
    polities: ["Georgia", "Russia"],
  },
  {
    id: "transnistria",
    name: "Transnistria",
    lon: 29.6,
    lat: 46.84,
    controlledBy: "Pridnestrovian Moldavian Republic",
    claimedBy: ["Moldova"],
    taken: 1992,
    formalStatus: "Not recognized by any UN member.",
    summary:
      "A strip of land east of the Dniester River. It declared itself a separate republic on September 2, 1990, and has been independent in practice since the March–July 1992 war. About 1,500 Russian troops remain there, against Moldova's wishes.",
    polities: ["Moldova"],
  },
  {
    id: "falklands",
    name: "Falkland Islands (Islas Malvinas)",
    lon: -59.0,
    lat: -51.7,
    controlledBy: "United Kingdom",
    claimedBy: ["Argentina"],
    taken: 1833,
    formalStatus: "British Overseas Territory; Argentina maintains its claim.",
    summary:
      "Britain took control in January 1833, expelling an Argentine garrison. Argentina invaded on April 2, 1982, and Britain retook the islands by June 14 (649 Argentine, 255 British and 3 islander deaths). In a 2013 referendum, 99.8% of voters chose to remain British. Britain says the islanders have the right to choose; Argentina rejects the vote and points to UN calls for talks (Resolution 2065, 1965).",
    polities: ["Falkland Islands", "United Kingdom", "Argentina"],
  },
  {
    id: "kurils",
    name: "Southern Kuril Islands",
    lon: 147.9,
    lat: 45.0,
    controlledBy: "Russia",
    claimedBy: ["Japan"],
    taken: 1945,
    formalStatus: "No Japan–Russia peace treaty has ever been signed.",
    summary:
      "Iturup, Kunashir, Shikotan and the Habomai islets, which Japan calls the Northern Territories. Soviet forces occupied them from August 28 to September 5, 1945, after Japan announced its surrender, and deported the Japanese residents by 1949. In 1956 the USSR offered to return Shikotan and the Habomais once a peace treaty was signed, which never happened. Russia says it gained the islands lawfully at the end of the Second World War.",
    polities: ["Russia", "Japan"],
  },
  {
    id: "essequibo",
    name: "Essequibo (Guayana Esequiba)",
    lon: -59.0,
    lat: 6.5,
    controlledBy: "Guyana",
    claimedBy: ["Venezuela"],
    taken: 1899,
    formalStatus:
      "Set by an 1899 arbitral award. Venezuela calls the award a fraud and says the 1966 Geneva Agreement requires a negotiated deal. The International Court of Justice heard the case in May 2026; its judgment was still pending in October 2026.",
    summary:
      "The region makes up more than 70% of Guyana's territory. In 2023, Venezuela held a referendum on annexing it. In May 2025, despite an ICJ order not to, Venezuela elected a “governor” for the region in a vote held on its own side of the border.",
    polities: ["Guyana", "Venezuela"],
  },
  {
    id: "halaib",
    name: "Halaib Triangle and Bir Tawil",
    lon: 35.5,
    lat: 22.2,
    controlledBy: "Egypt (Halaib); nobody (Bir Tawil)",
    claimedBy: ["Egypt", "Sudan"],
    taken: 2000,
    formalStatus: "Two conflicting borders (1899 and 1902) leave Halaib claimed by both and Bir Tawil claimed by neither.",
    summary:
      "Egypt pushed out Sudanese officials after 1992 and its army took over in the mid-1990s. Sudan withdrew its last troops in 2000 but still claims Halaib. Bir Tawil is one of the few land areas on Earth that no state claims.",
    polities: ["Egypt", "Sudan"],
  },
  {
    id: "gibraltar",
    name: "Gibraltar",
    lon: -5.35,
    lat: 36.14,
    controlledBy: "United Kingdom",
    claimedBy: ["Spain"],
    taken: 1704,
    formalStatus:
      "Ceded to Britain by the Treaty of Utrecht (1713); Spain seeks its return, and also disputes British control of the isthmus, which the treaty did not cover. The UN lists Gibraltar as a non-self-governing territory.",
    summary: "Residents voted overwhelmingly to remain British in 1967 and 2002.",
    polities: ["United Kingdom", "Spain"],
  },
  {
    id: "ceuta-melilla",
    name: "Ceuta and Melilla",
    lon: -5.32,
    lat: 35.89,
    controlledBy: "Spain",
    claimedBy: ["Morocco"],
    taken: 1497,
    formalStatus: "Part of Spain (autonomous cities since 1995); Morocco does not recognize Spanish sovereignty.",
    summary:
      "Spain's two cities on the North African coast. They form the European Union's only significant land borders with Africa. Melilla has been Spanish since 1497. Ceuta, Portuguese from 1415, shared Spain's king from 1580, stayed with Spain when Portugal broke away in 1640, and was ceded by Portugal in the Treaty of Lisbon (1668). Morocco says both are occupied Moroccan land.",
    polities: ["Spain", "Morocco"],
  },
  {
    id: "liancourt-rocks",
    name: "Liancourt Rocks (Dokdo / Takeshima)",
    lon: 131.87,
    lat: 37.24,
    controlledBy: "South Korea",
    claimedBy: ["Japan"],
    taken: 1954,
    formalStatus: "Administered by South Korea; Japan claims them as part of Shimane Prefecture.",
    summary:
      "Two small islets and dozens of rocks between Korea and Japan. Japan says it incorporated them on February 22, 1905, as land no one owned. Korea says they were already Korean (an imperial decree of 1900) and that the move was the first step in Japan's takeover of Korea. South Korea has kept a police garrison there since 1954 and has turned down Japan's proposals (1954, 1962 and 2012) to take the case to the International Court of Justice.",
    polities: ["South Korea", "Japan"],
  },
  {
    id: "senkaku",
    name: "Senkaku Islands (Diaoyu Islands)",
    lon: 123.5,
    lat: 25.75,
    controlledBy: "Japan",
    claimedBy: ["China", "Taiwan"],
    taken: 1972,
    formalStatus: "Administered by Japan since the United States returned Okinawa in 1972; China and Taiwan both claim them.",
    summary:
      "Uninhabited islands in the East China Sea. Japan says it incorporated them in January 1895 as land no one owned, separately from the treaty that gave it Taiwan that April. China and Taiwan say they appear in Ming-dynasty records and were taken along with Taiwan, so they should have been returned after the Second World War. The US administered them from 1945 to 1972. China and Taiwan first pressed their claims publicly in 1971, after a 1968–69 UN-backed survey reported possible oil and gas. Japan bought three of the islands from a private owner in 2012, and Chinese coast guard ships have patrolled nearby regularly since.",
    polities: ["Japan", "China", "Taiwan"],
  },
  {
    id: "spratly",
    name: "Spratly Islands",
    lon: 114.0,
    lat: 10.0,
    controlledBy: "Split: Vietnam, the Philippines, China, Malaysia and Taiwan each hold some features",
    claimedBy: ["China", "Taiwan", "Vietnam", "Philippines", "Malaysia", "Brunei"],
    taken: 1988,
    formalStatus:
      "No agreed sovereignty. On July 12, 2016, an arbitral tribunal (Philippines v. China, under the UN Law of the Sea) found no legal basis for China's claimed historic rights inside its “nine-dash line”; China and Taiwan reject the ruling.",
    summary:
      "More than 100 reefs and islets in the South China Sea, claimed in whole or part by six governments. Occupations date from 1946 (Taiwan's garrison on Itu Aba) to the 1990s. China took six reefs in early 1988, killing 64 Vietnamese sailors at Johnson South Reef on March 14, 1988. It took Mischief Reef, claimed by the Philippines, in 1995, and has built artificial islands there since 2013.",
    polities: ["China", "Taiwan", "Vietnam", "Philippines", "Malaysia", "Brunei"],
  },
  {
    id: "antarctica",
    name: "Antarctica",
    lon: 0,
    lat: -80,
    controlledBy: "No state (Antarctic Treaty System)",
    claimedBy: ["Argentina", "Australia", "Chile", "France", "New Zealand", "Norway", "United Kingdom"],
    taken: 1959,
    formalStatus: "Claims frozen by the Antarctic Treaty (signed 1959, in force 1961).",
    summary:
      "Seven countries claim slices, some overlapping. The treaty bans military bases, maneuvers and weapons tests, and any new or enlarged claim. The US and Russia recognize no claims but reserve the right to make their own.",
    polities: ["Antarctica"],
  },
];
