---
name: Research Companion
description: A quiet side-panel tool that surfaces related reading without competing for attention

colors:
  ink: "oklch(27.1% 0.036 229.8)"
  ink-on-dark: "oklch(95% 0.012 230)"
  text-secondary: "oklch(50% 0.02 230)"
  text-secondary-on-dark: "oklch(68% 0.022 230)"
  bg: "oklch(97.1% 0.004 134.8)"
  bg-dark: "oklch(20% 0.03 230)"
  surface: "oklch(92% 0.014 230)"
  surface-dark: "oklch(30% 0.025 230)"
  border: "oklch(84% 0.018 230)"
  border-dark: "oklch(40% 0.025 230)"
  border-strong: "oklch(60% 0.025 230)"
  border-strong-dark: "oklch(55% 0.025 230)"
  accent: "oklch(50% 0.09 231)"
  accent-dark: "oklch(70% 0.095 231)"
  accent-secondary: "oklch(30.4% 0.077 148.5)"
  accent-secondary-dark: "oklch(68% 0.1 148)"
  focus-ring: "oklch(50% 0.09 231)"
  focus-ring-dark: "oklch(70% 0.095 231)"

typography:
  display:
    fontFamily: "-apple-system, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  headline:
    fontFamily: "-apple-system, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "-apple-system, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, Segoe UI, Roboto, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"

rounded:
  sm: "6px"
  md: "8px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"

components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "44px"
  text-input-focus:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  result-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  history-row:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "44px"
  history-row-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
---

# Design System: Research Companion

## 1. Overview

**Creative North Star: "The Reading Lamp"**

A reading lamp doesn't decorate the desk, it lights the page. Research Companion sits beside whatever the user is already reading, surfaces a short, well-ranked list of related material, and disappears the moment it's not needed. The system draws from Notion, Readwise, and 1Password: quiet utility chrome, generous whitespace, warmth without ornament, and a deliberately narrow accent vocabulary — one functional color, used only where intent needs to be legible.

Unlike most "design systems," there is no signature color *moment* here — no Airtable-style full-bleed coral card, no brand-voltage hero. That absence is deliberate: this is infrastructure beside someone else's content, not a destination of its own. Color earns its place by marking exactly two things — primary commitment (the teal accent) and secondary/lower-commitment actions (the forest-green accent) — everything else stays in the graphite-teal neutral ramp. The one place this system *does* spend effort that's easy to skip is touch-target and type-scaling discipline (`{component.button-primary}`, `{component.history-row}`, `{component.text-input}` all hold a 44px minimum), because a side panel this narrow has no room for a second chance at a mis-tap.

This system explicitly rejects the AI-chatbot register (bubble avatars, personality-driven "thinking..." copy, conversational filler) and the content-farm recommendation-widget register (bright thumbnails, urgency framing, "you won't believe" energy). It also rejects anything that visually competes with the host webpage the user is reading.

**Key Characteristics:**
- Near-neutral graphite-teal palette plus exactly two functional accents (teal for primary, forest green for secondary) — color is structural and rare, never decorative
- Single system sans (resolves to San Francisco on macOS/iOS Safari, Segoe UI on Windows) at `rem` sizes so browser zoom and OS text-size settings scale the panel correctly
- Responsive, not choreographed, motion — feedback without performance
- Flat by default; depth comes from spacing and tone, not shadows
- Every clickable row or control holds a 44×44px minimum target, even though this is a desktop-first extension

## 2. Colors

A Restrained-to-Committed palette: neutrals carry the surface, and two functional hues — teal and forest green, sharing a near-identical base hue family with the neutral ramp's own slight teal tint — carry meaning at low coverage (primary action vs. secondary action). Nothing else in the interface introduces a hue; the host page the user is reading still supplies almost all the color in view.

### Primary
- **Ink** (`{colors.ink}` — `oklch(27.1% 0.036 229.8)`): primary text, history-row hover text. No longer the primary-button background (see Accent) — body text and primary action are now visually distinct, which is the whole point of introducing an accent.
- **Accent** (`{colors.accent}` — `oklch(50% 0.09 231)`, dark: `{colors.accent-dark}` — `oklch(70% 0.095 231)`): primary button background, focus ring (all interactive elements), the "Why this:" relevance-label lead-in, the active-provider label. The one color reserved for "this is the primary path" — used sparingly and consistently, never decoratively. Darkened from its source teal (58% L) to 50% L specifically so it clears 4.5:1 as both a button fill behind light text and as plain text-on-bg; the lighter value read as the same hue but failed AA in either role.
- **Accent Secondary** (`{colors.accent-secondary}` — `oklch(30.4% 0.077 148.5)`, dark: `{colors.accent-secondary-dark}` — `oklch(68% 0.1 148)`): secondary/ghost action text and border — the Cancel button and the API-key Show/Hide toggle. A distinct hue family from Accent (148° vs 231°) so primary and secondary actions are never confusable at a glance, even for color-blind users, since lightness and hue both shift together.

### Neutral
- **Bg** (`{colors.bg}` — `oklch(97.1% 0.004 134.8)`): app background, panel background, default history-row background (light theme).
- **Surface** (`{colors.surface}` — `oklch(92% 0.014 230)`): one step up from Bg — result-card background, input background, history-row hover background.
- **Text Secondary** (`{colors.text-secondary}` — `oklch(50% 0.02 230)`): secondary text, placeholder text, relevance-note copy, default (non-hover) history-row text. Held at 50% L (the same lightness the previous graphite ramp validated) so it clears 4.5:1 against `{colors.surface}` under the new hue too — re-verified by computed contrast, not assumed from the old palette's audit.
- **Border** (`{colors.border}` — `oklch(84% 0.018 230)`): dividers between header/results/history, result-card outline, the hairline under relevance notes. Decorative dividers backed by a fill-color difference from their surroundings, so they aren't required to hit WCAG 1.4.11's 3:1 non-text contrast minimum.
- **Border Strong** (`{colors.border-strong}` — `oklch(60% 0.025 230)`, dark: `{colors.border-strong-dark}` — `oklch(55% 0.025 230)`): for borders that are the *sole* indicator of an element's boundary, with no fill-color difference behind them. Measures 3.61:1 (light) / 3.74:1 (dark) against the page background, clearing the 3:1 WCAG 1.4.11 minimum.
- **Bg Dark** (`{colors.bg-dark}` — `oklch(20% 0.03 230)`): panel background, dark theme.
- **Surface Dark** (`{colors.surface-dark}` — `oklch(30% 0.025 230)`): dark-theme equivalent of `{colors.surface}`.
- **Ink On Dark** (`{colors.ink-on-dark}` — `oklch(95% 0.012 230)`): primary text, dark theme — a distinct token from Ink, not the same value reused, because a literal dark-mode "invert the background color for text" mistake would fail contrast.
- **Text Secondary On Dark** (`{colors.text-secondary-on-dark}` — `oklch(68% 0.022 230)`): secondary text, dark theme.
- **Border Dark** (`{colors.border-dark}` — `oklch(40% 0.025 230)`): dividers and outlines, dark theme.

### Named Rules
**The Two-Accent Rule.** Exactly two functional hues exist in this system: Accent (teal, primary commitment) and Accent Secondary (forest green, secondary/lower-commitment actions). No third hue is introduced without a real semantic need (e.g. a true error/success state) — this replaced an earlier No-Hue Rule after the all-graphite version was assessed as reading bland and unfinished rather than quietly confident. The constraint that survives from the old rule: color still never carries a meaning that copy and position don't already carry redundantly (error state is still weight, not red), and an interactive element's color always maps to exactly one of the two roles above — never decoration, never a third one-off hue.

**The System Font Rule.** Font family is always `-apple-system, Segoe UI, Roboto, system-ui, sans-serif` — never a bundled web font. On macOS and iOS Safari this resolves to San Francisco, matching Apple HIG's preference for the system font family over a custom one in a small, utility-scoped surface like this.

## 3. Typography

**Display Font:** System UI sans (`-apple-system, "Segoe UI", Roboto, system-ui, sans-serif`)
**Body Font:** Same stack — one family throughout
**Label/Mono Font:** Not used. No technical/mono surface exists yet (relevance scores and timestamps are plain text); add one only if a genuinely technical display (raw API output) is introduced.

**Character:** One system sans family. No licensed display face the way Airtable runs Haas Groot Disp — this is infrastructure, and the system font is the HIG-aligned, zero-load-time, zero-licensing choice for it.

### Hierarchy
- **Display** (`{typography.display}` — 600, 1.125rem/1.3): panel/page title ("Research Companion", "Research Companion Settings"). Only two display instances exist in the whole app — there is no headline ladder above it.
- **Headline** (`{typography.headline}` — 600, 0.9375rem/1.4): section headers ("History", fieldset legends).
- **Title** (`{typography.title}` — 500, 0.875rem/1.4): result titles, button labels, form field group labels.
- **Body** (`{typography.body}` — 400, 0.8125rem/1.5, max 70ch): result snippets, relevance notes, form helper text, history-row labels.
- **Label** (`{typography.label}` — 500, 0.6875rem/1.4, 0.04em letter-spacing, uppercase): status labels ("Reading page...", "Searching..."), the autosave "Saved" confirmation.

### Named Rules
**The One Family Rule.** Every weight and size comes from the system sans's own scale. No secondary or mono family is introduced unless a genuinely technical surface requires it.

**The Rem, Not Px Rule.** All `typography.*` font sizes are expressed in `rem`, never `px`. A side panel that ships fixed-px type breaks the moment a user has increased their browser's default font size — the direct web equivalent of Apple HIG's "support Dynamic Type" requirement. Spacing and radius tokens stay in `px` deliberately; only type scales with the user's text-size preference.

## 4. Elevation

Flat by default. The interface conveys depth through background-tone steps (`{colors.bg}` → `{colors.surface}`, divided by `{colors.border}`) rather than shadows, matching the "show state, not noise" principle from PRODUCT.md. A single soft shadow is permitted only for the settings page's transient autosave confirmation, since it's the one element that briefly floats above the form rather than sitting in the layout flow.

### Shadow Vocabulary
- **Toast Float** (`box-shadow: 0 2px 8px oklch(27.1% 0.036 229.8 / 0.12)`, dark: `0 2px 8px oklch(0% 0 0 / 0.4)`): reserved for the transient "Saved" confirmation, which now renders as a real lifted chip (background, radius, this shadow) rather than bare fading text.

### Named Rules
**The Flat-By-Default Rule.** Panels, list items, and buttons never carry a shadow at rest. Shadow is reserved for the one floating, temporary element in the system.

## 5. Components

Buttons, inputs, and list rows feel like infrastructure: legible, low-friction, no decorative flourish. Every interactive element gets a visible `:focus-visible` ring (`outline: 2px solid {colors.focus-ring}`, offset 2px) since the side panel must remain fully keyboard-navigable — this is also the system's other direct HIG alignment point, since Apple's guidance is explicit that focus must always be visible, not just implied by browser default.

### Buttons
- **Shape:** 6px radius (`{rounded.sm}`)
- **Primary** (`{component.button-primary}`): Accent background, Bg text, Title-weight label, horizontal padding 16px, **height 44px** (not just padding-derived — `min-height` is set explicitly so the touch target holds regardless of font-size changes). Used for "Retry" and "Connect to OpenRouter" — the only two true actions in the app.
- **Hover / Focus:** opacity drops to 0.85 on hover (a deliberate intensity shift on the one filled-color surface in the system, not a hue change); `:focus-visible` shows the standard 2px Accent ring; transitions are 150ms `ease-out-quart` on opacity only.
- **Secondary / Ghost** (`{component.key-toggle}`): transparent background, `{colors.accent-secondary}` outline and text (replacing the old neutral `{colors.border-strong}`/`{colors.text-secondary}` pairing — secondary actions now carry their own hue, distinct from Accent, rather than reading as merely "less important"), same 44px height as primary. The "Show"/"Hide" reveal toggle and the in-progress **Cancel** button (`.cancel-button`, identical treatment) both use this style. Hover promotes both border and text to full Ink (`{colors.text}`) — the same "promote toward full commitment" pattern history-row hover already used.

### Cards / Containers
- **Corner Style:** 8px radius (`{rounded.md}`) on result cards.
- **Background:** `{colors.surface}` (light) / `{colors.surface-dark}` (dark) — one step lighter than the page background.
- **Shadow Strategy:** none — see Elevation.
- **Border:** 1px `{colors.border}` / `{colors.border-dark}`.
- **Internal Padding:** 12px vertical, 16px horizontal.

### Inputs / Fields
- **Style** (`{component.text-input}`): `{colors.surface}` background, no border at rest, **explicit height of 44px** (not auto-derived from padding + line-height, to keep the target stable across font-size changes) — this mirrors how Airtable's own `text-input` spec hard-codes height rather than relying on padding math.
- **Focus** (`{component.text-input-focus}`): the standard global `:focus-visible` 2px Accent ring applies (same as every button and history row — there is one focus treatment system-wide, not a per-component exception), plus a border-color shift to `{colors.accent}` as a bonus detail specific to inputs, 150ms transition — both the ring and the border shift now point at the same color, where an earlier pass let them drift to two different tones (ink vs. ink) and audit flagged the mismatch once Accent existed as a separate token.
- **Error / Disabled:** error text uses full Ink at Title weight (`{typography.title}`, not Body) so it reads slightly heavier than ambient copy without a separate red hue — weight still carries this distinction, not color, even though the system now has two accent hues elsewhere. Applies to the side panel's `.error` state today; settings-form inline field errors aren't built yet (see Known Gaps). Disabled buttons (`button:disabled`, global rule) drop to 50% opacity and disable pointer events — real now, not spec-ahead-of-implementation: Retry disables itself on click, the OpenRouter connect button disables for the duration of its OAuth round-trip, both to prevent double-submission.
- **Secret fields** (the four password-type API key inputs): always paired with a `{component.key-toggle}` reveal button, never shown bare. A `.field-hint` (Label-style, `{colors.text-secondary}`) sits above the API-keys fieldset stating the storage/transmission promise in plain language — restraint in visual style does not mean omitting the trust signals a credentials form specifically needs.
- **Key format warning** (`.key-warning`): on blur, each provider key field checks its value against that provider's known prefix (`sk-ant-` for Anthropic, `sk-` for OpenAI, `AIza` for Gemini) via `getApiKeyFormatWarning`, and shows a Title-weight inline message if it doesn't match. Advisory only — wrong-looking keys still save; this catches an obvious paste mistake without gatekeeping a key the format check doesn't recognize (proxies, future key formats).
- **Progressive disclosure:** on the settings page, all four provider-specific fields (`.key-field`, one per provider — including OpenRouter's sign-in button, folded into the same disclosure system rather than living in its own always-visible fieldset) only ever show the one matching the currently selected provider; all four hide when no provider is selected. This is enforced in code (`syncKeyFieldVisibility`), not just a visual convention — don't reintroduce a flat, always-visible list of all provider options.
- **Active provider label** (`.active-provider`, Label style): shown above results only when more than one provider/token is actually configured (`countConfiguredProviders(settings) > 1`) — a single-provider setup never needs to be told which provider it's using, so the label stays out of the way until ambiguity is real.

### Navigation
- The side panel has no persistent nav chrome — content (status line, results, history) is the navigation. The options page uses simple stacked fieldsets, no tabs or sidebar. `manifest.json`'s `options_page` key opens it as a full browser tab, not a constrained popup, so its vertical rhythm doesn't need to fit inside a short viewport — this is by design, not an oversight, if the page ever needs to scroll on a small display.

### Status Line (signature component)
The single-line state indicator ("Reading page...", "Searching...", "Ranking results...") is the system's signature element. It renders as Label-style text in `{colors.text-secondary}`, left-aligned, no spinner icon or animated dots, inside a `.status-row` that also holds the Cancel button (see below). It fades in over 200ms on appearance — the system's only "Responsive" (not choreographed) motion instance in the side panel.

### Cancel Button (`.cancel-button`)
Sits beside the status label in `.status-row`, same ghost-button treatment as `{component.key-toggle}`. Honest about what it actually does: clicking it during "Reading page..." is a **true abort** (the extraction wait is fully under this codebase's control, so the wait stops immediately). Clicking it during "Searching..." or "Ranking results..." is a **soft cancel** — the in-flight LLM/search request isn't aborted at the network level (those modules don't accept a signal today), but the panel stops waiting on it, discards the result when it eventually arrives, and never writes it to history. The user-visible effect is the same either way (the panel returns to neutral immediately); the distinction matters only for whoever next touches this code, so it's written here rather than left to be rediscovered. The container gets `aria-busy="true"` while a search is running and it's cleared by every terminal render function, so a screen reader always knows whether the region is still working.

### History Row (`{component.history-row}`)
Each row is a real `<button>` inside the `<li>`, not a click handler on a bare list item — this is a deliberate accessibility commitment, not incidental markup, after a critique found history was the one fully keyboard-inaccessible surface in the app. 44px-tall, full-bleed click target (not just the text), with a `title` attribute carrying the full (possibly truncated) source-page title for recovery on hover/screen readers. Default state sits flush with the page background and uses `{colors.text-secondary}` — quieter than a result card on purpose, since history is a secondary, lower-commitment surface. Hover/focus state (`{component.history-row-hover}`) promotes to `{colors.surface}` background and `{colors.ink}` text, the same visual promotion a result card already has at rest, and is reachable via Tab + Enter/Space like any native button. Empty state ("No history yet") reuses the row shape but stays a plain `<li>` with no button inside — it isn't a real row.

### Empty / Terminal States (`.empty-state`)
"No similar results found" and "Couldn't find readable content on this page" use Body-weight sentence case, deliberately distinct from the uppercase Label-weight `.status` used for in-progress states ("Reading page...", "Searching..."). The distinction exists so a user can tell, by styling alone, whether a search has concluded or is still running — collapsing both into one visual register was a critique finding, not a stylistic accident to preserve.

### Relevance Label (`.relevance-label`)
A small uppercase "Why this:" lead-in inside each result card's relevance note (`{typography.label}` weight 600, colored `{colors.accent}`, not a new component, just the existing Label role at its heavier end plus the system's one accent color). Added after a critique found the relevance note read as an unlabeled second snippet rather than the deliberate "why this result matched" explanation PRODUCT.md positions as the product's core trust signal; the accent color was added later so the lead-in is unmistakable even at a glance, not just on close reading.

### Friendly Error Messages (`toFriendlyErrorMessage`)
Raw provider/pipeline errors (`Anthropic API error: 401`, `Brave Search API error: 429`, `No API key/token configured for provider: openai`) are mapped to plain-language equivalents before reaching `.error` — "Your API key was rejected. Check it in Settings," "Rate limited by the provider. Try again in a moment," "Finish setting up your provider and API key in Settings." Anything unrecognized (including the extraction-timeout message) passes through unchanged. This exists so a 401 from whichever provider is configured doesn't surface as a raw status-code string inside an otherwise plain-language system — the error path already existed (`main.js` wraps the whole pipeline in try/catch into the existing Retry UI); this only normalizes what shows up inside it.

## 6. Do's and Don'ts

### Do:
- **Do** keep the palette graphite-teal at rest; let layout and type weight carry most of the hierarchy, with Accent/Accent Secondary reserved for the two roles defined above.
- **Do** use Responsive motion only — fades and transitions tied directly to a state change, never a looping or decorative animation.
- **Do** give every interactive element a visible `:focus-visible` state; this panel must be fully keyboard-usable.
- **Do** follow the user's system/browser theme (light/dark) rather than forcing one.
- **Do** keep every clickable row, button, and input at a 44px minimum height — set explicitly, not left to padding math.
- **Do** size all type in `rem`, never `px`.

### Don't:
- **Don't** introduce a third hue beyond Accent and Accent Secondary without a real semantic need (e.g. an actual error/success state) — two is the budget, not a floor to build on.
- **Don't** use Accent or Accent Secondary decoratively — every appearance must map to "primary action" or "secondary action," never used just because a spot looks bland.
- **Don't** build chatbot-style UI: no avatar bubbles, no "thinking..." personality copy, no conversational filler.
- **Don't** build content-farm-style result cards: no bright thumbnails, no urgency framing, no clickbait-style copy.
- **Don't** add shadows to panels, list items, or buttons at rest — flat by default, per the Flat-By-Default Rule.
- **Don't** add anything (animation, color, copy) that visually competes with the host webpage the user is reading.
- **Don't** bundle a web font. The system font stack is the deliberate choice, not a placeholder.
- **Don't** let a button or row's tap target shrink below 44px just because the content is short — pad or set height explicitly.

## 7. Logo & Icon

**Mark: Linked Nodes.** Two circles joined by a single diagonal line — the smaller, neutral circle (`{colors.ink-on-dark}`) sits lower-left as "the page you're reading," connected by an `{colors.accent-dark}` line to a larger accent-colored circle upper-right, "the related result Research Companion found." The mark is a literal, restrained diagram of the product's one job, not a borrowed search/document/lamp glyph — it earns its abstraction from the product mechanic itself rather than from decoration.

Rendered on a 28px-radius rounded square of `{colors.bg-dark}` (`oklch(20% 0.03 230)`), at all three required extension sizes (16/48/128px), with stroke and node radii scaled up slightly at the smallest size (8px stroke, 16px node radius at the 128 viewBox) so the connection survives toolbar-scale rendering — a thinner line and smaller dots were tested and failed to read at 16px.

Source files: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`. No separate light-mode icon exists — Chrome's toolbar icon is single-state, so the dark-background treatment is canonical regardless of the panel's own light/dark theme.

### Named Rule

**The Two-Node Rule.** The mark always shows exactly two nodes (one origin, one result) and one connecting line. A third node was prototyped and rejected — it survived at 128px but collapsed into visual noise at 16px, and "exactly one match" is a truer reflection of "a result worth clicking" (PRODUCT.md's stated success condition) than "many matches" would be.

## Known Gaps

- The format check on key fields (`getApiKeyFormatWarning`) remains advisory-only by design — it can't catch every wrong key, only obviously mis-shaped ones (wrong prefix, embedded whitespace).
- Settings autosave still only writes to `chrome.storage.local` — there's no export/import or sync-across-devices story, since this is a single-device, single-profile tool today.

### Resolved

- ~~Secret fields re-populated with the literal stored value on every options-page load.~~ `renderSettingsToForm` now leaves key fields blank with a `Saved, ending in ****1234` placeholder (`maskedKeyPlaceholder`); a blank field on save falls back to the previously stored value (`gatherSettingsFromForm`'s `keyValueOrStored`) so leaving a field untouched no longer wipes the saved key. Trade-off: there is no way to re-view a saved key in full through the extension once it scrolls out of the input — only a freshly typed replacement is ever shown.
- ~~Cancel during "Searching..."/"Ranking results..." was a soft cancel, not a true network abort.~~ The existing `AbortSignal` (already threaded through extraction) now also reaches the LLM and search `fetch()` calls (`anthropic.js`, `openai.js`, `gemini.js`, `openrouter.js`, `search/brave.js`), so Cancel now aborts the in-flight network request instead of just discarding its result.
