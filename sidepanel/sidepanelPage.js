import { getSettings, addHistoryEntry } from '../src/lib/storage.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { searchAndRank, planSearch } from '../src/lib/providers/index.js';
import { PROVIDERS, SEARCH_SERVICES, getProvider } from '../src/lib/providers/registry.js';
import { ProviderError } from '../src/lib/providers/errors.js';
import { hasHostPermission } from '../src/lib/providers/permissions.js';

export function renderLoading(container, statusText, onCancel) {
  container.textContent = '';
  container.setAttribute('aria-busy', 'true');

  const row = document.createElement('div');
  row.className = 'status-row';

  const statusGroup = document.createElement('div');
  statusGroup.className = 'status-group';

  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');
  statusGroup.appendChild(spinner);

  const p = document.createElement('p');
  p.className = 'status';
  p.textContent = statusText;
  statusGroup.appendChild(p);

  row.appendChild(statusGroup);

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
    `<p class="setup-prompt">Set up a provider in <a href="${settingsUrl}" id="open-settings">Settings</a> to get started.</p>`;
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

function friendlyProviderError(error) {
  const service = SEARCH_SERVICES[error.provider];
  const label = service?.label ?? getProvider(error.provider)?.label ?? error.provider;
  if (service) {
    if (error.kind === 'auth') return `Your ${label} key was rejected. Check it in Settings.`;
    if (error.kind === 'rate-limit') {
      const other = Object.values(SEARCH_SERVICES).find((s) => s.id !== service.id);
      return `${label}'s free limit is used up for now. Try again later${other ? ` or switch to ${other.label}` : ''}.`;
    }
  }
  switch (error.kind) {
    case 'model-unavailable':
      return `${error.model} isn't available from ${label}. Pick another model in Settings.`;
    case 'needs-search-key':
      return `${error.model} can't search the web on its own. Add an Exa or Tavily key in Settings, or pick a model that can search.`;
    case 'permission':
      return `Research Companion needs permission to contact ${label}. Open Settings to allow it.`;
    case 'auth': return 'Your API key was rejected. Check it in Settings.';
    case 'rate-limit': return 'Rate limited by the provider. Try again in a moment.';
    case 'server': return 'The provider is having trouble right now. Try again shortly.';
    case 'network': return "Couldn't reach the provider. Check your connection and try again.";
    case 'not-configured': return 'Finish setting up your provider and API key in Settings.';
    default: return null;
  }
}

export function toFriendlyErrorMessage(error) {
  if (error instanceof ProviderError) {
    const friendly = friendlyProviderError(error);
    if (friendly) return friendly;
  }
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
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Couldn't reach the provider. Check your connection and try again.";
  }
  if (/could not parse json from (search|ranking) response|search response json was not an array|did not return a ranked results array/i.test(message)) {
    return 'The provider returned an unexpected response. Try again.';
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

export function renderResults(container, results, { provider, showProvider } = {}) {
  container.removeAttribute('aria-busy');
  container.innerHTML = '';

  if (showProvider && provider) {
    const label = document.createElement('p');
    label.className = 'active-provider status';
    label.textContent = `Using ${getProvider(provider)?.label ?? provider}`;
    container.appendChild(label);
  }

  results.forEach((r) => {
    const article = document.createElement('article');
    article.className = 'result';

    const a = document.createElement('a');
    a.textContent = String(r.title ?? r.url ?? '');
    a.dir = 'auto';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    try {
      const u = new URL(r.url);
      if (/^https?:$/.test(u.protocol)) a.href = r.url;
    } catch {
      // leave href unset for invalid URLs
    }

    const snippet = document.createElement('p');
    snippet.className = 'snippet';
    snippet.dir = 'auto';
    snippet.textContent = String(r.snippet ?? '');

    const relevance = document.createElement('p');
    relevance.className = 'relevance';
    relevance.dir = 'auto';
    const relevanceLabel = document.createElement('span');
    relevanceLabel.className = 'relevance-label';
    relevanceLabel.textContent = 'Why this: ';
    relevance.append(relevanceLabel, document.createTextNode(String(r.relevance ?? '')));

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
  let count = Object.keys(PROVIDERS).filter((id) => settings.apiKeys?.[id]).length;
  if (settings.openrouterToken && !settings.apiKeys?.openrouter) count += 1;
  return count;
}

async function ensureHostPermissions(plan) {
  const required = chrome.runtime.getManifest().host_permissions ?? [];
  const hosts = [{ id: plan.entry.id, host: plan.entry.host }];
  if (plan.mode === 2) hosts.push({ id: plan.searchService.id, host: SEARCH_SERVICES[plan.searchService.id].host });
  for (const { id, host } of hosts) {
    if (required.includes(host)) continue;
    if (!(await hasHostPermission(host))) {
      throw new ProviderError(`Missing permission for ${host}`, { kind: 'permission', provider: id });
    }
  }
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
  if (!settings.provider) {
    return { status: 'not-configured' };
  }

  const plan = planSearch(settings);
  await ensureHostPermissions(plan);

  renderStatus('Reading page...');
  const extraction = await requestExtraction(tabId, { signal });
  if (extraction.confidence === 'low') {
    renderNoContentFn();
    return { status: 'no-content' };
  }

  const llmClient = {
    searchAndRank: ({ pageTitle, pageText, resultsCount }) =>
      searchAndRank(settings, { pageTitle, pageText, resultsCount }, { signal, onStatus: renderStatus }),
  };

  const results = await runPipeline({
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    articleText: extraction.text,
    llmClient,
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
    searchService: plan.mode === 2 ? plan.searchService.id : null,
  });

  return { status: 'success', results };
}
