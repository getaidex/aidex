import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_SEO_PROMPT_ID = 'content.seo';

export const CONTENT_SEO_PROMPT: PromptTemplate = {
  id: CONTENT_SEO_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'targetKeywordsNote'],
  template:
    'SEO-optimize the following content.{{targetKeywordsNote}} Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"optimizedContent": "<the optimized content>", "suggestedKeywords": ["<keyword>"], ' +
    '"metaDescription": "<a meta description under 160 characters>"}\n\n' +
    'Content:\n{{content}}',
};
