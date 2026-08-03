import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const EMAIL_COPY_PROMPT_ID = MarketingEngineId.EmailCopy;

export const EMAIL_COPY_PROMPT: PromptTemplate = {
  id: EMAIL_COPY_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'ctaNote'],
  template:
    'Write a subject line and body copy for a marketing email based on the following creative brief.' +
    '{{audienceNote}}{{ctaNote}} Respond with strict JSON only, no markdown, no commentary, in exactly ' +
    'this shape:\n' +
    '{"subject": "<the email subject line>", "body": "<the full email body copy>"}\n\n' +
    'Brief:\n{{brief}}',
};
