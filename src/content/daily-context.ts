// One-line context for the historical states in the Daily Challenge, shown under the question
// so players know what each one was. Keyed by the name in the map data (see HISTORY in scripts/build-daily.mjs).
// what  = what it was, with rough dates
// today = the modern countries its land is in (for the snapshot used in the game)

export type DailyContext = { what: string; today: string };

export const dailyContext: Record<string, DailyContext> = {
  "Roman Empire": {
    what: "An empire ruled from Rome that came to circle the whole Mediterranean Sea.",
    today: "Italy, Spain, France, Greece, Türkiye, Egypt, England and more",
  },
  "Western Roman Empire": {
    what: "The western half of the Roman Empire after the empire split in 395 CE. It fell in 476.",
    today: "Italy, France, Spain, Portugal, England and coastal North Africa",
  },
  "Byzantine Empire": {
    what: "The eastern Roman Empire, ruled from Constantinople (Istanbul) until the Ottomans took it in 1453.",
    today: "Greece, Türkiye and parts of the Balkans",
  },
  "Empire of Alexander": {
    what: "Won by Alexander the Great of Macedon in about 11 years, it broke apart soon after his death in 323 BCE.",
    today: "Greece, Türkiye, Egypt, Iraq, Iran, Afghanistan and Pakistan",
  },
  "Achaemenid Empire": {
    what: "The first Persian Empire, founded by Cyrus the Great around 550 BCE and conquered by Alexander.",
    today: "Iran, Iraq, Türkiye, Egypt, Afghanistan and Central Asia",
  },
  "Seleucid Kingdom": {
    what: "A Greek-ruled kingdom carved from the eastern part of Alexander's empire by Seleucus, one of his generals.",
    today: "Syria, Iraq, Iran and parts of Türkiye and Central Asia",
  },
  "Parthian Empire": {
    what: "An Iranian empire (247 BCE–224 CE) that was Rome's great rival in the east.",
    today: "Iran and Iraq, plus parts of Turkmenistan and Afghanistan",
  },
  "Sasanian Empire": {
    what: "The last Persian empire before Islam (224–651), rival first of Rome and later of Byzantium.",
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
    what: "A Chinese dynasty (618–907) whose reign was a golden age of poetry and Silk Road trade.",
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
    what: "An empire on the Tibetan Plateau (c. 618–842) that rivaled Tang China.",
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
    what: "The first Muslim dynasty to rule an empire, from Damascus (661–750). Its armies reached Spain in 711.",
    today: "Syria, Iraq, Iran, Saudi Arabia, Egypt and North Africa",
  },
  "Abbasid Caliphate": {
    what: "A Muslim caliphate (750–1258) ruled from Baghdad, the center of the Islamic Golden Age.",
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
    what: "A Mongol state founded by Batu, a grandson of Genghis Khan. It ruled the Russian principalities as their overlord.",
    today: "Southern Russia, Ukraine and Kazakhstan",
  },
  "Kievan Rus": {
    what: "A medieval realm of East Slavic lands centered on Kyiv, the shared ancestor of Ukraine, Belarus and Russia.",
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
    what: "A union of Poland and Lithuania (1569–1795), one of Europe's largest states until its neighbors divided it.",
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
    what: "A West African empire (c. 1464–1591) centered on Gao and Timbuktu. It fell to an invasion from Morocco.",
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
  "Assyria": {
    what: "An ancient kingdom on the upper Tigris River around the city of Ashur. Around 1500 BCE it was still small; its famous empire came centuries later.",
    today: "Northern Iraq, with edges in Syria and Türkiye",
  },
  "Babylonia": {
    what: "The kingdom of the city of Babylon in southern Mesopotamia. From about 1595 BCE the Kassites ruled it for over four centuries.",
    today: "Southern and central Iraq",
  },
  "Hittites": {
    what: "A kingdom of central Anatolia ruled from Hattusa, rising to become one of the great powers of the Bronze Age.",
    today: "Central Türkiye",
  },
  "Ptolemaic Kingdom": {
    what: "Egypt ruled from Alexandria by the Greek-speaking Ptolemy dynasty after Alexander's death. It ended with Cleopatra in 30 BCE.",
    today: "Mainly Egypt",
  },
  "Kushan Empire": {
    what: "An empire founded by the Yuezhi people from Central Asia. Around 100–200 CE it linked Silk Road trade with India.",
    today: "Afghanistan, Pakistan, northern India, Uzbekistan and Tajikistan",
  },
  "Xiongnu": {
    what: "A confederation of nomadic horse peoples on the steppe north of China, whose raids pushed China to build early walls.",
    today: "Mongolia, plus parts of northern China and southern Siberia (Russia)",
  },
  "Hunnic Empire": {
    what: "Nomadic Huns from the steppe who swept into Europe in the late 300s. Under Attila (434–453) they threatened both halves of the Roman Empire.",
    today: "Ukraine, southern Russia and neighbouring lands",
  },
  "Khazars": {
    what: "A Turkic khaganate between the Black and Caspian Seas, whose rulers adopted Judaism. It fell in the 960s.",
    today: "Southern Russia, Ukraine and western Kazakhstan",
  },
  "Ilkhanate": {
    what: "The Mongol khanate founded by Hülegü, a grandson of Genghis Khan, who sacked Baghdad in 1258.",
    today: "Iran, Iraq, Azerbaijan, eastern Türkiye, Turkmenistan and Afghanistan",
  },
  "Chagatai Khanate": {
    what: "The Mongol khanate of Genghis Khan's son Chagatai. By 1492 only its eastern branch, Moghulistan, survived.",
    today: "Western China (Xinjiang), Kyrgyzstan and southeastern Kazakhstan",
  },
  "Sultanate of Delhi": {
    what: "A Muslim sultanate ruled from Delhi from 1206 to 1526 by five dynasties. Timur sacked Delhi in 1398.",
    today: "India, Pakistan and Bangladesh",
  },
  "Vijayanagara": {
    what: "A Hindu empire of southern India (1336–1646). Its capital at Hampi was one of the world's largest cities around 1500.",
    today: "Southern India (Karnataka, Andhra Pradesh and Tamil Nadu)",
  },
  "Chola Empire": {
    what: "A Tamil dynasty of southern India. At its peak, around 1000–1050, its navy raided as far as Southeast Asia.",
    today: "Southern India (mainly Tamil Nadu)",
  },
  "Srivijaya Empire": {
    what: "A Buddhist trading empire based on Sumatra that controlled the Strait of Malacca, the sea route between India and China.",
    today: "Indonesia (Sumatra and western Java), Malaysia and southern Thailand",
  },
  "Ayyubid Sultanate": {
    what: "The dynasty founded by Saladin, who retook Jerusalem from the Crusaders in 1187.",
    today: "Egypt, Syria, Israel, Palestine, Jordan, Lebanon, Yemen and western Saudi Arabia",
  },
  "Mamluke Sultanate": {
    what: "Ruled from Cairo by former slave soldiers (mamluks) who took power in 1250 and stopped the Mongols in 1260. The Ottomans conquered it in 1517.",
    today: "Egypt, Syria, Israel, Palestine, Lebanon, Jordan, western Saudi Arabia, eastern Libya and southeastern Türkiye",
  },
  "Almohad Caliphate": {
    what: "A Berber Muslim empire from Morocco that ruled North Africa and southern Spain in the 1100s and 1200s.",
    today: "Morocco, Algeria, Tunisia, western Libya, Spain and Portugal",
  },
  "Ghaznavid Emirate": {
    what: "A Turkic empire ruled from Ghazni in Afghanistan. Mahmud of Ghazni (998–1030) raided deep into India.",
    today: "Afghanistan, eastern Iran, Pakistan and Turkmenistan",
  },
  "Khwarazmian dynasty": {
    what: "A Turkic-ruled, Persian-cultured empire of Central Asia and Iran, destroyed by Genghis Khan's invasion in 1219–1221.",
    today: "Iran, Turkmenistan and Uzbekistan",
  },
  "Empire of Ghana": {
    what: "Wagadu, West Africa's first great trading empire, said to date from around 300 CE. Its Saharan gold trade peaked about 800–1050. Not modern Ghana.",
    today: "Southern Mauritania and western Mali",
  },
  "Kanem-Bornu": {
    what: "An empire around Lake Chad that grew rich on trade across the Sahara and lasted about a thousand years.",
    today: "Chad, northeast Nigeria, Niger and northern Cameroon",
  },
  "Toltec Empire": {
    what: "A people of central Mexico centred on the city of Tula, later remembered by the Aztecs as great ancestors.",
    today: "Central Mexico",
  },
  "Tsardom of Muscovy": {
    what: "Russia under its tsars, already stretching across Siberia to the Pacific. Peter the Great renamed it the Russian Empire in 1721.",
    today: "Russia, plus parts of Ukraine and Kazakhstan",
  },
  "Frankish Kingdom": {
    what: "The kingdom of the Franks, a Germanic people whose king Clovis (died 511) united most of Gaul. It later grew into Charlemagne's empire.",
    today: "France, Belgium, the Netherlands, Switzerland and western Germany",
  },
  "Austrian Empire": {
    what: "The Habsburg empire ruled from Vienna (1804–1867), which became Austria-Hungary in 1867.",
    today: "Austria, Hungary, Czechia, Slovakia, Slovenia, Croatia and parts of Italy, Poland, Romania and Ukraine",
  },
  "Liao": {
    what: "The empire of the Khitan people (916–1125) across Mongolia, Manchuria and northern China. \"Cathay\" comes from their name.",
    today: "Northern China and Mongolia",
  },
  "Republic of China": {
    what: "China after its last emperor stepped down in 1912, before the civil war that ended in 1949.",
    today: "Most of today's China",
  },
  "Viceroyalty of Brazil": {
    what: "Portugal's colony in South America. It became independent as the Empire of Brazil in 1822.",
    today: "Brazil",
  },
  "Rupert's Land": {
    what: "The huge area draining into Hudson Bay, owned by the Hudson's Bay Company fur traders from 1670 until it passed to Canada in 1870.",
    today: "Canada (much of Manitoba, Saskatchewan, Alberta, Ontario, Quebec and Nunavut), plus small parts of Minnesota and North Dakota",
  },
  "Northern Yuan": {
    what: "The Mongol rulers who went back to the steppe after the Ming drove them out of China in 1368.",
    today: "Mongolia, plus parts of northern China and Russia",
  },
  "French West Africa": {
    what: "A federation of French colonies (1895–1958), ruled from Dakar from 1902.",
    today: "Senegal, Mauritania, Mali, Guinea, Côte d'Ivoire, Burkina Faso, Niger and Benin",
  },
  "Kara Khitai Khaganate": {
    what: "Founded by Khitan nobles who fled west when the Liao empire fell in 1125. It ruled Central Asia until the Mongols took it in 1218.",
    today: "Kazakhstan, Kyrgyzstan, Uzbekistan, Tajikistan and western China (Xinjiang)",
  },
  "Göktürks": {
    what: "A Turkic khaganate of the Mongolian steppe. Its Orkhon inscriptions are among the oldest known writing in a Turkic language.",
    today: "Mongolia, plus parts of Kazakhstan, Russia and northern China",
  },
  "Jin": {
    what: "The Jin dynasty (266–420), which briefly reunited China after the Three Kingdoms period.",
    today: "China, plus northern Vietnam",
  },
  "Viceroyalty of New Granada": {
    what: "Spain's colony in northern South America, ruled from Bogotá.",
    today: "Colombia, Ecuador and Panama",
  },
  "Grand Duchy of Moscow": {
    what: "The Russian state ruled from Moscow. Ivan III threw off Mongol rule in 1480 and gathered the other Russian lands.",
    today: "Russia (the European part)",
  },
  "Anglo-Egyptian Sudan": {
    what: "Sudan under joint British and Egyptian rule (1899–1956), in practice run by Britain.",
    today: "Sudan and South Sudan",
  },
  "Denmark-Norway": {
    what: "Denmark and Norway under one king (1524–1814), together with Iceland, the Faroe Islands and Greenland.",
    today: "Denmark, Norway, Iceland, Greenland and the Faroe Islands",
  },
  "French Equatorial Africa": {
    what: "A federation of French colonies in Central Africa, ruled from Brazzaville (1910–1958).",
    today: "Gabon, the Republic of the Congo, the Central African Republic and Chad",
  },
  "Viceroyalty of the Río de la Plata": {
    what: "Spain's colony around the River Plate, ruled from Buenos Aires from 1776.",
    today: "Argentina, Uruguay, Paraguay and Bolivia",
  },
  "Belgian Congo": {
    what: "Belgium's colony in Central Africa (1908–1960), taken over from King Leopold II's brutal private Congo Free State.",
    today: "Democratic Republic of the Congo",
  },
  "Almoravid dynasty": {
    what: "A Berber Muslim empire from the Sahara that founded Marrakesh and ruled Morocco and southern Spain.",
    today: "Morocco, Western Sahara, Mauritania, western Algeria, Spain and Portugal",
  },
  "Ghurid Sultanate": {
    what: "A dynasty from the mountains of central Afghanistan that conquered northern India around 1192, opening the way for the Delhi Sultanate.",
    today: "Afghanistan, Pakistan, northern India, eastern Iran and Turkmenistan",
  },
  "Persia": {
    what: "Iran under the Qajar dynasty (1789–1925), which lost its lands in the Caucasus to Russia in wars between 1804 and 1828.",
    today: "Mainly Iran, plus Armenia and Azerbaijan's Nakhchivan",
  },
  "Union of South Africa": {
    what: "A British dominion formed in 1910 from four colonies, which also ran neighbouring South West Africa from 1915. It became a republic in 1961.",
    today: "South Africa and Namibia",
  },
  "Karkhanids": {
    what: "A Turkic Muslim khanate of Central Asia whose cities included Kashgar and Samarkand.",
    today: "Kyrgyzstan, Uzbekistan, Tajikistan, Kazakhstan and western China (Xinjiang)",
  },
  "Nogai Horde": {
    what: "A nomadic horde on the steppe north of the Caspian Sea that split off from the Golden Horde.",
    today: "Southern Russia and western Kazakhstan",
  },
  "Saffarids": {
    what: "A Persian dynasty from Sistan, founded by Ya'qub, a coppersmith who carved out an empire in the 860s and 870s.",
    today: "Iran, Afghanistan and Pakistan",
  },
  "Shunga Empire": {
    what: "The north Indian dynasty that took over from the Mauryas around 185 BCE.",
    today: "Northern and central India",
  },
  "Bactria": {
    what: "A Greek kingdom in Central Asia's Oxus (Amu Darya) valley, founded around 250 BCE when its Greek governor broke away from the Seleucid Empire.",
    today: "Afghanistan, Uzbekistan, Tajikistan and Turkmenistan",
  },
  "Dutch East Indies": {
    what: "The lands and trading posts of the Dutch East India Company in the islands of Southeast Asia, run from Batavia (Jakarta).",
    today: "Indonesia",
  },
  "Samanid Empire": {
    what: "A Persian dynasty ruling from Bukhara, known for a revival of the Persian language and learning.",
    today: "Uzbekistan, Tajikistan, Turkmenistan, Afghanistan and eastern Iran",
  },
  "Far Eastern Republic": {
    what: "A short-lived buffer state in Russia's Far East (1920–1922), set up by the Bolsheviks and then joined to Soviet Russia.",
    today: "Russia (the Far East, east of Lake Baikal)",
  },
  "Toba Wei": {
    what: "The Northern Wei dynasty (386–535) of the Tuoba, a steppe people who ruled northern China and took up Chinese ways.",
    today: "Northern China",
  },
  "Magadha": {
    what: "A kingdom of the Ganges plain under the Nanda dynasty, soon to be taken over by Chandragupta Maurya.",
    today: "Northern India and Bangladesh",
  },
  "Roman Republic": {
    what: "Rome before the emperors, run by elected consuls and the Senate. By 100 BCE it ruled much of the Mediterranean coast.",
    today: "Italy, Spain, Portugal, southern France, Greece, Albania, North Macedonia, western Türkiye and Tunisia",
  },
  "Shang": {
    what: "China's earliest dynasty known from writing (inscribed oracle bones), in the Yellow River valley.",
    today: "Northern China along the Yellow River",
  },
  "Zhou": {
    what: "The dynasty that overthrew the Shang around 1046 BCE and ruled longer than any other in China's history.",
    today: "Northern China along the Yellow River",
  },
  "Rhodesia": {
    what: "Land run by Cecil Rhodes's British South Africa Company and named after him.",
    today: "Zimbabwe and Zambia",
  },
  "Abyssinia": {
    what: "The Ethiopian Empire. It beat Italy at Adwa in 1896 and, with Liberia, was one of only two African states never colonised in this era.",
    today: "Ethiopia",
  },
  "Sokoto Caliphate": {
    what: "A Fulani Islamic state founded by Usman dan Fodio in 1804 and conquered by the British in 1903.",
    today: "Northern Nigeria, plus parts of Niger, Burkina Faso and Cameroon",
  },
  "Khiva Khanate": {
    what: "A Central Asian khanate around the oasis city of Khiva on the lower Amu Darya river.",
    today: "Uzbekistan and Turkmenistan, plus edges of Kazakhstan",
  },
  "Ayutthaya": {
    what: "A Thai kingdom (1351–1767) whose island capital, Ayutthaya, was a major trading city.",
    today: "Thailand and parts of its neighbours",
  },
  "Rattanakosin Kingdom": {
    what: "Siam under the Chakri dynasty, which moved the capital to Bangkok in 1782 and still reigns today.",
    today: "Thailand, Laos and parts of Cambodia, Myanmar and Malaysia",
  },
  "German South-West Africa": {
    what: "Germany's colony (1884–1915), where German troops killed most of the Herero people and about half of the Nama in 1904–1908.",
    today: "Namibia",
  },
  "Kamerun": {
    what: "Germany's colony in Central Africa (1884–1916), split between Britain and France after World War I.",
    today: "Cameroon, plus parts of Nigeria, Chad, the Central African Republic, Gabon and the Republic of the Congo",
  },
  "French Indochina": {
    what: "France's federation of colonies in Southeast Asia (1887–1954).",
    today: "Vietnam, Laos and Cambodia",
  },
  "Sweden–Norway": {
    what: "Sweden and Norway under one king (1814–1905), each with its own government.",
    today: "Sweden and Norway",
  },
  "Pagan": {
    what: "The first kingdom to unite Myanmar (849–1297), famous for the thousands of temples at its capital, Bagan.",
    today: "Myanmar",
  },
  "Caliphate of Córdoba": {
    what: "Muslim Spain (al-Andalus) under the Umayyad caliphs of Córdoba, then one of Europe's largest and richest cities.",
    today: "Spain, Portugal, northern Morocco and western Algeria",
  },
};
