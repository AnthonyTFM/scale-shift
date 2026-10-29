// One line per day's puzzle: each question's kind, its two shape ids and which one is bigger. Shared by the history
// test and the script that records it.
import { buildQuestions } from "../src/lib/daily.ts";

export const puzzleKey = (pool, date) =>
  buildQuestions(pool, date)
    .map((q) => `${q.kind}:${q.options[0].id}/${q.options[1].id}>${q.answer}`)
    .join(" ");
