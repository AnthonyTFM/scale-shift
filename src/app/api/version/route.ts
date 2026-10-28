import { connection } from "next/server";

/** GET → { v }: the build that's live now. Open tabs compare it with their own to know a new version is out. */
export async function GET() {
  await connection();
  return Response.json({ v: process.env.BUILD_ID ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
