import { describe, expect, it } from 'vitest';
import { Timeline } from './Timeline.js';

describe('Timeline', () => {
  it('starts empty', () => {
    const timeline = new Timeline();
    expect(timeline.list()).toEqual([]);
  });

  it('preserves insertion order across multiple record() calls', () => {
    const timeline = new Timeline();

    timeline.record({ event: 'started' });
    timeline.record({ event: 'provider-called' });
    timeline.record({ event: 'provider-returned' });
    timeline.record({ event: 'strategy-finished' });

    expect(timeline.list().map((e) => e.event)).toEqual([
      'started',
      'provider-called',
      'provider-returned',
      'strategy-finished',
    ]);
  });

  it('stores whatever metadata the caller supplies, unmodified', () => {
    const timeline = new Timeline();

    timeline.record({ event: 'provider-called', metadata: { strategy: 'echo' } });

    expect(timeline.list()[0]).toEqual({
      event: 'provider-called',
      metadata: { strategy: 'echo' },
    });
  });

  it('never generates its own timestamp — events carry only what the caller passed in', () => {
    const timeline = new Timeline();

    timeline.record({ event: 'started' });

    expect(timeline.list()[0]).toEqual({ event: 'started' });
    expect(Object.keys(timeline.list()[0])).toEqual(['event']);
  });

  it('returns a snapshot — mutating the returned array does not affect the Timeline', () => {
    const timeline = new Timeline();
    timeline.record({ event: 'started' });

    const snapshot = timeline.list();
    snapshot.push({ event: 'tampered' });

    expect(timeline.list()).toEqual([{ event: 'started' }]);
  });

  it('allows duplicate event names to be recorded independently', () => {
    const timeline = new Timeline();

    timeline.record({ event: 'provider-called', metadata: { attempt: 1 } });
    timeline.record({ event: 'provider-called', metadata: { attempt: 2 } });

    expect(timeline.list()).toEqual([
      { event: 'provider-called', metadata: { attempt: 1 } },
      { event: 'provider-called', metadata: { attempt: 2 } },
    ]);
  });
});
