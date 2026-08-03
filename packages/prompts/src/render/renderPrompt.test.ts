import { describe, expect, it } from 'vitest';
import type { PromptTemplate } from '../types/PromptTemplate.js';
import { MissingPromptVariableError } from '../errors/MissingPromptVariableError.js';
import { renderPrompt } from './renderPrompt.js';

function makePrompt(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'greeting',
    version: '1.0.0',
    template: 'Hello, {{name}}!',
    variables: ['name'],
    ...overrides,
  };
}

describe('renderPrompt', () => {
  it('substitutes a declared placeholder with the supplied value', () => {
    const result = renderPrompt(makePrompt(), { name: 'Ada' });
    expect(result).toBe('Hello, Ada!');
  });

  it('substitutes multiple placeholders, including repeats of the same one', () => {
    const prompt = makePrompt({
      template: '{{greeting}}, {{name}}! Nice to meet you, {{name}}.',
      variables: ['greeting', 'name'],
    });

    const result = renderPrompt(prompt, { greeting: 'Hi', name: 'Ada' });

    expect(result).toBe('Hi, Ada! Nice to meet you, Ada.');
  });

  it('throws MissingPromptVariableError when a declared variable is not supplied', () => {
    expect(() => renderPrompt(makePrompt(), {})).toThrow(MissingPromptVariableError);
    expect(() => renderPrompt(makePrompt(), {})).toThrow(
      'Prompt "greeting" is missing required variable: "name"'
    );
  });

  it('renders a prompt with no declared variables and no variables argument', () => {
    const prompt = makePrompt({ template: 'Hello, world!', variables: undefined });
    expect(renderPrompt(prompt)).toBe('Hello, world!');
  });

  it('leaves an undeclared, unsupplied placeholder untouched rather than producing "undefined"', () => {
    const prompt = makePrompt({
      template: 'Hello, {{name}}! Ref: {{traceId}}',
      variables: ['name'],
    });

    const result = renderPrompt(prompt, { name: 'Ada' });

    expect(result).toBe('Hello, Ada! Ref: {{traceId}}');
  });

  it('is a pure function — the same prompt and variables always render identically', () => {
    const prompt = makePrompt();
    expect(renderPrompt(prompt, { name: 'Ada' })).toBe(renderPrompt(prompt, { name: 'Ada' }));
  });
});
