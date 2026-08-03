import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_PRESENTATION_PROMPT_ID = 'design.presentation';

export const DESIGN_PRESENTATION_PROMPT: PromptTemplate = {
  id: DESIGN_PRESENTATION_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'slideCountNote'],
  template:
    'Design a set of presentation slides for the following creative brief.{{guidanceNote}}{{slideCountNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"slides": ["<a detailed description of one slide\'s content and layout, in order>"]}\n\n' +
    'Brief:\n{{brief}}',
};
