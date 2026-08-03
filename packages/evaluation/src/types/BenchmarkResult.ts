import type { CostEstimate } from '@aidex/observability';

/** One individual run's outcome. */
export interface BenchmarkResult<TResult = unknown> {
  readonly caseName: string;
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: unknown;
  readonly durationMs?: number;
  readonly qualityScore?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cost?: CostEstimate;
}

/** Aggregated across every run of one BenchmarkCase. */
export interface BenchmarkSummary<TResult = unknown> {
  readonly caseName: string;
  readonly runs: readonly BenchmarkResult<TResult>[];
  readonly successRate: number;
  readonly averageDurationMs?: number;
  readonly averageQualityScore?: number;
  readonly averageCost?: number;
}
