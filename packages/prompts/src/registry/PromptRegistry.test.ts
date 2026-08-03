import { DuplicateRegistrationError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import type { PromptTemplate } from '../types/PromptTemplate.js';
import { InvalidPromptError } from '../errors/InvalidPromptError.js';
import { MissingPromptVariableError } from '../errors/MissingPromptVariableError.js';
import { PromptNotFoundError } from '../errors/PromptNotFoundError.js';
import { PromptRegistry } from './PromptRegistry.js';

function makePrompt(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'greeting',
    version: '1.0.0',
    template: 'Hello, {{name}}!',
    variables: ['name'],
    ...overrides,
  };
}

describe('PromptRegistry', () => {
  describe('register()', () => {
    it('registers a prompt so has()/get() find it', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt());

      expect(registry.has('greeting')).toBe(true);
      expect(registry.get('greeting')).toEqual(makePrompt());
    });

    it('rejects an empty id', () => {
      const registry = new PromptRegistry();
      expect(() => registry.register(makePrompt({ id: '' }))).toThrow(InvalidPromptError);
    });

    it('rejects an empty version', () => {
      const registry = new PromptRegistry();
      expect(() => registry.register(makePrompt({ version: '' }))).toThrow(InvalidPromptError);
    });

    it('rejects an empty template', () => {
      const registry = new PromptRegistry();
      expect(() => registry.register(makePrompt({ template: '' }))).toThrow(InvalidPromptError);
    });

    it('throws DuplicateRegistrationError for the same id+version registered twice', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt());

      expect(() => registry.register(makePrompt())).toThrow(DuplicateRegistrationError);
      expect(() => registry.register(makePrompt())).toThrow(
        'Prompt already registered: "greeting@1.0.0"'
      );
    });

    it('allows registering a second version of the same id', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0' }));

      expect(() => registry.register(makePrompt({ version: '2.0.0' }))).not.toThrow();
      expect(registry.has('greeting', '1.0.0')).toBe(true);
      expect(registry.has('greeting', '2.0.0')).toBe(true);
    });
  });

  describe('versioning — get() defaults to latest', () => {
    it('resolves to the most recently registered version when no version is given', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0', template: 'v1: {{name}}' }));
      registry.register(makePrompt({ version: '2.0.0', template: 'v2: {{name}}' }));

      expect(registry.get('greeting')?.version).toBe('2.0.0');
    });

    it('still returns a specific older version when explicitly requested', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0', template: 'v1: {{name}}' }));
      registry.register(makePrompt({ version: '2.0.0', template: 'v2: {{name}}' }));

      expect(registry.get('greeting', '1.0.0')?.template).toBe('v1: {{name}}');
    });

    it('has() checks a specific version independently of what is "latest"', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0' }));

      expect(registry.has('greeting', '1.0.0')).toBe(true);
      expect(registry.has('greeting', '9.9.9')).toBe(false);
    });
  });

  describe('has()/get() for unknown ids', () => {
    it('has() returns false for an id that was never registered', () => {
      expect(new PromptRegistry().has('missing')).toBe(false);
    });

    it('get() returns undefined rather than throwing', () => {
      expect(new PromptRegistry().get('missing')).toBeUndefined();
    });
  });

  describe('listVersions() / list()', () => {
    it('listVersions() returns every version registered for an id', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0' }));
      registry.register(makePrompt({ version: '2.0.0' }));

      expect(registry.listVersions('greeting').map((p) => p.version)).toEqual(['1.0.0', '2.0.0']);
    });

    it('listVersions() returns an empty array for an unknown id', () => {
      expect(new PromptRegistry().listVersions('missing')).toEqual([]);
    });

    it('list() returns every registered prompt across every id and version', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ id: 'greeting', version: '1.0.0' }));
      registry.register(makePrompt({ id: 'greeting', version: '2.0.0' }));
      registry.register(makePrompt({ id: 'farewell', version: '1.0.0', template: 'Bye, {{name}}!' }));

      expect(registry.list()).toHaveLength(3);
    });
  });

  describe('render()', () => {
    it('renders the latest version of a prompt by id', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt());

      expect(registry.render('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    });

    it('renders a specific requested version', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0', template: 'v1 hi {{name}}' }));
      registry.register(makePrompt({ version: '2.0.0', template: 'v2 hi {{name}}' }));

      expect(registry.render('greeting', { name: 'Ada' }, '1.0.0')).toBe('v1 hi Ada');
    });

    it('throws PromptNotFoundError for an unregistered id', () => {
      const registry = new PromptRegistry();
      expect(() => registry.render('missing', {})).toThrow(PromptNotFoundError);
    });

    it('throws PromptNotFoundError for a registered id but an unregistered version', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt({ version: '1.0.0' }));

      expect(() => registry.render('greeting', { name: 'Ada' }, '9.9.9')).toThrow(
        PromptNotFoundError
      );
    });

    it('propagates MissingPromptVariableError from renderPrompt without swallowing it', () => {
      const registry = new PromptRegistry();
      registry.register(makePrompt());

      expect(() => registry.render('greeting', {})).toThrow(MissingPromptVariableError);
    });
  });
});
