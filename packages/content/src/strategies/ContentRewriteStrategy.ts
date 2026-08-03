import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_REWRITE_PROMPT_ID } from '../prompts/contentRewritePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentRewriteResult } from '../types/ContentRewrite.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface ContentRewriteStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so a future strategy that needs real JSON parsing has a named place to put it, and so parsing is unit-testable on its own — the same reasoning @aidex/document's parseDocumentSummarizeResponse documents. */
export function parseContentRewriteResponse(response: ProviderResponse): ContentRewriteResult {
  return { rewrittenContent: response.content.trim() };
}

/**
 * The reference AI-backed Strategy for @aidex/content: renders the
 * registered `content.rewrite` prompt, calls whichever Provider
 * context.provider holds (via the shared callProviderWithObservability,
 * which also records provider/duration/tokens/cost via an optional
 * ObservabilityBus), then parses the response into ContentRewriteResult.
 * Never imports a vendor SDK; never branches on context.provider.name.
 * Structurally identical to @aidex/document's DocumentSummarizeStrategy —
 * both have a single required string field and a single-string result, so
 * both need nothing beyond a trim().
 */
export class ContentRewriteStrategy implements Strategy<ContentRewriteResult> {
  readonly name = 'content-rewrite';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentRewriteStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentRewriteResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    // Only `content` was validated above; `instructions` is optional and
    // read defensively rather than trusted via a blind cast.
    const content = input.content as string;
    const instructions = typeof input.instructions === 'string' ? input.instructions : undefined;

    const promptText = this.prompts.render(CONTENT_REWRITE_PROMPT_ID, {
      content,
      instructionsNote: instructions !== undefined ? ` Follow these instructions: ${instructions}` : '',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentRewriteResponse(response);
  }
}
