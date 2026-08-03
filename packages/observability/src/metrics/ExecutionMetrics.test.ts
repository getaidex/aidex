import { describe, expect, it } from 'vitest';
import { ExecutionMetrics } from './ExecutionMetrics.js';

describe('ExecutionMetrics', () => {
  it('has no duration before start/end are recorded', () => {
    const metrics = new ExecutionMetrics();
    expect(metrics.getDuration()).toBeUndefined();
  });

  it('has no duration after only recordStart()', () => {
    const metrics = new ExecutionMetrics();
    metrics.recordStart(0);
    expect(metrics.getDuration()).toBeUndefined();
  });

  it('has no duration after only recordEnd()', () => {
    const metrics = new ExecutionMetrics();
    metrics.recordEnd(100);
    expect(metrics.getDuration()).toBeUndefined();
  });

  it('calculates duration as end - start, given explicit deterministic timestamps', () => {
    const metrics = new ExecutionMetrics();
    metrics.recordStart(1_000);
    metrics.recordEnd(1_250);
    expect(metrics.getDuration()).toBe(250);
  });

  it('exposes the raw recorded start/end timestamps', () => {
    const metrics = new ExecutionMetrics();
    metrics.recordStart(10);
    metrics.recordEnd(30);
    expect(metrics.getStartedAt()).toBe(10);
    expect(metrics.getEndedAt()).toBe(30);
  });

  it('recomputes duration if recordEnd() is called again with a later timestamp', () => {
    const metrics = new ExecutionMetrics();
    metrics.recordStart(0);
    metrics.recordEnd(50);
    expect(metrics.getDuration()).toBe(50);

    metrics.recordEnd(120);
    expect(metrics.getDuration()).toBe(120);
  });
});
