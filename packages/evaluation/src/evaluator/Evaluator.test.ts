import { describe, expect, it } from 'vitest';
import type { BenchmarkCase } from '../types/BenchmarkCase.js';
import { Evaluator } from './Evaluator.js';

function makeClock(...timestamps: number[]): () => number {
  let index = 0;
  return () => {
    const value = timestamps[Math.min(index, timestamps.length - 1)];
    index += 1;
    return value ?? 0;
  };
}

describe('Evaluator', () => {
  describe('run() — single case', () => {
    it('runs once by default and reports success', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'echo',
        async execute() {
          return 'hello';
        },
      };

      const summary = await evaluator.run(benchmarkCase);

      expect(summary.caseName).toBe('echo');
      expect(summary.runs).toHaveLength(1);
      expect(summary.runs[0]).toMatchObject({ success: true, result: 'hello' });
      expect(summary.successRate).toBe(1);
    });

    it('repeats the case `runs` times', async () => {
      const evaluator = new Evaluator();
      let calls = 0;
      const benchmarkCase: BenchmarkCase<number> = {
        name: 'counter',
        async execute() {
          calls += 1;
          return calls;
        },
      };

      const summary = await evaluator.run(benchmarkCase, { runs: 3 });

      expect(calls).toBe(3);
      expect(summary.runs.map((r) => r.result)).toEqual([1, 2, 3]);
    });

    it('tracks latency deterministically via an injectable clock', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'timed',
        async execute() {
          return 'ok';
        },
      };

      const summary = await evaluator.run(benchmarkCase, { now: makeClock(0, 150) });

      expect(summary.runs[0]?.durationMs).toBe(150);
      expect(summary.averageDurationMs).toBe(150);
    });

    it('tracks output quality via scoreOutput()', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'graded',
        async execute() {
          return 'a decent answer';
        },
        scoreOutput: (result) => result.length,
      };

      const summary = await evaluator.run(benchmarkCase);

      expect(summary.runs[0]?.qualityScore).toBe('a decent answer'.length);
      expect(summary.averageQualityScore).toBe('a decent answer'.length);
    });

    it('tracks token usage and cost via estimateTokens() + options.pricing', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'priced',
        async execute() {
          return 'ok';
        },
        estimateTokens: () => ({ inputTokens: 1_000_000, outputTokens: 500_000 }),
      };

      const summary = await evaluator.run(benchmarkCase, {
        pricing: { inputPricePerMillion: 2, outputPricePerMillion: 4 },
      });

      expect(summary.runs[0]?.inputTokens).toBe(1_000_000);
      expect(summary.runs[0]?.outputTokens).toBe(500_000);
      expect(summary.runs[0]?.cost).toEqual({ inputCost: 2, outputCost: 2, totalCost: 4 });
      expect(summary.averageCost).toBe(4);
    });

    it('omits cost when estimateTokens() is supplied but no pricing is given', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'unpriced',
        async execute() {
          return 'ok';
        },
        estimateTokens: () => ({ inputTokens: 100, outputTokens: 100 }),
      };

      const summary = await evaluator.run(benchmarkCase);

      expect(summary.runs[0]?.cost).toBeUndefined();
    });

    it('tracks success rate across a mix of passing and failing runs', async () => {
      const evaluator = new Evaluator();
      let attempt = 0;
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'flaky',
        async execute() {
          attempt += 1;
          if (attempt % 2 === 0) {
            throw new Error('transient failure');
          }
          return 'ok';
        },
      };

      const summary = await evaluator.run(benchmarkCase, { runs: 4 });

      expect(summary.successRate).toBe(0.5);
      expect(summary.runs.map((r) => r.success)).toEqual([true, false, true, false]);
    });

    it('records the error on a failing run without throwing out of run()', async () => {
      const evaluator = new Evaluator();
      const failure = new Error('engine blew up');
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'always-fails',
        async execute() {
          throw failure;
        },
      };

      const summary = await evaluator.run(benchmarkCase);

      expect(summary.successRate).toBe(0);
      expect(summary.runs[0]?.error).toBe(failure);
      expect(summary.runs[0]?.result).toBeUndefined();
    });

    it('reports successRate 0 and no averages when every run fails', async () => {
      const evaluator = new Evaluator();
      const benchmarkCase: BenchmarkCase<string> = {
        name: 'always-fails',
        async execute() {
          throw new Error('nope');
        },
      };

      const summary = await evaluator.run(benchmarkCase, { runs: 2 });

      expect(summary.successRate).toBe(0);
      expect(summary.averageDurationMs).toBeUndefined();
      expect(summary.averageQualityScore).toBeUndefined();
      expect(summary.averageCost).toBeUndefined();
    });
  });

  describe('compare() — multiple cases (e.g. comparing providers)', () => {
    it('runs every case and returns one summary per case, in order', async () => {
      const evaluator = new Evaluator();
      const providerA: BenchmarkCase<string> = {
        name: 'provider-a',
        async execute() {
          return 'A says hi';
        },
      };
      const providerB: BenchmarkCase<string> = {
        name: 'provider-b',
        async execute() {
          throw new Error('provider-b is down');
        },
      };

      const summaries = await evaluator.compare([providerA, providerB]);

      expect(summaries.map((s) => s.caseName)).toEqual(['provider-a', 'provider-b']);
      expect(summaries[0]?.successRate).toBe(1);
      expect(summaries[1]?.successRate).toBe(0);
    });

    it('applies the same options (runs, pricing, clock) to every compared case', async () => {
      const evaluator = new Evaluator();
      const makeCase = (name: string): BenchmarkCase<string> => ({
        name,
        async execute() {
          return name;
        },
        estimateTokens: () => ({ inputTokens: 1_000_000, outputTokens: 0 }),
      });

      const summaries = await evaluator.compare([makeCase('a'), makeCase('b')], {
        runs: 2,
        pricing: { inputPricePerMillion: 1, outputPricePerMillion: 1 },
      });

      expect(summaries[0]?.runs).toHaveLength(2);
      expect(summaries[0]?.averageCost).toBe(1);
      expect(summaries[1]?.averageCost).toBe(1);
    });
  });
});
