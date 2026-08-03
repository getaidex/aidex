import { describe, expect, it } from 'vitest';
import { PromptNotFoundError } from './PromptNotFoundError.js';

describe('PromptNotFoundError', () => {
  it('carries the missing id with a descriptive message when no version was requested', () => {
    const error = new PromptNotFoundError('greeting');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('PromptNotFoundError');
    expect(error.promptId).toBe('greeting');
    expect(error.version).toBeUndefined();
    expect(error.message).toBe('Prompt not found: "greeting"');
  });

  it('includes the requested version in the message when given', () => {
    const error = new PromptNotFoundError('greeting', '2.0.0');

    expect(error.version).toBe('2.0.0');
    expect(error.message).toBe('Prompt not found: "greeting@2.0.0"');
  });
});
