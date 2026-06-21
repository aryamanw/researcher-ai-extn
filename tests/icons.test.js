import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

function pngDimensions(path) {
  const buf = readFileSync(path);
  // PNG IHDR chunk: width is bytes 16-19, height is bytes 20-23, both big-endian.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('extension icons', () => {
  it.each([16, 48, 128])('icons/icon%d.png is exactly %dx%d', (size) => {
    const { width, height } = pngDimensions(`icons/icon${size}.png`);
    expect(width).toBe(size);
    expect(height).toBe(size);
  });
});
