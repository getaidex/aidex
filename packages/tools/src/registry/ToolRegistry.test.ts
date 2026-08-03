import { DuplicateRegistrationError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import type { Tool } from '../types/Tool.js';
import { ToolNotFoundError } from '../errors/ToolNotFoundError.js';
import { ToolPermissionDeniedError } from '../errors/ToolPermissionDeniedError.js';
import { ToolRegistry } from './ToolRegistry.js';

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'calculator',
    name: 'Calculator',
    description: 'Adds two numbers',
    async execute(input: unknown) {
      const { a, b } = input as { a: number; b: number };
      return a + b;
    },
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  describe('register()', () => {
    it('registers a tool so has()/get() find it', () => {
      const registry = new ToolRegistry();
      const tool = makeTool();

      registry.register(tool);

      expect(registry.has('calculator')).toBe(true);
      expect(registry.get('calculator')).toBe(tool);
    });

    it('throws DuplicateRegistrationError on a second registration under the same id', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool());

      expect(() => registry.register(makeTool())).toThrow(DuplicateRegistrationError);
      expect(() => registry.register(makeTool())).toThrow(
        'Tool already registered: "calculator"'
      );
    });
  });

  describe('discovery', () => {
    it('list() returns every registered tool', () => {
      const registry = new ToolRegistry();
      const a = makeTool({ id: 'a' });
      const b = makeTool({ id: 'b' });
      registry.register(a);
      registry.register(b);

      expect(registry.list()).toEqual([a, b]);
    });

    it('list() returns an empty array when nothing is registered', () => {
      expect(new ToolRegistry().list()).toEqual([]);
    });

    it('listByPermission() returns only tools declaring the given permission', () => {
      const registry = new ToolRegistry();
      const reader = makeTool({ id: 'reader', permissions: ['filesystem:read'] });
      const writer = makeTool({ id: 'writer', permissions: ['filesystem:write'] });
      const both = makeTool({ id: 'both', permissions: ['filesystem:read', 'filesystem:write'] });
      registry.register(reader);
      registry.register(writer);
      registry.register(both);

      expect(registry.listByPermission('filesystem:read').map((t) => t.id)).toEqual([
        'reader',
        'both',
      ]);
    });

    it('listByPermission() returns an empty array when no tool declares that permission', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ permissions: ['filesystem:read'] }));

      expect(registry.listByPermission('network:fetch')).toEqual([]);
    });

    it('listByPermission() excludes tools with no declared permissions at all', () => {
      const registry = new ToolRegistry();
      registry.register(makeTool({ permissions: undefined }));

      expect(registry.listByPermission('anything')).toEqual([]);
    });
  });

  describe('execute()', () => {
    it('executes a tool with no required permissions and returns its result', async () => {
      const registry = new ToolRegistry();
      registry.register(makeTool());

      const result = await registry.execute('calculator', { a: 2, b: 3 });

      expect(result).toBe(5);
    });

    it('throws ToolNotFoundError for an unregistered id', async () => {
      const registry = new ToolRegistry();
      await expect(registry.execute('missing', {})).rejects.toBeInstanceOf(ToolNotFoundError);
    });

    it('propagates an error thrown by the tool without catching it', async () => {
      const registry = new ToolRegistry();
      const failure = new Error('tool blew up');
      registry.register(
        makeTool({
          id: 'explode',
          async execute() {
            throw failure;
          },
        })
      );

      await expect(registry.execute('explode', {})).rejects.toBe(failure);
    });

    describe('permission validation', () => {
      it('executes successfully when every required permission is granted', async () => {
        const registry = new ToolRegistry();
        registry.register(makeTool({ permissions: ['filesystem:read'] }));

        const result = await registry.execute('calculator', { a: 1, b: 1 }, ['filesystem:read']);

        expect(result).toBe(2);
      });

      it('throws ToolPermissionDeniedError when a required permission is missing', async () => {
        const registry = new ToolRegistry();
        registry.register(makeTool({ permissions: ['filesystem:read'] }));

        await expect(registry.execute('calculator', { a: 1, b: 1 })).rejects.toBeInstanceOf(
          ToolPermissionDeniedError
        );
      });

      it('lists exactly the missing permissions, not the ones already granted', async () => {
        const registry = new ToolRegistry();
        registry.register(
          makeTool({ permissions: ['filesystem:read', 'network:fetch'] })
        );

        await expect(
          registry.execute('calculator', { a: 1, b: 1 }, ['filesystem:read'])
        ).rejects.toMatchObject({ missingPermissions: ['network:fetch'] });
      });

      it('never calls execute() on the tool when permission validation fails', async () => {
        const registry = new ToolRegistry();
        let called = false;
        registry.register(
          makeTool({
            permissions: ['filesystem:read'],
            async execute() {
              called = true;
              return null;
            },
          })
        );

        await expect(registry.execute('calculator', {})).rejects.toBeInstanceOf(
          ToolPermissionDeniedError
        );
        expect(called).toBe(false);
      });

      it('requires no permissions at all for a tool that declares none', async () => {
        const registry = new ToolRegistry();
        registry.register(makeTool({ permissions: undefined }));

        await expect(registry.execute('calculator', { a: 1, b: 1 })).resolves.toBe(2);
      });
    });
  });
});
