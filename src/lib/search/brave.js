export async function search({ apiKey, query, count = 10 }) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-subscription-token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.web?.results || [];
  return results.map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.description || '',
  }));
}
