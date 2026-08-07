import { describe, expect, it } from 'vitest';
import { AidexError } from './AidexError.js';

describe('AidexError', () => {
  it('is a plain Error with a descriptive message and default name', () => {
    const error = new AidexError('something broke');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('AidexError');
    expect(error.message).toBe('something broke');
    expect(error.code).toBeUndefined();
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional code, executionId, and cause', () => {
    const cause = new Error('root cause');
    const error = new AidexError('something broke', {
      code: 'SOMETHING_BROKE',
      executionId: 'exec-123',
      cause,
    });

    expect(error.code).toBe('SOMETHING_BROKE');
    expect(error.executionId).toBe('exec-123');
    expect(error.cause).toBe(cause);
  });

  it('works with no options at all', () => {
    expect(() => new AidexError('boom')).not.toThrow();
  });

  it('serializes cleanly via toJSON()/JSON.stringify()', () => {
    const error = new AidexError('boom', { code: 'BOOM', executionId: 'exec-1' });

    const json = JSON.parse(JSON.stringify(error));

    expect(json).toEqual({
      name: 'AidexError',
      message: 'boom',
      code: 'BOOM',
      executionId: 'exec-1',
    });
  });

  it('a subclass overriding name still serializes with its own name', () => {
    class CustomError extends AidexError {
      constructor() {
        super('custom failure');
        this.name = 'CustomError';
        Object.setPrototypeOf(this, CustomError.prototype);
      }
    }
    const error = new CustomError();

    expect(JSON.parse(JSON.stringify(error))).toEqual({
      name: 'CustomError',
      message: 'custom failure',
    });
  });
});
