import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_SHORTEN_PROMPT_ID = 'content.shorten';

export const CONTENT_SHORTEN_PROMPT: PromptTemplate = {
  id: CONTENT_SHORTEN_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'targetLengthNote'],
  template:
    'Shorten and condense the following content while preserving its key meaning.{{targetLengthNote}} ' +
    'Respond with only the shortened content — no preamble, no headings, no commentary.\n\n' +
    'Content:\n{{content}}',
};
