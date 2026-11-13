#!/usr/bin/env python3
"""apply.py <extracted game dir> [art-map.json] - puts the game's own pictures into the launcher's art slots (slots.json).

art-map.json names, per slot, the file in the extracted game (a path relative to the dir, as find.py shows it) and, when
needed, a crop of it and a 9-slice width:
  { "plate": { "src": "ui/textures/fe/button.dds", "crop": [0, 0, 278, 64], "slice": 14 },
    "tick":  { "src": "ui/textures/fe/ready.dds" } }
The pictures are written as PNG into app/ui/img/ui (icons into img/ui/icons); app/ui/img/ui/art.css re-points the slots to
them (and draws the CSS icons with them), app/ui/img/ui/art.js lists the icons for the launcher's code. A slot left out of the
map keeps its stand-in. Run it again after any change of the map. --doc writes app/ui/img/ui/SLOTS.md from slots.json."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(HERE, '..', '..', 'app', 'ui', 'img', 'ui')
SLOTS = {k: v for k, v in json.load(open(os.path.join(HERE, 'slots.json'))).items() if k != '_'}

# the icons drawn in CSS: their rules once the game's picture is there (the line icons of the code are swapped by art.js)
CSS_ICON = {
    'tick': '.rdy.on::after{width:20px;height:20px;border:0;transform:none;filter:none;background:url(icons/tick.png) center/contain no-repeat}',
    'check': 'input[type=checkbox]:not([role=switch])::before{width:12px;height:12px;clip-path:none;background:url(icons/check.png) center/contain no-repeat}',
    'chevron': 'select{background-image:url(icons/chevron.png),linear-gradient(#112324,#081314);background-position:calc(100% - 10px) 50%,0 0;background-size:12px 12px,100% 100%}'
               '\n.ver-btn::after,.me-chip .chev{content:"";width:12px;height:12px;border:0;transform:none;background:url(icons/chevron.png) center/contain no-repeat}',
    'avatar': ':root{--av-def:url(icons/avatar.png)}',
    'signal': '.hdr-net svg{display:none}\n.hdr-net::before{content:"";width:20px;height:20px;background:url(icons/signal.png) center/contain no-repeat}',
    'door': '.rnb[data-r="open"] svg{display:none}\n.rnb[data-r="open"]::before{content:"";width:16px;height:16px;background:url(icons/door.png) center/contain no-repeat}',
    'eye': '.rnb[data-r="live"] svg{display:none}\n.rnb[data-r="live"]::before{content:"";width:16px;height:16px;background:url(icons/eye.png) center/contain no-repeat}',
}
JS_ICONS = {'steam', 'bars', 'out', 'upload', 'info', 'enter', 'eye', 'door', 'plus', 'crown', 'lock', 'x'}


def doc():
    rows = ['| Slot | Kind | File | Size | Slice | Stands in now | Used for | In the game |', '|---|---|---|---|---|---|---|---|']
    for k, s in SLOTS.items():
        f = ('icons/' if s['kind'] == 'icon' else '') + s['file']
        rows.append(f"| `{k}` | {s['kind']} | `{f}` | {s.get('size', '')} | {s.get('slice', '')} | {s.get('now', '')} | {s.get('use', '')} | {s.get('game', '')} |")
    open(os.path.join(UI, 'SLOTS.md'), 'w').write('# The art slots of the launcher\n\nEvery picture of the D look, from `scripts/game-art/slots.json`. '
        'The stand-ins are crops of the menus\' screenshots; `scripts/game-art` puts the game\'s own files in their place (README there).\n\n' + '\n'.join(rows) + '\n')
    print('SLOTS.md written')


def main():
    from PIL import Image
    root = sys.argv[1]; mp = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'art-map.json')))
    os.makedirs(os.path.join(UI, 'icons'), exist_ok=True)
    root_vars, rules, icons = [], [], []
    for k, m in mp.items():
        if k.startswith('_'): continue
        s = SLOTS.get(k)
        if not s: print('no slot', k); continue
        im = Image.open(os.path.join(root, m['src'])).convert('RGBA')
        if m.get('crop'): x, y, w, h = m['crop']; im = im.crop((x, y, x + w, y + h))
        if s['kind'] == 'icon':
            im.thumbnail((64, 64)); im.save(os.path.join(UI, 'icons', k + '.png'))
            if k in CSS_ICON: rules.append(CSS_ICON[k])
            if k in JS_ICONS: icons.append(k)
        else:
            im.save(os.path.join(UI, k + '.png'))
            var = {'frame': 'frame', 'panel': 'panel', 'plate': 'plate', 'plate-fill': 'plate-fill', 'card': 'card', 'slot': 'slot',
                   'name': 'name', 'name-fill': 'name-fill', 'field': 'field', 'portrait': 'portrait', 'bg': 'bg'}[k]
            root_vars.append(f'--art-{var}:url({k}.png);')
            if m.get('slice') is not None or s.get('slice') is not None:
                root_vars.append(f"--art-{var}-slice:{m.get('slice', s.get('slice'))};")
        print('ok', k, im.size)
    if 'plate' in mp or 'plate-fill' in mp:   # the plate's mirrored and square copies follow it (derive.py, 1.6.3)
        sys.path.insert(0, HERE); import derive; derive.derive()
        root_vars.append('--art-plate-m:url(plate-m.png);--art-plate-fill-m:url(plate-fill-m.jpg);--art-plate-sq:url(plate-sq.png);')
    css = '/* written by scripts/game-art/apply.py from art-map.json - the game\'s own pictures in the art slots */\n'
    if root_vars: css += ':root{' + ''.join(root_vars) + '}\n'
    css += '\n'.join(rules) + '\n'
    open(os.path.join(UI, 'art.css'), 'w').write(css)
    open(os.path.join(UI, 'art.js'), 'w').write('// written by scripts/game-art/apply.py: the icons taken from the game (img/ui/icons/<name>.png)\nwindow.ART_ICONS = ' + json.dumps(sorted(icons)) + ';\n')
    print('art.css, art.js written')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--doc': doc()
    elif len(sys.argv) > 1: main()
    else: print(__doc__)
