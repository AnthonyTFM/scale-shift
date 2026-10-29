import type { DayRow, EndlessBoard } from "./leaderboard-types";

/**
 * The Best streaks top five with a run that isn't posted slotted in where it would land (`rank`, from
 * /api/endless?place=…), or added under the five when it lands further down. The player's own earlier best is left
 * out, as `rank` counts without it and this run would replace it. With no rank (still loading, failed, or a 0 run),
 * just the top five.
 */
export function boardWithRun(top: EndlessBoard, run: { name: string; score: number; rank: number | null | undefined }): DayRow[] {
  const mine = top.me ?? top.rows.find((r) => r.me);
  // everyone else, ranked as if the player's earlier best weren't there
  const others = top.rows.filter((r) => !r.me).map((r) => ({ ...r, rank: r.rank - (mine && mine.score > r.score ? 1 : 0) }));
  if (!(run.score > 0 && run.rank)) return others.slice(0, 5);
  // after everyone tied with it (whoever got there first is listed first); everyone it beats moves down one
  const row = { rank: run.rank, name: run.name, score: run.score, me: true };
  const at = others.filter((r) => r.score >= run.score).length;
  const below = others.slice(at).map((r) => ({ ...r, rank: r.rank + 1 }));
  return at < 5 ? [...others.slice(0, at), row, ...below].slice(0, 5) : [...others.slice(0, 5), row];
}
