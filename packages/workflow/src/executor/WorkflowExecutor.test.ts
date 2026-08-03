import { describe, expect, it } from 'vitest';
import type { WorkflowStep } from '../step/WorkflowStep.js';
import type { WorkflowEvent } from '../types/WorkflowEvent.js';
import { Workflow } from '../workflow/Workflow.js';
import { WorkflowCancelledError } from './WorkflowCancelledError.js';
import { WorkflowExecutor } from './WorkflowExecutor.js';

interface TestState {
  order: string[];
  contextsSeen: unknown[];
}

function makeStep(name: string, onExecute?: (context: TestState) => void | Promise<void>): WorkflowStep<TestState> {
  return {
    name,
    async execute(context) {
      context.order.push(name);
      context.contextsSeen.push(context);
      await onExecute?.(context);
    },
  };
}

describe('WorkflowExecutor', () => {
  it('executes steps in order', async () => {
    const workflow = new Workflow<TestState>();
    workflow.addStep(makeStep('first'));
    workflow.addStep(makeStep('second'));
    workflow.addStep(makeStep('third'));

    const context: TestState = { order: [], contextsSeen: [] };
    await new WorkflowExecutor().execute(workflow, context);

    expect(context.order).toEqual(['first', 'second', 'third']);
  });

  it('passes the exact same context instance to every step', async () => {
    const workflow = new Workflow<TestState>();
    workflow.addStep(makeStep('first'));
    workflow.addStep(makeStep('second'));

    const context: TestState = { order: [], contextsSeen: [] };
    await new WorkflowExecutor().execute(workflow, context);

    expect(context.contextsSeen).toHaveLength(2);
    expect(context.contextsSeen[0]).toBe(context);
    expect(context.contextsSeen[1]).toBe(context);
  });

  it('lets a step mutate context in place, visible to the next step', async () => {
    interface CounterState {
      count: number;
    }
    const workflow = new Workflow<CounterState>();
    workflow.addStep({
      name: 'increment-once',
      async execute(context) {
        context.count += 1;
      },
    });
    workflow.addStep({
      name: 'increment-again',
      async execute(context) {
        context.count += 1;
      },
    });

    const context: CounterState = { count: 0 };
    const result = await new WorkflowExecutor().execute(workflow, context);

    expect(result.count).toBe(2);
  });

  it('stops immediately when a step throws', async () => {
    const workflow = new Workflow<TestState>();
    const failure = new Error('step exploded');
    workflow.addStep(makeStep('first'));
    workflow.addStep({
      name: 'failing',
      async execute() {
        throw failure;
      },
    });
    workflow.addStep(makeStep('third'));

    const context: TestState = { order: [], contextsSeen: [] };

    await expect(new WorkflowExecutor().execute(workflow, context)).rejects.toBe(failure);
  });

  it('never runs steps registered after the one that threw', async () => {
    const workflow = new Workflow<TestState>();
    workflow.addStep(makeStep('first'));
    workflow.addStep({
      name: 'failing',
      async execute(context) {
        context.order.push('failing');
        throw new Error('step exploded');
      },
    });
    workflow.addStep(makeStep('never-runs'));

    const context: TestState = { order: [], contextsSeen: [] };

    await expect(new WorkflowExecutor().execute(workflow, context)).rejects.toThrow(
      'step exploded'
    );
    expect(context.order).toEqual(['first', 'failing']);
  });

  it('returns the final context after all steps complete', async () => {
    const workflow = new Workflow<TestState>();
    workflow.addStep(makeStep('first'));
    workflow.addStep(makeStep('second'));

    const context: TestState = { order: [], contextsSeen: [] };
    const result = await new WorkflowExecutor().execute(workflow, context);

    expect(result).toBe(context);
    expect(result.order).toEqual(['first', 'second']);
  });

  it('resolves with the untouched context for an empty workflow', async () => {
    const workflow = new Workflow<TestState>();
    const context: TestState = { order: [], contextsSeen: [] };

    const result = await new WorkflowExecutor().execute(workflow, context);

    expect(result).toBe(context);
    expect(result.order).toEqual([]);
  });

  describe('cancellation', () => {
    it('rejects with WorkflowCancelledError when the signal is already aborted before the first step', async () => {
      const workflow = new Workflow<TestState>();
      workflow.addStep(makeStep('never-runs'));
      const controller = new AbortController();
      controller.abort();

      const context: TestState = { order: [], contextsSeen: [] };

      await expect(
        new WorkflowExecutor().execute(workflow, context, { signal: controller.signal })
      ).rejects.toBeInstanceOf(WorkflowCancelledError);
      expect(context.order).toEqual([]);
    });

    it('stops before a later step once the signal aborts between steps', async () => {
      const workflow = new Workflow<TestState>();
      const controller = new AbortController();
      workflow.addStep(makeStep('first', () => controller.abort()));
      workflow.addStep(makeStep('never-runs'));

      const context: TestState = { order: [], contextsSeen: [] };

      await expect(
        new WorkflowExecutor().execute(workflow, context, { signal: controller.signal })
      ).rejects.toBeInstanceOf(WorkflowCancelledError);
      expect(context.order).toEqual(['first']);
    });

    it('rejects an in-flight step once the signal aborts mid-execution', async () => {
      const workflow = new Workflow<TestState>();
      const controller = new AbortController();
      workflow.addStep({
        name: 'slow',
        execute: () => new Promise(() => {}), // never resolves on its own
      });

      const context: TestState = { order: [], contextsSeen: [] };
      const pending = new WorkflowExecutor().execute(workflow, context, {
        signal: controller.signal,
      });
      controller.abort();

      await expect(pending).rejects.toBeInstanceOf(WorkflowCancelledError);
    });

    it('behaves exactly as before when no signal is supplied', async () => {
      const workflow = new Workflow<TestState>();
      workflow.addStep(makeStep('first'));

      const context: TestState = { order: [], contextsSeen: [] };
      const result = await new WorkflowExecutor().execute(workflow, context);

      expect(result.order).toEqual(['first']);
    });
  });

  describe('observability events', () => {
    it('emits workflow-started, step-started/completed per step, then workflow-completed', async () => {
      const workflow = new Workflow<TestState>();
      workflow.addStep(makeStep('first'));
      workflow.addStep(makeStep('second'));
      const events: WorkflowEvent[] = [];

      const context: TestState = { order: [], contextsSeen: [] };
      await new WorkflowExecutor().execute(workflow, context, {
        onEvent: (event) => events.push(event),
      });

      expect(events.map((e) => e.type)).toEqual([
        'workflow-started',
        'step-started',
        'step-completed',
        'step-started',
        'step-completed',
        'workflow-completed',
      ]);
      expect(events[1]?.stepName).toBe('first');
      expect(events[3]?.stepName).toBe('second');
    });

    it('emits step-failed (not workflow-completed) when a step throws, carrying the error', async () => {
      const workflow = new Workflow<TestState>();
      const failure = new Error('step exploded');
      workflow.addStep(makeStep('first'));
      workflow.addStep({
        name: 'failing',
        async execute() {
          throw failure;
        },
      });
      const events: WorkflowEvent[] = [];

      const context: TestState = { order: [], contextsSeen: [] };
      await expect(
        new WorkflowExecutor().execute(workflow, context, {
          onEvent: (event) => events.push(event),
        })
      ).rejects.toBe(failure);

      expect(events.map((e) => e.type)).toEqual([
        'workflow-started',
        'step-started',
        'step-completed',
        'step-started',
        'step-failed',
      ]);
      const failedEvent = events.at(-1);
      expect(failedEvent?.stepName).toBe('failing');
      expect(failedEvent?.error).toBe(failure);
    });

    it('emits workflow-cancelled instead of step-failed when cancellation stops execution', async () => {
      // Aborting from inside a step races against that same step (see the
      // "rejects an in-flight step" test above) — so the aborting step
      // itself is pre-empted as cancelled, never completed, and no later
      // step starts.
      const workflow = new Workflow<TestState>();
      const controller = new AbortController();
      workflow.addStep(makeStep('first', () => controller.abort()));
      workflow.addStep(makeStep('never-runs'));
      const events: WorkflowEvent[] = [];

      const context: TestState = { order: [], contextsSeen: [] };
      await expect(
        new WorkflowExecutor().execute(workflow, context, {
          signal: controller.signal,
          onEvent: (event) => events.push(event),
        })
      ).rejects.toBeInstanceOf(WorkflowCancelledError);

      expect(events.map((e) => e.type)).toEqual([
        'workflow-started',
        'step-started',
        'workflow-cancelled',
      ]);
      expect(context.order).toEqual(['first']);
    });

    it('never throws or requires onEvent — omitting it changes nothing', async () => {
      const workflow = new Workflow<TestState>();
      workflow.addStep(makeStep('first'));

      const context: TestState = { order: [], contextsSeen: [] };
      await expect(new WorkflowExecutor().execute(workflow, context)).resolves.toBe(context);
    });
  });
});
