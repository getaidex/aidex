import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_BLOG_PROMPT_ID } from '../prompts/contentBlogPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentBlogResult } from '../types/ContentBlog.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString, asStringArray } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface ContentBlogStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentBlogResponse(strategyName: string, response: ProviderResponse): ContentBlogResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const title = parsed ? asString(parsed.title) : undefined;
  const content = parsed ? asString(parsed.content) : undefined;

  if (title === undefined || content === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with "title" and "content" strings'
    );
  }

  return { title, content };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentBlogStrategy implements Strategy<ContentBlogResult> {
  readonly name = 'content-blog';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentBlogStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentBlogResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'topic');

    const topic = input.topic as string;
    const guidance = buildGuidanceNote({
      keywords: asStringArray(input.keywords),
      tone: typeof input.tone === 'string' ? input.tone : undefined,
      length: asNumber(input.targetLength),
    });

    const promptText = this.prompts.render(CONTENT_BLOG_PROMPT_ID, { topic, guidance });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentBlogResponse(this.name, response);
  }
}
