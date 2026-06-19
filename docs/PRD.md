# PRD: Research Companion Chrome Extension

**Status:** Approved for planning
**Date:** 2026-06-20

## Problem

When reading an article, report, or blog post, finding related coverage, alternate perspectives, or source material means manually crafting search queries and sifting through results. This breaks reading flow and is repetitive.

## Goal

A Chrome extension that, on demand, looks at the page you're currently reading and surfaces similar webpages, reports, and articles on the same topic — each with a short note on why it's relevant — without leaving the page.

## Non-goals (v1)

- No personal embeddings index over a saved corpus (e.g. your own bookmarks/Zotero library). That's a separable, larger system and out of scope for v1.
- No automatic/background triggering — v1 is manual, on-demand only.
- No backend server. Fully client-side; you bring your own API keys/connections.
- No cross-device sync of history or settings (local to the browser profile only).
- No browser support beyond Chrome (Manifest V3).

## Users

Primarily the author (single-user tool), built for personal research workflows: reading news, reports, technical articles, and wanting quick lateral discovery of related material.

## Core user story

> While reading an article, I click the extension icon. A side panel opens showing 5-10 similar articles/reports, each with title, source, snippet, and a one-line explanation of why it's related to what I'm reading. I can click through to any of them, and revisit past sessions later from a history list.

## Features (v1)

1. **On-demand analysis** — click the toolbar icon to analyze the current page (no auto-run).
2. **Topic-aware discovery** — the page's full readable text is used (not just title/meta) to understand its topic and generate search queries.
3. **Web-wide search** — results come from the open web via a search API, not a fixed/curated corpus.
4. **Relevance explanations** — each suggested result includes a short LLM-written note on why it's relevant to the source page.
5. **Side panel UI** — results display in Chrome's native side panel, staying open alongside the page being read.
6. **Multi-provider LLM support** — Anthropic, OpenAI, Gemini (API key), and OpenRouter (OAuth "Connect", no key pasting required).
7. **Local history** — past research sessions (source page + results) are saved locally and revisitable; capped at the last 50 sessions.
8. **Settings page** — connect/manage LLM provider and Brave Search API key.

## Success criteria

- From clicking the icon to seeing results takes a reasonable amount of time for a multi-API-call pipeline (LLM call + search call + LLM rerank) — no artificial blocking, but no expectation of sub-second response.
- Results are topically relevant to the source page more often than not, when tested manually against a handful of real articles spanning news, blog, and report-style content.
- Works without any backend: a user with their own API keys (or an OpenRouter connection) can install and use it end-to-end.
- Gracefully handles pages with no extractable content (PDFs, paywalled stubs, app shells) without crashing or showing a confusing error.

## Open questions / future ideas (not v1)

- Personal embeddings index over a saved/curated corpus (v2 candidate).
- Auto-trigger on dwell time instead of manual click.
- Domain blocklist/allowlist in settings.
- Export history or individual sessions.
