import { describe, expect, it } from 'vitest';
import { DuplicateRegistrationError } from './DuplicateRegistrationError.js';

describe('DuplicateRegistrationError', () => {
  it('carries the kind and name that collided', () => {
    const error = new DuplicateRegistrationError('Strategy', 'summarize');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DuplicateRegistrationError);
    expect(error.name).toBe('DuplicateRegistrationError');
    expect(error.kind).toBe('Strategy');
    expect(error.registeredName).toBe('summarize');
    expect(error.message).toBe('Strategy already registered: "summarize"');
  });
});
