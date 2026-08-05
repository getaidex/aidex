/**
 * 17 — Memory Store (Bonus)
 *
 * @aidex/memory is NOT a chat-history or vector store — it's a generic,
 * synchronous, in-process key/value primitive, backed by a plain Map.
 * This example uses two independently-named MemoryStores to cache
 * values across a sequence of calls, and demonstrates that stores with
 * different names never share state, and that nothing here persists
 * across a fresh process — no serialization exists, a deliberate scope
 * boundary, not a gap.
 */
import { MemoryStore } from '@aidex/memory';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();

  const conversationCache = new MemoryStore<string>('conversation-summaries');
  const statsCache = new MemoryStore<number>('turn-counts');

  const turns = ['What is TypeScript?', 'Give me one use case for generics.'];

  for (const [index, turn] of turns.entries()) {
    const summary = await ai.text(turn);
    conversationCache.getMemory().set(`turn-${index}`, summary);
    const previousCount = statsCache.getMemory().get('count') ?? 0;
    statsCache.getMemory().set('count', previousCount + 1);
  }

  console.log('Cached summaries:');
  for (const index of turns.keys()) {
    console.log(`  turn-${index}:`, conversationCache.getMemory().get(`turn-${index}`));
  }
  console.log('Total turns cached:', statsCache.getMemory().get('count'));

  // A differently-named store never sees this data — MemoryStores are
  // isolated by name, not by any shared global state.
  const isolatedStore = new MemoryStore<string>('conversation-summaries-2');
  console.log(
    '\nA differently-named store never sees this data:',
    isolatedStore.getMemory().get('turn-0') === undefined ? 'confirmed empty.' : 'unexpected leak!'
  );

  console.log(
    '\nNote: nothing here is written to disk — restart this process and both stores start empty again.'
  );
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
