// Prints feedback form submissions.  Run: npm run leads
// Reads the live inbox in Redis when the Upstash settings are available (in .env.local or the shell, the same ones the
// leaderboard uses), otherwise the local file data/submissions.json.
import fs from "node:fs";
import path from "node:path";

// process.loadEnvFile needs Node 20.12+; on older Node set the Upstash settings in the shell instead
for (const f of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile !== "function") break;
  try {
    process.loadEnvFile(f);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let list;
if (url && token) {
  const res = await fetch(`${url.replace(/\/$/, "")}/lrange/fb:inbox/0/49`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  const { result } = await res.json();
  // stored newest first; print oldest first like the file
  list = (result ?? []).map((s) => JSON.parse(s)).reverse();
  console.log(`From Redis (fb:inbox), newest 50:`);
} else {
  const file = path.join(process.cwd(), "data", "submissions.json");
  if (!fs.existsSync(file)) {
    console.log("No submissions yet (data/submissions.json does not exist, and no Redis settings were found).");
    process.exit(0);
  }
  list = JSON.parse(fs.readFileSync(file, "utf8")).slice(-50);
}
console.log(`${list.length} submission(s)\n`);
for (const s of list) {
  console.log(`— ${s.receivedAt}  [${s.topic}]  ${s.region || ""} ${s.era ? `(${s.era})` : ""}`);
  console.log(`  ${s.message.replace(/\n/g, "\n  ")}`);
  if (s.source) console.log(`  source: ${s.source}`);
  if (s.email || s.name) console.log(`  from: ${s.name || ""} <${s.email || "no email"}>`);
  console.log("");
}
