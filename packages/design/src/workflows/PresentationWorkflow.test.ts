import type { Provider } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { PresentationWorkflow } from './PresentationWorkflow.js';

const SLIDES_RESPONSE = JSON.stringify({ slides: ['Title slide', 'Problem slide', 'Solution slide'] });

describe('PresentationWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new PresentationWorkflow();
    expect(workflow.id).toBe('design.workflow.presentation');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes design.presentation into the workflow result (registration + execution)', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: SLIDES_RESPONSE };
      },
    };
    const workflow = new PresentationWorkflow();

    const result = await workflow.run({ topic: 'Series A pitch', audience: 'investors', style: 'confident' }, provider);

    expect(result.slides).toHaveLength(3);
    expect(seenPrompt).toContain('Series A pitch');
    expect(seenPrompt).toContain('the target audience is investors');
    expect(seenPrompt).toContain('use a confident style');
  });

  it('propagates a provider failure', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = {
      name: 'failing',
      async generate() {
        throw error;
      },
    };
    const workflow = new PresentationWorkflow();

    await expect(workflow.run({ topic: 'x' }, provider)).rejects.toBe(error);
  });

  it('emits lifecycle events for its one step', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: SLIDES_RESPONSE }; } };
    const workflow = new PresentationWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run({ topic: 'x' }, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events[1].stepName).toBe('design.presentation');
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: SLIDES_RESPONSE }; } };
    const workflow = new PresentationWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(
      workflow.run({ topic: 'x' }, provider, { signal: controller.signal })
    ).rejects.toThrow('Workflow cancelled');
  });
});
