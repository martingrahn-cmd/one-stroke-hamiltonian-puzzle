const LEVEL_FORMAT_VERSION = 1;
const PROGRESS_STORAGE_KEY = "one-stroke-progress-v1";

const LEVELS = [
  {
    formatVersion: 1,
    id: "level_001",
    name: "Uppvärmning",
    width: 4,
    height: 4,
    blocked: [],
    start: [0, 0],
    endMode: "free",
    par: 15,
  },
  {
    formatVersion: 1,
    id: "level_002",
    name: "Tomt centrum",
    width: 5,
    height: 5,
    blocked: [[2, 2]],
    start: [0, 0],
    endMode: "free",
    par: 23,
  },
  {
    formatVersion: 1,
    id: "level_003",
    name: "Mittkorridor",
    width: 5,
    height: 6,
    blocked: [
      [2, 2],
      [2, 3],
    ],
    start: [0, 0],
    endMode: "free",
    par: 27,
  },
  {
    formatVersion: 1,
    id: "level_004",
    name: "Dubbelbrygga",
    width: 6,
    height: 5,
    blocked: [
      [2, 2],
      [3, 2],
    ],
    start: [0, 0],
    endMode: "free",
    par: 27,
  },
];

class OneStrokeGame {
  constructor() {
    this.boardEl = document.getElementById("board");
    this.levelNameEl = document.getElementById("levelName");
    this.levelLabelEl = document.getElementById("levelLabel");
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

    this.cells = new Map();
    this.levelButtons = [];
    this.invalidTimer = null;
    this.drag = {
      active: false,
      pointerId: null,
      lastKey: null,
    };

    this.state = {
      levelIndex: 0,
      level: null,
      blockedSet: new Set(),
      playableCount: 0,
      path: [],
      visited: new Set(),
      status: "playing",
      unlockedCount: 1,
    };

    this.loadProgress();
    this.validateLevels();
    this.renderLevelButtons();
    this.bindEvents();
    this.loadLevel(0, { bypassLock: true, announce: false });
    this.setStatus("Dra från startnoden till en granne för att börja.");
  }

  validateLevels() {
    for (const level of LEVELS) {
      if (level.formatVersion !== LEVEL_FORMAT_VERSION) {
        throw new Error(`Ogiltig formatVersion i ${level.id}`);
      }
      if (level.endMode !== "free") {
        throw new Error(`Ogiltigt endMode i ${level.id}. Endast 'free' stöds.`);
      }
      if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) {
        throw new Error(`Ogiltig storlek i ${level.id}`);
      }
      if (level.width < 2 || level.height < 2) {
        throw new Error(`För liten bana i ${level.id}`);
      }
      const [startX, startY] = level.start;
      if (!this.inBoundsForLevel(level, startX, startY)) {
        throw new Error(`Start ligger utanför spelplan i ${level.id}`);
      }
      const blockedSet = new Set(level.blocked.map(([x, y]) => this.coordKey(x, y)));
      const startKey = this.coordKey(startX, startY);
      if (blockedSet.has(startKey)) {
        throw new Error(`Startnod är blockerad i ${level.id}`);
      }
      const playableCount = level.width * level.height - level.blocked.length;
      if (playableCount <= 1) {
        throw new Error(`Banan ${level.id} har för få spelbara noder.`);
      }
      const expectedPar = playableCount - 1;
      if (level.par !== expectedPar) {
        throw new Error(`Par stämmer inte i ${level.id}. Förväntat ${expectedPar}.`);
      }
    }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) {
        this.state.unlockedCount = 1;
        return;
      }
      const parsed = JSON.parse(raw);
      const unlocked = Number(parsed.unlockedCount);
      if (!Number.isInteger(unlocked)) {
        this.state.unlockedCount = 1;
        return;
      }
      this.state.unlockedCount = this.clamp(unlocked, 1, LEVELS.length);
    } catch {
      this.state.unlockedCount = 1;
    }
  }

  saveProgress() {
    const payload = { unlockedCount: this.state.unlockedCount };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
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

    this.boardEl.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.boardEl.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointercancel", (event) => this.onPointerUp(event));

    document.addEventListener("keydown", (event) => this.onKeyDown(event));
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
      // Vissa webbläsare kan kasta om capture misslyckas.
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
    if (!this.drag.active) {
      return;
    }
    if (this.drag.pointerId !== event.pointerId) {
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
      // Ignorera capture-fel.
    }
    this.drag.active = false;
    this.drag.pointerId = null;
    this.drag.lastKey = null;
  }

  renderLevelButtons() {
    this.levelListEl.innerHTML = "";
    this.levelButtons = [];
    LEVELS.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-btn";
      button.textContent = String(index + 1);
      button.title = level.name;
      button.addEventListener("click", () => this.loadLevel(index));
      this.levelButtons.push(button);
      this.levelListEl.append(button);
    });
  }

  loadLevel(index, options = {}) {
    const { bypassLock = false, announce = true } = options;
    if (!bypassLock && index >= this.state.unlockedCount) {
      this.setStatus("Nivån är låst. Lös föregående nivå först.", "loss");
      this.flashInvalidBoard();
      return;
    }

    const clampedIndex = this.clamp(index, 0, LEVELS.length - 1);
    const level = LEVELS[clampedIndex];
    const blockedSet = new Set(level.blocked.map(([x, y]) => this.coordKey(x, y)));
    const startKey = this.coordKey(level.start[0], level.start[1]);

    this.state.levelIndex = clampedIndex;
    this.state.level = level;
    this.state.blockedSet = blockedSet;
    this.state.playableCount = level.width * level.height - blockedSet.size;
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";

    this.buildBoard();
    this.hideModal();
    this.renderState();
    if (announce) {
      this.setStatus(`Nivå ${clampedIndex + 1}: ${level.name}.`);
    }
  }

  buildBoard() {
    this.cells.clear();
    this.boardEl.innerHTML = "";
    this.boardEl.style.setProperty("--cols", String(this.state.level.width));
    this.boardEl.style.setProperty("--rows", String(this.state.level.height));

    for (let y = 0; y < this.state.level.height; y += 1) {
      for (let x = 0; x < this.state.level.width; x += 1) {
        const key = this.coordKey(x, y);
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
    const { level, levelIndex, status, playableCount, visited, path } = this.state;
    const stepByKey = new Map();
    path.forEach((key, idx) => {
      stepByKey.set(key, idx + 1);
    });
    const connectionByKey = this.buildConnectionMap(path);

    const tailKey = this.getTailKey();
    const startKey = path[0];
    const nextOptions = new Set(
      status === "playing"
        ? this.getNeighborKeys(tailKey).filter((key) => !visited.has(key))
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

    const visitedCount = visited.size;
    const remainingCount = playableCount - visitedCount;
    this.levelNameEl.textContent = level.name;
    this.levelLabelEl.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    this.visitedLabelEl.textContent = String(visitedCount);
    this.remainingLabelEl.textContent = String(remainingCount);
    this.phaseLabelEl.textContent = this.getPhaseLabel(status);

    this.undoBtn.disabled = path.length <= 1;

    const hasNextLevel = levelIndex + 1 < LEVELS.length;
    const canGoNext = status === "won" && hasNextLevel && levelIndex + 1 < this.state.unlockedCount;
    this.nextBtn.disabled = !canGoNext;

    this.levelButtons.forEach((button, index) => {
      const unlocked = index < this.state.unlockedCount;
      button.disabled = !unlocked;
      button.classList.toggle("locked", !unlocked);
      button.classList.toggle("active", index === levelIndex);
      button.classList.toggle("solved", index < this.state.unlockedCount - 1);
      button.textContent = unlocked ? String(index + 1) : "Låst";
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
    const [x, y] = this.parseKey(this.getTailKey());
    const nextX = x + dx;
    const nextY = y + dy;
    if (!this.inBounds(nextX, nextY)) {
      this.flashInvalid("Draget går utanför spelplanen.");
      return;
    }
    const nextKey = this.coordKey(nextX, nextY);
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

    const removedKey = this.state.path.pop();
    this.state.visited.delete(removedKey);
    this.state.status = "playing";
    this.hideModal();
    this.renderState();
    this.setStatus(`Ångrade ett steg. ${this.state.playableCount - this.state.visited.size} noder kvar.`);
  }

  resetLevel() {
    const level = this.state.level;
    const startKey = this.coordKey(level.start[0], level.start[1]);
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

    const unlockTarget = this.state.levelIndex + 2;
    if (unlockTarget > this.state.unlockedCount) {
      this.state.unlockedCount = this.clamp(unlockTarget, 1, LEVELS.length);
      this.saveProgress();
    }

    this.renderState();
    const steps = this.state.path.length - 1;
    const hasNextLevel = this.state.levelIndex + 1 < LEVELS.length;
    this.setStatus("Bana klar. Alla noder täckta exakt en gång.", "win");
    this.showModal(
      hasNextLevel
        ? `Du löste banan på ${steps} steg. Nästa nivå är upplåst.`
        : `Du löste sista nivån på ${steps} steg.`,
      hasNextLevel,
    );
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
    const immediateMoves = this.getNeighborKeys(tailKey).filter((key) => !this.state.visited.has(key));
    if (immediateMoves.length === 0) {
      return "inga giltiga drag kvar från nuvarande nod.";
    }

    const allowed = new Set(unvisited);
    allowed.add(tailKey);

    const queue = [tailKey];
    const seen = new Set([tailKey]);
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = this.getNeighborKeys(current);
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
    const keys = [];
    for (const key of this.cells.keys()) {
      if (!this.state.visited.has(key)) {
        keys.push(key);
      }
    }
    return keys;
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
      const forwardDirection = this.directionBetweenKeys(current, next);
      if (!forwardDirection) {
        continue;
      }
      const backwardDirection = this.oppositeDirection(forwardDirection);
      connectionByKey.get(current).add(forwardDirection);
      if (backwardDirection) {
        connectionByKey.get(next).add(backwardDirection);
      }
    }

    return connectionByKey;
  }

  getNeighborKeys(key) {
    const [x, y] = this.parseKey(key);
    const deltas = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const neighbors = [];
    for (const [dx, dy] of deltas) {
      const nx = x + dx;
      const ny = y + dy;
      if (!this.inBounds(nx, ny)) {
        continue;
      }
      const nextKey = this.coordKey(nx, ny);
      if (!this.cells.has(nextKey)) {
        continue;
      }
      neighbors.push(nextKey);
    }
    return neighbors;
  }

  isAdjacentKeys(aKey, bKey) {
    const [ax, ay] = this.parseKey(aKey);
    const [bx, by] = this.parseKey(bKey);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  directionBetweenKeys(fromKey, toKey) {
    const [fromX, fromY] = this.parseKey(fromKey);
    const [toX, toY] = this.parseKey(toKey);
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 1 && dy === 0) {
      return "right";
    }
    if (dx === -1 && dy === 0) {
      return "left";
    }
    if (dx === 0 && dy === 1) {
      return "down";
    }
    if (dx === 0 && dy === -1) {
      return "up";
    }
    return null;
  }

  oppositeDirection(direction) {
    if (direction === "up") {
      return "down";
    }
    if (direction === "down") {
      return "up";
    }
    if (direction === "left") {
      return "right";
    }
    if (direction === "right") {
      return "left";
    }
    return null;
  }

  inBounds(x, y) {
    return this.inBoundsForLevel(this.state.level, x, y);
  }

  inBoundsForLevel(level, x, y) {
    return x >= 0 && x < level.width && y >= 0 && y < level.height;
  }

  parseKey(key) {
    const [x, y] = key.split(",").map(Number);
    return [x, y];
  }

  coordKey(x, y) {
    return `${x},${y}`;
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
    const nextIndex = this.state.levelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      this.setStatus("Du är redan på sista nivån.", "win");
      return;
    }
    if (nextIndex >= this.state.unlockedCount) {
      this.setStatus("Lås upp nästa nivå genom att lösa den nuvarande först.", "loss");
      return;
    }
    this.loadLevel(nextIndex, { bypassLock: true });
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
}

new OneStrokeGame();
