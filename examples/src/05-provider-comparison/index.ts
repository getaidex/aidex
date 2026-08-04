/**
 * 05 — Provider Comparison
 *
 * Aidex ships exactly two providers today: GeminiProvider and
 * StubProvider — no OpenAI/Anthropic/other vendor. So this isn't a
 * "which vendor is best" shootout; it's the *mechanics* of comparing
 * providers side by side using @aidex/evaluation's Evaluator, which
 * you'd reuse the moment a second real vendor Provider exists (see
 * 04-custom-provider for how to write one).
 *
 * With GEMINI_API_KEY: compares two Gemini model configs plus a Stub
 * baseline. Without one: compares two demo-provider variants (with
 * different simulated latency) plus Stub, so the comparison mechanics
 * still run end to end — the printed note makes clear that real
 * numbers require a key.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { Evaluator, type BenchmarkCase } from '@aidex/evaluation';

const question = 'In one sentence, what makes TypeScript different from JavaScript?';

// Illustrative pricing only — check your provider's current pricing page
// for real per-token rates before using this shape for real cost tracking.
const illustrativePricing = { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 };

function delayedDemoProvider(name: string, delayMs: number): Provider {
  return {
    name,
    async generate(_prompt) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { content: `[${name} demo answer] TypeScript adds static types on top of JavaScript.` };
    },
  };
}

function buildCases(): BenchmarkCase<string>[] {
  const apiKey = process.env.GEMINI_API_KEY;

  const providers: { label: string; provider: Provider }[] = apiKey
    ? [
        { label: 'gemini-2.0-flash', provider: new GeminiProvider({ apiKey, model: 'gemini-2.0-flash' }) },
        { label: 'gemini-1.5-flash', provider: new GeminiProvider({ apiKey, model: 'gemini-1.5-flash' }) },
        { label: 'stub-baseline', provider: new StubProvider() },
      ]
    : [
        { label: 'demo-fast', provider: delayedDemoProvider('demo-fast', 50) },
        { label: 'demo-slow', provider: delayedDemoProvider('demo-slow', 400) },
        { label: 'stub-baseline', provider: new StubProvider() },
      ];

  return providers.map(({ label, provider }) => ({
    name: label,
    async execute() {
      const ai = new AIBuilder().provider(provider).build();
      return ai.text(question);
    },
    estimateTokens: (result: string) => ({
      inputTokens: Math.ceil(question.length / 4),
      outputTokens: Math.ceil(result.length / 4),
    }),
  }));
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — comparing demo-provider variants (see source for why).\n');
  }
  console.log(`Question: ${question}\n`);

  const evaluator = new Evaluator();
  const summaries = await evaluator.compare(buildCases(), { pricing: illustrativePricing });

  for (const summary of summaries) {
    console.log(`— ${summary.caseName} —`);
    console.log(`  success rate:   ${(summary.successRate * 100).toFixed(0)}%`);
    console.log(`  avg duration:   ${summary.averageDurationMs?.toFixed(1) ?? 'n/a'} ms`);
    console.log(`  avg cost:       $${summary.averageCost?.toFixed(6) ?? 'n/a'}`);
    const firstResult = summary.runs[0]?.result;
    console.log(`  response:       ${firstResult}`);
    console.log();
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
