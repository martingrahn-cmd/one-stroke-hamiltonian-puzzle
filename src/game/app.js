import {
  CAMPAIGN_LEVELS,
  CAMPAIGN_TOTAL_LEVELS,
} from "../data/campaign-levels.js";
import { DIFFICULTY_META } from "../data/difficulty.js";
import {
  coordKey,
  directionBetweenKeys,
  getAllPlayableKeys,
  getBlockedSet,
  getNeighborKeys,
  getPlayableCount,
  inBounds,
  parseKey,
} from "../core/grid.js";
import { validateCampaignLevels } from "../core/level-integrity.js";
import { createMixedChallenge } from "./challenge-pool.js";
import { loadCampaignProgress, saveCampaignProgress } from "./storage.js";

const LEVEL_FORMAT_VERSION = 2;
const CHALLENGE_DIFFICULTY_MULTIPLIER = {
  easy: 1,
  medium: 1.25,
  hard: 1.6,
  "very-hard": 2.05,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function todaySeed() {
  return new Date().toISOString().slice(0, 10);
}

function toDisplayTime(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function toDisplayScore(value) {
  return new Intl.NumberFormat("sv-SE").format(Math.round(value));
}

export class OneStrokeApp {
  constructor() {
    this.validateCampaignData();

    this.boardEl = document.getElementById("board");
    this.levelNameEl = document.getElementById("levelName");
    this.levelLabelEl = document.getElementById("levelLabel");
    this.difficultyLabelEl = document.getElementById("difficultyLabel");
    this.campaignProgressLabelEl = document.getElementById("campaignProgressLabel");
    this.visitedLabelEl = document.getElementById("visitedLabel");
    this.remainingLabelEl = document.getElementById("remainingLabel");
    this.phaseLabelEl = document.getElementById("phaseLabel");
    this.statusBoxEl = document.getElementById("statusBox");
    this.levelListEl = document.getElementById("levelList");
    this.undoBtn = document.getElementById("undoBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.winModalEl = document.getElementById("winModal");
    this.winTextEl = document.getElementById("winText");
    this.modalResetBtn = document.getElementById("modalResetBtn");
    this.modalNextBtn = document.getElementById("modalNextBtn");
    this.campaignModeBtn = document.getElementById("campaignModeBtn");
    this.challengeModeBtn = document.getElementById("challengeModeBtn");
    this.challengeSeedInput = document.getElementById("challengeSeedInput");
    this.challengeGenerateBtn = document.getElementById("challengeGenerateBtn");
    this.challengeMetaEl = document.getElementById("challengeMeta");
    this.challengeListEl = document.getElementById("challengeList");
    this.challengeScoreLabelEl = document.getElementById("challengeScoreLabel");
    this.challengeTimeLabelEl = document.getElementById("challengeTimeLabel");
    this.challengeCompletedLabelEl = document.getElementById("challengeCompletedLabel");
    this.challengeSplitListEl = document.getElementById("challengeSplitList");
    this.copyChallengeSummaryBtn = document.getElementById("copyChallengeSummaryBtn");
    this.exportChallengeSummaryBtn = document.getElementById("exportChallengeSummaryBtn");

    this.cells = new Map();
    this.levelButtons = [];
    this.invalidTimer = null;
    this.drag = {
      active: false,
      pointerId: null,
      lastKey: null,
    };

    this.progress = loadCampaignProgress(1);
    this.progress.unlockedLevel = clamp(this.progress.unlockedLevel, 1, CAMPAIGN_TOTAL_LEVELS);
    if (!this.progress.solvedLevels || typeof this.progress.solvedLevels !== "object") {
      this.progress.solvedLevels = {};
    }

    this.campaignCursorIndex = clamp(this.progress.unlockedLevel - 1, 0, CAMPAIGN_TOTAL_LEVELS - 1);
    this.challenge = {
      seed: todaySeed(),
      levels: [],
      cursor: 0,
      resultsByLevelId: {},
    };

    this.levelAttempt = {
      startedAtMs: Date.now(),
      undoCount: 0,
      resetCount: 0,
    };

    this.state = {
      mode: "campaign",
      levelSourceIndex: 0,
      level: null,
      blockedSet: new Set(),
      playableCount: 0,
      path: [],
      visited: new Set(),
      status: "playing",
    };

    this.createChallenge(todaySeed());
    this.bindEvents();
    this.loadCampaignLevel(this.campaignCursorIndex, { announce: false, bypassLock: true });
    this.renderChallengePanel();
    this.renderModeButtons();
    this.setStatus("Dra från startnoden till en granne för att börja.");
  }

  validateCampaignData() {
    if (CAMPAIGN_LEVELS.length !== CAMPAIGN_TOTAL_LEVELS) {
      throw new Error("Campaign level count metadata is out of sync.");
    }

    const validation = validateCampaignLevels(CAMPAIGN_LEVELS);
    if (!validation.ok) {
      const sample = validation.issues.slice(0, 3).map((item) => `${item.id}: ${item.reason}`).join(" | ");
      throw new Error(`Campaign data integrity failed: ${sample}`);
    }

    for (const level of CAMPAIGN_LEVELS) {
      if (level.formatVersion !== LEVEL_FORMAT_VERSION) {
        throw new Error(`Level ${level.id} has unexpected formatVersion ${level.formatVersion}`);
      }
      if (!DIFFICULTY_META[level.difficulty]) {
        throw new Error(`Level ${level.id} uses unknown difficulty '${level.difficulty}'`);
      }
    }
  }

  bindEvents() {
    this.undoBtn.addEventListener("click", () => this.undo());
    this.resetBtn.addEventListener("click", () => this.resetLevel());
    this.nextBtn.addEventListener("click", () => this.goToNextLevel());
    this.modalResetBtn.addEventListener("click", () => {
      this.hideModal();
      this.resetLevel();
    });
    this.modalNextBtn.addEventListener("click", () => {
      this.hideModal();
      this.goToNextLevel();
    });

    this.campaignModeBtn.addEventListener("click", () => this.setMode("campaign"));
    this.challengeModeBtn.addEventListener("click", () => this.setMode("challenge"));
    this.challengeGenerateBtn.addEventListener("click", () => {
      this.createChallenge(this.challengeSeedInput.value.trim());
      if (this.state.mode === "challenge") {
        this.loadChallengeLevel(0, { announce: true });
      } else {
        this.renderChallengePanel();
      }
    });
    this.copyChallengeSummaryBtn?.addEventListener("click", () => this.copyChallengeSummary());
    this.exportChallengeSummaryBtn?.addEventListener("click", () => this.exportChallengeSummary());

    this.boardEl.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.boardEl.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointercancel", (event) => this.onPointerUp(event));

    document.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  setMode(mode) {
    if (mode === this.state.mode) {
      return;
    }
    this.hideModal();
    this.stopDrag();

    if (mode === "challenge") {
      if (this.challenge.levels.length === 0) {
        this.createChallenge(this.challengeSeedInput.value.trim() || todaySeed());
      }
      this.loadChallengeLevel(this.challenge.cursor, { announce: true });
    } else {
      this.loadCampaignLevel(this.campaignCursorIndex, { announce: true, bypassLock: true });
    }
  }

  createChallenge(seedInput) {
    const challenge = createMixedChallenge(CAMPAIGN_LEVELS, seedInput);
    this.challenge = {
      seed: challenge.seed,
      levels: challenge.levels,
      cursor: 0,
      resultsByLevelId: {},
    };
    if (this.challengeSeedInput) {
      this.challengeSeedInput.value = challenge.seed;
    }
    this.renderChallengePanel();
  }

  renderChallengePanel() {
    if (!this.challengeMetaEl || !this.challengeListEl) {
      return;
    }

    const completedCount = Object.keys(this.challenge.resultsByLevelId).length;
    this.challengeMetaEl.textContent =
      `Seed: ${this.challenge.seed} · ${completedCount}/${this.challenge.levels.length} klara`;

    this.challengeListEl.innerHTML = "";
    this.challenge.levels.forEach((level, index) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "challenge-pill";
      const diff = DIFFICULTY_META[level.difficulty];
      const solved = Boolean(this.challenge.resultsByLevelId[level.id]);
      pill.textContent = `${index + 1}. ${diff.shortLabel}`;
      pill.title = `${level.name} (${diff.label})`;
      pill.classList.toggle("solved", solved);
      pill.classList.toggle("active", this.state.mode === "challenge" && this.challenge.cursor === index);
      pill.addEventListener("click", () => {
        this.setMode("challenge");
        this.loadChallengeLevel(index, { announce: true });
      });
      this.challengeListEl.append(pill);
    });

    this.renderChallengeResults();
  }

  getChallengeSplitScore(level, result) {
    const difficultyMultiplier = CHALLENGE_DIFFICULTY_MULTIPLIER[level.difficulty] ?? 1;
    const rawSeconds = result.durationMs / 1000;
    const penaltySeconds = result.undoCount * 2.5 + result.resetCount * 7;
    const effectiveSeconds = Math.max(6, rawSeconds + penaltySeconds);
    const benchmarkSeconds = Math.max(28, level.par * 1.85);
    const paceRatio = benchmarkSeconds / effectiveSeconds;
    const base = 250 + 850 * paceRatio;
    return Math.max(120, Math.round(base * difficultyMultiplier));
  }

  getChallengeSummary() {
    const splits = this.challenge.levels.map((level, index) => {
      const result = this.challenge.resultsByLevelId[level.id] ?? null;
      const score = result ? this.getChallengeSplitScore(level, result) : 0;
      return {
        index: index + 1,
        levelId: level.id,
        levelName: level.name,
        difficulty: level.difficulty,
        par: level.par,
        completed: Boolean(result),
        timeMs: result?.durationMs ?? null,
        undoCount: result?.undoCount ?? 0,
        resetCount: result?.resetCount ?? 0,
        score,
      };
    });

    const completedSplits = splits.filter((split) => split.completed);
    const totalScore = completedSplits.reduce((sum, split) => sum + split.score, 0);
    const totalTimeMs = completedSplits.reduce((sum, split) => sum + split.timeMs, 0);
    const completedCount = completedSplits.length;

    return {
      seed: this.challenge.seed,
      totalLevels: this.challenge.levels.length,
      completedCount,
      totalScore,
      totalTimeMs,
      averageSplitMs: completedCount > 0 ? Math.round(totalTimeMs / completedCount) : null,
      splits,
    };
  }

  renderChallengeResults() {
    if (
      !this.challengeScoreLabelEl ||
      !this.challengeTimeLabelEl ||
      !this.challengeCompletedLabelEl ||
      !this.challengeSplitListEl
    ) {
      return;
    }

    const summary = this.getChallengeSummary();
    this.challengeScoreLabelEl.textContent = toDisplayScore(summary.totalScore);
    this.challengeTimeLabelEl.textContent = toDisplayTime(summary.totalTimeMs);
    this.challengeCompletedLabelEl.textContent = `${summary.completedCount} / ${summary.totalLevels}`;

    this.challengeSplitListEl.innerHTML = "";
    for (const split of summary.splits) {
      const diff = DIFFICULTY_META[split.difficulty];
      const row = document.createElement("article");
      row.className = "split-row";
      row.classList.toggle("done", split.completed);

      const title = document.createElement("div");
      title.className = "split-title";
      title.textContent = `${split.index}. ${diff.shortLabel} · ${split.levelName}`;

      const meta = document.createElement("div");
      meta.className = "split-meta";
      if (split.completed) {
        meta.textContent =
          `${toDisplayTime(split.timeMs)} · U:${split.undoCount} R:${split.resetCount} · ${toDisplayScore(split.score)} p`;
      } else {
        meta.textContent = "Inte klar ännu";
      }

      row.append(title, meta);
      this.challengeSplitListEl.append(row);
    }
  }

  buildChallengeShareText(summary) {
    const lines = [];
    lines.push(`One Stroke Challenge · Seed ${summary.seed}`);
    lines.push(
      `Resultat: ${summary.completedCount}/${summary.totalLevels} klara · ${toDisplayScore(summary.totalScore)} poäng · ${toDisplayTime(summary.totalTimeMs)}`,
    );
    if (summary.averageSplitMs) {
      lines.push(`Snitt/split: ${toDisplayTime(summary.averageSplitMs)}`);
    }
    lines.push("");
    lines.push("Splits:");
    for (const split of summary.splits) {
      const diff = DIFFICULTY_META[split.difficulty];
      if (split.completed) {
        lines.push(
          `${split.index}. ${diff.shortLabel} ${split.levelName} | ${toDisplayTime(split.timeMs)} | U${split.undoCount}/R${split.resetCount} | ${toDisplayScore(split.score)}p`,
        );
      } else {
        lines.push(`${split.index}. ${diff.shortLabel} ${split.levelName} | pending`);
      }
    }
    return lines.join("\n");
  }

  async copyChallengeSummary() {
    const summary = this.getChallengeSummary();
    const text = this.buildChallengeShareText(summary);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      this.setStatus("Challenge-summary kopierad till urklipp.");
    } catch {
      this.setStatus("Kunde inte kopiera summary automatiskt.", "loss");
    }
  }

  exportChallengeSummary() {
    const summary = this.getChallengeSummary();
    const payload = {
      game: "One Stroke",
      exportedAt: new Date().toISOString(),
      mode: "challenge",
      ...summary,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeSeed = summary.seed.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").slice(0, 40) || "challenge";
    link.href = url;
    link.download = `one-stroke-${safeSeed}-summary.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.setStatus("Challenge-summary exporterad som JSON.");
  }

  renderModeButtons() {
    this.campaignModeBtn?.classList.toggle("active", this.state.mode === "campaign");
    this.challengeModeBtn?.classList.toggle("active", this.state.mode === "challenge");
  }

  onKeyDown(event) {
    const key = event.key;
    if (key === "Backspace") {
      event.preventDefault();
      this.undo();
      return;
    }
    if (key === "z" || key === "Z") {
      this.undo();
      return;
    }
    if (key === "r" || key === "R") {
      this.resetLevel();
      return;
    }
    if (key === "n" || key === "N") {
      this.goToNextLevel();
      return;
    }

    if (this.state.status !== "playing") {
      return;
    }

    const deltaByKey = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = deltaByKey[key];
    if (!delta) {
      return;
    }
    event.preventDefault();
    this.tryMoveByDirection(delta[0], delta[1]);
  }

  onPointerDown(event) {
    if (this.state.status !== "playing") {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const cell = event.target.closest(".cell.playable");
    if (!cell) {
      return;
    }

    this.drag.active = true;
    this.drag.pointerId = event.pointerId;
    this.drag.lastKey = null;
    try {
      this.boardEl.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture errors.
    }
    this.handleCellInput(cell.dataset.key);
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag.active || this.drag.pointerId !== event.pointerId) {
      return;
    }
    if (this.state.status !== "playing") {
      this.stopDrag(event.pointerId);
      return;
    }

    const nodeAtPoint = document.elementFromPoint(event.clientX, event.clientY);
    const cell = nodeAtPoint ? nodeAtPoint.closest(".cell.playable") : null;
    if (!cell) {
      return;
    }
    this.handleCellInput(cell.dataset.key);
  }

  onPointerUp(event) {
    if (!this.drag.active || this.drag.pointerId !== event.pointerId) {
      return;
    }
    this.stopDrag(event.pointerId);
  }

  stopDrag(pointerId = this.drag.pointerId) {
    if (!this.drag.active) {
      return;
    }
    try {
      if (this.boardEl.hasPointerCapture(pointerId)) {
        this.boardEl.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore capture errors.
    }
    this.drag.active = false;
    this.drag.pointerId = null;
    this.drag.lastKey = null;
  }

  loadCampaignLevel(index, options = {}) {
    const { bypassLock = false, announce = true } = options;
    const clamped = clamp(index, 0, CAMPAIGN_TOTAL_LEVELS - 1);
    const level = CAMPAIGN_LEVELS[clamped];
    const campaignLevelNumber = clamped + 1;

    if (!bypassLock && campaignLevelNumber > this.progress.unlockedLevel) {
      this.setStatus("Nivån är låst. Lös föregående nivå först.", "loss");
      this.flashInvalidBoard();
      return;
    }

    this.state.mode = "campaign";
    this.campaignCursorIndex = clamped;
    this.loadLevel(level, clamped, announce);
  }

  loadChallengeLevel(index, options = {}) {
    const { announce = true } = options;
    if (this.challenge.levels.length === 0) {
      this.setStatus("Ingen challenge tillgänglig ännu.", "loss");
      return;
    }
    const clamped = clamp(index, 0, this.challenge.levels.length - 1);
    const level = this.challenge.levels[clamped];

    this.state.mode = "challenge";
    this.challenge.cursor = clamped;
    this.loadLevel(level, clamped, announce);
  }

  loadLevel(level, sourceIndex, announce) {
    const startKey = coordKey(level.start[0], level.start[1]);
    this.state.levelSourceIndex = sourceIndex;
    this.state.level = level;
    this.state.blockedSet = getBlockedSet(level);
    this.state.playableCount = getPlayableCount(level);
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";
    this.levelAttempt = {
      startedAtMs: Date.now(),
      undoCount: 0,
      resetCount: 0,
    };

    this.buildBoard();
    this.hideModal();
    this.renderState();
    this.renderModeButtons();
    this.renderChallengePanel();

    if (announce) {
      const modePrefix =
        this.state.mode === "campaign"
          ? `Kampanjnivå ${level.campaignIndex}`
          : `Challenge ${this.challenge.cursor + 1}`;
      this.setStatus(`${modePrefix}: ${level.name}`);
    }
  }

  buildBoard() {
    this.cells.clear();
    this.boardEl.innerHTML = "";
    this.boardEl.style.setProperty("--cols", String(this.state.level.width));
    this.boardEl.style.setProperty("--rows", String(this.state.level.height));

    for (let y = 0; y < this.state.level.height; y += 1) {
      for (let x = 0; x < this.state.level.width; x += 1) {
        const key = coordKey(x, y);
        const blocked = this.state.blockedSet.has(key);
        const node = document.createElement(blocked ? "div" : "button");
        node.className = blocked ? "cell blocked" : "cell playable";
        if (!blocked) {
          node.type = "button";
          node.dataset.key = key;
          node.setAttribute("aria-label", `Nod ${x + 1},${y + 1}`);
          node.append(this.createTraceNode());
          this.cells.set(key, node);
        } else {
          node.setAttribute("aria-hidden", "true");
        }
        this.boardEl.append(node);
      }
    }
  }

  renderState() {
    const { level, status, playableCount, visited, path } = this.state;
    const stepByKey = new Map();
    path.forEach((key, idx) => {
      stepByKey.set(key, idx + 1);
    });
    const connectionByKey = this.buildConnectionMap(path);

    const tailKey = this.getTailKey();
    const startKey = path[0];
    const nextOptions = new Set(
      status === "playing"
        ? getNeighborKeys(level, this.state.blockedSet, tailKey).filter((key) => !visited.has(key))
        : [],
    );

    for (const [key, cell] of this.cells) {
      const isVisited = stepByKey.has(key);
      const step = stepByKey.get(key);
      const connections = connectionByKey.get(key);
      cell.classList.toggle("visited", isVisited);
      cell.classList.toggle("tail", key === tailKey);
      cell.classList.toggle("start", key === startKey);
      cell.classList.toggle("next-option", nextOptions.has(key));
      cell.classList.toggle("conn-up", connections?.has("up") === true);
      cell.classList.toggle("conn-right", connections?.has("right") === true);
      cell.classList.toggle("conn-down", connections?.has("down") === true);
      cell.classList.toggle("conn-left", connections?.has("left") === true);
      cell.dataset.step = isVisited ? String(step) : "";
    }

    const difficulty = DIFFICULTY_META[level.difficulty];
    this.levelNameEl.textContent = level.name;
    if (this.state.mode === "campaign") {
      this.levelLabelEl.textContent = `${level.campaignIndex} / ${CAMPAIGN_TOTAL_LEVELS}`;
    } else {
      this.levelLabelEl.textContent = `${this.challenge.cursor + 1} / ${this.challenge.levels.length}`;
    }
    this.difficultyLabelEl.textContent = difficulty.label;
    this.visitedLabelEl.textContent = String(visited.size);
    this.remainingLabelEl.textContent = String(playableCount - visited.size);
    this.phaseLabelEl.textContent = this.getPhaseLabel(status);

    this.renderCampaignMeta();
    this.renderLevelButtons();
    this.updateNextButton();
  }

  renderCampaignMeta() {
    const solvedCount = Object.keys(this.progress.solvedLevels).length;
    this.campaignProgressLabelEl.textContent = `${solvedCount} klara`;
  }

  updateNextButton() {
    if (this.state.status !== "won") {
      this.nextBtn.disabled = true;
      return;
    }

    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      const nextNumber = nextIndex + 1;
      this.nextBtn.disabled = nextNumber > this.progress.unlockedLevel || nextIndex >= CAMPAIGN_TOTAL_LEVELS;
      return;
    }

    const challengeHasNext = this.challenge.cursor + 1 < this.challenge.levels.length;
    this.nextBtn.disabled = !challengeHasNext;
  }

  renderLevelButtons() {
    this.levelListEl.innerHTML = "";
    this.levelButtons = [];

    if (this.state.mode === "campaign") {
      const windowSize = 18;
      const start = clamp(this.campaignCursorIndex - Math.floor(windowSize / 2), 0, CAMPAIGN_TOTAL_LEVELS - 1);
      const end = clamp(start + windowSize - 1, 0, CAMPAIGN_TOTAL_LEVELS - 1);

      for (let index = start; index <= end; index += 1) {
        const level = CAMPAIGN_LEVELS[index];
        const unlocked = index + 1 <= this.progress.unlockedLevel;
        const solved = Boolean(this.progress.solvedLevels[level.id]);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "level-btn";
        button.textContent = unlocked ? String(index + 1) : "Låst";
        button.disabled = !unlocked;
        button.title = `${level.name} (${DIFFICULTY_META[level.difficulty].label})`;
        button.classList.toggle("active", index === this.campaignCursorIndex);
        button.classList.toggle("solved", solved);
        button.classList.toggle("locked", !unlocked);
        button.addEventListener("click", () => this.loadCampaignLevel(index));
        this.levelButtons.push(button);
        this.levelListEl.append(button);
      }
      return;
    }

    this.challenge.levels.forEach((level, index) => {
      const solved = Boolean(this.challenge.resultsByLevelId[level.id]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-btn";
      button.textContent = `${index + 1}`;
      button.title = `${level.name} (${DIFFICULTY_META[level.difficulty].label})`;
      button.classList.toggle("active", index === this.challenge.cursor);
      button.classList.toggle("solved", solved);
      button.addEventListener("click", () => this.loadChallengeLevel(index));
      this.levelButtons.push(button);
      this.levelListEl.append(button);
    });
  }

  getPhaseLabel(status) {
    if (status === "won") {
      return "Vinst";
    }
    if (status === "lost") {
      return "Fastlåst";
    }
    return "Spelar";
  }

  handleCellInput(key) {
    if (this.drag.lastKey === key) {
      return;
    }
    this.drag.lastKey = key;
    this.tryExtendPath(key);
  }

  tryMoveByDirection(dx, dy) {
    const [x, y] = parseKey(this.getTailKey());
    const nextX = x + dx;
    const nextY = y + dy;
    if (!inBounds(this.state.level, nextX, nextY)) {
      this.flashInvalid("Draget går utanför spelplanen.");
      return;
    }
    const nextKey = coordKey(nextX, nextY);
    if (!this.cells.has(nextKey)) {
      this.flashInvalid("Den noden är blockerad.");
      return;
    }
    this.tryExtendPath(nextKey);
  }

  tryExtendPath(targetKey) {
    if (this.state.status !== "playing") {
      return;
    }

    const tailKey = this.getTailKey();
    if (targetKey === tailKey) {
      return;
    }

    if (!this.cells.has(targetKey)) {
      this.flashInvalid("Den noden går inte att använda.");
      return;
    }

    if (!this.isAdjacentKeys(tailKey, targetKey)) {
      this.flashInvalid("Endast ortogonala steg från senaste noden är giltiga.");
      return;
    }

    if (this.state.visited.has(targetKey)) {
      this.flashInvalid("Strikt undo gäller. Noden är redan använd.");
      return;
    }

    this.state.path.push(targetKey);
    this.state.visited.add(targetKey);

    if (this.state.visited.size === this.state.playableCount) {
      this.handleWin();
      return;
    }

    const deadReason = this.getDeadStateReason();
    if (deadReason) {
      this.handleLoss(deadReason);
      return;
    }

    this.renderState();
    this.setStatus(`Bra. ${this.state.playableCount - this.state.visited.size} noder kvar.`);
  }

  undo() {
    if (this.state.path.length <= 1) {
      return;
    }
    this.levelAttempt.undoCount += 1;
    const removedKey = this.state.path.pop();
    this.state.visited.delete(removedKey);
    this.state.status = "playing";
    this.hideModal();
    this.renderState();
    this.setStatus(`Ångrade ett steg. ${this.state.playableCount - this.state.visited.size} noder kvar.`);
  }

  resetLevel() {
    this.levelAttempt.resetCount += 1;
    const startKey = coordKey(this.state.level.start[0], this.state.level.start[1]);
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";
    this.stopDrag();
    this.hideModal();
    this.renderState();
    this.setStatus("Banan återställd. Kör igen.");
  }

  handleWin() {
    this.state.status = "won";
    this.stopDrag();

    const durationMs = Date.now() - this.levelAttempt.startedAtMs;
    const result = {
      durationMs,
      undoCount: this.levelAttempt.undoCount,
      resetCount: this.levelAttempt.resetCount,
      completedAt: Date.now(),
    };

    if (this.state.mode === "campaign") {
      this.recordCampaignResult(this.state.level, result);
    } else {
      this.recordChallengeResult(this.state.level, result);
    }

    this.renderState();
    this.renderChallengePanel();

    const hasNext = this.hasNextLevelInCurrentMode();
    this.setStatus("Bana klar. Alla noder täckta exakt en gång.", "win");

    const timingText = `${toDisplayTime(durationMs)} · ${result.undoCount} undo · ${result.resetCount} reset`;
    if (this.state.mode === "campaign") {
      this.showModal(
        hasNext
          ? `Kampanj klarad. ${timingText}. Nästa nivå är upplåst.`
          : `Sista kampanjnivån klarad. ${timingText}.`,
        hasNext,
      );
    } else {
      const solvedCount = Object.keys(this.challenge.resultsByLevelId).length;
      const summary = this.getChallengeSummary();
      const currentSplit = summary.splits.find((split) => split.levelId === this.state.level.id);
      const splitScore = currentSplit?.score ?? 0;
      this.showModal(
        hasNext
          ? `Challenge bana ${this.challenge.cursor + 1}/10 klarad. ${timingText}. Split ${toDisplayScore(splitScore)} p · Totalt ${toDisplayScore(summary.totalScore)} p.`
          : `Challenge slutförd (${solvedCount}/10). ${timingText}. Totalt ${toDisplayScore(summary.totalScore)} p.`,
        hasNext,
      );
    }
  }

  hasNextLevelInCurrentMode() {
    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      return nextIndex < CAMPAIGN_TOTAL_LEVELS && nextIndex + 1 <= this.progress.unlockedLevel;
    }
    return this.challenge.cursor + 1 < this.challenge.levels.length;
  }

  recordCampaignResult(level, result) {
    const previous = this.progress.solvedLevels[level.id];
    if (!previous || result.durationMs < previous.bestTimeMs) {
      this.progress.solvedLevels[level.id] = {
        bestTimeMs: result.durationMs,
        bestUndoCount: result.undoCount,
        bestResetCount: result.resetCount,
        playedCount: (previous?.playedCount ?? 0) + 1,
      };
    } else {
      this.progress.solvedLevels[level.id] = {
        ...previous,
        playedCount: (previous.playedCount ?? 1) + 1,
      };
    }

    const unlockCandidate = level.campaignIndex + 1;
    if (unlockCandidate > this.progress.unlockedLevel) {
      this.progress.unlockedLevel = clamp(unlockCandidate, 1, CAMPAIGN_TOTAL_LEVELS);
    }
    saveCampaignProgress(this.progress);
  }

  recordChallengeResult(level, result) {
    this.challenge.resultsByLevelId[level.id] = {
      ...result,
    };
  }

  handleLoss(reason) {
    this.state.status = "lost";
    this.stopDrag();
    this.renderState();
    this.setStatus(`Fastlåst läge: ${reason} Använd Ångra eller Starta om.`, "loss");
  }

  getDeadStateReason() {
    const unvisited = this.getUnvisitedKeys();
    if (unvisited.length === 0) {
      return null;
    }

    const tailKey = this.getTailKey();
    const immediateMoves = getNeighborKeys(this.state.level, this.state.blockedSet, tailKey).filter(
      (key) => !this.state.visited.has(key),
    );
    if (immediateMoves.length === 0) {
      return "inga giltiga drag kvar från nuvarande nod.";
    }

    const allowed = new Set(unvisited);
    allowed.add(tailKey);

    const queue = [tailKey];
    const seen = new Set([tailKey]);
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = getNeighborKeys(this.state.level, this.state.blockedSet, current);
      for (const neighbor of neighbors) {
        if (!allowed.has(neighbor) || seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }

    for (const key of unvisited) {
      if (!seen.has(key)) {
        return "minst en nod blev isolerad.";
      }
    }

    return null;
  }

  getUnvisitedKeys() {
    const keys = getAllPlayableKeys(this.state.level);
    return keys.filter((key) => !this.state.visited.has(key));
  }

  getTailKey() {
    return this.state.path[this.state.path.length - 1];
  }

  createTraceNode() {
    const trace = document.createElement("div");
    trace.className = "trace";
    const directions = ["up", "right", "down", "left"];
    for (const direction of directions) {
      const arm = document.createElement("span");
      arm.className = `trace-arm arm-${direction}`;
      trace.append(arm);
    }
    const core = document.createElement("span");
    core.className = "trace-core";
    trace.append(core);
    return trace;
  }

  buildConnectionMap(path) {
    const connectionByKey = new Map();
    for (const key of path) {
      connectionByKey.set(key, new Set());
    }

    for (let index = 0; index < path.length - 1; index += 1) {
      const current = path[index];
      const next = path[index + 1];
      const direction = directionBetweenKeys(current, next);
      if (!direction) {
        continue;
      }
      connectionByKey.get(current).add(this.toConnectionDirection(direction));
      connectionByKey.get(next).add(this.toConnectionDirection(this.reverseDirection(direction)));
    }
    return connectionByKey;
  }

  toConnectionDirection(direction) {
    if (direction === "U") {
      return "up";
    }
    if (direction === "D") {
      return "down";
    }
    if (direction === "L") {
      return "left";
    }
    return "right";
  }

  reverseDirection(direction) {
    if (direction === "U") {
      return "D";
    }
    if (direction === "D") {
      return "U";
    }
    if (direction === "L") {
      return "R";
    }
    return "L";
  }

  isAdjacentKeys(aKey, bKey) {
    const [ax, ay] = parseKey(aKey);
    const [bx, by] = parseKey(bKey);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  flashInvalid(message) {
    this.setStatus(message, "loss");
    this.flashInvalidBoard();
  }

  flashInvalidBoard() {
    if (this.invalidTimer) {
      window.clearTimeout(this.invalidTimer);
    }
    this.boardEl.classList.remove("invalid");
    void this.boardEl.offsetWidth;
    this.boardEl.classList.add("invalid");
    this.invalidTimer = window.setTimeout(() => {
      this.boardEl.classList.remove("invalid");
    }, 260);
  }

  setStatus(message, tone = "neutral") {
    this.statusBoxEl.textContent = message;
    this.statusBoxEl.classList.remove("status-win", "status-loss");
    if (tone === "win") {
      this.statusBoxEl.classList.add("status-win");
    } else if (tone === "loss") {
      this.statusBoxEl.classList.add("status-loss");
    }
  }

  showModal(text, showNext) {
    this.winTextEl.textContent = text;
    this.modalNextBtn.hidden = !showNext;
    this.winModalEl.classList.remove("hidden");
  }

  hideModal() {
    this.winModalEl.classList.add("hidden");
  }

  goToNextLevel() {
    if (this.state.status !== "won") {
      this.setStatus("Klara banan först för att gå vidare.");
      return;
    }

    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      const nextNumber = nextIndex + 1;
      if (nextIndex >= CAMPAIGN_TOTAL_LEVELS) {
        this.setStatus("Du är redan på sista kampanjnivån.", "win");
        return;
      }
      if (nextNumber > this.progress.unlockedLevel) {
        this.setStatus("Nästa nivå är inte upplåst ännu.", "loss");
        return;
      }
      this.loadCampaignLevel(nextIndex, { announce: true, bypassLock: true });
      return;
    }

    const nextChallengeIndex = this.challenge.cursor + 1;
    if (nextChallengeIndex >= this.challenge.levels.length) {
      this.setStatus("Challenge slutförd. Generera en ny seed för nästa omgång.", "win");
      return;
    }
    this.loadChallengeLevel(nextChallengeIndex, { announce: true });
  }
}
