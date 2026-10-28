// Public Daily Challenge leaderboard (server only).
//
// Storage, picked automatically:
//   Redis   if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (or Vercel's KV_REST_API_URL + KV_REST_API_TOKEN).
//           Free at upstash.com, or one click in Vercel → Storage. Use this when the site is live.
//   JSON    otherwise: data/leaderboard.json. Zero setup for running on your computer.
//           On Vercel without Redis this falls back to /tmp, which is wiped regularly, so scores won't last.
//
// Scores are never trusted from the browser: the server rebuilds the day's questions and marks the answers itself.
//
// Redis keys start with "lb2:". The leaderboard was reset on Oct 19 when verified sign-in launched (everything under the
// old "lb:" keys is left unused). To reset again, bump the prefix everywhere in this file.
import { createHmac, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import pool from "@/data/daily-pool.json";
import { buildQuestions, LAUNCH, shiftDate, type PoolEntry } from "./daily";
import { isOffensive } from "./name-filter";
import removed from "@/content/removed-players.json";
import type { AllTimeBoard, AllTimeRow, DayBoard, DayRow, EndlessBoard, EndlessPlace, WeekBoard } from "./leaderboard-types";

// ---------- validation ----------

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPlayerId = (v: unknown): v is string => typeof v === "string" && ID.test(v);

export const isDateKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** The puzzle date must be "today" somewhere on Earth: within a day of the server's UTC date. */
export function isPlayableDate(date: string, now = new Date()) {
  const utc = now.toISOString().slice(0, 10);
  return date === utc || date === shiftDate(utc, -1) || date === shiftDate(utc, 1);
}

export function checkName(raw: unknown): { name: string; error?: string } {
  const name = (typeof raw === "string" ? raw : "").normalize("NFKC").replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 16) return { name, error: "Use 3 to 16 characters." };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u.test(name)) return { name, error: "Use letters, numbers, spaces, dots, dashes or underscores." };
  if (isOffensive(name)) return { name, error: "Please pick a different nickname." };
  return { name };
}

// Throwaway inboxes: someone using these isn't signing up, they're dodging the one-nickname-per-email rule.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com",
  "mohmal.com", "emailondeck.com", "tempail.com", "burnermail.io", "spamgourmet.com", "mailnesia.com", "tempr.email", "discard.email",
]);

/** Checks an email address and returns the key used to keep one leaderboard player per inbox. */
export function checkEmail(raw: unknown): { email: string; key: string; error?: string } {
  const email = (typeof raw === "string" ? raw : "").trim().toLowerCase();
  const fail = (error: string) => ({ email, key: "", error });
  if (!email) return fail("Enter your email to join the leaderboard.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) return fail("That email doesn't look right.");
  const [user, domain] = email.split("@");
  if (DISPOSABLE.has(domain)) return fail("Please use your own email, not a throwaway inbox.");
  // the same inbox written differently (name+tag@, or dots in a Gmail name) still counts once
  let base = user.split("+")[0];
  const gmail = domain === "gmail.com" || domain === "googlemail.com";
  if (gmail) base = base.replace(/\./g, "");
  return { email, key: `${base}@${gmail ? "gmail.com" : domain}` };
}

/** Marks a day's answers on the server. Returns null if the answers aren't a valid set of five picks. */
export function scoreAnswers(date: string, choices: unknown): number | null {
  const questions = buildQuestions(pool as PoolEntry[], date);
  if (!Array.isArray(choices) || choices.length !== questions.length || !choices.every((c) => c === 0 || c === 1)) return null;
  return choices.filter((c, i) => questions[i].answer === c).length;
}

// ---------- storage ----------

/** s = score, t = when it was posted, c = the picks (so a signed-in player sees the same results on every device). */
type DayEntry = { s: number; t: number; c?: number[] };

interface Store {
  /** false if this player already has a score for this date (the first one counts) */
  submit(date: string, id: string, score: number, at: number, choices: number[]): Promise<boolean>;
  /** this player's saved result for each date (null where they didn't play) */
  records(id: string, dates: string[]): Promise<(DayEntry | null)[]>;
  /** add the picks to a result posted before picks were kept */
  addChoices(date: string, id: string, choices: number[]): Promise<void>;
  setName(id: string, name: string): Promise<void>;
  /** has this player already posted a score for this date? */
  has(date: string, id: string): Promise<boolean>;
  /** reserve a nickname (case-insensitive) for this player; false if someone else already owns it */
  claimName(nameKey: string, id: string): Promise<boolean>;
  /** the email this player signed up with (private, never sent to the browser) */
  emailOf(id: string): Promise<string | null>;
  /** tie an email to this player; false if another player already signed up with it */
  claimEmail(emailKey: string, id: string, email: string): Promise<boolean>;
  /** the player who signed up with this email (by its emailKey), if any */
  playerOfEmail(emailKey: string): Promise<string | null>;
  nameOf(id: string): Promise<string | null>;
  remindersOn(id: string): Promise<boolean>;
  /** has this player seen the one-time welcome pop-up (username and reminders) on any device? */
  welcomed(id: string): Promise<boolean>;
  setWelcomed(id: string): Promise<void>;
  /** the player a signed-in account plays as */
  playerOfAccount(accountId: string): Promise<string | null>;
  /** tie a signed-in account to a player; returns the player it's tied to (the first one wins) */
  linkAccount(accountId: string, id: string): Promise<string>;
  /** turn daily-challenge reminder emails on (recording when they agreed) or off */
  setReminders(id: string, on: boolean, at: number): Promise<void>;
  /** players who agreed to reminders, with their email and nickname */
  reminderRecipients(): Promise<{ id: string; email: string; name: string; since: number }[]>;
  /** count one more new player from this network today; returns the new count */
  bumpNetwork(date: string, netKey: string): Promise<number>;
  day(date: string): Promise<{ id: string; name: string; s: number; t: number }[]>;
  allTime(limit: number, me: string | null): Promise<{ total: number; top: { id: string; name: string; points: number; days: number }[]; me: { name: string; points: number; days: number; above: number } | null }>;
  /** removes everything stored about this player: scores, nickname, email, reminders and the account link */
  deletePlayer(id: string, accountId: string | null): Promise<void>;
  /** an endless-mode streak: kept as this player's best for the day the run started, and of all time, if it beats them */
  endlessPost(date: string, id: string, streak: number, at: number): Promise<void>;
  /**
   * What was last posted for this endless run (by its seed) and by whom; records this post unless the run had already
   * ended or belongs to someone else (kept three days)
   */
  endlessRun(seed: string, id: string, streak: number, over: boolean): Promise<EndlessRunRecord | null>;
  /** the best streaks: one day's, or of all time (date null), best first, with ties going to whoever got there first */
  endlessBests(date: string | null): Promise<{ id: string; name: string; n: number }[]>;
}

// Endless-mode bests are stored as one number: the streak, plus a fraction that shrinks with time, so a tie goes to
// whoever reached that streak first and "only if better" keeps the first time a streak was reached.
const endlessScore = (streak: number, at: number) => streak + (1 - at / 1e13);
const ENDLESS_RUN_TTL = 3 * 86400;
/** Endless streaks above this stay off the boards until someone checks them (see endlessBoard). */
export const ENDLESS_REVIEW_OVER = 100;
/** n = streak, over = ended on a miss, p = the player who posted it, a = when (the JSON file only: Redis expires it) */
type EndlessRunRecord = { n: number; over: boolean; p: string; a?: number };

/** Every date a score could have been posted on (the day before launch, as UTC-1 counts, to tomorrow), for wiping one player's scores. */
function playableDates(now = new Date()) {
  const out: string[] = [];
  const end = shiftDate(now.toISOString().slice(0, 10), 1);
  for (let d = shiftDate(LAUNCH, -1); d <= end; d = shiftDate(d, 1)) out.push(d);
  return out;
}

// --- Redis (Upstash REST) ---
function redisStore(url: string, token: string): Store {
  const run = async (commands: (string | number)[][]) => {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands.map((c) => c.map(String))),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis responded ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    const err = out.find((o) => o.error);
    if (err) throw new Error(err.error);
    return out.map((o) => o.result);
  };
  const pairs = (flat: unknown) => {
    const a = (flat as string[]) ?? [];
    const m: Record<string, string> = {};
    for (let i = 0; i < a.length; i += 2) m[a[i]] = a[i + 1];
    return m;
  };
  return {
    async submit(date, id, score, at, choices) {
      const [added] = await run([["HSETNX", `lb2:day:${date}`, id, JSON.stringify({ s: score, t: at, c: choices })]]);
      if (Number(added) !== 1) return false;
      await run([
        ["ZINCRBY", "lb2:points", score, id],
        ["HINCRBY", "lb2:days", id, 1],
      ]);
      return true;
    },
    async setName(id, name) {
      await run([["HSET", "lb2:names", id, name]]);
    },
    async records(id, dates) {
      if (!dates.length) return [];
      const raw = await run(dates.map((d) => ["HGET", `lb2:day:${d}`, id]));
      return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as DayEntry) : null));
    },
    async addChoices(date, id, choices) {
      const [raw] = await run([["HGET", `lb2:day:${date}`, id]]);
      if (typeof raw !== "string") return;
      const e = JSON.parse(raw) as DayEntry;
      if (!e.c) await run([["HSET", `lb2:day:${date}`, id, JSON.stringify({ ...e, c: choices })]]);
    },
    async has(date, id) {
      const [r] = await run([["HEXISTS", `lb2:day:${date}`, id]]);
      return Number(r) === 1;
    },
    async claimName(nameKey, id) {
      const [, owner] = await run([
        ["HSETNX", "lb2:owners", nameKey, id],
        ["HGET", "lb2:owners", nameKey],
      ]);
      return owner === id;
    },
    async emailOf(id) {
      const [email] = await run([["HGET", "lb2:emails", id]]);
      return (email as string | null) ?? null;
    },
    async claimEmail(emailKey, id, email) {
      const [, owner] = await run([
        ["HSETNX", "lb2:email-owners", emailKey, id],
        ["HGET", "lb2:email-owners", emailKey],
      ]);
      if (owner !== id) return false;
      await run([["HSET", "lb2:emails", id, email]]);
      return true;
    },
    async setReminders(id, on, at) {
      await run([on ? ["HSET", "lb2:reminders", id, at] : ["HDEL", "lb2:reminders", id]]);
    },
    async playerOfEmail(emailKey) {
      const [id] = await run([["HGET", "lb2:email-owners", emailKey]]);
      return typeof id === "string" ? id : null;
    },
    async nameOf(id) {
      const [n] = await run([["HGET", "lb2:names", id]]);
      return typeof n === "string" ? n : null;
    },
    async remindersOn(id) {
      const [r] = await run([["HEXISTS", "lb2:reminders", id]]);
      return Number(r) === 1;
    },
    async welcomed(id) {
      const [r] = await run([["SISMEMBER", "lb2:welcomed", id]]);
      return Number(r) === 1;
    },
    async setWelcomed(id) {
      await run([["SADD", "lb2:welcomed", id]]);
    },
    async playerOfAccount(accountId) {
      const [id] = await run([["HGET", "lb2:accounts", accountId]]);
      return typeof id === "string" ? id : null;
    },
    async linkAccount(accountId, id) {
      const [, owner] = await run([
        ["HSETNX", "lb2:accounts", accountId, id],
        ["HGET", "lb2:accounts", accountId],
      ]);
      return owner as string;
    },
    async reminderRecipients() {
      const [raw] = await run([["HGETALL", "lb2:reminders"]]);
      const since = pairs(raw);
      const ids = Object.keys(since);
      if (!ids.length) return [];
      const [emails, names] = await run([
        ["HMGET", "lb2:emails", ...ids],
        ["HMGET", "lb2:names", ...ids],
      ]);
      return ids
        .map((id, i) => ({ id, email: (emails as (string | null)[])[i] ?? "", name: (names as (string | null)[])[i] ?? "Player", since: Number(since[id]) }))
        .filter((r) => r.email);
    },
    async bumpNetwork(date, netKey) {
      const key = `lb2:net:${date}:${netKey}`;
      const [n] = await run([
        ["INCR", key],
        ["EXPIRE", key, 3 * 86400],
      ]);
      return Number(n);
    },
    async day(date) {
      const [raw] = await run([["HGETALL", `lb2:day:${date}`]]);
      const entries = Object.entries(pairs(raw)).map(([id, v]) => ({ id, ...(JSON.parse(v) as DayEntry) }));
      if (!entries.length) return [];
      const [names] = await run([["HMGET", "lb2:names", ...entries.map((e) => e.id)]]);
      return entries.map((e, i) => ({ ...e, name: (names as (string | null)[])[i] ?? "Player" }));
    },
    async allTime(limit, me) {
      const [top, total] = await run([["ZREVRANGE", "lb2:points", 0, limit - 1, "WITHSCORES"], ["ZCARD", "lb2:points"]]);
      const list = (top as string[]) ?? [];
      const ids: string[] = [];
      const pts: number[] = [];
      for (let i = 0; i < list.length; i += 2) {
        ids.push(list[i]);
        pts.push(Number(list[i + 1]));
      }
      const want = me && !ids.includes(me) ? [...ids, me] : ids;
      const cmds: (string | number)[][] = [];
      if (want.length) cmds.push(["HMGET", "lb2:names", ...want], ["HMGET", "lb2:days", ...want]);
      if (me) cmds.push(["ZSCORE", "lb2:points", me]);
      const res = cmds.length ? await run(cmds) : [];
      const n = (want.length ? res[0] : []) as (string | null)[];
      const d = (want.length ? res[1] : []) as (string | null)[];
      const mine = me ? res[res.length - 1] : null;
      let meRow = null;
      if (me && mine !== null && mine !== undefined) {
        const points = Number(mine);
        const [above] = await run([["ZCOUNT", "lb2:points", `(${points}`, "+inf"]]);
        const j = want.indexOf(me);
        meRow = { name: n[j] ?? "You", points, days: Number(d[j] ?? 0), above: Number(above) };
      }
      return {
        total: Number(total),
        top: ids.map((id, i) => ({ id, name: n[i] ?? "Player", points: pts[i], days: Number(d[i] ?? 0) })),
        me: meRow,
      };
    },
    async endlessPost(date, id, streak, at) {
      const score = endlessScore(streak, at);
      await run([
        ["ZADD", `lb2:endless:day:${date}`, "GT", score, id],
        ["ZADD", "lb2:endless:all", "GT", score, id],
      ]);
    },
    async endlessRun(seed, id, streak, over) {
      const key = `lb2:endless:run:${seed}`;
      const value = JSON.stringify({ n: streak, over, p: id });
      // the first post claims the run in one step (NX), so two accounts posting it at once can't both get it; the list of
      // a player's runs lets "Delete my data" find them
      const [claimed] = await run([["SET", key, value, "NX", "EX", ENDLESS_RUN_TTL]]);
      if (claimed === "OK") {
        const mine = `lb2:endless:runs-of:${id}`;
        await run([
          ["SADD", mine, seed],
          ["EXPIRE", mine, ENDLESS_RUN_TTL],
        ]);
        return null;
      }
      const [raw] = await run([["GET", key]]);
      const old = typeof raw === "string" ? (JSON.parse(raw) as EndlessRunRecord) : null;
      // the owner's run grows while it lasts; anything else leaves the record as it was
      if (old && old.p === id && !old.over && streak >= old.n) await run([["SET", key, value, "XX", "EX", ENDLESS_RUN_TTL]]);
      return old;
    },
    async endlessBests(date) {
      const [raw] = await run([["ZREVRANGE", date ? `lb2:endless:day:${date}` : "lb2:endless:all", 0, -1, "WITHSCORES"]]);
      const list = (raw as string[]) ?? [];
      const ids: string[] = [];
      const ns: number[] = [];
      for (let i = 0; i < list.length; i += 2) {
        ids.push(list[i]);
        ns.push(Math.floor(Number(list[i + 1])));
      }
      if (!ids.length) return [];
      const [names] = await run([["HMGET", "lb2:names", ...ids]]);
      return ids.map((id, i) => ({ id, name: (names as (string | null)[])[i] ?? "Player", n: ns[i] }));
    },
    async deletePlayer(id, accountId) {
      // every nickname and email this player ever claimed (renames keep the old claim), found by owner
      const [owners, emailOwners] = await run([
        ["HGETALL", "lb2:owners"],
        ["HGETALL", "lb2:email-owners"],
      ]);
      const cmds: (string | number)[][] = playableDates().flatMap((d) => [
        ["HDEL", `lb2:day:${d}`, id],
        ["ZREM", `lb2:endless:day:${d}`, id],
      ]);
      const [seeds] = await run([["SMEMBERS", `lb2:endless:runs-of:${id}`]]);
      for (const seed of (seeds as string[]) ?? []) cmds.push(["DEL", `lb2:endless:run:${seed}`]);
      cmds.push(["ZREM", "lb2:endless:all", id], ["DEL", `lb2:endless:runs-of:${id}`]);
      cmds.push(["ZREM", "lb2:points", id], ["HDEL", "lb2:days", id], ["HDEL", "lb2:names", id], ["HDEL", "lb2:emails", id], ["HDEL", "lb2:reminders", id], ["SREM", "lb2:welcomed", id]);
      for (const [k, v] of Object.entries(pairs(owners))) if (v === id) cmds.push(["HDEL", "lb2:owners", k]);
      for (const [k, v] of Object.entries(pairs(emailOwners))) if (v === id) cmds.push(["HDEL", "lb2:email-owners", k]);
      if (accountId) cmds.push(["HDEL", "lb2:accounts", accountId]);
      await run(cmds);
    },
  };
}

// --- JSON file ---
type FileData = {
  names: Record<string, string>;
  days: Record<string, Record<string, DayEntry>>;
  owners?: Record<string, string>;
  nets?: Record<string, number>;
  emails?: Record<string, string>;
  emailOwners?: Record<string, string>;
  reminders?: Record<string, number>;
  welcomed?: Record<string, true>;
  accounts?: Record<string, string>;
  /** endless mode: best scores (see endlessScore) per day and of all time, and what each run last posted */
  endless?: { days: Record<string, Record<string, number>>; all: Record<string, number>; runs: Record<string, EndlessRunRecord> };
};

function fileStore(file: string): Store {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<FileData> => {
    try {
      const d = JSON.parse(await fs.readFile(file, "utf8"));
      return { names: d.names ?? {}, days: d.days ?? {}, owners: d.owners ?? {}, nets: d.nets ?? {}, emails: d.emails ?? {}, emailOwners: d.emailOwners ?? {}, reminders: d.reminders ?? {}, accounts: d.accounts ?? {}, endless: d.endless };
    } catch {
      return { names: {}, days: {}, owners: {}, nets: {}, emails: {}, emailOwners: {}, reminders: {}, accounts: {} };
    }
  };
  // serialize writes so two players finishing at once can't overwrite each other
  const write = <T>(fn: (d: FileData) => T): Promise<T> => {
    const job = queue.then(async () => {
      const d = await read();
      const out = fn(d);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(`${file}.tmp`, JSON.stringify(d));
      await fs.rename(`${file}.tmp`, file);
      return out;
    });
    queue = job.catch(() => {});
    return job;
  };
  return {
    submit: (date, id, score, at, choices) =>
      write((d) => {
        const day = (d.days[date] ??= {});
        if (day[id]) return false;
        day[id] = { s: score, t: at, c: choices };
        return true;
      }),
    async records(id, dates) {
      const d = await read();
      return dates.map((date) => d.days[date]?.[id] ?? null);
    },
    addChoices: (date, id, choices) =>
      write((d) => {
        const e = d.days[date]?.[id];
        if (e && !e.c) e.c = choices;
      }),
    setName: (id, name) =>
      write((d) => {
        d.names[id] = name;
      }),
    async has(date, id) {
      return !!(await read()).days[date]?.[id];
    },
    claimName: (nameKey, id) =>
      write((d) => {
        const owners = (d.owners ??= {});
        owners[nameKey] ??= id;
        return owners[nameKey] === id;
      }),
    async emailOf(id) {
      return (await read()).emails?.[id] ?? null;
    },
    claimEmail: (emailKey, id, email) =>
      write((d) => {
        const owners = (d.emailOwners ??= {});
        owners[emailKey] ??= id;
        if (owners[emailKey] !== id) return false;
        (d.emails ??= {})[id] = email;
        return true;
      }),
    async playerOfEmail(emailKey) {
      return (await read()).emailOwners?.[emailKey] ?? null;
    },
    async playerOfAccount(accountId) {
      return (await read()).accounts?.[accountId] ?? null;
    },
    async nameOf(id) {
      return (await read()).names[id] ?? null;
    },
    async remindersOn(id) {
      return !!(await read()).reminders?.[id];
    },
    async welcomed(id) {
      return !!(await read()).welcomed?.[id];
    },
    setWelcomed: (id) =>
      write((d) => {
        (d.welcomed ??= {})[id] = true;
      }),
    linkAccount: (accountId, id) =>
      write((d) => {
        const accounts = (d.accounts ??= {});
        accounts[accountId] ??= id;
        return accounts[accountId];
      }),
    setReminders: (id, on, at) =>
      write((d) => {
        const r = (d.reminders ??= {});
        if (on) r[id] = at;
        else delete r[id];
      }),
    async reminderRecipients() {
      const d = await read();
      return Object.entries(d.reminders ?? {})
        .map(([id, since]) => ({ id, email: d.emails?.[id] ?? "", name: d.names[id] ?? "Player", since }))
        .filter((r) => r.email);
    },
    bumpNetwork: (date, netKey) =>
      write((d) => {
        const nets = (d.nets ??= {});
        const k = `${date}:${netKey}`;
        nets[k] = (nets[k] ?? 0) + 1;
        return nets[k];
      }),
    async day(date) {
      const d = await read();
      return Object.entries(d.days[date] ?? {}).map(([id, e]) => ({ id, ...e, name: d.names[id] ?? "Player" }));
    },
    async allTime(limit, me) {
      const d = await read();
      const totals = new Map<string, { points: number; days: number }>();
      for (const day of Object.values(d.days))
        for (const [id, e] of Object.entries(day)) {
          const t = totals.get(id) ?? { points: 0, days: 0 };
          t.points += e.s;
          t.days += 1;
          totals.set(id, t);
        }
      const all = [...totals].map(([id, t]) => ({ id, name: d.names[id] ?? "Player", ...t })).sort((a, b) => b.points - a.points || a.days - b.days);
      const mine = me ? all.find((r) => r.id === me) : undefined;
      return {
        total: all.length,
        top: all.slice(0, limit),
        me: mine ? { name: mine.name, points: mine.points, days: mine.days, above: all.filter((r) => r.points > mine.points).length } : null,
      };
    },
    endlessPost: (date, id, streak, at) =>
      write((d) => {
        const e = (d.endless ??= { days: {}, all: {}, runs: {} });
        const score = endlessScore(streak, at);
        const day = (e.days[date] ??= {});
        if (!(day[id] >= score)) day[id] = score;
        if (!(e.all[id] >= score)) e.all[id] = score;
      }),
    endlessRun: (seed, id, streak, over) =>
      write((d) => {
        const e = (d.endless ??= { days: {}, all: {}, runs: {} });
        const now = Date.now();
        // runs are only kept three days, as in Redis
        for (const [k, r] of Object.entries(e.runs)) if (!r.a || now - r.a > ENDLESS_RUN_TTL * 1000) delete e.runs[k];
        const old = e.runs[seed] ?? null;
        if (!old || (old.p === id && !old.over && streak >= old.n)) e.runs[seed] = { n: streak, over, p: id, a: now };
        return old;
      }),
    async endlessBests(date) {
      const d = await read();
      const scores = (date ? d.endless?.days[date] : d.endless?.all) ?? {};
      return Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .map(([id, score]) => ({ id, name: d.names[id] ?? "Player", n: Math.floor(score) }));
    },
    deletePlayer: (id, accountId) =>
      write((d) => {
        for (const day of Object.values(d.days)) delete day[id];
        if (d.endless) {
          for (const day of Object.values(d.endless.days)) delete day[id];
          delete d.endless.all[id];
          for (const [k, r] of Object.entries(d.endless.runs)) if (r.p === id) delete d.endless.runs[k];
        }
        delete d.names[id];
        if (d.emails) delete d.emails[id];
        if (d.reminders) delete d.reminders[id];
        if (d.welcomed) delete d.welcomed[id];
        for (const map of [d.owners, d.emailOwners]) for (const [k, v] of Object.entries(map ?? {})) if (v === id) delete map![k];
        if (accountId && d.accounts) delete d.accounts[accountId];
      }),
  };
}

let store: Store | null = null;

/** Which storage is in use: "redis" when the Redis settings are present, otherwise "file". */
export const storeKind = () =>
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
    ? "redis"
    : "file";

export function getStore(): Store {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) store = redisStore(url, token);
  else {
    if (process.env.VERCEL) console.warn("[leaderboard] No Redis configured: scores go to /tmp and will be lost. Add Upstash Redis (see README).");
    store = fileStore(process.env.VERCEL ? "/tmp/leaderboard.json" : path.join(process.cwd(), "data", "leaderboard.json"));
  }
  return store;
}

// ---------- boards ----------

/** Competition ranking: equal scores share a rank (1, 2, 2, 4). */
export function rankBy<T>(rows: T[], key: (r: T) => number) {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || key(r) !== key(rows[i - 1])) rank = i + 1;
    return { r, rank };
  });
}

/** Nicknames are unique ignoring case, spaces and punctuation ("Map Wizard" = "mapwizard"). */
export const nameKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** One-way hash of the visitor's network address plus the date, so no IP address is ever stored. */
export function networkKey(ip: string, date: string) {
  // keyed with a server-only secret, so the code can't be turned back into the address
  return createHmac("sha256", unsubscribeSecret()).update(`net:${ip}|${date}`).digest("hex").slice(0, 16);
}

// ---------- a signed-in player's results on any device ----------

/** How far back a signed-in device gets its results (for the streak and stats). */
const HISTORY_DAYS = 60;

/** The player's results with picks, newest first: { date: { c, s } }. Days posted without picks are left out. */
export async function playerHistory(id: string, today: string) {
  const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => shiftDate(today, -i));
  const saved = await getStore().records(id, dates);
  const days: Record<string, { c: number[]; s: number }> = {};
  dates.forEach((date, i) => {
    const e = saved[i];
    if (e?.c) days[date] = { c: e.c, s: e.s };
  });
  return days;
}

// ---------- reminder emails ----------

// Signs unsubscribe links so nobody can unsubscribe someone else by guessing. Set UNSUBSCRIBE_SECRET in Vercel;
// until then the Redis token (also server-only) is used.
export const unsubscribeSecret = () =>
  process.env.UNSUBSCRIBE_SECRET || process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "local-dev-only";

/** Token for a player's one-click unsubscribe link (/api/leaderboard/unsubscribe?p=<id>&t=<token>). Put it in every reminder email. */
export const unsubscribeToken = (id: string) => createHmac("sha256", unsubscribeSecret()).update(`unsubscribe:${id}`).digest("base64url").slice(0, 32);

export function checkUnsubscribeToken(id: string, token: string) {
  const want = Buffer.from(unsubscribeToken(id));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** New players allowed per network per day (a household or friends on one Wi-Fi). */
export const NEW_PLAYERS_PER_NETWORK = 5;

const REMOVED = new Set(removed.names.map((n) => nameKey(n)));
const REMOVED_IDS = new Set<string>(removed.ids);
/** Kept off the boards: offensive names, and anyone listed in src/content/removed-players.json. */
const hidden = (name: string, id?: string) => isOffensive(name) || REMOVED.has(nameKey(name)) || (!!id && REMOVED_IDS.has(id));

export async function dayBoard(date: string, limit: number, me: string | null): Promise<DayBoard> {
  const entries = (await getStore().day(date)).filter((e) => !hidden(e.name, e.id)).sort((a, b) => b.s - a.s || a.t - b.t);
  const ranked = rankBy(entries, (e) => e.s);
  const toRow = ({ r, rank }: (typeof ranked)[number]): DayRow => ({ rank, name: r.name, score: r.s, ...(r.id === me ? { me: true } : {}) });
  const mine = me ? ranked.find((x) => x.r.id === me) : undefined;
  return { date, total: entries.length, rows: ranked.slice(0, limit).map(toRow), me: mine ? toRow(mine) : null };
}

export async function allTimeBoard(limit: number, me: string | null): Promise<AllTimeBoard> {
  const { total: stored, top: all, me: mine } = await getStore().allTime(limit, me);
  // names saved before the filter was tightened are hidden until someone removes them from the store
  const top = all.filter((t) => !hidden(t.name, t.id));
  const total = stored - (all.length - top.length);
  const rows: AllTimeRow[] = rankBy(top, (t) => t.points).map(({ r, rank }) => ({
    rank,
    name: r.name,
    points: r.points,
    days: r.days,
    average: r.days ? Math.round((r.points / r.days) * 10) / 10 : 0,
    ...(r.id === me ? { me: true } : {}),
  }));
  const meRow: AllTimeRow | null = mine
    ? { rank: mine.above + 1, name: mine.name, points: mine.points, days: mine.days, average: mine.days ? Math.round((mine.points / mine.days) * 10) / 10 : 0, me: true }
    : null;
  return { total, rows, me: meRow };
}

/** The Monday (YYYY-MM-DD) of the week a date falls in. Weeks run Monday to Sunday. */
export function weekStart(date: string) {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  return shiftDate(date, -dow);
}

/** This week's ranking: points from each day's first try, added up from Monday. */
export async function weekBoard(date: string, limit: number, me: string | null): Promise<WeekBoard> {
  const start = weekStart(date);
  const dates = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
  const days = await Promise.all(dates.map((d) => getStore().day(d)));
  const totals = new Map<string, { name: string; points: number; days: number; t: number }>();
  for (const day of days)
    for (const e of day) {
      if (hidden(e.name, e.id)) continue;
      const t = totals.get(e.id) ?? { name: e.name, points: 0, days: 0, t: 0 };
      t.points += e.s;
      t.days += 1;
      t.t = Math.max(t.t, e.t);
      totals.set(e.id, t);
    }
  // most points first; on a tie, fewer days played (a better average) wins
  const all = [...totals].sort(([, a], [, b]) => b.points - a.points || a.days - b.days);
  const toRow = (id: string, t: { name: string; points: number; days: number }, rank: number): AllTimeRow => ({
    rank,
    name: t.name,
    points: t.points,
    days: t.days,
    average: Math.round((t.points / t.days) * 10) / 10,
    ...(id === me ? { me: true } : {}),
  });
  const ranked = rankBy(all, ([, t]) => t.points).map(({ r: [id, t], rank }) => toRow(id, t, rank));
  const mine = me ? ranked.find((r) => r.me) : undefined;
  return { start, end: dates[6], total: all.length, rows: ranked.slice(0, limit), me: mine ?? null };
}

/**
 * Endless mode's best streaks: one day's (the day each run started, in the player's time zone, as the daily) or of all
 * time (`date` null). Rows use the daily's shape, with the streak as the score.
 */
/**
 * Where a streak of `score` would land on the all-time Best streaks board, over every entry (not just the top rows),
 * leaving out `me`'s own row, which a better run replaces. Ties share a rank, as on the board. `next` is the closest
 * score above it and the place one more than that would take.
 */
export async function endlessPlace(score: number, me: string | null): Promise<EndlessPlace> {
  const ns = (await getStore().endlessBests(null)).filter((e) => !hidden(e.name, e.id) && e.n <= ENDLESS_REVIEW_OVER && e.id !== me).map((e) => e.n);
  const placeOf = (n: number) => 1 + ns.filter((x) => x > n).length;
  const above = ns.filter((x) => x > score);
  const next = above.length ? above.reduce((a, b) => Math.min(a, b)) : null;
  return { rank: placeOf(score), next: next === null ? null : { score: next, place: placeOf(next + 1) } };
}

export async function endlessBoard(date: string | null, limit: number, me: string | null): Promise<EndlessBoard> {
  // no one gets anywhere near this many right in a row at the closest level: a longer streak waits for a look at the
  // run (add the player to src/content/removed-players.json, or raise this)
  const entries = (await getStore().endlessBests(date)).filter((e) => !hidden(e.name, e.id) && e.n <= ENDLESS_REVIEW_OVER);
  const ranked = rankBy(entries, (e) => e.n);
  const toRow = ({ r, rank }: (typeof ranked)[number]): DayRow => ({ rank, name: r.name, score: r.n, ...(r.id === me ? { me: true } : {}) });
  const mine = me ? ranked.find((x) => x.r.id === me) : undefined;
  return { date, total: entries.length, rows: ranked.slice(0, limit).map(toRow), me: mine ? toRow(mine) : null };
}
