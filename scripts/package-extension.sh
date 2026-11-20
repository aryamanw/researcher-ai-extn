#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

VERSION=$(node -p "require('./package.json').version")
MANIFEST_VERSION=$(node -p "require('./manifest.json').version")
if [ "$VERSION" != "$MANIFEST_VERSION" ]; then
  echo "Version mismatch: package.json=$VERSION manifest.json=$MANIFEST_VERSION" >&2
  exit 1
fi
OUT="research-companion-v${VERSION}.zip"

rm -f "$OUT"

# Minimal package: runtime files only. src/content and src/lib/extraction.js are
# only consumed through dist/content.bundled.js, so they are left out. -D omits
# directory entries; .DS_Store and tests never ship.
zip -r -D "$OUT" \
  manifest.json \
  background.js \
  LICENSE \
  THIRD_PARTY_NOTICES.md \
  icons \
  options \
  sidepanel \
  src/lib \
  src/styles \
  dist/content.bundled.js \
  -x '*.DS_Store' '*.test.js' '*.map' 'src/lib/extraction.js'

# Verify every file referenced by the manifest and HTML pages is in the zip.
node - "$OUT" <<'JS'
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const zip = process.argv[2];
const files = new Set(execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean));
const refs = new Set();
const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
refs.add(m.background.service_worker);
refs.add(m.options_page);
refs.add(m.side_panel.default_path);
Object.values(m.icons).forEach((p) => refs.add(p));
Object.values(m.action.default_icon).forEach((p) => refs.add(p));
// Static imports (incl. transitively from entry JS) and HTML src/href.
const seen = new Set();
const walk = (f) => {
  if (seen.has(f) || !fs.existsSync(f)) return;
  seen.add(f);
  refs.add(f);
  const text = fs.readFileSync(f, 'utf8');
  const re = f.endsWith('.html')
    ? /(?:src|href)="(\.{0,2}\/[^"#]+|[^":]+\.(?:js|css|png))"/g
    : f.endsWith('.js') ? /(?:from|import)\s*['"](\.[^'"]+)['"]/g : null;
  if (!re) return;
  for (const [, r] of text.matchAll(re)) {
    const p = path.posix.normalize(path.posix.join(path.posix.dirname(f), r));
    refs.add(p);
    walk(p);
  }
};
[m.background.service_worker, m.options_page, m.side_panel.default_path].forEach(walk);
refs.add('LICENSE'); refs.add('THIRD_PARTY_NOTICES.md');
refs.add('dist/content.bundled.js'); // injected via chrome.scripting.executeScript
const missing = [...refs].filter((r) => !files.has(r));
if (missing.length) { console.error('MISSING from zip:', missing); process.exit(1); }
console.log(`Verified ${refs.size} referenced files present in ${zip}`);
JS

echo "Packaged $OUT"
unzip -l "$OUT"
