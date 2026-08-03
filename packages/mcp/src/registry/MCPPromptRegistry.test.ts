import { DuplicateRegistrationError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import type { MCPPrompt } from '../types/MCPPrompt.js';
import { MCPPromptNotFoundError } from '../errors/MCPPromptNotFoundError.js';
import { MCPPromptRegistry } from './MCPPromptRegistry.js';

function makePrompt(name: string): MCPPrompt {
  return {
    name,
    async get(args) {
      return [{ role: 'user', content: { type: 'text', text: `hello ${args?.who ?? 'world'}` } }];
    },
  };
}

describe('MCPPromptRegistry', () => {
  it('registers a prompt and makes it discoverable', () => {
    const registry = new MCPPromptRegistry();
    const prompt = makePrompt('greeting');

    registry.register(prompt);

    expect(registry.has('greeting')).toBe(true);
    expect(registry.get('greeting')).toBe(prompt);
    expect(registry.list()).toEqual([prompt]);
  });

  it('starts empty', () => {
    const registry = new MCPPromptRegistry();

    expect(registry.list()).toEqual([]);
  });

  it('throws DuplicateRegistrationError when the same name is registered twice', () => {
    const registry = new MCPPromptRegistry();
    registry.register(makePrompt('greeting'));

    expect(() => registry.register(makePrompt('greeting'))).toThrow(DuplicateRegistrationError);
  });

  it('unregister() removes a prompt and reports whether one was removed', () => {
    const registry = new MCPPromptRegistry();
    registry.register(makePrompt('greeting'));

    expect(registry.unregister('greeting')).toBe(true);
    expect(registry.unregister('greeting')).toBe(false);
  });

  it('getMessages() invokes the registered prompt with the given arguments', async () => {
    const registry = new MCPPromptRegistry();
    registry.register(makePrompt('greeting'));

    const messages = await registry.getMessages('greeting', { who: 'Ada' });

    expect(messages).toEqual([{ role: 'user', content: { type: 'text', text: 'hello Ada' } }]);
  });

  it('getMessages() throws MCPPromptNotFoundError for an unregistered name', async () => {
    const registry = new MCPPromptRegistry();

    await expect(registry.getMessages('missing')).rejects.toBeInstanceOf(MCPPromptNotFoundError);
  });
});
