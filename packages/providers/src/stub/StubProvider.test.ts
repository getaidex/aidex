import { describe, expect, it } from 'vitest';
import type { JsonSchema } from '../structured-output/JsonSchema.js';
import { StructuredOutputGenerationError, StructuredOutputValidationError } from '../structured-output/errors.js';
import { StubProvider } from './StubProvider.js';

const personSchema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, age: { type: 'integer' } },
  required: ['name', 'age'],
};

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

    it('propagates executionId from prompt.metadata through to response.metadata (end-to-end)', async () => {
      const provider = new StubProvider();
      const prompt = { content: 'hi', metadata: { executionId: 'exec-e2e-1' } };

      const response = await provider.generate(prompt);

      expect(response.metadata?.executionId).toBe('exec-e2e-1');
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

  describe('generateStructured() — Prompt + schema -> StructuredOutputResult lifecycle', () => {
    it('returns schema-conformant data deterministically derived from the schema', async () => {
      const provider = new StubProvider();

      const result = await provider.generateStructured<{ name: string; age: number }>(
        { content: 'describe a person' },
        { schema: personSchema }
      );

      expect(result.data).toEqual({ name: '', age: 0 });
    });

    it('is deterministic across repeated calls with the same schema', async () => {
      const provider = new StubProvider();
      const first = await provider.generateStructured({ content: 'x' }, { schema: personSchema });
      const second = await provider.generateStructured({ content: 'x' }, { schema: personSchema });
      expect(first).toEqual(second);
    });

    it('propagates prompt metadata and provider identity into result.metadata', async () => {
      const provider = new StubProvider();
      const result = await provider.generateStructured(
        { content: 'x', metadata: { traceId: 'abc' } },
        { schema: personSchema }
      );
      expect(result.metadata).toEqual({ traceId: 'abc', provider: 'stub' });
    });

    it('throws StructuredOutputGenerationError when the prompt carries the invalid-JSON trigger', async () => {
      const provider = new StubProvider();

      await expect(
        provider.generateStructured(
          { content: `describe ${StubProvider.INVALID_JSON_TRIGGER}` },
          { schema: personSchema }
        )
      ).rejects.toBeInstanceOf(StructuredOutputGenerationError);
    });

    it('throws StructuredOutputValidationError when the prompt carries the schema-mismatch trigger', async () => {
      const provider = new StubProvider();

      const error = await provider
        .generateStructured(
          { content: `describe ${StubProvider.SCHEMA_MISMATCH_TRIGGER}` },
          { schema: personSchema }
        )
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(StructuredOutputValidationError);
      expect((error as StructuredOutputValidationError).issues.length).toBeGreaterThan(0);
    });

    it('propagates executionId into thrown structured-output errors', async () => {
      const provider = new StubProvider();

      const error = await provider
        .generateStructured(
          { content: StubProvider.INVALID_JSON_TRIGGER },
          { schema: personSchema },
          { executionId: 'exec-1' }
        )
        .catch((e: unknown) => e);

      expect((error as StructuredOutputGenerationError).executionId).toBe('exec-1');
    });
  });

  describe('getCapabilities()', () => {
    it('reports text-generation and structured-output as supported', () => {
      const provider = new StubProvider();

      expect(provider.getCapabilities()).toEqual({
        'text-generation': true,
        'structured-output': true,
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
