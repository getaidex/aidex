import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const EMAIL_SUBJECT_PROMPT_ID = MarketingEngineId.EmailSubject;

export const EMAIL_SUBJECT_PROMPT: PromptTemplate = {
  id: EMAIL_SUBJECT_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'variantsNote'],
  template:
    'Write email subject line variants for the following creative brief.{{audienceNote}}{{variantsNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"subjects": ["<a subject line variant>"]}\n\n' +
    'Brief:\n{{brief}}',
};
