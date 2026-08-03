/**
 * Hello World — the smallest possible Aidex program.
 *
 * Uses AIBuilder (the SDK's façade) to assemble an Aidex instance around a
 * GeminiProvider, then generates text with ai.text(). No manual Aidex
 * construction, no Strategy registration — that's exactly what @aidex/sdk
 * exists to hide.
 *
 * Falls back to StubProvider (deterministic, no network) when
 * GEMINI_API_KEY isn't set, so this example always runs out of the box; set
 * a real key to see it actually call Gemini.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

const provider = process.env.GEMINI_API_KEY
  ? new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY })
  : new StubProvider();

if (!process.env.GEMINI_API_KEY) {
  console.log(
    '[hello-world] No GEMINI_API_KEY set — using StubProvider (deterministic, no network).\n'
  );
}

const ai = new AIBuilder().provider(provider).build();

const result = await ai.text('Say hello to Aidex in one short sentence.');

console.log('Result:', result);
