import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_SOCIAL_PROMPT_ID = 'content.social';

export const CONTENT_SOCIAL_PROMPT: PromptTemplate = {
  id: CONTENT_SOCIAL_PROMPT_ID,
  version: '1.0.0',
  variables: ['topic', 'guidance'],
  template:
    'Write a social media post about the following topic.{{guidance}} Respond with strict JSON ' +
    'only, no markdown, no commentary, in exactly this shape:\n' +
    '{"content": "<the post text>", "hashtags": ["<hashtag, without the # symbol>"]}\n\n' +
    'Topic:\n{{topic}}',
};
