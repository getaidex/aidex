/**
 * Mirrors @aidex/document's/@aidex/content's identically-shaped pricing
 * type — provider rates are never hardcoded here either. Whichever
 * Provider a caller configured, they supply that provider's own current
 * per-million-token rates.
 */
export interface DesignEnginePricing {
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}
