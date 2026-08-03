/**
 * 03 — Interactive Chat
 *
 * Aidex's text call, `ai.text(input)`, is single-shot: it has no memory
 * of previous turns. There is no chat/conversation API in this SDK —
 * that is a deliberate, current fact about the API surface, not an
 * oversight this example papers over. This is the pattern for building
 * a conversational loop yourself: keep the transcript in your own
 * array, and re-send the whole thing (system prompt + history + new
 * message) as the prompt on every turn.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider, type Provider } from '@aidex/providers';

const color = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function chooseProvider(): Promise<Provider> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(color.yellow('No GEMINI_API_KEY found — running with StubProvider (demo mode).\n'));
    return new StubProvider();
  }
  const choice = await ask('Choose a provider — [1] Gemini  [2] Stub (demo): ');
  if (choice === '2') return new StubProvider();
  return new GeminiProvider({ apiKey });
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

function buildPrompt(systemPrompt: string, history: Turn[]): string {
  const lines: string[] = [];
  if (systemPrompt) lines.push(`System: ${systemPrompt}`);
  for (const turn of history) {
    lines.push(`${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`);
  }
  lines.push('Assistant:');
  return lines.join('\n');
}

async function main() {
  const provider = await chooseProvider();
  const ai = new AIBuilder().provider(provider).build();

  const systemPrompt = await ask('Optional system prompt (press Enter to skip): ');
  console.log(color.dim("\nType 'exit' or 'quit' to end the conversation.\n"));

  const history: Turn[] = [];

  while (true) {
    const userInput = await ask(color.cyan('You: '));
    if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }
    if (!userInput) continue;

    history.push({ role: 'user', content: userInput });

    // Re-send the full transcript every turn — this IS the "memory."
    // There's no server-side session; the state lives entirely here.
    const prompt = buildPrompt(systemPrompt, history);
    const reply = await ai.text(prompt);

    history.push({ role: 'assistant', content: reply });
    console.log(`${color.dim('Assistant:')} ${reply}\n`);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
