import type { PromptTemplate } from '@aidex/prompts';

export const CONTRACT_REVIEW_PROMPT_ID = 'contract.review';

/**
 * `focusAreasNote` is always supplied by ContractReviewStrategy before
 * rendering — the actual focus area list (if supplied) is folded into that
 * computed sentence in JS, not passed as its own placeholder, for the same
 * reason DOCUMENT_TRANSLATE_PROMPT's sourceLanguageNote is.
 */
export const CONTRACT_REVIEW_PROMPT: PromptTemplate = {
  id: CONTRACT_REVIEW_PROMPT_ID,
  version: '1.0.0',
  variables: ['document', 'focusAreasNote'],
  template:
    'Review the following contract for risks.{{focusAreasNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"risks": [{"clause": "<clause name or excerpt>", "severity": "low"|"medium"|"high", ' +
    '"explanation": "<why this is risky>"}], "summary": "<1-2 sentence overall summary or null>"}\n\n' +
    'Contract:\n{{document}}',
};
