import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_TRANSFORM_PROMPT_ID = 'document.transform';

/**
 * `mimeType` on the Result is computed deterministically by
 * DocumentTransformStrategy from `targetFormat` (never AI-derived) —
 * the provider is only asked for the reformatted `content`.
 */
export const DOCUMENT_TRANSFORM_PROMPT: PromptTemplate = {
  id: DOCUMENT_TRANSFORM_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'targetFormat'],
  template:
    'Reformat or restructure the following document into {{targetFormat}} format, preserving its meaning. ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"content": "<the reformatted document content>"}\n\n' +
    'Document:\n{{document}}',
};
