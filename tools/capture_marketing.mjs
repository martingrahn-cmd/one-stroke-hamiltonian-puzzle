import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(process.cwd(), "assets/marketing");

async function ensureOutputDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function prepHUD(page) {
  await page.waitForSelector("#board .tile", { timeout: 15000 });
  await page.evaluate(() => {
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("score", "12840");
    setText("level", "7 / 10");
    setText("moves", "14");
    setText("combo", "x2.4");
    setText("feverState", "Nära!");
    setText("feverPercent", "86%");
    setText("feverTurns", "2 drag boost");
    setText("dailyStreak", "Streak 6");
    setText("dailyTask", "Samla Sakura ❀ x23 idag.");
    setText("dailyCount", "18/23");
    setText("dailyReward", "Belöning: +2 drag, +690 score, +20% FEVER");
    setText("status", "Combo chain x4! Linjeattack laddad.");

    const feverFill = document.getElementById("feverFill");
    if (feverFill) feverFill.style.width = "86%";
    const feverMeter = document.getElementById("feverMeter");
    if (feverMeter) feverMeter.setAttribute("aria-valuenow", "86");

    const dailyFill = document.getElementById("dailyFill");
    if (dailyFill) dailyFill.style.width = "78%";
    const dailyProgress = document.getElementById("dailyProgress");
    if (dailyProgress) dailyProgress.setAttribute("aria-valuenow", "78");

    const goals = [...document.querySelectorAll("#goalsList li")];
    if (goals[0]) goals[0].textContent = "Klar: Score 5600/5600";
    if (goals[1]) goals[1].textContent = "Samla Sakura ❀ 9/12";
    if (goals[2]) goals[2].textContent = "Rensa Panel Frame 4/8";
  });
}

async function captureDesktop(page) {
  await page.setViewportSize({ width: 1728, height: 1117 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await prepHUD(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "screenshot-desktop.png"),
    fullPage: true,
  });
}

async function captureAction(page) {
  await page.setViewportSize({ width: 1728, height: 1117 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await prepHUD(page);
  await page.evaluate(() => {
    document.querySelector(".hud-panel")?.classList.add("fever-on");
    document.querySelector(".board-panel")?.classList.add("fever-on");
    const burst = document.getElementById("comboBurst");
    if (burst) {
      burst.textContent = "MEGA CHAIN x5";
      burst.classList.add("show");
    }
    const board = document.getElementById("board");
    board?.classList.add("impact-chain", "hit-flash");
  });
  await page.waitForTimeout(120);
  const boardPanel = page.locator(".board-panel");
  await boardPanel.screenshot({
    path: path.join(OUT_DIR, "screenshot-action.png"),
  });
}

async function captureMobile(page) {
  await page.setViewportSize({ width: 1170, height: 2532 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await prepHUD(page);
  await page.evaluate(() => {
    document.getElementById("status").textContent = "Mobilvy: tydlig HUD och brickor.";
  });
  await page.screenshot({
    path: path.join(OUT_DIR, "screenshot-mobile.png"),
    fullPage: true,
  });
}

async function captureOgImage(page) {
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await prepHUD(page);
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      .og-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(135deg, rgba(6, 12, 38, 0.66), rgba(6, 12, 38, 0.18) 52%, rgba(6, 12, 38, 0.72));
        z-index: 9999;
      }
      .og-copy {
        position: fixed;
        left: 44px;
        top: 34px;
        z-index: 10000;
        color: #fffaf0;
        text-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
        font-family: "Bangers", "Impact", sans-serif;
        letter-spacing: 1.4px;
      }
      .og-copy h2 {
        margin: 0;
        font-size: 78px;
        line-height: 0.95;
        font-weight: 400;
      }
      .og-copy p {
        margin: 10px 0 0;
        font-family: "M PLUS Rounded 1c", sans-serif;
        font-size: 26px;
        font-weight: 800;
      }
    `;
    document.head.append(style);

    const overlay = document.createElement("div");
    overlay.className = "og-overlay";
    const copy = document.createElement("div");
    copy.className = "og-copy";
    copy.innerHTML = "<h2>MANGA MATCH!</h2><p>Anime-stil. Snappy combos. 10 banor.</p>";
    document.body.append(overlay, copy);
  });

  await page.screenshot({
    path: path.join(OUT_DIR, "og-image.png"),
    fullPage: false,
  });
}

async function main() {
  await ensureOutputDir();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await captureDesktop(page);
    await captureAction(page);
    await captureMobile(page);
    await captureOgImage(page);
  } finally {
    await browser.close();
  }
  console.log(`Saved marketing assets to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
