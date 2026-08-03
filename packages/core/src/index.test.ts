import { describe, expect, it } from 'vitest';
import {
  Aidex,
  DuplicateRegistrationError,
  StrategyNotFoundError,
  type AidexConfig,
  type Plugin,
  type Provider,
  type Strategy,
} from './index.js';

function makeProvider(): Provider {
  return {
    name: 'stub-provider',
    async generate(prompt) {
      return { content: `generated:${prompt.content}` };
    },
  };
}

describe('Aidex public API (via package barrel)', () => {
  it('supports the full new Aidex / use / registerStrategy / execute flow', async () => {
    const events: string[] = [];
    const config: AidexConfig = { provider: makeProvider() };
    const aidex = new Aidex(config);

    const plugin: Plugin = {
      name: 'tracker',
      beforeExecute: () => {
        events.push('beforeExecute');
      },
      afterExecute: () => {
        events.push('afterExecute');
      },
    };
    aidex.use(plugin);

    const strategy: Strategy<string> = {
      name: 'greet',
      async execute(request, context) {
        const response = await context.provider.generate({ content: String(request.input) });
        return response.content;
      },
    };
    aidex.registerStrategy(strategy);

    const result = await aidex.execute<string>({ strategy: 'greet', input: 'world' });

    expect(result).toBe('generated:world');
    expect(events).toEqual(['beforeExecute', 'afterExecute']);
  });

  it('rejects with StrategyNotFoundError for an unregistered strategy', async () => {
    const aidex = new Aidex({ provider: makeProvider() });

    await expect(aidex.execute({ strategy: 'nope' })).rejects.toBeInstanceOf(
      StrategyNotFoundError
    );
  });

  it('throws DuplicateRegistrationError when registering two strategies with the same name', () => {
    const aidex = new Aidex({ provider: makeProvider() });

    const strategy: Strategy<string> = {
      name: 'greet',
      async execute() {
        return 'first';
      },
    };
    const duplicateStrategy: Strategy<string> = {
      name: 'greet',
      async execute() {
        return 'second';
      },
    };

    aidex.registerStrategy(strategy);

    expect(() => aidex.registerStrategy(duplicateStrategy)).toThrow(DuplicateRegistrationError);
  });
});
