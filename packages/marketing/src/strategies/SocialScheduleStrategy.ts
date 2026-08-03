import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SOCIAL_SCHEDULE_PROMPT_ID } from '../prompts/socialSchedulePrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { ScheduledPost, SocialPostDraft, SocialScheduleResult } from '../types/social.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { addDays } from '../engines/internal/text.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumberArray, asRecord } from '../parsing/coerce.js';

export interface SocialScheduleStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

function isValidOrder(order: number[], postCount: number): boolean {
  return (
    order.length === postCount &&
    new Set(order).size === postCount &&
    order.every((index) => Number.isInteger(index) && index >= 0 && index < postCount)
  );
}

/**
 * Its own step so parsing is unit-testable independent of any Provider
 * call. `publishAt` per entry stays deterministic (computed from
 * `startDate`, never AI-derived) — only the publishing *order* (a
 * permutation of the original `posts` indices) comes from the provider.
 */
export function parseSocialScheduleResponse(
  strategyName: string,
  response: ProviderResponse,
  posts: readonly SocialPostDraft[],
  startDate: string
): SocialScheduleResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const order = parsed ? asNumberArray(parsed.order) : [];
  if (!isValidOrder(order, posts.length)) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      `expected an "order" array containing each index 0..${posts.length - 1} exactly once`
    );
  }

  const scheduled: ScheduledPost[] = order.map((postIndex, position) => ({
    ...(posts[postIndex] as SocialPostDraft),
    publishAt: addDays(startDate, position),
  }));

  return { scheduled };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class SocialScheduleStrategy implements Strategy<SocialScheduleResult> {
  readonly name = 'marketing-social-schedule';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SocialScheduleStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SocialScheduleResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'startDate');
    assertHasNonEmptyArrayField(this.name, input, 'posts');

    const startDate = input.startDate as string;
    const posts = input.posts as SocialPostDraft[];
    const postsList = posts.map((post, index) => `${index}: [${post.platform}] ${post.content}`).join('\n');

    const promptText = this.prompts.render(SOCIAL_SCHEDULE_PROMPT_ID, { postsList });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSocialScheduleResponse(this.name, response, posts, startDate);
  }
}
