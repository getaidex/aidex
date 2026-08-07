import type { AidexOptions, Prompt, Provider, ProviderResponse } from '@aidex/core';
import {
  ProviderCapability,
  createProviderCapabilities,
  type ProviderCapabilities,
  type CapableProvider,
} from '../capabilities/index.js';
import type { JsonSchema } from '../structured-output/JsonSchema.js';
import { generateSampleValue } from '../structured-output/sampleFromSchema.js';
import { parseAndValidateStructuredOutput } from '../structured-output/parseAndValidateStructuredOutput.js';
import type {
  StructuredOutputProvider,
  StructuredOutputRequest,
  StructuredOutputResult,
} from '../structured-output/types.js';

export interface StubProviderConfig {
  name?: string;
}

export class StubProvider implements Provider, CapableProvider, StructuredOutputProvider {
  readonly name: string;

  /** prompt.content containing this deterministically triggers unparseable JSON, for testing StructuredOutputGenerationError. */
  static readonly INVALID_JSON_TRIGGER = '__aidex_stub_invalid_json__';
  /**
   * prompt.content containing this deterministically returns `{}` instead
   * of a schema-conformant value, for testing StructuredOutputValidationError.
   * Only guaranteed to violate schemas that declare at least one required
   * property — pair it with a schema that has a non-empty `required` array.
   */
  static readonly SCHEMA_MISMATCH_TRIGGER = '__aidex_stub_schema_mismatch__';

  // Reflects what generate()/generateStructured() below actually do, not
  // what a "real" model could theoretically do — flip a capability to true
  // only once the matching implementation genuinely exists.
  private readonly capabilities = createProviderCapabilities([
    ProviderCapability.TextGeneration,
    ProviderCapability.StructuredOutput,
  ]);

  constructor(config: StubProviderConfig = {}) {
    this.name = config.name ?? 'stub';
  }

  async generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse> {
    return {
      // content: the one field every caller can rely on — a pure,
      // deterministic function of prompt.content, standing in for "the model's
      // answer" without ever calling a model.
      content: `stub:${prompt.content}`,
      // metadata: propagate whatever the Prompt carried in, plus this
      // provider's own identity — the shape a real provider uses to surface
      // its own diagnostics (e.g. { model, tokenCount }) alongside the
      // caller's original trace/tagging data.
      metadata: { ...prompt.metadata, provider: this.name },
      // raw: the escape hatch a real provider fills with its vendor SDK's
      // untyped native response. There is no SDK here, so this echoes the
      // exact prompt/options generate() received — enough to prove the field
      // is wired end-to-end without inventing a fake vendor payload shape.
      raw: { prompt, options: options ?? null },
    };
  }

  async generateStructured<T = unknown>(
    prompt: Prompt,
    request: StructuredOutputRequest,
    options?: AidexOptions
  ): Promise<StructuredOutputResult<T>> {
    const rawText = this.buildStructuredContent(prompt.content, request.schema);
    const data = parseAndValidateStructuredOutput<T>(
      this.name,
      rawText,
      request.schema,
      options?.executionId
    );

    return {
      data,
      metadata: { ...prompt.metadata, provider: this.name },
      raw: { prompt, options: options ?? null },
    };
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  // Deterministic, pure function of prompt.content — no randomness, no
  // network — standing in for "the model's structured answer."
  private buildStructuredContent(promptContent: string, schema: JsonSchema): string {
    if (promptContent.includes(StubProvider.INVALID_JSON_TRIGGER)) {
      return '{not valid json';
    }
    if (promptContent.includes(StubProvider.SCHEMA_MISMATCH_TRIGGER)) {
      return '{}';
    }
    return JSON.stringify(generateSampleValue(schema));
  }
}
