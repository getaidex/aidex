/**
 * Observability — the unified event bus tracking provider identity, token
 * usage, duration, and cost. subscribe() receives every event; getTimeline()
 * returns the full ordered history.
 *
 * GeminiProvider accepts an ObservabilityBus directly (config.observability)
 * for automatic tracking on every real generate() call — this example
 * drives the bus manually so it never needs a network call to demonstrate
 * all four categories.
 */
import { ObservabilityBus, ExecutionMetrics } from '@aidex/observability';

const bus = new ObservabilityBus();
bus.subscribe((event) => console.log(`[${event.event}]`, event.metadata));

// Track provider identity + outcome.
bus.trackProvider({ provider: 'demo-provider', model: 'demo-model', success: true });

// Track duration via the existing ExecutionMetrics (reused, not duplicated).
const metrics = new ExecutionMetrics();
metrics.recordStart(0);
metrics.recordEnd(180);
bus.trackDurationFromMetrics(metrics, { provider: 'demo-provider' });

// Track token usage.
bus.trackTokens({ provider: 'demo-provider', inputTokens: 42, outputTokens: 128 });

// Track cost, computed via the existing estimateCost() (reused, not duplicated).
bus.trackCostFromEstimate(
  { inputTokens: 42, outputTokens: 128, inputPricePerMillion: 0.1, outputPricePerMillion: 0.4 },
  { provider: 'demo-provider' }
);

console.log('\nFull timeline:', bus.getTimeline().map((event) => event.event));
