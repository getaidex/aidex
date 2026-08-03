import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SEO_KEYWORDS_PROMPT_ID = MarketingEngineId.SeoKeywords;

export const SEO_KEYWORDS_PROMPT: PromptTemplate = {
  id: SEO_KEYWORDS_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'marketNote'],
  template:
    'Generate an SEO keyword list for the following topic brief.{{audienceNote}}{{marketNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"keywords": [{"keyword": "<a keyword or phrase>", "estimatedVolume": <a number>, ' +
    '"difficulty": "low|medium|high"}]}\n\n' +
    'Brief:\n{{brief}}',
};
