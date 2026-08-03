/**
 * 06 — Observability
 *
 * GeminiProvider auto-instruments itself when built with an
 * ObservabilityBus: every generate() call emits provider/duration/
 * tokens/cost events with zero manual wiring. StubProvider does not —
 * it's a deterministic stand-in, not a billed API call, so there's
 * nothing real to report. This example shows both paths honestly: real
 * auto-instrumentation with a key, manual instrumentation without one.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { ObservabilityBus, ExecutionMetrics } from '@aidex/observability';

const illustrativePricing = { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 };

async function main() {
  const bus = new ObservabilityBus();
  bus.subscribe((event) => {
    console.log(`[event] ${event.event}`, event.metadata ?? {});
  });

  const apiKey = process.env.GEMINI_API_KEY;
  const question = 'What is one benefit of static typing?';

  if (apiKey) {
    console.log('Using GeminiProvider — it auto-reports to the bus on every call.\n');
    const provider = new GeminiProvider({ apiKey, observability: bus, pricing: illustrativePricing });
    const ai = new AIBuilder().provider(provider).build();
    const response = await ai.text(question);
    console.log(`\nResponse: ${response}`);
  } else {
    console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).');
    console.log('StubProvider does not auto-instrument, so this manually');
    console.log('records the same event shape GeminiProvider would emit automatically.\n');

    const provider = new StubProvider();
    const ai = new AIBuilder().provider(provider).build();

    const metrics = new ExecutionMetrics();
    metrics.recordStart();
    const response = await ai.text(question);
    metrics.recordEnd();

    bus.trackProvider({ provider: provider.name, success: true });
    bus.trackDurationFromMetrics(metrics, { provider: provider.name });
    bus.trackCostFromEstimate(
      { inputTokens: Math.ceil(question.length / 4), outputTokens: Math.ceil(response.length / 4), ...illustrativePricing },
      { provider: provider.name }
    );

    console.log(`\nResponse: ${response}`);
  }

  console.log('\nFull timeline:');
  for (const event of bus.getTimeline()) {
    console.log(' ', event);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
