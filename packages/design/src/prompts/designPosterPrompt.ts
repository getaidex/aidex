import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_POSTER_PROMPT_ID = 'design.poster';

export const DESIGN_POSTER_PROMPT: PromptTemplate = {
  id: DESIGN_POSTER_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Design a poster for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the poster — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
