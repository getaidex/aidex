import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_TEMPLATE_PROMPT_ID = 'design.template';

export const DESIGN_TEMPLATE_PROMPT: PromptTemplate = {
  id: DESIGN_TEMPLATE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Design a reusable design template for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the template — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
