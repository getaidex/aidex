import { describe, expect, it } from 'vitest';
import type { Provider } from '@aidex/core';
import { ProviderCapability, createProviderCapabilities, type CapableProvider } from '@aidex/providers';
import type { Engine } from '../types/Engine.js';
import { engineSupportsProvider, missingCapabilities } from './engineSupportsProvider.js';

function makeCapableProvider(supported: ProviderCapability[]): CapableProvider {
  const capabilities = createProviderCapabilities(supported);
  return {
    name: 'capable-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
    getCapabilities() {
      return capabilities;
    },
  };
}

function makePlainProvider(): Provider {
  return {
    name: 'plain-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  };
}

function makeMalformedProvider(getCapabilitiesReturnValue: unknown): Provider {
  return {
    name: 'malformed-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
    getCapabilities: () => getCapabilitiesReturnValue,
  } as unknown as Provider;
}

function makeEngine(requiredCapabilities?: readonly ProviderCapability[]): Pick<Engine, 'requiredCapabilities'> {
  return { requiredCapabilities };
}

describe('missingCapabilities', () => {
  it('returns an empty list when requiredCapabilities is undefined', () => {
    const engine = makeEngine(undefined);
    expect(missingCapabilities(engine, makePlainProvider())).toEqual([]);
  });

  it('returns an empty list when requiredCapabilities is empty', () => {
    const engine = makeEngine([]);
    expect(missingCapabilities(engine, makePlainProvider())).toEqual([]);
  });

  it('returns an empty list when the provider supports every required capability', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    const provider = makeCapableProvider([ProviderCapability.TextGeneration]);
    expect(missingCapabilities(engine, provider)).toEqual([]);
  });

  it('reports exactly one missing capability', () => {
    const engine = makeEngine([ProviderCapability.Streaming]);
    const provider = makeCapableProvider([ProviderCapability.TextGeneration]);
    expect(missingCapabilities(engine, provider)).toEqual([ProviderCapability.Streaming]);
  });

  it('reports multiple missing capabilities in declared order', () => {
    const engine = makeEngine([ProviderCapability.Streaming, ProviderCapability.ToolCalling]);
    const provider = makeCapableProvider([ProviderCapability.TextGeneration]);
    expect(missingCapabilities(engine, provider)).toEqual([
      ProviderCapability.Streaming,
      ProviderCapability.ToolCalling,
    ]);
  });

  it('treats a provider with no getCapabilities() as supporting zero capabilities', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration, ProviderCapability.Streaming]);
    expect(missingCapabilities(engine, makePlainProvider())).toEqual([
      ProviderCapability.TextGeneration,
      ProviderCapability.Streaming,
    ]);
  });

  it('treats a getCapabilities() returning null as declaring zero capabilities, without throwing', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    const provider = makeMalformedProvider(null);
    expect(() => missingCapabilities(engine, provider)).not.toThrow();
    expect(missingCapabilities(engine, provider)).toEqual([ProviderCapability.TextGeneration]);
  });

  it('treats a getCapabilities() returning a non-object as declaring zero capabilities, without throwing', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    const provider = makeMalformedProvider('not-an-object');
    expect(() => missingCapabilities(engine, provider)).not.toThrow();
    expect(missingCapabilities(engine, provider)).toEqual([ProviderCapability.TextGeneration]);
  });

  it('treats a truthy-but-not-literal-true capability value as unsupported', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    const provider = makeMalformedProvider({ 'text-generation': 'true' });
    expect(missingCapabilities(engine, provider)).toEqual([ProviderCapability.TextGeneration]);
  });
});

describe('engineSupportsProvider', () => {
  it('returns true when requiredCapabilities is undefined', () => {
    expect(engineSupportsProvider(makeEngine(undefined), makePlainProvider())).toBe(true);
  });

  it('returns true when requiredCapabilities is empty', () => {
    expect(engineSupportsProvider(makeEngine([]), makePlainProvider())).toBe(true);
  });

  it('returns true when the provider supports every required capability', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    const provider = makeCapableProvider([ProviderCapability.TextGeneration]);
    expect(engineSupportsProvider(engine, provider)).toBe(true);
  });

  it('returns false when the provider is missing a required capability', () => {
    const engine = makeEngine([ProviderCapability.Streaming]);
    const provider = makeCapableProvider([ProviderCapability.TextGeneration]);
    expect(engineSupportsProvider(engine, provider)).toBe(false);
  });

  it('returns false for a provider with no getCapabilities() when capabilities are required', () => {
    const engine = makeEngine([ProviderCapability.TextGeneration]);
    expect(engineSupportsProvider(engine, makePlainProvider())).toBe(false);
  });
});
