/**
 * 20 — Build a CLI (Bonus)
 *
 * @aidex/cli's CLI class is a command-dispatch layer over one AI
 * instance — not a terminal executable (no bin field, no shebang; its
 * own package.json description says so explicitly). It auto-registers
 * "text" and "version" at construction. cli.register() takes any plain
 * object matching {name, execute(ai, input)} structurally — the
 * Command type itself isn't re-exported from the package on purpose,
 * so nothing here imports it; a plain object literal is enough.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { CLI } from '@aidex/cli';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();
  const cli = new CLI(ai, '0.2.1-alpha');

  // A custom command that needs the AI instance.
  cli.register({
    name: 'summarize',
    async execute(ai, input) {
      return ai.text(`Summarize in one sentence: ${input}`);
    },
  });

  // A custom command that needs no AI at all — proves a Command isn't
  // required to touch the AI instance it's handed.
  cli.register({
    name: 'uppercase',
    async execute(_ai, input) {
      return input.toUpperCase();
    },
  });

  const invocations: [string, string][] = [
    ['version', ''],
    ['text', 'Say hello to Aidex in one short sentence.'],
    ['uppercase', 'shout this'],
    [
      'summarize',
      'Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages.',
    ],
  ];

  for (const [name, input] of invocations) {
    const result = await cli.execute(name, input);
    console.log(`$ cli ${name}${input ? ` "${input}"` : ''}`);
    console.log(`  -> ${result}\n`);
  }

  try {
    await cli.execute('does-not-exist');
  } catch (error) {
    console.log('Unknown command correctly rejected:', (error as Error).message);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
