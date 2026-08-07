import type { AidexOptions, AidexRequest, ExecutionContext, Prompt, Strategy } from '@aidex/core';
import { AidexError } from '@aidex/core';
import type { JsonSchema } from './JsonSchema.js';
import { StructuredOutputUnsupportedError } from './errors.js';
import { isStructuredOutputProvider } from './types.js';

/** `options.schema` is how an application expresses the desired shape — no separate request field. */
export interface StructuredOutputOptions extends AidexOptions {
  schema: JsonSchema;
}

/**
 * The Aidex Strategy for native structured output. Provider-capability-aware
 * by necessity (unlike @aidex/strategies' TextGenerationStrategy) — it must
 * verify context.provider genuinely implements StructuredOutputProvider
 * before calling it, and fail with StructuredOutputUnsupportedError rather
 * than silently degrading to prompt-based JSON coaxing. Lives in
 * @aidex/providers, which already owns the capability system this depends
 * on (ProviderCapability, CapableProvider).
 */
export class StructuredOutputStrategy<TResult = unknown> implements Strategy<TResult> {
  readonly name = 'structured-output';
  readonly version = '1.0.0';

  async execute(request: AidexRequest, context: ExecutionContext): Promise<TResult> {
    if (typeof request.input !== 'string' || request.input.length === 0) {
      throw new AidexError('StructuredOutputStrategy requires a non-empty string request.input', {
        executionId: request.executionId,
      });
    }

    const schema = (request.options as StructuredOutputOptions | undefined)?.schema;
    if (!schema || typeof schema !== 'object') {
      throw new AidexError('StructuredOutputStrategy requires request.options.schema (a JsonSchema)', {
        executionId: request.executionId,
      });
    }

    if (!isStructuredOutputProvider(context.provider)) {
      throw new StructuredOutputUnsupportedError(context.provider.name, request.executionId);
    }

    const prompt: Prompt = {
      content: request.input,
      metadata: request.executionId
        ? { ...request.metadata, executionId: request.executionId }
        : request.metadata,
    };

    const result = await context.provider.generateStructured<TResult>(
      prompt,
      { schema },
      request.options
    );

    return result.data;
  }
}
