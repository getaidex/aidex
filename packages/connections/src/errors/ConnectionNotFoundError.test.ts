import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { ConnectionNotFoundError } from './ConnectionNotFoundError.js';

describe('ConnectionNotFoundError', () => {
  it('carries the missing connection id and a descriptive message', () => {
    const error = new ConnectionNotFoundError('conn-1');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(ConnectionNotFoundError);
    expect(error.name).toBe('ConnectionNotFoundError');
    expect(error.connectionId).toBe('conn-1');
    expect(error.message).toBe('Connection not found: "conn-1"');
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional executionId', () => {
    const error = new ConnectionNotFoundError('conn-1', 'exec-123');
    expect(error.executionId).toBe('exec-123');
  });
});
