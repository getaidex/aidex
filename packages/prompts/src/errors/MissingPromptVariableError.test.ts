import { describe, expect, it } from 'vitest';
import { MissingPromptVariableError } from './MissingPromptVariableError.js';

describe('MissingPromptVariableError', () => {
  it('carries the prompt id, the missing variable name, and a descriptive message', () => {
    const error = new MissingPromptVariableError('greeting', 'name');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MissingPromptVariableError');
    expect(error.promptId).toBe('greeting');
    expect(error.variableName).toBe('name');
    expect(error.message).toBe('Prompt "greeting" is missing required variable: "name"');
  });
});
