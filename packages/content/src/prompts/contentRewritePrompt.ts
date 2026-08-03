import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_REWRITE_PROMPT_ID = 'content.rewrite';

/**
 * `instructionsNote` is always supplied by ContentRewriteStrategy before
 * rendering — the actual instructions text (if supplied) is folded into
 * that computed sentence in JS, not passed as its own placeholder, the
 * same reason @aidex/document's DOCUMENT_TRANSLATE_PROMPT's
 * sourceLanguageNote is: renderPrompt substitutes each declared variable
 * exactly once and doesn't re-scan a variable's own value for further
 * `{{...}}` placeholders.
 */
export const CONTENT_REWRITE_PROMPT: PromptTemplate = {
  id: CONTENT_REWRITE_PROMPT_ID,
  version: '1.0.0',
  variables: ['content', 'instructionsNote'],
  template:
    'Rewrite the following content.{{instructionsNote}} Respond with only the ' +
    'rewritten content — no preamble, no headings, no commentary.\n\n' +
    'Content:\n{{content}}',
};
