// One-line context for the historical states in the Daily Challenge, shown under the question
// so players know what each one was. Keyed by the name in the map data (see HISTORY in scripts/build-daily.mjs).
// what  = what it was, with rough dates
// today = the modern countries its land is in (for the snapshot used in the game)

export type DailyContext = { what: string; today: string };

export const dailyContext: Record<string, DailyContext> = {
  "Roman Empire": {
    what: "The empire ruled from Rome, which circled the whole Mediterranean Sea.",
    today: "Italy, Spain, France, Greece, Türkiye, Egypt, England and more",
  },
  "Western Roman Empire": {
    what: "The western half of the Roman Empire after the split of 395 CE. It fell in 476.",
    today: "Italy, France, Spain, Portugal, England and coastal North Africa",
  },
  "Byzantine Empire": {
    what: "The eastern Roman Empire, ruled from Constantinople (Istanbul) until the Ottomans took it in 1453.",
    today: "Greece, Türkiye and parts of the Balkans",
  },
  "Empire of Alexander": {
    what: "Conquered by Alexander the Great of Macedon in about 11 years. It broke apart soon after his death in 323 BCE.",
    today: "Greece, Türkiye, Egypt, Iraq, Iran, Afghanistan and Pakistan",
  },
  "Achaemenid Empire": {
    what: "The first Persian Empire, founded by Cyrus the Great around 550 BCE and conquered by Alexander.",
    today: "Iran, Iraq, Türkiye, Egypt, Afghanistan and Central Asia",
  },
  "Seleucid Kingdom": {
    what: "A Greek-ruled kingdom founded by Seleucus, one of Alexander's generals, from the eastern part of his empire.",
    today: "Syria, Iraq, Iran and parts of Türkiye and Central Asia",
  },
  "Parthian Empire": {
    what: "An Iranian empire (247 BCE–224 CE) that was Rome's great rival in the east.",
    today: "Iran and Iraq, plus parts of Turkmenistan and Afghanistan",
  },
  "Sasanian Empire": {
    what: "The last Persian empire before Islam (224–651), rival of Rome and later Byzantium.",
    today: "Iran and Iraq, plus parts of the Caucasus and Central Asia",
  },
  "Carthaginian Empire": {
    what: "A sea-trading power based at Carthage. It fought Rome in the Punic Wars and was destroyed in 146 BCE.",
    today: "Tunisia, plus coastal Libya and Algeria, southern Spain, Sardinia and western Sicily",
  },
  "Mauryan Empire": {
    what: "The first empire to unite most of South Asia (c. 322–185 BCE). Its emperor Ashoka spread Buddhism.",
    today: "India, Pakistan, Bangladesh and Nepal",
  },
  "Gupta Empire": {
    what: "A northern Indian empire (c. 320–550) remembered as a golden age of science, mathematics and art.",
    today: "Northern India, Bangladesh and Nepal",
  },
  "Mughal Empire": {
    what: "A Muslim dynasty that ruled most of South Asia (1526–1857) and built the Taj Mahal.",
    today: "India, Pakistan, Bangladesh and eastern Afghanistan",
  },
  "Maratha Confederacy": {
    what: "A Hindu power from western India that took over much of the subcontinent as the Mughals declined. Britain defeated it in 1818.",
    today: "Central and western India",
  },
  "British Raj": {
    what: "British rule over South Asia, from 1858 to independence and partition in 1947.",
    today: "India, Pakistan, Bangladesh and Myanmar",
  },
  Han: {
    what: "A Chinese dynasty (206 BCE–220 CE), so central to Chinese history that China's largest ethnic group is still called Han.",
    today: "China, plus northern Vietnam and North Korea",
  },
  "Sui Empire": {
    what: "A short-lived dynasty (581–618) that reunited China after centuries of division and built the Grand Canal.",
    today: "China",
  },
  "Tang Empire": {
    what: "A Chinese dynasty (618–907), a golden age of poetry and Silk Road trade.",
    today: "China, plus parts of Central Asia and Mongolia",
  },
  "Song Empire": {
    what: "A Chinese dynasty (960–1279) known for printing, gunpowder and paper money. By 1200 it held only the south.",
    today: "Southern and central China",
  },
  "Great Khanate": {
    what: "The Mongol Yuan dynasty of Kublai Khan, grandson of Genghis Khan, which ruled China and Mongolia.",
    today: "China and Mongolia, plus part of Siberia",
  },
  "Ming Chinese Empire": {
    what: "A Chinese dynasty (1368–1644) that rebuilt the Great Wall and sent Zheng He's fleets as far as Africa.",
    today: "China",
  },
  "Qing Empire": {
    what: "China's last imperial dynasty (1644–1912), founded by the Manchus.",
    today: "China, Mongolia, Taiwan and part of Russia's Far East",
  },
  "Tibetan Empire": {
    what: "An empire on the Tibetan Plateau (c. 618–842) that rivalled Tang China.",
    today: "Tibet and western China, plus parts of Nepal, India and Pakistan",
  },
  "Khmer Empire": {
    what: "A Southeast Asian empire (802–1431) that built Angkor Wat.",
    today: "Cambodia, Thailand, Laos and southern Vietnam",
  },
  "Empire of Japan": {
    what: "Japan's empire before and during the Second World War. By 1938 it ruled Korea and Taiwan and controlled Manchuria.",
    today: "Japan, North and South Korea, Taiwan and northeast China",
  },
  "Umayyad Caliphate": {
    what: "The first Muslim dynasty to rule an empire (661–750), from Damascus. It reached Spain in 711.",
    today: "Syria, Iraq, Iran, Saudi Arabia, Egypt and North Africa",
  },
  "Abbasid Caliphate": {
    what: "A Muslim caliphate (750–1258) ruled from Baghdad, the centre of the Islamic Golden Age.",
    today: "Iraq, Iran, Syria, Egypt, Saudi Arabia and Central Asia",
  },
  "Fatimid Caliphate": {
    what: "A Shia Muslim caliphate (909–1171) that founded the city of Cairo.",
    today: "Egypt, plus parts of North Africa, Syria and western Arabia",
  },
  "Seljuk Empire": {
    what: "A Turkish dynasty from Central Asia whose conquests helped set off the Crusades.",
    today: "Iran, Iraq, Turkmenistan, Syria and eastern Türkiye",
  },
  "Ottoman Empire": {
    what: "A Turkish empire (c. 1299–1922) that took Constantinople in 1453 and ruled on three continents.",
    today: "Türkiye, the Balkans, the Middle East, Egypt and coastal North Africa",
  },
  "Safavid Empire": {
    what: "A Persian dynasty (1501–1736) that made Shia Islam the official faith of Iran.",
    today: "Iran and Azerbaijan, plus parts of Afghanistan and the Caucasus",
  },
  "Timurid Empire": {
    what: "The empire of the conqueror Timur (Tamerlane), ruled from Samarkand.",
    today: "Iran, Uzbekistan, Afghanistan, Turkmenistan and more",
  },
  "Khanate of the Golden Horde": {
    what: "A Mongol state founded by Batu, a grandson of Genghis Khan. It was overlord of the Russian principalities.",
    today: "Southern Russia, Ukraine and Kazakhstan",
  },
  "Kievan Rus": {
    what: "A medieval realm of East Slavic lands centred on Kyiv, the shared ancestor of Ukraine, Belarus and Russia.",
    today: "Ukraine, Belarus and western Russia",
  },
  "Russian Empire": {
    what: "The empire of the tsars (1721–1917), the third-largest empire in history.",
    today: "Russia, Ukraine, Belarus, Finland, the Baltic states, the Caucasus, Central Asia and part of Poland",
  },
  USSR: {
    what: "The Soviet Union (1922–1991), a communist state made up of 15 republics.",
    today: "Russia, Ukraine, Kazakhstan and 12 other countries",
  },
  "Carolingian Empire": {
    what: "The empire of Charlemagne, crowned emperor in 800. His grandsons split it in 843.",
    today: "France, Germany, the Low Countries, Switzerland, Austria and northern Italy",
  },
  "Holy Roman Empire": {
    what: "A loose union of German and central European states under an elected emperor (962–1806).",
    today: "Germany, Austria, Czechia, Switzerland, the Low Countries and northern Italy",
  },
  "Polish–Lithuanian Commonwealth": {
    what: "A union of Poland and Lithuania (1569–1795), one of Europe's largest states until its neighbours divided it.",
    today: "Poland, Lithuania, Belarus, Ukraine and Latvia",
  },
  "Kalmar Union": {
    what: "Denmark, Norway and Sweden under one monarch (1397–1523).",
    today: "Denmark, Norway, Sweden, Finland, Iceland and Greenland",
  },
  "Austro-Hungarian Empire": {
    what: "The Habsburg dual monarchy (1867–1918). It broke up at the end of the First World War.",
    today: "Austria, Hungary, Czechia, Slovakia, Slovenia, Croatia, Bosnia and parts of Poland, Ukraine, Romania, Serbia and Italy",
  },
  "German Empire": {
    what: "Germany from unification in 1871 to the end of the First World War in 1918.",
    today: "Germany, plus parts of Poland, France (Alsace-Lorraine), Russia (Kaliningrad), Lithuania and Denmark",
  },
  Axum: {
    what: "A trading kingdom in the Horn of Africa and one of the first states to adopt Christianity, in the 4th century.",
    today: "Northern Ethiopia and Eritrea, and at times Yemen",
  },
  Mali: {
    what: "A West African empire (c. 1235–1600s) founded by Sundiata Keita. Its ruler Mansa Musa was famous for his gold.",
    today: "Mali, Senegal, Guinea, Gambia and southern Mauritania",
  },
  Songhai: {
    what: "A West African empire (c. 1464–1591) centred on Gao and Timbuktu. It fell to an invasion from Morocco.",
    today: "Mali and Niger, plus parts of Nigeria, Burkina Faso and Mauritania",
  },
  "Inca Empire": {
    what: "The largest empire in the Americas before Columbus, ruled from Cusco. Spain conquered it in the 1530s.",
    today: "Peru, Ecuador, Bolivia, northern Chile, northwest Argentina and southern Colombia",
  },
  "Aztec Empire": {
    what: "An alliance ruled from Tenochtitlan, today's Mexico City. Spain conquered it in 1521.",
    today: "Central and southern Mexico",
  },
  "Viceroyalty of New Spain": {
    what: "Spain's colony in North America, ruled from Mexico City until Mexico won independence in 1821.",
    today: "Mexico and the US Southwest (California, Texas, Arizona, New Mexico and more)",
  },
  "Viceroyalty of Peru": {
    what: "Spain's colony in South America, ruled from Lima. In 1715 it covered most of Spanish South America.",
    today: "Peru, Bolivia, Chile, Argentina, Colombia, Ecuador and more",
  },
  "Empire of Brazil": {
    what: "Brazil as an independent monarchy (1822–1889), ruled by its own emperors.",
    today: "Brazil",
  },
  "British North America": {
    what: "Britain's colonies and territories north of the United States after American independence.",
    today: "Canada",
  },
};
