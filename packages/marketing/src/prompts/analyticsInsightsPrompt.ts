import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const ANALYTICS_INSIGHTS_PROMPT_ID = MarketingEngineId.AnalyticsInsights;

export const ANALYTICS_INSIGHTS_PROMPT: PromptTemplate = {
  id: ANALYTICS_INSIGHTS_PROMPT_ID,
  version: '1.0.0',
  variables: ['metricsList', 'goalNote'],
  template:
    'Derive actionable insights and recommendations from the following marketing metrics.{{goalNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"insights": [{"observation": "<what the data shows>", "recommendation": "<what to do about it>"}]}\n\n' +
    'Metrics:\n{{metricsList}}',
};
