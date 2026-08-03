import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { Prompt, ProviderResponse } from '@aidex/core';
import type { ProviderResponseMetadata } from '../shared/ProviderResponseMetadata.js';

/**
 * Translate a provider-agnostic Prompt into the Gemini SDK's request shape.
 * Pure mapping only — no client, no network call.
 */
export function toGeminiRequest(
  prompt: Prompt,
  model: string,
  abortSignal?: AbortSignal
): GenerateContentParameters {
  return {
    model,
    contents: prompt.content,
    ...(abortSignal ? { config: { abortSignal } } : {}),
  };
}

/**
 * Map a Gemini SDK response back onto the provider-agnostic ProviderResponse
 * shape. `prompt.metadata` is preserved and provider-specific diagnostics are
 * appended to it, never replacing it. The full native SDK response is kept
 * on `raw` for callers that need more than `content`. Token counts use the
 * standardized `inputTokens`/`outputTokens`/`totalTokens` vocabulary
 * (ProviderResponseMetadata), not Gemini's own `promptTokenCount`/
 * `candidatesTokenCount` field names.
 */
export function fromGeminiResponse(
  sdkResponse: GenerateContentResponse,
  prompt: Prompt,
  providerName: string
): ProviderResponse {
  const usage = sdkResponse.usageMetadata;

  const metadata: ProviderResponseMetadata = {
    ...prompt.metadata,
    provider: providerName,
    model: sdkResponse.modelVersion,
    finishReason: sdkResponse.candidates?.[0]?.finishReason,
    ...(usage
      ? {
          usage: {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          },
        }
      : {}),
  };

  return {
    content: sdkResponse.text ?? '',
    metadata,
    raw: sdkResponse,
  };
}
