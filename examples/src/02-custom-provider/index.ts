/**
 * Custom Provider — implement Aidex's Provider interface yourself, register
 * it via the SDK, and execute a request through it. This is the pattern any
 * new AI vendor integration follows: satisfy `{ name, generate() }`,
 * nothing more.
 *
 * `Provider` is imported from '@aidex/sdk' itself, not '@aidex/core' — the
 * SDK re-exports it specifically so you never need to import the kernel
 * package directly just to author one.
 */
import { AIBuilder, type Provider } from '@aidex/sdk';

// A minimal, deterministic Provider — no vendor SDK, no network. Reverses
// the prompt content just to make the transform visible in the output.
const reverseProvider: Provider = {
  name: 'reverse-provider',
  async generate(prompt) {
    const reversed = prompt.content.split('').reverse().join('');
    return { content: reversed, metadata: { provider: 'reverse-provider' } };
  },
};

const ai = new AIBuilder().provider(reverseProvider).build();

const result = await ai.text('Aidex');

console.log('Input: ', 'Aidex');
console.log('Output:', result);
