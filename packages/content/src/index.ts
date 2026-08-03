export { ContentEngineId } from './identifiers.js';

export { CONTENT_ENGINE_METADATA } from './metadata.js';

export { CONTENT_FEATURE_PACKAGE } from './featurePackage.js';
export type { ContentWorkflow } from './featurePackage.js';

// Workflows — reusable multi-engine compositions (Phase 4)
export { ContentBlogWorkflow, CONTENT_BLOG_WORKFLOW_ID } from './workflows/ContentBlogWorkflow.js';
export type {
  ContentBlogWorkflowInput,
  ContentBlogPackage,
  ContentBlogWorkflowConfig,
} from './workflows/ContentBlogWorkflow.js';
export { ContentSocialWorkflow, CONTENT_SOCIAL_WORKFLOW_ID } from './workflows/ContentSocialWorkflow.js';
export type {
  ContentSocialWorkflowInput,
  ContentSocialPackage,
  ContentSocialWorkflowConfig,
} from './workflows/ContentSocialWorkflow.js';
export { ContentEmailWorkflow, CONTENT_EMAIL_WORKFLOW_ID } from './workflows/ContentEmailWorkflow.js';
export type {
  ContentEmailWorkflowInput,
  ContentEmailPackage,
  ContentEmailWorkflowConfig,
} from './workflows/ContentEmailWorkflow.js';
export { ContentRepurposeWorkflow, CONTENT_REPURPOSE_WORKFLOW_ID } from './workflows/ContentRepurposeWorkflow.js';
export type {
  ContentRepurposeWorkflowInput,
  ContentRepurposePackage,
  ContentRepurposeWorkflowConfig,
} from './workflows/ContentRepurposeWorkflow.js';
export { ContentArticleWorkflow, CONTENT_ARTICLE_WORKFLOW_ID } from './workflows/ContentArticleWorkflow.js';
export type {
  ContentArticleWorkflowInput,
  ContentArticlePackage,
  ContentArticleWorkflowConfig,
} from './workflows/ContentArticleWorkflow.js';
export {
  ContentProductLaunchWorkflow,
  CONTENT_PRODUCT_LAUNCH_WORKFLOW_ID,
} from './workflows/ContentProductLaunchWorkflow.js';
export type {
  ContentProductLaunchWorkflowInput,
  ContentProductLaunchPackage,
  ContentProductLaunchWorkflowConfig,
} from './workflows/ContentProductLaunchWorkflow.js';

export type { ContentGenerateRequest, ContentGenerateResult } from './types/ContentGenerate.js';
export type { ContentRewriteRequest, ContentRewriteResult } from './types/ContentRewrite.js';
export type { ContentExpandRequest, ContentExpandResult } from './types/ContentExpand.js';
export type { ContentShortenRequest, ContentShortenResult } from './types/ContentShorten.js';
export type { ContentTranslateRequest, ContentTranslateResult } from './types/ContentTranslate.js';
export type { ContentSummarizeRequest, ContentSummarizeResult } from './types/ContentSummarize.js';
export type { ContentToneRequest, ContentToneResult } from './types/ContentTone.js';
export type { ContentSeoRequest, ContentSeoResult } from './types/ContentSeo.js';
export type { ContentBlogRequest, ContentBlogResult } from './types/ContentBlog.js';
export type { ContentEmailRequest, ContentEmailResult } from './types/ContentEmail.js';
export type { ContentSocialRequest, ContentSocialResult } from './types/ContentSocial.js';
export type {
  ContentProductDescriptionRequest,
  ContentProductDescriptionResult,
} from './types/ContentProductDescription.js';
export type { ContentHeadlineRequest, ContentHeadlineResult } from './types/ContentHeadline.js';
export type { ContentTaglineRequest, ContentTaglineResult } from './types/ContentTagline.js';

// Engines
export { ContentGenerateEngine } from './engines/ContentGenerateEngine.js';
export type { ContentGenerateEngineConfig } from './engines/ContentGenerateEngine.js';
export { ContentRewriteEngine } from './engines/ContentRewriteEngine.js';
export type { ContentRewriteEngineConfig } from './engines/ContentRewriteEngine.js';
export { ContentExpandEngine } from './engines/ContentExpandEngine.js';
export type { ContentExpandEngineConfig } from './engines/ContentExpandEngine.js';
export { ContentShortenEngine } from './engines/ContentShortenEngine.js';
export type { ContentShortenEngineConfig } from './engines/ContentShortenEngine.js';
export { ContentTranslateEngine } from './engines/ContentTranslateEngine.js';
export type { ContentTranslateEngineConfig } from './engines/ContentTranslateEngine.js';
export { ContentSummarizeEngine } from './engines/ContentSummarizeEngine.js';
export type { ContentSummarizeEngineConfig } from './engines/ContentSummarizeEngine.js';
export { ContentToneEngine } from './engines/ContentToneEngine.js';
export type { ContentToneEngineConfig } from './engines/ContentToneEngine.js';
export { ContentSeoEngine } from './engines/ContentSeoEngine.js';
export type { ContentSeoEngineConfig } from './engines/ContentSeoEngine.js';
export { ContentBlogEngine } from './engines/ContentBlogEngine.js';
export type { ContentBlogEngineConfig } from './engines/ContentBlogEngine.js';
export { ContentEmailEngine } from './engines/ContentEmailEngine.js';
export type { ContentEmailEngineConfig } from './engines/ContentEmailEngine.js';
export { ContentSocialEngine } from './engines/ContentSocialEngine.js';
export type { ContentSocialEngineConfig } from './engines/ContentSocialEngine.js';
export { ContentProductDescriptionEngine } from './engines/ContentProductDescriptionEngine.js';
export type { ContentProductDescriptionEngineConfig } from './engines/ContentProductDescriptionEngine.js';
export { ContentHeadlineEngine } from './engines/ContentHeadlineEngine.js';
export type { ContentHeadlineEngineConfig } from './engines/ContentHeadlineEngine.js';
export { ContentTaglineEngine } from './engines/ContentTaglineEngine.js';
export type { ContentTaglineEngineConfig } from './engines/ContentTaglineEngine.js';

// Strategies
export { ContentGenerateStrategy, parseContentGenerateResponse } from './strategies/ContentGenerateStrategy.js';
export type { ContentGenerateStrategyConfig } from './strategies/ContentGenerateStrategy.js';
export { ContentRewriteStrategy, parseContentRewriteResponse } from './strategies/ContentRewriteStrategy.js';
export type { ContentRewriteStrategyConfig } from './strategies/ContentRewriteStrategy.js';
export { ContentExpandStrategy, parseContentExpandResponse } from './strategies/ContentExpandStrategy.js';
export type { ContentExpandStrategyConfig } from './strategies/ContentExpandStrategy.js';
export { ContentShortenStrategy, parseContentShortenResponse } from './strategies/ContentShortenStrategy.js';
export type { ContentShortenStrategyConfig } from './strategies/ContentShortenStrategy.js';
export { ContentTranslateStrategy, parseContentTranslateResponse } from './strategies/ContentTranslateStrategy.js';
export type { ContentTranslateStrategyConfig } from './strategies/ContentTranslateStrategy.js';
export { ContentSummarizeStrategy, parseContentSummarizeResponse } from './strategies/ContentSummarizeStrategy.js';
export type { ContentSummarizeStrategyConfig } from './strategies/ContentSummarizeStrategy.js';
export { ContentToneStrategy, parseContentToneResponse } from './strategies/ContentToneStrategy.js';
export type { ContentToneStrategyConfig } from './strategies/ContentToneStrategy.js';
export { ContentSeoStrategy, parseContentSeoResponse } from './strategies/ContentSeoStrategy.js';
export type { ContentSeoStrategyConfig } from './strategies/ContentSeoStrategy.js';
export { ContentBlogStrategy, parseContentBlogResponse } from './strategies/ContentBlogStrategy.js';
export type { ContentBlogStrategyConfig } from './strategies/ContentBlogStrategy.js';
export { ContentEmailStrategy, parseContentEmailResponse } from './strategies/ContentEmailStrategy.js';
export type { ContentEmailStrategyConfig } from './strategies/ContentEmailStrategy.js';
export { ContentSocialStrategy, parseContentSocialResponse } from './strategies/ContentSocialStrategy.js';
export type { ContentSocialStrategyConfig } from './strategies/ContentSocialStrategy.js';
export {
  ContentProductDescriptionStrategy,
  parseContentProductDescriptionResponse,
} from './strategies/ContentProductDescriptionStrategy.js';
export type { ContentProductDescriptionStrategyConfig } from './strategies/ContentProductDescriptionStrategy.js';
export { ContentHeadlineStrategy, parseContentHeadlineResponse } from './strategies/ContentHeadlineStrategy.js';
export type { ContentHeadlineStrategyConfig } from './strategies/ContentHeadlineStrategy.js';
export { ContentTaglineStrategy, parseContentTaglineResponse } from './strategies/ContentTaglineStrategy.js';
export type { ContentTaglineStrategyConfig } from './strategies/ContentTaglineStrategy.js';

// Prompts
export { CONTENT_GENERATE_PROMPT, CONTENT_GENERATE_PROMPT_ID } from './prompts/contentGeneratePrompt.js';
export { CONTENT_REWRITE_PROMPT, CONTENT_REWRITE_PROMPT_ID } from './prompts/contentRewritePrompt.js';
export { CONTENT_EXPAND_PROMPT, CONTENT_EXPAND_PROMPT_ID } from './prompts/contentExpandPrompt.js';
export { CONTENT_SHORTEN_PROMPT, CONTENT_SHORTEN_PROMPT_ID } from './prompts/contentShortenPrompt.js';
export { CONTENT_TRANSLATE_PROMPT, CONTENT_TRANSLATE_PROMPT_ID } from './prompts/contentTranslatePrompt.js';
export { CONTENT_SUMMARIZE_PROMPT, CONTENT_SUMMARIZE_PROMPT_ID } from './prompts/contentSummarizePrompt.js';
export { CONTENT_TONE_PROMPT, CONTENT_TONE_PROMPT_ID } from './prompts/contentTonePrompt.js';
export { CONTENT_SEO_PROMPT, CONTENT_SEO_PROMPT_ID } from './prompts/contentSeoPrompt.js';
export { CONTENT_BLOG_PROMPT, CONTENT_BLOG_PROMPT_ID } from './prompts/contentBlogPrompt.js';
export { CONTENT_EMAIL_PROMPT, CONTENT_EMAIL_PROMPT_ID } from './prompts/contentEmailPrompt.js';
export { CONTENT_SOCIAL_PROMPT, CONTENT_SOCIAL_PROMPT_ID } from './prompts/contentSocialPrompt.js';
export {
  CONTENT_PRODUCT_DESCRIPTION_PROMPT,
  CONTENT_PRODUCT_DESCRIPTION_PROMPT_ID,
} from './prompts/contentProductDescriptionPrompt.js';
export { CONTENT_HEADLINE_PROMPT, CONTENT_HEADLINE_PROMPT_ID } from './prompts/contentHeadlinePrompt.js';
export { CONTENT_TAGLINE_PROMPT, CONTENT_TAGLINE_PROMPT_ID } from './prompts/contentTaglinePrompt.js';

export type { ContentEnginePricing } from './pricing/ContentEnginePricing.js';

// Errors
export { InvalidContentEngineInputError } from './errors/InvalidContentEngineInputError.js';
export { UnparsableProviderResponseError } from './errors/UnparsableProviderResponseError.js';

// Note: assertHasNonEmptyStringField, buildGuidanceNote,
// callProviderWithObservability/CallProviderWithObservabilityParams, and
// the src/parsing/ toolkit (parseJsonResponse, coerce.ts,
// parseRequiredStringArrayField) are deliberately NOT exported — they're
// internal plumbing every strategy above shares, not a capability
// external consumers need. @aidex/document's own audit flagged exporting
// equivalent internal helpers as unnecessary public API surface; applied
// here from the start instead of repeating that finding.
