import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildQuestions, shiftDate } from "../src/lib/daily.ts";
import { puzzleKey } from "./daily-key.mjs";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const pool = json("../src/data/daily-pool.json");
const history = json("./fixtures/daily-history.json");

test("every day already played keeps exactly the same puzzle", () => {
  const changed = Object.entries(history).filter(([date, key]) => puzzleKey(pool, date) !== key).map(([date]) => date);
  assert.deepEqual(changed, [], "these days' puzzles changed; past puzzles are frozen (retire shapes with `until` instead)");
});

test("the server marks against the same pool the browser plays", () => {
  assert.deepEqual(json("../public/data/daily/index.json"), pool, "src/data/daily-pool.json and public/data/daily/index.json differ: run node scripts/build-daily.mjs");
});

test("the next 30 days each build five questions from ten different shapes, with a real answer", () => {
  const start = Object.keys(history).sort().at(-1);
  for (let i = 1; i <= 30; i++) {
    const date = shiftDate(start, i);
    const qs = buildQuestions(pool, date);
    assert.equal(qs.length, 5, date);
    assert.equal(new Set(qs.flatMap((q) => q.options.map((o) => o.id))).size, 10, `${date}: a shape repeats`);
    for (const q of qs) assert.ok(q.options[q.answer].a > q.options[1 - q.answer].a, `${date}: ${q.options[q.answer].n} isn't the bigger one`);
  }
});
