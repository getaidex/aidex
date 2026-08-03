import type { Prompt, Provider, ProviderResponse } from '@aidex/core';
import type { WorkflowEvent } from '@aidex/workflow';
import { describe, expect, it } from 'vitest';
import { DocumentReviewWorkflow } from './DocumentReviewWorkflow.js';

const EXTRACT_RESPONSE = JSON.stringify({ fields: { invoiceNumber: 'INV-001', total: '500' } });
const REVIEW_RESPONSE = JSON.stringify({
  findings: [{ issue: 'Missing due date', severity: 'medium', recommendation: 'Add a due date.' }],
});

/** Branches on each Strategy's own fixed prompt lead-in text — stable regardless of the exact input a workflow step constructs. */
function respondFor(promptContent: string): ProviderResponse {
  if (promptContent.includes('from the following document')) return { content: EXTRACT_RESPONSE };
  if (promptContent.includes('Review the following document')) return { content: REVIEW_RESPONSE };
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

const INPUT = { source: { content: 'Invoice text', mimeType: 'text/plain' } };

describe('DocumentReviewWorkflow', () => {
  it('exposes id/name/description', () => {
    const workflow = new DocumentReviewWorkflow();
    expect(workflow.id).toBe('document.workflow.document-review');
    expect(workflow.name).toBeTruthy();
    expect(workflow.description).toBeTruthy();
  });

  it('composes both engines into one DocumentReviewPackage (registration + execution)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentReviewWorkflow();

    const result = await workflow.run(INPUT, provider);

    expect(provider.calls).toHaveLength(2);
    expect(result.extracted.fields).toEqual({ invoiceNumber: 'INV-001', total: '500' });
    expect(result.review.findings).toHaveLength(1);
  });

  it('calls the 2 engines in order: extract, review', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentReviewWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[0].content).toContain('from the following document');
    expect(provider.calls[1].content).toContain('Review the following document');
  });

  it('reviews the extracted fields, adapted through a DocumentSource — not the original document (real engine composition)', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentReviewWorkflow();

    await workflow.run(INPUT, provider);

    expect(provider.calls[1].content).toContain('invoiceNumber: INV-001');
    expect(provider.calls[1].content).toContain('total: 500');
    expect(provider.calls[1].content).not.toContain('Invoice text');
  });

  it('stops after the failing step and never runs later steps', async () => {
    const error = new Error('provider unavailable');
    const provider: Provider = { name: 'failing', async generate() { throw error; } };
    const workflow = new DocumentReviewWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toBe(error);
  });

  it('propagates a later-step failure without corrupting the already-produced extract result', async () => {
    let callCount = 0;
    const provider: Provider = {
      name: 'flaky',
      async generate(prompt) {
        callCount += 1;
        if (prompt.content.includes('from the following document')) return { content: EXTRACT_RESPONSE };
        throw new Error('review failed');
      },
    };
    const workflow = new DocumentReviewWorkflow();

    await expect(workflow.run(INPUT, provider)).rejects.toThrow('review failed');
    expect(callCount).toBe(2);
  });

  it('emits lifecycle events for both steps, in order', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentReviewWorkflow();
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
      'document.extract',
      'document.extract',
      'document.review',
      'document.review',
    ]);
  });

  it('emits step-failed and stops the event stream when a step throws', async () => {
    const provider: Provider = { name: 'failing', async generate() { throw new Error('boom'); } };
    const workflow = new DocumentReviewWorkflow();
    const events: WorkflowEvent[] = [];

    await expect(
      workflow.run(INPUT, provider, { onEvent: (event) => events.push(event) })
    ).rejects.toThrow('boom');

    expect(events.map((e) => e.type)).toEqual(['workflow-started', 'step-started', 'step-failed']);
  });

  it('supports cancellation via AbortSignal', async () => {
    const provider = makeMockProvider();
    const workflow = new DocumentReviewWorkflow();
    const controller = new AbortController();
    controller.abort();

    await expect(workflow.run(INPUT, provider, { signal: controller.signal })).rejects.toThrow(
      'Workflow cancelled'
    );
  });
});
