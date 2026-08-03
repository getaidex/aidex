import { describe, expect, it } from 'vitest';
import { Workflow } from '../workflow/Workflow.js';
import { WorkflowNotFoundError } from '../errors/WorkflowNotFoundError.js';
import { WorkflowAlreadyRegisteredError } from '../errors/WorkflowAlreadyRegisteredError.js';
import { WorkflowRegistry } from './WorkflowRegistry.js';

interface TestState {
  order: string[];
}

function makeWorkflow(id: string, stepNames: string[] = ['only']): Workflow<TestState> {
  const workflow = new Workflow<TestState>(id);
  for (const name of stepNames) {
    workflow.addStep({
      name,
      async execute(context) {
        context.order.push(name);
      },
    });
  }
  return workflow;
}

describe('WorkflowRegistry', () => {
  describe('register()', () => {
    it('registers a workflow so has()/get() find it', () => {
      const registry = new WorkflowRegistry();
      const workflow = makeWorkflow('resume-review');

      registry.register(workflow);

      expect(registry.has('resume-review')).toBe(true);
      expect(registry.get('resume-review')).toBe(workflow);
    });

    it('throws a plain Error when workflow.id is not set', () => {
      const registry = new WorkflowRegistry();
      const workflow = new Workflow();

      expect(() => registry.register(workflow)).toThrow(/requires workflow\.id/i);
    });

    it('throws WorkflowAlreadyRegisteredError on a second registration under the same id', () => {
      const registry = new WorkflowRegistry();
      registry.register(makeWorkflow('resume-review'));

      expect(() => registry.register(makeWorkflow('resume-review'))).toThrow(
        WorkflowAlreadyRegisteredError
      );
    });
  });

  describe('unregister()', () => {
    it('removes a registered workflow and returns true', () => {
      const registry = new WorkflowRegistry();
      registry.register(makeWorkflow('resume-review'));

      expect(registry.unregister('resume-review')).toBe(true);
      expect(registry.has('resume-review')).toBe(false);
    });

    it('returns false for an id that was never registered', () => {
      expect(new WorkflowRegistry().unregister('missing')).toBe(false);
    });
  });

  describe('has()/get()/list()', () => {
    it('returns false/undefined for an unregistered id', () => {
      const registry = new WorkflowRegistry();
      expect(registry.has('missing')).toBe(false);
      expect(registry.get('missing')).toBeUndefined();
    });

    it('list() returns every registered workflow', () => {
      const registry = new WorkflowRegistry();
      const a = makeWorkflow('a');
      const b = makeWorkflow('b');
      registry.register(a);
      registry.register(b);

      expect(registry.list()).toEqual([a, b]);
    });

    it('list() returns an empty array when nothing is registered', () => {
      expect(new WorkflowRegistry().list()).toEqual([]);
    });
  });

  describe('execute()', () => {
    it('dispatches to the registered workflow, genuinely running its steps in order', async () => {
      const registry = new WorkflowRegistry();
      registry.register(makeWorkflow('resume-review', ['parse', 'score', 'summarize']));

      const context: TestState = { order: [] };
      const result = await registry.execute('resume-review', context);

      expect(result.order).toEqual(['parse', 'score', 'summarize']);
      expect(result).toBe(context);
    });

    it('throws WorkflowNotFoundError for an unregistered id', async () => {
      const registry = new WorkflowRegistry();

      await expect(registry.execute('missing', { order: [] })).rejects.toBeInstanceOf(
        WorkflowNotFoundError
      );
    });

    it('propagates a rejection from a step without catching it', async () => {
      const registry = new WorkflowRegistry();
      const failure = new Error('step exploded');
      const workflow = new Workflow<TestState>('explode');
      workflow.addStep({
        name: 'boom',
        async execute() {
          throw failure;
        },
      });
      registry.register(workflow);

      await expect(registry.execute('explode', { order: [] })).rejects.toBe(failure);
    });

    it('passes options (e.g. signal) straight through to the underlying WorkflowExecutor', async () => {
      const registry = new WorkflowRegistry();
      const workflow = new Workflow<TestState>('cancellable');
      workflow.addStep({
        name: 'never-runs',
        async execute(context) {
          context.order.push('never-runs');
        },
      });
      registry.register(workflow);
      const controller = new AbortController();
      controller.abort();

      await expect(
        registry.execute('cancellable', { order: [] }, { signal: controller.signal })
      ).rejects.toThrow(/cancelled/i);
    });
  });
});
