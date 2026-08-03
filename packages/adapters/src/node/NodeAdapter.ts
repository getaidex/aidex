import type { AI } from '@aidex/sdk';

/**
 * A simple wrapper around AI for plain Node.js call sites (no framework).
 * Contains no AI logic and never calls a Provider directly — executeText()
 * is a one-line delegation to ai.text().
 */
export class NodeAdapter {
  constructor(private readonly ai: AI) {}

  async executeText(prompt: string): Promise<string> {
    return this.ai.text(prompt);
  }
}
