// One-line context for the historical states in the Daily Challenge, shown under the question
// so players know what each one was. Keyed by the name in the map data (see HISTORY in scripts/build-daily.mjs).
// what  = what it was, with rough dates
// today = the modern countries its land is in (for the snapshot used in the game)

export type DailyContext = { what: string; today: string };

export const dailyContext: Record<string, DailyContext> = {
  "Roman Empire": {
    what: "An empire ruled from Rome that came to circle the whole Mediterranean Sea.",
    today: "Italy, Spain, France, Greece, Türkiye, Egypt, England and Wales, and more",
  },
  "Western Roman Empire": {
    what: "The western half of the Roman Empire after the empire split in 395 CE. It fell in 476.",
    today: "Italy, France, Spain, Portugal, England and Wales, coastal North Africa, Switzerland, Belgium, southern Germany, Austria, western Hungary, Slovenia, Croatia and Bosnia",
  },
  "Byzantine Empire": {
    what: "The eastern Roman Empire, ruled from Constantinople (Istanbul). Crusaders sacked the city in 1204 and held it until 1261, and the Ottomans conquered it in 1453.",
    today: "Greece, Türkiye and parts of the Balkans",
  },
  "Empire of Alexander": {
    what: "Won by Alexander the Great of Macedon in about 11 years, it broke apart soon after his death in 323 BCE. He razed Thebes (335 BCE) and sold tens of thousands of people from Thebes and Tyre (332 BCE) into slavery.",
    today: "Greece, Türkiye, Egypt, Syria, Lebanon, Israel and Palestine, Iraq, Iran, Afghanistan and Pakistan, plus parts of Libya, Bulgaria and Central Asia",
  },
  "Achaemenid Empire": {
    what: "The first Persian Empire, founded by Cyrus the Great around 550 BCE and conquered by Alexander.",
    today: "Iran, Iraq, Türkiye, Afghanistan, Pakistan, Syria and Central Asia, and Egypt (which was independent from 404 to 343 BCE)",
  },
  "Seleucid Kingdom": {
    what: "A Greek-ruled kingdom carved from the eastern part of Alexander's empire by Seleucus, one of his generals.",
    today: "Iran, Iraq, Syria and Afghanistan, plus parts of Türkiye, Turkmenistan, Uzbekistan and Tajikistan",
  },
  "Parthian Empire": {
    what: "An Iranian empire (247 BCE–224 CE) that was Rome's great rival in the east.",
    today: "Iran and Iraq, plus parts of Turkmenistan and Afghanistan",
  },
  "Sasanian Empire": {
    what: "The last Persian empire before Islam (224–651), rival first of Rome and later of Byzantium.",
    today: "Iran and Iraq, plus parts of Afghanistan, Pakistan, the Caucasus and Turkmenistan",
  },
  "Carthaginian Empire": {
    what: "A sea-trading power based at Carthage. It fought Rome in the Punic Wars, and in 146 BCE Rome razed the city and sold about 50,000 survivors into slavery.",
    today: "Tunisia, plus coastal Libya, Algeria and Morocco, southern Spain, Sardinia, western Sicily, Malta and Ibiza",
  },
  "Mauryan Empire": {
    what: "The first empire to unite most of South Asia (c. 322–185 BCE). By his own account, its emperor Ashoka conquered Kalinga around 261 BCE, killing 100,000 people and deporting 150,000, then turned to Buddhism and spread it.",
    today: "India, Pakistan, Bangladesh and Nepal",
  },
  "Gupta Empire": {
    what: "A northern Indian empire (c. 320–550) remembered as a golden age of science, mathematics and art.",
    today: "Northern India, Bangladesh and Nepal",
  },
  "Mughal Empire": {
    what: "A Muslim dynasty founded in 1526 that ruled most of South Asia by about 1700 and built the Taj Mahal. By the 1800s its emperor held little more than Delhi, and Britain exiled the last one after the revolt of 1857.",
    today: "India, Pakistan, Bangladesh and eastern Afghanistan",
  },
  "Maratha Confederacy": {
    what: "A Hindu power from western India that took over much of the subcontinent as the Mughals declined. Britain defeated it in 1818.",
    today: "Central and western India",
  },
  "British Raj": {
    what: "British rule over South Asia (1858–1947). Famines under its rule killed millions, including 0.8–3.8 million people in Bengal in 1943 (estimates vary), and partition in 1947 drove 12–20 million from their homes and killed between 200,000 and 2 million.",
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
    today: "China, plus northern Vietnam",
  },
  "Song Empire": {
    what: "A Chinese dynasty (960–1279) known for movable-type printing, the first written gunpowder formula and the first government-issued paper money. By 1200 it held only the south.",
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
    what: "China's last imperial dynasty (1644–1912), founded by the Manchus. Its conquest of the Dzungar Mongols in 1755–58 killed an estimated 70–80% of them, and the Taiping civil war (1850–64) killed about 20–30 million people.",
    today: "China, Mongolia, Taiwan, part of Russia's Far East, and parts of eastern Kazakhstan and Kyrgyzstan",
  },
  "Tibetan Empire": {
    what: "An empire on the Tibetan Plateau (c. 618–842) that rivaled Tang China.",
    today: "Western China (Tibet, Qinghai, Xinjiang and Gansu), plus parts of India, Nepal, Bhutan, Myanmar and Pakistan",
  },
  "Khmer Empire": {
    what: "A Southeast Asian empire (802–1431) that built Angkor Wat.",
    today: "Cambodia, Thailand, Laos and southern Vietnam",
  },
  "Empire of Japan": {
    what: "Japan's empire before and during the Second World War. By 1938 it ruled Korea and Taiwan, held Manchuria and had invaded China, where its troops massacred civilians and prisoners at Nanjing in 1937–38 (estimates run from about 100,000 to China's official 300,000). Its army forced 20,000–200,000 women (estimates vary), many of them Korean, into sexual slavery.",
    today: "Japan, North and South Korea, Taiwan, much of northern and eastern China, and Russia's southern Sakhalin and Kuril Islands",
  },
  "Umayyad Caliphate": {
    what: "The first Muslim dynasty to rule an empire, from Damascus (661–750). Its armies reached Spain in 711.",
    today: "Syria, Iraq, Iran, Saudi Arabia, Egypt, North Africa, Israel and Palestine, Jordan, Afghanistan, Turkmenistan and the Caucasus",
  },
  "Abbasid Caliphate": {
    what: "A Muslim caliphate (750–1258) ruled from Baghdad, the center of the Islamic Golden Age.",
    today: "Iraq, Iran, Syria, Egypt, Saudi Arabia, Yemen, Afghanistan, Pakistan, Central Asia and Libya",
  },
  "Fatimid Caliphate": {
    what: "A Shia Muslim caliphate (909–1171) that founded the city of Cairo.",
    today: "Egypt, plus parts of North Africa, Syria and western Arabia",
  },
  "Seljuk Empire": {
    what: "A Turkic dynasty from Central Asia whose conquests helped set off the Crusades.",
    today: "Iran, Iraq, Turkmenistan, Syria and eastern Türkiye",
  },
  "Ottoman Empire": {
    what: "A Turkish empire (c. 1299–1922) that took Constantinople in 1453 and ruled on three continents. During the First World War its government carried out the Armenian Genocide: about 1 million Armenians died in 1915–16, and most estimates for 1915–18 run to 1.3–1.5 million. Türkiye rejects the word genocide.",
    today: "Türkiye, the Balkans, the Middle East, Egypt and coastal North Africa, plus Hungary, southern Ukraine, parts of the Caucasus and the Red Sea coast of Sudan and Eritrea",
  },
  "Safavid Empire": {
    what: "A Persian dynasty (1501–1736) that made Shia Islam the official faith of Iran.",
    today: "Iran and Azerbaijan, plus parts of Afghanistan, Turkmenistan, Armenia and Georgia",
  },
  "Timurid Empire": {
    what: "The empire of the conqueror Timur (Tamerlane), ruled from Samarkand. His campaigns were notoriously brutal: his troops killed some 70,000 people at Isfahan in 1387 and piled their heads into towers, and his own chronicler says he had about 100,000 captives killed before taking Delhi in 1398.",
    today: "Iran, Uzbekistan, Afghanistan, Turkmenistan and more",
  },
  "Khanate of the Golden Horde": {
    what: "A Mongol state founded by Batu, a grandson of Genghis Khan, whose armies burned Ryazan, Vladimir and Kyiv in 1237–1240. It ruled the Russian principalities as their overlord.",
    today: "Russia, Kazakhstan and Ukraine, plus parts of Uzbekistan, Turkmenistan and Romania",
  },
  "Kievan Rus": {
    what: "A medieval realm of East Slavic lands centered on Kyiv, the shared ancestor of Ukraine, Belarus and Russia.",
    today: "Ukraine, Belarus and western Russia",
  },
  "Russian Empire": {
    what: "The empire of the tsars (1721–1917). Most peasants were serfs until 1861, and in the 1860s its armies killed or drove out most Circassians from the northwest Caucasus, which Georgia recognized as genocide in 2011.",
    today: "Russia, Ukraine, Belarus, Finland, the Baltic states, the Caucasus, Central Asia, Moldova, part of Poland and northeastern Türkiye",
  },
  USSR: {
    what: "The Soviet Union (1922–1991), a communist one-party state of 15 republics. Under Stalin, 1.5–1.7 million people died in the Gulag camps, 681,692 were shot in the Great Terror of 1937–38 by official count, and a man-made famine killed 3.5–5 million in Ukraine in 1932–33 (the Holodomor, recognized as genocide by Ukraine and over 30 other countries).",
    today: "Russia, Ukraine, Kazakhstan and 12 other countries",
  },
  "Carolingian Empire": {
    what: "The empire of Charlemagne, crowned emperor in 800. In his wars to conquer and convert the Saxons he had 4,500 prisoners killed at Verden in 782, says the Royal Frankish Annals. His grandsons split the empire in 843.",
    today: "France, Germany, the Low Countries, Switzerland, Austria, northern Italy and northeastern Spain (Catalonia)",
  },
  "Holy Roman Empire": {
    what: "A loose union of German and central European states under an elected emperor (962–1806).",
    today: "Germany, Austria, Czechia, Switzerland, the Low Countries, northern Italy, eastern France, western Poland and Slovenia",
  },
  "Polish–Lithuanian Commonwealth": {
    what: "A union of Poland and Lithuania (1569–1795), a major European power until its neighbors divided it.",
    today: "Poland, Lithuania, Belarus, Ukraine, Latvia and part of western Russia (Smolensk)",
  },
  "Kalmar Union": {
    what: "Denmark, Norway and Sweden under one monarch (1397–1523).",
    today: "Denmark, Norway, Sweden, Finland, Iceland, Greenland, the Faroe Islands and Russia's Vyborg area",
  },
  "Austro-Hungarian Empire": {
    what: "The Habsburg dual monarchy (1867–1918). It broke up at the end of the First World War.",
    today: "Austria, Hungary, Czechia, Slovakia, Slovenia, Croatia, Bosnia and parts of Poland, Ukraine, Romania, Serbia, Italy and Montenegro (the Bay of Kotor)",
  },
  "German Empire": {
    what: "Germany from unification in 1871 to the end of the First World War in 1918.",
    today: "Germany, plus parts of Poland, France (Alsace-Lorraine), Russia (Kaliningrad), Lithuania, Denmark, Belgium (Eupen-Malmedy) and Czechia (Hlučín)",
  },
  Axum: {
    what: "A trading kingdom in the Horn of Africa and one of the first states to adopt Christianity, in the 4th century.",
    today: "Northern Ethiopia and Eritrea, and at times parts of Sudan and Yemen",
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
    what: "The Andean empire of the Incas, ruled from Cusco. Francisco Pizarro seized the emperor Atahualpa in 1532 and had him executed in 1533; Spain executed the last Inca ruler, Túpac Amaru, in 1572.",
    today: "Peru, Ecuador, Bolivia, northern and central Chile, northwest Argentina and southern Colombia",
  },
  "Aztec Empire": {
    what: "An alliance ruled from Tenochtitlan, today's Mexico City. After a smallpox epidemic and a siege, Hernán Cortés's Spanish troops and tens of thousands of Indigenous allies, above all from Tlaxcala, took the city in 1521.",
    today: "Central and southern Mexico",
  },
  "Viceroyalty of New Spain": {
    what: "Spain's colony in North America, ruled from Mexico City until Mexico won independence in 1821.",
    today: "Mexico, the US Southwest (California, Texas, Arizona, New Mexico and more) and Central America from Guatemala to Costa Rica",
  },
  "Viceroyalty of Peru": {
    what: "Spain's colony in South America, ruled from Lima. In 1715 it covered most of Spanish South America. Under the mita, Indigenous villages had to send men in turns to the silver mines of Potosí, where thousands died.",
    today: "Peru, Bolivia, Chile, Argentina, Colombia, Ecuador and more",
  },
  "Empire of Brazil": {
    what: "Brazil as an independent monarchy (1822–1889), ruled by its own emperors. Slavery stayed legal until 1888, making Brazil the last country in the Americas to abolish it; the emperor was overthrown the next year.",
    today: "Brazil",
  },
  "British North America": {
    what: "Britain's colonies and territories north of the United States after American independence. Outside the settled lands along the Atlantic, the St. Lawrence and the Great Lakes, most of it was still held by First Nations and Inuit.",
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
    what: "Egypt ruled from Alexandria by the Greek-speaking Ptolemaic dynasty after Alexander's death. It ended with Cleopatra in 30 BCE.",
    today: "Mainly Egypt",
  },
  "Kushan Empire": {
    what: "An empire founded by the Yuezhi people from Central Asia. Around 100–200 CE it linked Silk Road trade with India.",
    today: "Afghanistan, Pakistan, northern India, Uzbekistan and Tajikistan, plus parts of Turkmenistan and Kyrgyzstan",
  },
  "Xiongnu": {
    what: "A confederation of nomadic horse peoples on the steppe north of China, whose raids pushed China to build early walls.",
    today: "Mongolia, plus parts of northern China and southern Siberia (Russia)",
  },
  "Hunnic Empire": {
    what: "Nomadic Huns from the steppe who swept into Europe in the late 300s. Under Attila (434–453) they threatened both halves of the Roman Empire.",
    today: "Ukraine, southern Russia and neighboring lands",
  },
  "Khazars": {
    what: "A Turkic khaganate between the Black and Caspian Seas whose rulers, according to medieval Arabic and Hebrew sources, adopted Judaism (a few historians doubt this). It fell in the 960s.",
    today: "Southern Russia, Ukraine and western Kazakhstan",
  },
  "Ilkhanate": {
    what: "The Mongol khanate founded by Genghis Khan's grandson Hülegü, who sacked Baghdad in 1258 and ended the Abbasid caliphate. Hülegü himself put the dead at about 200,000; later Muslim chroniclers claimed 800,000 or more.",
    today: "Iran, Iraq, Azerbaijan, eastern Türkiye, Turkmenistan and Afghanistan",
  },
  "Chagatai Khanate": {
    what: "The Mongol khanate of Genghis Khan's son Chagatai. By 1492 only its eastern branch, Moghulistan, survived.",
    today: "Western China (Xinjiang), Kyrgyzstan and southeastern Kazakhstan",
  },
  "Sultanate of Delhi": {
    what: "A Muslim sultanate ruled from Delhi from 1206 to 1526 by five dynasties. Bengal broke away by the 1350s, Jaunpur, Malwa and Gujarat between 1394 and 1407, and Timur sacked Delhi in 1398.",
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
    what: "A sultanate ruled from Cairo by former slave soldiers (mamluks), who took power in 1250 and stopped the Mongols in 1260. The Ottomans conquered it in 1517.",
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
    what: "An empire around Lake Chad that lasted about a thousand years and grew rich on trade across the Sahara, much of it in people captured in raids on its neighbors and sold north as slaves, often in exchange for horses.",
    today: "Chad, northeast Nigeria, Niger and northern Cameroon",
  },
  "Toltec Empire": {
    what: "A people of central Mexico centered on the city of Tula, later remembered by the Aztecs as great ancestors.",
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
    what: "China as a republic, after its last emperor stepped down in 1912. Its government lost the civil war in 1949 and moved to Taiwan, which it still governs and which the People's Republic of China claims as its territory.",
    today: "Most of today's China (in 1914 Tibet was self-ruled in practice)",
  },
  "Viceroyalty of Brazil": {
    what: "Portugal's colony in South America, built on the labor of about 4–5 million enslaved Africans, more than any other country received. It became independent as the Empire of Brazil in 1822.",
    today: "Brazil",
  },
  "Rupert's Land": {
    what: "The land draining into Hudson Bay, granted by the English king in 1670 to the Hudson's Bay Company, a fur-trading firm, without the consent of the First Nations and Inuit who lived there. It passed to Canada in 1870.",
    today: "Canada (much of Manitoba, Saskatchewan, Alberta, Ontario, Quebec and Nunavut, and part of the Northwest Territories), plus small parts of Minnesota, North Dakota, South Dakota and Montana",
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
    today: "Colombia, Ecuador and Panama, plus Venezuela (run as a separate captaincy general from 1777)",
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
    what: "Belgium's colony in Central Africa (1908–1960), taken over from King Leopold II's private Congo Free State. There, forced rubber collection, hostage-taking, mutilation, famine and disease killed between about 1 million and 10 million people (the higher figure is Adam Hochschild's).",
    today: "DR Congo",
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
    what: "A British dominion formed in 1910 from four colonies, which also ran neighboring South West Africa from 1915. Its Natives Land Act of 1913 restricted Black South Africans, most of the population, to about 7% of the land, and from 1948 its government enforced apartheid. It became a republic in 1961.",
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
    what: "A Greek kingdom in Central Asia's Oxus (Amu Darya) valley, founded around 250 BCE when its governor, Diodotus, broke away from the Seleucid Empire.",
    today: "Afghanistan, Uzbekistan, Tajikistan and Turkmenistan",
  },
  "Dutch East Indies": {
    what: "The lands and trading posts of the Dutch East India Company in the islands of Southeast Asia, run from Batavia (Jakarta). To control nutmeg, its forces under Jan Pieterszoon Coen killed, enslaved or drove out almost all of the Banda Islands' roughly 15,000 people in 1621.",
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
    what: "Land run by Cecil Rhodes's British South Africa Company and named after him. In the south (today's Zimbabwe) the company crushed the Ndebele and Shona in wars in 1893–94 and 1896–97 and opened their land to white settlers.",
    today: "Zimbabwe and Zambia",
  },
  "Abyssinia": {
    what: "The Ethiopian Empire. It beat Italy at Adwa in 1896 and, with Liberia, was one of only two African states never colonized in this era. Italy occupied it from 1936 to 1941, and slavery was not abolished until 1942.",
    today: "Ethiopia",
  },
  "Sokoto Caliphate": {
    what: "A Fulani Islamic state founded by Usman dan Fodio in 1804 and conquered by the British in 1903. It was one of the largest slave societies of the 1800s, with at least 1 million enslaved people by 1900 (historian Paul Lovejoy's estimate).",
    today: "Northern Nigeria, plus parts of Niger, Burkina Faso and Cameroon",
  },
  "Khiva Khanate": {
    what: "A Central Asian khanate around the oasis city of Khiva on the lower Amu Darya.",
    today: "Uzbekistan and Turkmenistan, plus edges of Kazakhstan",
  },
  "Ayutthaya": {
    what: "A Thai kingdom (1351–1767) whose island capital, Ayutthaya, was a major trading city.",
    today: "Thailand, plus parts of Laos, Malaysia, Cambodia and Myanmar",
  },
  "Rattanakosin Kingdom": {
    what: "Siam under the Chakri dynasty, which moved the capital to Bangkok in 1782 and still reigns today.",
    today: "Thailand, Laos and parts of Cambodia, Myanmar and Malaysia",
  },
  "German South-West Africa": {
    what: "Germany's colony (1884–1915), where German troops killed most of the Herero people and about half of the Nama in 1904–1908. Germany officially recognized this as genocide in 2021.",
    today: "Namibia",
  },
  "Kamerun": {
    what: "Germany's colony in Central Africa (1884–1916), split between Britain and France after the First World War.",
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
    what: "Muslim Spain (al-Andalus) under the Umayyad caliphs (929–1031). Their capital, Córdoba, was one of Europe's largest and richest cities.",
    today: "Spain, Portugal, northern Morocco and western Algeria",
  },
};
