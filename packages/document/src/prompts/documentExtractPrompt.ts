import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_EXTRACT_PROMPT_ID = 'document.extract';

/**
 * `fields` is always supplied by DocumentExtractStrategy before rendering —
 * either the caller's requested field list, joined, or a fallback phrase
 * when the request didn't specify one.
 */
export const DOCUMENT_EXTRACT_PROMPT: PromptTemplate = {
  id: DOCUMENT_EXTRACT_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'fields'],
  template:
    'Extract {{fields}} from the following document. Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"fields": {"<field name>": "<value>"}, "confidence": {"<field name>": <number 0-1>}}\n' +
    'Use the exact field names requested. Omit a field from "fields" (and "confidence") ' +
    'entirely if it cannot be found in the document.\n\n' +
    'Document:\n{{document}}',
};
