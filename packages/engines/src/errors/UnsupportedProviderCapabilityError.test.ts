import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { ProviderCapability } from '@aidex/providers';
import { UnsupportedProviderCapabilityError } from './UnsupportedProviderCapabilityError.js';

describe('UnsupportedProviderCapabilityError', () => {
  it('carries the engine id, the missing capabilities, and a descriptive message', () => {
    const error = new UnsupportedProviderCapabilityError('document.transcribe', [
      ProviderCapability.Streaming,
      ProviderCapability.ToolCalling,
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(UnsupportedProviderCapabilityError);
    expect(error.name).toBe('UnsupportedProviderCapabilityError');
    expect(error.engineId).toBe('document.transcribe');
    expect(error.missingCapabilities).toEqual([ProviderCapability.Streaming, ProviderCapability.ToolCalling]);
    expect(error.message).toBe(
      'Engine "document.transcribe" requires capabilities the provider does not support: streaming, tool-calling'
    );
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional executionId', () => {
    const error = new UnsupportedProviderCapabilityError(
      'document.transcribe',
      [ProviderCapability.Streaming],
      'exec-123'
    );
    expect(error.executionId).toBe('exec-123');
  });
});
