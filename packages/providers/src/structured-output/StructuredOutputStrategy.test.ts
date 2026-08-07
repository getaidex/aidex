import type { ExecutionContext, Provider } from '@aidex/core';
import { AidexError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { StubProvider } from '../stub/StubProvider.js';
import { StructuredOutputUnsupportedError } from './errors.js';
import { StructuredOutputStrategy } from './StructuredOutputStrategy.js';
import type { JsonSchema } from './JsonSchema.js';

const eventSchema: JsonSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, attendeeCount: { type: 'integer' } },
  required: ['title', 'attendeeCount'],
};

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

describe('StructuredOutputStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new StructuredOutputStrategy();
    expect(strategy.name).toBe('structured-output');
    expect(strategy.version).toBe('1.0.0');
  });

  it('returns validated, typed data from a StructuredOutputProvider', async () => {
    const provider = new StubProvider();
    const strategy = new StructuredOutputStrategy<{ title: string; attendeeCount: number }>();

    const result = await strategy.execute(
      { strategy: 'structured-output', input: 'extract the event', options: { schema: eventSchema } },
      makeContext(provider)
    );

    expect(result).toEqual({ title: '', attendeeCount: 0 });
  });

  it('rejects a missing request.input', async () => {
    const strategy = new StructuredOutputStrategy();
    await expect(
      strategy.execute(
        { strategy: 'structured-output', options: { schema: eventSchema } },
        makeContext(new StubProvider())
      )
    ).rejects.toBeInstanceOf(AidexError);
  });

  it('rejects a missing schema', async () => {
    const strategy = new StructuredOutputStrategy();
    await expect(
      strategy.execute({ strategy: 'structured-output', input: 'x' }, makeContext(new StubProvider()))
    ).rejects.toThrow('schema');
  });

  it('throws StructuredOutputUnsupportedError for a provider without generateStructured', async () => {
    const provider: Provider = { name: 'plain', async generate() { return { content: 'x' }; } };
    const strategy = new StructuredOutputStrategy();

    const error = await strategy
      .execute(
        { strategy: 'structured-output', input: 'x', options: { schema: eventSchema } },
        makeContext(provider)
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(StructuredOutputUnsupportedError);
    expect((error as StructuredOutputUnsupportedError).provider).toBe('plain');
  });

  it('fails fast on unsupported capability without ever calling the provider', async () => {
    let called = false;
    const provider: Provider = {
      name: 'plain',
      async generate() {
        called = true;
        return { content: 'x' };
      },
    };
    const strategy = new StructuredOutputStrategy();

    await strategy
      .execute(
        { strategy: 'structured-output', input: 'x', options: { schema: eventSchema } },
        makeContext(provider)
      )
      .catch(() => {});

    expect(called).toBe(false);
  });

  it('propagates executionId into the StructuredOutputUnsupportedError', async () => {
    const provider: Provider = { name: 'plain', async generate() { return { content: 'x' }; } };
    const strategy = new StructuredOutputStrategy();

    const error = await strategy
      .execute(
        {
          strategy: 'structured-output',
          input: 'x',
          options: { schema: eventSchema },
          executionId: 'exec-99',
        },
        makeContext(provider)
      )
      .catch((e: unknown) => e);

    expect((error as StructuredOutputUnsupportedError).executionId).toBe('exec-99');
  });

  it('propagates a StructuredOutputValidationError from an invalid StubProvider fixture', async () => {
    const provider = new StubProvider();
    const strategy = new StructuredOutputStrategy();

    await expect(
      strategy.execute(
        {
          strategy: 'structured-output',
          input: `describe ${StubProvider.SCHEMA_MISMATCH_TRIGGER}`,
          options: { schema: eventSchema },
        },
        makeContext(provider)
      )
    ).rejects.toThrow(/schema validation/);
  });

  it('carries request.executionId onto the Prompt metadata, same as TextGenerationStrategy', async () => {
    let seenPrompt: unknown;
    const provider: Provider & { generateStructured: (p: unknown) => Promise<{ data: unknown }> } = {
      name: 'inline',
      async generate() {
        return { content: '{}' };
      },
      async generateStructured(prompt) {
        seenPrompt = prompt;
        return { data: {} };
      },
    };
    const strategy = new StructuredOutputStrategy();

    await strategy.execute(
      {
        strategy: 'structured-output',
        input: 'hi',
        options: { schema: eventSchema },
        executionId: 'exec-abc',
      },
      makeContext(provider)
    );

    expect(seenPrompt).toMatchObject({ metadata: { executionId: 'exec-abc' } });
  });
});
