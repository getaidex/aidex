/**
 * 01 — Getting Started
 *
 * The smallest possible Aidex program: build an AI instance with a
 * provider, send one prompt, print the response.
 *
 * Why start here: every other example in this course builds on the same
 * two lines — `new AIBuilder().provider(p).build()` and `ai.text(input)`.
 * Understand this first and the rest of the course is composition, not
 * new concepts.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log('Using GeminiProvider — GEMINI_API_KEY detected.\n');
    return new GeminiProvider({ apiKey });
  }
  // StubProvider is not a mock for tests — it's a real, deterministic
  // Provider implementation, exactly the shape a production provider
  // would satisfy. Falling back to it (instead of throwing) means this
  // example runs for anyone who clones the repo, no API key required.
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).');
  console.log('Set GEMINI_API_KEY to see a real model response.\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();

  const prompt = 'Suggest three good weekend project ideas for a TypeScript developer.';
  console.log(`Prompt: ${prompt}\n`);

  const response = await ai.text(prompt);
  console.log('Response:');
  console.log(response);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
