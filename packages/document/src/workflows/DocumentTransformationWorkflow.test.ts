import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { DocumentTransformationWorkflow } from './DocumentTransformationWorkflow.js';

const TRANSFORM_RESPONSE = JSON.stringify({ content: '# Reformatted heading\n\nBody text.' });
/** document.summarize's Strategy takes the provider's raw content directly as the summary — no JSON wrapping, unlike every other strategy in this package. */
const SUMMARIZE_RESPONSE = 'A short summary.';

function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('Reformat or restructure')) return { content: TRANSFORM_RESPONSE };
  if (promptContent.includes('Summarize the following document')) return { content: SUMMARIZE_RESPONSE };
  throw new Error(`Unexpected prompt: ${promptContent}`);
}

function makeMockProvider(): Provider & { calls: Prompt[] } {
  const calls: Prompt[] = [];
  return {
    name: 'mock',
    calls,
    async generate(prompt) {
      calls.push(prompt);
      return respondFor(prompt.content);
    },
  };
}

const INPUT = { source: { content: 'Original document text', mimeType: 'text/plain' }, targetFormat: 'markdown' };

describe('DocumentTransformationWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new DocumentTransformationWorkflow();
    expect(workflow.id).toBe('document.workflow.document-transformation');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one DocumentTransformationPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentTransformationWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.transformed.content).toBe('# Reformatted heading\n\nBody text.');
    expect(result.transformed.mimeType).toBe('text/markdown');
    expect(result.summary.summary).toBe('A short summary.');
  });

  it('calls the 2 engines in order: transform, summarize', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentTransformationWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('Reformat or restructure');
    expect(provider.calls[1].content).toContain('Summarize the following document');
  });

  it('summarizes the transformed document, adapted through a DocumentSource — not the original (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentTransformationWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('Reformatted heading');
    expect(provider.calls[1].content).not.toContain('Original document text');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new DocumentTransformationWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced transform result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('Reformat or restructure')) return { content: TRANSFORM_RESPONSE };
        throw new Error('summarize failed');
      },
    };
    const workflow = new DocumentTransformationWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('summarize failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentTransformationWorkflow();
    const events: WorkflowEvent[] = [];

    await workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) });

    expect(events.map((e) => e.type)).toEqual([
      'workflow-started',
      'step-started',
      'step-completed',
      'step-started',
      'step-completed',
      'workflow-completed',
    ]);
    expect(events.map((e) => e.stepName).filter(Boolean)).toEqual([
      'document.transform',
      'document.transform',
      'document.summarize',
      'document.summarize',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new DocumentTransformationWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentTransformationWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});
