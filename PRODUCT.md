# Product

## Register

product

## Users

Researchers and students deep in an article, paper, or blog post. They open the side panel mid-read, expect related material fast, and want to get back to what they were reading. Low tolerance for friction or anything that competes for attention with the page they're already on.

## Product Purpose

A Chrome extension that reads the page you're on and surfaces similar webpages, reports, and articles via the side panel. Core loop: open panel → page is read → search runs → ranked results appear with a relevance note → click through or keep reading. History persists past lookups so re-opening the panel doesn't repeat work or network calls. Success looks like: a result worth clicking, found before the user's attention drifts.

## Brand Personality

Quiet, precise, technical. A calm utility that gets out of the way — closer to Linear or Raycast than a chatbot or content discovery widget. Confidence is shown through restraint and clear states (reading, searching, ranking, done, error), not through flourishes.

## Anti-references

- Generic AI chatbot UI (bubble avatars, "thinking..." spinners with personality, conversational filler)
- Content-farm / clickbait recommendation widgets ("You won't believe...")
- Marketing-style upsell modals or nags inside a utility surface
- Anything that visually competes with the host webpage for attention

## Design Principles

- Respect reading flow — the panel supports the page, never interrupts it
- Show state, not noise — reading/searching/ranking/error states must be legible at a glance, no decorative loading
- Earn trust through restraint — relevance notes and results speak for themselves, no persuasive styling
- Settings are infrastructure, not a feature — the options page should be fast to scan and configure, not a showcase

## Accessibility & Inclusion

- WCAG AA contrast minimum across light and dark themes
- Follow the user's system/browser theme preference (light/dark), no forced default
- Respect `prefers-reduced-motion`
