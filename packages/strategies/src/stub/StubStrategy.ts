import type { AidexRequest, ExecutionContext, Prompt, Strategy } from '@aidex/core';

/**
 * The reference Strategy implementation. Exercises every step of the
 * contract — receive AidexRequest, read ExecutionContext, build a Prompt,
 * call context.provider.generate(), return the result — with no decision
 * logic of its own. Deterministic whenever context.provider is (e.g.
 * @aidex/providers' StubProvider).
 */
export class StubStrategy implements Strategy<string> {
  readonly name = 'stub';
  readonly version = '1.0.0';

  async execute(request: AidexRequest, context: ExecutionContext): Promise<string> {
    const prompt: Prompt = {
      content: String(request.input ?? ''),
      metadata: request.executionId
        ? { strategy: this.name, executionId: request.executionId }
        : { strategy: this.name },
    };

    const response = await context.provider.generate(prompt, request.options);

    return response.content;
  }
}
