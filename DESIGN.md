---
name: Research Companion
description: A quiet side-panel tool that surfaces related reading without competing for attention

colors:
  ink: "oklch(25% 0.01 250)"
  ink-on-dark: "oklch(95% 0.006 250)"
  text-secondary: "oklch(50% 0.01 250)"
  text-secondary-on-dark: "oklch(68% 0.01 250)"
  bg: "oklch(98% 0.005 250)"
  bg-dark: "oklch(18% 0.008 250)"
  surface: "oklch(94% 0.006 250)"
  surface-dark: "oklch(30% 0.008 250)"
  border: "oklch(85% 0.006 250)"
  border-dark: "oklch(38% 0.01 250)"
  border-strong: "oklch(60% 0.006 250)"
  border-strong-dark: "oklch(55% 0.01 250)"
  focus-ring: "oklch(25% 0.01 250)"
  focus-ring-dark: "oklch(95% 0.006 250)"

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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
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

A reading lamp doesn't decorate the desk, it lights the page. Research Companion sits beside whatever the user is already reading, surfaces a short, well-ranked list of related material, and disappears the moment it's not needed. The system draws from Notion, Readwise, and 1Password: quiet utility chrome, generous whitespace, warmth without ornament, and a near-total absence of accent color outside functional moments (links, focus rings, active states).

Unlike most "design systems," there is no signature color move here — no Airtable-style full-bleed coral card, no brand-voltage moment. That absence is deliberate: this is infrastructure beside someone else's content, not a destination of its own. The one place this system *does* spend effort that's easy to skip is touch-target and type-scaling discipline (`{component.button-primary}`, `{component.history-row}`, `{component.text-input}` all hold a 44px minimum), because a side panel this narrow has no room for a second chance at a mis-tap.

This system explicitly rejects the AI-chatbot register (bubble avatars, personality-driven "thinking..." copy, conversational filler) and the content-farm recommendation-widget register (bright thumbnails, urgency framing, "you won't believe" energy). It also rejects anything that visually competes with the host webpage the user is reading.

**Key Characteristics:**
- Near-neutral graphite palette; color is structural, not decorative — there is no accent hue at all, not even a quiet one
- Single system sans (resolves to San Francisco on macOS/iOS Safari, Segoe UI on Windows) at `rem` sizes so browser zoom and OS text-size settings scale the panel correctly
- Responsive, not choreographed, motion — feedback without performance
- Flat by default; depth comes from spacing and tone, not shadows
- Every clickable row or control holds a 44×44px minimum target, even though this is a desktop-first extension

## 2. Colors

A restrained, near-monochrome palette. Neutrals carry almost all the surface; the "accent" is a slightly deeper or lighter step of the same neutral ramp rather than a separate hue, reserved for focus rings, active states, and links. Unlike a marketing system that earns visual interest through a signature palette, this system earns trust through *not* introducing one — the host page the user is reading supplies all the color in view.

### Primary
- **Ink** (`{colors.ink}` — `oklch(25% 0.01 250)`): primary text, history-row hover text, primary button background. Doubles as the "primary action" color and the body-text color — there's no separate brand color sitting on top of the text color, because the system has no brand color.

### Neutral
- **Bg** (`{colors.bg}` — `oklch(98% 0.005 250)`): app background, panel background, default history-row background (light theme).
- **Surface** (`{colors.surface}` — `oklch(94% 0.006 250)`): one step up from Bg — result-card background, input background, history-row hover background.
- **Text Secondary** (`{colors.text-secondary}` — `oklch(50% 0.01 250)`): secondary text, placeholder text, relevance-note copy, default (non-hover) history-row text. Tuned to 50% L (not the 55% an earlier pass shipped) so snippet/relevance text inside result cards clears 4.5:1 against `{colors.surface}` — measured at 55% it landed at 4.07:1, a real WCAG AA failure caught by audit, not by visual critique.
- **Border** (`{colors.border}` — `oklch(85% 0.006 250)`): dividers between header/results/history, result-card outline, the hairline under relevance notes. These are decorative dividers or borders backed by a fill-color difference from their surroundings (the result card's `{colors.surface}` against the page `{colors.bg}`), so they aren't required to hit WCAG 1.4.11's 3:1 non-text contrast minimum, and at 1.49:1 (light) / 1.88:1 (dark) against the page background, they don't.
- **Border Strong** (`{colors.border-strong}` — `oklch(60% 0.006 250)`, dark: `{colors.border-strong-dark}` — `oklch(55% 0.01 250)`): for borders that are the *sole* indicator of an element's boundary, with no fill-color difference behind them. Currently only `{component.key-toggle}`'s border — audit caught that it relied on `{colors.border}` at 1.49:1/1.88:1, well under the 3:1 WCAG 1.4.11 requires when a border is load-bearing for perceiving a clickable boundary. `border-strong` measures 3.73:1 (light) / 3.88:1 (dark) against the page background.
- **Bg Dark** (`{colors.bg-dark}` — `oklch(18% 0.008 250)`): panel background, dark theme.
- **Surface Dark** (`{colors.surface-dark}` — `oklch(30% 0.008 250)`): dark-theme equivalent of `{colors.surface}`.
- **Ink On Dark** (`{colors.ink-on-dark}` — `oklch(95% 0.006 250)`): primary text, dark theme — the inverse of Ink, not the same token reused, because a literal dark-mode "invert the background color for text" mistake would fail contrast.
- **Text Secondary On Dark** (`{colors.text-secondary-on-dark}` — `oklch(68% 0.01 250)`): secondary text, dark theme.
- **Border Dark** (`{colors.border-dark}` — `oklch(38% 0.01 250)`): dividers and outlines, dark theme.

### Named Rules
**The No-Hue Rule.** No saturated hue appears anywhere in the interface at rest. The only color signal is lightness contrast within the graphite ramp. If a future change reaches for blue or teal "to make it pop," that's the wrong move — legibility and spacing carry the hierarchy instead. This is also the system's HIG alignment point on color: per Apple's guidance to never rely on color alone to carry meaning, every state in this system (error, empty, setup-prompt) is already differentiated by copy and position, not hue — so adding color later would be decoration, never the only signal.

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
- **Toast Float** (`box-shadow: 0 2px 8px oklch(25% 0.01 250 / 0.12)`, dark: `0 2px 8px oklch(0% 0 0 / 0.4)`): reserved for the transient "Saved" confirmation, which now renders as a real lifted chip (background, radius, this shadow) rather than bare fading text.

### Named Rules
**The Flat-By-Default Rule.** Panels, list items, and buttons never carry a shadow at rest. Shadow is reserved for the one floating, temporary element in the system.

## 5. Components

Buttons, inputs, and list rows feel like infrastructure: legible, low-friction, no decorative flourish. Every interactive element gets a visible `:focus-visible` ring (`outline: 2px solid {colors.focus-ring}`, offset 2px) since the side panel must remain fully keyboard-navigable — this is also the system's other direct HIG alignment point, since Apple's guidance is explicit that focus must always be visible, not just implied by browser default.

### Buttons
- **Shape:** 6px radius (`{rounded.sm}`)
- **Primary** (`{component.button-primary}`): Ink background, Bg text, Title-weight label, horizontal padding 16px, **height 44px** (not just padding-derived — `min-height` is set explicitly so the touch target holds regardless of font-size changes). Used for "Retry" and "Connect to OpenRouter" — the only two true actions in the app.
- **Hover / Focus:** opacity drops to 0.85 on hover (no color shift, since the system has only one ink tone to shift to); `:focus-visible` shows the standard 2px ring; transitions are 150ms `ease-out-quart` on opacity only.
- **Secondary / Ghost** (`{component.key-toggle}`): transparent background, `{colors.border-strong}` outline (not the decorative `{colors.border}` — this border is the button's only boundary cue, see Colors), `{colors.text-secondary}` text, same 44px height as primary. The "Show"/"Hide" reveal toggle and the in-progress **Cancel** button (`.cancel-button`, identical treatment) both use this style — a second action sits beside the primary as an outline, not a second filled button.

### Cards / Containers
- **Corner Style:** 8px radius (`{rounded.md}`) on result cards.
- **Background:** `{colors.surface}` (light) / `{colors.surface-dark}` (dark) — one step lighter than the page background.
- **Shadow Strategy:** none — see Elevation.
- **Border:** 1px `{colors.border}` / `{colors.border-dark}`.
- **Internal Padding:** 12px vertical, 16px horizontal.

### Inputs / Fields
- **Style** (`{component.text-input}`): `{colors.surface}` background, no border at rest, **explicit height of 44px** (not auto-derived from padding + line-height, to keep the target stable across font-size changes) — this mirrors how Airtable's own `text-input` spec hard-codes height rather than relying on padding math.
- **Focus** (`{component.text-input-focus}`): the standard global `:focus-visible` 2px ring applies (same as every button and history row — there is one focus treatment system-wide, not a per-component exception), plus a border-color shift to `{colors.ink}` / `{colors.ink-on-dark}` as a bonus detail specific to inputs, 150ms transition. An earlier pass suppressed the global ring here (`outline: none`) and relied on the border shift alone; audit caught the inconsistency and it was removed.
- **Error / Disabled:** error text uses full Ink at Title weight (`{typography.title}`, not Body) so it reads slightly heavier than ambient copy without a separate red hue (per the No-Hue Rule) — weight carries the distinction color isn't allowed to. Applies to the side panel's `.error` state today; settings-form inline field errors aren't built yet (see Known Gaps). Disabled buttons (`button:disabled`, global rule) drop to 50% opacity and disable pointer events — real now, not spec-ahead-of-implementation: Retry disables itself on click, the OpenRouter connect button disables for the duration of its OAuth round-trip, both to prevent double-submission.
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
A small uppercase "Why this:" lead-in inside each result card's relevance note (`{typography.label}` weight 600, not a new component, just the existing Label role at its heavier end). Added after a critique found the relevance note read as an unlabeled second snippet rather than the deliberate "why this result matched" explanation PRODUCT.md positions as the product's core trust signal — without it, a first-time user has no way to tell the relevance note apart from ordinary body copy except by inferring the pattern from repeated use.

### Friendly Error Messages (`toFriendlyErrorMessage`)
Raw provider/pipeline errors (`Anthropic API error: 401`, `Brave Search API error: 429`, `No API key/token configured for provider: openai`) are mapped to plain-language equivalents before reaching `.error` — "Your API key was rejected. Check it in Settings," "Rate limited by the provider. Try again in a moment," "Finish setting up your provider and API key in Settings." Anything unrecognized (including the extraction-timeout message) passes through unchanged. This exists so a 401 from whichever provider is configured doesn't surface as a raw status-code string inside an otherwise plain-language system — the error path already existed (`main.js` wraps the whole pipeline in try/catch into the existing Retry UI); this only normalizes what shows up inside it.

## 6. Do's and Don'ts

### Do:
- **Do** keep the palette near-monochrome graphite; let layout and type weight carry hierarchy.
- **Do** use Responsive motion only — fades and transitions tied directly to a state change, never a looping or decorative animation.
- **Do** give every interactive element a visible `:focus-visible` state; this panel must be fully keyboard-usable.
- **Do** follow the user's system/browser theme (light/dark) rather than forcing one.
- **Do** keep every clickable row, button, and input at a 44px minimum height — set explicitly, not left to padding math.
- **Do** size all type in `rem`, never `px`.

### Don't:
- **Don't** introduce a saturated accent hue (blue, teal, or otherwise) — violates the No-Hue Rule.
- **Don't** build chatbot-style UI: no avatar bubbles, no "thinking..." personality copy, no conversational filler.
- **Don't** build content-farm-style result cards: no bright thumbnails, no urgency framing, no clickbait-style copy.
- **Don't** add shadows to panels, list items, or buttons at rest — flat by default, per the Flat-By-Default Rule.
- **Don't** add anything (animation, color, copy) that visually competes with the host webpage the user is reading.
- **Don't** bundle a web font. The system font stack is the deliberate choice, not a placeholder.
- **Don't** let a button or row's tap target shrink below 44px just because the content is short — pad or set height explicitly.

## Known Gaps

- Secret fields show a reveal toggle, a storage/transmission hint, and a format warning on blur, but settings are still re-populated with the literal stored value on every options-page load rather than a masked "saved, ending in ****1234" representation. The current state addresses verifiability (you can always see what you typed) and obvious paste mistakes (wrong-prefix warning); it does not add masked-by-default re-display, and the format check is advisory-only by design — it can't catch every wrong key, only obviously mis-shaped ones.
- Cancel during "Searching..."/"Ranking results..." is a soft cancel, not a true network abort (see the Cancel Button entry in Components) — the LLM and search provider modules don't accept an abort signal today. Threading real cancellation through `llm/*.js` and `search/brave.js` would close this gap but touches modules outside this design system's surface; the current behavior is correct from the user's perspective, just not literally instantaneous on the network side.
