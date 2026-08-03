import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_PALETTE_PROMPT_ID = 'design.palette';

export const DESIGN_PALETTE_PROMPT: PromptTemplate = {
  id: DESIGN_PALETTE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Generate a color palette for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"colors": [{"name": "<color name>", "hex": "<#rrggbb>", "role": "<e.g. primary, secondary, accent>"}]}\n\n' +
    'Brief:\n{{brief}}',
};
