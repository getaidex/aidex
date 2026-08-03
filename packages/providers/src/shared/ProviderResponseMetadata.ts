/**
 * The common shape a Provider's ProviderResponse.metadata should follow,
 * regardless of vendor — so an application reading response.metadata.usage
 * doesn't need to know whether the provider was Gemini, OpenAI, or
 * anything else. Every field but `provider` is optional: a provider
 * populates whichever it genuinely has (a deterministic stub has no real
 * model/usage; a real vendor call usually has both). The index signature
 * still allows a provider to attach vendor-specific extras beyond this
 * standard set — standardization here means "the common fields share one
 * name and shape," not "no other field may ever appear."
 */
export interface ProviderResponseMetadata {
  readonly provider: string;
  readonly model?: string;
  readonly finishReason?: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
  readonly [key: string]: unknown;
}
