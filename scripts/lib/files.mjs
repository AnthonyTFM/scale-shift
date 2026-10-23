// Writing data files on Windows: a file written a moment ago can be briefly held (a virus scan of the last write), and
// the build rewrites each era file several times in a row. Used by build-data.mjs and the steps after it.

import fs from "node:fs";

/** Writes a file, waiting and trying again a few times if Windows briefly holds it. */
export function writeFileRetrying(file, text) {
  for (let tries = 1; ; tries++) {
    try {
      return fs.writeFileSync(file, text);
    } catch (err) {
      if (tries >= 10) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
