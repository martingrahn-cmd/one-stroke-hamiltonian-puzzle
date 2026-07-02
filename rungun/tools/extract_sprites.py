#!/usr/bin/env python3
"""Extrahera commando-sprites ur en AI-genererad preview-bild.

Originalbilden är en 1168x784 RGB-bild med inbakad rutmönster-bakgrund och
sprites som inte ligger på en exakt grid (mynningsflammor och gevär sticker
in i grannceller). Skriptet:

1. Maskar bort det ljusgrå rutmönstret (låg mättnad + hög ljushet).
2. Tar bort speckle-brus och fyller hål inuti figuren.
3. Hittar varje sprite via connected components (dilaterad mask så att
   lösa mynningsflammor hör ihop med sin sprite).
4. Delar blobbar som vuxit ihop horisontellt (split vid glesaste kolumnen).
5. Paketerar om till en jämn 8x3-sheet, 48x64 px per frame, transparent
   bakgrund, x-centrerad på figurens masscentrum och med gemensam
   baslinje per rad (så fötterna står stadigt).

Användning: python3 extract_sprites.py <input.png> <output.png>
Kräver: pillow, numpy, scipy
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SCALE = 4          # nedskalning från preview till spelupplösning
FW, FH = 48, 64    # målframe
GRID = (8, 3)      # kolumner x rader


def main(src: str, dst: str) -> None:
    im = Image.open(src).convert('RGB')
    a = np.array(im).astype(int)

    maxc = a.max(axis=2)
    minc = a.min(axis=2)
    bg = ((maxc - minc) < 22) & (maxc > 152)
    fg = ~bg

    # despeckle + fyll hål
    lab0, n0 = ndimage.label(fg)
    sizes = ndimage.sum(fg, lab0, range(1, n0 + 1))
    keep = np.zeros(n0 + 1, bool)
    keep[1:][sizes >= 120] = True
    fg = ndimage.binary_fill_holes(keep[lab0])

    # hitta sprites
    fat = ndimage.binary_dilation(fg, iterations=6)
    lab, n = ndimage.label(fat)
    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 2000:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        if x1 - x0 > 250:  # två ihopvuxna sprites — dela vid glesaste kolumnen
            sub = fg[y0:y1 + 1, x0:x1 + 1]
            cproj = sub.sum(axis=0)
            m0, m1 = int(len(cproj) * 0.3), int(len(cproj) * 0.7)
            split = x0 + m0 + int(np.argmin(cproj[m0:m1]))
            for (sx0, sx1) in [(x0, split), (split + 1, x1)]:
                s2 = fg[y0:y1 + 1, sx0:sx1 + 1]
                ys2, xs2 = np.where(s2)
                boxes.append((sx0 + xs2.min(), y0 + ys2.min(),
                              sx0 + xs2.max(), y0 + ys2.max()))
        else:
            boxes.append((x0, y0, x1, y1))

    # sortera i rader
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        for r in rows:
            if abs(r[0] - cy) < 90:
                r[1].append(b)
                break
        else:
            rows.append([cy, [b]])
    rows.sort(key=lambda r: r[0])
    for r in rows:
        r[1].sort(key=lambda b: b[0])
    counts = [len(r[1]) for r in rows]
    assert counts == [GRID[0]] * GRID[1], f'oväntat antal sprites: {counts}'

    alpha = np.where(fg, 255, 0).astype(np.uint8)
    rgba = np.dstack([np.array(im).astype(np.uint8), alpha])
    full = Image.fromarray(rgba, 'RGBA')

    sheet = Image.new('RGBA', (FW * GRID[0], FH * GRID[1]), (0, 0, 0, 0))
    for ri, r in enumerate(rows):
        base = int(np.median([b[3] for b in r[1]]))  # radens baslinje
        for ci, b in enumerate(r[1]):
            crop = full.crop((b[0], b[1], b[2] + 1, b[3] + 1))
            cw, ch = crop.size
            small = crop.resize((max(1, round(cw / SCALE)),
                                 max(1, round(ch / SCALE))), Image.LANCZOS)
            arr = np.array(small)
            arr[..., 3] = np.where(arr[..., 3] > 90, 255, 0)  # hård alfa
            small = Image.fromarray(arr, 'RGBA')
            sw, sh = small.size
            sub = fg[b[1]:b[3] + 1, b[0]:b[2] + 1]
            comx = float(np.where(sub)[1].mean()) / SCALE
            dx = int(FW / 2 - comx)
            dy = FH - 1 - sh - round((base - b[3]) / SCALE)
            fx = max(ci * FW, min(ci * FW + dx, (ci + 1) * FW - sw))
            fy = max(ri * FH, min(ri * FH + dy, (ri + 1) * FH - sh))
            sheet.alpha_composite(small, (fx, fy))
    sheet.save(dst)
    print(f'skrev {dst} ({sheet.width}x{sheet.height}, {GRID[0]}x{GRID[1]} frames à {FW}x{FH})')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
