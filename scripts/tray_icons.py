#!/usr/bin/env python3
"""1.6.32 (owner 24.11.2026): the tray's icons - the cross of the launcher's icon bigger than in the window's icon (it fills the
tray's square on the dark plate), and the same with a yellow dot (the news dot's colour) for a mention in the chat not seen yet.
Writes app/icons/tray/<size>.rgba and <size>-dot.rgba (raw RGBA, read by app/src/tray.rs with include_bytes!: no image decoder
in the app) for the tray's sizes at 100 / 150 / 200 / 300 % (16 / 24 / 32 / 48 px), plus tray.png / tray-dot.png to look at.
  python3 scripts/tray_icons.py        (needs Pillow; the source is app/icon-src.png)"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'app' / 'icons' / 'tray'
SIZES = (16, 24, 32, 48)
S = 256

def cross():
    src = Image.open(ROOT / 'app' / 'icon-src.png').convert('RGBA')
    px = src.load()
    mint = lambda c: c[3] > 200 and c[0] > 150 and c[1] > 200
    xs, ys = [], []
    for y in range(120, 900):             # inside the plate, above its bottom bar
        for x in range(120, 904):
            if mint(px[x, y]): xs.append(x); ys.append(y)
    pad = 6
    c = src.crop((min(xs) - pad, min(ys) - pad, max(xs) + pad + 1, max(ys) + pad + 1))
    w, h = c.size; cp = c.load()
    dark = lambda p: not (p[0] > 120 and p[1] > 160)
    seen, q = set(), deque([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
    while q:                              # the plate around the cross -> transparent (the skull inside stays)
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or (x, y) in seen: continue
        seen.add((x, y))
        if not dark(cp[x, y]): continue
        cp[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return c

def icon(cr, dot):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * .2), fill=(0x0b, 0x18, 0x19, 255), outline=(0x3e, 0xd0, 0xb3, 255), width=int(S * .05))
    n = int(S * .86); o = (S - n) // 2
    im.alpha_composite(cr.resize((n, n), Image.LANCZOS), (o, o))
    if dot:
        r = int(S * .25); cx, cy = S - r - 1, r + 1
        d = ImageDraw.Draw(im)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(0x07, 0x10, 0x11, 255))
        r2 = int(r * .74); d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), fill=(0xf2, 0xc2, 0x3a, 255))
    return im

cr = cross()
OUT.mkdir(parents=True, exist_ok=True)
for dot in (False, True):
    big = icon(cr, dot)
    big.save(OUT / ('tray-dot.png' if dot else 'tray.png'))
    for s in SIZES:
        (OUT / f'{s}{"-dot" if dot else ""}.rgba').write_bytes(big.resize((s, s), Image.LANCZOS).tobytes())
print('tray icons:', sorted(p.name for p in OUT.iterdir()))
