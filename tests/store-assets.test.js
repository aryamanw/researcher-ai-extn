import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

function pngDimensions(path) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('chrome web store screenshots', () => {
  it('screenshot-sidepanel.png is exactly 1280x800', () => {
    const { width, height } = pngDimensions('store-assets/screenshot-sidepanel.png');
    expect(width).toBe(1280);
    expect(height).toBe(800);
  });
});
