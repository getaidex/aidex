import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { InvalidConnectionConfigError } from './InvalidConnectionConfigError.js';

describe('InvalidConnectionConfigError', () => {
  it('carries the connection id, reason, and a descriptive message', () => {
    const error = new InvalidConnectionConfigError('conn-1', 'config must be a plain object');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(InvalidConnectionConfigError);
    expect(error.name).toBe('InvalidConnectionConfigError');
    expect(error.connectionId).toBe('conn-1');
    expect(error.reason).toBe('config must be a plain object');
    expect(error.message).toBe('Invalid configuration for connection "conn-1": config must be a plain object');
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional executionId', () => {
    const error = new InvalidConnectionConfigError('conn-1', 'bad config', 'exec-123');
    expect(error.executionId).toBe('exec-123');
  });
});
