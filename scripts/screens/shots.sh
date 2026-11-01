#!/bin/bash
# shots.sh <out dir> - screenshots of the launcher UI (app/ui) for the site and the news, with live data from our servers
# (the add-on list, chat, Online) and a desktop that has Elite installed. Needs Chrome/Chromium and python3.
# The page gets screens/shot-shim.js in place of Tauri (window.__TAURI__) and screens/inject.html in place of the
# <script src="app.js"> line: seeds the ticks a player has and walks to a view by the URL hash
# (view=home|addons|settings, lang=en|ru, check=1 presses "Check add-ons for updates", scroll=<css>, chat=<px>).
set -eu
OUT=${1:?out dir}; HERE=$(cd "$(dirname "$0")" && pwd); UI=$(mktemp -d)
cp -r "$HERE/../../app/ui/." "$UI/"; cp "$HERE/shot-shim.js" "$UI/"
python3 - "$UI/index.html" "$HERE/inject.html" <<'PY'
import sys; p, inj = sys.argv[1], open(sys.argv[2]).read(); s = open(p).read()
s = s.replace('<script src="app.js"></script>', inj); open(p, 'w').write(s)
PY
( cd "$UI" && exec python3 -m http.server 8777 --bind 127.0.0.1 ) >/dev/null 2>&1 & SRV=$!; trap "kill $SRV; rm -rf $UI" EXIT; sleep 1
CH=${CHROME:-$(command -v chromium || command -v google-chrome || command -v chromium-browser)}
mkdir -p "$OUT"
for spec in en_home:"lang=en&view=home&chat=0" en_addons:"lang=en&view=addons&check=1" en_settings:"lang=en&view=settings&scroll=%23muteMention" \
            ru_home:"lang=ru&view=home&chat=0" ru_addons:"lang=ru&view=addons&check=1" ru_settings:"lang=ru&view=settings&scroll=%23muteMention"; do
  n=${spec%%:*}; h=${spec#*:}; P=$(mktemp -d)
  timeout 90 "$CH" --headless=new --no-sandbox --hide-scrollbars --disable-web-security --user-data-dir="$P" --window-size=1120,700 \
    --virtual-time-budget=15000 --screenshot="$OUT/$n.png" "http://127.0.0.1:8777/index.html#$h" >/dev/null 2>&1 || true
  rm -rf "$P"; echo "$n.png"
done
