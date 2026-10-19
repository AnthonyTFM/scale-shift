// Shapes of the leaderboard API responses, shared by the server route and the browser.

export type DayRow = { rank: number; name: string; score: number; me?: boolean };
export type DayBoard = { date: string; total: number; rows: DayRow[]; me?: DayRow | null };

export type AllTimeRow = { rank: number; name: string; points: number; days: number; average: number; me?: boolean };
export type AllTimeBoard = { total: number; rows: AllTimeRow[]; me?: AllTimeRow | null };
/** Monday to Sunday (UTC dates). Rows use the all-time shape: points, days played and average. */
export type WeekBoard = AllTimeBoard & { start: string; end: string };

export type SubmitResult =
  | { ok: true; score: number; rank: number; total: number; duplicate: boolean }
  | { ok: false; error: string; field?: "name" | "email" };
