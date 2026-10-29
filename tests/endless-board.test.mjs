import { test } from "node:test";
import assert from "node:assert/strict";
import { boardWithRun } from "../src/lib/endless-board.ts";

const board = (scores, me) => ({ date: null, total: scores.length, rows: scores.map(([name, score, rank]) => ({ name, score, rank, ...(name === me ? { me: true } : {}) })), me: null });
const view = (rows) => rows.map((r) => `${r.rank} ${r.name} ${r.score}`);

test("a run lands at its rank and everyone it beats moves down one", () => {
  const top = board([["A", 10, 1], ["B", 8, 2], ["C", 5, 3]]);
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 9, rank: 2 })), ["1 A 10", "2 You 9", "3 B 8", "4 C 5"]);
});

test("a tie shares the rank and is listed after whoever got there first", () => {
  const top = board([["A", 5, 1], ["B", 3, 2], ["C", 1, 3], ["D", 1, 3]]);
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 3, rank: 2 })), ["1 A 5", "2 B 3", "2 You 3", "4 C 1", "4 D 1"]);
});

test("a run below the top five goes under it", () => {
  const top = board([["A", 9, 1], ["B", 8, 2], ["C", 7, 3], ["D", 6, 4], ["E", 5, 5], ["F", 4, 6]]);
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 2, rank: 7 })), ["1 A 9", "2 B 8", "3 C 7", "4 D 6", "5 E 5", "7 You 2"]);
});

test("the player's earlier best is left out and the ranks under it close up", () => {
  const top = board([["A", 9, 1], ["Me", 8, 2], ["B", 6, 3]], "Me");
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 7, rank: 2 })), ["1 A 9", "2 You 7", "3 B 6"]);
});

test("no rank yet, or a 0 run: just the top five", () => {
  const top = board([["A", 9, 1], ["B", 8, 2]]);
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 3, rank: null })), ["1 A 9", "2 B 8"]);
  assert.deepEqual(view(boardWithRun(top, { name: "You", score: 0, rank: 3 })), ["1 A 9", "2 B 8"]);
});
