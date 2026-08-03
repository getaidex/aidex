import type { FeaturePackage } from '@aidex/sdk';
import { CONTENT_ENGINE_METADATA } from './metadata.js';
import { ContentGenerateEngine } from './engines/ContentGenerateEngine.js';
import { ContentRewriteEngine } from './engines/ContentRewriteEngine.js';
import { ContentExpandEngine } from './engines/ContentExpandEngine.js';
import { ContentShortenEngine } from './engines/ContentShortenEngine.js';
import { ContentTranslateEngine } from './engines/ContentTranslateEngine.js';
import { ContentSummarizeEngine } from './engines/ContentSummarizeEngine.js';
import { ContentToneEngine } from './engines/ContentToneEngine.js';
import { ContentSeoEngine } from './engines/ContentSeoEngine.js';
import { ContentBlogEngine } from './engines/ContentBlogEngine.js';
import { ContentEmailEngine } from './engines/ContentEmailEngine.js';
import { ContentSocialEngine } from './engines/ContentSocialEngine.js';
import { ContentProductDescriptionEngine } from './engines/ContentProductDescriptionEngine.js';
import { ContentHeadlineEngine } from './engines/ContentHeadlineEngine.js';
import { ContentTaglineEngine } from './engines/ContentTaglineEngine.js';
import { CONTENT_GENERATE_PROMPT } from './prompts/contentGeneratePrompt.js';
import { CONTENT_REWRITE_PROMPT } from './prompts/contentRewritePrompt.js';
import { CONTENT_EXPAND_PROMPT } from './prompts/contentExpandPrompt.js';
import { CONTENT_SHORTEN_PROMPT } from './prompts/contentShortenPrompt.js';
import { CONTENT_TRANSLATE_PROMPT } from './prompts/contentTranslatePrompt.js';
import { CONTENT_SUMMARIZE_PROMPT } from './prompts/contentSummarizePrompt.js';
import { CONTENT_TONE_PROMPT } from './prompts/contentTonePrompt.js';
import { CONTENT_SEO_PROMPT } from './prompts/contentSeoPrompt.js';
import { CONTENT_BLOG_PROMPT } from './prompts/contentBlogPrompt.js';
import { CONTENT_EMAIL_PROMPT } from './prompts/contentEmailPrompt.js';
import { CONTENT_SOCIAL_PROMPT } from './prompts/contentSocialPrompt.js';
import { CONTENT_PRODUCT_DESCRIPTION_PROMPT } from './prompts/contentProductDescriptionPrompt.js';
import { CONTENT_HEADLINE_PROMPT } from './prompts/contentHeadlinePrompt.js';
import { CONTENT_TAGLINE_PROMPT } from './prompts/contentTaglinePrompt.js';
import { ContentBlogWorkflow } from './workflows/ContentBlogWorkflow.js';
import { ContentSocialWorkflow } from './workflows/ContentSocialWorkflow.js';
import { ContentEmailWorkflow } from './workflows/ContentEmailWorkflow.js';
import { ContentRepurposeWorkflow } from './workflows/ContentRepurposeWorkflow.js';
import { ContentArticleWorkflow } from './workflows/ContentArticleWorkflow.js';
import { ContentProductLaunchWorkflow } from './workflows/ContentProductLaunchWorkflow.js';

export type ContentWorkflow =
  | ContentBlogWorkflow
  | ContentSocialWorkflow
  | ContentEmailWorkflow
  | ContentRepurposeWorkflow
  | ContentArticleWorkflow
  | ContentProductLaunchWorkflow;

/**
 * @aidex/content's complete manifest — every engine is a singleton,
 * constructed once here and shared across every EngineRegistry that
 * registers it via AIBuilder.use(CONTENT_FEATURE_PACKAGE). Engines must
 * stay stateless: all execution state belongs on ExecutionContext, never
 * on the engine instance. `workflows` is pass-through only — never
 * registered anywhere by AIBuilder.use(); call each workflow's own
 * `.run(input, provider, options)` directly.
 */
export const CONTENT_FEATURE_PACKAGE: FeaturePackage<ContentWorkflow> = {
  name: '@aidex/content',
  version: '0.2.0-alpha',
  engines: [
    new ContentGenerateEngine(),
    new ContentRewriteEngine(),
    new ContentExpandEngine(),
    new ContentShortenEngine(),
    new ContentTranslateEngine(),
    new ContentSummarizeEngine(),
    new ContentToneEngine(),
    new ContentSeoEngine(),
    new ContentBlogEngine(),
    new ContentEmailEngine(),
    new ContentSocialEngine(),
    new ContentProductDescriptionEngine(),
    new ContentHeadlineEngine(),
    new ContentTaglineEngine(),
  ],
  prompts: [
    CONTENT_GENERATE_PROMPT,
    CONTENT_REWRITE_PROMPT,
    CONTENT_EXPAND_PROMPT,
    CONTENT_SHORTEN_PROMPT,
    CONTENT_TRANSLATE_PROMPT,
    CONTENT_SUMMARIZE_PROMPT,
    CONTENT_TONE_PROMPT,
    CONTENT_SEO_PROMPT,
    CONTENT_BLOG_PROMPT,
    CONTENT_EMAIL_PROMPT,
    CONTENT_SOCIAL_PROMPT,
    CONTENT_PRODUCT_DESCRIPTION_PROMPT,
    CONTENT_HEADLINE_PROMPT,
    CONTENT_TAGLINE_PROMPT,
  ],
  metadata: CONTENT_ENGINE_METADATA,
  workflows: [
    new ContentBlogWorkflow(),
    new ContentSocialWorkflow(),
    new ContentEmailWorkflow(),
    new ContentRepurposeWorkflow(),
    new ContentArticleWorkflow(),
    new ContentProductLaunchWorkflow(),
  ],
};
