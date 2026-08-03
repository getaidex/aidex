import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const CAMPAIGN_PLAN_PROMPT_ID = MarketingEngineId.CampaignPlan;

export const CAMPAIGN_PLAN_PROMPT: PromptTemplate = {
  id: CAMPAIGN_PLAN_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote'],
  template:
    'Plan a marketing campaign for the following creative brief.{{audienceNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"objectives": [{"goal": "<a campaign objective>", "metric": "<optional metric to track it>"}], ' +
    '"summary": "<a short summary of the overall plan>"}\n\n' +
    'Brief:\n{{brief}}',
};
