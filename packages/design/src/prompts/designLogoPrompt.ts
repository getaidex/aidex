import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_LOGO_PROMPT_ID = 'design.logo';

export const DESIGN_LOGO_PROMPT: PromptTemplate = {
  id: DESIGN_LOGO_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'variantsNote'],
  template:
    'Design a logo for the following creative brief.{{guidanceNote}}{{variantsNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"primaryDescription": "<a detailed description of the primary logo mark — composition, colors, shapes, style>", ' +
    '"variantDescriptions": ["<a detailed description of one alternate variant, e.g. icon-only or monochrome>"]}\n\n' +
    'Brief:\n{{brief}}',
};
