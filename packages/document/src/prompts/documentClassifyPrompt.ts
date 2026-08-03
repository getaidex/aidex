import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_CLASSIFY_PROMPT_ID = 'document.classify';

export const DOCUMENT_CLASSIFY_PROMPT: PromptTemplate = {
  id: DOCUMENT_CLASSIFY_PROMPT_ID,
  version: '1.0.0',
  variables: ['document'],
  template:
    'Determine the type or category of the following document (e.g. invoice, contract, resume, letter, ' +
    'report, or other). Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"documentType": "<the document type>", "confidence": <a number between 0 and 1>}\n\n' +
    'Document:\n{{document}}',
};
