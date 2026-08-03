import { AIBuilder } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { ExpressAdapter } from './ExpressAdapter.js';

describe('ExpressAdapter', () => {
  it('holds the AI instance it was constructed with (constructor behavior)', () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    expect(() => new ExpressAdapter(ai)).not.toThrow();
  });

  it('handleRequest() calls ai.text(request.prompt) and returns { result }', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new ExpressAdapter(ai);

    const response = await adapter.handleRequest({ prompt: 'hello' });

    expect(response).toEqual({ result: 'stub:hello' });
  });

  it('delegates to the exact same AI instance a caller could use directly', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new ExpressAdapter(ai);

    const viaAdapter = await adapter.handleRequest({ prompt: 'same input' });
    const viaAiDirectly = await ai.text('same input');

    expect(viaAdapter.result).toBe(viaAiDirectly);
  });

  it('propagates a rejection from ai.text() without catching it', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new ExpressAdapter(ai);

    await expect(adapter.handleRequest({ prompt: '' })).rejects.toThrow(/non-empty string/i);
  });

  it('supports multiple independent requests against the same adapter', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const adapter = new ExpressAdapter(ai);

    expect(await adapter.handleRequest({ prompt: 'a' })).toEqual({ result: 'stub:a' });
    expect(await adapter.handleRequest({ prompt: 'b' })).toEqual({ result: 'stub:b' });
  });
});
