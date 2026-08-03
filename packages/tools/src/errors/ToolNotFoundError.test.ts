import { describe, expect, it } from 'vitest';
import { ToolNotFoundError } from './ToolNotFoundError.js';

describe('ToolNotFoundError', () => {
  it('carries the missing tool id and a descriptive message', () => {
    const error = new ToolNotFoundError('calculator');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ToolNotFoundError');
    expect(error.toolId).toBe('calculator');
    expect(error.message).toBe('Tool not found: "calculator"');
  });
});
