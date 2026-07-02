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
const TILE = 32;

// ---- Sprite frames (index i 8-kolumners grid) --------------------------
const FW = 48, FH = 64, COLS = 8;
const F = {
  IDLE: 0, RAISED: 1, SPARK: 2, AIM: 3, AIM2: 4, AIM3: 5, AIM4: 6, FLASH: 7,
  RUN0: 8, // 8..15
  LEAP: 16, KNEEL: 17, KNEEL2: 18, CROUCH: 19, RISE: 20, TUCK: 21, FLIPDN: 22, LAND: 23,
};
const RUN_FRAMES = [8, 9, 10, 11, 12, 13, 14, 15];
const FLIP_FRAMES = [20, 21, 22, 16];

// ---- Nivå ----------------------------------------------------------------
// #=mark  C=låda  B=metall  ==plattform(one-way)  S=spikar  E=fiende  D=drönare
// M=medkit  *=stjärna  P=spelarstart  F=extraktion
const MAP_SRC = [
'                                                                                                                                                                                                        ',
'                                                                                                                                                                                                        ',
'                                                                                                         *                                                                                              ',
'                                        *                                                     D        =====                                     D                          *  *  *                     ',
'                              *      ====                * * *                  ==== M                                        E                =====                      =========                     ',
'                            ====                        =======                =======            E                        ======      *  *                                                             ',
'                                          E                        D                            ======        C          ==========   =====          E          M                    E  E               ',
'                 *  *                  ======                                        C C                 *   CC                                    =======     ====                 ========            ',
'          M                                             E              E            CCCC       C        CCC CCC              E                                                E                    F    ',
'   P         C        E        C                     ########      ##########      ######     ===      #########         ========       ==     =======     SS    SS                   C C               ',
'#######################################   ###   #####        ######          ######      #####   ######         #########        ##### ### ####       ####################   #########################  ',
'####################################### S ### S #####        ######          ######      #####   ######         #########        ##### ### ####       ####################SSS#########################  ',
'########################################################     ######          ######      #####   ######         #########        ##############       ################################################  ',
];
const MAPW = Math.max(...MAP_SRC.map(r => r.length));
const MAP = MAP_SRC.map(r => r.padEnd(MAPW, ' '));
const MAPH = MAP.length;
const LEVEL_W = MAPW * TILE, LEVEL_H = MAPH * TILE;

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
  if (!e.repeat && (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')) pendingJump = true;
  if (game.state !== 'play' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR')) startGame();
  if (game.state === 'play' && e.code === 'KeyR') startGame();
});
addEventListener('keyup', e => { keys[e.code] = false; });
const inLeft  = () => keys['ArrowLeft'] || keys['KeyA'] || vbtn.left;
const inRight = () => keys['ArrowRight'] || keys['KeyD'] || vbtn.right;
const inDown  = () => keys['ArrowDown'] || keys['KeyS'];
const inJump  = () => keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || vbtn.jump;
const inFire  = () => keys['KeyJ'] || keys['KeyX'] || keys['ControlLeft'] || vbtn.fire || mouseFire;
let mouseFire = false;
canvas.addEventListener('mousedown', () => { audio(); if (game.state !== 'play') startGame(); else mouseFire = true; });
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
const TB = [
  { id: 'left',  x: 56,      y: H - 58, r: 36, label: '◀' },
  { id: 'right', x: 142,     y: H - 58, r: 36, label: '▶' },
  { id: 'jump',  x: W - 140, y: H - 58, r: 36, label: '⤒' },
  { id: 'fire',  x: W - 54,  y: H - 58, r: 36, label: '✹' },
];
function updateTouches(e) {
  e.preventDefault();
  touchUI = true;
  audio();
  const wasJump = vbtn.jump;
  vbtn.left = vbtn.right = vbtn.jump = vbtn.fire = false;
  for (const t of e.touches) {
    const p = canvasPos(t);
    for (const b of TB) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 22) vbtn[b.id] = true;
    }
  }
  if (vbtn.jump && !wasJump) pendingJump = true;
  if (game.state !== 'play' && e.touches.length && !vbtn.left && !vbtn.right && !vbtn.jump && !vbtn.fire) startGame();
}
canvas.addEventListener('touchstart', updateTouches, { passive: false });
canvas.addEventListener('touchmove', updateTouches, { passive: false });
canvas.addEventListener('touchend', updateTouches, { passive: false });
// iOS avbryter touches med touchcancel när kantgester tar över —
// utan denna fastnar knapparna i nedtryckt läge
canvas.addEventListener('touchcancel', updateTouches, { passive: false });

// ---- Tillgångar -----------------------------------------------------------
const sheet = new Image();
sheet.src = 'assets/commando.png';
let enemySheet = null;
sheet.onload = () => {
  const c = document.createElement('canvas');
  c.width = sheet.width; c.height = sheet.height;
  const g = c.getContext('2d');
  g.drawImage(sheet, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(230, 40, 40, 0.42)';
  g.fillRect(0, 0, c.width, c.height);
  enemySheet = c;
  buildTerrain();
  buildParallax();
};

function drawFrame(img, idx, x, y, flip) {
  // x,y = fötternas mittpunkt i världen (ritas i skärmkoordinater av anroparen)
  const sx = (idx % COLS) * FW, sy = Math.floor(idx / COLS) * FH;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, FW, FH, -FW / 2, -FH + 1, FW, FH);
  ctx.restore();
}

// ---- Terräng (förrenderad) -------------------------------------------------
let terrain = null;
function buildTerrain() {
  terrain = document.createElement('canvas');
  terrain.width = LEVEL_W; terrain.height = LEVEL_H;
  const g = terrain.getContext('2d');
  const rnd = mulberry(1337);
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

// ---- Parallax-bakgrund ------------------------------------------------------
let bgFar = null, bgMid = null;
function buildParallax() {
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

// ---- Speltillstånd ----------------------------------------------------------
const game = {};
function startGame() {
  if (touchUI) goFullscreen();
  game.state = 'play';
  game.time = 0;
  game.score = 0;
  game.kills = 0;
  game.shake = 0;
  game.camX = 0; game.camY = 0;
  game.bullets = [];
  game.ebullets = [];
  game.particles = [];
  game.pickups = [];
  game.enemies = [];
  game.drones = [];
  game.msg = null; game.msgT = 0;

  let px = 2 * TILE, py = 9 * TILE;
  game.finishX = LEVEL_W - 3 * TILE;
  for (let ty = 0; ty < MAPH; ty++) {
    for (let tx = 0; tx < MAPW; tx++) {
      const c = MAP[ty][tx];
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE;
      if (c === 'P') { px = cx; py = cy; }
      else if (c === 'E') game.enemies.push(makeEnemy(cx, cy));
      else if (c === 'D') game.drones.push(makeDrone(cx, cy - TILE / 2));
      else if (c === 'M') game.pickups.push({ type: 'med', x: cx, y: cy - 10, t: Math.random() * 6 });
      else if (c === '*') game.pickups.push({ type: 'star', x: cx, y: cy - 10, t: Math.random() * 6 });
      else if (c === 'F') { game.finishX = cx; game.finishY = cy; }
    }
  }
  // power-ups (världskoordinater: ovanför marken vid strategiska punkter)
  game.pickups.push({ type: 'spread', x: 24 * TILE + 16, y: 10 * TILE - 22, t: 0 });
  game.pickups.push({ type: 'spread', x: 100 * TILE + 16, y: 10 * TILE - 22, t: 2 });
  game.pickups.push({ type: 'shield', x: 131 * TILE + 16, y: 10 * TILE - 22, t: 4 });

  game.player = makePlayer(px, py);
  game.safe = { x: px, y: py };
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
    animT: 0,
  };
}
function makeEnemy(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 18, h: 46,
    facing: -1, grounded: false,
    hp: 3, hitT: 0, state: 'patrol',
    aimT: 0, burst: 0, burstT: 0, cool: 1 + Math.random(),
    animT: Math.random() * 10, home: x,
  };
}
function makeDrone(x, y) {
  return { x, y, baseY: y, hp: 2, hitT: 0, t: Math.random() * 10, cool: 1.5 + Math.random(), dead: false };
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
  const maxV = 215;
  p.crouch = p.grounded && inDown() && !inLeft() && !inRight();

  if (inLeft() && !p.crouch)  { p.vx -= acc * dt; p.facing = -1; }
  else if (inRight() && !p.crouch) { p.vx += acc * dt; p.facing = 1; }
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

  // skjuta
  p.fireT -= dt; p.flashT -= dt;
  if (inFire() && p.fireT <= 0 && !p.crouch) {
    p.fireT = p.spreadT > 0 ? 0.11 : 0.13;
    p.flashT = 0.06;
    const my = p.y - (p.grounded && inDown() ? 20 : 30);
    const mx = p.x + p.facing * 26;
    if (p.spreadT > 0) {
      for (const vy of [-130, 0, 130]) {
        game.bullets.push({ x: mx, y: my, vx: p.facing * 720, vy, life: 0.9 });
      }
    } else {
      game.bullets.push({ x: mx, y: my, vx: p.facing * 720, vy: (Math.random() - 0.5) * 26, life: 0.9 });
    }
    p.vx -= p.facing * 26; // rekyl
    SFX.shoot();
    spawnFlash(mx + p.facing * 4, my, p.facing);
    spawnShell(p.x - p.facing * 4, my - 4, -p.facing);
  }

  // faror
  p.inv = Math.max(0, p.inv - dt);
  if (spikeNear(p) && p.inv <= 0) hurtPlayer(p, 1, 0);
  if (p.y > LEVEL_H + 60) {
    hurtPlayer(p, 1, 0, true);
    if (game.state === 'play') { p.x = game.safe.x; p.y = game.safe.y; p.vx = p.vy = 0; }
  }

  // mål
  if (Math.abs(p.x - game.finishX) < 26 && Math.abs(p.y - game.finishY) < 60) {
    game.state = 'win';
    SFX.win();
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
  if (p.hp <= 0) { game.state = 'dead'; SFX.dead(); }
}

// ---- Fiender -------------------------------------------------------------
function updateEnemy(e, dt, p) {
  if (e.hp <= 0) return;
  e.hitT = Math.max(0, e.hitT - dt);
  const dx = p.x - e.x, dy = p.y - e.y;
  const sees = Math.abs(dx) < 300 && Math.abs(dy) < 70 && game.state === 'play' && p.inv < 1.0;

  if (sees) {
    e.facing = dx > 0 ? 1 : -1;
    e.state = 'aim';
    e.vx = 0;
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
    // patrullera: vänd vid kant eller vägg
    const ahead = e.x + e.facing * (e.w / 2 + 6);
    const groundAhead = solidAt(Math.floor(ahead / TILE), Math.floor((e.y + 4) / TILE))
                     || platformAt(Math.floor(ahead / TILE), Math.floor((e.y + 4) / TILE));
    const wallAhead = solidAt(Math.floor(ahead / TILE), Math.floor((e.y - 20) / TILE));
    if ((!groundAhead || wallAhead) && e.grounded) e.facing *= -1;
    e.vx = e.facing * 42;
  }
  e.flashT = (e.flashT || 0) - dt;
  e.vy += GRAV * dt;
  moveBody(e, dt, true);
  e.animT += dt;
}
function updateDrone(d, dt, p) {
  if (d.dead) return;
  d.t += dt;
  d.hitT = Math.max(0, d.hitT - dt);
  d.y = d.baseY + Math.sin(d.t * 2.2) * 8;
  const dx = p.x - d.x, dy = p.y - 24 - d.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 340 && game.state === 'play') {
    d.x += (dx > 0 ? 1 : -1) * Math.min(26 * dt, Math.abs(dx) * dt);
    d.cool -= dt;
    if (d.cool <= 0) {
      d.cool = 1.7 + Math.random() * 0.5;
      const s = 300 / Math.max(dist, 1);
      game.ebullets.push({ x: d.x, y: d.y + 6, vx: dx * s, vy: dy * s, life: 1.8 });
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
    for (const d of game.drones) {
      if (!d.dead && Math.hypot(b.x - d.x, b.y - d.y) < 14 && b.life > 0) {
        b.life = 0; d.hp--; d.hitT = 0.1;
        spawnSparks(b.x, b.y, 6, '#8be9fd');
        if (d.hp <= 0) { d.dead = true; killBoom(d.x, d.y); }
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
  game.kills++; game.score += 100;
  killBoom(e.x, e.y - 20);
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
  if (game.state === 'dead') return F.FLIPDN;
  if (p.crouch) return p.flashT > 0 ? F.KNEEL2 : F.CROUCH;
  if (!p.grounded) {
    if (p.flipT >= 0) {
      const i = Math.floor(p.flipT * 14);
      return i < FLIP_FRAMES.length ? FLIP_FRAMES[i] : F.LEAP;
    }
    return p.vy < -60 ? F.RISE : F.LEAP;
  }
  if (p.landT > 0.06 && Math.abs(p.vx) < 40) return F.LAND;
  if (Math.abs(p.vx) > 30) return RUN_FRAMES[Math.floor(p.animT * 14) % 8];
  if (p.flashT > 0) return F.FLASH;
  if (inFire()) return F.AIM;
  return Math.sin(p.animT * 2.4) > 0.65 ? F.RAISED : F.IDLE;
}
function enemyFrame(e) {
  if (e.state === 'aim') return e.flashT > 0 ? F.FLASH : F.AIM;
  if (Math.abs(e.vx) > 10) return RUN_FRAMES[Math.floor(e.animT * 9) % 8];
  return F.IDLE;
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

  // himmel
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2b1a4e');
  sky.addColorStop(0.45, '#8a3a63');
  sky.addColorStop(0.75, '#e2703a');
  sky.addColorStop(1, '#f5a94e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // sol
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath(); ctx.arc(W * 0.72 - cx * 0.03, 150 - cy * 0.02, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,217,138,0.25)';
  ctx.beginPath(); ctx.arc(W * 0.72 - cx * 0.03, 150 - cy * 0.02, 58, 0, Math.PI * 2); ctx.fill();
  // stjärnor uppe
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
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
    if (e.hp <= 0) continue;
    if (enemySheet) {
      if (e.hitT > 0) { ctx.globalAlpha = 0.6; }
      drawFrame(enemySheet, enemyFrame(e), e.x, e.y, e.facing < 0);
      ctx.globalAlpha = 1;
    }
  }
  // drönare
  for (const d of game.drones) {
    if (d.dead) continue;
    drawDrone(d);
  }

  // spelare
  if (game.state !== 'dead' || Math.floor(game.time * 8) % 2 === 0) {
    const blink = p.inv > 0 && Math.floor(game.time * 12) % 2 === 0;
    if (!blink && sheet.complete) drawFrame(sheet, playerFrame(p), p.x, p.y, p.facing < 0);
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

  // skott
  ctx.fillStyle = '#ffe9a0';
  for (const b of game.bullets) {
    ctx.fillRect(b.x - 5, b.y - 1.5, 10, 3);
    ctx.fillStyle = 'rgba(255,210,94,0.4)'; ctx.fillRect(b.x - 14, b.y - 1, 10, 2);
    ctx.fillStyle = '#ffe9a0';
  }
  ctx.fillStyle = '#ff6b5e';
  for (const b of game.ebullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
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

  ctx.restore();

  drawHUD(p);
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
  ctx.fillStyle = '#555f70';
  ctx.fillRect(x - 34, y - 26, 4, 22); ctx.fillRect(x + 30, y - 26, 4, 22);
  ctx.fillStyle = blink ? '#5eff7a' : '#1d7a30';
  ctx.fillRect(x - 35, y - 31, 6, 6); ctx.fillRect(x + 29, y - 31, 6, 6);
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
  // progress
  const prog = Math.min(1, game.player.x / game.finishX);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(W / 2 - 80, 12, 160, 6);
  ctx.fillStyle = '#5eff7a';
  ctx.fillRect(W / 2 - 80, 12, 160 * prog, 6);
  ctx.fillStyle = '#fff';
  ctx.fillRect(W / 2 - 80 + 160 * prog - 1, 10, 3, 10);
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
  bigText('RUN & GUN — PROTOTYP · SEKTOR 1: JUNGLE EXTRACTION', 150, 11, '#ffb0a0');
  if (sheet.complete && sheet.naturalWidth) {
    const fi = RUN_FRAMES[Math.floor(game.time * 12) % 8];
    ctx.save(); ctx.translate(W / 2, 235); ctx.scale(1.6, 1.6);
    drawFrame(sheet, fi, 0, 24, false);
    ctx.restore();
  }
  if (touchUI) {
    bigText('◀ ▶ gå · ⤒ hopp (tryck igen i luften = volt!) · ✹ skjut', 285, 11, '#dfe6ff');
  } else {
    bigText('A/D eller ←→ · W/SPACE hopp (dubbelhopp = volt!) · J/X/musknapp skjut · S duck', 285, 11, '#dfe6ff');
  }
  const b = Math.sin(game.time * 5) > -0.2;
  if (b) bigText(touchUI ? 'TRYCK FÖR ATT STARTA' : 'TRYCK ENTER FÖR ATT STARTA', 320, 15, '#5eff7a');
  if (IS_IOS && !isStandalone()) {
    bigText('Tips: Dela → "Lägg till på hemskärmen" = helskärm utan Safari-UI', 345, 10, '#9aa7c7');
  }
  if (innerHeight > innerWidth) {
    bigText('↻ VRID MOBILEN TILL LIGGANDE LÄGE', 60, 14, '#ffd25e', '#ff8c42');
  }
}
function drawDead() {
  panel(0.55);
  bigText('DU STUPADE', 150, 36, '#ff4757', '#800');
  bigText('SCORE ' + game.score + '  ·  ' + game.kills + ' FIENDER', 185, 14, '#fff');
  if (Math.sin(game.time * 5) > -0.2) bigText('TRYCK ENTER/R FÖR NYTT FÖRSÖK', 230, 14, '#ffd25e');
}
function drawWin() {
  panel(0.5);
  bigText('EXTRAKTION LYCKADES!', 130, 30, '#5eff7a', '#0a4');
  bigText('SEKTOR 1 SÄKRAD', 160, 14, '#c8ffd4');
  bigText('SCORE ' + game.score, 205, 20, '#ffd25e');
  bigText('FIENDER NEDGJORDA: ' + game.kills + '   TID: ' + game.time.toFixed(1) + 's', 235, 13, '#fff');
  if (Math.sin(game.time * 5) > -0.2) bigText('TRYCK ENTER/R FÖR ATT SPELA IGEN', 285, 13, '#ffd25e');
}
function drawTouchUI() {
  for (const b of TB) {
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = vbtn[b.id] ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '22px monospace'; ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 8);
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
    for (const d of game.drones) updateDrone(d, dt, game.player);
    updateBullets(dt, game.player);
    updatePickups(dt, game.player);
  } else if (game.state === 'dead') {
    game.player.vy += GRAV * dt;
    moveBody(game.player, dt, true);
  }
  updateParticles(dt);

  render();
  requestAnimationFrame(loop);
}

startGame();
game.state = 'title';
requestAnimationFrame(loop);
