# events.ts: fact-check findings applied (2026-10-27)

File edited: /home/user/scale-shift/src/content/events.ts (branch polish/audit-2026-10-27, not committed).
Checks: `npx tsc --noEmit -p .` passes; `npx eslint src/content/events.ts` passes.
(Prettier is not part of the project's checks; the file already failed `prettier --check` before these edits.)

Every finding was re-checked against a source before it was applied (Wikipedia raw text pulled for each topic, plus web search for anything from 2023 or later and every medium-confidence item). Where the check did not support the report's exact number or attribution, the text was changed to what the source supports. Those cases are marked **(adjusted)**.

Totals: WRONG 7/7 applied, VAGUE 38/38 applied, DISPUTED 8/8 applied, STYLE 2/2 applied. 0 skipped. 10 applied with adjustments.

## WRONG fixes

event title | before (short) | after (short) | source
---|---|---|---
Rome takes Sicily from Carthage | "Carthage hands the island to Rome" | Carthage gives up its part; province (own governor from c. 227 BCE); Syracuse an independent ally until 212 BCE | https://en.wikipedia.org/wiki/Sicilia_(Roman_province)
First Crusade takes Jerusalem | "the last mainland stronghold, Acre, falls in 1291" | Acre, the last major city, falls in 1291; last mainland forts abandoned that summer | https://en.wikipedia.org/wiki/Fall_of_Ruad
Russian conquest of Siberia begins | "reach the Pacific coast at Okhotsk by 1639" | "reach the Pacific at the Sea of Okhotsk in 1639" (Okhotsk founded 1647) | https://en.wikipedia.org/wiki/Okhotsk ; https://en.wikipedia.org/wiki/Ivan_Moskvitin
Poland is partitioned out of existence | "Poland does not reappear until 1918" | Full independence only in 1918; Duchy of Warsaw (1807–15) and tsar's Kingdom of Poland (from 1815) as partial revivals | https://www.britannica.com/place/Duchy-of-Warsaw ; https://en.wikipedia.org/wiki/Congress_Poland
Poland's borders shift west | "A reunified Germany confirms it by treaty only 45 years later" | East Germany recognizes the line 1950, West Germany 1970, made final 1990 | https://en.wikipedia.org/wiki/Treaty_of_Zgorzelec ; https://en.wikipedia.org/wiki/Oder%E2%80%93Neisse_line
Spain leaves Western Sahara; Morocco moves in | Morocco takes most, Polisario the east; UN non-self-governing | Madrid Accords split it Morocco/Mauritania; Mauritania out 1979, Morocco takes its share; SADR proclaimed 1976; Polisario wants referendum; UNSC Res. 2797 (Oct 31, 2025) calls for talks on the basis of Morocco's autonomy plan | https://en.wikipedia.org/wiki/Tiris_al-Gharbiyya ; https://asil.org/ilib/security-council-renews-minurso-mandate/ ; https://www.dohainstitute.org/en/PoliticalStudies/Pages/security-council-resolution-2797-background-and-implications-for-western-sahara.aspx
Austria-Hungary breaks apart | "the Kingdom of Serbs, Croats and Slovenes ... declare independence" | the State of Slovenes, Croats and Serbs declares independence, joins Serbia Dec 1, 1918 as the Kingdom (later Yugoslavia) | https://en.wikipedia.org/wiki/State_of_Slovenes,_Croats_and_Serbs

## VAGUE/DISPUTED additions

### VAGUE (38)

event title | before (short) | after (short) | source
---|---|---|---
Assyria conquers the Kingdom of Israel | divided into provinces | + Sargon II's inscriptions claim 27,290 deported, others resettled there **(adjusted: dropped "Guzana and the cities of the Medes", which comes from 2 Kings, not Sargon's inscriptions)** | https://en.wikipedia.org/wiki/Annals_of_Sargon_II
Rome destroys Carthage | "Carthage razed" | six days of street fighting, much of population killed, 50,000 survivors enslaved **(adjusted: dropped the unverified "over 250,000" population figure)** | https://en.wikipedia.org/wiki/Third_Punic_War
Julius Caesar conquers Gaul | "under Roman control" | + Plutarch's 1 million killed / 1 million enslaved; historians doubt figures, not scale; some call it genocide | https://en.wikipedia.org/wiki/Gallic_Wars
Norman conquest of England | "north is subdued by force" | Harrying of the North (1069–70); Orderic Vitalis's 100,000, thought exaggerated | https://en.wikipedia.org/wiki/Harrying_of_the_North ; https://www.historytoday.com/archive/history-matters/harrying-north
First Crusade takes Jerusalem | "Crusader states are founded" | + massacre of Muslims and Jews; 3,000 (Ibn al-Arabi) to 70,000+ (Ibn al-Athir, likely exaggerated) | https://en.wikipedia.org/wiki/Massacre_of_Jerusalem_(1099)
Temüjin is proclaimed Genghis Khan | "largest contiguous land empire" | + kill millions (totals debated); Hülegü claimed 200,000+ dead at Baghdad 1258 | https://en.wikipedia.org/wiki/Destruction_under_the_Mongol_Empire ; https://en.wikipedia.org/wiki/Siege_of_Baghdad
Ottomans take Constantinople | siege, capital | + sack: about 4,000 killed, about 30,000 sold into slavery **(adjusted: report attributed 4,000 to Kritovoulos; could not confirm that, so attributed to historians (Nicolle; Crowley) and used Crowley's ~30,000 enslaved instead of "most survivors")** | https://en.wikipedia.org/wiki/Fall_of_Constantinople
Granada surrenders | signed weeks before | + Alhambra Decree (March 1492); forced conversions of Muslims by 1502 | https://en.wikipedia.org/wiki/Expulsion_of_Jews_from_Spain ; https://en.wikipedia.org/wiki/Forced_conversions_of_Muslims_in_Spain
Spanish conquest of the Aztec Empire | falls Aug 13, 1521 | + ~3-month siege, 1520 smallpox, city destroyed, 100,000–240,000 dead | https://en.wikipedia.org/wiki/Fall_of_Tenochtitlan
Spanish conquest of the Inca Empire | "Pizarro takes Cusco in 1533" | + Cajamarca massacre (Nov 1532), ransom, execution of Atahualpa (1533) | https://en.wikipedia.org/wiki/Battle_of_Cajamarca ; https://www.britannica.com/print/article/2096105
The Qing take Beijing | "Qing expansion into Xinjiang is completed" | Dzungar conquest (1755–59); Wei Yuan's ~600,000; 70–80% died | https://en.wikipedia.org/wiki/Dzungar_genocide
East India Company takes control of Bengal | revenue grant | + 1769–70 famine under Company revenue rule, 1–10 million dead **(adjusted: report said 7–10 million; sources range 1–10 million, so the full range is given)** | https://en.wikipedia.org/wiki/Great_Bengal_famine_of_1770
Britain founds the colony of New South Wales | no treaty; Mabo | + frontier wars; Newcastle massacre map: 400+ massacres, 10,000+ killed, almost all Aboriginal and Torres Strait Islander (stage 5: 438 sites, at least 10,657 killed) | https://c21ch.newcastle.edu.au/colonialmassacres/introduction.php
Spain cedes Florida to the United States | "Jackson's 1818 incursion" | invades in First Seminole War, seizes St. Marks and Pensacola, executes two Native leaders and two British subjects | https://en.wikipedia.org/wiki/Arbuthnot_and_Ambrister_incident
France invades Algeria | "interior is subdued over decades" | four decades of war, Dahra cave killings (1845), 500,000–1,000,000 dead by 1875, some call it genocide | https://en.wikipedia.org/wiki/French_Algeria ; https://en.wikipedia.org/wiki/French_conquest_of_Algeria ; https://www.britannica.com/topic/Ouled-Riah
Treaty of Waitangi and British New Zealand | texts differ | + New Zealand Wars; 1863 Settlements Act confiscations (Waikato, Taranaki) | https://teara.govt.nz/en/te-tango-whenua-maori-land-alienation/page-4
Alaska Purchase | price, Sitka | + Natives not consulted; 1869 Tlingit protest; claims settled 1971 | https://sealaskaheritage.org/wp-content/uploads/2024/04/SHI-Alaska-Education-Social-Studies-Grade-7-Unit-2_Treaty-of-Cession.pdf
Canada is formed | Rupert's Land (1870) | bought without consulting First Nations and Métis; Red River Resistance | https://thecanadianencyclopedia.ca/en/article/manitoba-and-confederation ; https://en.wikipedia.org/wiki/Red_River_Rebellion
The United States annexes Hawaii | "American businessmen overthrow" | backed by US Minister Stevens and Marines from USS Boston; 1993 apology says the Minister conspired | https://www.congress.gov/103/statute/STATUTE-107/STATUTE-107-Pg1510.pdf
Spain cedes Puerto Rico, Guam and the Philippines | "Philippine–American War follows" | US fights Filipino independence forces; up to 200,000 civilian dead (State Dept historians) | https://en.wikipedia.org/wiki/Philippine%E2%80%93American_War
The Soviet Union is founded | "win the Civil War" | + Red Army conquers Azerbaijan, Armenia (1920), Georgia (1921) | https://en.wikipedia.org/wiki/Soviet_invasion_of_Georgia
Türkiye's borders are recognized | "Lausanne recognizes borders" | + compulsory exchange: ~1.2 million Orthodox Christians, 355,000–400,000 Muslims | https://en.wikipedia.org/wiki/Population_exchange_between_Greece_and_Turkey
Italy occupies Ethiopia | invade, take Addis Ababa | + mustard gas (Geneva Protocol); Yekatit 12 massacre **(adjusted: report gave 19,000–30,000; sources give 1,400–30,000 with a 2017 study at ~19,200, so the full range is given)** | https://en.wikipedia.org/wiki/Second_Italo-Ethiopian_War ; https://en.wikipedia.org/wiki/Yekatit_12
USSR annexes Estonia, Latvia and Lithuania | occupied, annexed | + June 1941 deportations **(adjusted: report said ~50,000; per-country estimates for camps plus settlements sum to ~43,000, so "about 40,000")** | https://en.wikipedia.org/wiki/June_deportation
Poland's borders shift west | Oder–Neisse, provisional | + ~12 million Germans flee or expelled (1944–50); USSR keeps eastern Poland, Poles moved west | https://en.wikipedia.org/wiki/Flight_and_expulsion_of_Germans_(1944%E2%80%931950)
Soviet seizure of the Kuril Islands | occupied 1945 | + ~17,000 Japanese residents deported by 1949 | https://www.perfil.com/noticias/internacional/de-la-ocupacion-militar-de-1945-a-la-deportacion-de-17000-japoneses-la-historia-del-litigio-por-las-islas-kuriles.phtml ; https://benhills.com/articles/the-near-abroad/world-war-iis-last-frontier-the-forbidden-kurile-islands/
Partition of British India | "displaces an estimated 10–20 million" | 12–20 million displaced; 200,000–2 million killed | https://en.wikipedia.org/wiki/Partition_of_India
Israel declares independence | armistice lines only | + 700,000+ Palestinians flee or expelled (Nakba); causes debated, both accounts given | https://en.wikipedia.org/wiki/1948_Palestinian_expulsion_and_flight
Algeria wins independence | eight-year war | + 300,000 (FLN 1962) / 350,000 (French officials) to ~1.5 million (later Algerian figures) | https://countrystudies.us/algeria/34.htm
Bangladesh: independent 1971 | declared, war ends | + crackdown many call genocide; 300,000–3 million killed (Hamoodur Rahman: 26,000); 200,000–400,000 raped; 10 million refugees | https://en.wikipedia.org/wiki/Bangladesh_genocide
Türkiye's invasion divides Cyprus | TRNC 1983, only Türkiye recognizes | + July 15 junta-backed coup, July 20 invasion citing 1960 Treaty of Guarantee, ~36%; 140,000–200,000 Greek Cypriots displaced **(adjusted: report said 160,000–200,000; sources go down to 140,000)**; Res. 541 | https://en.wikipedia.org/wiki/Turkish_invasion_of_Cyprus ; https://en.wikipedia.org/wiki/United_Nations_Security_Council_Resolution_541
East Timor: invaded 1975 | UN never recognized | + CAVR: at least 102,800 deaths (18,600 killings, 84,200 hunger/illness) | https://en.wikipedia.org/wiki/Commission_for_Reception,_Truth_and_Reconciliation_in_East_Timor
Yugoslavia breaks apart | "wars follow through 1995" | + ~100,000 killed in Bosnia; Srebrenica, ~8,000, genocide per ICTY and ICJ | https://encyclopedia.ushmm.org/content/en/article/bosnia ; https://www.un.org/en/node/231496
Kosovo declares independence | UN administration from 1999 | + ~850,000 expelled or fled (UNHCR count), NATO bombing **(adjusted: used the UNHCR 848,000 count instead of "800,000 (ICTY)")** | https://en.wikipedia.org/wiki/Kosovo_War ; https://www.hrw.org/reports/2001/kosovo/undword.htm
Russia recognizes Abkhazia and South Ossetia | wars early 1990s | + 200,000–250,000 Georgians driven out of Abkhazia after Sukhumi (Sept 1993) | https://en.wikipedia.org/wiki/Ethnic_cleansing_of_Georgians_in_Abkhazia
Azerbaijan retakes Nagorno-Karabakh | retakes 2020/2023 | + ~600,000 Azerbaijanis displaced 1988–94, hundreds of thousands of Armenians flee Azerbaijan; 100,000+ Karabakh Armenians flee 2023 (UNHCR) **(adjusted: report said "600,000–700,000" and "over 400,000 Armenians"; sources give ~600,000 and 250,000–500,000, so "about 600,000" and "hundreds of thousands")** | https://www.unhcr.org/am/wp-content/uploads/sites/123/2023/11/Armenia-Operational-Update-5-24-October-2023.pdf ; https://www.rferl.org/amp/1066693.html ; https://en.wikipedia.org/wiki/Refugees_in_Azerbaijan
The Balkan Wars push the Ottomans out | seize Ottoman land | + Carnegie inquiry (1914): massacres and expulsions by all sides | https://en.wikipedia.org/wiki/Report_of_the_International_Commission_on_the_Balkan_Wars
Germany and the Soviet Union divide Poland | invasions Sept 1 / 17 | + 5.6–5.8 million Polish citizens dead, about half Jews murdered in the Holocaust (IPN 2009) | https://en.wikipedia.org/wiki/World_War_II_casualties_of_Poland

### DISPUTED (8)

event title | before (short) | after (short) | source
---|---|---|---
Alexander's generals carve up his empire | "Triparadisus (321 BCE)", no approx | "321 or 320 BCE; historians disagree", `approx: true` (note: this also shows "c." on the 323 BCE taken year, since `approx` covers both dates) | https://grbs.library.duke.edu/index.php/grbs/article/view/1671
Seleucus cedes the Indus frontier | "much of today's Afghanistan ... for war elephants" | Arachosia, Paropamisadae, probably Gedrosia; 500 elephants (Strabo); extent debated | https://en.wikipedia.org/wiki/Seleucid%E2%80%93Mauryan_War ; https://www.historyofwar.org/articles/wars_seleucus_india.html
Japan annexes Korea | "already null and void" | + Japan: valid until 1948; South Korea: void from the start | https://en.wikipedia.org/wiki/Treaty_on_Basic_Relations_Between_Japan_and_the_Republic_of_Korea ; https://www.usip.org/node/148481
Kashmir is divided | "none of the claims is resolved" | + India: accession Oct 1947; Pakistan: UNSC Res. 47 plebiscite never held; India: Simla made it bilateral **(adjusted: "October 1947" instead of the exact Oct 26 date, which some historians dispute)** | https://en.wikipedia.org/wiki/United_Nations_Security_Council_Resolution_47
The PRC takes control of Tibet | "sign under pressure" | Chamdo defeat; China: "peaceful liberation", freely made; Dalai Lama (1959): under duress; exile government: invasion | https://en.wikipedia.org/wiki/Seventeen_Point_Agreement
Six-Day War | "West Bank, East Jerusalem and Golan remain disputed" | + 280,000–325,000 displaced; UN treats WB, East Jerusalem, Gaza as occupied; ICJ advisory opinion (July 19, 2024): presence unlawful; Israel rejects, calls WB disputed; 2005 Gaza withdrawal, forces back in from October 2023 | https://www.un.org/unispal/document/israels-continued-occupation-unlawful-19jul24 ; https://www.diakonia.se/ihl/news/summary-icj-advisory-opinion-19-july-2024/ ; https://en.wikipedia.org/wiki/Naksa
Russia seizes and annexes Crimea | "declares annexation on March 18" | + cites March 16 referendum under Russian military control; Res. 68/262 (100 in favor): "no validity" | https://www.loc.gov/item/global-legal-monitor/2014-04-02/united-nations-resolution-declares-crimea-referendum-invalid/
Macau returns to China | "Portuguese since the 1550s" | settled c. 1557 with Chinese permission and rent; colony under 1887 treaty China later called unequal | https://en.wikipedia.org/wiki/Portuguese_Macau

Kosovo's recognition count (report row 61b, counted under the Kosovo VAGUE row above): "About half of UN members recognize it" → "Kosovo says about 120 countries recognize it; Serbia ... says withdrawals bring that number below 90" (Serbia's count is 84). Source: https://en.wikipedia.org/wiki/International_recognition_of_Kosovo ; https://www.kosovo-online.com/en/news/politics/kenya-84th-country-recognize-kosovo-26-3-2025

## STYLE

event title | before (short) | after (short) | source
---|---|---|---
Lausanne event (title) | "Turkey's borders are recognized" | "Türkiye's borders are recognized" | site convention (src/content/disputes.ts uses "Türkiye" for the Republic, including in 1974)
Cyprus event (title) | "Turkey's invasion divides Cyprus" | "Türkiye's invasion divides Cyprus" | same
Rome invades Britain | "begun c. 122" | "begun c. 122 CE" | src/lib/eras.ts formatYear (years below 1000 shown with "CE")
Trajan pushes Rome to its greatest extent | "(101–106) ... (106) ... by 117" | "(101–106 CE) ... (106 CE) ... by 117 CE" | same
Arab conquests | "Yarmouk (636) ... 642 ... 651" | "636 CE ... 642 CE ... 651 CE" | same
Umayyad conquest of Iberia | "in 711" | "in 711 CE" | same
Treaty of Verdun | "dies in 840" | "dies in 840 CE" | same

Naming choice: "Türkiye" is used for the Republic (founded 1923) in titles and prose, matching disputes.ts. "Turkish nationalists", "Turkish Cypriots" and "Turkish Republic of Northern Cyprus" are kept, since those are names of peoples and an entity. The map-data `polities` lists (which include both "Turkey" and "Türkiye") were not touched, because they must match names in the map data. "Ottoman" is kept for pre-1922 events.

## Skipped

None. Every finding was confirmed in substance. The 10 items marked **(adjusted)** above were applied with the number, range or attribution changed to what the source check supported, and nothing the check could not confirm was added. Specifically:
- Constantinople: Kritovoulos attribution for 4,000 dead not confirmed; attributed to modern historians.
- Baltics: "about 50,000" not supported; ~40,000 used.
- Samaria: deportation destinations come from the Bible, not Sargon's inscriptions; dropped.
- Carthage: "population over 250,000" not checked against Britannica (page not reachable); dropped.
- Bengal, Yekatit 12, Cyprus, Karabakh, Kosovo, Kashmir: ranges or dates widened or adjusted as shown.
