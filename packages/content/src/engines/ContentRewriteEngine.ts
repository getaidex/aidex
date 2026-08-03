import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_REWRITE_PROMPT } from '../prompts/contentRewritePrompt.js';
import { ContentRewriteStrategy } from '../strategies/ContentRewriteStrategy.js';
import type { ContentRewriteResult } from '../types/ContentRewrite.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentRewriteEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * The reference AI-powered Content Engine — the template every remaining
 * engine in this pack should follow, mirroring @aidex/document's
 * DocumentSummarizeEngine exactly. Owns a private PromptRegistry (this
 * engine's one prompt, registered once at construction) and a
 * ContentRewriteStrategy built from it, then on execute():
 *
 *   1. validates context.request?.input (fail fast, before touching a Strategy)
 *   2. calls strategy.execute(request, context) directly — the exact
 *      two-argument contract @aidex/core's own Aidex.execute() uses to
 *      dispatch a Strategy, so this engine composes with the platform the
 *      same way any external application does, without constructing a
 *      redundant nested Aidex kernel just to reach a Strategy it already
 *      holds a direct reference to.
 *
 * The Strategy — not this Engine — owns prompt rendering, the actual
 * Provider call, response parsing, and observability.
 */
export class ContentRewriteEngine implements Engine<ContentRewriteResult> {
  readonly id = ContentEngineId.Rewrite;
  readonly name = 'Content Rewrite';
  readonly description = 'Rewrites existing content using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentRewriteStrategy;

  constructor(config: ContentRewriteEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_REWRITE_PROMPT);
    this.strategy = new ContentRewriteStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentRewriteResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'content');

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
