import { describe, expect, it, vi } from 'vitest';
import { ExecutionMetrics } from '../metrics/ExecutionMetrics.js';
import { ObservabilityBus, ObservabilityEventName } from './ObservabilityBus.js';

describe('ObservabilityBus', () => {
  describe('emit() / subscribe()', () => {
    it('notifies a subscribed handler of an emitted event', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);

      bus.emit({ event: 'custom', metadata: { x: 1 } });

      expect(handler).toHaveBeenCalledWith({ event: 'custom', metadata: { x: 1 } });
    });

    it('notifies every subscribed handler, in subscription order', () => {
      const bus = new ObservabilityBus();
      const calls: string[] = [];
      bus.subscribe(() => calls.push('first'));
      bus.subscribe(() => calls.push('second'));

      bus.emit({ event: 'custom' });

      expect(calls).toEqual(['first', 'second']);
    });

    it('stops notifying a handler once unsubscribed', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      const unsubscribe = bus.subscribe(handler);

      unsubscribe();
      bus.emit({ event: 'custom' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('never throws when nothing is subscribed', () => {
      const bus = new ObservabilityBus();
      expect(() => bus.emit({ event: 'custom' })).not.toThrow();
    });
  });

  describe('getTimeline()', () => {
    it('records every emitted event in order', () => {
      const bus = new ObservabilityBus();

      bus.emit({ event: 'first' });
      bus.emit({ event: 'second' });

      expect(bus.getTimeline().map((e) => e.event)).toEqual(['first', 'second']);
    });

    it('returns a snapshot unaffected by later emits', () => {
      const bus = new ObservabilityBus();
      bus.emit({ event: 'first' });

      const snapshot = bus.getTimeline();
      bus.emit({ event: 'second' });

      expect(snapshot).toEqual([{ event: 'first' }]);
    });
  });

  describe('track*() convenience methods', () => {
    it.each([
      ['trackTokens', ObservabilityEventName.TOKENS],
      ['trackCost', ObservabilityEventName.COST],
      ['trackDuration', ObservabilityEventName.DURATION],
      ['trackProvider', ObservabilityEventName.PROVIDER],
      ['trackEngine', ObservabilityEventName.ENGINE],
      ['trackWorkflow', ObservabilityEventName.WORKFLOW],
      ['trackError', ObservabilityEventName.ERROR],
      ['trackRetry', ObservabilityEventName.RETRY],
    ] as const)('%s() emits an event named %s carrying the given metadata', (method, name) => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);

      bus[method]({ detail: 'x' });

      expect(handler).toHaveBeenCalledWith({ event: name, metadata: { detail: 'x' } });
    });
  });

  describe('trackCostFromEstimate()', () => {
    it('computes cost via the existing estimateCost() and emits it as a cost event', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);

      bus.trackCostFromEstimate({
        inputTokens: 1_000_000,
        outputTokens: 500_000,
        inputPricePerMillion: 2,
        outputPricePerMillion: 4,
      });

      expect(handler).toHaveBeenCalledWith({
        event: ObservabilityEventName.COST,
        metadata: { inputCost: 2, outputCost: 2, totalCost: 4 },
      });
    });

    it('merges in extra metadata alongside the computed cost', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);

      bus.trackCostFromEstimate(
        { inputTokens: 0, outputTokens: 0, inputPricePerMillion: 0, outputPricePerMillion: 0 },
        { provider: 'gemini' }
      );

      expect(handler).toHaveBeenCalledWith({
        event: ObservabilityEventName.COST,
        metadata: { inputCost: 0, outputCost: 0, totalCost: 0, provider: 'gemini' },
      });
    });
  });

  describe('trackDurationFromMetrics()', () => {
    it('reads duration via the existing ExecutionMetrics and emits it as a duration event', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);
      const metrics = new ExecutionMetrics();
      metrics.recordStart(0);
      metrics.recordEnd(250);

      bus.trackDurationFromMetrics(metrics);

      expect(handler).toHaveBeenCalledWith({
        event: ObservabilityEventName.DURATION,
        metadata: { durationMs: 250 },
      });
    });

    it('merges in extra metadata alongside the duration', () => {
      const bus = new ObservabilityBus();
      const handler = vi.fn();
      bus.subscribe(handler);
      const metrics = new ExecutionMetrics();
      metrics.recordStart(0);
      metrics.recordEnd(100);

      bus.trackDurationFromMetrics(metrics, { engineId: 'document.extract' });

      expect(handler).toHaveBeenCalledWith({
        event: ObservabilityEventName.DURATION,
        metadata: { durationMs: 100, engineId: 'document.extract' },
      });
    });
  });
});
