import { describe, expect, it } from 'vitest';
import { Aidex, type Provider, type Strategy } from '@aidex/core';
import { AIFeatureControlPlugin } from './AIFeatureControlPlugin.js';
import { AIDisabledError } from './errors/AIDisabledError.js';
import { InMemoryAIFeatureControl } from './InMemoryAIFeatureControl.js';

function makeProvider(onCall: () => void): Provider {
  return {
    name: 'tracking-provider',
    async generate(prompt) {
      onCall();
      return { content: `generated:${prompt.content}` };
    },
  };
}

function makeStrategy(name: string): Strategy<string> {
  return {
    name,
    async execute(request, context) {
      const response = await context.provider.generate({ content: String(request.input ?? '') });
      return response.content;
    },
  };
}

function makeAidex(control: InMemoryAIFeatureControl, provider: Provider, strategyNames: string[]) {
  const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(control)] });
  for (const name of strategyNames) {
    aidex.registerStrategy(makeStrategy(name));
  }
  return aidex;
}

describe('AIFeatureControlPlugin', () => {
  it('lets execution through unchanged when AI is enabled (default)', async () => {
    let providerCalls = 0;
    const control = new InMemoryAIFeatureControl();
    const provider = makeProvider(() => providerCalls++);
    const aidex = makeAidex(control, provider, ['text-generation']);

    const result = await aidex.execute<string>({ strategy: 'text-generation', input: 'hi' });

    expect(result).toBe('generated:hi');
    expect(providerCalls).toBe(1);
  });

  it('rejects with AIDisabledError when globally disabled, and never calls the provider', async () => {
    let providerCalls = 0;
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const provider = makeProvider(() => providerCalls++);
    const aidex = makeAidex(control, provider, ['text-generation']);

    await expect(
      aidex.execute({ strategy: 'text-generation', input: 'hi' })
    ).rejects.toBeInstanceOf(AIDisabledError);
    expect(providerCalls).toBe(0);
  });

  it('rejects only the disabled feature, leaving other features/strategies working', async () => {
    let providerCalls = 0;
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    const provider = makeProvider(() => providerCalls++);
    const aidex = makeAidex(control, provider, ['text-generation', 'other-feature']);

    await expect(
      aidex.execute({ strategy: 'text-generation', input: 'hi' })
    ).rejects.toBeInstanceOf(AIDisabledError);

    const result = await aidex.execute<string>({ strategy: 'other-feature', input: 'hi' });
    expect(result).toBe('generated:hi');
    expect(providerCalls).toBe(1);
  });

  it('propagates the caller-supplied executionId onto AIDisabledError', async () => {
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const aidex = makeAidex(control, makeProvider(() => {}), ['text-generation']);

    const error = await aidex
      .execute({ strategy: 'text-generation', input: 'hi', executionId: 'exec-123' })
      .catch((e: unknown) => e);

    expect((error as AIDisabledError).executionId).toBe('exec-123');
  });

  it('auto-generates and propagates an executionId when the caller supplies none', async () => {
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const aidex = makeAidex(control, makeProvider(() => {}), ['text-generation']);

    const error = await aidex
      .execute({ strategy: 'text-generation', input: 'hi' })
      .catch((e: unknown) => e);

    expect(typeof (error as AIDisabledError).executionId).toBe('string');
    expect((error as AIDisabledError).executionId?.length).toBeGreaterThan(0);
  });

  it('carries the strategy name as the feature id on AIDisabledError', async () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    const aidex = makeAidex(control, makeProvider(() => {}), ['text-generation']);

    const error = await aidex
      .execute({ strategy: 'text-generation', input: 'hi' })
      .catch((e: unknown) => e);

    expect((error as AIDisabledError).feature).toBe('text-generation');
  });

  it('re-enabling at runtime (as a future admin adapter would) is observed on the very next execute()', async () => {
    let providerCalls = 0;
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const provider = makeProvider(() => providerCalls++);
    const aidex = makeAidex(control, provider, ['text-generation']);

    await expect(aidex.execute({ strategy: 'text-generation', input: 'hi' })).rejects.toBeInstanceOf(
      AIDisabledError
    );

    control.setEnabled(true);
    const result = await aidex.execute<string>({ strategy: 'text-generation', input: 'hi' });

    expect(result).toBe('generated:hi');
    expect(providerCalls).toBe(1);
  });

  it('rejects before StrategyRegistry lookup — an unregistered strategy name still yields AIDisabledError, not StrategyNotFoundError', async () => {
    const control = new InMemoryAIFeatureControl({ enabled: false });
    const aidex = makeAidex(control, makeProvider(() => {}), []);

    await expect(
      aidex.execute({ strategy: 'never-registered', input: 'hi' })
    ).rejects.toBeInstanceOf(AIDisabledError);
  });

  it('does not affect execution when no feature/global override is set beyond the default-enabled state', async () => {
    const control = new InMemoryAIFeatureControl();
    const aidex = makeAidex(control, makeProvider(() => {}), ['a', 'b', 'c']);

    await expect(aidex.execute({ strategy: 'a', input: 'x' })).resolves.toBe('generated:x');
    await expect(aidex.execute({ strategy: 'b', input: 'x' })).resolves.toBe('generated:x');
    await expect(aidex.execute({ strategy: 'c', input: 'x' })).resolves.toBe('generated:x');
  });
});
