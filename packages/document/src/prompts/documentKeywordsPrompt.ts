import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_KEYWORDS_PROMPT_ID = 'document.keywords';

export const DOCUMENT_KEYWORDS_PROMPT: PromptTemplate = {
  id: DOCUMENT_KEYWORDS_PROMPT_ID,
  version: '1.0.0',
  variables: ['document'],
  template:
    'Extract the key phrases and topics from the following document. Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"keywords": ["<a key phrase>"]}\n\n' +
    'Document:\n{{document}}',
};
