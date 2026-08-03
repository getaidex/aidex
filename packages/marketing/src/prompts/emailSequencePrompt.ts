import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const EMAIL_SEQUENCE_PROMPT_ID = MarketingEngineId.EmailSequence;

/**
 * `sendDayOffset` for each step is computed deterministically by
 * `EmailSequenceStrategy` — the provider is only asked for each step's
 * subject/body, one per step, in order.
 */
export const EMAIL_SEQUENCE_PROMPT: PromptTemplate = {
  id: EMAIL_SEQUENCE_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'stepCountNote'],
  template:
    'Write a multi-step email drip sequence for the following creative brief.{{audienceNote}}{{stepCountNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"steps": [{"subject": "<the subject for this step>", "body": "<the body copy for this step>"}]}\n\n' +
    'Brief:\n{{brief}}',
};
