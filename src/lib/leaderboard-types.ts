// Shapes of the leaderboard API responses, shared by the server route and the browser.

export type DayRow = { rank: number; name: string; score: number; me?: boolean };
export type DayBoard = { date: string; total: number; rows: DayRow[]; me?: DayRow | null };

export type AllTimeRow = { rank: number; name: string; points: number; days: number; average: number; me?: boolean };
export type AllTimeBoard = { total: number; rows: AllTimeRow[]; me?: AllTimeRow | null };
/** Monday to Sunday (UTC dates). Rows use the all-time shape: points, days played and average. */
export type WeekBoard = AllTimeBoard & { start: string; end: string };

export type SubmitResult =
  | { ok: true; score: number; rank: number; total: number; duplicate: boolean; player?: { id: string; name: string } }
  | { ok: false; error: string; field?: "name" | "email" };

/** Endless mode's best streaks, for one day (`date`) or of all time (`date` null). `score` is the streak. */
export type EndlessBoard = { date: string | null; total: number; rows: DayRow[]; me?: DayRow | null };
/** Posting an endless run also says where the player's best stands of all time. */
export type EndlessSubmitResult =
  | (Extract<SubmitResult, { ok: true }> & { best: number; allRank: number; allTotal: number })
  | Extract<SubmitResult, { ok: false }>;
