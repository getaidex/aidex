import { describe, expect, it } from 'vitest';
import { StrategyRegistry } from './StrategyRegistry.js';
import type { Strategy } from '../../types/Strategy.js';

function makeStrategy(name: string): Strategy {
  return {
    name,
    async execute() {
      return `result-from-${name}`;
    },
  };
}

describe('StrategyRegistry', () => {
  it('registers and retrieves a strategy by name', () => {
    const registry = new StrategyRegistry();
    const strategy = makeStrategy('summarize');

    registry.register(strategy);

    expect(registry.get('summarize')).toBe(strategy);
    expect(registry.has('summarize')).toBe(true);
  });

  it('returns undefined and false for an unknown strategy', () => {
    const registry = new StrategyRegistry();

    expect(registry.get('missing')).toBeUndefined();
    expect(registry.has('missing')).toBe(false);
  });

  it('lists all registered strategies', () => {
    const registry = new StrategyRegistry();
    const a = makeStrategy('a');
    const b = makeStrategy('b');

    registry.register(a);
    registry.register(b);

    expect(registry.list()).toEqual([a, b]);
  });

  it('throws DuplicateRegistrationError on a name clash', () => {
    const registry = new StrategyRegistry();
    registry.register(makeStrategy('summarize'));

    expect(() => registry.register(makeStrategy('summarize'))).toThrow(
      'Strategy already registered: "summarize"'
    );
  });
});
