// Little game sounds for the daily challenge, made in the browser (no audio files to download).
// Off unless the player turns them on; the choice is remembered in this browser.

const KEY = "ss-sound";
type Cue = "tap" | "right" | "wrong" | "perfect";
// [frequency Hz, start s, length s]
const NOTES: Record<Cue, [number, number, number][]> = {
  tap: [[660, 0, 0.05]],
  right: [
    [660, 0, 0.09],
    [990, 0.09, 0.16],
  ],
  wrong: [
    [233, 0, 0.16],
    [175, 0.13, 0.22],
  ],
  perfect: [
    [523, 0, 0.1],
    [659, 0.1, 0.1],
    [784, 0.2, 0.1],
    [1047, 0.3, 0.3],
  ],
};

let ctx: AudioContext | null = null;

export function soundOn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* storage blocked: sound stays off next visit */
  }
  if (on) play("tap", true);
}

export function play(cue: Cue, force = false) {
  if (!force && !soundOn()) return;
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    const loud = cue === "wrong" ? 0.07 : 0.12;
    for (const [freq, start, len] of NOTES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cue === "wrong" ? "sawtooth" : "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + start);
      gain.gain.exponentialRampToValueAtTime(loud, t0 + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + len);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + start);
      osc.stop(t0 + start + len + 0.02);
    }
  } catch {
    /* no audio available */
  }
}
