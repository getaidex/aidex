import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const CAMPAIGN_CALENDAR_PROMPT_ID = MarketingEngineId.CampaignCalendar;

/**
 * Dates and channels for each entry are computed deterministically by
 * `CampaignCalendarStrategy` from `startDate`/`durationDays`/`channels` —
 * only the per-day `activity` text is asked of the provider, one per day,
 * in order.
 */
export const CAMPAIGN_CALENDAR_PROMPT: PromptTemplate = {
  id: CAMPAIGN_CALENDAR_PROMPT_ID,
  version: '1.0.0',
  variables: ['campaignContext', 'dayCountNote'],
  template:
    'Plan a day-by-day list of marketing activities for an already-planned campaign.{{dayCountNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"activities": ["<a short description of day 1\'s activity>", "<day 2>", "..."]}\n\n' +
    'Campaign context:\n{{campaignContext}}',
};
