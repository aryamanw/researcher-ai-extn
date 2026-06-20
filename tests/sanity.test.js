import { describe, it, expect } from 'vitest';

describe('project scaffold', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object');
  });
});
