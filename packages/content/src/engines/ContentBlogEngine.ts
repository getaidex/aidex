import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_BLOG_PROMPT } from '../prompts/contentBlogPrompt.js';
import { ContentBlogStrategy } from '../strategies/ContentBlogStrategy.js';
import type { ContentBlogResult } from '../types/ContentBlog.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentBlogEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentBlogEngine implements Engine<ContentBlogResult> {
  readonly id = ContentEngineId.Blog;
  readonly name = 'Content Blog';
  readonly description = 'Generates a blog post from a topic using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentBlogStrategy;

  constructor(config: ContentBlogEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_BLOG_PROMPT);
    this.strategy = new ContentBlogStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentBlogResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'topic');

    return this.strategy.execute(
      {
        strategy: this.strategy.name,
        input,
        metadata: context.request?.metadata,
        options: context.request?.options,
      },
      context
    );
  }
}
