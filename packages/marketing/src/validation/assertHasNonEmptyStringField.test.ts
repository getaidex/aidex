import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { assertHasNonEmptyStringField } from './assertHasNonEmptyStringField.js';

describe('assertHasNonEmptyStringField', () => {
  it('does not throw for a valid non-empty string field', () => {
    expect(() => assertHasNonEmptyStringField('origin', { brief: 'x' }, 'brief')).not.toThrow();
  });

  it('throws when input is not an object', () => {
    expect(() => assertHasNonEmptyStringField('origin', undefined, 'brief')).toThrow(
      InvalidMarketingEngineInputError
    );
    expect(() => assertHasNonEmptyStringField('origin', 'x', 'brief')).toThrow(InvalidMarketingEngineInputError);
  });

  it('throws when the field is missing', () => {
    expect(() => assertHasNonEmptyStringField('origin', {}, 'brief')).toThrow(InvalidMarketingEngineInputError);
  });

  it('throws when the field is an empty or whitespace-only string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { brief: '' }, 'brief')).toThrow(
      InvalidMarketingEngineInputError
    );
    expect(() => assertHasNonEmptyStringField('origin', { brief: '   ' }, 'brief')).toThrow(
      InvalidMarketingEngineInputError
    );
  });
});
