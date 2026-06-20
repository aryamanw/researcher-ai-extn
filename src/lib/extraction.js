import { Readability } from '@mozilla/readability';

const MIN_TEXT_LENGTH = 200;

export function extractArticle(doc, url) {
  const clone = doc.cloneNode(true);
  let article = null;
  try {
    article = new Readability(clone).parse();
  } catch {
    article = null;
  }

  const text = article?.textContent?.trim() || '';
  if (text.length < MIN_TEXT_LENGTH) {
    return { title: doc.title || '', url, text: '', confidence: 'low' };
  }

  return {
    title: article.title || doc.title || '',
    url,
    text,
    confidence: 'high',
  };
}
