import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const CAMPAIGN_BRIEF_PROMPT_ID = MarketingEngineId.CampaignBrief;

export const CAMPAIGN_BRIEF_PROMPT: PromptTemplate = {
  id: CAMPAIGN_BRIEF_PROMPT_ID,
  version: '1.0.0',
  variables: ['brief', 'audienceNote', 'productNote'],
  template:
    'Write a formal campaign brief document from the following raw creative idea.{{audienceNote}}{{productNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"document": "<the full campaign brief document text>", "objectives": ["<a campaign objective>"]}\n\n' +
    'Idea:\n{{brief}}',
};
