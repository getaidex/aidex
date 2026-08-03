import type { PromptTemplate } from '@aidex/prompts';

export const DESIGN_TYPOGRAPHY_PROMPT_ID = 'design.typography';

export const DESIGN_TYPOGRAPHY_PROMPT: PromptTemplate = {
  id: DESIGN_TYPOGRAPHY_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'guidanceNote'],
  template:
    'Suggest font pairings for the following creative brief.{{guidanceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"pairings": [{"heading": "<font name>", "body": "<font name>", "notes": "<why this pairing fits>"}]}\n\n' +
    'Brief:\n{{brief}}',
};
