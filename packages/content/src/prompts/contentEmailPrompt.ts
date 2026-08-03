import type { PromptTemplate } from '@aidex/prompts';

export const CONTENT_EMAIL_PROMPT_ID = 'content.email';

export const CONTENT_EMAIL_PROMPT: PromptTemplate = {
  id: CONTENT_EMAIL_PROMPT_ID,
  version: '1.0.0',
  variables: ['purpose', 'guidance'],
  template:
    'Write an email for the following purpose.{{guidance}} Respond with strict JSON only, ' +
    'no markdown, no commentary, in exactly this shape:\n' +
    '{"subject": "<subject line>", "body": "<the full email body>"}\n\n' +
    'Purpose:\n{{purpose}}',
};
