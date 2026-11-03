import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeHash, challengePath, parseChallengeSegment, parseChallengeUrl, tidyName } from "../src/lib/challenge-link.ts";

test("a challenge link is a path with the day, the score and an optional name", () => {
  assert.equal(challengePath(16, 3, "Anthony"), "/d/16.3.Anthony");
  assert.equal(challengePath(16, 3, null), "/d/16.3");
  assert.equal(challengePath(16, 3, "  Mary Ann  "), "/d/16.3.Mary%20Ann");
  assert.equal(challengePath(16, 3, "<script>"), "/d/16.3", "a name that isn't a plain name is left off");
  assert.equal(challengeHash(16, 3, "Anthony"), "#c=16.3.Anthony");
});

test("the address part reads back, with bad names blanked and bad days or scores refused", () => {
  assert.deepEqual(parseChallengeSegment("16.3.Anthony"), { day: 16, score: 3, name: "Anthony" });
  assert.deepEqual(parseChallengeSegment("16.3"), { day: 16, score: 3, name: "" });
  assert.deepEqual(parseChallengeSegment("16.3.Mary%20Ann"), { day: 16, score: 3, name: "Mary Ann" });
  assert.deepEqual(parseChallengeSegment("16.3.Mr.%20T"), { day: 16, score: 3, name: "Mr. T" }, "dots in a name");
  assert.deepEqual(parseChallengeSegment("16.3.%E0%A4%A"), { day: 16, score: 3, name: "" }, "malformed encoding");
  assert.equal(parseChallengeSegment("16.6"), null);
  assert.equal(parseChallengeSegment("0.3"), null);
  assert.equal(parseChallengeSegment("abc.3"), null);
  assert.equal(parseChallengeSegment("16"), null);
  assert.equal(parseChallengeSegment(""), null);
  assert.equal(parseChallengeSegment(undefined), null);
});

test("a page address is read either way: the new path, or the old #c= link", () => {
  assert.deepEqual(parseChallengeUrl("/d/16.3.Anthony", ""), { day: 16, score: 3, name: "Anthony" });
  assert.deepEqual(parseChallengeUrl("/d/16.3/", ""), { day: 16, score: 3, name: "" });
  assert.deepEqual(parseChallengeUrl("/daily", "#c=16.3.Anthony"), { day: 16, score: 3, name: "Anthony" });
  assert.deepEqual(parseChallengeUrl("/daily", "#c=16.3."), { day: 16, score: 3, name: "" });
  assert.equal(parseChallengeUrl("/daily", ""), null);
  assert.equal(parseChallengeUrl("/d/", ""), null);
  assert.equal(parseChallengeUrl("/d/16.3/x", ""), null);
});

test("names are tidied: spaces squeezed, 16 characters at most, plain characters only", () => {
  assert.equal(tidyName("  Sam   Jones "), "Sam Jones");
  assert.equal(tidyName("Abcdefghijklmnopqrstuvwxyz"), "Abcdefghijklmnop");
  assert.equal(tidyName("-dash"), "");
  assert.equal(tidyName("Émilie"), "Émilie");
  assert.equal(tidyName(""), "");
});
