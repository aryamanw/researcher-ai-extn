# TODO

Open items for the Chrome Web Store launch and after. Copy-paste text for every dashboard field is in [docs/chrome-web-store-listing.md](docs/chrome-web-store-listing.md).

## Chrome Web Store submission

- [ ] Developer Dashboard → Account: set and verify a contact email (required to publish; doesn't have to be the one shown publicly).
- [ ] Turn on 2-step verification for the Google account that owns the developer account.
- [ ] **Release gate.** Before uploading v0.2.0: test every shipped provider with a real key (Mode 1 search returns cited results; Mode 2 with Exa and Tavily). Least-verified: OpenRouter chat-completions search, Gemini grounding host-matching, Anthropic `allowed_callers`.
- [ ] New item → upload `research-companion-v0.2.0.zip` (from the v0.2.0 GitHub release, or `npm run package`).
- [ ] Store listing tab: paste the description, category Productivity, language English; upload `store-assets/screenshot-sidepanel.png`, `store-assets/screenshot-options.png`, `store-assets/promo-small-440x280.png`.
- [ ] Privacy practices tab: single purpose, per-permission justifications, remote code = No, data usage = Website content + Authentication information only, tick all three certifications, privacy policy URL.
- [ ] Create a spend-limited Anthropic API key (e.g. $5 cap) for reviewers. Paste it **only** into the dashboard "Test instructions" field. Never commit it.
- [ ] Distribution tab: Public, all regions, free. Submit for review.
- [ ] After approval: revoke the reviewer key.
- [ ] After approval: replace `REPLACE_WITH_ITEM_ID` in `README.md` (two places) with the store item ID.

## Privacy / account hygiene

- [ ] Old commits are still readable through GitHub's read-only pull-request refs (`refs/pull/1/head`, `refs/pull/2/head`), which still contain the old author email. Only GitHub Support can purge them: https://support.github.com/request → "Remove sensitive data" (list the repo and both PR numbers).
- [ ] GitHub → Settings → Emails: turn on "Keep my email addresses private" and "Block command line pushes that expose my email".
- [ ] This repo now commits as the GitHub noreply address. Other repos on this machine still use the global `user.email`; change it with `git config --global user.email "63539114+aryamanw@users.noreply.github.com"` if you want the same everywhere.
- [ ] Contact email in the privacy policy and terms: none for now (GitHub issues only). Revisit if a reviewer asks.

## Product follow-ups

- [ ] Real store screenshots: the side panel open next to an actual article, full-bleed with no padding (Chrome's recommendation). Current ones show the UI centered on grey.
- [ ] Keyboard-shortcut race: `background.js` sends `RUN_SEARCH` right after `sidePanel.open()`. If the panel hasn't loaded its listener yet, the message is dropped (the panel still runs on load, so it's minor).
- [ ] Groq re-check (dropped: no source URLs). `browser_search` docs show no URLs in the response; re-add if a live test shows URLs in `message.annotations` or `executed_tools[].search_results`. See `docs/provider-verification.md`.
- [ ] Gemini Interactions API migration (`generateContent` is labelled legacy by Google).
- [ ] Chrome built-in AI (Gemini Nano) for on-device query generation.
- [ ] Anthropic web search can return `stop_reason: "pause_turn"` on long searches; the client doesn't resume the turn yet.
- [ ] Optional privacy features: a "don't save history" toggle; skip extraction on obviously sensitive hosts (webmail, banking) or show a one-time notice that page text goes to the selected provider.
- [ ] Refresh `docs/PRD.md`, `docs/TRD.md`, `docs/APP-FLOW.md`, `DESIGN.md` (they still describe the old two-call pipeline and Brave Search) before un-ignoring and publishing them.

## Maintenance

- [ ] Dev-only `npm audit` findings (vitest, esbuild, postcss, nanoid, tinypool): bump vitest and esbuild to current majors. None of this code ships in the extension. Dependabot will open PRs.
- [ ] Release checklist for every version: bump `package.json` + `manifest.json`, update `CHANGELOG.md`, tag `vX.Y.Z` (the release workflow builds the zip), upload the zip under Package in the dashboard.
