// DuckDuckGo has no official search API. This scrapes their HTML results page,
// which has no key/signup but can break if DuckDuckGo changes their markup.
function decodeResultUrl(href) {
  if (!href) return '';
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : href;
  } catch {
    return href;
  }
}

export async function search({ query, count = 10, signal }) {
  const url = new URL('https://html.duckduckgo.com/html/');
  url.searchParams.set('q', query);

  const response = await fetch(url, {
    headers: { accept: 'text/html' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search error: ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const results = [...doc.querySelectorAll('.result__body')].map((el) => {
    const titleLink = el.querySelector('.result__a');
    return {
      title: titleLink?.textContent.trim() || '',
      url: decodeResultUrl(titleLink?.getAttribute('href') || ''),
      snippet: el.querySelector('.result__snippet')?.textContent.trim() || '',
    };
  });

  return results.filter((r) => r.url).slice(0, count);
}
