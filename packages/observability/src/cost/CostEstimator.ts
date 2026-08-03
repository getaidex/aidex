export interface CostEstimateInput {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}

export interface CostEstimate {
  readonly inputCost: number;
  readonly outputCost: number;
  readonly totalCost: number;
}

const TOKENS_PER_MILLION = 1_000_000;

/**
 * Pure math only — no provider-specific pricing table, no hardcoded vendor
 * rates. Callers supply their own price-per-million figures for whichever
 * provider they're estimating.
 */
export function estimateCost(input: CostEstimateInput): CostEstimate {
  const inputCost = (input.inputTokens / TOKENS_PER_MILLION) * input.inputPricePerMillion;
  const outputCost = (input.outputTokens / TOKENS_PER_MILLION) * input.outputPricePerMillion;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
