import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_BRAND_PROMPT_ID = 'design.brand';

/**
 * `guidanceNote` is always supplied by DesignBrandStrategy before
 * rendering — the actual targetAudience/style/industry text (whichever
 * was supplied) is folded into that computed sentence in JS, not passed
 * as separate placeholders, the same reason every other prompt in this
 * package that combines optional context does.
 */
export const DESIGN_BRAND_PROMPT: PromptTemplate = {
  id: DESIGN_BRAND_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Design a brand identity for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"logoDescription": "<a detailed description of the logo mark, its composition, colors, and style>", ' +
    '"palette": ["<hex color>"], "typography": ["<font name>"], ' +
    '"guidelines": "<a short brand guidelines summary>"}\n\n' +
    'Brief:\n{{brief}}',
};
