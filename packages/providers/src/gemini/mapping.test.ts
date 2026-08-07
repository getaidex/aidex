import type { GenerateContentResponse } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { fromGeminiResponse, toGeminiRequest } from './mapping.js';

describe('toGeminiRequest', () => {
  it('maps prompt.content to contents and passes the model through', () => {
    const request = toGeminiRequest({ content: 'hello' }, 'gemini-2.0-flash');

    expect(request).toEqual({ model: 'gemini-2.0-flash', contents: 'hello' });
  });

  it('attaches the abort signal onto config.abortSignal when given', () => {
    const controller = new AbortController();

    const request = toGeminiRequest({ content: 'hi' }, 'gemini-2.0-flash', controller.signal);

    expect(request.config).toEqual({ abortSignal: controller.signal });
  });

  it('omits config entirely when no abort signal is given', () => {
    const request = toGeminiRequest({ content: 'hi' }, 'gemini-2.0-flash');
    expect(request.config).toBeUndefined();
  });
});

describe('fromGeminiResponse', () => {
  it('maps sdkResponse.text onto content', () => {
    const sdkResponse = { text: 'the answer' } as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q' }, 'gemini');

    expect(response.content).toBe('the answer');
  });

  it('falls back to an empty string when the SDK response has no text', () => {
    const sdkResponse = {} as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q' }, 'gemini');

    expect(response.content).toBe('');
  });

  it('preserves prompt.metadata and appends provider/model/finishReason', () => {
    const sdkResponse = {
      text: 'ok',
      modelVersion: 'gemini-2.0-flash-001',
      candidates: [{ finishReason: 'STOP' }],
    } as GenerateContentResponse;

    const response = fromGeminiResponse(
      sdkResponse,
      { content: 'q', metadata: { traceId: 'abc' } },
      'gemini'
    );

    expect(response.metadata).toEqual({
      traceId: 'abc',
      provider: 'gemini',
      model: 'gemini-2.0-flash-001',
      finishReason: 'STOP',
    });
  });

  it('maps usage using the standardized inputTokens/outputTokens/totalTokens names', () => {
    const sdkResponse = {
      text: 'ok',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
    } as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q' }, 'gemini');

    expect(response.metadata?.usage).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    });
  });

  it('omits usage entirely when the SDK response has no usageMetadata', () => {
    const sdkResponse = { text: 'ok' } as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q' }, 'gemini');

    expect(response.metadata?.usage).toBeUndefined();
  });

  it('propagates executionId from prompt.metadata through to response.metadata', () => {
    const sdkResponse = { text: 'ok' } as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q', metadata: { executionId: 'exec-e2e-2' } }, 'gemini');

    expect(response.metadata?.executionId).toBe('exec-e2e-2');
  });

  it('keeps the full native SDK response on raw', () => {
    const sdkResponse = { text: 'ok', modelVersion: 'x' } as GenerateContentResponse;

    const response = fromGeminiResponse(sdkResponse, { content: 'q' }, 'gemini');

    expect(response.raw).toBe(sdkResponse);
  });
});
