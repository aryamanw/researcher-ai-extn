import { describe, it, expect } from 'vitest';
import { FORMATS } from '../../../src/lib/providers/formats/index.js';

describe('FORMATS', () => {
  it('has exactly the four format keys, each with searchAndRank and complete', () => {
    expect(Object.keys(FORMATS).sort()).toEqual(['anthropic', 'gemini', 'openai-chat', 'openai-responses']);
    for (const f of Object.values(FORMATS)) {
      expect(typeof f.searchAndRank).toBe('function');
      expect(typeof f.complete).toBe('function');
    }
  });
});
