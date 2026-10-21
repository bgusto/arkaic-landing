#!/bin/sh
# Builds assets/loop-download-inspect.gif and its -phone variant: the model page
# (model.html, styled with Evolve's own stylesheet) with the Download click, then the
# terminal (terminal.html) running `evolve inspect`. Frames are rendered offscreen with
# WebKit (snap.py), which needs PyObjC: see README.md.
set -e
cd "$(dirname "$0")"
cp "${EVOLVE_UI:-$HOME/Projects/evolve/clients/ui}/app/styles.css" evolve.css
python3 -m http.server 8012 >/dev/null 2>&1 & srv=$!
trap 'kill $srv' EXIT
sleep 1
python3 snap.py "http://localhost:8012/model.html" 1150 833 mock-base.png
python3 snap.py "http://localhost:8012/model.html?hover=1" 1150 833 mock-hover.png
./render-term.sh 1150
./render-term.sh 890
python3 compose.py loop-desk.gif 0 1150
python3 compose.py loop-phone.gif 260 890
cp loop-desk.gif ../../assets/loop-download-inspect.gif
cp loop-phone.gif ../../assets/loop-download-inspect-phone.gif
# the rendered frames stay, so a timing change needs only compose.py
rm -f key-*.png loop-*.gif evolve.css
