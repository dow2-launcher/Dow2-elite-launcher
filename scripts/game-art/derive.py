#!/usr/bin/env python3
"""derive.py - the plate's two derived pictures, made from the plate (and its fill) in app/ui/img/ui:
  plate-m.png       the plate mirrored left-right: its cut corner at the top RIGHT - for the plate buttons on the left of the
                    window (Create a lobby), so the cut faces the middle of the window as on Play (owner 13.11.2026)
  plate-fill-m.png  the plate's inside mirrored the same way (the light falls from the other side)
  plate-sq.png      the plate with square corners: its right half and that half mirrored. For the cards (lobbies, the match
                    under Online, the announcements) - the plate's 20 px cut, squeezed into a 6 px border, read as a rounded
                    top-left corner (owner 13.11.2026: "why is the frame of the room cards rounded at the top left")
Run with no arguments (the stand-ins) - apply.py runs it too after putting the game's own plate in place."""
import os
from PIL import Image, ImageOps

UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'app', 'ui', 'img', 'ui')


def find(name):
    for ext in ('.png', '.jpg'):
        p = os.path.join(UI, name + ext)
        if os.path.exists(p): return p
    return None


def derive():
    plate = Image.open(find('plate')).convert('RGBA')
    ImageOps.mirror(plate).save(os.path.join(UI, 'plate-m.png'), optimize=True)
    w, h = plate.size
    half = plate.crop((w // 2, 0, w, h))
    sq = Image.new('RGBA', (half.width * 2, h)); sq.paste(ImageOps.mirror(half), (0, 0)); sq.paste(half, (half.width, 0))
    sq.save(os.path.join(UI, 'plate-sq.png'), optimize=True)
    fill = Image.open(find('plate-fill'))
    ImageOps.mirror(fill.convert('RGB')).save(os.path.join(UI, 'plate-fill-m.jpg'), quality=90)
    print('plate-m.png', plate.size, '· plate-sq.png', sq.size, '· plate-fill-m.jpg', fill.size)


if __name__ == '__main__':
    derive()
