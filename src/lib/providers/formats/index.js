import * as openaiResponses from './openaiResponses.js';
import * as openaiChat from './openaiChat.js';
import * as anthropic from './anthropic.js';
import * as gemini from './gemini.js';

export const FORMATS = {
  'openai-responses': { searchAndRank: openaiResponses.searchAndRank, complete: openaiResponses.complete },
  'openai-chat': { searchAndRank: openaiChat.searchAndRank, complete: openaiChat.complete },
  anthropic: { searchAndRank: anthropic.searchAndRank, complete: anthropic.complete },
  gemini: { searchAndRank: gemini.searchAndRank, complete: gemini.complete },
};
