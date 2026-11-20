# Contributing to Research Companion

Thanks for your interest. Bug reports, fixes, and focused improvements are welcome.

## Before you start

- Check [existing issues](https://github.com/aryamanw/researcher-ai-extn/issues) first. For anything larger than a small fix, open an issue to discuss it before writing code.
- The project is deliberately small: no backend, no telemetry, no background activity, and it only runs when the user clicks the toolbar icon. Changes that add permissions, network destinations, or data collection need a strong justification and a privacy policy update.
- By contributing you agree your work is released under the [MIT License](LICENSE), and you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Requires Node 22 and Chrome.

```sh
npm install
npm test
npm run build
```

Load the repo root as an unpacked extension (`chrome://extensions` → **Developer mode** → **Load unpacked**). Full details, the manual smoke test, and the release process are in [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Making a change

1. Fork the repo and branch from `main`.
2. Keep the change focused. Match the existing style; don't reformat unrelated code.
3. Add or update tests in `tests/` for behavior changes (Vitest + jsdom). Fix bugs with a test that reproduces them.
4. Run `npm test` and `npm run build`. CI runs both on every pull request.
5. If you touched `sidepanel/`, `options/`, `background.js`, or `src/`, run the manual smoke test in `docs/DEVELOPING.md`.
6. Open a pull request using the template. Never include API keys or personal data in code, tests, or screenshots.

Commit messages follow a conventional style: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `ci:`.

## Security issues

Do not file them publicly. See [SECURITY.md](SECURITY.md).
