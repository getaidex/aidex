/**
 * One benchmarkable unit of work. `execute()` is deliberately just
 * `() => Promise<TResult>` — the Evaluator never imports @aidex/engines,
 * @aidex/providers, or @aidex/strategies; the caller's closure is whatever it
 * needs to be (an Engine.execute(context) call, an AI.text() call, a raw
 * Provider.generate() call) to compare. This is how "comparing providers"
 * works: define one BenchmarkCase per provider/engine/strategy variant,
 * each wrapping a call through that variant, and hand them all to
 * Evaluator.compare().
 */
export interface BenchmarkCase<TResult = unknown> {
  readonly name: string;
  execute(): Promise<TResult>;
  /** Optional quality scorer — the framework has no automatic quality judge. */
  scoreOutput?(result: TResult): number;
  /** Optional token-usage extractor, feeding trackCost via @aidex/observability's estimateCost. */
  estimateTokens?(result: TResult): { inputTokens: number; outputTokens: number };
}

export interface BenchmarkOptions {
  /** How many times to repeat this case. Defaults to 1. */
  readonly runs?: number;
  /** Required for cost tracking — only used if a case's estimateTokens() is also supplied. */
  readonly pricing?: { inputPricePerMillion: number; outputPricePerMillion: number };
  /** Injectable clock for deterministic latency in tests. Defaults to Date.now. */
  readonly now?: () => number;
}
