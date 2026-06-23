import { getSettings, addHistoryEntry } from '../src/lib/storage.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { getCompletion } from '../src/lib/llm/index.js';
import { search as braveSearch } from '../src/lib/search/brave.js';
import { search as duckduckgoSearch } from '../src/lib/search/duckduckgo.js';

export function renderLoading(container, statusText, onCancel) {
  container.textContent = '';
  container.setAttribute('aria-busy', 'true');

  const row = document.createElement('div');
  row.className = 'status-row';

  const p = document.createElement('p');
  p.className = 'status';
  p.textContent = statusText;
  row.appendChild(p);

  if (onCancel) {
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'cancel-button';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', onCancel);
    row.appendChild(cancelButton);
  }

  container.appendChild(row);
}

export function renderSetupPrompt(container) {
  container.removeAttribute('aria-busy');
  const settingsUrl = chrome.runtime.getURL('options/options.html');
  container.innerHTML =
    `<p class="setup-prompt">Set up a provider and Brave Search key in <a href="${settingsUrl}" id="open-settings">Settings</a> to get started.</p>`;
}

export function renderNoContent(container) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '<p class="empty-state">Couldn\'t find readable content on this page.</p>';
}

export function renderNoResults(container) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '<p class="empty-state">No similar results found.</p>';
}

export function renderCancelled(container) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '<p class="empty-state">Search cancelled.</p>';
}

export function toFriendlyErrorMessage(error) {
  const message = error?.message || String(error);

  if (/no (provider|api key\/token) configured/i.test(message)) {
    return 'Finish setting up your provider and API key in Settings.';
  }
  if (/cannot access|cannot be scripted|chrome:\/\/|chrome-extension:\/\/|chromewebstore/i.test(message)) {
    return "Research Companion can't read this page. Browser pages and the Chrome Web Store are off-limits to extensions.";
  }
  const statusMatch = message.match(/api error: (\d{3})/i);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status === 401 || status === 403) return 'Your API key was rejected. Check it in Settings.';
    if (status === 429) return 'Rate limited by the provider. Try again in a moment.';
    if (status >= 500) return 'The provider is having trouble right now. Try again shortly.';
  }
  return message;
}

export function renderError(container, message, onRetry) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '';

  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  container.appendChild(p);

  const button = document.createElement('button');
  button.id = 'retry-button';
  button.textContent = 'Retry';
  button.addEventListener('click', () => {
    button.disabled = true;
    onRetry();
  });
  container.appendChild(button);
}

const PROVIDER_LABELS = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
};

export function renderResults(container, results, { provider, showProvider } = {}) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '';

  if (showProvider && provider) {
    const label = document.createElement('p');
    label.className = 'active-provider status';
    label.textContent = `Using ${PROVIDER_LABELS[provider] || provider}`;
    container.appendChild(label);
  }

  results.forEach((r) => {
    const article = document.createElement('article');
    article.className = 'result';

    const a = document.createElement('a');
    a.textContent = r.title;
    a.dir = 'auto';
    a.target = '_blank';
    a.rel = 'noopener';
    try {
      const u = new URL(r.url);
      if (/^https?:$/.test(u.protocol)) a.href = r.url;
    } catch {
      // leave href unset for invalid URLs
    }

    const snippet = document.createElement('p');
    snippet.className = 'snippet';
    snippet.dir = 'auto';
    snippet.textContent = r.snippet;

    const relevance = document.createElement('p');
    relevance.className = 'relevance';
    relevance.dir = 'auto';
    const relevanceLabel = document.createElement('span');
    relevanceLabel.className = 'relevance-label';
    relevanceLabel.textContent = 'Why this: ';
    relevance.append(relevanceLabel, document.createTextNode(r.relevance));

    article.append(a, snippet, relevance);
    container.appendChild(article);
  });
}

export function renderHistoryList(container, entries, onSelect, sectionEl, onDelete) {
  container.innerHTML = '';
  if (sectionEl) sectionEl.classList.toggle('is-hidden', entries.length === 0);
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'No history yet';
    container.appendChild(li);
    return;
  }
  entries.forEach((entry) => {
    const li = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-select';
    button.dir = 'auto';
    button.textContent = entry.sourcePage.title;
    button.title = entry.sourcePage.title;
    button.addEventListener('click', () => onSelect(entry.id));
    li.appendChild(button);

    if (onDelete) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'history-delete';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Remove "${entry.sourcePage.title}" from history`);
      deleteButton.addEventListener('click', () => onDelete(entry.id));
      li.appendChild(deleteButton);
    }

    container.appendChild(li);
  });
}

const EXTRACTION_TIMEOUT_MS = 15000;

export function requestExtraction(tabId, { timeoutMs = EXTRACTION_TIMEOUT_MS, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }

    let timer;
    const cleanup = () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const listener = (message, sender) => {
      if (message.type === 'EXTRACTION_RESULT' && sender.tab?.id === tabId) {
        cleanup();
        resolve(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    signal?.addEventListener('abort', onAbort);
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("Didn't hear back from the page in time. Try again, or reload the tab if this keeps happening."));
    }, timeoutMs);

    chrome.scripting.executeScript({ target: { tabId }, files: ['dist/content.bundled.js'] }).catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

export function countConfiguredProviders(settings) {
  let count = 0;
  if (settings.apiKeys?.anthropic) count += 1;
  if (settings.apiKeys?.openai) count += 1;
  if (settings.apiKeys?.gemini) count += 1;
  if (settings.openrouterToken) count += 1;
  return count;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

export async function analyzeActiveTab({
  tabId,
  renderStatus,
  renderResultsFn,
  renderNoContentFn,
  renderNoResultsFn,
  signal,
}) {
  const settings = await getSettings();
  const searchProvider = settings.searchProvider || 'brave';
  const hasSearchConfig = searchProvider === 'duckduckgo' || !!settings.braveSearchKey;
  if (!settings.provider || !hasSearchConfig) {
    return { status: 'not-configured' };
  }

  renderStatus('Reading page...');
  const extraction = await requestExtraction(tabId, { signal });
  if (extraction.confidence === 'low') {
    renderNoContentFn();
    return { status: 'no-content' };
  }

  renderStatus('Searching...');
  const llmClient = { complete: (prompt) => getCompletion(settings, prompt, signal) };
  const searchClient =
    searchProvider === 'duckduckgo'
      ? { search: (query) => duckduckgoSearch({ query, signal }) }
      : { search: (query) => braveSearch({ apiKey: settings.braveSearchKey, query, signal }) };

  renderStatus('Ranking results...');
  const results = await runPipeline({
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    articleText: extraction.text,
    llmClient,
    searchClient,
    resultsCount: settings.resultsCount,
  });

  throwIfAborted(signal);

  if (results.length === 0) {
    renderNoResultsFn();
    return { status: 'no-results' };
  }

  const showProvider = countConfiguredProviders(settings) > 1;
  renderResultsFn(results, { provider: settings.provider, showProvider });
  await addHistoryEntry({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    sourcePage: { title: extraction.title, url: extraction.url },
    results,
    provider: settings.provider,
  });

  return { status: 'success', results };
}
