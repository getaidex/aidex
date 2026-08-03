/**
 * Mirrors @aidex/document's DocumentEnginePricing shape exactly — provider
 * rates are never hardcoded here either. Whichever Provider a caller
 * configured, they supply that provider's own current per-million-token
 * rates.
 */
export interface ContentEnginePricing {
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}
