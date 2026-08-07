import type { AidexRequest, ExecutionContext, Prompt, Strategy } from '@aidex/core';
import { InvalidStrategyInputError } from '../errors/InvalidStrategyInputError.js';

/**
 * The first production Strategy: turns request.input into a Prompt, calls
 * whichever Provider context.provider holds, and returns the generated text.
 * Provider-agnostic by construction — it only ever calls the Provider
 * interface, never a concrete vendor SDK, so it works unchanged whether
 * context.provider is Gemini, a future OpenAI/Claude provider, or a stub.
 */
export class TextGenerationStrategy implements Strategy<string> {
  readonly name = 'text-generation';
  readonly version = '1.0.0';

  async execute(request: AidexRequest, context: ExecutionContext): Promise<string> {
    if (typeof request.input !== 'string' || request.input.length === 0) {
      throw new InvalidStrategyInputError(
        'TextGenerationStrategy requires a non-empty string request.input'
      );
    }

    const prompt: Prompt = {
      content: request.input,
      metadata: request.executionId
        ? { ...request.metadata, executionId: request.executionId }
        : request.metadata,
    };

    const response = await context.provider.generate(prompt, request.options);

    return response.content;
  }
}
