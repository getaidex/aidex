import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SOCIAL_HASHTAGS_PROMPT_ID = MarketingEngineId.SocialHashtags;

export const SOCIAL_HASHTAGS_PROMPT: PromptTemplate = {
  id: SOCIAL_HASHTAGS_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'platformNote', 'countNote'],
  template:
    'Generate a relevant hashtag set for a social media post about the following creative brief.' +
    '{{audienceNote}}{{platformNote}}{{countNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"hashtags": ["<a hashtag, including the leading #>"]}\n\n' +
    'Brief:\n{{brief}}',
};
