import type { ProviderResponse } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { describe, expect, it } from 'vitest';
import { callProviderWithObservability } from './callProviderWithObservability.js';

describe('callProviderWithObservability', () => {
  it('returns the call()s response unchanged', async () => {
    const response: ProviderResponse = { content: 'hello' };
    const result = await callProviderWithObservability({ strategyName: 's', providerName: 'p', call: async () => response });
    expect(result).toBe(response);
  });

  it('records no events when observability is not configured', async () => {
    await expect(
      callProviderWithObservability({ strategyName: 's', providerName: 'p', call: async () => ({ content: 'ok' }) })
    ).resolves.toBeDefined();
  });

  it('records provider (success) + duration on success without usage metadata', async () => {
    const observability = new ObservabilityBus();
    await callProviderWithObservability({
      strategyName: 's',
      providerName: 'p',
      observability,
      call: async () => ({ content: 'ok' }),
    });
    const events = observability.getTimeline();
    expect(events.map((e) => e.event)).toEqual(['provider', 'duration']);
    expect(events[0].metadata).toMatchObject({ provider: 'p', strategy: 's', success: true });
  });

  it('records tokens when usage metadata is present but pricing is not configured', async () => {
    const observability = new ObservabilityBus();
    await callProviderWithObservability({
      strategyName: 's',
      providerName: 'p',
      observability,
      call: async () => ({ content: 'ok', metadata: { usage: { inputTokens: 10, outputTokens: 5 } } }),
    });
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records cost from estimate when usage and pricing are both present', async () => {
    const observability = new ObservabilityBus();
    await callProviderWithObservability({
      strategyName: 's',
      providerName: 'p',
      observability,
      pricing: { inputPricePerMillion: 1, outputPricePerMillion: 2 },
      call: async () => ({
        content: 'ok',
        metadata: { usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } },
      }),
    });
    const events = observability.getTimeline();
    expect(events.map((e) => e.event)).toEqual(['provider', 'duration', 'tokens', 'cost']);
    expect(events[3].metadata).toMatchObject({ totalCost: expect.closeTo(0.00014, 10) });
  });

  it('records provider (failure) + duration + error and rethrows on a rejected call', async () => {
    const observability = new ObservabilityBus();
    const error = new Error('boom');
    await expect(
      callProviderWithObservability({
        strategyName: 's',
        providerName: 'p',
        observability,
        call: async () => {
          throw error;
        },
      })
    ).rejects.toBe(error);
    const events = observability.getTimeline();
    expect(events.map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
    expect(events[0].metadata).toMatchObject({ success: false });
  });

  it('propagates a rejected call even without observability configured', async () => {
    const error = new Error('boom');
    await expect(
      callProviderWithObservability({
        strategyName: 's',
        providerName: 'p',
        call: async () => {
          throw error;
        },
      })
    ).rejects.toBe(error);
  });
});
