// Writes the game's sounds (src/lib/sound-cues.ts) as WAV files, so they can be heard before they ship: the same
// notes, envelopes, slides and filters the browser plays, rendered offline. Usage: node render-sounds.mjs [out-dir]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CUES } from "../../src/lib/sound-cues.ts";

const RATE = 44100;
const out = process.argv[2] || ".";
mkdirSync(out, { recursive: true });

// the same curve as Web Audio's exponentialRampToValueAtTime
const ramp = (from, to, k) => from * Math.pow(to / from, Math.min(1, Math.max(0, k)));

// a seeded noise source, so a render is the same every time
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

/** Web Audio's low-pass biquad (RBJ cookbook), coefficients refreshed as the cutoff slides. */
function lowpass(cut) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (f) => {
    const w = (2 * Math.PI * Math.min(f, RATE / 2 - 1)) / RATE;
    const alpha = Math.sin(w) / (2 * 0.7);
    const c = Math.cos(w);
    const a0 = 1 + alpha;
    b0 = (1 - c) / 2 / a0;
    b1 = (1 - c) / a0;
    b2 = b0;
    a1 = (-2 * c) / a0;
    a2 = (1 - alpha) / a0;
  };
  set(cut);
  return {
    set,
    run(x) {
      const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
  };
}

function render(voices) {
  const total = Math.max(...voices.map((v) => v.at + v.len)) + 0.1;
  const mix = new Float64Array(Math.ceil(total * RATE));
  for (const v of voices) {
    const start = Math.round(v.at * RATE);
    const n = Math.round((v.len + 0.03) * RATE);
    const attack = v.attack ?? 0.004;
    const filter = v.cut ? lowpass(v.cut) : null;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      const k = t / v.len;
      // the envelope: a quick exponential rise, then an exponential fall to silence at the note's end
      const env = t < attack ? ramp(0.0001, v.gain, t / attack) : ramp(v.gain, 0.0001, (t - attack) / (v.len - attack));
      let x;
      if (v.wave === "noise") x = rand();
      else {
        const f = v.to ? ramp(v.f, v.to, k) : v.f;
        phase = (phase + f / RATE) % 1;
        x =
          v.wave === "sine" ? Math.sin(2 * Math.PI * phase)
          : v.wave === "triangle" ? 4 * Math.abs(phase - 0.5) - 1
          : v.wave === "square" ? (phase < 0.5 ? 1 : -1)
          : 2 * phase - 1;
      }
      if (filter) {
        if (v.cutTo && i % 32 === 0) filter.set(ramp(v.cut, v.cutTo, k));
        x = filter.run(x);
      }
      if (start + i < mix.length) mix[start + i] += x * env;
    }
  }
  return mix;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.tanh(samples[i]) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

for (const [name, voices] of Object.entries(CUES)) {
  const samples = render(voices);
  writeFileSync(join(out, `${name}.wav`), wav(samples));
  const peak = Math.max(...samples.map(Math.abs));
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)}s  peak ${peak.toFixed(2)}`);
}
