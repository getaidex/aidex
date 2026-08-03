import type { PromptTemplate } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';

export const SEO_AUDIT_PROMPT_ID = MarketingEngineId.SeoAudit;

export const SEO_AUDIT_PROMPT: PromptTemplate = {
  id: SEO_AUDIT_PROMPT_ID,
  version: '1.0.0',
  variables: ['url', 'contentNote'],
  template:
    'Audit the following page for SEO issues and produce a score from 0-100.{{contentNote}} ' +
    'Respond with strict JSON only, no markdown, no commentary, in exactly this shape:\n' +
    '{"score": <a number from 0 to 100>, "findings": [{"issue": "<an SEO issue>", ' +
    '"severity": "low|medium|high", "recommendation": "<how to fix it>"}]}\n\n' +
    'URL:\n{{url}}',
};
