import type { FeaturePackage } from '@aidex/sdk';
import { MARKETING_ENGINE_METADATA } from './engines/metadata.js';
import { CampaignPlanEngine } from './engines/CampaignPlanEngine.js';
import { CampaignBriefEngine } from './engines/CampaignBriefEngine.js';
import { CampaignCalendarEngine } from './engines/CampaignCalendarEngine.js';
import { SeoKeywordsEngine } from './engines/SeoKeywordsEngine.js';
import { SeoMetaEngine } from './engines/SeoMetaEngine.js';
import { SeoAuditEngine } from './engines/SeoAuditEngine.js';
import { SocialCaptionEngine } from './engines/SocialCaptionEngine.js';
import { SocialHashtagsEngine } from './engines/SocialHashtagsEngine.js';
import { SocialScheduleEngine } from './engines/SocialScheduleEngine.js';
import { EmailSubjectEngine } from './engines/EmailSubjectEngine.js';
import { EmailCopyEngine } from './engines/EmailCopyEngine.js';
import { EmailSequenceEngine } from './engines/EmailSequenceEngine.js';
import { AnalyticsSummaryEngine } from './engines/AnalyticsSummaryEngine.js';
import { AnalyticsInsightsEngine } from './engines/AnalyticsInsightsEngine.js';
import { CAMPAIGN_PLAN_PROMPT } from './prompts/campaignPlanPrompt.js';
import { CAMPAIGN_BRIEF_PROMPT } from './prompts/campaignBriefPrompt.js';
import { CAMPAIGN_CALENDAR_PROMPT } from './prompts/campaignCalendarPrompt.js';
import { SEO_KEYWORDS_PROMPT } from './prompts/seoKeywordsPrompt.js';
import { SEO_META_PROMPT } from './prompts/seoMetaPrompt.js';
import { SEO_AUDIT_PROMPT } from './prompts/seoAuditPrompt.js';
import { SOCIAL_CAPTION_PROMPT } from './prompts/socialCaptionPrompt.js';
import { SOCIAL_HASHTAGS_PROMPT } from './prompts/socialHashtagsPrompt.js';
import { SOCIAL_SCHEDULE_PROMPT } from './prompts/socialSchedulePrompt.js';
import { EMAIL_SUBJECT_PROMPT } from './prompts/emailSubjectPrompt.js';
import { EMAIL_COPY_PROMPT } from './prompts/emailCopyPrompt.js';
import { EMAIL_SEQUENCE_PROMPT } from './prompts/emailSequencePrompt.js';
import { ANALYTICS_SUMMARY_PROMPT } from './prompts/analyticsSummaryPrompt.js';
import { ANALYTICS_INSIGHTS_PROMPT } from './prompts/analyticsInsightsPrompt.js';
import { CampaignWorkflow } from './workflows/CampaignWorkflow.js';
import { SocialWorkflow } from './workflows/SocialWorkflow.js';
import { EmailWorkflow } from './workflows/EmailWorkflow.js';
import { SeoWorkflow } from './workflows/SeoWorkflow.js';
import { AnalyticsWorkflow } from './workflows/AnalyticsWorkflow.js';

export type MarketingWorkflow = CampaignWorkflow | SocialWorkflow | EmailWorkflow | SeoWorkflow | AnalyticsWorkflow;

/**
 * @aidex/marketing's complete manifest — every engine is a singleton,
 * constructed once here and shared across every EngineRegistry that
 * registers it via AIBuilder.use(MARKETING_FEATURE_PACKAGE). Engines must
 * stay stateless: all execution state belongs on ExecutionContext, never
 * on the engine instance. `workflows` is pass-through only — never
 * registered anywhere by AIBuilder.use(); call each workflow's own
 * `.run(input, provider, options)` directly.
 */
export const MARKETING_FEATURE_PACKAGE: FeaturePackage<MarketingWorkflow> = {
  name: '@aidex/marketing',
  version: '0.1.0-alpha',
  engines: [
    new CampaignPlanEngine(),
    new CampaignBriefEngine(),
    new CampaignCalendarEngine(),
    new SeoKeywordsEngine(),
    new SeoMetaEngine(),
    new SeoAuditEngine(),
    new SocialCaptionEngine(),
    new SocialHashtagsEngine(),
    new SocialScheduleEngine(),
    new EmailSubjectEngine(),
    new EmailCopyEngine(),
    new EmailSequenceEngine(),
    new AnalyticsSummaryEngine(),
    new AnalyticsInsightsEngine(),
  ],
  prompts: [
    CAMPAIGN_PLAN_PROMPT,
    CAMPAIGN_BRIEF_PROMPT,
    CAMPAIGN_CALENDAR_PROMPT,
    SEO_KEYWORDS_PROMPT,
    SEO_META_PROMPT,
    SEO_AUDIT_PROMPT,
    SOCIAL_CAPTION_PROMPT,
    SOCIAL_HASHTAGS_PROMPT,
    SOCIAL_SCHEDULE_PROMPT,
    EMAIL_SUBJECT_PROMPT,
    EMAIL_COPY_PROMPT,
    EMAIL_SEQUENCE_PROMPT,
    ANALYTICS_SUMMARY_PROMPT,
    ANALYTICS_INSIGHTS_PROMPT,
  ],
  metadata: MARKETING_ENGINE_METADATA,
  workflows: [
    new CampaignWorkflow(),
    new SocialWorkflow(),
    new EmailWorkflow(),
    new SeoWorkflow(),
    new AnalyticsWorkflow(),
  ],
};
