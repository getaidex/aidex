import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_SUMMARIZE_PROMPT_ID = 'document.summarize';

/**
 * Both declared variables are always supplied by DocumentSummarizeStrategy
 * before rendering — `maxLength` gets a fallback phrase when the caller's
 * request didn't specify one, so the template never has to special-case an
 * absent value.
 */
export const DOCUMENT_SUMMARIZE_PROMPT: PromptTemplate = {
  id: DOCUMENT_SUMMARIZE_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'maxLength'],
  template:
    'Summarize the following document in {{maxLength}} words or fewer. ' +
    'Respond with only the summary text — no preamble, no headings.\n\n' +
    'Document:\n{{document}}',
};
