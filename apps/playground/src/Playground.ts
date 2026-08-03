import { AIBuilder, type AI } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';

/**
 * The simplest possible Aidex application: build one AI instance (an
 * AIBuilder configured with a StubProvider — no real AI SDK, no network),
 * and run text through it. No AI logic of its own — run() is a one-line
 * delegation to ai.text().
 */
export class Playground {
  private readonly ai: AI;

  constructor() {
    this.ai = new AIBuilder().provider(new StubProvider()).build();
  }

  async run(input: string): Promise<string> {
    return this.ai.text(input);
  }
}
