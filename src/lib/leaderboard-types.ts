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

/** /api/leaderboard/link: making a code on the device that joined, or using it on another device. */
export type LinkResult =
  | { ok: true; code: string; expiresIn: number }
  | { ok: true; player: { id: string; name: string; reminders: boolean }; days: Record<string, { c: number[]; s: number }> }
  | { ok: false; error: string };
