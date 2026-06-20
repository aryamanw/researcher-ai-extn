import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('contentEntry', () => {
  beforeEach(() => {
    document.title = 'Test Page';
    document.body.innerHTML = `
      <article>
        <p>${'This is a long enough paragraph to pass the extraction confidence threshold. '.repeat(5)}</p>
      </article>
    `;
    global.chrome = { runtime: { sendMessage: vi.fn() } };
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/page' },
      writable: true,
    });
  });

  it('extracts the page and sends the result via chrome.runtime.sendMessage', async () => {
    await import('../src/content/contentEntry.js');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const [message] = chrome.runtime.sendMessage.mock.calls[0];
    expect(message.type).toBe('EXTRACTION_RESULT');
    expect(message.payload.confidence).toBe('high');
    expect(message.payload.url).toBe('https://example.com/page');
  });
});
