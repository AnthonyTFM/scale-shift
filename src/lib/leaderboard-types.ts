// Shapes of the leaderboard API responses, shared by the server route and the browser.

export type DayRow = { rank: number; name: string; score: number; me?: boolean };
export type DayBoard = { date: string; total: number; rows: DayRow[]; me?: DayRow | null };

export type AllTimeRow = { rank: number; name: string; points: number; days: number; average: number; me?: boolean };
export type AllTimeBoard = { total: number; rows: AllTimeRow[]; me?: AllTimeRow | null };
/** Monday to Sunday (UTC dates). Rows use the all-time shape: points, days played and average. */
export type WeekBoard = AllTimeBoard & { start: string; end: string };

export type SubmitResult =
  | { ok: true; score: number; rank: number; total: number; duplicate: boolean; player?: { id: string; name: string | null } }
  | { ok: false; error: string; field?: "name" | "email" };

/** Endless mode's best streaks, for one day (`date`) or of all time (`date` null). `score` is the streak. */
export type EndlessBoard = { date: string | null; total: number; rows: DayRow[]; me?: DayRow | null };
/** Where an endless streak would rank of all time, and the next score up with the place one more than it takes. */
export type EndlessPlace = { rank: number; next: { score: number; place: number } | null };
/** Posting an endless run answers with the player's best streak of all time (`score`) and its rank of all time. */
export type EndlessSubmitResult = SubmitResult;
