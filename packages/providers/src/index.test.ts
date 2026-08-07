import { describe, expect, it } from 'vitest';
import type { Provider } from '@aidex/core';
import {
  GeminiProvider,
  StubProvider,
  StructuredOutputStrategy,
  StructuredOutputUnsupportedError,
  StructuredOutputValidationError,
  isStructuredOutputProvider,
  ProviderCapability,
  type JsonSchema,
} from './index.js';

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('@aidex/providers public API (via package barrel)', () => {
  it('runs a full structured-output request through StructuredOutputStrategy + StubProvider, using only barrel exports', async () => {
    const provider = new StubProvider();
    const strategy = new StructuredOutputStrategy<{ name: string }>();

    const result = await strategy.execute(
      { strategy: 'structured-output', input: 'extract a name', options: { schema } },
      { config: { provider }, provider }
    );

    expect(result).toEqual({ name: '' });
  });

  it('reports StubProvider and GeminiProvider as StructuredOutput-capable via the barrel', () => {
    const stub = new StubProvider();
    const gemini = new GeminiProvider({ apiKey: 'test-key' });

    expect(stub.getCapabilities()[ProviderCapability.StructuredOutput]).toBe(true);
    expect(gemini.getCapabilities()[ProviderCapability.StructuredOutput]).toBe(true);
    expect(isStructuredOutputProvider(stub)).toBe(true);
    expect(isStructuredOutputProvider(gemini)).toBe(true);
  });

  it('rejects a plain text-only Provider with StructuredOutputUnsupportedError via the barrel', async () => {
    const plainProvider: Provider = { name: 'plain', async generate() { return { content: 'x' }; } };
    const strategy = new StructuredOutputStrategy();

    await expect(
      strategy.execute(
        { strategy: 'structured-output', input: 'x', options: { schema } },
        { config: { provider: plainProvider }, provider: plainProvider }
      )
    ).rejects.toBeInstanceOf(StructuredOutputUnsupportedError);
  });

  it('surfaces invalid structured output as StructuredOutputValidationError via the barrel', async () => {
    const provider = new StubProvider();
    const strategy = new StructuredOutputStrategy();

    await expect(
      strategy.execute(
        {
          strategy: 'structured-output',
          input: `describe ${StubProvider.SCHEMA_MISMATCH_TRIGGER}`,
          options: { schema },
        },
        { config: { provider }, provider }
      )
    ).rejects.toBeInstanceOf(StructuredOutputValidationError);
  });
});
