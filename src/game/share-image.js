/**
 * Generate a shareable result card as a canvas image.
 *
 * Returns a HTMLCanvasElement (1200x630 — OG-image friendly).
 */

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatTime(ms) {
  if (!Number.isFinite(ms)) return "--";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatScore(value) {
  return new Intl.NumberFormat("sv-SE").format(Math.round(value));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function generateShareImage({ date, score, timeMs, levelCount, completedCount, undoCount, resetCount, hintCount }) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, "#0d1117");
  bgGrad.addColorStop(0.5, "#111820");
  bgGrad.addColorStop(1, "#0a0f14");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ── Subtle glow circles ──
  ctx.save();
  ctx.globalAlpha = 0.08;
  const glowGrad = ctx.createRadialGradient(300, 200, 0, 300, 200, 350);
  glowGrad.addColorStop(0, "#5ec7ff");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glowGrad2 = ctx.createRadialGradient(900, 450, 0, 900, 450, 300);
  glowGrad2.addColorStop(0, "#ffd766");
  glowGrad2.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad2;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.restore();

  // ── Border ──
  ctx.strokeStyle = "#1e2a35";
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, CARD_WIDTH - 2, CARD_HEIGHT - 2, 24);
  ctx.stroke();

  // ── Header ──
  ctx.fillStyle = "#5ec7ff";
  ctx.font = "bold 22px 'Oxanium', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ONE STROKE", 60, 60);

  ctx.fillStyle = "#5a6a7a";
  ctx.font = "16px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Hamiltonian Path Puzzle", 60, 88);

  // ── Date badge ──
  ctx.fillStyle = "#1a2633";
  roundRect(ctx, 60, 115, 320, 44, 10);
  ctx.fill();
  ctx.strokeStyle = "#253545";
  ctx.lineWidth = 1;
  roundRect(ctx, 60, 115, 320, 44, 10);
  ctx.stroke();
  ctx.fillStyle = "#8aafcc";
  ctx.font = "bold 18px 'Oxanium', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Dagens utmaning — ${formatDate(date)}`, 220, 143);

  // ── Main score ──
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8f0f8";
  ctx.font = "bold 88px 'Oxanium', sans-serif";
  ctx.fillText(formatScore(score), CARD_WIDTH / 2, 270);

  ctx.fillStyle = "#5a6a7a";
  ctx.font = "20px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("POÄNG", CARD_WIDTH / 2, 300);

  // ── Stats row ──
  const stats = [
    { label: "TID", value: formatTime(timeMs) },
    { label: "KLARA", value: `${completedCount}/${levelCount}` },
    { label: "UNDO", value: String(undoCount) },
    { label: "RESET", value: String(resetCount) },
    { label: "HINT", value: String(hintCount) },
  ];

  const statY = 360;
  const statSpacing = CARD_WIDTH / (stats.length + 1);

  for (let i = 0; i < stats.length; i++) {
    const x = statSpacing * (i + 1);

    // Stat card background
    ctx.fillStyle = "#141c24";
    roundRect(ctx, x - 70, statY - 15, 140, 80, 10);
    ctx.fill();
    ctx.strokeStyle = "#1e2a35";
    ctx.lineWidth = 1;
    roundRect(ctx, x - 70, statY - 15, 140, 80, 10);
    ctx.stroke();

    ctx.fillStyle = "#e0ecf5";
    ctx.font = "bold 32px 'Oxanium', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(stats[i].value, x, statY + 25);

    ctx.fillStyle = "#4a6a80";
    ctx.font = "13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(stats[i].label, x, statY + 52);
  }

  // ── CTA ──
  const ctaGrad = ctx.createLinearGradient(0, 490, 0, 540);
  ctaGrad.addColorStop(0, "#5ec7ff");
  ctaGrad.addColorStop(1, "#3aa0e0");
  ctx.fillStyle = "#1a2633";
  roundRect(ctx, 300, 480, 600, 56, 28);
  ctx.fill();

  ctx.fillStyle = "#d0e8f8";
  ctx.font = "bold 22px 'Oxanium', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Kan du slå mig? Prova dagens utmaning!", CARD_WIDTH / 2, 515);

  // ── Footer ──
  ctx.fillStyle = "#2a3a4a";
  ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("onestroke.gamevolt.io", CARD_WIDTH - 60, CARD_HEIGHT - 30);

  return canvas;
}

export async function shareResult(canvas, { date }) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], `one-stroke-daily-${date}.png`, { type: "image/png" });

  // Try Web Share API (mobile)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "One Stroke — Dagens utmaning",
        text: `Jag klarade dagens utmaning i One Stroke! Kan du slå mig?`,
        files: [file],
      });
      return "shared";
    } catch {
      // User cancelled or error — fall through to download
    }
  }

  // Fallback: download image
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
