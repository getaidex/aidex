import type { AI } from '@aidex/sdk';
import { TextCommand } from './commands/TextCommand.js';
import { VersionCommand } from './commands/VersionCommand.js';
import { CommandNotFoundError } from './errors/CommandNotFoundError.js';

/**
 * The contract a CLI command satisfies. Internal to this package — never
 * exported — since the public API is CLI alone; a caller registers custom
 * commands with a plain object matching this shape, structurally.
 */
export interface Command {
  readonly name: string;
  execute(ai: AI, input: string): Promise<string>;
}

/**
 * The executable interface to Aidex. Holds exactly one AI instance, registers
 * commands (the two built-ins — "text", "version" — at construction, plus
 * whatever else a caller registers), and executes them by name. Contains no
 * AI logic itself: it never calls ai.text()/ai.execute() directly — only the
 * registered Command does, once dispatched to.
 */
export class CLI {
  private readonly ai: AI;
  private readonly commands = new Map<string, Command>();

  constructor(ai: AI, version: string) {
    this.ai = ai;
    this.register(new TextCommand());
    this.register(new VersionCommand(version));
  }

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  async execute(name: string, input = ''): Promise<string> {
    const command = this.commands.get(name);
    if (!command) {
      throw new CommandNotFoundError(name);
    }

    return command.execute(this.ai, input);
  }
}
