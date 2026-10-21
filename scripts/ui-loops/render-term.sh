#!/bin/sh
# render-term.sh W : every terminal state at width W into term-W-<state>.png
W=$1
for n in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31; do
  python3 snap.py "http://localhost:8012/terminal.html?w=$W&n=$n&lines=0" $W 833 term-$W-n$n.png >/dev/null 2>&1
done
for l in 2 4 6 8 10 12 14 16 18 20; do
  python3 snap.py "http://localhost:8012/terminal.html?w=$W&n=99&lines=$l" $W 833 term-$W-l$l.png >/dev/null 2>&1
done
ls term-$W-*.png | wc -l
