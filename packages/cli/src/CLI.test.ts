import { AIBuilder } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { CLI } from './CLI.js';
import { CommandNotFoundError } from './errors/CommandNotFoundError.js';

function makeCLI(version = '1.0.0'): CLI {
  const ai = new AIBuilder().provider(new StubProvider()).build();
  return new CLI(ai, version);
}

describe('CLI', () => {
  it('constructs without throwing, given an AI instance and a version string', () => {
    expect(() => makeCLI()).not.toThrow();
  });

  it('auto-registers "text" and "version" at construction — both are immediately executable', async () => {
    const cli = makeCLI('2.0.0');

    expect(await cli.execute('version')).toBe('2.0.0');
    expect(await cli.execute('text', 'hi')).toBe('stub:hi');
  });

  describe('command execution', () => {
    it('executes the version command and returns the injected version', async () => {
      const cli = makeCLI('3.1.4');
      expect(await cli.execute('version')).toBe('3.1.4');
    });

    it('executes the text command and returns the AI-generated text', async () => {
      const cli = makeCLI();
      expect(await cli.execute('text', 'hello world')).toBe('stub:hello world');
    });
  });

  describe('delegation', () => {
    it('delegates the text command to the same AI instance the CLI was constructed with', async () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();
      const cli = new CLI(ai, '1.0.0');

      const viaCli = await cli.execute('text', 'same input');
      const viaAiDirectly = await ai.text('same input');

      expect(viaCli).toBe(viaAiDirectly);
    });
  });

  describe('unknown command', () => {
    it('rejects with a descriptive error naming the unknown command', async () => {
      const cli = makeCLI();
      await expect(cli.execute('does-not-exist')).rejects.toThrow(
        'Unknown command: "does-not-exist"'
      );
    });

    it('rejects with a CommandNotFoundError carrying the missing command name', async () => {
      const cli = makeCLI();
      const rejection = cli.execute('does-not-exist');

      await expect(rejection).rejects.toBeInstanceOf(CommandNotFoundError);
      await expect(rejection).rejects.toMatchObject({ commandName: 'does-not-exist' });
    });
  });

  describe('error propagation', () => {
    it('propagates a rejection from the text command without catching it', async () => {
      const cli = makeCLI();
      await expect(cli.execute('text', '')).rejects.toThrow(/non-empty string/i);
    });
  });

  describe('custom command registration', () => {
    it('supports registering an additional command beyond the two built-ins', async () => {
      const cli = makeCLI();
      cli.register({
        name: 'shout',
        async execute(_ai, input) {
          return input.toUpperCase();
        },
      });

      expect(await cli.execute('shout', 'hello')).toBe('HELLO');
    });

    it('lets a custom command replace a built-in by re-registering the same name', async () => {
      const cli = makeCLI();
      cli.register({
        name: 'version',
        async execute() {
          return 'overridden';
        },
      });

      expect(await cli.execute('version')).toBe('overridden');
    });
  });
});
