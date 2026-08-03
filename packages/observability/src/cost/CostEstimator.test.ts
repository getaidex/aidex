import { describe, expect, it } from 'vitest';
import { estimateCost } from './CostEstimator.js';

describe('estimateCost', () => {
  it('computes inputCost/outputCost/totalCost from tokens and per-million pricing', () => {
    const result = estimateCost({
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      inputPricePerMillion: 2,
      outputPricePerMillion: 4,
    });

    expect(result).toEqual({ inputCost: 2, outputCost: 2, totalCost: 4 });
  });

  it('scales linearly with token count', () => {
    const oneMillion = estimateCost({
      inputTokens: 1_000_000,
      outputTokens: 0,
      inputPricePerMillion: 3,
      outputPricePerMillion: 0,
    });
    const halfMillion = estimateCost({
      inputTokens: 500_000,
      outputTokens: 0,
      inputPricePerMillion: 3,
      outputPricePerMillion: 0,
    });

    expect(halfMillion.inputCost).toBeCloseTo(oneMillion.inputCost / 2);
  });

  it('returns zero cost for zero tokens regardless of price', () => {
    const result = estimateCost({
      inputTokens: 0,
      outputTokens: 0,
      inputPricePerMillion: 999,
      outputPricePerMillion: 999,
    });

    expect(result).toEqual({ inputCost: 0, outputCost: 0, totalCost: 0 });
  });

  it('returns zero cost when price-per-million is zero, regardless of token count', () => {
    const result = estimateCost({
      inputTokens: 10_000_000,
      outputTokens: 10_000_000,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
    });

    expect(result).toEqual({ inputCost: 0, outputCost: 0, totalCost: 0 });
  });

  it('sums inputCost and outputCost into totalCost, even with asymmetric pricing', () => {
    const result = estimateCost({
      inputTokens: 200_000,
      outputTokens: 50_000,
      inputPricePerMillion: 1.5,
      outputPricePerMillion: 6,
    });

    expect(result.inputCost).toBeCloseTo(0.3);
    expect(result.outputCost).toBeCloseTo(0.3);
    expect(result.totalCost).toBeCloseTo(result.inputCost + result.outputCost);
  });

  it('is a pure function — identical input always yields identical output', () => {
    const input = {
      inputTokens: 12_345,
      outputTokens: 6_789,
      inputPricePerMillion: 1.23,
      outputPricePerMillion: 4.56,
    };

    expect(estimateCost(input)).toEqual(estimateCost(input));
  });
});
