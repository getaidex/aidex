import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_LAYOUT_PROMPT_ID = 'design.layout';

export const DESIGN_LAYOUT_PROMPT: PromptTemplate = {
  id: DESIGN_LAYOUT_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote', 'contentBlocksNote'],
  template:
    'Arrange the following creative brief into a designed layout.{{guidanceNote}}{{contentBlocksNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"description": "<a detailed description of the layout — composition, positioning of elements, colors, typography>"}\n\n' +
    'Brief:\n{{brief}}',
};
