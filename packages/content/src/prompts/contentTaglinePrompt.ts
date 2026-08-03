import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_TAGLINE_PROMPT_ID = 'content.tagline';

/**
 * `descriptionNote` is always supplied by ContentTaglineStrategy before
 * rendering — the actual description text (if supplied) is folded into
 * that computed sentence in JS, the same reason DOCUMENT_TRANSLATE_PROMPT's
 * sourceLanguageNote is.
 */
export const CONTENT_TAGLINE_PROMPT: PromptTemplate = {
  id: CONTENT_TAGLINE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brandName', 'count', 'descriptionNote'],
  template:
    'Generate {{count}} tagline variants for the following brand.{{descriptionNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"taglines": ["<tagline>"]}\n\n' +
    'Brand name:\n{{brandName}}',
};
