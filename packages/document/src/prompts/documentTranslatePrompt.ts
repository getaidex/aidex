import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_TRANSLATE_PROMPT_ID = 'document.translate';

/**
 * `sourceLanguageNote` is always supplied by DocumentTranslateStrategy
 * before rendering — the actual sourceLanguage value (if the caller
 * supplied one) is folded into that computed sentence in JS, not passed as
 * its own placeholder, since renderPrompt substitutes each declared
 * variable exactly once and doesn't re-scan a variable's own value for
 * further `{{...}}` placeholders.
 */
export const DOCUMENT_TRANSLATE_PROMPT: PromptTemplate = {
  id: DOCUMENT_TRANSLATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'targetLanguage', 'sourceLanguageNote'],
  template:
    'Translate the following document into {{targetLanguage}}. {{sourceLanguageNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"translatedText": "<the translation>", "detectedSourceLanguage": "<language you translated from>"}\n\n' +
    'Document:\n{{document}}',
};
