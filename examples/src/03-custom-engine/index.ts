/**
 * Custom Engine — implement Aidex's Engine interface, register it into an
 * EngineRegistry, and execute it by id.
 *
 * Engines dispatch independently of Aidex.execute()/Strategy — EngineRegistry
 * is its own standalone registry. It reuses @aidex/core's ExecutionContext
 * shape rather than inventing a new one, so we build a minimal context by
 * hand instead of going through the SDK.
 */
import type { ExecutionContext } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { EngineRegistry, type Engine } from '@aidex/engines';

interface WordCountResult {
  words: number;
}

const wordCountEngine: Engine<WordCountResult> = {
  id: 'text.word-count',
  name: 'Word Count',
  description: 'Counts the words in context.request.input',
  version: '1.0.0',
  async execute(context) {
    const input = String(context.request?.input ?? '');
    return { words: input.trim().split(/\s+/).filter(Boolean).length };
  },
};

const registry = new EngineRegistry();
registry.register(wordCountEngine);

const provider = new StubProvider();
const context: ExecutionContext = {
  config: { provider },
  provider,
  request: { strategy: 'unused', input: 'Aidex makes AI integration simple' },
};

const result = await registry.execute<WordCountResult>('text.word-count', context);

console.log('Word count:', result.words);
