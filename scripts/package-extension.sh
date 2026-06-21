#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

VERSION=$(node -p "require('./package.json').version")
OUT="research-companion-v${VERSION}.zip"

rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  background.js \
  icons \
  options \
  sidepanel \
  src \
  dist/content.bundled.js \
  -x '*.test.js' '**/*.test.js'

echo "Packaged $OUT"
unzip -l "$OUT"
