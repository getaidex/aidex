import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_TONE_PROMPT_ID = 'content.tone';

export const CONTENT_TONE_PROMPT: PromptTemplate = {
  id: CONTENT_TONE_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'tone'],
  template:
    'Rewrite the following content using a {{tone}} tone. Respond with only the ' +
    'rewritten content — no preamble, no headings, no commentary.\n\n' +
    'Content:\n{{content}}',
};
