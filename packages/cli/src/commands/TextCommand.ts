import type { AI } from '@aidex/sdk';
import type { Command } from '../CLI.js';

/**
 * Nothing more than a named call site for ai.text(). No AI logic, no
 * transformation of the input or the result.
 */
export class TextCommand implements Command {
  readonly name = 'text';

  async execute(ai: AI, input: string): Promise<string> {
    return ai.text(input);
  }
}
