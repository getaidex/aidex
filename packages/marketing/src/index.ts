export { MarketingEngineId } from './identifiers.js';

export { MARKETING_ENGINE_METADATA } from './engines/metadata.js';

export { MARKETING_FEATURE_PACKAGE } from './featurePackage.js';
export type { MarketingWorkflow } from './featurePackage.js';

// Workflows — reusable multi-engine compositions (Phase 4)
export { CampaignWorkflow, CAMPAIGN_WORKFLOW_ID } from './workflows/CampaignWorkflow.js';
export type {
  CampaignWorkflowInput,
  CampaignPackage,
  CampaignWorkflowConfig,
} from './workflows/CampaignWorkflow.js';
export { SocialWorkflow, SOCIAL_WORKFLOW_ID } from './workflows/SocialWorkflow.js';
export type {
  SocialWorkflowInput,
  SocialPublishingPackage,
  SocialWorkflowConfig,
} from './workflows/SocialWorkflow.js';
export { EmailWorkflow, EMAIL_WORKFLOW_ID } from './workflows/EmailWorkflow.js';
export type {
  EmailWorkflowInput,
  EmailCampaignPackage,
  EmailWorkflowConfig,
} from './workflows/EmailWorkflow.js';
export { SeoWorkflow, SEO_WORKFLOW_ID } from './workflows/SeoWorkflow.js';
export type { SeoWorkflowInput, SeoPackage, SeoWorkflowConfig } from './workflows/SeoWorkflow.js';
export { AnalyticsWorkflow, ANALYTICS_WORKFLOW_ID } from './workflows/AnalyticsWorkflow.js';
export type {
  AnalyticsWorkflowInput,
  AnalyticsReport,
  AnalyticsWorkflowConfig,
} from './workflows/AnalyticsWorkflow.js';

// Engines (Phase 3 — AI-backed: prompt → provider → structured result)
export { CampaignPlanEngine } from './engines/CampaignPlanEngine.js';
export type { CampaignPlanEngineConfig } from './engines/CampaignPlanEngine.js';
export { CampaignBriefEngine } from './engines/CampaignBriefEngine.js';
export type { CampaignBriefEngineConfig } from './engines/CampaignBriefEngine.js';
export { CampaignCalendarEngine } from './engines/CampaignCalendarEngine.js';
export type { CampaignCalendarEngineConfig } from './engines/CampaignCalendarEngine.js';
export { SeoKeywordsEngine } from './engines/SeoKeywordsEngine.js';
export type { SeoKeywordsEngineConfig } from './engines/SeoKeywordsEngine.js';
export { SeoMetaEngine } from './engines/SeoMetaEngine.js';
export type { SeoMetaEngineConfig } from './engines/SeoMetaEngine.js';
export { SeoAuditEngine } from './engines/SeoAuditEngine.js';
export type { SeoAuditEngineConfig } from './engines/SeoAuditEngine.js';
export { SocialCaptionEngine } from './engines/SocialCaptionEngine.js';
export type { SocialCaptionEngineConfig } from './engines/SocialCaptionEngine.js';
export { SocialHashtagsEngine } from './engines/SocialHashtagsEngine.js';
export type { SocialHashtagsEngineConfig } from './engines/SocialHashtagsEngine.js';
export { SocialScheduleEngine } from './engines/SocialScheduleEngine.js';
export type { SocialScheduleEngineConfig } from './engines/SocialScheduleEngine.js';
export { EmailSubjectEngine } from './engines/EmailSubjectEngine.js';
export type { EmailSubjectEngineConfig } from './engines/EmailSubjectEngine.js';
export { EmailCopyEngine } from './engines/EmailCopyEngine.js';
export type { EmailCopyEngineConfig } from './engines/EmailCopyEngine.js';
export { EmailSequenceEngine } from './engines/EmailSequenceEngine.js';
export type { EmailSequenceEngineConfig } from './engines/EmailSequenceEngine.js';
export { AnalyticsSummaryEngine } from './engines/AnalyticsSummaryEngine.js';
export type { AnalyticsSummaryEngineConfig } from './engines/AnalyticsSummaryEngine.js';
export { AnalyticsInsightsEngine } from './engines/AnalyticsInsightsEngine.js';
export type { AnalyticsInsightsEngineConfig } from './engines/AnalyticsInsightsEngine.js';

// Strategies
export { CampaignPlanStrategy, parseCampaignPlanResponse } from './strategies/CampaignPlanStrategy.js';
export type { CampaignPlanStrategyConfig } from './strategies/CampaignPlanStrategy.js';
export { CampaignBriefStrategy, parseCampaignBriefResponse } from './strategies/CampaignBriefStrategy.js';
export type { CampaignBriefStrategyConfig } from './strategies/CampaignBriefStrategy.js';
export {
  CampaignCalendarStrategy,
  parseCampaignCalendarResponse,
} from './strategies/CampaignCalendarStrategy.js';
export type { CampaignCalendarStrategyConfig } from './strategies/CampaignCalendarStrategy.js';
export { SeoKeywordsStrategy, parseSeoKeywordsResponse } from './strategies/SeoKeywordsStrategy.js';
export type { SeoKeywordsStrategyConfig } from './strategies/SeoKeywordsStrategy.js';
export { SeoMetaStrategy, parseSeoMetaResponse } from './strategies/SeoMetaStrategy.js';
export type { SeoMetaStrategyConfig } from './strategies/SeoMetaStrategy.js';
export { SeoAuditStrategy, parseSeoAuditResponse } from './strategies/SeoAuditStrategy.js';
export type { SeoAuditStrategyConfig } from './strategies/SeoAuditStrategy.js';
export { SocialCaptionStrategy, parseSocialCaptionResponse } from './strategies/SocialCaptionStrategy.js';
export type { SocialCaptionStrategyConfig } from './strategies/SocialCaptionStrategy.js';
export { SocialHashtagsStrategy, parseSocialHashtagsResponse } from './strategies/SocialHashtagsStrategy.js';
export type { SocialHashtagsStrategyConfig } from './strategies/SocialHashtagsStrategy.js';
export { SocialScheduleStrategy, parseSocialScheduleResponse } from './strategies/SocialScheduleStrategy.js';
export type { SocialScheduleStrategyConfig } from './strategies/SocialScheduleStrategy.js';
export { EmailSubjectStrategy, parseEmailSubjectResponse } from './strategies/EmailSubjectStrategy.js';
export type { EmailSubjectStrategyConfig } from './strategies/EmailSubjectStrategy.js';
export { EmailCopyStrategy, parseEmailCopyResponse } from './strategies/EmailCopyStrategy.js';
export type { EmailCopyStrategyConfig } from './strategies/EmailCopyStrategy.js';
export { EmailSequenceStrategy, parseEmailSequenceResponse } from './strategies/EmailSequenceStrategy.js';
export type { EmailSequenceStrategyConfig } from './strategies/EmailSequenceStrategy.js';
export {
  AnalyticsSummaryStrategy,
  parseAnalyticsSummaryResponse,
} from './strategies/AnalyticsSummaryStrategy.js';
export type { AnalyticsSummaryStrategyConfig } from './strategies/AnalyticsSummaryStrategy.js';
export {
  AnalyticsInsightsStrategy,
  parseAnalyticsInsightsResponse,
} from './strategies/AnalyticsInsightsStrategy.js';
export type { AnalyticsInsightsStrategyConfig } from './strategies/AnalyticsInsightsStrategy.js';

// Prompts
export { CAMPAIGN_PLAN_PROMPT, CAMPAIGN_PLAN_PROMPT_ID } from './prompts/campaignPlanPrompt.js';
export { CAMPAIGN_BRIEF_PROMPT, CAMPAIGN_BRIEF_PROMPT_ID } from './prompts/campaignBriefPrompt.js';
export { CAMPAIGN_CALENDAR_PROMPT, CAMPAIGN_CALENDAR_PROMPT_ID } from './prompts/campaignCalendarPrompt.js';
export { SEO_KEYWORDS_PROMPT, SEO_KEYWORDS_PROMPT_ID } from './prompts/seoKeywordsPrompt.js';
export { SEO_META_PROMPT, SEO_META_PROMPT_ID } from './prompts/seoMetaPrompt.js';
export { SEO_AUDIT_PROMPT, SEO_AUDIT_PROMPT_ID } from './prompts/seoAuditPrompt.js';
export { SOCIAL_CAPTION_PROMPT, SOCIAL_CAPTION_PROMPT_ID } from './prompts/socialCaptionPrompt.js';
export { SOCIAL_HASHTAGS_PROMPT, SOCIAL_HASHTAGS_PROMPT_ID } from './prompts/socialHashtagsPrompt.js';
export { SOCIAL_SCHEDULE_PROMPT, SOCIAL_SCHEDULE_PROMPT_ID } from './prompts/socialSchedulePrompt.js';
export { EMAIL_SUBJECT_PROMPT, EMAIL_SUBJECT_PROMPT_ID } from './prompts/emailSubjectPrompt.js';
export { EMAIL_COPY_PROMPT, EMAIL_COPY_PROMPT_ID } from './prompts/emailCopyPrompt.js';
export { EMAIL_SEQUENCE_PROMPT, EMAIL_SEQUENCE_PROMPT_ID } from './prompts/emailSequencePrompt.js';
export { ANALYTICS_SUMMARY_PROMPT, ANALYTICS_SUMMARY_PROMPT_ID } from './prompts/analyticsSummaryPrompt.js';
export { ANALYTICS_INSIGHTS_PROMPT, ANALYTICS_INSIGHTS_PROMPT_ID } from './prompts/analyticsInsightsPrompt.js';

export type { MarketingEnginePricing } from './pricing/MarketingEnginePricing.js';

// Errors
export { InvalidMarketingEngineInputError } from './errors/InvalidMarketingEngineInputError.js';
export { UnparsableProviderResponseError } from './errors/UnparsableProviderResponseError.js';

// Note: assertHasNonEmptyStringField, assertHasNonEmptyArrayField,
// buildAudienceNote, callProviderWithObservability/
// CallProviderWithObservabilityParams, the src/parsing/ toolkit
// (parseJsonResponse, coerce.ts), and src/engines/internal/ helpers
// (readField.ts, text.ts) are deliberately NOT exported — internal
// plumbing every strategy shares, not a capability external consumers
// need, the same convention @aidex/document's, @aidex/content's,
// @aidex/design's, and @aidex/media's own audits established.

// Shared base
export type { MarketingBrief, MarketingChannel } from './types/marketing.types.js';

// Campaign
export type { CampaignObjective } from './types/campaign.types.js';
export type { CampaignPlanRequest, CampaignPlanResult } from './types/campaign.types.js';
export type { CampaignBriefRequest, CampaignBriefResult } from './types/campaign.types.js';
export type { CampaignCalendarEntry } from './types/campaign.types.js';
export type { CampaignCalendarRequest, CampaignCalendarResult } from './types/campaign.types.js';

// SEO
export type { SeoKeyword } from './types/seo.types.js';
export type { SeoKeywordsRequest, SeoKeywordsResult } from './types/seo.types.js';
export type { SeoMetaRequest, SeoMetaResult } from './types/seo.types.js';
export type { SeoAuditFinding } from './types/seo.types.js';
export type { SeoAuditRequest, SeoAuditResult } from './types/seo.types.js';

// Social
export type { SocialPlatform, SocialPostDraft, ScheduledPost } from './types/social.types.js';
export type { SocialCaptionRequest, SocialCaptionResult } from './types/social.types.js';
export type { SocialHashtagsRequest, SocialHashtagsResult } from './types/social.types.js';
export type { SocialScheduleRequest, SocialScheduleResult } from './types/social.types.js';

// Email
export type { EmailSubjectRequest, EmailSubjectResult } from './types/email.types.js';
export type { EmailCopyRequest, EmailCopyResult } from './types/email.types.js';
export type { EmailSequenceStep } from './types/email.types.js';
export type { EmailSequenceRequest, EmailSequenceResult } from './types/email.types.js';

// Analytics
export type { MetricPoint } from './types/analytics.types.js';
export type { AnalyticsSummaryRequest, AnalyticsSummaryResult } from './types/analytics.types.js';
export type { AnalyticsInsight } from './types/analytics.types.js';
export type { AnalyticsInsightsRequest, AnalyticsInsightsResult } from './types/analytics.types.js';
