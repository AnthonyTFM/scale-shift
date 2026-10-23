// Nickname filter for the public leaderboard. Shared by the server (the real check) and the join form (instant feedback).
//
// Catches disguised spellings: l33t digits (n1gg3r), lookalike letters (q for g, Cyrillic а/е/о), accents (ñ),
// repeated letters (fuuuck), separators (n.i.g.g.e.r) and camelCase compounds (BigDick).
// No filter is perfect: if a bad name gets through, add its root here and the board hides it on the next deploy.

// Roots blocked anywhere inside the name (spaces and punctuation removed).
const ANYWHERE = [
  // slurs
  "nigg", "nigga", "negro", "niggu", "faggot", "fagot", "fagget", "tranny", "trannie", "shemale", "chink", "wetback", "beaner", "raghead",
  "towelhead", "golliwog", "retard", "nazi", "hitler", "kkk", "heilhitler", "siegheil", "whitepower",
  // profanity and sexual words
  "fuck", "fuk", "shit", "cunt", "kunt", "bitch", "whore", "slut", "rape", "rapist", "twat", "wanker", "asshole", "arsehole", "porn",
  "biatch", "pussy", "penis", "vagina", "dildo", "jizz", "bastard", "bollock", "pedophil", "paedophil", "molest", "incest", "milf", "titty",
  "boob", "killyourself", "blowjob", "handjob", "cumshot", "orgasm", "masturbat", "erection", "testicle", "scrotum", "clitor",
];

// Roots blocked only as a whole word (so "Hancock", "Pakistan", "Scrap" and "Analyst" are fine). Plurals are covered.
const WHOLE_WORD = [
  "nig", "nigr", "niga", "fag", "dyke", "gook", "spic", "spick", "kike", "coon", "paki", "jap", "wop", "dago", "homo", "lesbo", "tard", "spaz",
  "dick", "cock", "sex", "sexy", "ass", "arse", "cum", "tit", "tits", "hoe", "thot", "kys", "anal", "anus", "semen", "prick", "crap",
  "piss", "wank", "horny", "nonce", "honky", "slag", "skank", "pedo", "paedo", "nazis", "heil",
  // names that pretend to be the site
  "admin", "moderator", "mod", "official", "scaleshift", "borderdrift", "borderdriftofficial", "staff",
];

// Real words and places that contain a blocked root. Removed before checking.
const ALLOWED = [
  "scunthorpe", "grape", "drape", "scrape", "parapet", "trapeze", "therapist", "montenegro", "negroni", "penistone", "shiitake",
  "shitake", "matsushita", "fukushima", "fukuoka", "fukuyama", "fukui", "fuchs", "ashkenazi",
];

// Lookalike letters from other alphabets.
const CONFUSABLE: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i", ї: "i", ј: "j", ѕ: "s",
  ԁ: "d", ɡ: "g", α: "a", β: "b", ε: "e", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", ø: "o", ß: "ss", æ: "ae", œ: "oe",
};

const BASE: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };
// A looser reading for letters people swap in to dodge filters: q→g (niqqer), 6/9→g, ph→f, ck/c→k, z→s, v→u.
const LOOSE: Record<string, string> = { ...BASE, "6": "g", "9": "g", q: "g", c: "k", z: "s", v: "u" };
const loose = (s: string) => s.replace(/ph/g, "f").replace(/ck/g, "k").replace(/[\d@$!qczv]/g, (c) => LOOSE[c] ?? c);

const readings = [
  (s: string) => s.replace(/[\d@$!]/g, (c) => BASE[c] ?? c),
  loose,
  // 1 can stand for l as well as i
  (s: string) => loose(s.replace(/1/g, "l")),
  // digits as gaps, so "nig 69" and "kike123" still read as words
  (s: string) => s.replace(/\d/g, " ").replace(/[@$!]/g, (c) => BASE[c] ?? c),
];

/** Lowercase, strip accents and swap lookalike letters, keeping word breaks (camelCase counts as a break). */
function prepare(name: string) {
  return name
    .normalize("NFKC")
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/./gu, (c) => CONFUSABLE[c] ?? c);
}

/** Each letter of a root may repeat (fuuuck) or be doubled up by the speller. */
const pattern = (root: string) => root.split("").map((c) => `${c}+`).join("");

function compile(read: (s: string) => string) {
  const anywhere = new RegExp(ANYWHERE.map((r) => pattern(read(r))).join("|"));
  const word = new RegExp(`^(?:${WHOLE_WORD.map((r) => pattern(read(r))).join("|")})(?:e?s+)?$`);
  const allowed = new RegExp(ALLOWED.map((r) => read(r)).join("|"), "g");
  return { read, anywhere, word, allowed };
}
const checks = readings.map(compile);

/** True if the name looks like a slur, swear word or sexual term under any disguise. */
export function isOffensive(name: string): boolean {
  const prepared = prepare(name);
  return checks.some(({ read, anywhere, word, allowed }) => {
    const text = read(prepared);
    const words = text.split(/[^a-z]+/).filter(Boolean);
    const squashed = words.join("").replace(allowed, "");
    if (anywhere.test(squashed)) return true;
    // whole words, plus the whole name with spaces removed ("f a g") and pairs of words ("big dick" is caught as "dick" already)
    return [...words.map((w) => w.replace(allowed, "")), words.join("")].some((w) => w && word.test(w));
  });
}
