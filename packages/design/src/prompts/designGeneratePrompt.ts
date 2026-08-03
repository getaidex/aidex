import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_GENERATE_PROMPT_ID = 'design.generate';

export const DESIGN_GENERATE_PROMPT: PromptTemplate = {
  id: DESIGN_GENERATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Generate a new design asset for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the generated design asset — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
