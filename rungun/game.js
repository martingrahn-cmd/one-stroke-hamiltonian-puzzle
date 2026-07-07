'use strict';
/* =========================================================================
   COMMANDO STRIKE — Run & Gun prototype (1 bana)
   Spritesheet: assets/commando.png — 8x3 frames à 48x64
   Rad 0: idle + sikta/skjut   Rad 1: runcykel (8)   Rad 2: hopp/volt/landning
   ========================================================================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = 640, H = 360;
const BUILD = 'v23'; // visas på titelskärmen — bumpa ihop med sw.js-cachen
const TILE = 32;

// ---- Sprite frames ---------------------------------------------------------
const FW = 48, FH = 64, COLS = 8;
// Spelaren: två sheets à 6 kolumner x 4 rader (48x64/frame), högervänd.
// player-aim.png: sikte/eld i alla vinklar. player-move.png: rörelse.
const PCOLS = 6;
const PFW = 64, PFH = 64; // bredare ram än 48 — annars krymps breda run-frames
const PA = { // player-aim.png
  IDLE: [0, 1],
  AIMF: 2, FIREF: [3, 4],       // rakt fram
  AIMU: 6, FIREU: [7, 8],       // RAKT UPP
  AIMD: 18, FIRED: [9, 11, 10], // snett upp 45°
  CAIM: 23, CFIRE: [22, 16],    // hukad
};
const PM = { // player-move.png
  RUN: [0, 1, 2, 3, 4, 5],
  RUNUP: [6, 7, 8],             // löpning med gevär snett upp
  FLIP: [9, 10, 11],            // volt (tuckade rotationer)
  RISE: 12, FALL: 13, LEAP: 14, LAND: 15,
  AIRFIRE: [16, 17],
  CFIRE: [19, 20],
  CWALK: [21, 22, 23],          // hukad förflyttning
};

// Fiende: Renegade Grunt (assets/grunt.png, 6 använda kolumner per rad,
// packad i samma 8-kolumners 48x64-grid). OBS: ritad HÖGERVÄND.
const GR = {
  IDLE: [0, 1],        // arg breathing
  FIRE: [2, 3],        // skott med mynningsflamma
  AIM: 4,
  WALK0: 8, WALKN: 6,  // gångcykel 8-13
  DEATH0: 16, DEATHN: 6, // death-sekvens 16-21
};

// Boss: attackhelikopter (assets/heli.png, 176x144-frames, 4 kolumner,
// vänstervänd). Rad 0: hover 0-3. Rad 1: kanon 4 (sikta), 5 (ELD), 6 (plan),
// 7 (trupplandsättning). Rad 2: 8 (plan), 9-10 (skadad/rök), 11 (störtar).
const BFW = 176, BFH = 144, BCOLS = 4;
const BOSS_F = { HOVER: [0, 1, 2, 3], AIM: 6, FIRE: [5, 4], DROP: 7, DMG: [10, 9], CRASH: 11 };
const BOSS_TRIGGER_X = 178 * TILE;

// Fiende: Heavy med bazooka (assets/heavy.png, 64x64-frames, 6 kolumner,
// vänstervänd). Rad 0: idle 0-5. Rad 1: sikta 6-8, ELD 9-10, ladda om 11.
// Rad 2: gång 12-14, liggande död 15-16, träffreaktion 17.
const HFW = 64, HFH = 64, HCOLS = 6;
const HV = {
  IDLE0: 0, IDLEN: 6,
  AIM: [6, 7, 8], FIRE: [9, 10], HOLD: 11,
  WALK: [12, 13, 14],
  DEATH: [17, 15, 16],
};

// ---- Nivåer ----------------------------------------------------------------
// Legend: #=golv/mark  C=container/låda  B=massiv maskin  ==galler/plattform(one-way)
// S=fara(spik/molten)  E=grunt  R=heavy(bazooka)  D=drönare
// W=sentry walker  T=golvturret  X=mecha brute
// M=medkit  *=stjärna  P=spelarstart  F=extraktion
const LEVEL1_MAP = [
'                                                                                                                                                                                                        ',
'                                                                                                                                                                                                        ',
'                                                                                                         *                                                                                              ',
'                                        *                                               D     D        =====                                     D                          *  *  *                     ',
'                              *      ====                * * *                  ==== M                                        E                =====                      =========                     ',
'                            ====                        =======                =======            E                        ======      *  *                                                             ',
'                                          E                        D                            ======        C          ==========   =====          E          M                    E  E               ',
'                 *  *                  ======                                        C C                 *   CC                                    =======     ====                 ========            ',
'          M                       E                     E              E            CCCC       C    R   CCC CCC              E                           E                    E               R    F    ',
'   P         C        E        C                     ########      ##########      ######     ===      #########         ========       ==     =======     SS    SS                   C C               ',
'#######################################   ###   #####        ######          ######      #####   ######         #########        ##### ### ####       ####################   #########################  ',
'####################################### S ### S #####        ######          ######      #####   ######         #########        ##### ### ####       ####################SSS#########################  ',
'########################################################     ######          ######      #####   ######         #########        ##############       ################################################  ',
];
const LEVEL2_MAP = [
'                                                                                                                                                                                ',
'                                                                                                                                                                                ',
'                                                  *                                                                                                                             ',
'                                                       D                            *                                                 *                                         ',
'                                    T                                           ==========  D                                       T   T *             D                       ',
'                                ==========                    T                                                 T               ============                                    ',
'                                                            ======                                            ======                                                            ',
'       M                                        CCCC                M                           CCCCCCCC                      M                                                 ',
'                                                CCCC        BBBBBB                              CCCCCCCC      BBBBBB                                                            ',
'   P          *         SSSS  *   W             CCCCW     W BBBBBB    W             W         W CCCCCCCC    W BBBBBB  SS*S  W                         W       X     * * X    F  ',
'############################################     #########################     ###############################################################     #############################',
'############################################SSSSS#########################SSSSS###############################################################SSSSS#############################',
'################################################################################################################################################################################',
];
const LEVELS = [
  { map: LEVEL1_MAP, theme: 'jungle',  name: 'SECTOR 1: JUNGLE EXTRACTION',    heliBoss: true },
  { map: LEVEL2_MAP, theme: 'foundry', name: 'SECTOR 2: STEELWORKS NIGHT SHIFT', heliBoss: false },
];
let MAP = [], MAPW = 0, MAPH = 0, LEVEL_W = 0, LEVEL_H = 0;
function setMap(src) {
  MAPW = Math.max(...src.map(r => r.length));
  MAP = src.map(r => r.padEnd(MAPW, ' '));
  MAPH = MAP.length;
  LEVEL_W = MAPW * TILE; LEVEL_H = MAPH * TILE;
}

const solidAt = (tx, ty) => {
  if (tx < 0 || tx >= MAPW) return true;
  if (ty < 0) return false;
  if (ty >= MAPH) return false;
  const c = MAP[ty][tx];
  return c === '#' || c === 'C' || c === 'B';
};
const platformAt = (tx, ty) => (ty >= 0 && ty < MAPH && tx >= 0 && tx < MAPW && MAP[ty][tx] === '=');
const spikeAt = (tx, ty) => (ty >= 0 && ty < MAPH && tx >= 0 && tx < MAPW && MAP[ty][tx] === 'S');

// ---- Ljud (WebAudio-synth) ----------------------------------------------
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function blip(type, f0, f1, dur, vol, curve) {
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(); o.stop(ac.currentTime + dur + 0.02);
}
function noiseBurst(dur, vol, hp) {
  const ac = audio(); if (!ac) return;
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = vol;
  const f = ac.createBiquadFilter(); f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp ? 1200 : 900;
  src.connect(f); f.connect(g); g.connect(ac.destination); src.start();
}
const SFX = {
  shoot()   { noiseBurst(0.06, 0.10, true); blip('square', 700, 180, 0.07, 0.06); },
  eshoot()  { noiseBurst(0.05, 0.06, true); blip('square', 400, 120, 0.08, 0.04); },
  rocket()  { noiseBurst(0.3, 0.12); blip('sawtooth', 300, 60, 0.35, 0.10); },
  ebeam()   { blip('square', 1050, 420, 0.09, 0.05); },
  stomp()   { noiseBurst(0.12, 0.14); blip('sine', 90, 45, 0.12, 0.12); },
  alarm()   { [0, 220, 440].forEach(d => setTimeout(() => blip('square', 880, 320, 0.2, 0.11), d)); },
  bossdie() { [0, 200, 420, 700].forEach((d, i) => setTimeout(() => { noiseBurst(0.35, 0.18); blip('sawtooth', 200 - i * 30, 40, 0.4, 0.12); }, d)); },
  jump()    { blip('square', 260, 560, 0.12, 0.08); },
  flip()    { blip('square', 420, 900, 0.14, 0.08); },
  land()    { blip('sine', 140, 70, 0.06, 0.10); },
  hurt()    { blip('sawtooth', 220, 70, 0.22, 0.14); },
  edie()    { noiseBurst(0.25, 0.16); blip('sawtooth', 160, 40, 0.3, 0.12); },
  pickup()  { blip('sine', 880, 1400, 0.09, 0.10); setTimeout(() => blip('sine', 1200, 1800, 0.08, 0.08), 60); },
  heal()    { blip('sine', 520, 1040, 0.15, 0.10); },
  power()   { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => blip('square', f, f * 1.1, 0.1, 0.09), i * 70)); },
  win()     { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip('square', f, f, 0.18, 0.09), i * 130)); },
  dead()    { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => blip('sawtooth', f, f * 0.9, 0.22, 0.10), i * 160)); },
};

// ---- Input ----------------------------------------------------------------
const keys = {};
let touchUI = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
let pendingJump = false;
const vbtn = { left: false, right: false, jump: false, fire: false };
addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  audio();
  if (!e.repeat && e.code === 'Space') pendingJump = true;
  // banval på meny/döds/vinst-skärm: siffertangent hoppar direkt till sektorn
  if (game.state !== 'play') {
    if (e.code === 'Digit1' || e.code === 'Numpad1') startGame(0);
    else if (e.code === 'Digit2' || e.code === 'Numpad2') startGame(1);
    else if (['Enter', 'Space', 'KeyR'].includes(e.code)) startGame(defaultStartIdx());
  } else if (e.code === 'KeyR') startGame(game.level); // starta om nuvarande sektor
});
// döds-skärm → försök igen på samma sektor; titel/vinst → sektor 1
function defaultStartIdx() { return game.state === 'dead' ? game.level : 0; }
addEventListener('keyup', e => { keys[e.code] = false; });
// OBS: pil-upp är numera SIKTE (snett upp), inte hopp — Contra-schema
const inLeft  = () => keys['ArrowLeft'] || keys['KeyA'] || stick.active && stick.vx < -0.35;
const inRight = () => keys['ArrowRight'] || keys['KeyD'] || stick.active && stick.vx > 0.35;
const inDown  = () => keys['ArrowDown'] || keys['KeyS'] || stick.active && stick.vy > 0.55 && Math.abs(stick.vx) < 0.45;
// W = sikta upp (matchar spakens 'riktning = sikte'), Space = hopp
const inUp    = () => keys['ArrowUp'] || keys['KeyW'] || keys['KeyI'] || stick.active && stick.vy < -0.45;
const inJump  = () => keys['Space'] || vbtn.jump;
const inFire  = () => keys['KeyJ'] || keys['KeyX'] || keys['ControlLeft'] || vbtn.fire || mouseFire;
let mouseFire = false;
canvas.addEventListener('mousedown', e => {
  audio();
  if (game.state !== 'play') {
    const pt = canvasPos(e);
    if (game.state === 'title' && hitReload(pt)) { window.forceReload && window.forceReload(); return; }
    let idx = defaultStartIdx();
    for (const b of MENU_BTN) if (Math.abs(pt.x - b.x) < b.w / 2 && Math.abs(pt.y - b.y) < b.h / 2 + 8) idx = b.idx;
    startGame(idx);
  } else mouseFire = true;
});
addEventListener('mouseup', () => { mouseFire = false; });

function canvasPos(t) {
  // object-fit: contain — spelet ritas letterboxat i elementets box,
  // så mappa via den uniforma skalan + centrerings-offset
  const r = canvas.getBoundingClientRect();
  const s = Math.min(r.width / W, r.height / H);
  const ox = r.left + (r.width - s * W) / 2;
  const oy = r.top + (r.height - s * H) / 2;
  return { x: (t.clientX - ox) / s, y: (t.clientY - oy) / s };
}
// Analog virtuell styrspak: vänstra halvan av skärmen är spak-zon —
// spaken föds där tummen landar. Höger halva: hopp + eld-knappar.
const stick = { active: false, id: -1, bx: 0, by: 0, vx: 0, vy: 0 };
const TB = [
  { id: 'jump', x: W - 140, y: H - 58, r: 36, label: '⤒' },
  { id: 'fire', x: W - 54,  y: H - 58, r: 36, label: '✹' },
];
const STICK_R = 34; // max utslag i canvas-pixlar
// banval-knappar på titelskärmen
const MENU_BTN = [
  { idx: 0, x: W / 2 - 88, y: 322, w: 150, h: 26, label: '1 ▸ JUNGLE' },
  { idx: 1, x: W / 2 + 88, y: 322, w: 150, h: 26, label: '2 ▸ STEELWORKS' },
];
// reload/uppdatera-knapp (nere till höger på titeln) — för mobil-webapp
const RELOAD_BTN = { x: W - 60, y: 22, w: 96, h: 22 };
function hitReload(pt) {
  return Math.abs(pt.x - RELOAD_BTN.x) < RELOAD_BTN.w / 2 && Math.abs(pt.y - RELOAD_BTN.y) < RELOAD_BTN.h / 2 + 8;
}
function updateTouches(e) {
  e.preventDefault();
  touchUI = true;
  audio();
  const wasJump = vbtn.jump;
  vbtn.jump = vbtn.fire = false;
  let stickSeen = false;
  for (const t of e.touches) {
    const p = canvasPos(t);
    if (t.identifier === stick.id && stick.active) {
      stick.vx = Math.max(-1, Math.min(1, (p.x - stick.bx) / STICK_R));
      stick.vy = Math.max(-1, Math.min(1, (p.y - stick.by) / STICK_R));
      stickSeen = true;
      continue;
    }
    let onButton = false;
    for (const b of TB) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 22) { vbtn[b.id] = true; onButton = true; }
    }
    if (!onButton && !stick.active && p.x < W * 0.5 && e.type === 'touchstart') {
      stick.active = true; stick.id = t.identifier;
      stick.bx = p.x; stick.by = p.y; stick.vx = stick.vy = 0;
      stickSeen = true;
    }
  }
  if (stick.active && !stickSeen) {
    // spak-fingret släppt (eller touchcancel)
    stick.active = false; stick.id = -1; stick.vx = stick.vy = 0;
  }
  if (vbtn.jump && !wasJump) pendingJump = true;
  if (game.state !== 'play' && e.type === 'touchstart' && e.touches.length) {
    const pt = canvasPos(e.touches[0]);
    if (game.state === 'title' && hitReload(pt)) { window.forceReload && window.forceReload(); return; }
    let idx = defaultStartIdx(); // titel/vinst → sektor 1, död → samma sektor
    for (const b of MENU_BTN) {
      if (Math.abs(pt.x - b.x) < b.w / 2 && Math.abs(pt.y - b.y) < b.h / 2 + 8) idx = b.idx;
    }
    startGame(idx);
  }
}
canvas.addEventListener('touchstart', updateTouches, { passive: false });
canvas.addEventListener('touchmove', updateTouches, { passive: false });
canvas.addEventListener('touchend', updateTouches, { passive: false });
// iOS avbryter touches med touchcancel när kantgester tar över —
// utan denna fastnar knapparna i nedtryckt läge
canvas.addEventListener('touchcancel', updateTouches, { passive: false });

// ---- Tillgångar -----------------------------------------------------------
const pAim = new Image();
pAim.src = 'assets/player-aim.png';
const pMove = new Image();
pMove.src = 'assets/player-move.png';
const gruntSheet = new Image();
gruntSheet.src = 'assets/grunt.png';
const heavySheet = new Image();
heavySheet.src = 'assets/heavy.png';
const heliSheet = new Image();
heliSheet.src = 'assets/heli.png';
const sentrySheet = new Image(); // Sektor 2: Sentry Walker (8x4, 64x72/frame)
sentrySheet.src = 'assets/robot-sentry.png';
const turretSheet = new Image(); // Sektor 2: Floor Turret (6x3, 64x64/frame)
turretSheet.src = 'assets/robot-turret.png';
pMove.onload = () => {
  buildTerrain();
  buildParallax();
};
const ready = img => img.complete && img.naturalWidth;

function drawFrame(img, idx, x, y, flip, fw = FW, fh = FH, cols = COLS) {
  // x,y = fötternas mittpunkt i världen (ritas i skärmkoordinater av anroparen)
  const sx = (idx % cols) * fw, sy = Math.floor(idx / cols) * fh;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, fw, fh, -fw / 2, -fh + 1, fw, fh);
  ctx.restore();
}

// ---- Terräng (förrenderad) -------------------------------------------------
let terrain = null;
function buildTerrain(theme) {
  terrain = document.createElement('canvas');
  terrain.width = LEVEL_W; terrain.height = LEVEL_H;
  const g = terrain.getContext('2d');
  const rnd = mulberry(1337);
  if (theme === 'foundry') { buildTerrainFoundry(g, rnd); return; }
  for (let ty = 0; ty < MAPH; ty++) {
    for (let tx = 0; tx < MAPW; tx++) {
      const c = MAP[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        const top = !solidAt(tx, ty - 1);
        g.fillStyle = '#3d2c22';
        g.fillRect(x, y, TILE, TILE);
        // stenstruktur
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = 0; i < 3; i++) g.fillRect(x + ((rnd() * 26) | 0), y + ((rnd() * 26) | 0), 5, 3);
        g.fillStyle = 'rgba(120,90,60,0.25)';
        for (let i = 0; i < 2; i++) g.fillRect(x + ((rnd() * 26) | 0), y + ((rnd() * 26) | 0), 4, 2);
        if (top) {
          g.fillStyle = '#4f7a2e';
          g.fillRect(x, y, TILE, 7);
          g.fillStyle = '#6da33f';
          g.fillRect(x, y, TILE, 3);
          g.fillStyle = '#4f7a2e';
          for (let i = 0; i < 5; i++) g.fillRect(x + 2 + i * 6 + ((rnd() * 3) | 0), y - 3, 2, 4);
        }
      } else if (c === 'C') {
        g.fillStyle = '#8a5a2b'; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = '#a97439'; g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.strokeStyle = '#6e441d'; g.lineWidth = 2;
        g.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + TILE - 3, y + TILE - 3);
        g.moveTo(x + TILE - 3, y + 3); g.lineTo(x + 3, y + TILE - 3); g.stroke();
      } else if (c === '=') {
        g.fillStyle = '#4a4f5e'; g.fillRect(x, y, TILE, 8);
        g.fillStyle = '#6b7284'; g.fillRect(x, y, TILE, 3);
        g.fillStyle = '#2e3340';
        g.fillRect(x + 4, y + 5, 3, 3); g.fillRect(x + TILE - 7, y + 5, 3, 3);
      } else if (c === 'S') {
        g.fillStyle = '#b9c2cf';
        for (let i = 0; i < 4; i++) {
          const sx = x + i * 8;
          g.beginPath();
          g.moveTo(sx, y + TILE); g.lineTo(sx + 4, y + 8); g.lineTo(sx + 8, y + TILE);
          g.closePath(); g.fill();
        }
        g.fillStyle = '#7d8794';
        for (let i = 0; i < 4; i++) {
          const sx = x + i * 8;
          g.beginPath();
          g.moveTo(sx + 4, y + 8); g.lineTo(sx + 8, y + TILE); g.lineTo(sx + 4, y + TILE);
          g.closePath(); g.fill();
        }
      }
    }
  }
}
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Sektor 2: stålverksgolv, containrar, galler, smält metall
function buildTerrainFoundry(g, rnd) {
  for (let ty = 0; ty < MAPH; ty++) {
    for (let tx = 0; tx < MAPW; tx++) {
      const c = MAP[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        const top = !solidAt(tx, ty - 1);
        g.fillStyle = '#2c333d'; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(x, y, 1, TILE); g.fillRect(x, y, TILE, 1); // panelfogar
        g.fillStyle = 'rgba(120,140,165,0.10)';
        for (let i = 0; i < 3; i++) g.fillRect(x + 5 + ((rnd() * 20) | 0), y + 5 + ((rnd() * 20) | 0), 2, 2); // nitar
        if (top) {
          g.fillStyle = '#3f4a58'; g.fillRect(x, y, TILE, 6);
          g.fillStyle = '#525f70'; g.fillRect(x, y, TILE, 2);
          // varningsränder
          g.fillStyle = '#d8a53a';
          for (let i = 0; i < 4; i++) g.fillRect(x + i * 8, y + 3, 4, 3);
        }
      } else if (c === 'B') { // massiv maskin/vägg
        g.fillStyle = '#20262e'; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = '#333c47'; g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.strokeStyle = '#151a20'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        g.fillStyle = '#4a94c4'; g.fillRect(x + TILE / 2 - 2, y + TILE / 2 - 2, 4, 4); // indikatorljus
      } else if (c === 'C') { // metallcontainer
        g.fillStyle = '#3a4b52'; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = '#4a6069'; g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.fillStyle = '#2a373c';
        for (let i = 0; i < 3; i++) g.fillRect(x + 5 + i * 8, y + 3, 3, TILE - 6); // räfflor
        g.strokeStyle = '#20292e'; g.lineWidth = 2; g.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      } else if (c === '=') { // gallerplattform
        g.fillStyle = '#39424e'; g.fillRect(x, y, TILE, 8);
        g.fillStyle = '#4e5c6e'; g.fillRect(x, y, TILE, 2);
        g.fillStyle = '#20262e';
        for (let i = 0; i < 6; i++) g.fillRect(x + 2 + i * 5, y + 3, 2, 4); // gallerhål
      } else if (c === 'S') { // smält metall / het fara
        const gr = g.createLinearGradient(0, y, 0, y + TILE);
        gr.addColorStop(0, '#ffd25e'); gr.addColorStop(0.5, '#ff7a2a'); gr.addColorStop(1, '#c8331b');
        g.fillStyle = gr; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = 'rgba(255,240,180,0.55)';
        for (let i = 0; i < 3; i++) g.fillRect(x + ((rnd() * 26) | 0), y + 2 + ((rnd() * 6) | 0), 4, 2); // glödfläckar
      }
    }
  }
}

// ---- Parallax-bakgrund ------------------------------------------------------
let bgFar = null, bgMid = null;
function buildParallax(theme) {
  if (theme === 'foundry') { buildParallaxFoundry(); return; }
  const rnd = mulberry(99);
  bgFar = document.createElement('canvas'); bgFar.width = 640; bgFar.height = H;
  let g = bgFar.getContext('2d');
  // bergssiluetter
  g.fillStyle = '#5a3a56';
  g.beginPath(); g.moveTo(0, 300);
  for (let x = 0; x <= 640; x += 8) {
    const y = 250 - 60 * Math.abs(Math.sin(x * 0.011 + 1.4)) - 24 * Math.sin(x * 0.037);
    g.lineTo(x, y);
  }
  g.lineTo(640, H); g.lineTo(0, H); g.closePath(); g.fill();
  g.fillStyle = '#432a44';
  g.beginPath(); g.moveTo(0, 320);
  for (let x = 0; x <= 640; x += 8) {
    const y = 285 - 45 * Math.abs(Math.sin(x * 0.017 + 4.2)) - 18 * Math.sin(x * 0.05 + 2);
    g.lineTo(x, y);
  }
  g.lineTo(640, H); g.lineTo(0, H); g.closePath(); g.fill();

  bgMid = document.createElement('canvas'); bgMid.width = 640; bgMid.height = H;
  g = bgMid.getContext('2d');
  // djungelsiluett med palmer
  g.fillStyle = '#2a1e33';
  g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= 640; x += 6) {
    const y = 318 - 26 * Math.abs(Math.sin(x * 0.02 + 0.7)) - 10 * Math.sin(x * 0.09);
    g.lineTo(x, y);
  }
  g.lineTo(640, H); g.closePath(); g.fill();
  for (let i = 0; i < 9; i++) {
    const px = 30 + i * 70 + rnd() * 30, ph = 55 + rnd() * 35, py = 322 - rnd() * 14;
    g.strokeStyle = '#2a1e33'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 8, py - ph * 0.6, px + 4, py - ph); g.stroke();
    g.fillStyle = '#2a1e33';
    for (let l = 0; l < 6; l++) {
      const a = (l / 5) * Math.PI - Math.PI * 0.05;
      g.beginPath();
      g.ellipse(px + 4 + Math.cos(a) * 16, py - ph + Math.sin(-Math.abs(Math.sin(a))) * 6,
        18, 5, a - Math.PI / 2 + 0.4 * (l - 2.5) / 2.5 + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
    }
  }
}
// Sektor 2: fabrikssiluetter — skorstenar, tankar, gantries
function buildParallaxFoundry() {
  const rnd = mulberry(404);
  bgFar = document.createElement('canvas'); bgFar.width = 640; bgFar.height = H;
  let g = bgFar.getContext('2d');
  g.fillStyle = '#20283c';
  for (let i = 0; i < 7; i++) {
    const bx = i * 95 + rnd() * 30, bw = 40 + rnd() * 50, bh = 70 + rnd() * 90;
    g.fillRect(bx, H - bh, bw, bh);
    if (rnd() < 0.6) { g.fillRect(bx + bw * 0.3, H - bh - 40, 12, 40); } // skorsten
  }
  g.fillStyle = 'rgba(120,150,200,0.18)'; // fönsterljus
  for (let i = 0; i < 40; i++) g.fillRect(rnd() * 640, H - 20 - rnd() * 130, 3, 3);

  bgMid = document.createElement('canvas'); bgMid.width = 640; bgMid.height = H;
  g = bgMid.getContext('2d');
  g.fillStyle = '#161d2b';
  for (let i = 0; i < 6; i++) {
    const bx = i * 110 + rnd() * 20, bw = 55 + rnd() * 40, bh = 100 + rnd() * 80;
    g.fillRect(bx, H - bh, bw, bh);
    // kyltornsform / tank
    if (rnd() < 0.5) { g.beginPath(); g.ellipse(bx + bw / 2, H - bh, bw / 2, 14, 0, 0, Math.PI * 2); g.fill(); }
    // rör mellan byggnader
    g.fillStyle = '#10151f'; g.fillRect(bx, H - bh * 0.4, bw + 40, 6); g.fillStyle = '#161d2b';
  }
  // gantry-kran överst
  g.fillStyle = '#0f141d';
  g.fillRect(0, 150, 640, 5);
  for (let i = 0; i < 10; i++) g.fillRect(i * 64, 150, 4, 22);
}

// ---- Webapp/fullskärm ------------------------------------------------------
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches
  || navigator.standalone === true;
function goFullscreen() {
  // Android/desktop: riktig fullskärm. iOS Safari saknar Fullscreen API för
  // canvas — där är "Lägg till på hemskärmen" vägen till helskärm.
  if (isStandalone() || IS_IOS) return;
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
}

// ---- One-liners: 80-tals action + Duke Nukem-anda ---------------------------
const QUIPS = [
  // Schwarzenegger / Terminator / Predator / Commando
  "I'll be back.",
  'Hasta la vista, baby.',
  "Get to the choppa!",
  'Stick around.',
  'If it bleeds, we can kill it.',
  "I ain't got time to bleed.",
  'Consider that a divorce.',
  "Let off some steam.",
  "You're fired.",
  'Knock knock.',
  // Die Hard / Aliens / Predator crew
  'Yippee ki-yay!',
  'Game over, man!',
  'Piece of cake.',
  'What are you waiting for? Christmas?',
  'Come with me if you want to live.',
  'Dead or alive, you\'re coming with me.',
  // Duke Nukem 3D
  'Come get some.',
  'Hail to the king, baby.',
  "Damn, I'm good.",
  'Rest in pieces.',
  "Let God sort 'em out.",
  'Who wants some?',
  'Groovy.',
  "Kick ass, chew gum — all outta gum.",
  'Ready for action!',
  'Nobody messes with me.',
  // extra flavor
  "It's showtime!",
  'Eat lead.',
  'Lights out.',
  'Nap time, tin can.',
  'Class dismissed.',
];
function spawnQuip(x, y) {
  let i;
  do { i = Math.floor(Math.random() * QUIPS.length); } while (QUIPS.length > 1 && i === game.lastQuip);
  game.lastQuip = i;
  game.quips.push({ text: QUIPS[i], x, y, t: 0 });
}
// central kill-räknare — ALLA kills (grunts, heavies, drönare, boss)
// räknas och triggar en one-liner varannan
function addKill(points) {
  game.kills++;
  game.score += points;
  if (game.kills % 2 === 0) spawnQuip(game.player.x, game.player.y - 62);
}

// ---- Speltillstånd ----------------------------------------------------------
const game = {};
function startGame(idx) {
  idx = Math.max(0, Math.min(LEVELS.length - 1, idx | 0));
  if (touchUI) goFullscreen();
  game.score = 0;
  game.kills = 0;
  game.lastQuip = -1;
  game.hpCarry = 5;
  loadLevel(idx);
  game.state = 'play';
}

// power-up-placeringar per bana (världskoordinater ovanför marken)
const LEVEL_POWERUPS = [
  [{ type: 'spread', tx: 24, ty: 10 }, { type: 'spread', tx: 100, ty: 10 }, { type: 'shield', tx: 131, ty: 10 }],
  [{ type: 'spread', tx: 34, ty: 10 }, { type: 'shield', tx: 90, ty: 10 }, { type: 'spread', tx: 150, ty: 10 }],
];

function loadLevel(idx) {
  const L = LEVELS[idx];
  game.level = idx;
  game.theme = L.theme;
  game.hasHeliBoss = L.heliBoss;
  setMap(L.map);
  buildTerrain(L.theme);
  buildParallax(L.theme);

  game.time = 0;
  game.shake = 0;
  game.camX = 0; game.camY = 0;
  game.bullets = [];
  game.ebullets = [];
  game.rockets = [];
  game.particles = [];
  game.pickups = [];
  game.enemies = [];
  game.heavies = [];
  game.drones = [];
  game.robots = [];
  game.boss = null;
  game.bossDead = false;
  game.quips = [];
  game.choppaT = 0;
  game.levelBanner = 3;

  let px = 2 * TILE, py = 9 * TILE;
  game.finishX = LEVEL_W - 3 * TILE;
  game.finishY = 9 * TILE;
  for (let ty = 0; ty < MAPH; ty++) {
    for (let tx = 0; tx < MAPW; tx++) {
      const c = MAP[ty][tx];
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE;
      if (c === 'P') { px = cx; py = cy; }
      else if (c === 'E') game.enemies.push(makeEnemy(cx, cy));
      else if (c === 'R') game.heavies.push(makeHeavy(cx, cy));
      else if (c === 'D') game.drones.push(makeDrone(cx, cy - TILE / 2));
      else if (c === 'W') game.robots.push(makeSentry(cx, cy));
      else if (c === 'T') game.robots.push(makeTurret(cx, cy));
      else if (c === 'X') game.robots.push(makeMecha(cx, cy));
      else if (c === 'M') game.pickups.push({ type: 'med', x: cx, y: cy - 10, t: Math.random() * 6 });
      else if (c === '*') game.pickups.push({ type: 'star', x: cx, y: cy - 10, t: Math.random() * 6 });
      else if (c === 'F') { game.finishX = cx; game.finishY = cy; }
    }
  }
  for (const pu of (LEVEL_POWERUPS[idx] || [])) {
    game.pickups.push({ type: pu.type, x: pu.tx * TILE + 16, y: pu.ty * TILE - 22, t: 0 });
  }

  game.player = makePlayer(px, py);
  game.player.hp = game.hpCarry;
  game.safe = { x: px, y: py };
}

// extraktionsgrind: öppen när banans "boss"/vakter är rensade
function gateOpen() {
  if (game.hasHeliBoss && !game.bossDead) return false;
  if (game.robots && game.robots.some(r => r.kind === 'mecha' && r.hp > 0)) return false;
  return true;
}
function reachExtraction() {
  if (game.level + 1 < LEVELS.length) {
    game.hpCarry = game.player.hp;
    loadLevel(game.level + 1);
  } else {
    game.state = 'win';
    SFX.win();
  }
}

function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 18, h: 46,
    facing: 1, grounded: false, groundedT: 0,
    coyote: 0, jbuf: 0, jumps: 0,
    flipT: -1, landT: 0, crouch: false,
    fireT: 0, flashT: 0,
    hp: 5, maxHp: 5, inv: 0,
    spreadT: 0, shieldT: 0,
    aimMode: 'fwd', deathT: 0,
    animT: 0,
  };
}
function makeEnemy(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 18, h: 46,
    facing: -1, grounded: false,
    hp: 3, hitT: 0, state: 'patrol', dieT: -1,
    aimT: 0, burst: 0, burstT: 0, cool: 1 + Math.random(),
    animT: Math.random() * 10, home: x,
  };
}
function makeHeavy(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 26, h: 52,
    facing: -1, grounded: false,
    hp: 6, hitT: 0, dieT: -1,
    windup: -1, flashT: 0, cool: 2 + Math.random(),
    animT: Math.random() * 10,
  };
}
function makeDrone(x, y) {
  return { x, y, baseY: y, hp: 2, hitT: 0, t: Math.random() * 10, cool: 1.5 + Math.random(), dead: false };
}

// ---- Robotar (Sektor 2) ----------------------------------------------------
function makeSentry(x, y) {
  return {
    kind: 'sentry', x, y, vx: 0, vy: 0, w: 26, h: 52, facing: -1, grounded: false,
    hp: 4, hitT: 0, dieT: -1, state: 'walk', stateT: 0, walkExtra: Math.random() * 1.5,
    scan: 0, burst: 0, burstT: 0, flashT: 0, animT: Math.random() * 10,
  };
}
function makeTurret(x, y) {
  return {
    kind: 'turret', x, y, vx: 0, vy: 0, w: 30, h: 34, facing: 1, grounded: true,
    hp: 5, hitT: 0, dieT: -1, deploy: 0, aim: 0, scan: 0, cool: 1, flashT: 0, animT: Math.random() * 10,
  };
}
function makeMecha(x, y) {
  return {
    kind: 'mecha', x, y, vx: 0, vy: 0, w: 44, h: 64, facing: -1, grounded: false,
    hp: 14, maxHp: 14, hitT: 0, dieT: -1, windup: -1, cool: 1.5 + Math.random(),
    flashT: 0, lastStep: 0, boomT: 0, animT: Math.random() * 10,
  };
}
function robotCanWalk(r, dir) {
  const ahead = r.x + dir * (r.w / 2 + 6);
  const gy = Math.floor((r.y + 4) / TILE);
  const ground = solidAt(Math.floor(ahead / TILE), gy) || platformAt(Math.floor(ahead / TILE), gy);
  const wall = solidAt(Math.floor(ahead / TILE), Math.floor((r.y - 22) / TILE));
  return ground && !wall;
}
function robotBolt(x, y, tx, ty, spd, life) {
  const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
  game.ebullets.push({ x, y, vx: dx / d * spd, vy: dy / d * spd, life, col: '#7dffff' });
  spawnFlash(x, y, dx > 0 ? 1 : -1);
}
// robotar skjuter bara när de faktiskt syns på skärmen (annars "osynliga
// skyttar" bakom kameran) — game.camX är förra framens smoothade kamera
function onScreen(x, margin) {
  margin = margin || 30;
  return x > game.camX + margin && x < game.camX + W - margin;
}
// robotdöd: spränger i bitar — blixt, metallspill, gnistor, rök
function robotExplode(r, big) {
  const cx = r.x, cy = r.y - r.h / 2;
  SFX.edie();
  game.shake = Math.max(game.shake, big ? 9 : 4.5);
  // vit blixt
  game.particles.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0.13, col: '#eafcff', sz: big ? 24 : 15, grav: 0, flash: true });
  // metallspill
  const shards = ['#9fb0c5', '#5a6a7e', '#d8a53a', '#7dffff'];
  const n = big ? 24 : 15;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * (big ? 230 : 175);
    game.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 45,
      life: 0.5 + Math.random() * 0.5, col: shards[i % 4], sz: 2 + Math.random() * 3, grav: 540 });
  }
  // rökpuffar
  for (let i = 0; i < (big ? 9 : 5); i++) {
    game.particles.push({ x: cx + (Math.random() - 0.5) * 22, y: cy, vx: (Math.random() - 0.5) * 34, vy: -30 - Math.random() * 45,
      life: 0.6 + Math.random() * 0.5, col: 'rgba(70,72,80,0.8)', sz: 4 + Math.random() * 3, grav: -30 });
  }
}

function updateRobot(r, dt, p) {
  if (r.kind === 'sentry') updateSentry(r, dt, p);
  else if (r.kind === 'turret') updateTurret(r, dt, p);
  else updateMecha(r, dt, p);
}

function updateSentry(r, dt, p) {
  r.animT += dt; r.hitT = Math.max(0, r.hitT - dt); r.flashT = Math.max(0, r.flashT - dt);
  if (r.hp <= 0) { r.dieT += dt; r.vx = 0; r.vy += GRAV * dt; moveBody(r, dt, true); return; }
  const dx = p.x - r.x;
  const visible = Math.abs(dx) < 250 && Math.abs(p.y - r.y) < 70 && game.state === 'play' && p.inv < 1.0 && onScreen(r.x);
  const inFront = Math.sign(dx) === r.facing;

  switch (r.state) {
    case 'walk':
      r.vx = robotCanWalk(r, r.facing) ? r.facing * 48 : (r.facing *= -1, 0);
      r.stateT += dt;
      if (visible && inFront) { r.state = 'alert'; r.stateT = 0; r.vx = 0; }
      else if (r.stateT > 2.2 + r.walkExtra) { r.state = 'halt'; r.stateT = 0; r.vx = 0; }
      break;
    case 'halt':
      r.vx = 0; r.stateT += dt;
      if (visible && inFront) { r.state = 'alert'; r.stateT = 0; }
      else if (r.stateT > 0.4) { r.state = 'scan'; r.stateT = 0; }
      break;
    case 'scan':
      r.vx = 0; r.stateT += dt;
      r.scan = Math.sin(r.stateT * 4.4); // sensorhuvudet sveper
      if (visible) { r.state = 'alert'; r.stateT = 0; r.scan = 0; r.facing = dx > 0 ? 1 : -1; }
      else if (r.stateT > 1.5) { r.scan = 0; if (Math.random() < 0.6) r.facing *= -1; r.state = 'walk'; r.stateT = 0; r.walkExtra = Math.random() * 1.5; }
      break;
    case 'alert':
      r.vx = 0; r.facing = dx > 0 ? 1 : -1; r.stateT += dt;
      if (r.stateT > 0.5) { r.state = 'fire'; r.stateT = 0; r.burst = 2; r.burstT = 0; }
      break;
    case 'fire':
      r.vx = 0; r.facing = dx > 0 ? 1 : -1; r.burstT -= dt;
      if (r.burstT <= 0 && r.burst > 0) {
        r.burst--; r.burstT = 0.24; r.flashT = 0.09;
        robotBolt(r.x + r.facing * 16, r.y - 30, p.x, p.y - 22, 320, 1.1); SFX.ebeam();
      }
      if (r.burst <= 0 && r.burstT <= 0) { r.state = visible ? 'alert' : 'walk'; r.stateT = 0; }
      break;
  }
  r.vy += GRAV * dt; moveBody(r, dt, true);
}

function updateTurret(r, dt, p) {
  r.animT += dt; r.hitT = Math.max(0, r.hitT - dt); r.flashT = Math.max(0, r.flashT - dt);
  if (r.hp <= 0) { r.dieT += dt; return; }
  const dx = p.x - r.x, dy = (p.y - 22) - (r.y - 16);
  const visible = Math.abs(dx) < 240 && Math.abs(p.y - r.y) < 120 && game.state === 'play' && p.inv < 1.0 && onScreen(r.x);
  if (visible) r.facing = dx > 0 ? 1 : -1; // vänd pjäsen mot spelaren
  r.deploy = Math.max(0, Math.min(1, r.deploy + (visible ? dt * 3 : -dt * 2)));
  if (r.deploy > 0.9 && visible) {
    r.aim = Math.atan2(dy, dx);
    r.cool -= dt;
    if (r.cool <= 0) {
      r.cool = 1.1; r.flashT = 0.09;
      const bx = r.x + Math.cos(r.aim) * 22, by = r.y - 16 + Math.sin(r.aim) * 22;
      robotBolt(bx, by, p.x, p.y - 22, 340, 1.2); SFX.ebeam();
    }
  } else {
    r.scan = Math.sin(r.animT * 1.6) * 0.6; // vilande radarsvep
  }
}

function updateMecha(r, dt, p) {
  r.animT += dt; r.hitT = Math.max(0, r.hitT - dt); r.flashT = Math.max(0, r.flashT - dt);
  if (r.hp <= 0) {
    r.dieT += dt; r.vx = 0; r.vy += GRAV * dt; moveBody(r, dt, true);
    r.boomT -= dt;
    if (r.boomT <= 0 && r.dieT < 2) {
      r.boomT = 0.24;
      killBoom(r.x + (Math.random() - 0.5) * 70, r.y - 30 - Math.random() * 40);
      game.shake = Math.max(game.shake, 5);
    }
    return;
  }
  r.facing = p.x > r.x ? 1 : -1;
  const dx = p.x - r.x;
  // engagera bara när mechan syns på skärmen och spelaren är i räckhåll
  const engage = Math.abs(dx) < 340 && onScreen(r.x) && game.state === 'play';
  r.cool -= dt;
  if (r.windup >= 0) {
    r.vx = 0; r.windup += dt;
    if (r.windup >= 0.7) {
      r.windup = -1; r.cool = 1.8 + Math.random(); r.flashT = 0.22;
      // lobbad granat i BÅGE — horisontell fart kapad så det aldrig blir en
      // kula tvärs över planen (annars når den precis inte, du får kliva in)
      const t = 0.95, g = 560;
      const vx = Math.max(-320, Math.min(320, (p.x - r.x) / t));
      game.rockets.push({ x: r.x + r.facing * 30, y: r.y - 48, vx, vy: -0.5 * g * t, grav: g, life: 2.6 });
      SFX.rocket(); game.shake = Math.max(game.shake, 3);
    }
  } else if (engage && Math.abs(dx) > 150) {
    r.vx = robotCanWalk(r, r.facing) ? r.facing * 40 : 0;
    const step = Math.floor(r.animT * 3.0); // stampljud/skak per fotnedslag
    if (step !== r.lastStep) { r.lastStep = step; if (Math.abs(r.vx) > 5) { game.shake = Math.max(game.shake, 2); SFX.stomp(); } }
    if (r.cool <= 0) r.windup = 0;
  } else if (engage) {
    r.vx = 0;
    if (r.cool <= 0) r.windup = 0;
  } else {
    r.vx = 0; // spelaren utom räckhåll eller osynlig → vänta
  }
  r.vy += GRAV * dt; moveBody(r, dt, true);
}

// ---- Robot-rendering -------------------------------------------------------
const SENTRY_READY = () => sentrySheet.complete && sentrySheet.naturalWidth;
// Sentry Walker-frames i robot-sentry.png (8 kol): gång 0-7, idle/scan 8-12
// (cyan öga) 13-15 (rött), sikta 16-20, eld m. stråle 21-23, död 24-31
function sentryFrame(r) {
  if (r.hp <= 0) return 24 + Math.min(7, Math.floor(r.dieT * 10)); // dödssekvens ~10fps
  if (r.state === 'fire') return 21 + Math.floor(r.animT * 16) % 3;
  if (r.state === 'alert') return 16 + Math.min(4, Math.floor(r.stateT * 10)); // reser kanonen
  if (Math.abs(r.vx) > 5) return Math.floor(r.animT * 11) % 8; // gångcykel
  return 8 + Math.floor(r.animT * 4) % 5; // idle/scan (cyan öga)
}
const TURRET_READY = () => turretSheet.complete && turretSheet.naturalWidth;
// Floor Turret-frames i robot-turret.png (5 kol × 3 rad = 15 frames):
// deploy 0-4, aktiv/idle 5-6, eld m. mynningsflamma 7-9, destruktion 10-14
function turretFrame(r) {
  if (r.hp <= 0) return 10 + Math.min(4, Math.floor(r.dieT * 7)); // dödssekvens ~7fps
  if (r.flashT > 0) return 7 + Math.floor(r.animT * 18) % 3;      // eld m. mynningsflamma
  if (r.deploy > 0.92) return 5 + Math.floor(r.animT * 3) % 2;    // aktiv/aim
  return Math.min(4, Math.floor(r.deploy * 5));                   // deploy/retract
}
function drawRobot(r) {
  if (r.kind === 'sentry' && SENTRY_READY()) {
    if (r.hp <= 0 && r.dieT > 0.85) return;
    ctx.save();
    if (r.hitT > 0) ctx.globalAlpha = 0.6;
    // sentry-sheeten är HÖGERVÄND — flippa vid facing < 0
    drawFrame(sentrySheet, sentryFrame(r), r.x, r.y + 2, r.facing < 0, 64, 72, 8);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }
  if (r.kind === 'turret' && TURRET_READY()) {
    if (r.hp <= 0 && r.dieT > 0.9) return;
    ctx.save();
    if (r.hitT > 0) ctx.globalAlpha = 0.6;
    // turret-sheeten är HÖGERVÄND — flippa vid facing < 0 (64×80, 5 kol)
    drawFrame(turretSheet, turretFrame(r), r.x, r.y + 6, r.facing < 0, 64, 80, 5);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }
  // turret utan sprite: sprängs i bitar direkt (procedurell explosion)
  if (r.hp <= 0 && r.kind === 'turret') return;
  if (r.hp <= 0 && r.kind !== 'mecha') return;
  if (r.hp <= 0 && (r.dieT < 0 || r.dieT > 2.4)) return; // mecha: kollaps + uttoning
  ctx.save();
  if (r.hitT > 0) ctx.globalAlpha = 0.6;
  else if (r.hp <= 0 && r.dieT > 1.6) ctx.globalAlpha = Math.max(0, 1 - (r.dieT - 1.6) / 0.8);
  ctx.translate(Math.round(r.x), Math.round(r.y));
  if (r.facing < 0) ctx.scale(-1, 1);
  if (r.kind === 'sentry') drawSentry(r);
  else if (r.kind === 'turret') drawTurret(r);
  else drawMecha(r);
  ctx.restore();
  ctx.globalAlpha = 1;
}
function eyeColor(state) {
  return state === 'fire' ? '#ff3b3b' : state === 'alert' ? '#ffb020' : '#7dffff';
}
function drawSentry(r) {
  const dead = r.hp <= 0;
  const walking = Math.abs(r.vx) > 5 && !dead;
  const step = walking ? Math.sin(r.animT * 11) : 0;
  // ben (två, motrörelse)
  ctx.fillStyle = '#232a33';
  ctx.fillRect(-8, -13 + Math.max(0, step) * 2, 6, 13);
  ctx.fillRect(3, -13 + Math.max(0, -step) * 2, 6, 13);
  ctx.fillStyle = '#151a20';
  ctx.fillRect(-9, -3, 8, 4); ctx.fillRect(2, -3, 8, 4); // fötter
  // torso
  ctx.fillStyle = '#3c4756';
  ctx.fillRect(-9, -34, 19, 22);
  ctx.fillStyle = '#4e5c6e';
  ctx.fillRect(-9, -34, 19, 4);
  ctx.fillStyle = '#d8a53a'; // hazard-remsa
  ctx.fillRect(-9, -20, 19, 2);
  ctx.fillStyle = '#20262e';
  ctx.fillRect(-6, -30, 12, 7); // panel
  // arm-kanon (framåt)
  ctx.fillStyle = '#2b3038';
  ctx.fillRect(4, -30, 18, 7);
  ctx.fillStyle = '#4e5c6e';
  ctx.fillRect(18, -31, 5, 9);
  if (r.flashT > 0) { ctx.fillStyle = '#bffcff'; ctx.beginPath(); ctx.arc(24, -27, 5, 0, Math.PI * 2); ctx.fill(); }
  // sensorhuvud (roterar med scan)
  ctx.save();
  ctx.translate(0, -37);
  ctx.rotate((r.scan || 0) * 0.5);
  ctx.fillStyle = '#454f5e';
  ctx.fillRect(-7, -9, 14, 10);
  ctx.fillStyle = dead ? '#555' : eyeColor(r.state);
  ctx.fillRect(2, -6, 6, 4); // öga
  if (!dead && (r.state === 'scan' || (r.state === 'fire' || r.state === 'alert'))) {
    // scanner-kon
    const col = r.state === 'scan' ? 'rgba(125,255,255,0.16)' : 'rgba(255,80,60,0.14)';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(70, -22); ctx.lineTo(70, 16); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawTurret(r) {
  const d = r.deploy;
  const dead = r.hp <= 0;
  // sockel
  ctx.fillStyle = '#2b323d';
  ctx.fillRect(-13, -12, 26, 12);
  ctx.fillStyle = '#3c4756';
  ctx.fillRect(-13, -12, 26, 3);
  ctx.fillStyle = '#d8a53a';
  ctx.fillRect(-13, -4, 26, 2);
  // torn reser sig
  const rise = d * 12;
  ctx.fillStyle = '#454f5e';
  ctx.fillRect(-8, -12 - rise, 16, 4 + rise);
  // pjäshuvud
  ctx.save();
  ctx.translate(0, -12 - rise);
  ctx.fillStyle = '#3c4756';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dead ? '#555' : (d > 0.9 ? eyeColor('alert') : eyeColor('scan'));
  ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI * 2); ctx.fill();
  if (d > 0.5) {
    ctx.rotate(d > 0.9 ? r.aim : (r.scan || 0));
    ctx.fillStyle = '#20262e';
    ctx.fillRect(4, -3, 18 * d, 6);
    ctx.fillStyle = '#4e5c6e';
    ctx.fillRect(20 * d, -4, 4, 8);
    if (r.flashT > 0) { ctx.fillStyle = '#bffcff'; ctx.beginPath(); ctx.arc(24 * d, 0, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function drawMecha(r) {
  const dead = r.hp <= 0;
  const walking = Math.abs(r.vx) > 5 && !dead;
  const bob = walking ? Math.abs(Math.sin(r.animT * 3.0)) * 3 : 0;
  const step = walking ? Math.sin(r.animT * 3.0) : 0;
  // ben (kraftiga, stampande)
  ctx.fillStyle = '#2b323d';
  ctx.fillRect(-18, -22 + Math.max(0, step) * 4, 13, 22);
  ctx.fillRect(6, -22 + Math.max(0, -step) * 4, 13, 22);
  ctx.fillStyle = '#151a20';
  ctx.fillRect(-20, -4, 16, 5); ctx.fillRect(5, -4, 16, 5); // hydrauliska fötter
  // höft
  ctx.fillStyle = '#3c4756';
  ctx.fillRect(-16, -30, 32, 10);
  // torso/cockpit
  ctx.fillStyle = '#454f5e';
  ctx.fillRect(-18, -58 - bob, 34, 30);
  ctx.fillStyle = '#5a6a7e';
  ctx.fillRect(-18, -58 - bob, 34, 5);
  ctx.fillStyle = '#d8a53a';
  ctx.fillRect(-18, -34 - bob, 34, 3); // hazard
  // cockpit-öga
  ctx.fillStyle = dead ? '#555' : (r.windup >= 0 ? '#ff3b3b' : '#ff8020');
  ctx.fillRect(2, -52 - bob, 12, 6);
  ctx.fillStyle = '#20262e';
  ctx.fillRect(-14, -52 - bob, 12, 12); // panel
  // axelmonterad granatkastare
  ctx.fillStyle = '#2b3038';
  ctx.fillRect(0, -60 - bob, 24, 9);
  ctx.fillStyle = '#4e5c6e';
  ctx.fillRect(20, -61 - bob, 6, 11);
  if (r.flashT > 0) { ctx.fillStyle = '#ffd25e'; ctx.beginPath(); ctx.arc(28, -56 - bob, 6, 0, Math.PI * 2); ctx.fill(); }
  // skaderök när < halva HP
  if (!dead && r.hp <= r.maxHp / 2 && Math.random() < 0.25) {
    game.particles.push({ x: r.x + (Math.random() - 0.5) * 30, y: r.y - 55, vx: (Math.random() - 0.5) * 15,
      vy: -30 - Math.random() * 25, life: 0.6, col: 'rgba(60,60,64,0.8)', sz: 4, grav: -30 });
  }
}

// ---- Fysik ------------------------------------------------------------------
function moveBody(b, dt, oneWay) {
  // X
  b.x += b.vx * dt;
  const hw = b.w / 2;
  if (b.vx > 0) {
    const tx = Math.floor((b.x + hw) / TILE);
    for (let ty = Math.floor((b.y - b.h + 2) / TILE); ty <= Math.floor((b.y - 2) / TILE); ty++) {
      if (solidAt(tx, ty)) { b.x = tx * TILE - hw - 0.01; b.vx = 0; break; }
    }
  } else if (b.vx < 0) {
    const tx = Math.floor((b.x - hw) / TILE);
    for (let ty = Math.floor((b.y - b.h + 2) / TILE); ty <= Math.floor((b.y - 2) / TILE); ty++) {
      if (solidAt(tx, ty)) { b.x = (tx + 1) * TILE + hw + 0.01; b.vx = 0; break; }
    }
  }
  // Y
  const wasY = b.y;
  b.y += b.vy * dt;
  b.grounded = false;
  if (b.vy >= 0) {
    const ty = Math.floor(b.y / TILE);
    for (let tx = Math.floor((b.x - hw + 2) / TILE); tx <= Math.floor((b.x + hw - 2) / TILE); tx++) {
      const plat = oneWay && platformAt(tx, ty) && wasY <= ty * TILE + 1;
      if (solidAt(tx, ty) || plat) {
        b.y = ty * TILE - 0.01; b.vy = 0; b.grounded = true; break;
      }
    }
  } else {
    const ty = Math.floor((b.y - b.h) / TILE);
    for (let tx = Math.floor((b.x - hw + 2) / TILE); tx <= Math.floor((b.x + hw - 2) / TILE); tx++) {
      if (solidAt(tx, ty)) { b.y = (ty + 1) * TILE + b.h + 0.01; b.vy = 0; break; }
    }
  }
}

const GRAV = 1500;

function updatePlayer(p, dt) {
  const acc = p.grounded ? 2000 : 1400;
  p.crouch = p.grounded && inDown();
  const maxV = p.crouch ? 80 : 215; // hukad gång är långsam men möjlig

  if (inLeft())  { p.vx -= acc * dt; p.facing = -1; }
  else if (inRight()) { p.vx += acc * dt; p.facing = 1; }
  else p.vx *= Math.pow(p.grounded ? 0.0006 : 0.02, dt);
  p.vx = Math.max(-maxV, Math.min(maxV, p.vx));

  // hopp
  p.coyote = p.grounded ? 0.09 : Math.max(0, p.coyote - dt);
  if (pendingJump) { p.jbuf = 0.12; pendingJump = false; }
  else p.jbuf = Math.max(0, p.jbuf - dt);
  if (p.jbuf > 0) {
    if (p.coyote > 0) {
      p.vy = -530; p.jumps = 1; p.coyote = 0; p.jbuf = 0; p.flipT = -1;
      SFX.jump();
      spawnDust(p.x, p.y, 6);
    } else if (p.jumps === 1) {
      p.vy = -480; p.jumps = 2; p.jbuf = 0; p.flipT = 0;
      SFX.flip();
      spawnDust(p.x, p.y, 4);
    }
  }
  if (!inJump() && p.vy < -180) p.vy = -180; // variabel hopphöjd

  p.vy += GRAV * dt;
  p.vy = Math.min(p.vy, 900);

  const wasGrounded = p.grounded, fallV = p.vy;
  moveBody(p, dt, true);
  if (p.grounded) {
    if (!wasGrounded) {
      p.landT = 0.14; p.flipT = -1;
      if (fallV > 420) { SFX.land(); spawnDust(p.x, p.y, 8); game.shake = Math.max(game.shake, 2.5); }
      p.jumps = 0;
    }
    p.groundedT += dt;
    if (p.groundedT > 0.25 && Math.abs(p.vx) < 10 && !spikeNear(p)) game.safe = { x: p.x, y: p.y };
  } else p.groundedT = 0;
  p.landT = Math.max(0, p.landT - dt);
  if (p.flipT >= 0) p.flipT += dt;

  // power-up-timers
  p.spreadT = Math.max(0, p.spreadT - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);

  // sikte (Contra-schema): upp + stillastående = RAKT UPP,
  // upp + rörelse/luft = snett upp 45°, annars rakt fram
  const moving = Math.abs(p.vx) > 30 || inLeft() || inRight();
  p.aimMode = 'fwd';
  if (inUp() && !p.crouch) p.aimMode = (moving || !p.grounded) ? 'diag' : 'up';

  // skjuta
  p.fireT -= dt; p.flashT -= dt;
  if (inFire() && p.fireT <= 0) {
    p.fireT = p.spreadT > 0 ? 0.11 : 0.13;
    p.flashT = 0.06;
    const f = p.facing;
    let mx, my, bvx, bvy;
    if (p.aimMode === 'up') {
      mx = p.x + f * 5; my = p.y - 54;
      bvx = 0; bvy = -720;
    } else if (p.aimMode === 'diag') {
      mx = p.x + f * 16; my = p.y - 46;
      bvx = f * 510; bvy = -510;
    } else if (p.crouch) {
      mx = p.x + f * 26; my = p.y - 15;
      bvx = f * 720; bvy = 0;
    } else {
      mx = p.x + f * 26; my = p.y - 30;
      bvx = f * 720; bvy = 0;
    }
    if (p.spreadT > 0) {
      for (const off of [-130, 0, 130]) {
        // sprid vinkelrätt mot skottriktningen
        const nx = -bvy / 720, ny = bvx / 720;
        game.bullets.push({ x: mx, y: my, vx: bvx + nx * off, vy: bvy + ny * off, life: 0.9 });
      }
    } else {
      const jitter = p.aimMode === 'fwd' ? (Math.random() - 0.5) * 26 : 0;
      game.bullets.push({ x: mx, y: my, vx: bvx, vy: bvy + jitter, life: 0.9 });
    }
    p.vx -= f * (p.crouch ? 10 : p.aimMode === 'up' ? 0 : 26); // rekyl
    SFX.shoot();
    spawnFlash(mx + f * 4, my - (p.aimMode !== 'fwd' ? 4 : 0), f);
    spawnShell(p.x - f * 4, my - 4, -f);
  }

  // faror
  p.inv = Math.max(0, p.inv - dt);
  if (spikeNear(p) && p.inv <= 0) hurtPlayer(p, 1, 0);
  if (p.y > LEVEL_H + 60) {
    hurtPlayer(p, 1, 0, true);
    if (game.state === 'play') { p.x = game.safe.x; p.y = game.safe.y; p.vx = p.vy = 0; }
  }

  // boss-trigger (endast heli-banan)
  if (game.hasHeliBoss && !game.boss && !game.bossDead && p.x > BOSS_TRIGGER_X) {
    game.boss = makeBoss();
    SFX.alarm();
    game.shake = Math.max(game.shake, 4);
  }

  // mål (låst tills banans vakter är rensade) → nästa bana eller vinst
  if (gateOpen() && Math.abs(p.x - game.finishX) < 26 && Math.abs(p.y - game.finishY) < 60) {
    reachExtraction();
  }

  p.animT += dt;
}
function spikeNear(p) {
  const ty = Math.floor((p.y - 4) / TILE);
  return spikeAt(Math.floor((p.x - p.w / 2 + 3) / TILE), ty) || spikeAt(Math.floor((p.x + p.w / 2 - 3) / TILE), ty);
}
function hurtPlayer(p, dmg, kbx, silentPos) {
  if (p.inv > 0 || game.state !== 'play') return;
  if (p.shieldT > 0) { spawnSparks(p.x, p.y - 26, 6, '#6ee7ff'); return; }
  p.hp -= dmg; p.inv = 1.2;
  p.vy = -260; p.vx = kbx || -p.facing * 140;
  game.shake = Math.max(game.shake, 5);
  SFX.hurt();
  spawnSparks(p.x, p.y - 26, 10, '#ff5544');
  if (p.hp <= 0) {
    // Contra-död: flyg bakåt av träffen, snurra och fall genom världen
    game.state = 'dead';
    p.deathT = 0;
    p.vy = -430;
    p.vx = -p.facing * 190;
    game.shake = 9;
    SFX.dead();
  }
}

// ---- Fiender -------------------------------------------------------------
function updateEnemy(e, dt, p) {
  if (e.hp <= 0) {
    // death-animation: låt kroppen falla klart, spela sekvensen, ligg kvar en stund
    if (e.dieT >= 0) e.dieT += dt;
    e.vx = 0;
    e.vy += GRAV * dt;
    moveBody(e, dt, true);
    return;
  }
  e.hitT = Math.max(0, e.hitT - dt);
  const dx = p.x - e.x, dy = p.y - e.y;
  const sees = Math.abs(dx) < 300 && Math.abs(dy) < 70 && game.state === 'play' && p.inv < 1.0;

  const canWalk = dir => {
    // finns mark framför och ingen vägg? (så de inte vandrar ut i stup)
    const ahead = e.x + dir * (e.w / 2 + 6);
    const groundAhead = solidAt(Math.floor(ahead / TILE), Math.floor((e.y + 4) / TILE))
                     || platformAt(Math.floor(ahead / TILE), Math.floor((e.y + 4) / TILE));
    const wallAhead = solidAt(Math.floor(ahead / TILE), Math.floor((e.y - 20) / TILE));
    return groundAhead && !wallAhead;
  };

  if (sees) {
    e.facing = dx > 0 ? 1 : -1;
    e.state = 'aim';
    // tryck framåt mot spelaren mellan salvorna (Metal Slug-stil),
    // stå bara stilla under själva bursten
    if (e.burst > 0 || Math.abs(dx) < 90) e.vx = 0;
    else e.vx = canWalk(e.facing) ? e.facing * 34 : 0;
    e.cool -= dt;
    if (e.cool <= 0 && e.burst === 0) { e.burst = 3; e.burstT = 0.25; }
    if (e.burst > 0) {
      e.burstT -= dt;
      if (e.burstT <= 0) {
        e.burst--; e.burstT = 0.14;
        if (e.burst === 0) e.cool = 1.3 + Math.random() * 0.8;
        const my = e.y - 30;
        game.ebullets.push({ x: e.x + e.facing * 26, y: my, vx: e.facing * 420, vy: 0, life: 1.4 });
        e.flashT = 0.07;
        SFX.eshoot();
        spawnFlash(e.x + e.facing * 30, my, e.facing);
      }
    }
  } else {
    e.state = 'patrol';
    e.burst = 0;
    // patrullera raskt, vänd vid kant eller vägg
    if (!canWalk(e.facing) && e.grounded) e.facing *= -1;
    e.vx = e.facing * 55;
  }
  e.flashT = (e.flashT || 0) - dt;
  e.vy += GRAV * dt;
  moveBody(e, dt, true);
  e.animT += dt;
}
function updateHeavy(h, dt, p) {
  if (h.hp <= 0) {
    if (h.dieT >= 0) h.dieT += dt;
    h.vx = 0;
    h.vy += GRAV * dt;
    moveBody(h, dt, true);
    return;
  }
  h.hitT = Math.max(0, h.hitT - dt);
  h.flashT = Math.max(0, h.flashT - dt);
  const dx = p.x - h.x, dy = p.y - h.y;
  const sees = Math.abs(dx) < 420 && Math.abs(dy) < 80 && game.state === 'play';

  if (sees) {
    h.facing = dx > 0 ? 1 : -1;
    // avancera tungt mot spelaren när den är långt bort och ingen windup pågår
    if (h.windup < 0 && Math.abs(dx) > 200) {
      const ahead = h.x + h.facing * (h.w / 2 + 6);
      const ok = (solidAt(Math.floor(ahead / TILE), Math.floor((h.y + 4) / TILE))
               || platformAt(Math.floor(ahead / TILE), Math.floor((h.y + 4) / TILE)))
               && !solidAt(Math.floor(ahead / TILE), Math.floor((h.y - 24) / TILE));
      h.vx = ok ? h.facing * 30 : 0;
    } else h.vx = 0;
    if (h.windup >= 0) {
      h.windup += dt;
      if (h.windup >= 0.55) { // avfyra!
        h.windup = -1;
        h.flashT = 0.28;
        h.cool = 2.6 + Math.random() * 0.9;
        game.rockets.push({ x: h.x + h.facing * 36, y: h.y - 30, vx: h.facing * 250, life: 3.5 });
        SFX.rocket();
        game.shake = Math.max(game.shake, 2);
        spawnFlash(h.x + h.facing * 40, h.y - 30, h.facing);
      }
    } else {
      h.cool -= dt;
      if (h.cool <= 0) h.windup = 0;
    }
  } else {
    h.windup = -1;
    // långsam hotfull patrull
    const ahead = h.x + h.facing * (h.w / 2 + 6);
    const groundAhead = solidAt(Math.floor(ahead / TILE), Math.floor((h.y + 4) / TILE))
                     || platformAt(Math.floor(ahead / TILE), Math.floor((h.y + 4) / TILE));
    const wallAhead = solidAt(Math.floor(ahead / TILE), Math.floor((h.y - 24) / TILE));
    if ((!groundAhead || wallAhead) && h.grounded) h.facing *= -1;
    h.vx = h.facing * 32;
  }
  h.vy += GRAV * dt;
  moveBody(h, dt, true);
  h.animT += dt;
}

// ---- Boss: attackhelikopter -------------------------------------------------
function makeBoss() {
  return {
    x: BOSS_TRIGGER_X + W + 180, y: 150,
    hp: 38, maxHp: 38, // lite tuffare än ursprungliga 35 nu när man kan sikta uppåt
    state: 'enter', t: 0, animT: 0,
    cool: 2.2, flashT: 0, hitT: 0, dieT: -1,
    facing: -1, fireT: 0, strafeDir: -1, boomT: 0, drops: 0,
  };
}
const bossPhase2 = b => b.hp <= b.maxHp * 0.5;

function updateBoss(b, dt, p) {
  b.animT += dt; b.t += dt;
  b.hitT = Math.max(0, b.hitT - dt);
  b.flashT = Math.max(0, b.flashT - dt);

  if (b.dieT >= 0) { // störtar
    b.dieT += dt;
    b.y += (40 + b.dieT * 90) * dt;
    b.x += b.facing * 20 * dt;
    b.boomT -= dt;
    if (b.boomT <= 0) {
      b.boomT = 0.22;
      killBoom(b.x + (Math.random() - 0.5) * 100, b.y + (Math.random() - 0.5) * 50);
    }
    if (b.y > 9 * TILE) { // marken
      for (let i = 0; i < 4; i++) killBoom(b.x + (Math.random() - 0.5) * 130, b.y + (Math.random() - 0.5) * 40);
      game.shake = 14;
      addKill(1000);
      game.bossDead = true;
      game.boss = null;
      game.choppaT = 3.5; // "GET TO THE CHOPPA!"
      SFX.bossdie();
    }
    return;
  }

  b.facing = p.x > b.x ? 1 : -1;
  const p2 = bossPhase2(b);
  const speed = p2 ? 130 : 90;

  if (b.state === 'enter') {
    b.x += (6100 - b.x) * Math.min(1, 1.4 * dt);
    if (Math.abs(b.x - 6100) < 40) { b.state = 'hover'; b.cool = 1.6; }
  } else if (b.state === 'hover') {
    const tx = Math.max(5820, Math.min(6180, p.x + (p.x < b.x ? 170 : -170)));
    const ty = Math.max(130, Math.min(235, p.y - 110));
    b.x += Math.sign(tx - b.x) * Math.min(speed * dt, Math.abs(tx - b.x));
    b.y += Math.sign(ty - b.y) * Math.min(70 * dt, Math.abs(ty - b.y));
    b.y += Math.sin(b.t * 2.1) * 8 * dt;
    b.cool -= dt;
    if (b.cool <= 0) {
      const moves = p2 ? ['gatling', 'rocket', 'strafe', 'drop'] : ['gatling', 'rocket'];
      let mv = moves[Math.floor(Math.random() * moves.length)];
      const nearby = game.enemies.filter(e => e.hp > 0 && e.x > BOSS_TRIGGER_X - 200).length;
      if (mv === 'drop' && (b.drops >= 2 || nearby >= 2)) mv = 'strafe';
      b.state = mv; b.t = 0; b.fireT = 0;
    }
  } else if (b.state === 'gatling') {
    if (b.t > 0.5) { // telegraferad windup, sen spray
      b.fireT -= dt;
      if (b.fireT <= 0) {
        b.fireT = 0.13;
        b.flashT = 0.08;
        const dx = p.x - b.x, dy = (p.y - 24) - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const s = 330 / d, spread = 40;
        game.ebullets.push({ x: b.x + b.facing * 50, y: b.y + 14,
          vx: dx * s + (Math.random() - 0.5) * spread, vy: dy * s + (Math.random() - 0.5) * spread, life: 2.2 });
        SFX.eshoot();
      }
    }
    if (b.t > (p2 ? 2.1 : 1.7)) { b.state = 'hover'; b.cool = p2 ? 1.4 : 2.2; }
  } else if (b.state === 'rocket') {
    if ((b.t > 0.5 && b.fireT === 0) || (b.t > 0.9 && b.fireT === 1)) {
      b.fireT++;
      b.flashT = 0.15;
      const dx = p.x - b.x, dy = (p.y - 20) - b.y;
      const d = Math.hypot(dx, dy) || 1;
      game.rockets.push({ x: b.x + b.facing * 40, y: b.y + 18, vx: dx / d * 265, vy: dy / d * 265, life: 3 });
      SFX.rocket();
    }
    if (b.t > 1.3) { b.state = 'hover'; b.cool = p2 ? 1.5 : 2.4; }
  } else if (b.state === 'strafe') {
    if (b.t < 0.4) {
      b.strafeDir = p.x > b.x ? 1 : -1; // sikta in sig
    } else {
      b.x += b.strafeDir * 430 * dt;
      b.y += (140 - b.y) * 2 * dt;
      b.fireT -= dt;
      if (b.fireT <= 0) {
        b.fireT = 0.32;
        game.rockets.push({ x: b.x, y: b.y + 40, vx: b.strafeDir * 90, vy: 40, grav: 520, life: 3 });
      }
      if (b.x < 5790 || b.x > 6210) { b.state = 'hover'; b.cool = 1.6; }
    }
  } else if (b.state === 'drop') {
    if (b.t > 0.7 && !b.dropped) {
      b.dropped = true; b.drops++;
      const e = makeEnemy(b.x, b.y + 50);
      e.vy = 60;
      game.enemies.push(e);
    }
    if (b.t > 1.5) { b.state = 'hover'; b.dropped = false; b.cool = 1.8; }
  }
}

function bossFrame(b) {
  if (b.dieT >= 0) return b.dieT < 0.4 ? BOSS_F.DMG[0] : BOSS_F.CRASH;
  if (b.state === 'drop') return BOSS_F.DROP;
  if (b.flashT > 0) return BOSS_F.FIRE[Math.floor(b.animT * 20) % 2];
  if (b.state === 'gatling' || b.state === 'rocket') return BOSS_F.AIM;
  if (bossPhase2(b)) return BOSS_F.DMG[Math.floor(b.animT * 8) % 2];
  return BOSS_F.HOVER[Math.floor(b.animT * 10) % 4];
}

function updateRockets(dt, p) {
  for (const r of game.rockets) {
    r.x += r.vx * dt;
    if (r.vy) r.y += r.vy * dt;
    if (r.grav) r.vy = (r.vy || 0) + r.grav * dt;
    r.life -= dt;
    // rökspår
    if (Math.random() < 0.7) game.particles.push({
      x: r.x - Math.sign(r.vx) * 10, y: r.y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 20, vy: -12 - Math.random() * 18,
      life: 0.4 + Math.random() * 0.3, col: 'rgba(180,180,190,0.7)', sz: 2.5, grav: -20 });
    let boom = r.life <= 0 || solidAt(Math.floor((r.x + Math.sign(r.vx) * 8) / TILE), Math.floor(r.y / TILE));
    if (!boom && game.state === 'play' && Math.abs(r.x - p.x) < 14 && r.y > p.y - p.h && r.y < p.y + 4) boom = true;
    if (boom) {
      r.life = 0;
      killBoom(r.x, r.y);
      // splash-skada med tryckvåg
      if (game.state === 'play' && Math.hypot(p.x - r.x, (p.y - 24) - r.y) < 52) {
        hurtPlayer(p, 1, Math.sign(p.x - r.x) * 200);
      }
    }
  }
  game.rockets = game.rockets.filter(r => r.life > 0);
}

function updateDrone(d, dt, p) {
  if (d.dead) return;
  d.t += dt;
  d.hitT = Math.max(0, d.hitT - dt);
  d.y = d.baseY + Math.sin(d.t * 2.2) * 8;
  const dx = p.x - d.x, dy = p.y - 24 - d.y;
  const dist = Math.hypot(dx, dy);
  // följ spelaren horisontellt om den är i närheten...
  if (dist < 340 && game.state === 'play') {
    d.x += (dx > 0 ? 1 : -1) * Math.min(26 * dt, Math.abs(dx) * dt);
  }
  // ...men skjut bara när drönaren faktiskt syns på skärmen (annars osynlig
  // skytt som pangar över hela planen)
  if (dist < 250 && onScreen(d.x) && game.state === 'play') {
    d.cool -= dt;
    if (d.cool <= 0) {
      d.cool = 1.7 + Math.random() * 0.5;
      const s = 300 / Math.max(dist, 1);
      game.ebullets.push({ x: d.x, y: d.y + 6, vx: dx * s, vy: dy * s, life: 1.1 });
      SFX.eshoot();
    }
  }
}

// ---- Skott & partiklar ------------------------------------------------------
function updateBullets(dt, p) {
  for (const b of game.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (solidAt(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) {
      b.life = 0; spawnSparks(b.x, b.y, 5, '#ffd25e');
    }
    for (const e of game.enemies) {
      if (e.hp > 0 && Math.abs(b.x - e.x) < 14 && b.y > e.y - e.h && b.y < e.y + 4 && b.life > 0) {
        b.life = 0; e.hp--; e.hitT = 0.1;
        spawnSparks(b.x, b.y, 6, '#ff8866');
        if (e.hp <= 0) killEnemy(e);
      }
    }
    for (const h of game.heavies) {
      if (h.hp > 0 && Math.abs(b.x - h.x) < 17 && b.y > h.y - h.h && b.y < h.y + 4 && b.life > 0) {
        b.life = 0; h.hp--; h.hitT = 0.1;
        spawnSparks(b.x, b.y, 6, '#ff8866');
        if (h.hp <= 0) {
          addKill(250);
          h.dieT = 0;
          SFX.edie();
          game.shake = Math.max(game.shake, 4);
          spawnSparks(h.x, h.y - 30, 12, '#a3232b');
        }
      }
    }
    const bo = game.boss;
    if (bo && bo.dieT < 0 && b.life > 0 && Math.abs(b.x - bo.x) < 68 && Math.abs(b.y - bo.y) < 46) {
      b.life = 0; bo.hp--; bo.hitT = 0.08;
      spawnSparks(b.x, b.y, 5, '#ffd25e');
      if (bo.hp <= 0) { bo.dieT = 0; game.shake = 8; }
    }
    for (const d of game.drones) {
      if (!d.dead && Math.hypot(b.x - d.x, b.y - d.y) < 14 && b.life > 0) {
        b.life = 0; d.hp--; d.hitT = 0.1;
        spawnSparks(b.x, b.y, 6, '#8be9fd');
        if (d.hp <= 0) { d.dead = true; killBoom(d.x, d.y); addKill(150); }
      }
    }
    for (const r of game.robots) {
      const top = r.kind === 'turret' ? r.y - r.h : r.y - r.h;
      if (r.hp > 0 && r.dieT < 0 && b.life > 0 &&
          Math.abs(b.x - r.x) < r.w / 2 + 5 && b.y > top && b.y < r.y + 4) {
        b.life = 0; r.hp--; r.hitT = 0.1;
        spawnSparks(b.x, b.y, 6, '#8be9fd');
        if (r.hp <= 0) {
          const pts = r.kind === 'mecha' ? 400 : r.kind === 'turret' ? 120 : 150;
          addKill(pts); r.dieT = 0;
          const spriteDeath = (r.kind === 'sentry' && SENTRY_READY()) || (r.kind === 'turret' && TURRET_READY());
          if (spriteDeath) {
            // spriten har egen explosions-/spillrsekvens — bara skak + ljud + gnistor
            SFX.edie(); game.shake = Math.max(game.shake, 5);
            spawnSparks(r.x, r.y - r.h / 2, 8, '#ffd25e');
          } else {
            robotExplode(r, r.kind === 'mecha');
            if (r.kind === 'mecha') r.boomT = 0.2; // följs av kedje-explosioner
          }
        }
      }
    }
  }
  game.bullets = game.bullets.filter(b => b.life > 0);

  for (const b of game.ebullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (solidAt(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) { b.life = 0; spawnSparks(b.x, b.y, 3, '#ff7755'); }
    if (game.state === 'play' && p.inv <= 0 && b.life > 0 &&
        Math.abs(b.x - p.x) < 11 && b.y > p.y - p.h && b.y < p.y + 2 && !(p.crouch && b.y < p.y - 26)) {
      b.life = 0;
      hurtPlayer(p, 1, (b.vx > 0 ? 1 : -1) * 150);
    }
  }
  game.ebullets = game.ebullets.filter(b => b.life > 0);
}
function killEnemy(e) {
  addKill(100);
  e.dieT = 0;
  SFX.edie();
  game.shake = Math.max(game.shake, 3);
  spawnSparks(e.x, e.y - 30, 10, '#a3232b'); // träffreaktionen sköter resten
}
function killBoom(x, y) {
  SFX.edie();
  game.shake = Math.max(game.shake, 4);
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5 + Math.random() * 0.4,
      col: ['#ffd25e', '#ff8c42', '#ff5544', '#999'][i % 4], sz: 2 + Math.random() * 3, grav: 500 });
  }
}
function spawnSparks(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.2 + Math.random() * 0.2, col, sz: 1.5, grav: 300 });
  }
}
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    game.particles.push({ x: x + (Math.random() - 0.5) * 16, y: y - 2, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40,
      life: 0.3 + Math.random() * 0.25, col: 'rgba(190,170,140,0.7)', sz: 2 + Math.random() * 2, grav: -30 });
  }
}
function spawnFlash(x, y, dir) {
  game.particles.push({ x, y, vx: dir * 30, vy: 0, life: 0.05, col: '#fff3b0', sz: 6, grav: 0, flash: true });
}
function spawnShell(x, y, dir) {
  game.particles.push({ x, y, vx: dir * (40 + Math.random() * 40), vy: -120 - Math.random() * 60,
    life: 0.5, col: '#e8c35a', sz: 1.5, grav: 800 });
}
function updateParticles(dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav || 0) * dt; p.life -= dt;
  }
  game.particles = game.particles.filter(p => p.life > 0);
}
function updatePickups(dt, p) {
  for (const u of game.pickups) {
    u.t += dt;
    if (Math.abs(u.x - p.x) < 20 && Math.abs(u.y - (p.y - 22)) < 26) {
      u.got = true;
      if (u.type === 'med') { p.hp = Math.min(p.maxHp, p.hp + 1); SFX.heal(); }
      else if (u.type === 'spread') { p.spreadT = 12; game.score += 100; SFX.power(); }
      else if (u.type === 'shield') { p.shieldT = 8; game.score += 100; SFX.power(); }
      else { game.score += 50; SFX.pickup(); }
      const cols = { med: '#7dff9b', spread: '#ffa94e', shield: '#6ee7ff', star: '#ffe066' };
      spawnSparks(u.x, u.y, 10, cols[u.type]);
    }
  }
  game.pickups = game.pickups.filter(u => !u.got);
}

// ---- Rendering ---------------------------------------------------------------
function playerFrame(p) {
  // returnerar [bild, frameindex] — aim-sheeten eller move-sheeten
  if (game.state === 'dead') return [pMove, PM.FLIP[0]];
  if (p.crouch) {
    if (Math.abs(p.vx) > 15) { // hukad gång
      if (p.flashT > 0) return [pMove, PM.CFIRE[Math.floor(p.animT * 20) % 2]];
      return [pMove, PM.CWALK[Math.floor(p.animT * 8) % 3]];
    }
    if (p.flashT > 0) return [pAim, PA.CFIRE[Math.floor(p.animT * 20) % 2]];
    return [pAim, PA.CAIM];
  }
  if (!p.grounded) {
    if (p.flipT >= 0) {
      const i = Math.floor(p.flipT * 12);
      return [pMove, i < PM.FLIP.length ? PM.FLIP[i] : PM.LEAP];
    }
    if (p.flashT > 0) return [pMove, PM.AIRFIRE[Math.floor(p.animT * 20) % 2]];
    return [pMove, p.vy < -60 ? PM.RISE : PM.FALL];
  }
  if (p.landT > 0.06 && Math.abs(p.vx) < 40) return [pMove, PM.LAND];
  if (Math.abs(p.vx) > 30) {
    // löpning — med gevär snett upp om man siktar uppåt
    if (p.aimMode === 'diag') return [pMove, PM.RUNUP[Math.floor(p.animT * 10) % 3]];
    return [pMove, PM.RUN[Math.floor(p.animT * 12) % 6]];
  }
  if (p.aimMode === 'up') {
    if (p.flashT > 0) return [pAim, PA.FIREU[Math.floor(p.animT * 20) % 2]];
    return [pAim, PA.AIMU];
  }
  if (p.aimMode === 'diag') {
    if (p.flashT > 0) return [pAim, PA.FIRED[Math.floor(p.animT * 18) % 3]];
    return [pAim, PA.AIMD];
  }
  if (p.flashT > 0) return [pAim, PA.FIREF[Math.floor(p.animT * 20) % 2]];
  if (inFire()) return [pAim, PA.AIMF];
  return [pAim, PA.IDLE[Math.floor(p.animT * 2) % 2]];
}
function heavyFrame(h) {
  if (h.hp <= 0) return HV.DEATH[Math.min(HV.DEATH.length - 1, Math.floor(h.dieT * 7))];
  if (h.flashT > 0) return HV.FIRE[Math.floor(h.animT * 20) % 2];
  if (h.windup >= 0) return HV.AIM[Math.min(2, Math.floor(h.windup * 6))];
  if (Math.abs(h.vx) > 5) return HV.WALK[Math.floor(h.animT * 6) % 3];
  return HV.IDLE0 + Math.floor(h.animT * 7) % HV.IDLEN;
}

function enemyFrame(e) {
  if (e.hp <= 0) return GR.DEATH0 + Math.min(GR.DEATHN - 1, Math.floor(e.dieT * 10));
  if (e.state === 'aim') {
    if (e.flashT > 0) return GR.FIRE[Math.floor(e.animT * 20) % 2];
    return GR.AIM;
  }
  if (Math.abs(e.vx) > 10) return GR.WALK0 + Math.floor(e.animT * 10) % GR.WALKN;
  return GR.IDLE[Math.floor(e.animT * 4) % 2];
}

function render() {
  const p = game.player;
  // kamera
  const lookX = p.x + p.facing * 55;
  game.camX += (lookX - W / 2 - game.camX) * 0.08;
  game.camY += (p.y - H * 0.62 - game.camY) * 0.1;
  game.camX = Math.max(0, Math.min(LEVEL_W - W, game.camX));
  game.camY = Math.max(-40, Math.min(LEVEL_H - H, game.camY));
  const shX = (Math.random() - 0.5) * game.shake, shY = (Math.random() - 0.5) * game.shake;
  game.shake *= 0.88;
  const cx = Math.round(game.camX + shX), cy = Math.round(game.camY + shY);

  // himmel (tema-beroende)
  const foundry = game.theme === 'foundry';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (foundry) {
    sky.addColorStop(0, '#0b1020'); sky.addColorStop(0.5, '#161d33');
    sky.addColorStop(0.8, '#3a2740'); sky.addColorStop(1, '#5a2f36');
  } else {
    sky.addColorStop(0, '#2b1a4e'); sky.addColorStop(0.45, '#8a3a63');
    sky.addColorStop(0.75, '#e2703a'); sky.addColorStop(1, '#f5a94e');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // sol / måne
  const orbX = W * 0.72 - cx * 0.03, orbY = 130 - cy * 0.02;
  if (foundry) {
    ctx.fillStyle = '#c8d0e0';
    ctx.beginPath(); ctx.arc(orbX, orbY, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b1020'; // månkratrar / skugga
    ctx.beginPath(); ctx.arc(orbX + 10, orbY - 6, 30, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#ffd98a';
    ctx.beginPath(); ctx.arc(orbX, orbY + 20, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,217,138,0.25)';
    ctx.beginPath(); ctx.arc(orbX, orbY + 20, 58, 0, Math.PI * 2); ctx.fill();
  }
  // stjärnor uppe
  ctx.fillStyle = foundry ? 'rgba(200,210,235,0.6)' : 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 24; i++) {
    const sx = (i * 97 + 31) % W, sy = (i * 53) % 90;
    ctx.fillRect((sx - cx * 0.01 % W + W) % W, sy, 1.5, 1.5);
  }
  if (bgFar) {
    const ox = -((cx * 0.18) % 640);
    ctx.drawImage(bgFar, ox, -cy * 0.05);
    ctx.drawImage(bgFar, ox + 640, -cy * 0.05);
  }
  if (bgMid) {
    const ox = -((cx * 0.45) % 640);
    ctx.drawImage(bgMid, ox, -cy * 0.1);
    ctx.drawImage(bgMid, ox + 640, -cy * 0.1);
  }

  ctx.save();
  ctx.translate(-cx, -cy);

  // terräng
  if (terrain) ctx.drawImage(terrain, cx, Math.max(0, cy), W, Math.min(H, LEVEL_H - Math.max(0, cy)), cx, Math.max(0, cy), W, Math.min(H, LEVEL_H - Math.max(0, cy)));

  // extraktionszon
  drawExtraction(game.finishX, game.finishY);

  // pickups
  for (const u of game.pickups) {
    const bob = Math.sin(u.t * 3) * 3;
    if (u.type === 'med') {
      ctx.fillStyle = '#f2f2f2'; ctx.fillRect(u.x - 8, u.y - 8 + bob, 16, 14);
      ctx.fillStyle = '#e33'; ctx.fillRect(u.x - 2, u.y - 6 + bob, 4, 10); ctx.fillRect(u.x - 5, u.y - 3 + bob, 10, 4);
    } else if (u.type === 'spread') {
      // triple shot: gul kapsel med tre solfjäderskott
      ctx.fillStyle = 'rgba(255,169,78,0.25)';
      ctx.beginPath(); ctx.arc(u.x, u.y + bob, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c2f3a'; ctx.fillRect(u.x - 9, u.y - 7 + bob, 18, 14);
      ctx.fillStyle = '#ffa94e';
      ctx.fillRect(u.x - 6, u.y - 5 + bob, 8, 2);
      ctx.fillRect(u.x - 6, u.y - 1 + bob, 10, 2);
      ctx.fillRect(u.x - 6, u.y + 3 + bob, 8, 2);
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(u.x + 3, u.y - 6 + bob, 3, 3); ctx.fillRect(u.x + 5, u.y - 1 + bob, 3, 3); ctx.fillRect(u.x + 3, u.y + 3 + bob, 3, 3);
    } else if (u.type === 'shield') {
      const pulse = 1 + Math.sin(u.t * 4) * 0.12;
      ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(u.x, u.y + bob, 10 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(110,231,255,0.25)';
      ctx.beginPath(); ctx.arc(u.x, u.y + bob, 10 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8fbff';
      ctx.fillRect(u.x - 1.5, u.y - 5 + bob, 3, 10); ctx.fillRect(u.x - 5, u.y - 1.5 + bob, 10, 3);
    } else {
      ctx.save(); ctx.translate(u.x, u.y + bob); ctx.rotate(u.t);
      ctx.fillStyle = '#ffe066';
      star(ctx, 0, 0, 7, 3.2, 5); ctx.fill();
      ctx.restore();
    }
  }

  // fiender
  for (const e of game.enemies) {
    if (e.hp <= 0 && (e.dieT < 0 || e.dieT > 2.6)) continue; // borttagen efter uttoning
    if (gruntSheet.complete && gruntSheet.naturalWidth) {
      if (e.hitT > 0) ctx.globalAlpha = 0.6;
      else if (e.hp <= 0 && e.dieT > 1.8) ctx.globalAlpha = Math.max(0, 1 - (e.dieT - 1.8) / 0.8);
      // grunt-sheeten är HÖGERVÄND — flippa när den tittar åt vänster
      drawFrame(gruntSheet, enemyFrame(e), e.x, e.y, e.facing < 0);
      ctx.globalAlpha = 1;
    }
  }
  // heavies
  for (const h of game.heavies) {
    if (h.hp <= 0 && (h.dieT < 0 || h.dieT > 2.6)) continue;
    if (heavySheet.complete && heavySheet.naturalWidth) {
      if (h.hitT > 0) ctx.globalAlpha = 0.6;
      else if (h.hp <= 0 && h.dieT > 1.8) ctx.globalAlpha = Math.max(0, 1 - (h.dieT - 1.8) / 0.8);
      // heavy-sheeten är HÖGERVÄND — flippa när den tittar åt vänster
      drawFrame(heavySheet, heavyFrame(h), h.x, h.y, h.facing < 0, HFW, HFH, HCOLS);
      ctx.globalAlpha = 1;
    }
  }
  // drönare
  for (const d of game.drones) {
    if (d.dead) continue;
    drawDrone(d);
  }
  // robotar
  for (const r of game.robots) drawRobot(r);
  // boss
  if (game.boss && heliSheet.complete && heliSheet.naturalWidth) {
    const b = game.boss;
    if (b.hitT > 0) ctx.globalAlpha = 0.65;
    // heli-sheeten är HÖGERVÄND (nosen åt höger) — flippa när bossen
    // tittar åt vänster så nosen pekar mot spelaren; center-ankrad via +72
    drawFrame(heliSheet, bossFrame(b), b.x, b.y + 72, b.facing < 0, BFW, BFH, BCOLS);
    ctx.globalAlpha = 1;
    if (bossPhase2(b) && b.dieT < 0 && Math.random() < 0.3) {
      game.particles.push({ x: b.x + (Math.random() - 0.5) * 60, y: b.y - 20, vx: (Math.random() - 0.5) * 20,
        vy: -30 - Math.random() * 30, life: 0.6, col: 'rgba(60,60,64,0.8)', sz: 4, grav: -40 });
    }
  }

  // spelare
  if (game.state === 'dead') {
    // Contra-död: snurrande kropp som flyger genom luften
    if (ready(pMove)) {
      const df = PM.FLIP[0];
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y - 24));
      ctx.rotate((p.deathT || 0) * 9 * -p.facing);
      if (p.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(pMove, (df % PCOLS) * PFW, Math.floor(df / PCOLS) * PFH, PFW, PFH, -PFW / 2, -PFH / 2, PFW, PFH);
      ctx.restore();
    }
  } else {
    const blink = p.inv > 0 && Math.floor(game.time * 12) % 2 === 0;
    if (!blink && ready(pAim) && ready(pMove)) {
      const [img, fi] = playerFrame(p);
      drawFrame(img, fi, p.x, p.y, p.facing < 0, PFW, PFH, PCOLS);
    }
  }
  // sköld-aura
  if (p.shieldT > 0) {
    const fade = Math.min(1, p.shieldT / 1.5); // blinkar ut sista 1.5s
    const on = p.shieldT > 1.5 || Math.floor(game.time * 8) % 2 === 0;
    if (on) {
      const rr = 30 + Math.sin(game.time * 6) * 2;
      ctx.strokeStyle = `rgba(110,231,255,${0.8 * fade})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - 25, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(110,231,255,${0.12 * fade})`;
      ctx.beginPath(); ctx.arc(p.x, p.y - 25, rr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // skott — tracern roteras längs skottriktningen (även uppåtskott)
  for (const b of game.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(-5, -1.5, 10, 3);
    ctx.fillStyle = 'rgba(255,210,94,0.4)';
    ctx.fillRect(-14, -1, 10, 2);
    ctx.restore();
  }
  for (const b of game.ebullets) {
    if (b.col) { // robotlaser: glödande streck längs banan
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = 'rgba(125,255,255,0.35)'; ctx.fillRect(-9, -2, 18, 4);
      ctx.fillStyle = b.col; ctx.fillRect(-5, -1.5, 11, 3);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff6b5e';
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // raketer
  for (const r of game.rockets) {
    const dir = Math.sign(r.vx);
    ctx.fillStyle = '#4a4f5e';
    ctx.fillRect(r.x - 7, r.y - 2.5, 14, 5);
    ctx.fillStyle = '#c23b2e';
    ctx.fillRect(r.x + dir * 5, r.y - 2.5, 3, 5); // nos
    ctx.fillStyle = Math.random() < 0.5 ? '#ffd25e' : '#ff8c42';
    ctx.beginPath(); ctx.arc(r.x - dir * 9, r.y, 3.5, 0, Math.PI * 2); ctx.fill(); // eldsvans
  }

  // partiklar
  for (const pa of game.particles) {
    ctx.fillStyle = pa.col;
    if (pa.flash) {
      ctx.save(); ctx.translate(pa.x, pa.y);
      star(ctx, 0, 0, 8, 3, 4); ctx.fill();
      ctx.restore();
    } else ctx.fillRect(pa.x - pa.sz / 2, pa.y - pa.sz / 2, pa.sz, pa.sz);
  }

  // 80-tals one-liners som svävar upp — stora och kaxiga
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  for (const q of game.quips) {
    const a = Math.max(0, Math.min(1, (2.8 - q.t) / 0.8));
    const qx = Math.max(game.camX + 110, Math.min(game.camX + W - 110, q.x));
    const qy = q.y - q.t * 14;
    ctx.fillStyle = `rgba(0,0,0,${0.75 * a})`;
    ctx.fillText('"' + q.text + '"', qx + 2, qy + 2);
    ctx.fillStyle = `rgba(255,210,94,${a})`;
    ctx.fillText('"' + q.text + '"', qx, qy);
  }

  ctx.restore();

  if (game.state === 'play') drawHUD(p); // ingen HUD bakom titel/döds/vinst-skärm
  // "GET TO THE CHOPPA!" när luftrummet säkrats
  if (game.choppaT > 0 && game.state === 'play') {
    const a = Math.min(1, game.choppaT);
    ctx.save(); ctx.globalAlpha = a;
    bigText('GET TO THE CHOPPA!', 120, 26, '#5eff7a', '#0a4');
    ctx.restore();
  }
  if (game.state === 'title') drawTitle();
  if (game.state === 'dead') drawDead();
  if (game.state === 'win') drawWin();
  if (touchUI && game.state === 'play') drawTouchUI();
}

function star(g, x, y, R, r, n) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
}

function drawDrone(d) {
  const wob = Math.sin(d.t * 14) * 1.2;
  ctx.save();
  ctx.translate(Math.round(d.x), Math.round(d.y + wob));
  if (d.hitT > 0) ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#39424f';
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222831';
  ctx.fillRect(-16, -3, 5, 3); ctx.fillRect(11, -3, 5, 3);
  // rotorer
  ctx.strokeStyle = 'rgba(200,220,255,0.7)';
  ctx.lineWidth = 1.5;
  const r = Math.sin(d.t * 40) * 9;
  ctx.beginPath(); ctx.moveTo(-13 - r, -6); ctx.lineTo(-13 + r, -6); ctx.moveTo(13 - r, -6); ctx.lineTo(13 + r, -6); ctx.stroke();
  // öga
  ctx.fillStyle = Math.sin(d.t * 6) > 0 ? '#ff3b3b' : '#ff8080';
  ctx.beginPath(); ctx.arc(0, 1, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawExtraction(x, y) {
  // landningsplatta
  ctx.fillStyle = '#3a4152';
  ctx.fillRect(x - 40, y - 4, 80, 4);
  ctx.fillStyle = '#ffd25e';
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 36 + i * 16, y - 4, 8, 2);
  // fyrbåk
  const blink = Math.sin(game.time * 6) > 0;
  const open = gateOpen();
  ctx.fillStyle = '#555f70';
  ctx.fillRect(x - 34, y - 26, 4, 22); ctx.fillRect(x + 30, y - 26, 4, 22);
  ctx.fillStyle = blink ? (open ? '#5eff7a' : '#ff4757') : (open ? '#1d7a30' : '#7a1d1d');
  ctx.fillRect(x - 35, y - 31, 6, 6); ctx.fillRect(x + 29, y - 31, 6, 6);
  if (!open) {
    // låst tills banans vakter är rensade
    ctx.fillStyle = blink ? 'rgba(255,71,87,0.9)' : 'rgba(255,71,87,0.5)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(game.hasHeliBoss ? 'LOCKED — CLEAR THE AIRSPACE' : 'LOCKED — DESTROY THE MECHS', x, y - 40);
    return;
  }
  // helikopter som väntar
  const hy = y - 96 + Math.sin(game.time * 1.7) * 4;
  ctx.save();
  ctx.translate(x, hy);
  ctx.fillStyle = '#2f3a2f';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222b22';
  ctx.fillRect(18, -4, 26, 5);
  ctx.beginPath(); ctx.ellipse(46, -2, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath(); ctx.ellipse(-14, -3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222b22';
  ctx.fillRect(-14, 10, 3, 6); ctx.fillRect(10, 10, 3, 6);
  ctx.fillRect(-20, 15, 40, 2);
  const rot = Math.sin(game.time * 45) * 30;
  ctx.strokeStyle = 'rgba(220,230,240,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-rot, -13); ctx.lineTo(rot, -13); ctx.stroke();
  ctx.restore();
  // "EXTRACTION"-skylt
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXTRACTION', x, y - 40);
}

function drawHUD(p) {
  // hjärtan
  for (let i = 0; i < p.maxHp; i++) {
    const x = 14 + i * 18, y = 14;
    ctx.fillStyle = i < p.hp ? '#ff4757' : 'rgba(255,255,255,0.18)';
    heart(ctx, x, y, 7);
  }
  // poäng
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + String(game.score).padStart(5, '0'), W - 12, 24);
  ctx.textAlign = 'left';
  ctx.fillText('✕ ' + game.kills, 14, 44);
  // aktiva power-ups
  let py = 62;
  ctx.font = 'bold 10px monospace';
  if (p.spreadT > 0) {
    ctx.fillStyle = '#ffa94e';
    ctx.fillText('TRIPLE SHOT', 14, py);
    ctx.fillStyle = 'rgba(255,169,78,0.3)'; ctx.fillRect(14, py + 3, 70, 4);
    ctx.fillStyle = '#ffa94e'; ctx.fillRect(14, py + 3, 70 * (p.spreadT / 12), 4);
    py += 20;
  }
  if (p.shieldT > 0) {
    ctx.fillStyle = '#6ee7ff';
    ctx.fillText('SHIELD', 14, py);
    ctx.fillStyle = 'rgba(110,231,255,0.3)'; ctx.fillRect(14, py + 3, 70, 4);
    ctx.fillStyle = '#6ee7ff'; ctx.fillRect(14, py + 3, 70 * (p.shieldT / 8), 4);
  }
  // boss-bar
  if (game.boss) {
    const b = game.boss;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 110, 26, 220, 10);
    ctx.fillStyle = bossPhase2(b) ? '#ff8c42' : '#ff4757';
    ctx.fillRect(W / 2 - 108, 28, 216 * Math.max(0, b.hp / b.maxHp), 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENEMY GUNSHIP', W / 2, 45);
    if (b.state === 'enter' && Math.sin(game.time * 10) > 0) {
      bigText('⚠ ENEMY GUNSHIP INBOUND ⚠', 80, 16, '#ff4757', '#800');
    }
  }
  // progress
  const prog = Math.min(1, game.player.x / game.finishX);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(W / 2 - 80, 12, 160, 6);
  ctx.fillStyle = '#5eff7a';
  ctx.fillRect(W / 2 - 80, 12, 160 * prog, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(W / 2 - 80 + 160 * prog - 1, 10, 3, 10);

  // mecha-vakter kvar (Sektor 2) — mini-bossbar
  if (!game.hasHeliBoss) {
    const mechs = game.robots.filter(r => r.kind === 'mecha');
    const alive = mechs.filter(r => r.hp > 0);
    const near = alive.some(r => Math.abs(r.x - game.player.x) < 320);
    if (near) {
      const hp = alive.reduce((s, r) => s + r.hp, 0), max = mechs.length * 14;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 110, 26, 220, 10);
      ctx.fillStyle = '#ff8c42'; ctx.fillRect(W / 2 - 108, 28, 216 * Math.max(0, hp / max), 6);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('MECHA BRUTE', W / 2, 45);
    }
  }

  // nivåbanner vid start (endast under spel — inte bakom titelskärmen)
  if (game.levelBanner > 0 && game.state === 'play') {
    const a = Math.min(1, game.levelBanner);
    ctx.save(); ctx.globalAlpha = a;
    bigText(LEVELS[game.level].name, 150, 22, game.theme === 'foundry' ? '#7dffff' : '#ffd25e', '#000');
    ctx.restore();
  }
}
function heart(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s, y + s * 0.2, x - s * 0.9, y - s * 0.7, x, y - s * 0.1);
  g.bezierCurveTo(x + s * 0.9, y - s * 0.7, x + s, y + s * 0.2, x, y + s * 0.9);
  g.fill();
}

function panel(alpha) {
  ctx.fillStyle = `rgba(10,8,20,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}
function bigText(txt, y, size, col, glow) {
  ctx.textAlign = 'center';
  ctx.font = `bold ${size}px monospace`;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
  ctx.fillStyle = col;
  ctx.fillText(txt, W / 2, y);
  ctx.shadowBlur = 0;
}
function drawTitle() {
  panel(0.55);
  bigText('COMMANDO STRIKE', 120, 38, '#ffd25e', '#ff8c42');
  bigText('RUN & GUN · JUNGLE → STEELWORKS · 2 SECTORS', 150, 11, '#5ce8f5');
  ctx.textAlign = 'right';
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BUILD ' + BUILD, W - 8, H - 8);
  // reload / uppdatera-knapp (nere till höger uppe): glöder om ny version finns
  const upd = window.__updateReady;
  const rb = RELOAD_BTN, rpulse = 0.7 + Math.sin(game.time * 6) * 0.3;
  ctx.fillStyle = upd ? `rgba(94,255,122,${0.2 + rpulse * 0.2})` : 'rgba(255,255,255,0.10)';
  ctx.fillRect(rb.x - rb.w / 2, rb.y - rb.h / 2, rb.w, rb.h);
  ctx.strokeStyle = upd ? '#5eff7a' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
  ctx.strokeRect(rb.x - rb.w / 2, rb.y - rb.h / 2, rb.w, rb.h);
  ctx.fillStyle = upd ? '#5eff7a' : '#c8d0e0';
  ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText(upd ? '⟳ UPDATE!' : '⟳ RELOAD', rb.x, rb.y + 4);
  if (ready(pMove)) {
    const fi = PM.RUN[Math.floor(game.time * 12) % 6];
    ctx.save(); ctx.translate(W / 2, 235); ctx.scale(1.6, 1.6);
    drawFrame(pMove, fi, 0, 24, false, PFW, PFH, PCOLS);
    ctx.restore();
  }
  if (touchUI) {
    bigText('✛ STICK: MOVE · AIM UP · CROUCH  |  ⤒ JUMP (x2 = FLIP!)  |  ✹ FIRE', 285, 11, '#dfe6ff');
  } else {
    bigText('A/D MOVE · W/↑ AIM UP · S CROUCH · SPACE JUMP (x2 = FLIP!) · J/X/MOUSE FIRE', 285, 11, '#dfe6ff');
  }
  // banval-knappar
  bigText('SELECT SECTOR', 305, 10, '#9aa7c7');
  const pulse = Math.sin(game.time * 5) > -0.2;
  for (const bt of MENU_BTN) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(bt.x - bt.w / 2, bt.y - bt.h / 2, bt.w, bt.h);
    ctx.strokeStyle = bt.idx === 1 ? 'rgba(125,255,255,0.7)' : 'rgba(94,255,122,0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bt.x - bt.w / 2, bt.y - bt.h / 2, bt.w, bt.h);
    ctx.fillStyle = pulse ? '#fff' : '#c8d0e0';
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText(bt.label, bt.x, bt.y + 4);
  }
  bigText(touchUI ? 'TAP A SECTOR TO ENGAGE' : 'PRESS 1 OR 2 (OR ENTER)', 352, 9, '#9aa7c7');
  if (IS_IOS && !isStandalone()) {
    bigText('Tip: Share → "Add to Home Screen" = fullscreen, no Safari UI', 340, 9, '#7a8398');
  }
  if (innerHeight > innerWidth) {
    bigText('↻ ROTATE TO LANDSCAPE, SOLDIER', 60, 14, '#ffd25e', '#ff8c42');
  }
}
function drawDead() {
  panel(0.55);
  bigText("YOU'RE HISTORY", 150, 36, '#ff4757', '#800');
  bigText('EVEN LEGENDS RELOAD.', 178, 12, '#ffb0a0');
  bigText('SCORE ' + game.score + '  ·  ' + game.kills + ' HOSTILES DOWN', 205, 14, '#fff');
  if (Math.sin(game.time * 5) > -0.2) {
    bigText('ENTER/R — RETRY ' + LEVELS[game.level].name.split(':')[0], 232, 13, '#ffd25e');
  }
  bigText('1 = JUNGLE   ·   2 = STEELWORKS', 260, 10, '#9aa7c7');
}
function drawWin() {
  panel(0.5);
  // fyrverkerier!
  if (Math.random() < 0.09) {
    const cols = ['#ff4fd8', '#5ce8f5', '#ffd25e', '#5eff7a', '#ff8c42'];
    const fx = game.camX + 60 + Math.random() * (W - 120), fy = game.camY + 40 + Math.random() * 140;
    const col = cols[Math.floor(Math.random() * cols.length)];
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 130;
      game.particles.push({ x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.6 + Math.random() * 0.5, col, sz: 2.5, grav: 120 });
    }
  }
  bigText('MISSION COMPLETE!', 120, 32, '#5eff7a', '#0a4');
  bigText('ALL SECTORS SECURED', 150, 14, '#c8ffd4');
  bigText('MISSION ACCOMPLISHED. LET OFF SOME STEAM.', 175, 11, '#ffd25e');
  bigText('SCORE ' + game.score, 220, 22, '#ffd25e');
  bigText('HOSTILES NEUTRALIZED: ' + game.kills + '   TIME: ' + game.time.toFixed(1) + 's', 250, 13, '#fff');
  if (Math.sin(game.time * 5) > -0.2) bigText('ENTER/R — PLAY AGAIN   ·   1 / 2 SECTOR SELECT', 300, 12, '#5eff7a');
}
function drawTouchUI() {
  // knappar (hopp + eld)
  for (const b of TB) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = vbtn[b.id] ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '22px monospace'; ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 8);
  }
  // analogspak: bas + knopp där tummen är; vilande hint annars
  if (stick.active) {
    ctx.beginPath(); ctx.arc(stick.bx, stick.by, STICK_R + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath();
    ctx.arc(stick.bx + stick.vx * STICK_R, stick.by + stick.vy * STICK_R, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(86, H - 64, STICK_R + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('✛', 86, H - 59);
  }
}

// ---- Huvudloop -----------------------------------------------------------------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  game.time += dt;

  if (game.state === 'play') {
    updatePlayer(game.player, dt);
    for (const e of game.enemies) updateEnemy(e, dt, game.player);
    for (const h of game.heavies) updateHeavy(h, dt, game.player);
    for (const r of game.robots) updateRobot(r, dt, game.player);
    // ta bort sprängda sentry/turret; mechas stannar (kollaps + grind-koll)
    // behåll: mechas alltid, levande robotar, döende sentries genom sin
    // sprite-dödsanimation (~0.85s); sprängda turrets tas bort direkt
    game.robots = game.robots.filter(r => r.kind === 'mecha' || r.hp > 0
      || (r.kind === 'sentry' && r.dieT < 0.9)
      || (r.kind === 'turret' && r.dieT < (TURRET_READY() ? 0.95 : 0.06)));
    if (game.boss) updateBoss(game.boss, dt, game.player);
    for (const d of game.drones) updateDrone(d, dt, game.player);
    updateBullets(dt, game.player);
    updateRockets(dt, game.player);
    updatePickups(dt, game.player);
  } else if (game.state === 'dead') {
    // fritt fall genom världen (Contra-stil), ingen kollision
    const p = game.player;
    p.deathT = (p.deathT || 0) + dt;
    p.vy += GRAV * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  updateParticles(dt);
  game.choppaT = Math.max(0, game.choppaT - dt);
  if (game.levelBanner > 0) game.levelBanner -= dt;
  for (const q of game.quips) q.t += dt;
  game.quips = game.quips.filter(q => q.t < 2.8);

  render();
  requestAnimationFrame(loop);
}

startGame();
game.state = 'title';
requestAnimationFrame(loop);
