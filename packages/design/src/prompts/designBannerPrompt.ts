import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_BANNER_PROMPT_ID = 'design.banner';

export const DESIGN_BANNER_PROMPT: PromptTemplate = {
  id: DESIGN_BANNER_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'platformNote'],
  template:
    'Design a banner for the following creative brief.{{guidanceNote}}{{platformNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the banner — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
