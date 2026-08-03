export const MarketingEngineId = {
  CampaignPlan: 'marketing.campaign.plan',
  CampaignBrief: 'marketing.campaign.brief',
  CampaignCalendar: 'marketing.campaign.calendar',
  SeoKeywords: 'marketing.seo.keywords',
  SeoMeta: 'marketing.seo.meta',
  SeoAudit: 'marketing.seo.audit',
  SocialCaption: 'marketing.social.caption',
  SocialHashtags: 'marketing.social.hashtags',
  SocialSchedule: 'marketing.social.schedule',
  EmailSubject: 'marketing.email.subject',
  EmailCopy: 'marketing.email.copy',
  EmailSequence: 'marketing.email.sequence',
  AnalyticsSummary: 'marketing.analytics.summary',
  AnalyticsInsights: 'marketing.analytics.insights',
} as const;

export type MarketingEngineId = (typeof MarketingEngineId)[keyof typeof MarketingEngineId];
