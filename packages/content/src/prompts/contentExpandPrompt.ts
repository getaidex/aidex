import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_EXPAND_PROMPT_ID = 'content.expand';

export const CONTENT_EXPAND_PROMPT: PromptTemplate = {
  id: CONTENT_EXPAND_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'targetLengthNote'],
  template:
    'Expand the following content with more detail and depth.{{targetLengthNote}} ' +
    'Respond with only the expanded content — no preamble, no headings, no commentary.\n\n' +
    'Content:\n{{content}}',
};
