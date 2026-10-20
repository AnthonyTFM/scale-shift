// The daily result as a picture (1080 × 1350, the shape Instagram and most chats show best), drawn in the browser.

import { site } from "@/content/site";

type Result = { day: number; score: number; marks: boolean[]; verdict: string; streak: number };

const W = 1080;
const H = 1350;

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Wraps text to the given width and returns the lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function resultImage(r: Result): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // the site's own fonts, so the card matches the page
  const display = getComputedStyle(document.querySelector(".font-display") ?? document.body).fontFamily || "Georgia, serif";
  const body = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  await document.fonts?.ready;

  // deep ocean background with our globe rising in the corner
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0e2a47");
  bg.addColorStop(1, "#0a1f36");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, H * 0.3, 0, W * 0.8, H * 0.3, W * 0.7);
  glow.addColorStop(0, "rgba(84,160,214,0.35)");
  glow.addColorStop(1, "rgba(84,160,214,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const globe = await loadImage("/globe-still.svg");
  if (globe) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(globe, W * 0.42, -H * 0.06, W * 0.85, W * 0.85);
    ctx.globalAlpha = 1;
  }

  const left = 96;
  ctx.fillStyle = "#FFB547";
  ctx.font = `700 40px ${display}`;
  ctx.fillText(site.name, left, 150);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 34px ${body}`;
  ctx.fillText(`Daily challenge #${r.day} · Which is bigger?`, left, 210);

  // the score, big
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 260px ${display}`;
  ctx.fillText(`${r.score}/${r.marks.length}`, left - 8, 520);

  // one tile per question
  const size = 132;
  const gap = 26;
  r.marks.forEach((right, i) => {
    const x = left + i * (size + gap);
    roundRect(ctx, x, 590, size, size, 26);
    ctx.fillStyle = right ? "#1FA37A" : "#E8366B";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 72px ${body}`;
    ctx.textAlign = "center";
    ctx.fillText(right ? "✓" : "✕", x + size / 2, 590 + size / 2 + 26);
    ctx.textAlign = "left";
  });

  // verdict and streak
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 52px ${display}`;
  wrap(ctx, r.verdict, W - left * 2).forEach((line, i) => ctx.fillText(line, left, 850 + i * 66));
  if (r.streak > 1) {
    ctx.fillStyle = "#FFB547";
    ctx.font = `700 40px ${body}`;
    ctx.fillText(`🔥 ${r.streak}-day streak`, left, 1010);
  }

  // call to action
  roundRect(ctx, left, 1110, W - left * 2, 140, 32);
  ctx.fillStyle = "#FFB547";
  ctx.fill();
  ctx.fillStyle = "#0e2a47";
  ctx.font = `700 46px ${body}`;
  ctx.fillText("Can you beat me?", left + 48, 1172);
  ctx.font = `500 34px ${body}`;
  ctx.fillText(`${location.host}/daily`, left + 48, 1222);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
