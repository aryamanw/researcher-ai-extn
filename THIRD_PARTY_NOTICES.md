# Third-Party Notices

Research Companion is released under the MIT License (see `LICENSE`). The following third-party software is bundled into the shipped extension.

## @mozilla/readability 0.6.0

- Bundled into: `dist/content.bundled.js` (built by esbuild from `src/content/contentEntry.js`)
- Project: https://github.com/mozilla/readability
- License: Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
- Copyright (c) 2010 Arc90 Inc

The library is used unmodified. Its license text, as distributed in the npm package (`LICENSE.md`), follows. The package contains no separate NOTICE file.

---

Copyright (c) 2010 Arc90 Inc

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

## Other assets

- Extension and docs fonts: system font stacks only; no font files are shipped in the extension. (The docs landing page loads Plus Jakarta Sans from Google Fonts and GSAP from cdnjs at view time; these are not part of the extension package.)
- Icons (`icons/*.png`): generated from this repository's own script (`scripts/generate-icons.mjs`); no third-party artwork.

Development-only dependencies (esbuild, vitest, jsdom, playwright) are not shipped in the extension.
