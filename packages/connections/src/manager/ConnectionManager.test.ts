import { describe, expect, it } from 'vitest';
import { DuplicateRegistrationError } from '@aidex/core';
import { InvalidConnectionConfigError } from '../errors/InvalidConnectionConfigError.js';
import { ConnectionNotFoundError } from '../errors/ConnectionNotFoundError.js';
import { ConnectionManager } from './ConnectionManager.js';
import type { RegisterConnectionInput } from '../types/RegisterConnectionInput.js';

function makeInput(overrides: Partial<RegisterConnectionInput> = {}): RegisterConnectionInput {
  return {
    id: 'conn-1',
    providerType: 'gemini',
    config: { apiKey: 'test-key' },
    ...overrides,
  };
}

describe('ConnectionManager', () => {
  describe('register()', () => {
    it('registers a connection and returns it without the config field', () => {
      const manager = new ConnectionManager();

      const connection = manager.register(makeInput());

      expect(connection).toEqual({
        id: 'conn-1',
        providerType: 'gemini',
        enabled: true,
        metadata: undefined,
      });
      expect(connection).not.toHaveProperty('config');
    });

    it('defaults enabled to true when not specified', () => {
      const manager = new ConnectionManager();
      const connection = manager.register(makeInput());
      expect(connection.enabled).toBe(true);
    });

    it('respects an explicit enabled: false', () => {
      const manager = new ConnectionManager();
      const connection = manager.register(makeInput({ enabled: false }));
      expect(connection.enabled).toBe(false);
    });

    it('carries metadata through unchanged', () => {
      const manager = new ConnectionManager();
      const connection = manager.register(makeInput({ metadata: { tenant: 'acme' } }));
      expect(connection.metadata).toEqual({ tenant: 'acme' });
    });

    it('throws DuplicateRegistrationError on a second registration under the same id', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      expect(() => manager.register(makeInput())).toThrow(DuplicateRegistrationError);
    });

    it('reuses @aidex/core\'s DuplicateRegistrationError with a descriptive message', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      expect(() => manager.register(makeInput())).toThrow('Connection already registered: "conn-1"');
    });

    it('allows connections with different ids to coexist', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput({ id: 'conn-1' }));
      manager.register(makeInput({ id: 'conn-2' }));

      expect(manager.has('conn-1')).toBe(true);
      expect(manager.has('conn-2')).toBe(true);
    });

    it('throws InvalidConnectionConfigError for an empty string id', () => {
      const manager = new ConnectionManager();
      expect(() => manager.register(makeInput({ id: '' }))).toThrow(InvalidConnectionConfigError);
    });

    it('throws InvalidConnectionConfigError for an empty string providerType', () => {
      const manager = new ConnectionManager();
      expect(() => manager.register(makeInput({ providerType: '' }))).toThrow(InvalidConnectionConfigError);
    });

    it('throws InvalidConnectionConfigError when config is not a plain object (array)', () => {
      const manager = new ConnectionManager();
      expect(() =>
        manager.register(makeInput({ config: [] as unknown as Record<string, unknown> }))
      ).toThrow(InvalidConnectionConfigError);
    });

    it('throws InvalidConnectionConfigError when config is not a plain object (null)', () => {
      const manager = new ConnectionManager();
      expect(() =>
        manager.register(makeInput({ config: null as unknown as Record<string, unknown> }))
      ).toThrow(InvalidConnectionConfigError);
    });

    it('throws InvalidConnectionConfigError when config is a primitive string', () => {
      const manager = new ConnectionManager();
      expect(() =>
        manager.register(makeInput({ config: 'sk-not-an-object' as unknown as Record<string, unknown> }))
      ).toThrow(InvalidConnectionConfigError);
    });

    it('does not register anything when validation fails', () => {
      const manager = new ConnectionManager();
      try {
        manager.register(makeInput({ id: '' }));
      } catch {
        // expected
      }
      expect(manager.list()).toEqual([]);
    });
  });

  describe('get()', () => {
    it('returns the registered connection', () => {
      const manager = new ConnectionManager();
      const registered = manager.register(makeInput());

      expect(manager.get('conn-1')).toEqual(registered);
    });

    it('returns undefined for a missing connection rather than throwing', () => {
      expect(new ConnectionManager().get('missing')).toBeUndefined();
    });
  });

  describe('has()', () => {
    it('returns false for an id that was never registered', () => {
      expect(new ConnectionManager().has('missing')).toBe(false);
    });

    it('returns true for a registered id', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());
      expect(manager.has('conn-1')).toBe(true);
    });
  });

  describe('list()', () => {
    it('returns an empty list when nothing is registered', () => {
      expect(new ConnectionManager().list()).toEqual([]);
    });

    it('returns every registered connection', () => {
      const manager = new ConnectionManager();
      const a = manager.register(makeInput({ id: 'conn-a' }));
      const b = manager.register(makeInput({ id: 'conn-b' }));

      expect(manager.list()).toEqual([a, b]);
    });
  });

  describe('update()', () => {
    it('updates config and returns the connection unchanged otherwise', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const updated = manager.update('conn-1', { config: { apiKey: 'new-key' } });

      expect(updated).toEqual({ id: 'conn-1', providerType: 'gemini', enabled: true, metadata: undefined });
    });

    it('updates enabled', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const updated = manager.update('conn-1', { enabled: false });

      expect(updated.enabled).toBe(false);
    });

    it('updates metadata', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const updated = manager.update('conn-1', { metadata: { tenant: 'acme' } });

      expect(updated.metadata).toEqual({ tenant: 'acme' });
    });

    it('updates multiple fields at once', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const updated = manager.update('conn-1', { enabled: false, metadata: { tenant: 'acme' } });

      expect(updated).toMatchObject({ enabled: false, metadata: { tenant: 'acme' } });
    });

    it('leaves unspecified fields unchanged', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput({ metadata: { tenant: 'acme' } }));

      const updated = manager.update('conn-1', { enabled: false });

      expect(updated.metadata).toEqual({ tenant: 'acme' });
    });

    it('does not change id or providerType (not part of the update shape)', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const updated = manager.update('conn-1', { enabled: false });

      expect(updated.id).toBe('conn-1');
      expect(updated.providerType).toBe('gemini');
    });

    it('throws ConnectionNotFoundError for a missing connection', () => {
      const manager = new ConnectionManager();
      expect(() => manager.update('missing', { enabled: false })).toThrow(ConnectionNotFoundError);
    });

    it('throws InvalidConnectionConfigError when the new config is not a plain object', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      expect(() =>
        manager.update('conn-1', { config: 'not-an-object' as unknown as Record<string, unknown> })
      ).toThrow(InvalidConnectionConfigError);
    });
  });

  describe('remove()', () => {
    it('removes a registered connection and returns true', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      expect(manager.remove('conn-1')).toBe(true);
      expect(manager.has('conn-1')).toBe(false);
    });

    it('returns false for an id that was never registered', () => {
      expect(new ConnectionManager().remove('missing')).toBe(false);
    });

    it('allows re-registering the same id after removing it', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput({ config: { apiKey: 'first' } }));
      manager.remove('conn-1');
      const second = manager.register(makeInput({ config: { apiKey: 'second' } }));

      expect(manager.get('conn-1')).toEqual(second);
    });
  });

  describe('enable() / disable()', () => {
    it('disable() sets enabled to false', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput());

      const disabled = manager.disable('conn-1');

      expect(disabled.enabled).toBe(false);
      expect(manager.get('conn-1')?.enabled).toBe(false);
    });

    it('enable() sets enabled to true', () => {
      const manager = new ConnectionManager();
      manager.register(makeInput({ enabled: false }));

      const enabled = manager.enable('conn-1');

      expect(enabled.enabled).toBe(true);
    });

    it('disable() throws ConnectionNotFoundError for a missing connection', () => {
      const manager = new ConnectionManager();
      expect(() => manager.disable('missing')).toThrow(ConnectionNotFoundError);
    });

    it('enable() throws ConnectionNotFoundError for a missing connection', () => {
      const manager = new ConnectionManager();
      expect(() => manager.enable('missing')).toThrow(ConnectionNotFoundError);
    });
  });
});
