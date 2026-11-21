import { it, expect, vi, beforeEach } from 'vitest';
import { hasHostPermission, requestHostPermission } from '../../src/lib/providers/permissions.js';

beforeEach(() => {
  global.chrome = { permissions: { contains: vi.fn().mockResolvedValue(true), request: vi.fn().mockResolvedValue(true) } };
});

it('hasHostPermission wraps chrome.permissions.contains', async () => {
  chrome.permissions.contains.mockResolvedValue(false);
  expect(await hasHostPermission('https://api.deepseek.com/*')).toBe(false);
  expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins: ['https://api.deepseek.com/*'] });
});

it('requestHostPermission wraps chrome.permissions.request', async () => {
  expect(await requestHostPermission('https://api.exa.ai/*')).toBe(true);
  expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['https://api.exa.ai/*'] });
});
