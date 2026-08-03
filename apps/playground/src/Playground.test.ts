import { describe, expect, it } from 'vitest';
import { Playground } from './Playground.js';

describe('Playground', () => {
  it('builds an AI instance successfully', () => {
    expect(() => new Playground()).not.toThrow();
  });

  it('executes ai.text() and returns a string', async () => {
    const playground = new Playground();
    const result = await playground.run('hello');

    expect(typeof result).toBe('string');
  });

  it('returns output matching what StubProvider deterministically produces', async () => {
    const playground = new Playground();

    const result = await playground.run('hello world');

    expect(result).toBe('stub:hello world');
  });

  it('is deterministic across repeated runs with the same input', async () => {
    const playground = new Playground();

    const first = await playground.run('repeat me');
    const second = await playground.run('repeat me');

    expect(first).toBe(second);
  });

  it('propagates an error instead of swallowing it', async () => {
    const playground = new Playground();

    // TextGenerationStrategy (wired in by AIBuilder) rejects empty input.
    await expect(playground.run('')).rejects.toThrow(/non-empty string/i);
  });
});
