import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const ANALYTICS_SUMMARY_PROMPT_ID = MarketingEngineId.AnalyticsSummary;

export const ANALYTICS_SUMMARY_PROMPT: PromptTemplate = {
  id: ANALYTICS_SUMMARY_PROMPT_ID,
  version: '1.0.0',
  variables: ['metricsList', 'periodNote'],
  template:
    'Summarize the following marketing metrics into a short narrative summary with highlights.{{periodNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"summary": "<a short narrative summary>", "highlights": ["<a notable highlight>"]}\n\n' +
    'Metrics:\n{{metricsList}}',
};
