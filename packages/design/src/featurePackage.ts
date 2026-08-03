import type { FeaturePackage } from '@aidex/sdk';
import { DESIGN_ENGINE_METADATA } from './metadata.js';
import { DesignGenerateEngine } from './engines/DesignGenerateEngine.js';
import { DesignLayoutEngine } from './engines/DesignLayoutEngine.js';
import { DesignPosterEngine } from './engines/DesignPosterEngine.js';
import { DesignFlyerEngine } from './engines/DesignFlyerEngine.js';
import { DesignBannerEngine } from './engines/DesignBannerEngine.js';
import { DesignSocialPostEngine } from './engines/DesignSocialPostEngine.js';
import { DesignTemplateEngine } from './engines/DesignTemplateEngine.js';
import { DesignBrandEngine } from './engines/DesignBrandEngine.js';
import { DesignLogoEngine } from './engines/DesignLogoEngine.js';
import { DesignPaletteEngine } from './engines/DesignPaletteEngine.js';
import { DesignTypographyEngine } from './engines/DesignTypographyEngine.js';
import { DesignBusinessCardEngine } from './engines/DesignBusinessCardEngine.js';
import { DesignMockupEngine } from './engines/DesignMockupEngine.js';
import { DesignPresentationEngine } from './engines/DesignPresentationEngine.js';
import { DESIGN_GENERATE_PROMPT } from './prompts/designGeneratePrompt.js';
import { DESIGN_LAYOUT_PROMPT } from './prompts/designLayoutPrompt.js';
import { DESIGN_POSTER_PROMPT } from './prompts/designPosterPrompt.js';
import { DESIGN_FLYER_PROMPT } from './prompts/designFlyerPrompt.js';
import { DESIGN_BANNER_PROMPT } from './prompts/designBannerPrompt.js';
import { DESIGN_SOCIAL_POST_PROMPT } from './prompts/designSocialPostPrompt.js';
import { DESIGN_TEMPLATE_PROMPT } from './prompts/designTemplatePrompt.js';
import { DESIGN_BRAND_PROMPT } from './prompts/designBrandPrompt.js';
import { DESIGN_LOGO_PROMPT } from './prompts/designLogoPrompt.js';
import { DESIGN_PALETTE_PROMPT } from './prompts/designPalettePrompt.js';
import { DESIGN_TYPOGRAPHY_PROMPT } from './prompts/designTypographyPrompt.js';
import { DESIGN_BUSINESS_CARD_PROMPT } from './prompts/designBusinessCardPrompt.js';
import { DESIGN_MOCKUP_PROMPT } from './prompts/designMockupPrompt.js';
import { DESIGN_PRESENTATION_PROMPT } from './prompts/designPresentationPrompt.js';
import { BrandKitWorkflow } from './workflows/BrandKitWorkflow.js';
import { PresentationWorkflow } from './workflows/PresentationWorkflow.js';

export type DesignWorkflow = BrandKitWorkflow | PresentationWorkflow;

/**
 * @aidex/design's complete manifest — every engine is a singleton,
 * constructed once here and shared across every EngineRegistry that
 * registers it via AIBuilder.use(DESIGN_FEATURE_PACKAGE). Engines must
 * stay stateless: all execution state belongs on ExecutionContext, never
 * on the engine instance. `workflows` is pass-through only — never
 * registered anywhere by AIBuilder.use(); call each workflow's own
 * `.run(input, provider, options)` directly.
 */
export const DESIGN_FEATURE_PACKAGE: FeaturePackage<DesignWorkflow> = {
  name: '@aidex/design',
  version: '0.2.0-alpha',
  engines: [
    new DesignGenerateEngine(),
    new DesignLayoutEngine(),
    new DesignPosterEngine(),
    new DesignFlyerEngine(),
    new DesignBannerEngine(),
    new DesignSocialPostEngine(),
    new DesignTemplateEngine(),
    new DesignBrandEngine(),
    new DesignLogoEngine(),
    new DesignPaletteEngine(),
    new DesignTypographyEngine(),
    new DesignBusinessCardEngine(),
    new DesignMockupEngine(),
    new DesignPresentationEngine(),
  ],
  prompts: [
    DESIGN_GENERATE_PROMPT,
    DESIGN_LAYOUT_PROMPT,
    DESIGN_POSTER_PROMPT,
    DESIGN_FLYER_PROMPT,
    DESIGN_BANNER_PROMPT,
    DESIGN_SOCIAL_POST_PROMPT,
    DESIGN_TEMPLATE_PROMPT,
    DESIGN_BRAND_PROMPT,
    DESIGN_LOGO_PROMPT,
    DESIGN_PALETTE_PROMPT,
    DESIGN_TYPOGRAPHY_PROMPT,
    DESIGN_BUSINESS_CARD_PROMPT,
    DESIGN_MOCKUP_PROMPT,
    DESIGN_PRESENTATION_PROMPT,
  ],
  metadata: DESIGN_ENGINE_METADATA,
  workflows: [new BrandKitWorkflow(), new PresentationWorkflow()],
};
