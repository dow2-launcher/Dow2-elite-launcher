#!/usr/bin/env python3
"""find.py <extracted game dir> [out.html] - a contact sheet of every picture in the game's unpacked archives (DDS, TGA, PNG,
JPG; the images JPEXS exported from the menus' .gfx too): a thumbnail, its size and its path, with a filter box. Open the
page, find the frame / plate / icon a slot needs (slots.json), copy its path into art-map.json. Needs Pillow (pip install pillow).
The thumbnails go next to the page (find-thumbs/)."""
import html, os, sys
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
OUT = sys.argv[2] if len(sys.argv) > 2 else 'find.html'
TH = os.path.join(os.path.dirname(os.path.abspath(OUT)), 'find-thumbs')
os.makedirs(TH, exist_ok=True)
EXT = ('.dds', '.tga', '.png', '.jpg', '.jpeg', '.bmp')
rows = []
for d, _, fs in os.walk(ROOT):
    for f in sorted(fs):
        if not f.lower().endswith(EXT): continue
        p = os.path.join(d, f); rel = os.path.relpath(p, ROOT).replace('\\', '/')
        try:
            im = Image.open(p); w, h = im.size; im = im.convert('RGBA'); im.thumbnail((160, 160))
        except Exception as e:
            rows.append((rel, '?', '', str(e)[:60])); continue
        t = 't%05d.png' % len(rows); im.save(os.path.join(TH, t)); rows.append((rel, '%dx%d' % (w, h), 'find-thumbs/' + t, ''))
cards = ''.join(f'<figure data-p="{html.escape(r.lower())}"><div>{f"<img src={chr(34)}{th}{chr(34)} loading=lazy>" if th else html.escape(err)}</div>'
                f'<figcaption><b>{sz}</b> {html.escape(r)}</figcaption></figure>' for r, sz, th, err in rows)
open(OUT, 'w', encoding='utf-8').write(f'''<!doctype html><meta charset=utf-8><title>Game art · {len(rows)}</title>
<style>body{{margin:0;padding:12px;background:#111;color:#ddd;font:12px system-ui}}input{{width:100%;padding:8px;margin-bottom:10px;font:14px system-ui}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}}figure{{margin:0;padding:6px;background:#1c1c1c;border:1px solid #333}}
figure div{{height:160px;display:grid;place-items:center;background:repeating-conic-gradient(#2a2a2a 0 25%,#222 0 50%) 0 0/16px 16px}}
figure img{{max-width:160px;max-height:160px}}figcaption{{margin-top:4px;word-break:break-all;user-select:all}}</style>
<input id=q placeholder="filter by path: ui/ textures button frame check ..." autofocus><main>{cards}</main>
<script>q.oninput=()=>{{const v=q.value.toLowerCase().split(/\\s+/).filter(Boolean);document.querySelectorAll('figure').forEach(f=>f.hidden=!v.every(x=>f.dataset.p.includes(x)))}}</script>''')
print(f'{len(rows)} pictures -> {OUT}')
