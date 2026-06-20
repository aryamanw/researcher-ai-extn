import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/oauth/openrouterOAuth.js', () => ({
  connectOpenRouter: vi.fn(),
}));
vi.mock('../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { connectOpenRouter } from '../src/lib/oauth/openrouterOAuth.js';
import { getSettings, saveSettings } from '../src/lib/storage.js';

function setupChromeMock() {
  const listeners = { onClicked: [], onMessage: [] };
  global.chrome = {
    action: {
      onClicked: { addListener: (fn) => listeners.onClicked.push(fn) },
    },
    sidePanel: { open: vi.fn() },
    runtime: {
      onMessage: { addListener: (fn) => listeners.onMessage.push(fn) },
      lastError: undefined,
    },
    identity: {
      launchWebAuthFlow: vi.fn(),
    },
  };
  return listeners;
}

describe('background.js', () => {
  let listeners;

  beforeEach(async () => {
    vi.resetModules();
    listeners = setupChromeMock();
    await import('../background.js');
  });

  it('opens the side panel when the action icon is clicked', () => {
    const onClicked = listeners.onClicked[0];
    onClicked({ id: 42 });
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 42 });
  });

  it('connects OpenRouter and saves the token on CONNECT_OPENROUTER message', async () => {
    connectOpenRouter.mockResolvedValue('new-or-key');
    getSettings.mockResolvedValue({ provider: null, openrouterToken: '' });

    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    const keepAlive = onMessage({ type: 'CONNECT_OPENROUTER' }, {}, sendResponse);

    expect(keepAlive).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

    expect(saveSettings).toHaveBeenCalledWith({ provider: null, openrouterToken: 'new-or-key' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('responds with an error when the OAuth flow fails', async () => {
    connectOpenRouter.mockRejectedValue(new Error('user cancelled'));

    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    onMessage({ type: 'CONNECT_OPENROUTER' }, {}, sendResponse);

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'user cancelled' });
  });

  it('ignores unrelated message types', () => {
    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    const keepAlive = onMessage({ type: 'SOMETHING_ELSE' }, {}, sendResponse);
    expect(keepAlive).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
