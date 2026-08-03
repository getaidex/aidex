import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_SOCIAL_POST_PROMPT_ID = 'design.social-post';

export const DESIGN_SOCIAL_POST_PROMPT: PromptTemplate = {
  id: DESIGN_SOCIAL_POST_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'platformNote'],
  template:
    'Design a social media graphic for the following creative brief.{{guidanceNote}}{{platformNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the graphic — composition, colors, typography, imagery>"}\n\n' +
    'Brief:\n{{brief}}',
};
