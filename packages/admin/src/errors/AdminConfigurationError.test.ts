import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { AdminConfigurationError } from './AdminConfigurationError.js';

describe('AdminConfigurationError', () => {
  it('is an AidexError carrying a plain message', () => {
    const error = new AdminConfigurationError('AdminController requires a connectionManager.');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('AdminConfigurationError');
    expect(error.message).toBe('AdminController requires a connectionManager.');
  });
});
