// Little game sounds, made in the browser from the notes in src/lib/sound-cues.ts (no audio files to download).
// On by default (Anthony, Oct 22); a player who turns them off stays off. The choice is remembered in this browser.
// Browsers only allow sound after a tap on the page: a tap on the homepage counts once the game page opens from it,
// so the start sound plays then; on a page opened straight from the address bar, the first sound is the first answer.
import { CUES, type Cue } from "./sound-cues";

export type { Cue };

const KEY = "ss-sound";

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
// this visit's choice, so turning sound off works even where storage is blocked
let chosen: boolean | null = null;

export function soundOn() {
  if (chosen !== null) return chosen;
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  chosen = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* storage blocked: the choice lasts until the page is closed */
  }
  if (on) play("tap", true);
}

export function play(cue: Cue, force = false) {
  if (!force && !soundOn()) return;
  // nothing can play before the first tap, and a sound queued now would come out at that tap instead: skip it
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation && !activation.hasBeenActive) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "running") return schedule(ctx, cue);
    // iPhones pause audio after a call or a trip to another app: wake it, and play unless that took too long
    const asked = Date.now();
    const c = ctx;
    void c.resume()
      .then(() => Date.now() - asked < 800 && schedule(c, cue))
      .catch(() => {});
  } catch {
    /* no audio available */
  }
}

function schedule(ctx: AudioContext, cue: Cue) {
  const t0 = ctx.currentTime + 0.005;
  for (const v of CUES[cue]) {
    const on = t0 + v.at;
    const off = on + v.len;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, on);
    gain.gain.exponentialRampToValueAtTime(v.gain, on + (v.attack ?? 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, off);
    let source: AudioScheduledSourceNode;
    if (v.wave === "noise") {
      const s = ctx.createBufferSource();
      s.buffer = noise ??= makeNoise(ctx);
      source = s;
    } else {
      const o = ctx.createOscillator();
      o.type = v.wave;
      o.frequency.setValueAtTime(v.f, on);
      if (v.to) o.frequency.exponentialRampToValueAtTime(v.to, off);
      source = o;
    }
    let node: AudioNode = source;
    if (v.cut) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.7;
      filter.frequency.setValueAtTime(v.cut, on);
      if (v.cutTo) filter.frequency.exponentialRampToValueAtTime(v.cutTo, off);
      node.connect(filter);
      node = filter;
    }
    node.connect(gain).connect(ctx.destination);
    source.start(on);
    source.stop(off + 0.03);
  }
}

/** One second of white noise, made once. */
function makeNoise(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
