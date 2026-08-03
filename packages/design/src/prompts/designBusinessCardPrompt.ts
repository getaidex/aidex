import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_BUSINESS_CARD_PROMPT_ID = 'design.business-card';

export const DESIGN_BUSINESS_CARD_PROMPT: PromptTemplate = {
  id: DESIGN_BUSINESS_CARD_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'sidesNote'],
  template:
    'Design a business card for the following creative brief.{{guidanceNote}}{{sidesNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"frontDescription": "<a detailed description of the front side layout, colors, and typography>", ' +
    '"backDescription": "<a detailed description of the back side, or null if only one side was requested>"}\n\n' +
    'Brief:\n{{brief}}',
};
