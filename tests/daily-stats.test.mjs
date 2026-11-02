import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SHIELDS, stats } from "../src/lib/daily.ts";
import { dayName } from "../src/lib/format.ts";

// a save with these days finished (score 5 unless given), as the daily game writes it
const save = (...days) => ({ v: 1, days: Object.fromEntries(days.map((d) => (Array.isArray(d) ? [d[0], { c: [0, 0, 0, 0, 0], s: d[1] }] : [d, { c: [0, 0, 0, 0, 0], s: 5 }]))) });

test("a streak counts days in a row up to today, or yesterday when today isn't played yet", () => {
  const s = stats(save("2026-11-01", "2026-11-02", "2026-11-03"), "2026-11-04");
  assert.equal(s.streak, 3);
  assert.equal(stats(save("2026-11-01", "2026-11-02", "2026-11-03"), "2026-11-03").streak, 3);
  // yesterday missed with a shield in hand: covered, today still to play; a second missed day breaks it
  const covered = stats(save("2026-11-01", "2026-11-02"), "2026-11-04");
  assert.equal(covered.streak, 2);
  assert.equal(covered.saved, "2026-11-03");
  assert.equal(stats(save("2026-11-01", "2026-11-02"), "2026-11-05").streak, 0, "Nov 3 covered, Nov 4 not: broken");
});

test("the second day in a row earns a shield; a missed day spends one and the streak carries on", () => {
  const two = stats(save("2026-11-01", "2026-11-02"), "2026-11-02");
  assert.equal(two.shields, 1);
  const missed = stats(save("2026-11-01", "2026-11-02", "2026-11-04"), "2026-11-04");
  assert.equal(missed.streak, 3, "Nov 3 covered by the shield; covered days keep the streak but don't add to it");
  assert.equal(missed.shields, 1, "spent on Nov 3, earned back by Nov 4 extending the streak");
  assert.equal(missed.saved, "2026-11-03");
  assert.equal(missed.best, 3);
});

test("shields cap at MAX_SHIELDS and the first day of a streak earns none", () => {
  const s = stats(save("2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"), "2026-11-05");
  assert.equal(s.shields, MAX_SHIELDS);
  assert.equal(stats(save("2026-11-01"), "2026-11-01").shields, 0);
  // playing every other day never earns one, so the streak breaks on the second miss
  const alt = stats(save("2026-11-01", "2026-11-03", "2026-11-05"), "2026-11-05");
  assert.equal(alt.streak, 1);
  assert.equal(alt.shields, 0);
});

test("two missed days spend two shields; a third miss breaks the streak and clears the saved day", () => {
  const week = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"];
  const kept = stats(save(...week, "2026-11-07"), "2026-11-07");
  assert.equal(kept.streak, 5, "five days played, two covered");
  assert.equal(kept.shields, 1, "spent two, earned one back on Nov 7");
  assert.equal(kept.saved, "2026-11-06");
  const broken = stats(save(...week, "2026-11-08"), "2026-11-08");
  assert.equal(broken.streak, 1);
  assert.equal(broken.saved, null);
  assert.equal(broken.best, 4);
});

test("a missed yesterday is covered before today is played, and the counts stay as before", () => {
  const s = stats(save("2026-11-01", "2026-11-02", "2026-11-03"), "2026-11-05");
  assert.equal(s.streak, 3);
  assert.equal(s.shields, 1);
  assert.equal(s.saved, "2026-11-04");
  const p = stats(save(["2026-11-01", 5], ["2026-11-02", 3]), "2026-11-02");
  assert.equal(p.played, 2);
  assert.equal(p.perfect, 1);
  assert.equal(p.average, 4);
});

test("a covered day is named 'yesterday' or by its date, across month ends", () => {
  assert.equal(dayName("2026-11-01", "2026-11-02"), "yesterday");
  assert.equal(dayName("2026-10-31", "2026-11-01"), "yesterday");
  assert.equal(dayName("2026-10-31", "2026-11-02"), "Oct 31");
  assert.equal(dayName("2026-12-31", "2027-01-01"), "yesterday");
});
