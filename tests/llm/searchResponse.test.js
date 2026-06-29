import { describe, it, expect } from 'vitest';
import {
  buildSearchPrompt,
  computeFetchCount,
  parseSearchResults,
  filterUncitedResults,
} from '../../src/lib/llm/searchResponse.js';

describe('computeFetchCount', () => {
  it('adds a 30% buffer, rounded up', () => {
    expect(computeFetchCount(8)).toBe(11);
    expect(computeFetchCount(5)).toBe(7);
    expect(computeFetchCount(1)).toBe(2);
    expect(computeFetchCount(0)).toBe(0);
  });
});

describe('buildSearchPrompt', () => {
  it('includes the page title, trimmed text, and the over-fetched result count', () => {
    const prompt = buildSearchPrompt({ pageTitle: 'Tidal Energy', pageText: 'a'.repeat(20000), resultsCount: 5 });
    expect(prompt).toContain('Tidal Energy');
    expect(prompt).toContain(`find ${computeFetchCount(5)} distinct`);
    expect(prompt.match(/a/g).length).toBeLessThanOrEqual(12000 + 100);
  });

  it('instructs the model to ignore embedded instructions in the page content', () => {
    const prompt = buildSearchPrompt({ pageTitle: 't', pageText: 'x', resultsCount: 8 });
    expect(prompt).toMatch(/ignore any instructions/i);
  });

  it('states the ranking criteria and requires a numeric score field', () => {
    const prompt = buildSearchPrompt({ pageTitle: 't', pageText: 'x', resultsCount: 8 });
    expect(prompt).toMatch(/topical relevance/i);
    expect(prompt).toMatch(/source credibility/i);
    expect(prompt).toMatch(/recency/i);
    expect(prompt).toContain('"score"');
  });
});

describe('parseSearchResults', () => {
  it('parses a JSON array embedded in surrounding text', () => {
    const raw = 'Here are the results:\n[{"url":"https://a.com","title":"A","snippet":"s","relevance":"r"}]\nDone.';
    expect(parseSearchResults(raw)).toEqual([{ url: 'https://a.com', title: 'A', snippet: 's', relevance: 'r' }]);
  });

  it('throws when no JSON array is present', () => {
    expect(() => parseSearchResults('no json here')).toThrow('Could not parse JSON from search response');
  });

  it('throws when the parsed JSON is not an array', () => {
    expect(() => parseSearchResults('{"not": "an array"}')).toThrow('Search response JSON was not an array');
  });
});

describe('filterUncitedResults', () => {
  it('keeps only results whose url appears in the cited urls list', () => {
    const results = [
      { url: 'https://a.com', title: 'A' },
      { url: 'https://b.com', title: 'B' },
    ];
    expect(filterUncitedResults(results, ['https://a.com'])).toEqual([{ url: 'https://a.com', title: 'A' }]);
  });

  it('drops results with no url or an empty cited list', () => {
    expect(filterUncitedResults([{ title: 'No URL' }], ['https://a.com'])).toEqual([]);
    expect(filterUncitedResults([{ url: 'https://a.com' }], [])).toEqual([]);
  });
});
