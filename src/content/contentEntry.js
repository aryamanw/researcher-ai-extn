import { extractArticle } from '../lib/extraction.js';

const result = extractArticle(document, location.href);
chrome.runtime.sendMessage({ type: 'EXTRACTION_RESULT', payload: result });
