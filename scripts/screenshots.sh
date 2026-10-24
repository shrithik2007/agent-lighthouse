#!/bin/sh
# Capture GTM screenshots with headless Chrome from the running dashboard (npm run dashboard).
# Usage: sh scripts/screenshots.sh [dashboard-url]
set -eu
URL="${1:-http://localhost:4100}"
OUT="gtm/screenshots"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="${3:-1}" --window-size="$2" --virtual-time-budget=5000 --screenshot="$OUT/$1" "$4" >/dev/null 2>&1; echo "$OUT/$1"; }
# Row 1 (scores + Agent Tax), light theme.
shot dashboard-row1.png 1280,560 2 "$URL/?theme=light"
# Social preview, exactly 1280x640.
shot social-preview.png 1280,640 1 "$URL/?theme=light"
# Full report, for the deck and blog.
shot dashboard-full.png 1280,2300 1 "$URL/?theme=light"
# The owner-review proposal.
shot proposal.png 1100,1500 1 "$URL/results/proposal.md"
# Kane's own screenshot at the failing step (KR-133), copied unchanged.
cp evidence/runs/baseline-before-1/failing-step.jpg "$OUT/failing-step.jpg" && echo "$OUT/failing-step.jpg"
