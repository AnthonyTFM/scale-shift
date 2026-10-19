// Prints feedback form submissions saved in data/submissions.json.  Run: npm run leads
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "data", "submissions.json");
if (!fs.existsSync(file)) {
  console.log("No submissions yet (data/submissions.json does not exist).");
  process.exit(0);
}
const list = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`${list.length} submission(s)\n`);
for (const s of list.slice(-50)) {
  console.log(`— ${s.receivedAt}  [${s.topic}]  ${s.region || ""} ${s.era ? `(${s.era})` : ""}`);
  console.log(`  ${s.message.replace(/\n/g, "\n  ")}`);
  if (s.source) console.log(`  source: ${s.source}`);
  if (s.email || s.name) console.log(`  from: ${s.name || ""} <${s.email || "no email"}>`);
  console.log("");
}
