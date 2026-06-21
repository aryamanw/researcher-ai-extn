import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import manifest from '../manifest.json' with { type: 'json' };

describe('manifest icons', () => {
  it('declares 16/48/128 icon paths', () => {
    expect(manifest.icons).toEqual({
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    });
  });

  it('declares the same icons on the toolbar action', () => {
    expect(manifest.action.default_icon).toEqual(manifest.icons);
  });

  it('every declared icon file exists on disk', () => {
    Object.values(manifest.icons).forEach((path) => {
      expect(existsSync(path)).toBe(true);
    });
  });
});
