import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_GENERATE_PROMPT_ID = 'content.generate';

/**
 * `guidance` is always supplied by ContentGenerateStrategy before
 * rendering — a single computed sentence folding in whichever of
 * `keywords`/`tone`/`length` the request actually supplied, rather than
 * three separate optional placeholders.
 */
export const CONTENT_GENERATE_PROMPT: PromptTemplate = {
  id: CONTENT_GENERATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['topic', 'guidance'],
  template:
    'Generate new content about the following topic.{{guidance}} Respond with only ' +
    'the generated content — no preamble, no headings, no commentary.\n\n' +
    'Topic:\n{{topic}}',
};
