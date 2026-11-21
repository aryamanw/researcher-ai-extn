import { it, expect } from 'vitest';
import { PROVIDERS } from '../../src/lib/providers/registry.js';
import { CITATION_EXTRACTORS, filterToCited } from '../../src/lib/providers/citations.js';

it('anthropic-blocks joins text blocks and reads web_search_tool_result urls', () => {
  const data = {
    content: [
      { type: 'text', text: 'Hello ' },
      { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://a.com/1' }, { url: 'https://b.com/2' }] },
      { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'x' } },
      { type: 'text', text: 'world' },
    ],
  };
  expect(CITATION_EXTRACTORS['anthropic-blocks'](data)).toEqual({
    text: 'Hello world', citedUrls: ['https://a.com/1', 'https://b.com/2'], citedHosts: [],
  });
});

it('responses-annotations reads url_citation annotations of the message output_text', () => {
  const data = {
    output: [
      { type: 'web_search_call' },
      { type: 'message', content: [{ type: 'output_text', text: 'Answer', annotations: [
        { type: 'url_citation', url: 'https://a.com/1', title: '1' },
        { type: 'other', url: 'https://no.com' },
      ] }] },
    ],
  };
  expect(CITATION_EXTRACTORS['responses-annotations'](data)).toEqual({
    text: 'Answer', citedUrls: ['https://a.com/1'], citedHosts: [],
  });
});

it('responses-sources reads web_search_call action sources and message text', () => {
  const data = {
    output: [
      { type: 'web_search_call', action: { sources: [{ type: 'url', url: 'https://k.com/1', title: 't' }, { url: 'https://k.com/2' }] } },
      { type: 'reasoning' },
      { type: 'message', content: [{ type: 'output_text', text: 'Kimi answer' }] },
    ],
  };
  expect(CITATION_EXTRACTORS['responses-sources'](data)).toEqual({
    text: 'Kimi answer', citedUrls: ['https://k.com/1', 'https://k.com/2'], citedHosts: [],
  });
});

it('chat-annotations and openrouter-annotations read message.annotations url_citation.url', () => {
  const data = { choices: [{ message: { content: 'Chat', annotations: [
    { type: 'url_citation', url_citation: { url: 'https://o.com/1', title: 'x' } },
    { type: 'file', url_citation: { url: 'https://no.com' } },
  ] } }] };
  const expected = { text: 'Chat', citedUrls: ['https://o.com/1'], citedHosts: [] };
  expect(CITATION_EXTRACTORS['openrouter-annotations'](data)).toEqual(expected);
  expect(CITATION_EXTRACTORS['chat-annotations'](data)).toEqual(expected);
});

it('gemini-grounding joins parts and returns chunk uris plus lowercased www-stripped title hosts', () => {
  const data = { candidates: [{
    content: { parts: [{ text: 'Gem' }, { text: 'ini' }] },
    groundingMetadata: { groundingChunks: [
      { web: { uri: 'https://vertexaisearch.cloud.google.com/r/1', title: 'www.Example.com' } },
      { web: { uri: 'https://vertexaisearch.cloud.google.com/r/2', title: 'aljazeera.com' } },
      { web: {} },
    ] },
  }] };
  expect(CITATION_EXTRACTORS['gemini-grounding'](data)).toEqual({
    text: 'Gemini',
    citedUrls: ['https://vertexaisearch.cloud.google.com/r/1', 'https://vertexaisearch.cloud.google.com/r/2'],
    citedHosts: ['example.com', 'aljazeera.com'],
  });
});

it('every extractor named by the registry exists', () => {
  for (const e of Object.values(PROVIDERS).filter((p) => p.search)) {
    expect(CITATION_EXTRACTORS[e.search.citations], e.id).toBeTypeOf('function');
  }
});

it('extractors tolerate empty or missing fields', () => {
  for (const fn of Object.values(CITATION_EXTRACTORS)) expect(fn({})).toEqual({ text: '', citedUrls: [], citedHosts: [] });
});

it('filterToCited keeps exact url matches and host matches, drops others and invalid urls', () => {
  const results = [
    { url: 'https://a.com/1' },
    { url: 'https://www.example.com/a' },
    { url: 'https://unrelated.org/x' },
    { url: 'not a url' },
    {},
  ];
  expect(filterToCited(results, { citedUrls: ['https://a.com/1'], citedHosts: ['example.com'] }).map((r) => r.url))
    .toEqual(['https://a.com/1', 'https://www.example.com/a']);
  expect(filterToCited(results, {})).toEqual([]);
});

it('filterToCited drops null entries instead of throwing', () => {
  expect(filterToCited([null, { url: 'https://a.com/1' }], { citedUrls: ['https://a.com/1'] }).map((r) => r.url))
    .toEqual(['https://a.com/1']);
});

it('filterToCited matches hosts by suffix, not substring', () => {
  const results = [{ url: 'https://en.wikipedia.org/x' }, { url: 'https://evilwikipedia.org/x' }];
  expect(filterToCited(results, { citedHosts: ['wikipedia.org'] }).map((r) => r.url))
    .toEqual(['https://en.wikipedia.org/x']);
});
