// kind: 'auth'|'rate-limit'|'model-unavailable'|'server'|'http'|'network'|'needs-search-key'|'not-configured'|'permission'
export class ProviderError extends Error {
  constructor(message, { kind = 'http', provider, model, status } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
    this.provider = provider;
    this.model = model;
    this.status = status;
  }
}
