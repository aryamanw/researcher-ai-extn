// Turn a parsed provider response into { text, citedUrls, citedHosts }.
// citedUrls: URLs the provider's search returned/cited. citedHosts: only used by Gemini,
// whose grounding URIs are redirect URLs, so matching is done on the source domain instead.

const result = (text = '', citedUrls = [], citedHosts = []) => ({ text, citedUrls, citedHosts });

const normalizeHost = (host) => String(host).toLowerCase().replace(/^www\./, '');

function responsesMessageText(data) {
  const message = (data.output || []).find((item) => item.type === 'message');
  return (message?.content || []).find((c) => c.type === 'output_text');
}

export const CITATION_EXTRACTORS = {
  'anthropic-blocks'(data) {
    const blocks = data.content || [];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const citedUrls = blocks
      .filter((b) => b.type === 'web_search_tool_result')
      .flatMap((b) => (Array.isArray(b.content) ? b.content : []))
      .map((r) => r.url)
      .filter(Boolean);
    return result(text, citedUrls);
  },

  'responses-annotations'(data) {
    const content = responsesMessageText(data);
    const citedUrls = (content?.annotations || [])
      .filter((a) => a.type === 'url_citation')
      .map((a) => a.url)
      .filter(Boolean);
    return result(content?.text || '', citedUrls);
  },

  'responses-sources'(data) {
    const citedUrls = (data.output || [])
      .filter((item) => item.type === 'web_search_call')
      .flatMap((item) => item.action?.sources || [])
      .map((s) => s.url)
      .filter(Boolean);
    return result(responsesMessageText(data)?.text || '', citedUrls);
  },

  'openrouter-annotations': chatAnnotations,
  'chat-annotations': chatAnnotations,

  'gemini-grounding'(data) {
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('');
    const webs = (candidate?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter(Boolean);
    const citedUrls = webs.map((w) => w.uri).filter(Boolean);
    const citedHosts = webs.map((w) => w.title).filter(Boolean).map(normalizeHost);
    return result(text, citedUrls, citedHosts);
  },
};

function chatAnnotations(data) {
  const message = data.choices?.[0]?.message;
  const citedUrls = (message?.annotations || [])
    .filter((a) => a.type === 'url_citation')
    .map((a) => a.url_citation?.url)
    .filter(Boolean);
  return result(message?.content || '', citedUrls);
}

export function filterToCited(results, { citedUrls = [], citedHosts = [] } = {}) {
  const urls = new Set(citedUrls);
  const hosts = new Set(citedHosts);
  return results.filter((r) => {
    let host;
    try {
      host = normalizeHost(new URL(r?.url).hostname);
    } catch {
      return false;
    }
    return urls.has(r.url) || [...hosts].some((h) => host === h || host.endsWith('.' + h));
  });
}
