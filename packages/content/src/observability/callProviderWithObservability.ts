import type { Metadata, ProviderResponse } from '@aidex/core';
import { ExecutionMetrics, type ObservabilityBus } from '@aidex/observability';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';

export interface CallProviderWithObservabilityParams {
  readonly strategyName: string;
  readonly providerName: string;
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
  readonly call: () => Promise<ProviderResponse>;
}

interface ProviderUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

/** Duck-typed, not imported from @aidex/providers — this package stays provider-agnostic. */
function extractUsage(metadata: Metadata | undefined): ProviderUsage | undefined {
  const usage = metadata?.usage;
  if (typeof usage !== 'object' || usage === null) {
    return undefined;
  }
  const { inputTokens, outputTokens, totalTokens } = usage as Record<string, unknown>;
  return {
    inputTokens: typeof inputTokens === 'number' ? inputTokens : undefined,
    outputTokens: typeof outputTokens === 'number' ? outputTokens : undefined,
    totalTokens: typeof totalTokens === 'number' ? totalTokens : undefined,
  };
}

/**
 * Wraps one `context.provider.generate()` call with timing plus
 * provider/duration/tokens/cost/error observability. Ported directly from
 * @aidex/document's identically-named, identically-shaped helper — that
 * package proved this pattern across six strategies before this one
 * existed, so this starts from the mature shared-helper shape instead of
 * repeating @aidex/document's own Phase 3→Phase 4 path (inline first,
 * extract once duplication showed up). Every AI-backed Strategy this
 * package adds should reuse this rather than inlining it again.
 */
export async function callProviderWithObservability(
  params: CallProviderWithObservabilityParams
): Promise<ProviderResponse> {
  const { strategyName, providerName, pricing, observability: bus, call } = params;
  const metrics = new ExecutionMetrics();
  metrics.recordStart();

  let response: ProviderResponse;
  try {
    response = await call();
  } catch (error) {
    metrics.recordEnd();
    if (bus) {
      bus.trackProvider({ provider: providerName, strategy: strategyName, success: false });
      bus.trackDurationFromMetrics(metrics, { provider: providerName, strategy: strategyName });
      bus.trackError({ provider: providerName, strategy: strategyName, error });
    }
    throw error;
  }

  metrics.recordEnd();
  if (bus) {
    const usage = extractUsage(response.metadata);

    bus.trackProvider({ provider: providerName, strategy: strategyName, success: true });
    bus.trackDurationFromMetrics(metrics, { provider: providerName, strategy: strategyName });

    if (usage) {
      bus.trackTokens({ provider: providerName, strategy: strategyName, ...usage });

      if (pricing && usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
        bus.trackCostFromEstimate(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            inputPricePerMillion: pricing.inputPricePerMillion,
            outputPricePerMillion: pricing.outputPricePerMillion,
          },
          { provider: providerName, strategy: strategyName }
        );
      }
    }
  }

  return response;
}
