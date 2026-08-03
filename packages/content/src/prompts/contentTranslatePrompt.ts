import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_TRANSLATE_PROMPT_ID = 'content.translate';

/** Mirrors @aidex/document's DOCUMENT_TRANSLATE_PROMPT shape exactly. */
export const CONTENT_TRANSLATE_PROMPT: PromptTemplate = {
  id: CONTENT_TRANSLATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'targetLanguage', 'sourceLanguageNote'],
  template:
    'Translate the following content into {{targetLanguage}}. {{sourceLanguageNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"translatedContent": "<the translation>", "detectedSourceLanguage": "<language you translated from>"}\n\n' +
    'Content:\n{{content}}',
};
