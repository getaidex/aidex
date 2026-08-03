export { DesignEngineId } from './identifiers.js';

export { DESIGN_ENGINE_METADATA } from './metadata.js';

export { DESIGN_FEATURE_PACKAGE } from './featurePackage.js';
export type { DesignWorkflow } from './featurePackage.js';

// Engines — all 14 AI-backed (7 from Phase 3, the other 7 upgraded in Expansion Phase 3)
export { DesignGenerateEngine } from './engines/DesignGenerateEngine.js';
export type { DesignGenerateEngineConfig } from './engines/DesignGenerateEngine.js';
export { DesignLayoutEngine } from './engines/DesignLayoutEngine.js';
export type { DesignLayoutEngineConfig } from './engines/DesignLayoutEngine.js';
export { DesignPosterEngine } from './engines/DesignPosterEngine.js';
export type { DesignPosterEngineConfig } from './engines/DesignPosterEngine.js';
export { DesignFlyerEngine } from './engines/DesignFlyerEngine.js';
export type { DesignFlyerEngineConfig } from './engines/DesignFlyerEngine.js';
export { DesignBannerEngine } from './engines/DesignBannerEngine.js';
export type { DesignBannerEngineConfig } from './engines/DesignBannerEngine.js';
export { DesignSocialPostEngine } from './engines/DesignSocialPostEngine.js';
export type { DesignSocialPostEngineConfig } from './engines/DesignSocialPostEngine.js';
export { DesignTemplateEngine } from './engines/DesignTemplateEngine.js';
export type { DesignTemplateEngineConfig } from './engines/DesignTemplateEngine.js';
export { DesignBrandEngine } from './engines/DesignBrandEngine.js';
export type { DesignBrandEngineConfig } from './engines/DesignBrandEngine.js';
export { DesignLogoEngine } from './engines/DesignLogoEngine.js';
export type { DesignLogoEngineConfig } from './engines/DesignLogoEngine.js';
export { DesignPaletteEngine } from './engines/DesignPaletteEngine.js';
export type { DesignPaletteEngineConfig } from './engines/DesignPaletteEngine.js';
export { DesignTypographyEngine } from './engines/DesignTypographyEngine.js';
export type { DesignTypographyEngineConfig } from './engines/DesignTypographyEngine.js';
export { DesignBusinessCardEngine } from './engines/DesignBusinessCardEngine.js';
export type { DesignBusinessCardEngineConfig } from './engines/DesignBusinessCardEngine.js';
export { DesignMockupEngine } from './engines/DesignMockupEngine.js';
export type { DesignMockupEngineConfig } from './engines/DesignMockupEngine.js';
export { DesignPresentationEngine } from './engines/DesignPresentationEngine.js';
export type { DesignPresentationEngineConfig } from './engines/DesignPresentationEngine.js';

// Workflows — reusable multi-engine compositions (Phase 4)
export { BrandKitWorkflow, BRAND_KIT_WORKFLOW_ID } from './workflows/BrandKitWorkflow.js';
export type {
  BrandKitWorkflowInput,
  BrandKitResult,
  BrandKitWorkflowConfig,
} from './workflows/BrandKitWorkflow.js';
export { PresentationWorkflow, PRESENTATION_WORKFLOW_ID } from './workflows/PresentationWorkflow.js';
export type {
  PresentationWorkflowInput,
  PresentationWorkflowConfig,
} from './workflows/PresentationWorkflow.js';

// Strategies
export { DesignGenerateStrategy, parseDesignGenerateResponse } from './strategies/DesignGenerateStrategy.js';
export type { DesignGenerateStrategyConfig } from './strategies/DesignGenerateStrategy.js';
export { DesignLayoutStrategy, parseDesignLayoutResponse } from './strategies/DesignLayoutStrategy.js';
export type { DesignLayoutStrategyConfig } from './strategies/DesignLayoutStrategy.js';
export { DesignPosterStrategy, parseDesignPosterResponse } from './strategies/DesignPosterStrategy.js';
export type { DesignPosterStrategyConfig } from './strategies/DesignPosterStrategy.js';
export { DesignFlyerStrategy, parseDesignFlyerResponse } from './strategies/DesignFlyerStrategy.js';
export type { DesignFlyerStrategyConfig } from './strategies/DesignFlyerStrategy.js';
export { DesignBannerStrategy, parseDesignBannerResponse } from './strategies/DesignBannerStrategy.js';
export type { DesignBannerStrategyConfig } from './strategies/DesignBannerStrategy.js';
export {
  DesignSocialPostStrategy,
  parseDesignSocialPostResponse,
} from './strategies/DesignSocialPostStrategy.js';
export type { DesignSocialPostStrategyConfig } from './strategies/DesignSocialPostStrategy.js';
export { DesignTemplateStrategy, parseDesignTemplateResponse } from './strategies/DesignTemplateStrategy.js';
export type { DesignTemplateStrategyConfig } from './strategies/DesignTemplateStrategy.js';
export { DesignBrandStrategy, parseDesignBrandResponse } from './strategies/DesignBrandStrategy.js';
export type { DesignBrandStrategyConfig } from './strategies/DesignBrandStrategy.js';
export { DesignLogoStrategy, parseDesignLogoResponse } from './strategies/DesignLogoStrategy.js';
export type { DesignLogoStrategyConfig } from './strategies/DesignLogoStrategy.js';
export { DesignPaletteStrategy, parseDesignPaletteResponse } from './strategies/DesignPaletteStrategy.js';
export type { DesignPaletteStrategyConfig } from './strategies/DesignPaletteStrategy.js';
export {
  DesignTypographyStrategy,
  parseDesignTypographyResponse,
} from './strategies/DesignTypographyStrategy.js';
export type { DesignTypographyStrategyConfig } from './strategies/DesignTypographyStrategy.js';
export {
  DesignBusinessCardStrategy,
  parseDesignBusinessCardResponse,
} from './strategies/DesignBusinessCardStrategy.js';
export type { DesignBusinessCardStrategyConfig } from './strategies/DesignBusinessCardStrategy.js';
export { DesignMockupStrategy, parseDesignMockupResponse } from './strategies/DesignMockupStrategy.js';
export type { DesignMockupStrategyConfig } from './strategies/DesignMockupStrategy.js';
export {
  DesignPresentationStrategy,
  parseDesignPresentationResponse,
} from './strategies/DesignPresentationStrategy.js';
export type { DesignPresentationStrategyConfig } from './strategies/DesignPresentationStrategy.js';

// Prompts
export { DESIGN_GENERATE_PROMPT, DESIGN_GENERATE_PROMPT_ID } from './prompts/designGeneratePrompt.js';
export { DESIGN_LAYOUT_PROMPT, DESIGN_LAYOUT_PROMPT_ID } from './prompts/designLayoutPrompt.js';
export { DESIGN_POSTER_PROMPT, DESIGN_POSTER_PROMPT_ID } from './prompts/designPosterPrompt.js';
export { DESIGN_FLYER_PROMPT, DESIGN_FLYER_PROMPT_ID } from './prompts/designFlyerPrompt.js';
export { DESIGN_BANNER_PROMPT, DESIGN_BANNER_PROMPT_ID } from './prompts/designBannerPrompt.js';
export {
  DESIGN_SOCIAL_POST_PROMPT,
  DESIGN_SOCIAL_POST_PROMPT_ID,
} from './prompts/designSocialPostPrompt.js';
export { DESIGN_TEMPLATE_PROMPT, DESIGN_TEMPLATE_PROMPT_ID } from './prompts/designTemplatePrompt.js';
export { DESIGN_BRAND_PROMPT, DESIGN_BRAND_PROMPT_ID } from './prompts/designBrandPrompt.js';
export { DESIGN_LOGO_PROMPT, DESIGN_LOGO_PROMPT_ID } from './prompts/designLogoPrompt.js';
export { DESIGN_PALETTE_PROMPT, DESIGN_PALETTE_PROMPT_ID } from './prompts/designPalettePrompt.js';
export { DESIGN_TYPOGRAPHY_PROMPT, DESIGN_TYPOGRAPHY_PROMPT_ID } from './prompts/designTypographyPrompt.js';
export {
  DESIGN_BUSINESS_CARD_PROMPT,
  DESIGN_BUSINESS_CARD_PROMPT_ID,
} from './prompts/designBusinessCardPrompt.js';
export { DESIGN_MOCKUP_PROMPT, DESIGN_MOCKUP_PROMPT_ID } from './prompts/designMockupPrompt.js';
export {
  DESIGN_PRESENTATION_PROMPT,
  DESIGN_PRESENTATION_PROMPT_ID,
} from './prompts/designPresentationPrompt.js';

export type { DesignEnginePricing } from './pricing/DesignEnginePricing.js';

// Errors
export { InvalidDesignEngineInputError } from './errors/InvalidDesignEngineInputError.js';
export { UnparsableProviderResponseError } from './errors/UnparsableProviderResponseError.js';

// Note: assertHasNonEmptyStringField, buildGuidanceNote,
// callProviderWithObservability/CallProviderWithObservabilityParams, the
// src/parsing/ toolkit (parseJsonResponse, coerce.ts), and
// src/engines/internal/ helpers (assetFromDescription.ts, readField.ts)
// are deliberately NOT exported — internal plumbing every strategy shares,
// not a capability external consumers need, the same convention
// @aidex/document's and @aidex/content's own audits established.

// Shared value types
export type { DesignOutputFormat } from './types/DesignOutputFormat.js';
export type { DesignDimensions } from './types/DesignDimensions.js';
export type { DesignBranding } from './types/DesignBranding.js';
export type { DesignAsset } from './types/DesignAsset.js';
export type { DesignBrief } from './types/DesignBrief.js';
export type { DesignAssetResult } from './types/DesignAssetResult.js';
export type { DesignColor } from './types/DesignColor.js';
export type { DesignFontPairing } from './types/DesignFontPairing.js';

// Per-engine request/result types
export type { DesignGenerateRequest, DesignGenerateResult } from './types/DesignGenerate.js';
export type { DesignLayoutRequest, DesignLayoutResult } from './types/DesignLayout.js';
export type { DesignBrandRequest, DesignBrandResult } from './types/DesignBrand.js';
export type { DesignPaletteRequest, DesignPaletteResult } from './types/DesignPalette.js';
export type { DesignTypographyRequest, DesignTypographyResult } from './types/DesignTypography.js';
export type { DesignPosterRequest, DesignPosterResult } from './types/DesignPoster.js';
export type { DesignFlyerRequest, DesignFlyerResult } from './types/DesignFlyer.js';
export type { DesignBusinessCardRequest, DesignBusinessCardResult } from './types/DesignBusinessCard.js';
export type { DesignBannerRequest, DesignBannerResult } from './types/DesignBanner.js';
export type { DesignLogoRequest, DesignLogoResult } from './types/DesignLogo.js';
export type { DesignSocialPostRequest, DesignSocialPostResult } from './types/DesignSocialPost.js';
export type { DesignPresentationRequest, DesignPresentationResult } from './types/DesignPresentation.js';
export type { DesignMockupRequest, DesignMockupResult } from './types/DesignMockup.js';
export type { DesignTemplateRequest, DesignTemplateResult } from './types/DesignTemplate.js';
