import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SOCIAL_CAPTION_PROMPT_ID = MarketingEngineId.SocialCaption;

export const SOCIAL_CAPTION_PROMPT: PromptTemplate = {
  id: SOCIAL_CAPTION_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'platformNote'],
  template:
    'Write a social media post caption for the following creative brief.{{audienceNote}}{{platformNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"caption": "<the post caption>"}\n\n' +
    'Brief:\n{{brief}}',
};
