/**
 * 04 — Custom Provider
 *
 * `Provider` is a two-member interface: a name and a `generate()`
 * function. Aidex ships GeminiProvider and StubProvider, but nothing
 * about the SDK requires either — you might wrap an internal model
 * server, a different vendor's API, or (as here, so this runs offline
 * and deterministically) a trivial local transform. This is the whole
 * contract you need to satisfy to plug anything in.
 */
import { AIBuilder } from '@aidex/sdk';
import type { Provider } from '@aidex/core';

function caesarShift(text: string, shift: number): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
  });
}

// A stand-in for "wraps a real backend" — deterministic and offline so
// the example needs no network and no API key, while proving out the
// exact same interface a production Provider would implement.
const caesarCipherProvider: Provider = {
  name: 'caesar-cipher-demo',
  async generate(prompt) {
    return { content: caesarShift(prompt.content, 3) };
  },
};

async function main() {
  const ai = new AIBuilder().provider(caesarCipherProvider).build();

  const prompt = 'Aidex makes it easy to swap providers';
  console.log(`Prompt: ${prompt}`);

  const response = await ai.text(prompt);
  console.log(`Response (Caesar-shifted by 3): ${response}`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
