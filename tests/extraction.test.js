import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { extractArticle } from '../src/lib/extraction.js';

function loadFixture(name) {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const fixturePath = join(testDir, '..', 'fixtures', name);
  const html = readFileSync(fixturePath, 'utf-8');
  return new JSDOM(html).window.document;
}

describe('extractArticle', () => {
  it('extracts high-confidence text from a news article', () => {
    const doc = loadFixture('article.html');
    const result = extractArticle(doc, 'https://example.com/article');
    expect(result.confidence).toBe('high');
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.title).toContain('Tidal Energy');
    expect(result.url).toBe('https://example.com/article');
  });

  it('extracts high-confidence text from a blog post', () => {
    const doc = loadFixture('blog.html');
    const result = extractArticle(doc, 'https://example.com/blog');
    expect(result.confidence).toBe('high');
    expect(result.text.length).toBeGreaterThan(200);
  });

  it('returns low confidence for a PDF viewer shell with no article text', () => {
    const doc = loadFixture('pdf-viewer.html');
    const result = extractArticle(doc, 'https://example.com/document.pdf');
    expect(result.confidence).toBe('low');
    expect(result.text).toBe('');
  });

  it('returns low confidence for a paywalled stub with too little text', () => {
    const doc = loadFixture('paywall.html');
    const result = extractArticle(doc, 'https://example.com/paywalled');
    expect(result.confidence).toBe('low');
  });
});
