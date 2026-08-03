import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SEO_KEYWORDS_PROMPT_ID } from '../prompts/seoKeywordsPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SeoKeyword, SeoKeywordsResult } from '../types/seo.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asRecordArray, asString } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

const VALID_DIFFICULTIES: ReadonlySet<string> = new Set(['low', 'medium', 'high']);

export interface SeoKeywordsStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseSeoKeywordsResponse(strategyName: string, response: ProviderResponse): SeoKeywordsResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const keywordRecords = parsed ? asRecordArray(parsed.keywords) : [];
  if (keywordRecords.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "keywords" array'
    );
  }

  const keywords: SeoKeyword[] = keywordRecords.map((entry) => {
    const keyword = asString(entry.keyword);
    if (keyword === undefined) {
      throw new UnparsableProviderResponseError(
        strategyName,
        response.content,
        'expected every keyword entry to have a "keyword" string'
      );
    }
    const estimatedVolume = asNumber(entry.estimatedVolume);
    const difficulty = asString(entry.difficulty);
    return {
      keyword,
      ...(estimatedVolume !== undefined ? { estimatedVolume } : {}),
      ...(difficulty !== undefined && VALID_DIFFICULTIES.has(difficulty)
        ? { difficulty: difficulty as SeoKeyword['difficulty'] }
        : {}),
    };
  });

  return { keywords };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class SeoKeywordsStrategy implements Strategy<SeoKeywordsResult> {
  readonly name = 'marketing-seo-keywords';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SeoKeywordsStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SeoKeywordsResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const market = readString(input, 'market');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const marketNote = market ? ` The target market is ${market}.` : '';

    const promptText = this.prompts.render(SEO_KEYWORDS_PROMPT_ID, { brief, audienceNote, marketNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSeoKeywordsResponse(this.name, response);
  }
}
