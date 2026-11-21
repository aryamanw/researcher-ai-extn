import { getProvider, canSearchNatively, SEARCH_SERVICES } from '../src/lib/providers/registry.js';
import { listModels } from '../src/lib/providers/models.js';

const CUSTOM = '__custom__';
const caches = new WeakMap(); // form -> Map(providerId -> string[]), lives for the page session
const field = (form, name) => form.elements.namedItem(name);
const cacheFor = (form) => {
  if (!caches.has(form)) caches.set(form, new Map());
  return caches.get(form);
};

// Read synchronously and never throw: callers snapshot this before any await.
export function readModel(form) {
  const select = field(form, 'model');
  if (!select) return '';
  if (select.value === CUSTOM) return (field(form, 'modelCustom')?.value || '').trim();
  return select.value || '';
}

function searchKeyConfigured(form, settings) {
  const service = field(form, 'searchService')?.value;
  if (!SEARCH_SERVICES[service]) return false;
  return !!(field(form, 'searchKey')?.value || settings.searchKeys?.[service]);
}

function labelFor(entry, id, usesKey) {
  if (canSearchNatively(entry, id)) return `${id} · searches the web`;
  return usesKey ? `${id} · uses search key` : id;
}

function setStatus(form, text) {
  const el = form.querySelector('#model-status');
  if (el) el.textContent = text;
}

export function renderModelControl(form, settings, providerId, { keepCurrent = false } = {}) {
  const select = field(form, 'model');
  const custom = field(form, 'modelCustom');
  if (!select) return;
  const entry = getProvider(providerId);
  const wanted = keepCurrent ? readModel(form) : (providerId && settings.models?.[providerId]) || '';
  const ids = (entry && cacheFor(form).get(providerId)) || [];
  const usesKey = searchKeyConfigured(form, settings);
  const doc = form.ownerDocument;
  const option = (value, text) => {
    const o = doc.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  };
  select.replaceChildren(
    option('', `Default (${entry?.defaultModel ?? 'provider default'})`),
    ...(entry ? ids.map((id) => option(id, labelFor(entry, id, usesKey))) : []),
    option(CUSTOM, 'Type a model name…'),
  );
  if (!wanted) select.value = '';
  else if (ids.includes(wanted)) select.value = wanted;
  else {
    select.value = CUSTOM;
    if (custom) custom.value = wanted;
  }
  if (custom) custom.hidden = select.value !== CUSTOM;
}

export function toggleCustomInput(form) {
  const custom = field(form, 'modelCustom');
  if (custom) custom.hidden = field(form, 'model').value !== CUSTOM;
}

function credential(settings, providerId) {
  return settings.apiKeys?.[providerId] || (providerId === 'openrouter' ? settings.openrouterToken : '') || '';
}

// Never rejects: a failed fetch leaves the Default / typed fallback in place.
export async function loadModels(form, getSettings, providerId, { force = false, auto = false } = {}) {
  try {
    const entry = getProvider(providerId);
    if (!entry?.modelsEndpoint) return;
    const cache = cacheFor(form);
    if (!force && cache.has(providerId)) return;
    const key = credential(getSettings(), providerId);
    if (auto && !key) return;
    setStatus(form, 'Loading models…');
    let ids;
    try {
      ids = await listModels(entry, key);
    } catch {
      if (field(form, 'provider')?.value === providerId) setStatus(form, `Couldn't load models from ${entry.label}.`);
      return;
    }
    cache.set(providerId, ids);
    if (field(form, 'provider')?.value !== providerId) return;
    setStatus(form, '');
    renderModelControl(form, getSettings(), providerId, { keepCurrent: true });
  } catch {
    setStatus(form, '');
  }
}
