import type { AidexOptions, Prompt, Provider, ProviderResponse } from '@aidex/core';
import { ExecutionMetrics, type ObservabilityBus } from '@aidex/observability';
import type { GenerateContentResponse } from '@google/genai';
import { GoogleGenAI } from '@google/genai';
import { AbortedError, rejectOnAbort, throwIfAborted, withTimeoutSignal } from '../shared/withAbort.js';
import type { ProviderResponseMetadata } from '../shared/ProviderResponseMetadata.js';
import { translateGeminiError } from './errors.js';
import { fromGeminiResponse, toGeminiRequest, toGeminiStructuredRequest } from './mapping.js';
import {
  ProviderCapability,
  createProviderCapabilities,
  type ProviderCapabilities,
  type CapableProvider,
} from '../capabilities/index.js';
import { parseAndValidateStructuredOutput } from '../structured-output/parseAndValidateStructuredOutput.js';
import type {
  StructuredOutputProvider,
  StructuredOutputRequest,
  StructuredOutputResult,
} from '../structured-output/types.js';

export interface GeminiPricing {
  readonly inputPricePerMillion: number;
  readonly outputPricePerMillion: number;
}

export interface GeminiProviderConfig {
  apiKey?: string;
  model?: string;
  /** Never hardcoded — supply current Gemini rates if cost tracking is wanted. */
  pricing?: GeminiPricing;
  /** Optional; when supplied, every generate() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements Provider, CapableProvider, StructuredOutputProvider {
  readonly name = 'gemini';

  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly pricing?: GeminiPricing;
  private readonly observability?: ObservabilityBus;
  // Reflects what generate()/generateStructured()/mapping.ts below actually
  // wire up today, not the Gemini API's full theoretical surface — flip a
  // capability to true only once the matching implementation genuinely
  // exists.
  private readonly capabilities = createProviderCapabilities([
    ProviderCapability.TextGeneration,
    ProviderCapability.StructuredOutput,
  ]);

  constructor(config: GeminiProviderConfig = {}) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.model = config.model ?? DEFAULT_MODEL;
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async generate(prompt: Prompt, options?: AidexOptions): Promise<ProviderResponse> {
    const signal = withTimeoutSignal(options?.timeout, options?.signal);
    throwIfAborted(signal);

    const request = toGeminiRequest(prompt, this.model, signal);
    const metrics = new ExecutionMetrics();
    metrics.recordStart();

    let sdkResponse: GenerateContentResponse;
    try {
      sdkResponse = await rejectOnAbort(this.client.models.generateContent(request), signal);
    } catch (error) {
      metrics.recordEnd();
      this.recordFailure(metrics, error, options?.executionId);
      // Our own cancellation is not a vendor error — leave it untranslated.
      // TimeoutError extends AbortedError, so this catches both.
      throw error instanceof AbortedError ? error : translateGeminiError(error, this.name);
    }

    metrics.recordEnd();
    const response = fromGeminiResponse(sdkResponse, prompt, this.name);
    this.recordSuccess(metrics, response, options?.executionId);

    return response;
  }

  async generateStructured<T = unknown>(
    prompt: Prompt,
    request: StructuredOutputRequest,
    options?: AidexOptions
  ): Promise<StructuredOutputResult<T>> {
    const signal = withTimeoutSignal(options?.timeout, options?.signal);
    throwIfAborted(signal);

    const sdkRequest = toGeminiStructuredRequest(prompt, this.model, request.schema, signal);
    const metrics = new ExecutionMetrics();
    metrics.recordStart();

    let sdkResponse: GenerateContentResponse;
    try {
      sdkResponse = await rejectOnAbort(this.client.models.generateContent(sdkRequest), signal);
    } catch (error) {
      metrics.recordEnd();
      this.recordFailure(metrics, error, options?.executionId);
      throw error instanceof AbortedError ? error : translateGeminiError(error, this.name);
    }

    metrics.recordEnd();
    const response = fromGeminiResponse(sdkResponse, prompt, this.name);
    this.recordSuccess(metrics, response, options?.executionId);

    const data = parseAndValidateStructuredOutput<T>(
      this.name,
      response.content,
      request.schema,
      options?.executionId
    );

    return { data, metadata: response.metadata, raw: response.raw };
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  private recordSuccess(metrics: ExecutionMetrics, response: ProviderResponse, executionId?: string): void {
    const bus = this.observability;
    if (!bus) {
      return;
    }

    const usage = (response.metadata as ProviderResponseMetadata | undefined)?.usage;

    bus.trackProvider({ provider: this.name, model: this.model, success: true, executionId });
    bus.trackDurationFromMetrics(metrics, { provider: this.name, model: this.model, executionId });

    if (usage) {
      bus.trackTokens({ provider: this.name, model: this.model, ...usage, executionId });

      if (
        this.pricing &&
        usage.inputTokens !== undefined &&
        usage.outputTokens !== undefined
      ) {
        bus.trackCostFromEstimate(
          {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            inputPricePerMillion: this.pricing.inputPricePerMillion,
            outputPricePerMillion: this.pricing.outputPricePerMillion,
          },
          { provider: this.name, model: this.model, executionId }
        );
      }
    }
  }

  private recordFailure(metrics: ExecutionMetrics, error: unknown, executionId?: string): void {
    const bus = this.observability;
    if (!bus) {
      return;
    }

    bus.trackProvider({ provider: this.name, model: this.model, success: false, executionId });
    bus.trackDurationFromMetrics(metrics, { provider: this.name, model: this.model, executionId });
    bus.trackError({ provider: this.name, model: this.model, error, executionId });
  }
}
