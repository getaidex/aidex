import type { Command } from '../CLI.js';

/**
 * Returns a version string injected at construction — no filesystem or
 * package.json lookup of any kind.
 */
export class VersionCommand implements Command {
  readonly name = 'version';

  constructor(private readonly version: string) {}

  async execute(): Promise<string> {
    return this.version;
  }
}
