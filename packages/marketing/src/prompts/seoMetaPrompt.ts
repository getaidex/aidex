import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SEO_META_PROMPT_ID = MarketingEngineId.SeoMeta;

export const SEO_META_PROMPT: PromptTemplate = {
  id: SEO_META_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'keywordNote'],
  template:
    'Write an SEO title (60 characters or fewer) and meta description (155 characters or fewer) for the ' +
    'following page content.{{keywordNote}} Respond with strict JSON only, no markdown, no commentary, ' +
    'in exactly this shape:\n' +
    '{"title": "<the SEO title>", "description": "<the meta description>"}\n\n' +
    'Content:\n{{content}}',
};
