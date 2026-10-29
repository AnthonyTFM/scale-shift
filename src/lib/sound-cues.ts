// The game's sounds, written as notes for a tiny synth: the browser plays them (src/lib/sound.ts) and
// scripts/qa/render-sounds.mjs writes the same notes as WAV files to listen to before shipping. No audio files to
// download. Soft, rounded tones (sine with a quiet overtone, like a marimba or a bell), never a buzz.

export type Wave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

export type Voice = {
  wave: Wave;
  /** pitch in Hz (noise ignores it), sliding to `to` over the note when set */
  f: number;
  to?: number;
  /** start and length, in seconds */
  at: number;
  len: number;
  /** peak loudness, 0 to 1 */
  gain: number;
  /** fade-in, in seconds (default 0.004: a clean strike) */
  attack?: number;
  /** low-pass filter cutoff in Hz, sliding to `cutTo` when set (noise needs one, or it's a hiss) */
  cut?: number;
  cutTo?: number;
};

export type Cue = "start" | "tap" | "right" | "wrong" | "perfect" | "milestone";

/** A bell: the note plus a quiet overtone that dies away faster. */
const bell = (f: number, at: number, len: number, gain: number): Voice[] => [
  { wave: "sine", f, at, len, gain },
  { wave: "sine", f: f * 3, at, len: Math.min(len, 0.09), gain: gain * 0.22 },
];

export const CUES: Record<Cue, Voice[]> = {
  // "ready, go": a soft rising swoosh under two quick bell notes going up (E5 to B5)
  start: [
    { wave: "noise", f: 0, at: 0, len: 0.24, gain: 0.035, attack: 0.06, cut: 500, cutTo: 5000 },
    ...bell(659, 0.02, 0.12, 0.16),
    ...bell(988, 0.13, 0.32, 0.18),
  ],
  // a light wooden "tok" (sound switched on, small taps)
  tap: [
    { wave: "noise", f: 0, at: 0, len: 0.014, gain: 0.05, cut: 3500 },
    { wave: "sine", f: 540, to: 420, at: 0, len: 0.08, gain: 0.18 },
  ],
  // a bright "ding-ding" going up (G5 to D6), with a tiny click for a crisp strike
  right: [
    { wave: "noise", f: 0, at: 0, len: 0.01, gain: 0.03, cut: 4000 },
    ...bell(784, 0, 0.14, 0.2),
    ...bell(1175, 0.1, 0.32, 0.18),
  ],
  // a soft low "womp womp": two notes sliding down, no harsh buzz
  wrong: [
    { wave: "sine", f: 220, to: 185, at: 0, len: 0.2, gain: 0.16, attack: 0.01 },
    { wave: "triangle", f: 110, to: 92, at: 0, len: 0.2, gain: 0.05, attack: 0.01 },
    { wave: "sine", f: 175, to: 140, at: 0.17, len: 0.3, gain: 0.15, attack: 0.01 },
    { wave: "triangle", f: 87, to: 70, at: 0.17, len: 0.3, gain: 0.05, attack: 0.01 },
  ],
  // a streak milestone in endless mode (5, 10, 25, past your best): "right" with a third bell on top and a sparkle
  milestone: [
    { wave: "noise", f: 0, at: 0, len: 0.01, gain: 0.03, cut: 4000 },
    ...bell(784, 0, 0.14, 0.18),
    ...bell(1175, 0.1, 0.16, 0.18),
    ...bell(1568, 0.2, 0.4, 0.2),
    { wave: "sine", f: 3136, at: 0.26, len: 0.3, gain: 0.04 },
  ],
  // a perfect round or a new best: a rising bell run (C5 E5 G5 C6) with a sparkle on top
  perfect: [
    ...bell(523, 0, 0.16, 0.17),
    ...bell(659, 0.09, 0.16, 0.17),
    ...bell(784, 0.18, 0.16, 0.18),
    ...bell(1047, 0.27, 0.6, 0.2),
    { wave: "sine", f: 2093, at: 0.34, len: 0.25, gain: 0.045 },
    { wave: "sine", f: 2637, at: 0.44, len: 0.35, gain: 0.04 },
  ],
};
