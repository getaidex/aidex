/**
 * 15 — Real-World Assistant (Capstone)
 *
 * Every piece here was taught individually in an earlier example:
 * provider selection (03), an optional system prompt (03), a versioned
 * prompt template (02), the AIBuilder/AI façade (01), observability
 * (06), and — when the user pastes a long text — the document.summarize
 * engine (07). This example's only job is showing them composed into
 * one small interactive assistant, looping until "exit". Nothing new is
 * introduced here; if a line of code needs an unfamiliar concept
 * explained, that's a bug in this file, not in the reader's understanding.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { PromptRegistry, type PromptTemplate } from '@aidex/prompts';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';
import { ObservabilityBus, ExecutionMetrics } from '@aidex/observability';

const color = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

// A single shared readline interface, not one created per prompt:
// rl.question() only reliably resolves once per process when stdin is
// piped (e.g. automated smoke tests) — every prompt after the first
// silently hangs forever. Reading through the interface's line
// iterator instead works correctly both interactively and piped.
// Returns null when stdin has no more input (EOF) rather than looping.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

const requestTemplate: PromptTemplate = {
  id: 'assistant-request',
  version: '1.0.0',
  template: '{{systemPrompt}}\n\nUser request: {{request}}',
  variables: ['systemPrompt', 'request'],
};

async function chooseProvider(bus: ObservabilityBus): Promise<Provider> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(color.yellow('No GEMINI_API_KEY found — running with StubProvider (demo mode).\n'));
    return new StubProvider();
  }
  const choice = await ask('Choose a provider — [1] Gemini  [2] Stub (demo): ');
  if (choice === '2') return new StubProvider();
  return new GeminiProvider({ apiKey, observability: bus, pricing: { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 } });
}

async function main() {
  const bus = new ObservabilityBus();
  const prompts = new PromptRegistry();
  prompts.register(requestTemplate);

  const provider = await chooseProvider(bus);
  const ai = new AIBuilder().provider(provider).use(DOCUMENT_FEATURE_PACKAGE).build();

  const systemPrompt =
    (await ask('Optional system prompt (press Enter for a sensible default): ')) ||
    'You are a concise, helpful assistant for a software developer.';

  console.log(color.dim("\nCommands: type a request, 'summarize' to paste text to summarize, or 'exit' to quit.\n"));

  while (true) {
    const request = await ask(color.cyan('You: '));
    if (request === null || request.toLowerCase() === 'exit' || request.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }
    if (!request) continue;

    const metrics = new ExecutionMetrics();
    metrics.recordStart();

    if (request.toLowerCase() === 'summarize') {
      const text = (await ask('Paste the text to summarize: ')) ?? '';
      const result = (await ai.engine(DocumentEngineId.Summarize).execute({
        source: { content: text, mimeType: 'text/plain' },
      })) as { summary: string };
      metrics.recordEnd();
      bus.trackDurationFromMetrics(metrics, { operation: 'document.summarize' });

      console.log(`${color.dim('Assistant:')} ${result.summary}`);
    } else {
      const rendered = prompts.render('assistant-request', { systemPrompt, request });
      const reply = await ai.text(rendered);
      metrics.recordEnd();
      bus.trackDurationFromMetrics(metrics, { operation: 'ai.text' });

      console.log(`${color.dim('Assistant:')} ${reply}`);
    }

    const lastEvent = bus.getTimeline().at(-1);
    const durationMs = lastEvent?.metadata?.durationMs as number | undefined;
    console.log(color.green(`  (took ${durationMs ?? '?'}ms)\n`));
  }
}

main()
  .catch((error) => {
    console.error('Example failed:', error);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
