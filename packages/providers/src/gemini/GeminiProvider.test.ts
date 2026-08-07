import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsonSchema } from '../structured-output/JsonSchema.js';

const generateContentMock = vi.fn();

// Preserve every real export (notably ApiError, needed for the
// `instanceof ApiError` check inside translateGeminiError) and only replace
// GoogleGenAI itself.
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: { generateContent: generateContentMock },
    })),
  };
});

const { GeminiProvider } = await import('./GeminiProvider.js');
const { GoogleGenAI, ApiError } = await import('@google/genai');
const { ObservabilityBus } = await import('@aidex/observability');
const {
  ProviderError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderInvalidRequestError,
  ProviderUnavailableError,
} = await import('../shared/errors.js');
const { TimeoutError } = await import('../shared/withAbort.js');
const { StructuredOutputGenerationError, StructuredOutputValidationError } = await import(
  '../structured-output/errors.js'
);

describe('GeminiProvider', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    vi.mocked(GoogleGenAI).mockClear();
  });

  describe('construction', () => {
    it('exposes the "gemini" name', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      expect(provider.name).toBe('gemini');
    });

    it('constructs the SDK client once, with the configured apiKey', () => {
      new GeminiProvider({ apiKey: 'test-key' });

      expect(GoogleGenAI).toHaveBeenCalledTimes(1);
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });

    it('does not require config at all (apiKey/model are optional)', () => {
      expect(() => new GeminiProvider()).not.toThrow();
    });
  });

  describe('generate() — request translation', () => {
    it('sends prompt.content and the default model to the SDK', async () => {
      generateContentMock.mockResolvedValue({ text: 'hi back' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await provider.generate({ content: 'hello gemini' });

      expect(generateContentMock).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-2.0-flash', contents: 'hello gemini' })
      );
    });

    it('uses the configured model instead of the default when provided', async () => {
      generateContentMock.mockResolvedValue({ text: 'ok' });
      const provider = new GeminiProvider({ apiKey: 'test-key', model: 'gemini-1.5-pro' });

      await provider.generate({ content: 'hi' });

      expect(generateContentMock).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gemini-1.5-pro' })
      );
    });

    it('calls generateContent exactly once per generate() call', async () => {
      generateContentMock.mockResolvedValue({ text: 'ok' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await provider.generate({ content: 'hi' });

      expect(generateContentMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('generate() — response mapping', () => {
    it('maps sdkResponse.text onto ProviderResponse.content', async () => {
      generateContentMock.mockResolvedValue({ text: 'the sky is blue' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const response = await provider.generate({ content: 'why is the sky blue?' });

      expect(response.content).toBe('the sky is blue');
    });

    it('falls back to an empty string when the SDK returns no text', async () => {
      generateContentMock.mockResolvedValue({});
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const response = await provider.generate({ content: 'hi' });

      expect(response.content).toBe('');
    });

    it('preserves prompt.metadata and appends provider diagnostics rather than replacing it', async () => {
      generateContentMock.mockResolvedValue({
        text: 'ok',
        modelVersion: 'gemini-2.0-flash-001',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 5, totalTokenCount: 8 },
      });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const response = await provider.generate({
        content: 'hi',
        metadata: { traceId: 'abc', tenant: 'acme' },
      });

      expect(response.metadata).toMatchObject({
        traceId: 'abc',
        tenant: 'acme',
        provider: 'gemini',
        model: 'gemini-2.0-flash-001',
        finishReason: 'STOP',
        usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
      });
    });

    it('still attaches provider diagnostics when the prompt carries no metadata', async () => {
      generateContentMock.mockResolvedValue({ text: 'ok' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const response = await provider.generate({ content: 'hi' });

      expect(response.metadata).toMatchObject({ provider: 'gemini' });
    });

    it('populates raw with the full native SDK response', async () => {
      const sdkResponse = {
        text: 'ok',
        modelVersion: 'gemini-2.0-flash',
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      };
      generateContentMock.mockResolvedValue(sdkResponse);
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const response = await provider.generate({ content: 'hi' });

      expect(response.raw).toBe(sdkResponse);
    });
  });

  describe('generateStructured() — request translation', () => {
    it('sets responseMimeType and responseJsonSchema instead of appending prompt text', async () => {
      generateContentMock.mockResolvedValue({ text: '{"title":"x"}' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const schema: JsonSchema = {
        type: 'object',
        properties: { title: { type: 'string' } },
        required: ['title'],
      };

      await provider.generateStructured({ content: 'extract the title' }, { schema });

      expect(generateContentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: 'extract the title',
          config: expect.objectContaining({
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
          }),
        })
      );
    });
  });

  describe('generateStructured() — response handling', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title'],
    };

    it('returns parsed, validated data on schema-conformant JSON text', async () => {
      generateContentMock.mockResolvedValue({ text: '{"title":"Team sync"}' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const result = await provider.generateStructured<{ title: string }>(
        { content: 'extract' },
        { schema }
      );

      expect(result.data).toEqual({ title: 'Team sync' });
    });

    it('rejects with StructuredOutputGenerationError when the SDK text is not valid JSON', async () => {
      generateContentMock.mockResolvedValue({ text: 'not json' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(
        provider.generateStructured({ content: 'extract' }, { schema })
      ).rejects.toBeInstanceOf(StructuredOutputGenerationError);
    });

    it('rejects with StructuredOutputValidationError when the JSON does not match the schema', async () => {
      generateContentMock.mockResolvedValue({ text: '{}' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const error = await provider
        .generateStructured({ content: 'extract' }, { schema })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(StructuredOutputValidationError);
      expect((error as StructuredOutputValidationError).provider).toBe('gemini');
    });

    it('still translates vendor errors (e.g. 401) the same way generate() does', async () => {
      generateContentMock.mockRejectedValue(new ApiError({ message: 'bad key', status: 401 }));
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(
        provider.generateStructured({ content: 'extract' }, { schema })
      ).rejects.toBeInstanceOf(ProviderAuthenticationError);
    });

    it('propagates result.metadata and result.raw from the mapped ProviderResponse', async () => {
      const sdkResponse = { text: '{"title":"x"}', modelVersion: 'gemini-2.0-flash' };
      generateContentMock.mockResolvedValue(sdkResponse);
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const result = await provider.generateStructured({ content: 'extract' }, { schema });

      expect(result.raw).toBe(sdkResponse);
      expect(result.metadata).toMatchObject({ provider: 'gemini', model: 'gemini-2.0-flash' });
    });
  });

  describe('generate() — error handling (translation)', () => {
    it('translates an ApiError(401) into ProviderAuthenticationError', async () => {
      const apiError = new ApiError({ message: 'bad key', status: 401 });
      generateContentMock.mockRejectedValue(apiError);
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const rejection = provider.generate({ content: 'hi' });
      await expect(rejection).rejects.toBeInstanceOf(ProviderAuthenticationError);
      await expect(rejection).rejects.toMatchObject({ provider: 'gemini', cause: apiError });
    });

    it('translates an ApiError(429) into ProviderRateLimitError', async () => {
      generateContentMock.mockRejectedValue(new ApiError({ message: 'slow down', status: 429 }));
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(provider.generate({ content: 'hi' })).rejects.toBeInstanceOf(
        ProviderRateLimitError
      );
    });

    it('translates an ApiError(400) into ProviderInvalidRequestError', async () => {
      generateContentMock.mockRejectedValue(new ApiError({ message: 'bad request', status: 400 }));
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(provider.generate({ content: 'hi' })).rejects.toBeInstanceOf(
        ProviderInvalidRequestError
      );
    });

    it('translates an ApiError(500+) into ProviderUnavailableError', async () => {
      generateContentMock.mockRejectedValue(new ApiError({ message: 'down', status: 503 }));
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(provider.generate({ content: 'hi' })).rejects.toBeInstanceOf(
        ProviderUnavailableError
      );
    });

    it('wraps a non-ApiError (network) failure as a generic ProviderError, never left raw', async () => {
      const networkError = new TypeError('fetch failed');
      generateContentMock.mockRejectedValue(networkError);
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const rejection = provider.generate({ content: 'hi' });
      await expect(rejection).rejects.toBeInstanceOf(ProviderError);
      await expect(rejection).rejects.not.toBe(networkError);
      await expect(rejection).rejects.toMatchObject({ cause: networkError });
    });

    it('never translates our own AbortedError into a ProviderError', async () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const controller = new AbortController();
      controller.abort();

      await expect(
        provider.generate({ content: 'hi' }, { signal: controller.signal })
      ).rejects.not.toBeInstanceOf(ProviderError);
    });
  });

  describe('generate() — abort/timeout (withAbort)', () => {
    it('throws before calling the SDK when the signal is already aborted', async () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const controller = new AbortController();
      controller.abort();

      await expect(
        provider.generate({ content: 'hi' }, { signal: controller.signal })
      ).rejects.toThrow('Aborted');

      expect(generateContentMock).not.toHaveBeenCalled();
    });

    it('rejects an in-flight call once the caller aborts mid-request', async () => {
      let releaseSdkCall!: (value: { text: string }) => void;
      generateContentMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            releaseSdkCall = resolve;
          })
      );
      const provider = new GeminiProvider({ apiKey: 'test-key' });
      const controller = new AbortController();

      const pending = provider.generate({ content: 'hi' }, { signal: controller.signal });
      controller.abort();

      await expect(pending).rejects.toThrow('Aborted');

      // The SDK call was made and is still outstanding — resolving it late
      // must not resurrect the already-rejected generate() promise.
      releaseSdkCall({ text: 'too late' });
    });

    it('rejects an in-flight call with TimeoutError once options.timeout elapses', async () => {
      vi.useFakeTimers();
      try {
        generateContentMock.mockImplementation(() => new Promise(() => {}));
        const provider = new GeminiProvider({ apiKey: 'test-key' });

        const pending = provider.generate({ content: 'hi' }, { timeout: 50 });
        const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);

        await vi.advanceTimersByTimeAsync(50);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });

    it('never translates a TimeoutError into a ProviderError', async () => {
      vi.useFakeTimers();
      try {
        generateContentMock.mockImplementation(() => new Promise(() => {}));
        const provider = new GeminiProvider({ apiKey: 'test-key' });

        const pending = provider.generate({ content: 'hi' }, { timeout: 50 });
        const assertion = expect(pending).rejects.not.toBeInstanceOf(ProviderError);

        await vi.advanceTimersByTimeAsync(50);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('observability integration', () => {
    it('does nothing observable when no ObservabilityBus is configured (backward compatible)', async () => {
      generateContentMock.mockResolvedValue({ text: 'ok' });
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      await expect(provider.generate({ content: 'hi' })).resolves.toBeDefined();
    });

    it('records a successful call: provider, duration, and tokens', async () => {
      generateContentMock.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      });
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({ apiKey: 'test-key', observability: bus });

      await provider.generate({ content: 'hi' });

      const eventNames = events.map((e) => e.event);
      expect(eventNames).toEqual(expect.arrayContaining(['provider', 'duration', 'tokens']));

      const providerEvent = events.find((e) => e.event === 'provider');
      expect(providerEvent?.metadata).toMatchObject({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        success: true,
      });

      const tokensEvent = events.find((e) => e.event === 'tokens');
      expect(tokensEvent?.metadata).toMatchObject({
        provider: 'gemini',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });
    });

    it('records cost only when both usage and pricing are available', async () => {
      generateContentMock.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 1_000_000, candidatesTokenCount: 500_000, totalTokenCount: 1_500_000 },
      });
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        observability: bus,
        pricing: { inputPricePerMillion: 2, outputPricePerMillion: 4 },
      });

      await provider.generate({ content: 'hi' });

      const costEvent = events.find((e) => e.event === 'cost');
      expect(costEvent?.metadata).toMatchObject({
        provider: 'gemini',
        inputCost: 2,
        outputCost: 2,
        totalCost: 4,
      });
    });

    it('omits cost when usage is present but no pricing was configured', async () => {
      generateContentMock.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      });
      const bus = new ObservabilityBus();
      const events: { event: string }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({ apiKey: 'test-key', observability: bus });

      await provider.generate({ content: 'hi' });

      expect(events.some((e) => e.event === 'cost')).toBe(false);
    });

    it('records provider(success:false) and an error event on a failed call, still with duration', async () => {
      const failure = new ApiError({ message: 'down', status: 503 });
      generateContentMock.mockRejectedValue(failure);
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({ apiKey: 'test-key', observability: bus });

      await expect(provider.generate({ content: 'hi' })).rejects.toBeInstanceOf(
        ProviderUnavailableError
      );

      const eventNames = events.map((e) => e.event);
      expect(eventNames).toEqual(expect.arrayContaining(['provider', 'duration', 'error']));

      const providerEvent = events.find((e) => e.event === 'provider');
      expect(providerEvent?.metadata).toMatchObject({ provider: 'gemini', success: false });

      const errorEvent = events.find((e) => e.event === 'error');
      expect(errorEvent?.metadata?.error).toBe(failure);
    });

    it('includes options.executionId in every observability event when provided', async () => {
      generateContentMock.mockResolvedValue({
        text: 'ok',
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      });
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        observability: bus,
        pricing: { inputPricePerMillion: 1, outputPricePerMillion: 1 },
      });

      await provider.generate({ content: 'hi' }, { executionId: 'exec-123' });

      for (const event of events) {
        expect(event.metadata).toMatchObject({ executionId: 'exec-123' });
      }
    });

    it('includes options.executionId in the error event on a failed call', async () => {
      generateContentMock.mockRejectedValue(new ApiError({ message: 'down', status: 503 }));
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({ apiKey: 'test-key', observability: bus });

      await expect(
        provider.generate({ content: 'hi' }, { executionId: 'exec-456' })
      ).rejects.toBeInstanceOf(ProviderUnavailableError);

      const errorEvent = events.find((e) => e.event === 'error');
      expect(errorEvent?.metadata).toMatchObject({ executionId: 'exec-456' });
    });

    it('omits executionId cleanly (undefined) when options carry none', async () => {
      generateContentMock.mockResolvedValue({ text: 'ok' });
      const bus = new ObservabilityBus();
      const events: { event: string; metadata?: Record<string, unknown> }[] = [];
      bus.subscribe((event) => events.push(event));
      const provider = new GeminiProvider({ apiKey: 'test-key', observability: bus });

      await provider.generate({ content: 'hi' });

      const providerEvent = events.find((e) => e.event === 'provider');
      expect(providerEvent?.metadata?.executionId).toBeUndefined();
    });
  });

  describe('getCapabilities()', () => {
    it('reports text-generation and structured-output as supported — nothing else is wired up today', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      expect(provider.getCapabilities()).toEqual({
        'text-generation': true,
        'structured-output': true,
        'image-generation': false,
        'image-understanding': false,
        embeddings: false,
        streaming: false,
        'tool-calling': false,
        'function-calling': false,
        'json-output': false,
        'multimodal-input': false,
      });
    });

    it('returns the exact same frozen object instance on repeated calls', () => {
      const provider = new GeminiProvider({ apiKey: 'test-key' });

      const first = provider.getCapabilities();
      const second = provider.getCapabilities();

      expect(first).toBe(second);
      expect(Object.isFrozen(first)).toBe(true);
    });

    it('does not share its capability object instance with StubProvider', async () => {
      const { StubProvider } = await import('../stub/StubProvider.js');
      const geminiProvider = new GeminiProvider({ apiKey: 'test-key' });
      const stubProvider = new StubProvider();

      expect(geminiProvider.getCapabilities()).not.toBe(stubProvider.getCapabilities());
      expect(geminiProvider.getCapabilities()).toEqual(stubProvider.getCapabilities());
    });
  });
});
