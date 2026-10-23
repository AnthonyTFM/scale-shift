// Little rewards for the daily challenge: a phone buzz and, on a perfect round, a burst of confetti.
// No libraries. Haptics only work where the browser allows vibration (Android); iPhones ignore it quietly.

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A short vibration: a number of milliseconds, or an on/off pattern. */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported: no buzz */
  }
}

// the game palette: primary blue, red, green, gold and the shape blue
const COLORS = ["#2563EB", "#D93A2B", "#21B26B", "#FFC233", "#2F6BFF", "#FF5B4A"];

/** About 1.5 seconds of confetti falling from the top of the screen. Skipped when the player prefers less motion. */
export function confetti() {
  if (typeof document === "undefined" || reducedMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60";
  document.body.appendChild(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = (canvas.width = Math.round(innerWidth * dpr));
  const h = (canvas.height = Math.round(innerHeight * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  const bits = Array.from({ length: 140 }, () => ({
    x: w * (0.15 + Math.random() * 0.7),
    y: -20 * dpr - Math.random() * h * 0.3,
    vx: (Math.random() - 0.5) * 9 * dpr,
    vy: (2 + Math.random() * 5) * dpr,
    size: (6 + Math.random() * 6) * dpr,
    spin: Math.random() * Math.PI,
    turn: (Math.random() - 0.5) * 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / 1600;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.7) / 0.3);
    for (const b of bits) {
      b.vy += 0.18 * dpr;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.spin += b.turn;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
