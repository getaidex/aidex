import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_EMAIL_PROMPT_ID } from '../prompts/contentEmailPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentEmailResult } from '../types/ContentEmail.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface ContentEmailStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentEmailResponse(strategyName: string, response: ProviderResponse): ContentEmailResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const subject = parsed ? asString(parsed.subject) : undefined;
  const body = parsed ? asString(parsed.body) : undefined;

  if (subject === undefined || body === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with "subject" and "body" strings'
    );
  }

  return { subject, body };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentEmailStrategy implements Strategy<ContentEmailResult> {
  readonly name = 'content-email';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentEmailStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentEmailResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'purpose');

    const purpose = input.purpose as string;
    const tone = typeof input.tone === 'string' ? input.tone : undefined;
    const recipientContext = typeof input.recipientContext === 'string' ? input.recipientContext : undefined;

    const parts: string[] = [];
    if (tone) {
      parts.push(`use a ${tone} tone`);
    }
    if (recipientContext) {
      parts.push(`consider this context about the recipient: ${recipientContext}`);
    }
    const guidance = parts.length > 0 ? ` Please ${parts.join('; ')}.` : '';

    const promptText = this.prompts.render(CONTENT_EMAIL_PROMPT_ID, { purpose, guidance });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentEmailResponse(this.name, response);
  }
}
