import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_MOCKUP_PROMPT_ID = 'design.mockup';

export const DESIGN_MOCKUP_PROMPT: PromptTemplate = {
  id: DESIGN_MOCKUP_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Describe a realistic mockup scene for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the mockup scene and how the design is presented within it>"}\n\n' +
    'Brief:\n{{brief}}',
};
