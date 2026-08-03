import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_FLYER_PROMPT_ID = 'design.flyer';

export const DESIGN_FLYER_PROMPT: PromptTemplate = {
  id: DESIGN_FLYER_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'sidesNote'],
  template:
    'Design a flyer for the following creative brief.{{guidanceNote}}{{sidesNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the flyer — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
