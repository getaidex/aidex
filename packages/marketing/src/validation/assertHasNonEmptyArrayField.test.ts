import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { assertHasNonEmptyArrayField } from './assertHasNonEmptyArrayField.js';

describe('assertHasNonEmptyArrayField', () => {
  it('does not throw for a non-empty array field', () => {
    expect(() => assertHasNonEmptyArrayField('origin', { metrics: [1] }, 'metrics')).not.toThrow();
  });

  it('throws when input is not an object', () => {
    expect(() => assertHasNonEmptyArrayField('origin', undefined, 'metrics')).toThrow(
      InvalidMarketingEngineInputError
    );
  });

  it('throws when the field is missing', () => {
    expect(() => assertHasNonEmptyArrayField('origin', {}, 'metrics')).toThrow(InvalidMarketingEngineInputError);
  });

  it('throws when the field is not an array', () => {
    expect(() => assertHasNonEmptyArrayField('origin', { metrics: 'x' }, 'metrics')).toThrow(
      InvalidMarketingEngineInputError
    );
  });

  it('throws when the field is an empty array', () => {
    expect(() => assertHasNonEmptyArrayField('origin', { metrics: [] }, 'metrics')).toThrow(
      InvalidMarketingEngineInputError
    );
  });
});
