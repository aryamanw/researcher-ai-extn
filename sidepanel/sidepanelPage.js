import { getSettings, addHistoryEntry } from '../src/lib/storage.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { getCompletion } from '../src/lib/llm/index.js';
import { search as braveSearch } from '../src/lib/search/brave.js';

export function renderLoading(container, statusText) {
  container.innerHTML = `<p class="status">${statusText}</p>`;
}

export function renderSetupPrompt(container) {
  container.innerHTML =
    '<p class="setup-prompt">Set up a provider and Brave Search key in <a href="/options/options.html" id="open-settings">Settings</a> to get started.</p>';
}

export function renderNoContent(container) {
  container.innerHTML = '<p class="status">Couldn\'t find readable content on this page.</p>';
}

export function renderNoResults(container) {
  container.innerHTML = '<p class="status">No similar results found.</p>';
}

export function renderError(container, message, onRetry) {
  container.innerHTML = '';

  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = message;
  container.appendChild(p);

  const button = document.createElement('button');
  button.id = 'retry-button';
  button.textContent = 'Retry';
  button.addEventListener('click', onRetry);
  container.appendChild(button);
}

export function renderResults(container, results) {
  container.innerHTML = '';
  results.forEach((r) => {
    const article = document.createElement('article');
    article.className = 'result';

    const a = document.createElement('a');
    a.textContent = r.title;
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
    snippet.textContent = r.snippet;

    const relevance = document.createElement('p');
    relevance.className = 'relevance';
    relevance.textContent = r.relevance;

    article.append(a, snippet, relevance);
    container.appendChild(article);
  });
}

export function renderHistoryList(container, entries, onSelect) {
  container.innerHTML = '';
  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry.sourcePage.title;
    li.dataset.id = entry.id;
    li.addEventListener('click', () => onSelect(li.dataset.id));
    container.appendChild(li);
  });
}

export function requestExtraction(tabId) {
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message.type === 'EXTRACTION_RESULT') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    chrome.scripting.executeScript({ target: { tabId }, files: ['dist/content.bundled.js'] }).catch((error) => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(error);
    });
  });
}

export async function analyzeActiveTab({ tabId, renderStatus, renderResultsFn, renderNoContentFn, renderNoResultsFn }) {
  const settings = await getSettings();
  if (!settings.provider || !settings.braveSearchKey) {
    return { status: 'not-configured' };
  }

  renderStatus('Reading page...');
  const extraction = await requestExtraction(tabId);
  if (extraction.confidence === 'low') {
    renderNoContentFn();
    return { status: 'no-content' };
  }

  renderStatus('Searching...');
  const llmClient = { complete: (prompt) => getCompletion(settings, prompt) };
  const searchClient = { search: (query) => braveSearch({ apiKey: settings.braveSearchKey, query }) };

  renderStatus('Ranking results...');
  const results = await runPipeline({
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    articleText: extraction.text,
    llmClient,
    searchClient,
    resultsCount: settings.resultsCount,
  });

  if (results.length === 0) {
    renderNoResultsFn();
    return { status: 'no-results' };
  }

  renderResultsFn(results);
  await addHistoryEntry({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    sourcePage: { title: extraction.title, url: extraction.url },
    results,
  });

  return { status: 'success', results };
}
