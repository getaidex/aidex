import { describe, expect, it } from 'vitest';
import { Aidex } from '@aidex/core';
import { ConnectionManager } from '@aidex/connections';
import { StubProvider, StructuredOutputStrategy, type JsonSchema } from '@aidex/providers';
import { TextGenerationStrategy } from '@aidex/strategies';
import { AIDisabledError } from './errors/AIDisabledError.js';
import { AIFeatureControlPlugin } from './AIFeatureControlPlugin.js';
import { InMemoryAIFeatureControl } from './InMemoryAIFeatureControl.js';

const personSchema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('@aidex/ai-control interaction with existing Strategies', () => {
  it('does not regress plain text generation when AI is enabled (default)', async () => {
    const control = new InMemoryAIFeatureControl();
    const provider = new StubProvider();
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(new TextGenerationStrategy());

    const result = await aidex.execute<string>({ strategy: 'text-generation', input: 'hi' });

    expect(result).toBe('stub:hi');
  });

  it('blocks TextGenerationStrategy before StubProvider.generate() runs when AI is disabled', async () => {
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const provider = new StubProvider();
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(new TextGenerationStrategy());

    await expect(
      aidex.execute({ strategy: 'text-generation', input: 'hi' })
    ).rejects.toBeInstanceOf(AIDisabledError);
  });
});

describe('@aidex/ai-control interaction with Structured Output', () => {
  it('allows a structured-output execution through when enabled', async () => {
    const control = new InMemoryAIFeatureControl();
    const provider = new StubProvider();
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(new StructuredOutputStrategy());

    const result = await aidex.execute<{ name: string }>({
      strategy: 'structured-output',
      input: 'extract a name',
      options: { schema: personSchema },
    });

    expect(result).toEqual({ name: '' });
  });

  it('blocks structured-output before StubProvider.generateStructured() runs when disabled for that feature', async () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('structured-output', false);
    const provider = new StubProvider();
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(new StructuredOutputStrategy());

    await expect(
      aidex.execute({
        strategy: 'structured-output',
        input: 'extract a name',
        options: { schema: personSchema },
      })
    ).rejects.toBeInstanceOf(AIDisabledError);
  });
});

describe('@aidex/ai-control interaction with Connection Manager', () => {
  it('is orthogonal to ConnectionManager — a disabled connection and disabled AI control are independent gates', async () => {
    const manager = new ConnectionManager();
    manager.registerProviderFactory('stub', () => new StubProvider());
    manager.register({ id: 'conn-1', providerType: 'stub', config: {} });

    // ConnectionManager.resolve() is unaffected by AI control state — it has
    // no knowledge of @aidex/ai-control, confirming the two packages don't
    // couple to each other.
    const provider = manager.resolve('conn-1');

    const control = new InMemoryAIFeatureControl({ enabled: false });
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
    aidex.registerStrategy(new TextGenerationStrategy());

    await expect(
      aidex.execute({ strategy: 'text-generation', input: 'hi' })
    ).rejects.toBeInstanceOf(AIDisabledError);
  });
});
