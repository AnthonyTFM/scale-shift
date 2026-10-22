// The daily result as a picture (1080 × 1350, the shape Instagram and most chats show best), drawn in the browser.

import { site } from "@/content/site";

type Result = { day: number; score: number; marks: boolean[]; title: string; verdict: string; streak: number };

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

  // Daylight Arcade: cream page, our globe rising in the corner, a white card with the score
  ctx.fillStyle = "#FFF8EC";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, W * 0.8);
  glow.addColorStop(0, "rgba(37,99,235,0.16)");
  glow.addColorStop(1, "rgba(37,99,235,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const globe = await loadImage("/globe-still.svg");
  if (globe) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(globe, W * 0.5, -H * 0.08, W * 0.7, W * 0.7);
    ctx.globalAlpha = 1;
  }

  const left = 96;
  // the logo mark: blue rounded square with two white bracket corners
  roundRect(ctx, left, 96, 72, 72, 20);
  ctx.fillStyle = "#2563EB";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(left + 19, 96 + 34);
  ctx.lineTo(left + 19, 96 + 19);
  ctx.lineTo(left + 34, 96 + 19);
  ctx.moveTo(left + 53, 96 + 38);
  ctx.lineTo(left + 53, 96 + 53);
  ctx.lineTo(left + 38, 96 + 53);
  ctx.stroke();
  ctx.fillStyle = "#1D2140";
  ctx.font = `800 46px ${display}`;
  ctx.fillText(site.name, left + 92, 148);

  // the card
  const cardY = 250;
  const cardH = 820;
  roundRect(ctx, left - 24, cardY + 14, W - (left - 24) * 2, cardH, 44);
  ctx.fillStyle = "#E8DFCF";
  ctx.fill();
  roundRect(ctx, left - 24, cardY, W - (left - 24) * 2, cardH, 44);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#E8DFCF";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#2563EB";
  ctx.font = `800 34px ${body}`;
  ctx.fillText(`DAILY #${r.day} · WHICH IS BIGGER?`, W / 2, cardY + 90);
  // the score, big, with a blue slash
  ctx.font = `800 250px ${display}`;
  const a = String(r.score);
  const slash = "/";
  const b = String(r.marks.length);
  const wa = ctx.measureText(a).width;
  const ws = ctx.measureText(slash).width;
  const wb = ctx.measureText(b).width;
  let x = W / 2 - (wa + ws + wb) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = "#1D2140";
  ctx.fillText(a, x, cardY + 330);
  x += wa;
  ctx.fillStyle = "#2563EB";
  ctx.fillText(slash, x, cardY + 330);
  x += ws;
  ctx.fillStyle = "#1D2140";
  ctx.fillText(b, x, cardY + 330);
  ctx.textAlign = "center";
  ctx.font = `800 64px ${display}`;
  ctx.fillText(r.title, W / 2, cardY + 430);

  // one pressed tile per question
  const size = 128;
  const gap = 24;
  const startX = W / 2 - (r.marks.length * size + (r.marks.length - 1) * gap) / 2;
  r.marks.forEach((right, i) => {
    const tx = startX + i * (size + gap);
    const ty = cardY + 490;
    roundRect(ctx, tx, ty + 10, size, size, 30);
    ctx.fillStyle = right ? "#16804C" : "#A82A1E";
    ctx.fill();
    roundRect(ctx, tx, ty, size, size, 30);
    ctx.fillStyle = right ? "#21B26B" : "#D93A2B";
    ctx.fill();
    ctx.fillStyle = right ? "#1D2140" : "#ffffff";
    ctx.font = `800 70px ${body}`;
    ctx.fillText(right ? "✓" : "✕", tx + size / 2, ty + size / 2 + 25);
  });

  ctx.fillStyle = "#5D6280";
  ctx.font = `500 38px ${body}`;
  const verdict = wrap(ctx, r.verdict, W - left * 2 - 40);
  verdict.forEach((line, i) => ctx.fillText(line, W / 2, cardY + 720 + i * 50));
  if (r.streak > 1) {
    ctx.fillStyle = "#1D2140";
    ctx.font = `800 36px ${body}`;
    ctx.fillText(`🔥 ${r.streak}-day streak`, W / 2, cardY + 720 + verdict.length * 50 + 20);
  }

  // call to action: a blue pressable button
  roundRect(ctx, left, 1150 + 12, W - left * 2, 120, 32);
  ctx.fillStyle = "#1A47B0";
  ctx.fill();
  roundRect(ctx, left, 1150, W - left * 2, 120, 32);
  ctx.fillStyle = "#2563EB";
  ctx.fill();
  // two lines, each shrunk to fit the button: a long address (preview links) never runs past its edges
  const fit = (text: string, weight: number, px: number, font: string, y: number) => {
    const max = W - left * 2 - 64;
    ctx.font = `${weight} ${px}px ${font}`;
    const w = ctx.measureText(text).width;
    if (w > max) ctx.font = `${weight} ${Math.floor((px * max) / w)}px ${font}`;
    ctx.fillText(text, W / 2, y);
  };
  ctx.fillStyle = "#ffffff";
  fit("Can you beat me?", 800, 46, display, 1150 + 58);
  ctx.fillStyle = "#DCE7FF";
  fit(`${location.host}/daily`, 600, 32, body, 1150 + 98);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
