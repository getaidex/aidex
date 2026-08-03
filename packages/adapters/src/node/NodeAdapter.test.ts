import { AIBuilder } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { NodeAdapter } from './NodeAdapter.js';

describe('NodeAdapter', () => {
  it('holds the AI instance it was constructed with (constructor behavior)', () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    expect(() => new NodeAdapter(ai)).not.toThrow();
  });

  it('executeText() delegates directly to ai.text(), unchanged', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new NodeAdapter(ai);

    const result = await adapter.executeText('hello');

    expect(result).toBe('stub:hello');
  });

  it('executeText() returns exactly what ai.text() resolves to, for a real SDK-built AI', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new NodeAdapter(ai);

    const viaAdapter = await adapter.executeText('same input');
    const viaAiDirectly = await ai.text('same input');

    expect(viaAdapter).toBe(viaAiDirectly);
  });

  it('propagates a rejection from ai.text() without catching it', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new NodeAdapter(ai);

    // TextGenerationStrategy (auto-registered by AIBuilder) rejects empty input.
    await expect(adapter.executeText('')).rejects.toThrow(/non-empty string/i);
  });

  it('supports multiple independent adapters over the same AI instance', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const first = new NodeAdapter(ai);
    const second = new NodeAdapter(ai);

    expect(await first.executeText('a')).toBe('stub:a');
    expect(await second.executeText('b')).toBe('stub:b');
  });
});
