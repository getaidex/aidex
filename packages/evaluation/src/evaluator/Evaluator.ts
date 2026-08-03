import { estimateCost } from '@aidex/observability';
import type { BenchmarkCase, BenchmarkOptions } from '../types/BenchmarkCase.js';
import type { BenchmarkResult, BenchmarkSummary } from '../types/BenchmarkResult.js';

function average(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function summarize<TResult>(
  caseName: string,
  runs: BenchmarkResult<TResult>[]
): BenchmarkSummary<TResult> {
  const successes = runs.filter((run) => run.success);
  const successRate = runs.length === 0 ? 0 : successes.length / runs.length;

  const durations = successes
    .map((run) => run.durationMs)
    .filter((value): value is number => value !== undefined);
  const qualityScores = successes
    .map((run) => run.qualityScore)
    .filter((value): value is number => value !== undefined);
  const costs = successes
    .map((run) => run.cost?.totalCost)
    .filter((value): value is number => value !== undefined);

  return {
    caseName,
    runs,
    successRate,
    averageDurationMs: average(durations),
    averageQualityScore: average(qualityScores),
    averageCost: average(costs),
  };
}

/**
 * Benchmarks Engines (or anything else exposed as `() => Promise<TResult>`)
 * — tracking output quality, token usage, cost, latency, and success rate —
 * and allows comparing providers/engines/strategies by running several
 * named BenchmarkCases side by side via compare().
 */
export class Evaluator {
  async run<TResult>(
    benchmarkCase: BenchmarkCase<TResult>,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkSummary<TResult>> {
    const runCount = options.runs ?? 1;
    const now = options.now ?? Date.now;
    const results: BenchmarkResult<TResult>[] = [];

    for (let i = 0; i < runCount; i += 1) {
      const startedAt = now();

      try {
        const result = await benchmarkCase.execute();
        const durationMs = now() - startedAt;
        const qualityScore = benchmarkCase.scoreOutput?.(result);
        const tokenUsage = benchmarkCase.estimateTokens?.(result);
        const cost =
          tokenUsage && options.pricing
            ? estimateCost({ ...tokenUsage, ...options.pricing })
            : undefined;

        results.push({
          caseName: benchmarkCase.name,
          success: true,
          result,
          durationMs,
          qualityScore,
          inputTokens: tokenUsage?.inputTokens,
          outputTokens: tokenUsage?.outputTokens,
          cost,
        });
      } catch (error) {
        results.push({
          caseName: benchmarkCase.name,
          success: false,
          error,
          durationMs: now() - startedAt,
        });
      }
    }

    return summarize(benchmarkCase.name, results);
  }

  async compare<TResult>(
    cases: readonly BenchmarkCase<TResult>[],
    options?: BenchmarkOptions
  ): Promise<BenchmarkSummary<TResult>[]> {
    const summaries: BenchmarkSummary<TResult>[] = [];
    for (const benchmarkCase of cases) {
      summaries.push(await this.run(benchmarkCase, options));
    }
    return summaries;
  }
}
