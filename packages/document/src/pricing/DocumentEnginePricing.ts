/**
 * Mirrors @aidex/providers' GeminiPricing shape but stays provider-agnostic:
 * whichever Provider a caller configured, they supply that provider's own
 * current per-million-token rates. Never hardcoded to any vendor here.
 */
export interface DocumentEnginePricing {
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}
