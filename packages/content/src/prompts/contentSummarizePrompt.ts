import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_SUMMARIZE_PROMPT_ID = 'content.summarize';

/** Mirrors @aidex/document's DOCUMENT_SUMMARIZE_PROMPT shape exactly. */
export const CONTENT_SUMMARIZE_PROMPT: PromptTemplate = {
  id: CONTENT_SUMMARIZE_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'maxLength'],
  template:
    'Summarize the following content in {{maxLength}} words or fewer. ' +
    'Respond with only the summary text — no preamble, no headings.\n\n' +
    'Content:\n{{content}}',
};
