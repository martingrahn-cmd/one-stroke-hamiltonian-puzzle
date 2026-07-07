#!/usr/bin/env python3
"""Re-extract the Floor Turret sheet without clipping the raised barrel /
explosions and with feathered (anti-aliased) alpha so the frames don't look
like hard cut-out stickers.

Source: turret_src.png, 1248x832 — actually a 5x3 grid (cells ~250x277), NOT
6x3: each row holds 5 distinct turret poses (deploy / active+fire / destruction).
The earlier 6-column assumption sliced one turret into a broken frame, which
read as the "square / cut-out" feel.
Strategy per cell:
  * mask out the bright checker background (keep dark-grey turret + fx colours)
  * clean stray specks
  * detect the turret BASE bottom (lowest wide band of the main lower blob)
    and anchor it to a fixed baseline so the pedestal never shifts
  * scale the whole cell uniformly by width (64/208) and composite into a
    64x80 RGBA frame, bottom-anchored on the base, with a smooth downscale so
    edges get a 1px anti-aliased feather instead of a razor edge
Output: robot-turret.png, 384x240 (6x3, 64x80 frames)
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'turret_src.png'
OUT = '/home/user/one-stroke-hamiltonian-puzzle/rungun/assets/robot-turret.png'
COLS, ROWS = 5, 3
FW, FH = 64, 80          # target frame (taller so raised barrel/explosion fit)
BASELINE = 74            # y in frame where the base bottom sits

im = Image.open(SRC).convert('RGB')
a = np.array(im).astype(int)
H, W = a.shape[:2]
CW, CH = W // COLS, H // ROWS
mx = a.max(2); mn = a.min(2); sat = mx - mn
# background = low-saturation AND bright (the light checker). Everything else
# (dark metal body + coloured fx) is sprite.
mask = ~((sat < 24) & (mx > 150))

sheet = Image.new('RGBA', (FW * COLS, FH * ROWS), (0, 0, 0, 0))

for r in range(ROWS):
    for c in range(COLS):
        m = mask[r*CH:(r+1)*CH, c*CW:(c+1)*CW].copy()
        rgb = a[r*CH:(r+1)*CH, c*CW:(c+1)*CW].astype('uint8')
        # drop tiny specks (isolated checker seams that slipped the threshold)
        lab, n = ndimage.label(m)
        if n:
            sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n+1))
            keep = {i+1 for i, s in enumerate(sizes) if s >= 40}
            m = np.isin(lab, list(keep))
        ys, xs = np.where(m)
        if len(xs) == 0:
            continue
        # --- locate the pedestal ANYWHERE in the bottom band (the source
        # sprites drift horizontally, so don't assume it's centred). The
        # pedestal is the biggest solid mass sitting near the cell bottom.
        BOT = 64
        botband = m[CH-BOT:CH, :]
        blab, bn = ndimage.label(botband)
        if bn == 0:
            continue
        bsizes = ndimage.sum(np.ones_like(blab), blab, range(1, bn+1))
        ped = int(np.argmax(bsizes)) + 1
        pys, pxs = np.where(blab == ped)
        cx = int(round(pxs.mean()))              # pedestal x-centre -> anchor
        base_bot = (CH - BOT) + pys.max()        # pedestal bottom -> baseline
        # --- keep the whole frame's content (like the original clean pass);
        # only strip SMALL slivers glued to the L/R seam, i.e. the neighbouring
        # frame bleeding a few px across the boundary. Large blobs are always
        # kept so a barrel/base split across a gap is never dropped.
        lab, n = ndimage.label(m)
        if n > 1:
            keep = np.zeros_like(m)
            for i in range(1, n+1):
                comp = lab == i
                cyy, cxx = np.where(comp)
                touches_seam = cxx.min() <= 1 or cxx.max() >= CW-2
                if comp.sum() >= 900 or not touches_seam:
                    keep |= comp        # substantial part -> keep
            m = keep
            ys, xs = np.where(m)
            if len(xs) == 0:
                continue
        # build a full-cell RGBA (feathered alpha comes from smooth downscale)
        cell = np.zeros((CH, CW, 4), dtype='uint8')
        cell[..., :3] = rgb
        cell[..., 3] = (m * 255).astype('uint8')
        cimg = Image.fromarray(cell, 'RGBA')

        scale = FW / CW               # uniform, width-driven
        nw, nh = FW, max(1, round(CH * scale))
        cimg = cimg.resize((nw, nh), Image.LANCZOS)   # smooth -> AA edges

        # place: base bottom -> BASELINE, anchor x -> centre of frame
        sb = base_bot * scale         # scaled base-bottom y
        scx = cx * scale
        ox = round(FW/2 - scx)
        oy = round(BASELINE - sb)
        sheet.alpha_composite(cimg, (c*FW + ox, r*FH + oy))

# hard-clamp faint feather ghosts (alpha<12) to fully clear so no grey haze
arr = np.array(sheet)
arr[..., 3] = np.where(arr[..., 3] < 12, 0, arr[..., 3])
Image.fromarray(arr).save(OUT)
print('wrote', OUT, sheet.size)
