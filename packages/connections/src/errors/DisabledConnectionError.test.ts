import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { DisabledConnectionError } from './DisabledConnectionError.js';

describe('DisabledConnectionError', () => {
  it('carries the connection id and a descriptive message', () => {
    const error = new DisabledConnectionError('conn-1');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(DisabledConnectionError);
    expect(error.name).toBe('DisabledConnectionError');
    expect(error.connectionId).toBe('conn-1');
    expect(error.message).toBe('Connection is disabled: "conn-1"');
  });

  it('carries an optional executionId', () => {
    const error = new DisabledConnectionError('conn-1', 'exec-123');
    expect(error.executionId).toBe('exec-123');
  });
});
