import { describe, expect, it } from 'vitest';
import { ProviderCapability } from './ProviderCapability.js';
import { createProviderCapabilities } from './ProviderCapabilities.js';

describe('createProviderCapabilities', () => {
  it('sets every known capability key, defaulting unsupported ones to false', () => {
    const capabilities = createProviderCapabilities([ProviderCapability.TextGeneration]);

    expect(capabilities).toEqual({
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

  it('marks every capability passed in supported as true', () => {
    const capabilities = createProviderCapabilities([
      ProviderCapability.TextGeneration,
      ProviderCapability.Streaming,
    ]);

    expect(capabilities['text-generation']).toBe(true);
    expect(capabilities.streaming).toBe(true);
    expect(capabilities['tool-calling']).toBe(false);
  });

  it('defaults every capability to false when nothing is supported', () => {
    const capabilities = createProviderCapabilities([]);

    for (const value of Object.values(ProviderCapability)) {
      expect(capabilities[value]).toBe(false);
    }
  });

  it('returns a frozen object', () => {
    const capabilities = createProviderCapabilities([ProviderCapability.TextGeneration]);

    expect(Object.isFrozen(capabilities)).toBe(true);
  });

  it('does not change values when a mutation is attempted', () => {
    const capabilities = createProviderCapabilities([ProviderCapability.TextGeneration]);

    expect(() => {
      (capabilities as Record<string, boolean>)['text-generation'] = false;
    }).toThrow();
    expect(capabilities['text-generation']).toBe(true);
  });
});
