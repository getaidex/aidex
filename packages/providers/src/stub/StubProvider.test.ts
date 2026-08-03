import { describe, expect, it } from 'vitest';
import { StubProvider } from './StubProvider.js';

describe('StubProvider', () => {
  describe('name', () => {
    it('defaults its name to "stub"', () => {
      const provider = new StubProvider();
      expect(provider.name).toBe('stub');
    });

    it('accepts a custom name via config', () => {
      const provider = new StubProvider({ name: 'stub-2' });
      expect(provider.name).toBe('stub-2');
    });
  });

  describe('generate() — Prompt -> ProviderResponse lifecycle', () => {
    it('derives content deterministically from a normal prompt', async () => {
      const provider = new StubProvider();

      const response = await provider.generate({ content: 'hello world' });

      expect(response.content).toBe('stub:hello world');
    });

    it('handles an empty prompt without throwing', async () => {
      const provider = new StubProvider();

      const response = await provider.generate({ content: '' });

      expect(response.content).toBe('stub:');
    });

    it('propagates prompt metadata into the response, tagged with the provider identity', async () => {
      const provider = new StubProvider();
      const prompt = { content: 'hi', metadata: { traceId: 'abc', tenant: 'acme' } };

      const response = await provider.generate(prompt);

      expect(response.metadata).toEqual({ traceId: 'abc', tenant: 'acme', provider: 'stub' });
    });

    it('still attaches its own identity to metadata when the prompt carries none', async () => {
      const provider = new StubProvider();

      const response = await provider.generate({ content: 'hi' });

      expect(response.metadata).toEqual({ provider: 'stub' });
    });

    it('exposes the received prompt/options on raw, the untyped escape hatch', async () => {
      const provider = new StubProvider();
      const prompt = { content: 'hi', metadata: { traceId: 'abc' } };
      const options = { debug: true };

      const response = await provider.generate(prompt, options);

      expect(response.raw).toEqual({ prompt, options });
    });

    it('sets raw.options to null when no options are passed', async () => {
      const provider = new StubProvider();

      const response = await provider.generate({ content: 'hi' });

      expect(response.raw).toEqual({ prompt: { content: 'hi' }, options: null });
    });

    it('ignores AidexOptions for the purpose of content — varying options never changes it', async () => {
      const provider = new StubProvider();
      const prompt = { content: 'x' };

      const withoutOptions = await provider.generate(prompt);
      const withOptions = await provider.generate(prompt, {
        timeout: 10,
        debug: true,
        stream: true,
      });

      expect(withoutOptions.content).toBe(withOptions.content);
      expect(withoutOptions.content).toBe('stub:x');
    });

    it('produces an identical response across repeated calls with the same input (determinism)', async () => {
      const provider = new StubProvider();
      const prompt = { content: 'repeat me', metadata: { traceId: 'xyz' } };
      const options = { debug: true };

      const first = await provider.generate(prompt, options);
      const second = await provider.generate(prompt, options);
      const third = await provider.generate(prompt, options);

      expect(first).toEqual(second);
      expect(second).toEqual(third);
    });
  });

  describe('getCapabilities()', () => {
    it('reports only text-generation as supported', () => {
      const provider = new StubProvider();

      expect(provider.getCapabilities()).toEqual({
        'text-generation': true,
        'structured-output': false,
        'image-generation': false,
        'image-understanding': false,
        embeddings: false,
        streaming: false,
        'tool-calling': false,
        'function-calling': false,
        'json-output': false,
        'multimodal-input': false,
      });
    });

    it('returns the exact same frozen object instance on repeated calls', () => {
      const provider = new StubProvider();

      const first = provider.getCapabilities();
      const second = provider.getCapabilities();

      expect(first).toBe(second);
      expect(Object.isFrozen(first)).toBe(true);
    });
  });
});
