import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_HEADLINE_PROMPT_ID = 'content.headline';

export const CONTENT_HEADLINE_PROMPT: PromptTemplate = {
  id: CONTENT_HEADLINE_PROMPT_ID,
  version: '1.0.0',
  variables: ['topic', 'count'],
  template:
    'Generate {{count}} headline variants for the following topic. Respond with strict JSON ' +
    'only, no markdown, no commentary, in exactly this shape:\n' +
    '{"headlines": ["<headline>"]}\n\n' +
    'Topic:\n{{topic}}',
};
