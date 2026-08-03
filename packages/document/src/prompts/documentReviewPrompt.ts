import type { PromptTemplate } from '@aidex/prompts';

export const DOCUMENT_REVIEW_PROMPT_ID = 'document.review';

/**
 * `focusAreasNote` is always supplied by DocumentReviewStrategy before
 * rendering — same reason `CONTRACT_REVIEW_PROMPT`'s `focusAreasNote` is.
 * Domain-neutral counterpart to that prompt: reviews any document, not
 * specifically a contract, so findings use `issue`/`recommendation`
 * rather than `clause`/`explanation`.
 */
export const DOCUMENT_REVIEW_PROMPT: PromptTemplate = {
  id: DOCUMENT_REVIEW_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'focusAreasNote'],
  template:
    'Review the following document for issues.{{focusAreasNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"findings": [{"issue": "<an issue>", "severity": "low"|"medium"|"high", ' +
    '"recommendation": "<how to fix it>"}], "summary": "<1-2 sentence overall summary or null>"}\n\n' +
    'Document:\n{{document}}',
};
