/**
 * Thrown by CLI.execute() when no command is registered under the given
 * name. Mirrors the *NotFoundError shape used across the repository
 * (StrategyNotFoundError, EngineNotFoundError, ToolNotFoundError,
 * PromptNotFoundError) — extend Error, carry the missing id, fail loud.
 */
export class CommandNotFoundError extends Error {
  readonly commandName: string;

  constructor(commandName: string) {
    super(`Unknown command: "${commandName}"`);
    this.name = 'CommandNotFoundError';
    this.commandName = commandName;
    Object.setPrototypeOf(this, CommandNotFoundError.prototype);
  }
}
