import { test } from "node:test";
import assert from "node:assert/strict";
import { RUN_MAX, runStandingOf } from "../src/lib/plays.ts";

test("a run's standing counts the shorter ended runs, with the overflow bucket never below", () => {
  const raw = { n: 10, r0: 3, r1: 2, r5: 4, rx: 1 };
  assert.deepEqual(runStandingOf(raw, 0), { runs: 10, below: 0 });
  assert.deepEqual(runStandingOf(raw, 1), { runs: 10, below: 3 });
  assert.deepEqual(runStandingOf(raw, 6), { runs: 10, below: 9 });
  assert.deepEqual(runStandingOf(raw, RUN_MAX + 1), { runs: 10, below: 9 }, "runs past RUN_MAX are never 'shorter'");
  assert.deepEqual(runStandingOf({}, 7), { runs: 0, below: 0 });
});
