/**
 * Mirrors @aidex/document's/@aidex/content's/@aidex/design's identically-shaped
 * pricing type — provider rates are never hardcoded here either. Whichever
 * Provider a caller configured, they supply that provider's own current
 * per-million-token rates.
 */
export interface MediaEnginePricing {
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}
