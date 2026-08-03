import { describe, expect, it } from 'vitest';
import type { WorkflowStep } from '../step/WorkflowStep.js';
import { Workflow } from './Workflow.js';

function makeStep(name: string): WorkflowStep {
  return {
    name,
    async execute() {
      // inert fake step — no real work
    },
  };
}

describe('Workflow', () => {
  it('starts empty', () => {
    const workflow = new Workflow();
    expect(workflow.getSteps()).toEqual([]);
  });

  it('adds a single step', () => {
    const workflow = new Workflow();
    const step = makeStep('first');

    workflow.addStep(step);

    expect(workflow.getSteps()).toEqual([step]);
  });

  it('preserves insertion order across multiple addStep() calls', () => {
    const workflow = new Workflow();
    const first = makeStep('first');
    const second = makeStep('second');
    const third = makeStep('third');

    workflow.addStep(first);
    workflow.addStep(second);
    workflow.addStep(third);

    expect(workflow.getSteps().map((step) => step.name)).toEqual(['first', 'second', 'third']);
  });

  it('allows multiple steps to be added and exposes all of them', () => {
    const workflow = new Workflow();
    const steps = [makeStep('a'), makeStep('b'), makeStep('c'), makeStep('d')];

    for (const step of steps) {
      workflow.addStep(step);
    }

    expect(workflow.getSteps()).toEqual(steps);
  });

  it('returns a snapshot — mutating the returned array does not affect the Workflow', () => {
    const workflow = new Workflow();
    workflow.addStep(makeStep('first'));

    const snapshot = workflow.getSteps();
    snapshot.push(makeStep('tampered'));

    expect(workflow.getSteps().map((step) => step.name)).toEqual(['first']);
  });

  describe('id', () => {
    it('defaults to undefined when not provided', () => {
      const workflow = new Workflow();
      expect(workflow.id).toBeUndefined();
    });

    it('is set when provided to the constructor', () => {
      const workflow = new Workflow('resume-review');
      expect(workflow.id).toBe('resume-review');
    });
  });
});
